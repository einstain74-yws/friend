import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isCloudEnabled } from '../config.js';

let client;

/**
 * Supabase 단일 클라이언트 (데이터 + Auth 세션 공유)
 */
export function getSupabaseClient() {
  if (!isCloudEnabled()) return null;
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
