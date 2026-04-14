/** GitHub Pages 등 정적 호스트는 /friend/ 일 수 있음. API는 별도 도메인 */
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export function isCloudEnabled() {
  return API_BASE.length > 0;
}
