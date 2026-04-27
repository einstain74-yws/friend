# Supabase 연동 (권장 백엔드)

앱이 **같은 Supabase 프로젝트**만 바라보면, 선생님 PC·학생 폰 등 어디서 접속해도 같은 명단·설문 결과를 볼 수 있습니다.

**Supabase만 DB에 쓰려면** 루트 `.env.local`에 `VITE_DATA_BACKEND=supabase` 를 넣으세요. ([`src/config.js`](src/config.js) — 이 값이면 `VITE_FIREBASE_*`가 있어도 Firestore 데이터 경로는 사용하지 않습니다.) 이 저장소의 **GitHub Pages** 워크플로([`deploy-gh-pages.yml`](.github/workflows/deploy-gh-pages.yml))는 **`VITE_DATA_BACKEND=supabase`로 고정**하고, `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` **Actions 시크릿**이 있어야 배포가 성공합니다. (로컬을 `auto`+Firebase로 두면 Firestore 쪽이 우선되어 DB가 갈릴 수 있음 — [FIRESTORE.md](FIRESTORE.md).)

## Supabase CLI (선택)

1. 루트에서 `npm install` 후 **`npm run supabase -- login --token <PAT>`** 또는 대시보드 **Account → Access Tokens**에서 발급한 토큰을 `.env.local`의 `SUPABASE_ACCESS_TOKEN`에 넣고 CI/스크립트에서 사용합니다.
2. **`npx supabase init`** 으로 [`supabase/config.toml`](supabase/config.toml)이 생성됩니다(이 저장소에 반영됨).
3. 원격 DB와 링크: **`npm run supabase -- link --project-ref <Project ID>`** — ID는 **Project Settings → General → Reference ID** (URL의 `https://xxxx.supabase.co` 의 `xxxx`와 다를 수 있음). DB 비밀번호를 물으면 **Database password**를 입력합니다. `Resource has been removed` 오류는 ref가 잘못됐거나 프로젝트가 삭제된 경우입니다.

## 0. (참고) Cursor Supabase MCP로 만든 예시 프로젝트

- 이름 **friend-sociogram**, 리전 **ap-northeast-2**, ref **`mctnxphbguqggentrlqy`** (URL: `https://mctnxphbguqggentrlqy.supabase.co`).
- 테이블: **`class_sessions`**, **`rosters`**, **`survey_responses`**(전체 JSON 페이로드), **`survey_answer_rows`**(문항 `q1`~`q10`별 `value` jsonb). 모두 **anon RLS 전체 허용**(교실용 MVP).
- API 키는 대시보드 **Project Settings → API**에서 확인합니다.

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성

2. **스키마 적용** — 아래 둘 중 하나만 하면 됩니다.

   **A. SQL Editor (브라우저)**  
   **SQL Editor** → 새 쿼리 → [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) 파일 내용 **전체 복사** → **Run**.

   **B. 터미널 (이 PC에서 한 번에)** — Supabase에 직접 로그인할 수 없을 때 편합니다.

   **Connection string (URI)은 어디?** — **Database → Tables** 화면에는 없습니다. 왼쪽 맨 아래 **⚙ Project settings**(또는 톱니바퀴)를 누른 뒤 **Configuration → Database**로 가거나, 상단에서 프로젝트 선택 후 **Project Settings**로 들어갑니다. **Database** 섹션에서 **Connection string**을 펼치고 표시 형식을 **URI**로 바꾼 다음 복사합니다. `[YOUR-PASSWORD]` 자리에 **DB 비밀번호**(프로젝트 생성 시 설정한 값, 잊었으면 같은 Database 화면에서 비밀번호 재설정)를 넣습니다.

   URI를 복사한 뒤 `[YOUR-PASSWORD]` 를 프로젝트 DB 비밀번호로 바꿉니다. 그다음 프로젝트 루트에서:

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

워크플로는 **`VITE_DATA_BACKEND=supabase`** 로 빌드합니다. **필수** Repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (빌드 직전 단계에서 비어 있으면 실패). **다른 PC·배포 URL**에서도 같은 Supabase DB를 쓰려면 로컬 `.env.local`에 동일 키를 넣고, 앱의 **“기존 클래스 URL로 연결”** 또는 **“다른 PC용 주소 복사”**로 같은 `?session=`을 쓰면 됩니다.

**브라우저:** 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에 추가합니다.

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL (필수) |
| `VITE_SUPABASE_ANON_KEY` | anon public key (필수) |
| `VITE_FIREBASE_API_KEY` 등 | 이 워크플로는 Firestore 경로를 쓰지 않음. Firestore 전용 배포는 [FIRESTORE.md](FIRESTORE.md) |

**터미널 (GitHub CLI):** 한 번 `gh auth login` 한 뒤, 프로젝트 루트에서:

