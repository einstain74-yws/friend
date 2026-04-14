import { getSupabaseClient } from '../lib/supabaseClient.js';

function requireClient() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다. VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY를 확인하세요.');
  return sb;
}

export async function signUp(email, password) {
  const sb = requireClient();
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const sb = requireClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = requireClient();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}
