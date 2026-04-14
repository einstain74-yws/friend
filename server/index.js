import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'data', 'classroom.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS roster (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS survey_responses (
    session_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (session_id, author_id)
  );
`);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/sessions', (req, res) => {
  const id = randomUUID();
  db.prepare('INSERT INTO sessions (id, created_at) VALUES (?, ?)').run(id, Date.now());
  res.json({ id });
});

app.get('/api/sessions/:sessionId/roster', (req, res) => {
  const row = db.prepare('SELECT data FROM roster WHERE session_id = ?').get(req.params.sessionId);
  if (!row) return res.json({ students: [] });
  try {
    const students = JSON.parse(row.data);
    res.json({ students: Array.isArray(students) ? students : [] });
  } catch {
    res.json({ students: [] });
  }
});

app.put('/api/sessions/:sessionId/roster', (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ error: 'students 배열이 필요합니다.' });
  }
  const ex = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.sessionId);
  if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  db.prepare('INSERT OR REPLACE INTO roster (session_id, data) VALUES (?, ?)').run(
    req.params.sessionId,
    JSON.stringify(students)
  );
  res.json({ ok: true });
});

app.get('/api/sessions/:sessionId/responses', (req, res) => {
  const rows = db.prepare('SELECT data FROM survey_responses WHERE session_id = ?').all(req.params.sessionId);
  const responses = rows.map((r) => JSON.parse(r.data));
  res.json({ responses });
});

app.post('/api/sessions/:sessionId/responses', (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body;
  if (!body || body.authorId == null || body.authorId === '') {
    return res.status(400).json({ error: 'authorId가 필요합니다.' });
  }
  const ex = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  const authorId = String(body.authorId);
  db.prepare(`
    INSERT INTO survey_responses (session_id, author_id, data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, author_id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(sessionId, authorId, JSON.stringify(body), Date.now());
  res.json({ ok: true });
});

app.put('/api/sessions/:sessionId/responses', (req, res) => {
  const { responses } = req.body;
  if (!Array.isArray(responses)) {
    return res.status(400).json({ error: 'responses 배열이 필요합니다.' });
  }
  const ex = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.sessionId);
  if (!ex) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  const sessionId = req.params.sessionId;
  const del = db.prepare('DELETE FROM survey_responses WHERE session_id = ?');
  const ins = db.prepare(
    'INSERT INTO survey_responses (session_id, author_id, data, updated_at) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    del.run(sessionId);
    for (const r of responses) {
      if (r && r.authorId != null) {
        ins.run(sessionId, String(r.authorId), JSON.stringify(r), Date.now());
      }
    }
  });
  tx();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Classroom API listening on ${PORT}`);
});
