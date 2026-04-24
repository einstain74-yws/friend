import React, { useState } from 'react';
import { LogIn, UserPlus, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPanel({ compact = false }) {
  const { user, loading, hasAuth, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!hasAuth) {
    return (
      <div
        style={{
          padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          maxWidth: compact ? 260 : 320,
        }}
      >
        이메일 로그인은 <strong>VITE_SUPABASE_*</strong>(<code>VITE_DATA_BACKEND=supabase</code>일 때) 또는 Firebase
        설정(<code>auto</code>/<code>firestore</code> 모드) 시 사용할 수 있습니다. (설문·명단만 쓰는 경우는 선택)
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
        계정 정보 불러오는 중…
      </div>
    );
  }

  if (user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          gap: '0.65rem',
          padding: compact ? '0.65rem 0.85rem' : '0.75rem 1rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          maxWidth: compact ? 280 : 400,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>로그인됨</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            padding: '0.45rem 0.75rem',
            fontSize: '0.85rem',
          }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await signOut();
            } catch (e) {
              setError(e.message || '로그아웃에 실패했습니다.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력하세요.');
      return;
    }
    if (mode === 'register' && password !== password2) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        setMessage('로그인되었습니다.');
      } else {
        await signUp(email, password);
        setMessage(
          '가입 요청이 접수되었습니다. 이메일 인증을 켠 프로젝트라면 메일함의 링크를 확인한 뒤 로그인하세요.',
        );
      }
      setPassword('');
      setPassword2('');
    } catch (err) {
      setError(err.message || '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: compact ? 300 : 340,
        padding: '1rem 1.1rem',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem' }}>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
            setMessage(null);
          }}
          style={{
            flex: 1,
            padding: '0.45rem',
            borderRadius: '8px',
            border: mode === 'login' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: mode === 'login' ? 'rgba(99,102,241,0.08)' : 'var(--background)',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <LogIn size={15} />
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
            setMessage(null);
          }}
          style={{
            flex: 1,
            padding: '0.45rem',
            borderRadius: '8px',
            border: mode === 'register' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: mode === 'register' ? 'rgba(99,102,241,0.08)' : 'var(--background)',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <UserPlus size={15} />
          회원가입
        </button>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>이메일</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>비밀번호</label>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
            }}
          />
        </div>
        {mode === 'register' && (
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
              비밀번호 확인
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
              }}
            />
          </div>
        )}
        {error && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--danger)', lineHeight: 1.4 }}>
            {error}
          </p>
        )}
        {message && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--secondary)', lineHeight: 1.4 }}>
            {message}
          </p>
        )}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.55rem' }} disabled={busy}>
          {busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
    </div>
  );
}
