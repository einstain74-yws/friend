import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSupabaseClient } from '../lib/supabaseClient.js';

const FALLBACK_MS = 15000;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/auth/welcome', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setTimedOut(true);
    }, FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, []);

  const retrySession = async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    if (data.session?.user) {
      navigate('/auth/welcome', { replace: true });
    }
  };

  if (!loading && !user && timedOut) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            background: 'white',
            padding: '1.75rem',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', lineHeight: 1.55 }}>
            로그인 세션을 확인하지 못했습니다. Supabase 대시보드의 Authentication → URL Configuration에 이 페이지 주소(
            <code style={{ fontSize: '0.8rem' }}>/auth/callback</code>)가 Redirect URLs에 있는지, 그리고 개발 서버 포트(
            이 프로젝트는 `npm run dev` 시 기본 포트가 **3000**입니다. 메일 링크의 호스트·포트와 같은지 확인해 주세요.
          </p>
          <button type="button" className="btn btn-primary" style={{ marginBottom: '0.75rem', width: '100%' }} onClick={() => void retrySession()}>
            다시 시도
          </button>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            <Link to="/auth/login">로그인 화면으로</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text-muted)',
      }}
    >
      <p style={{ margin: 0 }}>로그인 처리 중…</p>
    </div>
  );
}
