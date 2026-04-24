import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { isFirestoreEnabled, isRemoteAuthEnabled, isSupabaseEnabled } from '../config.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { getFirebaseAuth } from '../lib/firebaseApp.js';
import * as authApi from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const hasAuth = isRemoteAuthEnabled();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasAuth);

  useEffect(() => {
    if (!hasAuth) {
      setLoading(false);
      return;
    }
    if (isFirestoreEnabled()) {
      const auth = getFirebaseAuth();
      if (!auth) {
        setLoading(false);
        return;
      }
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsub();
    }
    if (isSupabaseEnabled()) {
      const sb = getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      let cancelled = false;
      sb.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
      });
      const {
        data: { subscription },
      } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }
    setLoading(false);
  }, [hasAuth]);

  const value = useMemo(
    () => ({
      user,
      loading,
      /** 이메일 인증 쓰는 백엔드 있음 (Firebase/Supabase) */
      hasAuth: hasAuth,
      async signUp(email, password) {
        return authApi.signUp(email, password);
      },
      async signIn(email, password) {
        return authApi.signIn(email, password);
      },
      async signOut() {
        return authApi.signOut();
      },
    }),
    [user, loading, hasAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용하세요.');
  return ctx;
}
