/**
 * 명단을 URL에 실어 다른 기기에서 쓰기 (서버 미사용 시 #r= 해시).
 * 서버(VITE_API_BASE) 사용 시 ?session= 만으로 짧게 공유.
 */

export function getSessionIdFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('session');
}

export function encodeRosterParam(students) {
  if (!students?.length) return '';
  const json = JSON.stringify(students);
  const utf8 = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRosterParam(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return null;
    return data.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string');
  } catch {
    return null;
  }
}

/** 현재 주소의 ?r= 또는 #r= (서버 세션이 없을 때만) */
export function decodeRosterFromLocation() {
  if (typeof window === 'undefined') return null;
  if (getSessionIdFromUrl()) return null;
  const params = new URLSearchParams(window.location.search);
  const queryR = params.get('r');
  if (queryR) {
    const d = decodeRosterParam(queryR);
    if (d?.length) return d;
  }
  const hash = window.location.hash;
  const m = hash.match(/^#r=(.+)$/);
  if (m) {
    const d = decodeRosterParam(m[1]);
    if (d?.length) return d;
  }
  return null;
}

/**
 * 학생 설문 접속 주소
 * @param {Array} students
 * @param {string|null} cloudSessionId 서버 연동 시 짧은 ?session= 만 사용
 */
export function buildStudentAccessUrl(students, cloudSessionId = null) {
  if (typeof window === 'undefined') return '';
  const originPath = `${window.location.origin}${window.location.pathname}`;
  if (cloudSessionId) {
    const u = new URL(originPath);
    u.searchParams.set('session', cloudSessionId);
    return u.toString();
  }
  if (!students?.length) return `${originPath}${window.location.search}`;
  const r = encodeRosterParam(students);
  if (!r) return `${originPath}${window.location.search}`;
  return `${originPath}${window.location.search.replace(/\?$/, '')}#r=${r}`;
}

/** 로드 후 주소창에서 긴 #r= 제거 */
export function stripRosterFromAddressBar() {
  if (typeof window === 'undefined') return;
  if (!window.location.hash.match(/^#r=/)) return;
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, document.title, url.pathname + url.search);
}
