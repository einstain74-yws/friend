import { API_BASE, isCloudEnabled } from '../config.js';

function url(path) {
  return `${API_BASE}${path}`;
}

async function jfetch(path, options = {}) {
  const res = await fetch(url(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || '요청 실패');
    err.status = res.status;
    throw err;
  }
  return data;
}

export { isCloudEnabled };

export async function createSession() {
  return jfetch('/api/sessions', { method: 'POST' });
}

export async function fetchRoster(sessionId) {
  const data = await jfetch(`/api/sessions/${encodeURIComponent(sessionId)}/roster`);
  return data.students || [];
}

export async function putRoster(sessionId, students) {
  return jfetch(`/api/sessions/${encodeURIComponent(sessionId)}/roster`, {
    method: 'PUT',
    body: JSON.stringify({ students }),
  });
}

export async function fetchResponses(sessionId) {
  const data = await jfetch(`/api/sessions/${encodeURIComponent(sessionId)}/responses`);
  return data.responses || [];
}

export async function postResponse(sessionId, response) {
  return jfetch(`/api/sessions/${encodeURIComponent(sessionId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

export async function putResponses(sessionId, responses) {
  return jfetch(`/api/sessions/${encodeURIComponent(sessionId)}/responses`, {
    method: 'PUT',
    body: JSON.stringify({ responses }),
  });
}
