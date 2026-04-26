# 교실 API (Express + Prisma + SQLite) — **레거시·선택**

기본 백엔드는 **[SUPABASE.md](../SUPABASE.md)** 의 Supabase(Postgres)입니다. 이 폴더는 자체 호스팅용으로만 유지합니다.

## Prisma

- 스키마: [`prisma/schema.prisma`](prisma/schema.prisma) — `User`, `UserAuthSession`, `ClassSession`, `Roster`, `SurveyResponse`(레거시 JSON 한 덩어리), `SurveySubmission`, `Answer`(문항별 `Q1`…`Q10`).
- **레거시** `survey_responses.data`는 프론트와 동일한 페이로드를 유지합니다. `POST/PUT` 시 같은 내용이 **`survey_submissions` + `survey_answers`**에도 정규화되어 저장됩니다.
- 로컬 DB 적용:
  ```bash
  cd server
  npm install
  set DATABASE_URL=file:../data/classroom.db
  npx prisma db push
  ```
  기존 `data/classroom.db`가 예전 raw SQL 스키마일 때 drift가 나면 DB 파일을 백업 후 삭제하고 `db push` 또는 `prisma migrate dev`로 초기화하세요.

## 로컬 실행

```bash
cd server
npm install
npm start
```

기본 포트 `8787`. 루트에서 `npm run api` 로도 실행할 수 있습니다.

환경 변수: [`prisma/.env` 대신 루트 `.env` 없이] **`DATABASE_URL`** (예: `file:../data/classroom.db`). 미설정 시 코드 기본값과 동일합니다.

(프론트는 기본적으로 Supabase/Firestore를 쓰며, `VITE_API_BASE_URL`로 이 API를 켠 경우에만 사용합니다.)

## 배포 (예: Render)

1. New Web Service → 이 저장소, 루트 디렉터리 `server`
2. Build: `npm install`
3. Start: `npm start`
4. 환경 변수: `PORT` 는 호스트가 지정. **`DATABASE_URL=file:/data/classroom.db`** 처럼 영구 디스크 경로 권장 (`postinstall`에서 `prisma generate` 실행됨)

## API

- `POST /api/sessions` → `{ id }`
- `GET/PUT /api/sessions/:id/roster` — `{ students }`
- `GET /api/sessions/:id/responses` — `{ responses }` (레거시 `survey_responses` 페이로드 배열)
- `POST /api/sessions/:id/responses` — 설문 한 건 (upsert) + 문항별 `survey_answers` 동기화
- `PUT /api/sessions/:id/responses` — 전체 교체 + 문항별 테이블 동기화
