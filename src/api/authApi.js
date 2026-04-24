import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { isFirestoreEnabled, isSupabaseEnabled } from '../config.js';
import { getFirebaseAuth } from '../lib/firebaseApp.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';

function requireSupabase() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다. VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY를 확인하세요.');
  return sb;
}

export async function signUp(email, password) {
  if (isFirestoreEnabled()) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth를 초기화할 수 없습니다. VITE_FIREBASE_* 를 확인하세요.');
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  }
  if (isSupabaseEnabled()) {
    const sb = requireSupabase();
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  }
  throw new Error('VITE_FIREBASE_* 또는 VITE_SUPABASE_* 를 설정하세요.');
}

export async function signIn(email, password) {
  if (isFirestoreEnabled()) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth를 초기화할 수 없습니다. VITE_FIREBASE_* 를 확인하세요.');
    return signInWithEmailAndPassword(auth, email.trim(), password);
  }
  if (isSupabaseEnabled()) {
    const sb = requireSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  }
  throw new Error('VITE_FIREBASE_* 또는 VITE_SUPABASE_* 를 설정하세요.');
}

export async function signOut() {
  if (isFirestoreEnabled()) {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await firebaseSignOut(auth);
    return;
  }
  if (isSupabaseEnabled()) {
    const sb = requireSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }
}
