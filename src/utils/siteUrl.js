/** Vite base + origin — Supabase Auth redirect, 링크용 */
export function getAppOriginBase() {
  if (typeof window === 'undefined') return '';
  const base = import.meta.env.BASE_URL || '/';
  return new URL(base, window.location.origin).href.replace(/\/$/, '');
}

export function getAuthEmailRedirectTo() {
  const root = getAppOriginBase();
  return root ? `${root}/` : window?.location?.origin ?? '';
}
