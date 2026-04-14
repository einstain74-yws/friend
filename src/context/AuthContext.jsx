import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isCloudEnabled } from '../config.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import * as authApi from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!cloud) {
      setLoading(false);
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
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
  }, [cloud]);

  const value = useMemo(
    () => ({
      user,
      loading,
      cloud,
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
    [user, loading, cloud],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용하세요.');
  return ctx;
}
