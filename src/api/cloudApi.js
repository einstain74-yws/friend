import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { getFirestoreDb } from '../lib/firebaseApp.js';
import {
  isSupabaseEnabled,
  isLocalApiEnabled,
  isFirestoreEnabled,
  LOCAL_API_BASE,
} from '../config.js';

export { isCloudEnabled } from '../config.js';

const CLASS_SESSIONS = 'class_sessions';
const RESPONSES = 'responses';

function getSb() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  return client;
}

function getDb() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore가 설정되지 않았습니다.');
  }
  return db;
}

function sessionDocRef(db, sessionId) {
  return doc(db, CLASS_SESSIONS, sessionId);
}

function responseDocRef(db, sessionId, authorId) {
  return doc(db, CLASS_SESSIONS, sessionId, RESPONSES, String(authorId));
}

function apiUrl(path) {
  return `${LOCAL_API_BASE}${path}`;
}

async function fetchJson(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  const ct = r.headers.get('content-type');
  if (!ct?.includes('application/json')) return null;
  return r.json();
}

function newSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shouldUseLocalApi() {
  return isLocalApiEnabled();
}

function shouldUseFirestore() {
  return isFirestoreEnabled() && !shouldUseLocalApi();
}

function shouldUseSupabase() {
  return isSupabaseEnabled() && !shouldUseLocalApi() && !isFirestoreEnabled();
}

export async function createSession() {
  if (shouldUseLocalApi()) {
    return fetchJson(apiUrl('/api/sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const id = newSessionId();
    await setDoc(sessionDocRef(db, id), {
      createdAt: serverTimestamp(),
      students: [],
    });
    return { id };
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const id = newSessionId();
    const { data, error } = await sb.from('class_sessions').insert({ id }).select('id').single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  }
  throw new Error('VITE_API_BASE_URL, VITE_FIREBASE_*, 또는 VITE_SUPABASE_* 를 설정하세요.');
}

/**
 * 서버에 저장된 교사용(대시보드) 비밀번호. 없으면 null → 앱에서 기본값(0000) 사용.
 * @param {string} sessionId
 * @returns {Promise<string | null>}
 */
export async function fetchAdminPassword(sessionId) {
  if (shouldUseLocalApi()) {
    const data = await fetchJson(
      apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/settings`)
    );
    const v = data?.adminPassword;
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const snap = await getDoc(sessionDocRef(db, sessionId));
    if (!snap.exists()) return null;
    const v = snap.data()?.adminPassword;
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const { data, error } = await sb
      .from('class_sessions')
      .select('admin_password')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const v = data?.admin_password;
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
  throw new Error('서버 동기화가 설정되지 않았습니다.');
}

/**
 * @param {string} sessionId
 * @param {string} adminPassword
 */
export async function putAdminPassword(sessionId, adminPassword) {
  const pw = String(adminPassword ?? '');
  if (shouldUseLocalApi()) {
    await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/settings`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: pw }),
    });
    return;
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const ref = sessionDocRef(db, sessionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { adminPassword: pw });
    } else {
      await setDoc(ref, { createdAt: serverTimestamp(), adminPassword: pw });
    }
    return;
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const { error } = await sb.from('class_sessions').update({ admin_password: pw }).eq('id', sessionId);
    if (error) throw new Error(error.message);
    return;
  }
  throw new Error('서버 동기화가 설정되지 않습니다.');
}

export async function fetchRoster(sessionId) {
  if (shouldUseLocalApi()) {
    const data = await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/roster`));
    const students = data?.students;
    return Array.isArray(students) ? students : [];
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const snap = await getDoc(sessionDocRef(db, sessionId));
    if (!snap.exists()) return [];
    const students = snap.data()?.students;
    return Array.isArray(students) ? students : [];
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const { data, error } = await sb.from('rosters').select('students').eq('session_id', sessionId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      if (import.meta.env.DEV) {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          console.warn(
            '[sociogram] fetchRoster: no row for this session. If rosters has data in SQL but empty here, check RLS: authenticated must read rosters (migration 007).',
            { sessionId }
          );
        }
      }
      return [];
    }
    const students = data.students;
    return Array.isArray(students) ? students : [];
  }
  throw new Error('서버 동기화가 설정되지 않았습니다.');
}

export async function putRoster(sessionId, students) {
  if (shouldUseLocalApi()) {
    await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/roster`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: students ?? [] }),
    });
    return;
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const ref = sessionDocRef(db, sessionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { students: students ?? [] });
    } else {
      await setDoc(ref, { createdAt: serverTimestamp(), students: students ?? [] });
    }
    return;
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const { error } = await sb.from('rosters').upsert(
      { session_id: sessionId, students: students ?? [] },
      { onConflict: 'session_id' }
    );
    if (error) throw new Error(error.message);
    return;
  }
  throw new Error('서버 동기화가 설정되지 않았습니다.');
}

