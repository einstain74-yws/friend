import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isCloudEnabled } from '../config.js';

export { isCloudEnabled };

let client;

function getClient() {
  if (!isCloudEnabled()) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createClient(url, anonKey);
  }
  return client;
}

function newSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function createSession() {
  const sb = getClient();
  const id = newSessionId();
  const { data, error } = await sb.from('class_sessions').insert({ id }).select('id').single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function fetchRoster(sessionId) {
  const sb = getClient();
  const { data, error } = await sb.from('rosters').select('students').eq('session_id', sessionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [];
  const students = data.students;
  return Array.isArray(students) ? students : [];
}

export async function putRoster(sessionId, students) {
  const sb = getClient();
  const { error } = await sb.from('rosters').upsert(
    { session_id: sessionId, students: students ?? [] },
    { onConflict: 'session_id' }
  );
  if (error) throw new Error(error.message);
}

export async function fetchResponses(sessionId) {
  const sb = getClient();
  const { data, error } = await sb.from('survey_responses').select('payload').eq('session_id', sessionId);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.payload).filter(Boolean);
}

export async function postResponse(sessionId, response) {
  const sb = getClient();
  const { error } = await sb.from('survey_responses').upsert(
    {
      session_id: sessionId,
      author_id: String(response.authorId),
      payload: response,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,author_id' }
  );
  if (error) throw new Error(error.message);
}

export async function putResponses(sessionId, responses) {
  const sb = getClient();
  const { error: delErr } = await sb.from('survey_responses').delete().eq('session_id', sessionId);
  if (delErr) throw new Error(delErr.message);
  if (!responses?.length) return;
  const rows = responses.map((r) => ({
    session_id: sessionId,
    author_id: String(r.authorId),
    payload: r,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('survey_responses').insert(rows);
  if (error) throw new Error(error.message);
}
