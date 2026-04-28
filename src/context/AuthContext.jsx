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
    let initialLoadComplete = false;
    const completeInitialLoad = () => {
      if (initialLoadComplete) return;
      initialLoadComplete = true;
      setLoading(false);
    };

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === 'INITIAL_SESSION') {
        completeInitialLoad();
      }
    });

    const fallbackTimer = window.setTimeout(completeInitialLoad, 5000);

    return () => {
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
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
