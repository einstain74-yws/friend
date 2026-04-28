import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, CircleCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthWelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
          maxWidth: '440px',
          background: 'white',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--primary)' }}>
          <CircleCheck size={40} aria-hidden />
        </div>
        <h1 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>가입을 환영합니다</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
          이메일 인증이 완료되었습니다.
          {user?.email ? (
            <>
              <br />
              <strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>
            </>
          ) : null}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          이제 학급을 등록하거나 앱 첫 화면으로 이동할 수 있습니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => navigate('/teacher', { replace: true })}>
            내 학급에서 반 만들기
          </button>
          <Link
            to="/"
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              textDecoration: 'none',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            <Users size={18} />
            교우관계 분석기 첫 화면
          </Link>
        </div>
      </div>
    </div>
  );
}
