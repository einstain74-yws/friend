# 교실 API (SQLite)

학생 명단·설문 응답을 한 서버에 모읍니다. GitHub Pages 정적 사이트와 별도로 호스팅하세요.

## 로컬 실행

```bash
cd server
npm install
npm start
```

기본 포트 `8787`. 루트에서 `npm run api` 로도 실행할 수 있습니다.

프론트는 루트에 `.env.development` 를 두고 `VITE_API_BASE=` 비워 두면 `vite` 가 `/api` 를 위 서버로 넘깁니다.

## 배포 (예: Render)

1. New Web Service → 이 저장소, 루트 디렉터리 `server`
2. Build: `npm install`
3. Start: `npm start`
4. 환경 변수: `PORT` 는 호스트가 지정. 영구 디스크에 `SQLITE_PATH=/data/classroom.db` 권장
5. 프론트 빌드 시 `VITE_API_BASE=https://your-api.onrender.com` 설정 후 `npm run build`

### GitHub Actions / Pages

저장소 **Secrets**에 `VITE_API_BASE` 를 넣고, 워크플로 빌드 단계에서 `env: VITE_API_BASE: ${{ secrets.VITE_API_BASE }}` 로 주입하면 정적 사이트가 배포 API를 호출합니다. API는 Pages와 **별도 호스트**여야 합니다.

## API

- `POST /api/sessions` → `{ id }`
- `GET/PUT /api/sessions/:id/roster` — `{ students }`
- `GET /api/sessions/:id/responses` — `{ responses }`
- `POST /api/sessions/:id/responses` — 설문 한 건 (upsert)
- `PUT /api/sessions/:id/responses` — 전체 교체 (마감 시 비우기 등)