```powershell
npm run gh:secrets
```

([`scripts/push-github-secrets.ps1`](scripts/push-github-secrets.ps1) 이 `.env.local` 을 읽어 `VITE_SUPABASE_*`·`VITE_DATA_BACKEND` 등을 등록합니다.)

`main` 에 푸시하면 워크플로가 `npm run build` 하며, 시크릿 구성에 따라 Firestore 또는 Supabase 경로가 선택됩니다.

## 5. 교사 회원·학급 (`005_classrooms.sql`, `006_…sql`)

**`npm run db:apply`**(또는 SQL Editor)로 아래를 **순서대로** 적용합니다.

1. [`005_classrooms.sql`](supabase/migrations/005_classrooms.sql) — `classrooms` 테이블·RLS, RPC `create_classroom_for_teacher(text, int, text)`.
2. [`006_create_classroom_jsonb_rpc.sql`](supabase/migrations/006_create_classroom_jsonb_rpc.sql) — 앱이 사용하는 **`create_classroom(jsonb)`** (한 덩어리 인자). PostgREST가 다인자 RPC를 못 찾는 오류가 나면 006이 필요합니다.
3. [`007_authenticated_session_tables_rls.sql`](supabase/migrations/007_authenticated_session_tables_rls.sql) — `class_sessions` / `rosters` / `survey_responses`(및 `survey_answer_rows`)에 **`authenticated` 역할**용 RLS를 추가합니다. `001_init`은 `anon`만 열어 두어, **Supabase 로그인 세션이 있는 브라우저**에서 `?session=`·QR로 접속하면 명단이 비어 보일 수 있었습니다. 적용 후 검증: **SQL Editor**에서 `select students from public.rosters where session_id = '<세션 UUID>';` — DB에 데이터가 있는데 앱만 비면 아직 이 마이그레이션이 안 된 것입니다.
4. [`008_delete_classroom_for_session.sql`](supabase/migrations/008_delete_classroom_for_session.sql) — `delete_classroom_for_session(uuid)` RPC(본인 `classrooms`만). **내 학급** 화면에서 학급 삭제 시 `class_sessions`를 지우고 CASCADE로 명단·설문이 함께 정리됩니다.

- **`classrooms`**: `owner_id` → `auth.users`, `school_name`, `grade`(1–12), `class_name`, `session_id` → `class_sessions.id`(1:1, UNIQUE). **RLS**: 로그인한 본인(`auth.uid()`)의 행만 읽기/쓰기.
- **RPC `create_classroom(jsonb)`**: `p_payload`에 `school_name`, `grade`, `class_name`. 응답 JSON에 `session_id`, `classroom_id`.
- **프론트**: `VITE_SUPABASE`만 사용·Firestore/로컬 API 미사용이면 `isSupabaseTeacherPortalEnabled()`가 true이고 `/auth/login`, `/auth/register`, `/teacher`가 활성화됩니다([`src/config.js`](src/config.js)).

### 이메일 인증 링크가 localhost:3000 등으로 열릴 때

Supabase는 **Site URL**(기본값이 `http://localhost:3000`인 경우가 많음)로 돌려보냅니다. 아래를 맞추세요.

1. **Authentication → URL configuration**
   - **Site URL**: 배포 주소 예) `https://<github-아이디>.github.io/friend/`
   - **Redirect URLs**: 위와 동일 URL, 개발용 `http://localhost:5173/**` (Vite), 필요 시 `http://127.0.0.1:5173/**`
2. GitHub Actions 빌드는 `VITE_AUTH_REDIRECT_URL`로 동일 Pages URL을 넣습니다([`deploy-gh-pages.yml`](.github/workflows/deploy-gh-pages.yml)). 로컬은 [`getAuthEmailRedirectTo`](src/utils/siteUrl.js)가 현재 탭 주소를 씁니다.
3. 설정을 바꾼 **뒤**에는 **새로** 회원가입을 보내야 메일 링크가 갱신됩니다(이미 온 메일은 옛 redirect).

## 보안 (MVP)

- `class_sessions` / `rosters` / `survey_responses` 쪽 RLS는 **anon**(`001`) + **authenticated**(`007`)로 동일 MVP 전제를 열어 둡니다. **세션 UUID를 아는 자**는 해당 반 응답·명단에 접근할 수 있다는 교실용 전제입니다. 학급 **메타**와 소유권은 `classrooms` RLS + 로그인으로 구분됩니다.
- **교사**가 만든 세션은 `classrooms`로 연결·관리되며, **학생**은 계속 비로그인 + `?session=`만 사용합니다.
- 공개 저장소에 키를 올리지 말고 **GitHub Secrets**만 사용하세요.

## Express 서버(`server/`)

자체 SQLite API는 선택 사항입니다. 설명은 [server/README.md](server/README.md) 를 참고하세요.
