/** Supabase (Postgres) — 동일 프로젝트를 보면 모든 기기에서 같은 데이터 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** 로컬 Express(SQLite + Prisma) API — 끝의 / 제외 */
export const LOCAL_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * 클라우드 데이터 백엔드 선택
 * - `supabase`: Firestore 무시, Supabase만 (Firebase env가 있어도 DB는 Postgres만)
 * - `firestore`: Firebase 설정이 있으면 Firestore 우선
 * - `auto`(기본): 둘 다 설정돼 있으면 Firestore 우선(기존 동작)
 */
export function getDataBackend() {
  const v = String(import.meta.env.VITE_DATA_BACKEND || 'auto')
    .toLowerCase()
    .trim();
  if (v === 'supabase' || v === 'firestore' || v === 'auto') return v;
  return 'auto';
}

export function getSupabaseConfig() {
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function isSupabaseEnabled() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function isLocalApiEnabled() {
  return LOCAL_API_BASE.length > 0;
}

/** Firebase 웹앱 (Firestore + Auth) — Vite .env */
export function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
}

function firebaseWebConfigComplete() {
  const c = getFirebaseConfig();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

/** Firestore 클라이언트·데이터 경로 사용 여부 */
export function isFirestoreEnabled() {
  if (!firebaseWebConfigComplete()) return false;
  const mode = getDataBackend();
  if (mode === 'supabase') return false;
  if (mode === 'firestore') return true;
  return true;
}

/** Supabase, Firestore, 또는 로컬 API */
export function isServerSyncEnabled() {
  return isLocalApiEnabled() || isFirestoreEnabled() || isSupabaseEnabled();
}

/** 기존 코드 호환: 서버 동기화 사용 여부 */
export function isCloudEnabled() {
  return isServerSyncEnabled();
}

/** 이메일 로그인(Firebase 또는 Supabase) 사용 가능 */
export function isRemoteAuthEnabled() {
  if (getDataBackend() === 'supabase') {
    return isSupabaseEnabled();
  }
  return isFirestoreEnabled() || isSupabaseEnabled();
}
