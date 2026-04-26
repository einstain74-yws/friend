import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient, QuestionKey } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;

// prisma/schema.prisma 기준 상대 경로 → server/data/classroom.db
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:../data/classroom.db';
}

const prisma = new PrismaClient();
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const QUESTION_ORDER = [
  QuestionKey.Q1,
  QuestionKey.Q2,
  QuestionKey.Q3,
  QuestionKey.Q4,
  QuestionKey.Q5,
  QuestionKey.Q6,
  QuestionKey.Q7,
  QuestionKey.Q8,
  QuestionKey.Q9,
  QuestionKey.Q10,
];
const PAYLOAD_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

/** 설문 본문 → 문항별 Answer 행 (value는 Json: 배열·숫자·문자열) */
function buildAnswerRows(sessionId, authorStudentId, body) {
  const rows = [];
  for (let i = 0; i < QUESTION_ORDER.length; i++) {
    const question = QUESTION_ORDER[i];
    const key = PAYLOAD_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = body[key];
    if (value === undefined || value === null) continue;
    rows.push({
      sessionId,
      authorStudentId: String(authorStudentId),
      question,
      value,
    });
  }
  return rows;
}

async function upsertNormalizedSubmissionTx(tx, sessionId, authorId, body) {
  const authorStudentId = String(authorId);
  const rows = buildAnswerRows(sessionId, authorStudentId, body);
  await tx.surveySubmission.upsert({
    where: {
      sessionId_authorStudentId: { sessionId, authorStudentId },
    },
    create: { sessionId, authorStudentId },
    update: { submittedAt: new Date() },
  });
  await tx.answer.deleteMany({
    where: { sessionId, authorStudentId },
  });
  if (rows.length) {
    await tx.answer.createMany({ data: rows });
  }
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/sessions', async (req, res) => {
  try {
    const id = randomUUID();
    await prisma.classSession.create({
      data: { id },
    });
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '세션 생성 실패' });
  }
});

app.get('/api/sessions/:sessionId/roster', async (req, res) => {
  try {
    const row = await prisma.roster.findUnique({
      where: { sessionId: req.params.sessionId },
    });
    if (!row) return res.json({ students: [] });
    const students = Array.isArray(row.students) ? row.students : [];
    res.json({ students });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '명단 조회 실패' });
  }
});

app.put('/api/sessions/:sessionId/roster', async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'students 배열이 필요합니다.' });
    }
    const ex = await prisma.classSession.findUnique({ where: { id: req.params.sessionId } });
    if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    await prisma.roster.upsert({
      where: { sessionId: req.params.sessionId },
      create: { sessionId: req.params.sessionId, students },
      update: { students },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '명단 저장 실패' });
  }
});

app.get('/api/sessions/:sessionId/responses', async (req, res) => {
  try {
    const rows = await prisma.surveyResponse.findMany({
      where: { sessionId: req.params.sessionId },
    });
    const responses = rows.map((r) => r.payload).filter(Boolean);
    res.json({ responses });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '응답 조회 실패' });
  }
});

app.post('/api/sessions/:sessionId/responses', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body;
  if (!body || body.authorId == null || body.authorId === '') {
    return res.status(400).json({ error: 'authorId가 필요합니다.' });
  }
  try {
    const ex = await prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    const authorId = String(body.authorId);

    await prisma.$transaction(async (tx) => {
      await tx.surveyResponse.upsert({
        where: {
          sessionId_authorId: { sessionId, authorId },
        },
        create: {
          sessionId,
          authorId,
          payload: body,
        },
        update: {
          payload: body,
        },
      });
      await upsertNormalizedSubmissionTx(tx, sessionId, authorId, body);
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '저장 실패' });
  }
});

app.put('/api/sessions/:sessionId/responses', async (req, res) => {
  const { responses } = req.body;
  if (!Array.isArray(responses)) {
    return res.status(400).json({ error: 'responses 배열이 필요합니다.' });
  }
  const sessionId = req.params.sessionId;
  try {
    const ex = await prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });

    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { sessionId } });
      await tx.surveySubmission.deleteMany({ where: { sessionId } });
      await tx.surveyResponse.deleteMany({ where: { sessionId } });

      for (const r of responses) {
        if (!r || r.authorId == null) continue;
        const authorId = String(r.authorId);
        await tx.surveyResponse.create({
          data: {
            sessionId,
            authorId,
            payload: r,
          },
        });
        await tx.surveySubmission.create({
          data: {
            sessionId,
            authorStudentId: authorId,
          },
        });
        const rows = buildAnswerRows(sessionId, authorId, r);
        if (rows.length) {
          await tx.answer.createMany({ data: rows });
        }
      }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || '일괄 저장 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`Classroom API (Prisma) listening on ${PORT}`);
});
