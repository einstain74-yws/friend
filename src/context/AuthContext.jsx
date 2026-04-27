import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { isSupabaseTeacherPortalEnabled } from '../config.js';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseTeacherPortalEnabled()) {
      setLoading(false);
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
  };

  const value = useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
