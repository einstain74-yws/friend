/**
 * 학생 명단을 URL에 실어 다른 기기(학생 폰)에서도 동일 명단을 쓰기 위함.
 * localStorage는 기기·브라우저마다 따로이므로, QR/링크만으로는 명단이 비었음.
 */

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

/** 현재 주소의 ?r= 또는 #r= 에서 명단 복원 */
export function decodeRosterFromLocation() {
  if (typeof window === 'undefined') return null;
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

/** 학생이 설문 화면까지 갈 때 쓰는 주소(명단 포함) */
export function buildStudentAccessUrl(students) {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  if (!students?.length) return base;
  const r = encodeRosterParam(students);
  if (!r) return base;
  return `${base}#r=${r}`;
}

/** 로드 후 주소창에서 긴 #r= 제거(북마크·공유 시 깔끔하게) */
export function stripRosterFromAddressBar() {
  if (typeof window === 'undefined') return;
  if (!window.location.hash.match(/^#r=/)) return;
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, document.title, url.pathname + url.search);
}
