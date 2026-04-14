# Supabase 연동 (권장 백엔드)

앱이 **같은 Supabase 프로젝트**만 바라보면, 선생님 PC·학생 폰 등 어디서 접속해도 같은 명단·설문 결과를 볼 수 있습니다.

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

워크플로는 `secrets.VITE_SUPABASE_URL`, `secrets.VITE_SUPABASE_ANON_KEY` 를 빌드에 넣습니다. 아래 **한 가지**만 하면 됩니다.

**브라우저:** 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에 각각 추가합니다.

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `.env.local` 의 값과 동일 (Project URL) |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` 의 값과 동일 |

**터미널 (GitHub CLI):** 한 번 `gh auth login` 한 뒤, 프로젝트 루트에서:

```powershell
npm run gh:secrets
```

([`scripts/push-github-secrets.ps1`](scripts/push-github-secrets.ps1) 이 `.env.local` 을 읽어 위 두 시크릿을 등록합니다.)

`main` 에 푸시하면 워크플로가 위 값으로 `npm run build` 하며, 배포된 사이트가 Supabase를 사용합니다.

## 보안 (MVP)

- RLS는 **anon** 에 대해 해당 테이블 전체 접근을 허용합니다. **세션 UUID를 아는 사람**이 해당 반 데이터를 읽을 수 있다고 가정한 교실용 설정입니다.
- 공개 저장소에 키를 넣지 말고 **GitHub Secrets** 만 사용하세요.

## Express 서버(`server/`)

자체 SQLite API는 선택 사항입니다. 설명은 [server/README.md](server/README.md) 를 참고하세요.
