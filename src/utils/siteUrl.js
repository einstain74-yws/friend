/** Vite base + origin — Supabase Auth redirect, 링크용 */
export function getAppOriginBase() {
  if (typeof window === 'undefined') return '';
  const base = import.meta.env.BASE_URL || '/';
  return new URL(base, window.location.origin).href.replace(/\/$/, '');
}

/**
 * 이메일 인증(Confirm) 후 돌아올 앱 URL.
 * - 빌드 시 VITE_AUTH_REDIRECT_URL(예: https://id.github.io/friend/)을 넣으면 Supabase에 반드시 동일 URL을 Redirect URLs에 넣을 것.
 * - 없으면 현재 주소(로컬·배포) 기준. Supabase Site URL이 localhost:3000이면, 이메일 링크가 3000으로 갈 수 있으니 대시보드 URL도 점검.
 */
export function getAuthEmailRedirectTo() {
  const explicit = import.meta.env.VITE_AUTH_REDIRECT_URL;
  if (typeof explicit === 'string' && explicit.trim().startsWith('http')) {
    return explicit.replace(/\/$/, '') + '/';
  }
  if (typeof window === 'undefined') return '';
  const base = getAppOriginBase();
  if (base) return `${base}/`;
  return `${window.location.origin}/`;
}
