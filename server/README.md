# 교실 API (Express + SQLite) — **레거시·선택**

기본 백엔드는 **[SUPABASE.md](../SUPABASE.md)** 의 Supabase(Postgres)입니다. 이 폴더는 자체 호스팅용으로만 유지합니다.

## 로컬 실행

```bash
cd server
npm install
npm start
```

기본 포트 `8787`. 루트에서 `npm run api` 로도 실행할 수 있습니다.

(프론트는 현재 `VITE_SUPABASE_*` 를 사용하며, 이 Express API를 가리키지 않습니다.)

## 배포 (예: Render)

1. New Web Service → 이 저장소, 루트 디렉터리 `server`
2. Build: `npm install`
3. Start: `npm start`
4. 환경 변수: `PORT` 는 호스트가 지정. 영구 디스크에 `SQLITE_PATH=/data/classroom.db` 권장

## API

- `POST /api/sessions` → `{ id }`
- `GET/PUT /api/sessions/:id/roster` — `{ students }`
- `GET /api/sessions/:id/responses` — `{ responses }`
- `POST /api/sessions/:id/responses` — 설문 한 건 (upsert)
- `PUT /api/sessions/:id/responses` — 전체 교체
