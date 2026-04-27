import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { School, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import * as cloudApi from '../api/cloudApi.js';

export default function TeacherClassList() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState(3);
  const [className, setClassName] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    cloudApi
      .listClassrooms()
      .then(setRows)
      .catch((e) => setError(e.message || '목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const addClassroom = async (e) => {
    e.preventDefault();
    if (!schoolName.trim() || !className.trim()) return;
    setAdding(true);
    setError('');
    try {
      const { session_id } = await cloudApi.createClassroomForTeacher(
        schoolName.trim(),
        Number(grade),
        className.trim()
      );
      setSchoolName('');
      setClassName('');
      navigate(`/teacher/session/${encodeURIComponent(session_id)}`);
    } catch (err) {
      setError(err.message || '학급을 만들지 못했습니다.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.35rem', margin: 0 }}>내 학급</h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</span>
            <button type="button" className="btn" onClick={() => signOut().then(() => navigate('/'))} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </header>

        <form
          onSubmit={addClassroom}
          style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '1.25rem',
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <strong style={{ fontSize: '0.9rem' }}>학급 추가</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <input
              placeholder="학교명"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              style={{ flex: '1 1 140px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <input
              type="number"
              min={1}
              max={12}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              style={{ width: '72px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <span style={{ fontSize: '0.85rem' }}>학년</span>
            <input
              placeholder="반"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              style={{ flex: '1 1 80px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <button type="submit" className="btn btn-primary" disabled={adding} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={16} />
              {adding ? '생성 중…' : '추가 후 열기'}
            </button>
          </div>
        </form>

        {error ? (
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }} role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>불러오는 중…</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/teacher/session/${encodeURIComponent(r.session_id)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text-main)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <School size={22} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.school_name}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {r.grade}학년 {r.class_name} · QR/분석 열기
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>등록된 학급이 없습니다. 위에서 학급을 추가하세요.</p>
        ) : null}

        <p style={{ marginTop: '1.5rem' }}>
          <Link to="/">앱 첫 화면</Link>
        </p>
      </div>
    </div>
  );
}
