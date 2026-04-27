import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient.js';
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
      const { error: err } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      const to = location.state?.from && typeof location.state.from === 'string' ? location.state.from : '/teacher';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

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
          width: '100%',
          maxWidth: '400px',
          background: 'white',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0' }}>교사 로그인</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          이메일 인증을 켠 프로젝트는 가입 후 메일의 링크를 누른 뒤 로그인하세요.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          {error ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ padding: '0.7rem' }}>
            {busy ? '처리 중…' : '로그인'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <Link to="/auth/register">회원가입(학급 등록)</Link>
          {' · '}
          <Link to="/">앱 첫 화면</Link>
        </p>
      </div>
    </div>
  );
}
