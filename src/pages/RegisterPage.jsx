import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { getAuthEmailRedirectTo } from '../utils/siteUrl.js';
import * as cloudApi from '../api/cloudApi.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState(3);
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!schoolName.trim() || !className.trim()) {
      setError('학교명과 반을 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
      const redirectTo = getAuthEmailRedirectTo();
      const { data, error: signErr } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (signErr) throw signErr;

      if (data.session) {
        await cloudApi.createClassroomForTeacher(schoolName.trim(), Number(grade), className.trim());
        navigate('/teacher', { replace: true });
      } else {
        alert(
          '가입 메일을 보냈습니다. 이메일의 링크를 확인한 뒤 로그인하고, 같은 화면에서 학급을 추가해 주세요. (인증을 끈 프로젝트는 바로 로그인됩니다.)'
        );
        navigate('/auth/login', { replace: true });
      }
    } catch (err) {
      setError(err.message || '가입에 실패했습니다.');
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
          maxWidth: '440px',
          background: 'white',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>교사 회원가입</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          계정을 만든 뒤 첫 학급(학교·학년·반)이 함께 등록됩니다. 이후 로그인한 뒤 학급을 관리합니다.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>이메일</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>비밀번호</label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>학교명</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="예: ○○초등학교"
            required
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>학년 (1–12)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            required
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>반</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="예: 2반"
            required
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
          {error ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ marginTop: '0.5rem', padding: '0.7rem' }}>
            {busy ? '처리 중…' : '가입 및 첫 학급 만들기'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <Link to="/auth/login">이미 계정이 있음</Link>
          {' · '}
          <Link to="/">앱 첫 화면</Link>
        </p>
      </div>
    </div>
  );
}
