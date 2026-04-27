import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { SociogramApp } from '../SociogramApp.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as cloudApi from '../api/cloudApi.js';

export default function TeacherSessionPage() {
  const { sessionId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [err, setErr] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth/login', { replace: true, state: { from: `/teacher/session/${sessionId}` } });
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      setErr('');
      try {
        const row = await cloudApi.getClassroomBySessionId(sessionId);
        if (cancelled) return;
        if (!row || row.owner_id !== user.id) {
          setErr('이 학급에 대한 권한이 없거나 존재하지 않습니다.');
          setClassroom(null);
        } else {
          setClassroom(row);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || '확인하지 못했습니다.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        확인 중…
      </div>
    );
  }

  if (err || !classroom) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', background: 'var(--background)' }}>
        <p style={{ color: 'var(--danger)' }}>{err || '오류'}</p>
        <Link to="/teacher">학급 목록</Link>
      </div>
    );
  }

  const label = `${classroom.school_name} ${classroom.grade}학년 ${classroom.class_name}`;

  return (
    <SociogramApp
      initialSessionId={classroom.session_id}
      classroomLabel={label}
      onLeaveTeacher={() => navigate('/teacher')}
    />
  );
}