export async function fetchResponses(sessionId) {
  if (shouldUseLocalApi()) {
    const data = await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/responses`));
    const responses = data?.responses;
    return Array.isArray(responses) ? responses : [];
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const col = collection(db, CLASS_SESSIONS, sessionId, RESPONSES);
    const snap = await getDocs(col);
    return snap.docs
      .map((d) => d.data()?.payload)
      .filter(Boolean);
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
    const { data, error } = await sb.from('survey_responses').select('payload').eq('session_id', sessionId);
    if (error) throw new Error(error.message);
    return (data || []).map((row) => row.payload).filter(Boolean);
  }
  throw new Error('서버 동기화가 설정되지 않았습니다.');
}

export async function postResponse(sessionId, response) {
  if (shouldUseLocalApi()) {
    await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/responses`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    return;
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    await setDoc(
      responseDocRef(db, sessionId, response.authorId),
      {
        payload: response,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
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
    return;
  }
  throw new Error('서버 동기화가 설정되지 않습니다.');
}

export async function putResponses(sessionId, responses) {
  if (shouldUseLocalApi()) {
    await fetchJson(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/responses`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: responses ?? [] }),
    });
    return;
  }
  if (shouldUseFirestore()) {
    const db = getDb();
    const col = collection(db, CLASS_SESSIONS, sessionId, RESPONSES);
    const existing = await getDocs(col);
    await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
    if (!responses?.length) return;
    for (let i = 0; i < responses.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = responses.slice(i, i + 400);
      for (const r of chunk) {
        batch.set(responseDocRef(db, sessionId, r.authorId), {
          payload: r,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }
    return;
  }
  if (shouldUseSupabase()) {
    const sb = getSb();
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
    return;
  }
  throw new Error('서버 동기화가 설정되지 않습니다.');
}

/**
 * @typedef {{ id: string, owner_id: string, school_name: string, grade: number, class_name: string, session_id: string, created_at: string }} ClassroomRow
 */

/**
 * 로그인한 교사의 학급 목록 (RLS: 본인 행만)
 * @returns {Promise<ClassroomRow[]>}
 */
export async function listClassrooms() {
  if (!shouldUseSupabase()) {
    return [];
  }
  const sb = getSb();
  const { data, error } = await sb
    .from('classrooms')
    .select('id, owner_id, school_name, grade, class_name, session_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @returns {Promise<{ session_id: string, classroom_id: string }>}
 */
export async function createClassroomForTeacher(schoolName, grade, className) {
  if (!shouldUseSupabase()) {
    throw new Error('VITE_SUPABASE만 사용하는 모드에서 지원됩니다.');
  }
  const sb = getSb();
  const payload = {
    school_name: String(schoolName ?? '').trim(),
    grade: Number(grade),
    class_name: String(className ?? '').trim(),
  };
  const { data, error } = await sb.rpc('create_classroom', { p_payload: payload });
  if (error) throw new Error(error.message);
  const row = data && typeof data === 'object' ? data : null;
  if (!row?.session_id) throw new Error('학급 생성 응답이 올바르지 않습니다. DB에 supabase/migrations/006_*.sql 을 적용했는지 확인하세요.');
  return { session_id: row.session_id, classroom_id: row.classroom_id };
}

/**
 * @param {string} sessionId
 * @returns {Promise<ClassroomRow | null>}
 */
export async function getClassroomBySessionId(sessionId) {
  if (!shouldUseSupabase()) return null;
  const sb = getSb();
  const { data, error } = await sb
    .from('classrooms')
    .select('id, owner_id, school_name, grade, class_name, session_id, created_at')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
