# Supabase 연동 (권장 백엔드)

앱이 **같은 Supabase 프로젝트**만 바라보면, 선생님 PC·학생 폰 등 어디서 접속해도 같은 명단·설문 결과를 볼 수 있습니다.

**Supabase만 DB에 쓰려면** 루트 `.env.local`에 `VITE_DATA_BACKEND=supabase` 를 넣으세요. ([`src/config.js`](src/config.js) — 이 값이면 `VITE_FIREBASE_*`가 있어도 Firestore 데이터 경로는 사용하지 않습니다.) **GitHub Pages** 워크플로는 기본 **`VITE_DATA_BACKEND=auto`** 이며, Firebase 시크릿이 있으면 Firestore가 우선입니다. ([FIRESTORE.md](FIRESTORE.md))

## Supabase CLI (선택)

1. 루트에서 `npm install` 후 **`npm run supabase -- login --token <PAT>`** 또는 대시보드 **Account → Access Tokens**에서 발급한 토큰을 `.env.local`의 `SUPABASE_ACCESS_TOKEN`에 넣고 CI/스크립트에서 사용합니다.
2. **`npx supabase init`** 으로 [`supabase/config.toml`](supabase/config.toml)이 생성됩니다(이 저장소에 반영됨).
3. 원격 DB와 링크: **`npm run supabase -- link --project-ref <Project ID>`** — ID는 **Project Settings → General → Reference ID** (URL의 `https://xxxx.supabase.co` 의 `xxxx`와 다를 수 있음). DB 비밀번호를 물으면 **Database password**를 입력합니다. `Resource has been removed` 오류는 ref가 잘못됐거나 프로젝트가 삭제된 경우입니다.

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성

2. **스키마 적용** — 아래 둘 중 하나만 하면 됩니다.

   **A. SQL Editor (브라우저)**  
   **SQL Editor** → 새 쿼리 → [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) 파일 내용 **전체 복사** → **Run**.

   **B. 터미널 (이 PC에서 한 번에)** — Supabase에 직접 로그인할 수 없을 때 편합니다.  
   대시보드 **Project Settings → Database → Connection string → URI** 를 복사하고, `[YOUR-PASSWORD]` 를 프로젝트 DB 비밀번호로 바꿉니다. 그다음 프로젝트 루트에서:

   `.env.local` 에 한 줄 추가(비밀번호는 대시보드 URI 그대로):

   ```env
   DATABASE_URL=postgresql://postgres.[ref]:비밀번호@....pooler.supabase.com:6543/postgres
   ```

   프로젝트 루트에서:

   ```bash
   npm run db:apply
   ```

   또는 PowerShell에서만 한 번 설정할 때:

   ```powershell
   $env:DATABASE_URL="postgresql://..."
   npm run db:apply
   ```

   (`npm run db:apply` 는 [`scripts/apply-migration.mjs`](scripts/apply-migration.mjs) 가 `001_init.sql` 을 실행합니다.)

   → `class_sessions`, `rosters`, `survey_responses` 테이블과 `anon`용 RLS 정책이 생성됩니다.

[`002_auth_profiles.sql`](supabase/migrations/002_auth_profiles.sql) 은 **회원 프로필**(`profiles`)과 `auth.users` 가입 시 자동 삽입 트리거를 추가합니다. `npm run db:apply` 또는 SQL Editor에서 **001 다음에** 실행되면 됩니다(폴더에 있는 `.sql`을 이름순으로 모두 적용).

## 1-1. 이메일 로그인 (Auth)

대시보드 **Authentication → Providers → Email** 이 켜져 있어야 회원가입·로그인이 됩니다.  
테스트 중 이메일 확인이 번거롭다면 **Authentication → Providers → Email → Confirm email** 을 끄면 가입 직후 바로 로그인할 수 있습니다(운영 환경에서는 켜 두는 것을 권장).

## 2. API 키 복사

**Project Settings → API**

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** 키 → `VITE_SUPABASE_ANON_KEY`

## 3. 로컬 개발

프로젝트 루트에 `.env.local` (Git에 올리지 않음):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

`VITE_SUPABASE_*` 가 없으면 기존처럼 **브라우저 localStorage + URL 해시**만 사용합니다.

## 4. GitHub Pages 배포

워크플로는 **`VITE_DATA_BACKEND=auto`** 로 빌드합니다. **Firestore를 쓰려면** Actions 시크릿에 `VITE_FIREBASE_*` 전부를 추가하세요. Supabase도 쓰려면 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 를 추가합니다 (`auto`에서는 Firestore가 데이터에 우선).

**브라우저:** 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에 추가합니다.

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | (선택) Project URL |
| `VITE_SUPABASE_ANON_KEY` | (선택) anon public key |
| `VITE_FIREBASE_API_KEY` 등 | Firestore 사용 시 필수 — [FIRESTORE.md](FIRESTORE.md) 표 참고 |

**Supabase만** 쓰는 배포물을 만들려면 워크플로의 `VITE_DATA_BACKEND`를 `supabase`로 바꾸거나, Firebase 시크릿을 비워 두면 됩니다.

**터미널 (GitHub CLI):** 한 번 `gh auth login` 한 뒤, 프로젝트 루트에서:

```powershell
npm run gh:secrets
```

([`scripts/push-github-secrets.ps1`](scripts/push-github-secrets.ps1) 이 `.env.local` 을 읽어 `VITE_SUPABASE_*`·`VITE_DATA_BACKEND` 등을 등록합니다.)

`main` 에 푸시하면 워크플로가 `npm run build` 하며, 시크릿 구성에 따라 Firestore 또는 Supabase 경로가 선택됩니다.

## 보안 (MVP)

- RLS는 **anon** 에 대해 해당 테이블 전체 접근을 허용합니다. **세션 UUID를 아는 사람**이 해당 반 데이터를 읽을 수 있다고 가정한 교실용 설정입니다.
- 공개 저장소에 키를 넣지 말고 **GitHub Secrets** 만 사용하세요.

## Express 서버(`server/`)

자체 SQLite API는 선택 사항입니다. 설명은 [server/README.md](server/README.md) 를 참고하세요.
