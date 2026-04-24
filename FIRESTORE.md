# Firestore 연동 (선택)

`VITE_DATA_BACKEND`가 **`supabase`**(기본 권장·GitHub Pages 빌드와 동일)이면 **Firestore는 데이터에 사용되지 않습니다.** Supabase만 씁니다.

`VITE_DATA_BACKEND=auto` 이고 `VITE_FIREBASE_*`가 채워져 있으면 [`src/api/cloudApi.js`](src/api/cloudApi.js)가 **Firestore**에 명단·설문을 저장할 수 있습니다. (로컬 `VITE_API_BASE_URL`이 없을 때) **Supabase와 동시에 넣은 경우 `auto`에서는 Firestore가 우선**합니다.

## 1. Firebase 콘솔

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 선택.
2. **빌드** → **Firestore Database** → 데이터베이스 생성(프로덕션/테스트 모드는 아래 보안 규칙에 맞게 변경).
3. **프로젝트 설정** → **일반** → **내 앱**에서 웹 앱 config를 복사해 루트 `.env.local`에 `VITE_` 접두사로 붙입니다.

## 2. 환경 변수 (`.env.local` / GitHub Actions)

| 키 | 설명 |
|----|------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `measurementId` (선택) |

GitHub Pages 배포: 저장소 **Settings → Secrets and variables → Actions**에 위 이름으로 등록하고, 워크플로 `Build` step의 `env`에도 동일 키로 연결합니다.

## 3. 보안 규칙 (교실용 MVP)

데이터는 컬렉션 `class_sessions` 및 하위 `responses`에 저장됩니다. **세션 UUID를 아는 사람이 읽고 쓴다**는 가정의 개방형 MVP입니다.

**Firebase 콘솔에 붙일 때:** README·웹에서 복사하면 줄 맨 앞에 ` ```text ` 같은 **마크다운 꼬리표**가 붙어 오기 쉽습니다. 그대로 붙이면 `Line 1: Unexpected 'text'.` 오류가 납니다.

1. 이 저장소 루트의 **`firestore.rules`** 파일을 VS Code 등에서 연다.  
2. **파일 전체**를 복사한다 (첫 줄은 `rules_version = '2';` 로 시작해야 한다).  
3. Firebase 콘솔 → **Firestore Database** → **규칙** 탭 → 에디터에 붙여 넣고 **게시**한다.

**인터넷에 공개된 GitHub Pages + 위 규칙은 누구나 전체 쓰기가 가능**합니다. 운영 전에는 **익명 인증**·제한적 규칙·또는 서버(Cloud Function)로 강화하세요. Firebase 콘솔 **Authentication**에서 이메일/익명 등을 켜고, **승인된 도메인**에 `einstain74-yws.github.io` 를 추가합니다(이메일 로그인 사용 시).

## 4. Auth

이메일/비밀번호 로그인은 **같은 Firebase 프로젝트**의 [프로젝트 설정] 키로 [`src/api/authApi.js`](src/api/authApi.js) → Firebase Auth로 연결됩니다. **설문·명단 동기화는 Auth 없이** anon + 위 규칙만으로도 동작합니다(선택).

## 5. GitHub Pages

저장소 기준 URL이 `https://<user>.github.io/friend/` 이면 빌드 시 `VITE_BASE_PATH=/friend/` 를 넣어야 합니다( [`vite.config.js`](vite.config.js)).
