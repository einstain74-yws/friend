import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Users, FileText, Lock, ArrowLeft, ShieldCheck, QrCode, Trash2, Link2, School } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StudentManager from './components/StudentManager';
import SociogramNetwork from './components/SociogramNetwork';
import InsightsDashboard from './components/InsightsDashboard';
import SurveyForm from './components/SurveyForm';
import {
  decodeRosterFromLocation,
  buildStudentAccessUrl,
  parseSessionIdFromInput,
  stripRosterFromAddressBar,
} from './utils/rosterUrl';
import { isCloudEnabled, isSupabaseTeacherPortalEnabled } from './config.js';
import { Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import * as cloudApi from './api/cloudApi.js';

const LS_SESSION = 'sociogram_cloud_session_id';

/**
 * @param {object} props
 * @param {string | null} [props.initialSessionId] - /teacher/session/:id (학급 관리) 직접 진입
 * @param {() => void} [props.onLeaveTeacher] - 교사 뷰에서 "학급 목록으로" (로그인 경로)
 * @param {string | null} [props.classroomLabel] - 대시보드에 학교/학년/반 표시
 */
export function SociogramApp({ initialSessionId = null, onLeaveTeacher = null, classroomLabel = null }) {
  const { user } = useAuth();
  const [view, setView] = useState('home'); // 'home' | 'teacher' | 'survey'
  const [showQR, setShowQR] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('sociogram_admin_pw') || '0000';
  });
  
  const [students, setStudents] = useState(() => {
    try {
      /** 다른 기기(학생 폰)에서는 localStorage가 비어 있음 → 주소의 명단(#r=) 우선 */
      const fromUrl = decodeRosterFromLocation();
      if (fromUrl?.length) return fromUrl;
    } catch {
      /* ignore */
    }
    try {
      const saved = localStorage.getItem('sociogram_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [responses, setResponses] = useState(() => {
    const saved = localStorage.getItem('sociogram_responses');
    return saved ? JSON.parse(saved) : [];
  });

  const [surveyHistory, setSurveyHistory] = useState(() => {
    const saved = localStorage.getItem('sociogram_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeHistoryId, setActiveHistoryId] = useState('current');

  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === 'undefined') return null;
    if (initialSessionId) return initialSessionId;
    const q = new URLSearchParams(window.location.search).get('session');
    if (q) return q;
    if (isCloudEnabled()) return localStorage.getItem(LS_SESSION);
    return null;
  });

  const [cloudReady, setCloudReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!isCloudEnabled()) return true;
    if (initialSessionId) return false;
    const q = new URLSearchParams(window.location.search).get('session');
    const stored = localStorage.getItem(LS_SESSION);
    return !(q || stored);
  });

  const rosterSyncTimer = useRef(null);

  const [connectInput, setConnectInput] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [homeClassLabel, setHomeClassLabel] = useState(null);

  /** 홈: 로그인한 교사 + session에 연결된 classrooms 행이 있을 때만 학교·학년·반 표시 */
  useEffect(() => {
    if (!isSupabaseTeacherPortalEnabled() || !isCloudEnabled() || !sessionId || !user?.id) {
      setHomeClassLabel(null);
      return;
    }
    let cancelled = false;
    cloudApi
      .getClassroomBySessionId(sessionId)
      .then((row) => {
        if (cancelled) return;
        if (row && row.owner_id === user.id) {
          setHomeClassLabel(`${row.school_name} ${row.grade}학년 ${row.class_name}`);
        } else {
          setHomeClassLabel(null);
        }
      })
      .catch(() => {
        if (!cancelled) setHomeClassLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id]);

  const loadFromCloud = useCallback(async (sid) => {
    const [st, resp, remotePw] = await Promise.all([
      cloudApi.fetchRoster(sid),
      cloudApi.fetchResponses(sid),
      cloudApi.fetchAdminPassword(sid).catch((err) => {
        console.error(err);
        return null;
      }),
    ]);
    setStudents(st);
    setResponses(resp);
    const fromLs = localStorage.getItem('sociogram_admin_pw') || '0000';
    if (remotePw != null && String(remotePw).length > 0) {
      setAdminPassword(String(remotePw));
      localStorage.setItem('sociogram_admin_pw', String(remotePw));
    } else {
      setAdminPassword(fromLs);
      if (fromLs && fromLs !== '0000') {
        cloudApi.putAdminPassword(sid, fromLs).catch((e) => console.warn('교사 비밀번호를 서버에 맞춤 저장하지 못했습니다.', e));
      }
    }
    if (window.location.search.includes('session=')) {
      const u = new URL(window.location.href);
      u.searchParams.delete('session');
      window.history.replaceState(null, '', u.pathname + u.search + window.location.hash);
    }
    stripRosterFromAddressBar();
  }, []);

  const connectToSession = useCallback(
    async (id, onFailReset) => {
      setConnectError('');
      setConnectBusy(true);
      setCloudReady(false);
      try {
        localStorage.setItem(LS_SESSION, id);
        setSessionId(id);
        await loadFromCloud(id);
      } catch (e) {
        console.error(e);
        if (onFailReset) {
          setSessionId(null);
          localStorage.removeItem(LS_SESSION);
        }
        alert(
          '클라우드에서 데이터를 불러오지 못했습니다. VITE_FIREBASE_* (Firestore) 또는 VITE_SUPABASE_* 와 Supabase SQL 마이그레이션을 확인하세요.'
        );
      } finally {
        setConnectBusy(false);
        setCloudReady(true);
      }
    },
    [loadFromCloud]
  );

  const createNewClass = useCallback(async () => {
    setConnectError('');
    setConnectBusy(true);
    setCloudReady(false);
    try {
      const { id } = await cloudApi.createSession();
      localStorage.setItem(LS_SESSION, id);
      setSessionId(id);
      await loadFromCloud(id);
    } catch (e) {
      console.error(e);
      localStorage.removeItem(LS_SESSION);
      setSessionId(null);
      alert('새 클래스를 만들지 못했습니다. 네트워크와 Supabase 설정을 확인해 주세요.');
    } finally {
      setConnectBusy(false);
      setCloudReady(true);
    }
  }, [loadFromCloud]);

  useEffect(() => {
    localStorage.setItem('sociogram_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('sociogram_responses', JSON.stringify(responses));
  }, [responses]);

  useEffect(() => {
    localStorage.setItem('sociogram_history', JSON.stringify(surveyHistory));
  }, [surveyHistory]);

  /** 명단을 주소에 실어 들어온 경우 로드 후 긴 해시 제거 */
  useEffect(() => {
    stripRosterFromAddressBar();
  }, []);

  /** 서버 세션이 있으면 명단·응답을 한곳에서 불러옴 */
  useEffect(() => {
    if (!isCloudEnabled()) {
      setCloudReady(true);
      return;
    }
    const q = new URLSearchParams(window.location.search).get('session');
    const sid = initialSessionId || q || localStorage.getItem(LS_SESSION);
    if (!sid) {
      setCloudReady(true);
      return;
    }
    setSessionId(sid);
    localStorage.setItem(LS_SESSION, sid);
    (async () => {
      setCloudReady(false);
      try {
        await loadFromCloud(sid);
        if (initialSessionId) {
          setView('teacher');
        }
      } catch (e) {
        console.error(e);
        alert(
          '클라우드에서 데이터를 불러오지 못했습니다. VITE_FIREBASE_* (Firestore) 또는 VITE_SUPABASE_* 와 Supabase SQL 마이그레이션을 확인하세요.'
        );
      } finally {
        setCloudReady(true);
      }
    })();
  }, [loadFromCloud, initialSessionId]);

  /** 클라우드 세션일 때 명단을 서버에 반영 */
  useEffect(() => {
    if (!isCloudEnabled() || !sessionId) return;
    if (rosterSyncTimer.current) clearTimeout(rosterSyncTimer.current);
    rosterSyncTimer.current = setTimeout(() => {
      cloudApi.putRoster(sessionId, students).catch((e) => console.error('roster sync', e));
    }, 700);
    return () => clearTimeout(rosterSyncTimer.current);
  }, [students, sessionId]);

  /** 교사 화면·진행 중 설문일 때 응답 주기적 갱신 */
  useEffect(() => {
    if (!isCloudEnabled() || !sessionId) return;
    if (view !== 'teacher' || activeHistoryId !== 'current') return;
    const poll = () => {
      cloudApi.fetchResponses(sessionId).then(setResponses).catch((e) => console.error('poll', e));
    };
    poll();
    const id = setInterval(poll, 12000);
    return () => clearInterval(id);
  }, [view, sessionId, activeHistoryId]);

  /** 탭/앱을 다시 켤 때 서버에 저장된 교사 비밀번호를 가져와 다른 기기에서 바꾼 값과 맞춤 */
  useEffect(() => {
    if (!isCloudEnabled() || !sessionId) return;
    const syncPw = () => {
      if (document.visibilityState !== 'visible') return;
      cloudApi
        .fetchAdminPassword(sessionId)
        .then((remote) => {
          if (remote != null && String(remote).length > 0) {
            setAdminPassword(String(remote));
            localStorage.setItem('sociogram_admin_pw', String(remote));
          }
        })
        .catch((e) => console.warn('교사 비밀번호 갱신', e));
    };
    document.addEventListener('visibilitychange', syncPw);
    return () => document.removeEventListener('visibilitychange', syncPw);
  }, [sessionId]);

  const addStudent = (name) => {
    if (!name.trim()) return;
    const newStudent = { id: Date.now().toString(), name: name.trim() };
    setStudents((prev) => [...prev, newStudent]);
  };

  const addMultipleStudents = (names) => {
    const validNames = names.filter(name => name && name.trim());
    if (validNames.length === 0) return;
    
    const newStudents = validNames.map((name, idx) => ({
      id: (Date.now() + idx).toString(),
      name: name.trim()
    }));
    
    setStudents(prev => [...prev, ...newStudents]);
  };

  const removeStudent = (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setResponses((prev) =>
      prev
        .filter((r) => r.authorId !== id)
        .map((r) => ({
          ...r,
          q1: r.q1.filter((x) => x !== id),
          q2: r.q2.filter((x) => x !== id),
          q3: r.q3.filter((x) => x !== id),
          q4: r.q4.filter((x) => x !== id),
          q5: r.q5.filter((x) => x !== id),
        })),
    );
  };

  const clearAllStudents = () => {
    setStudents([]);
    setResponses([]);
  };

  /** 과거 기록 보다가 '진행 중인 설문'으로 올 때, 명단을 가장 최근 마감 스냅샷 기준으로 맞춤 */
  const handleSelectCurrentSurvey = () => {
    if (activeHistoryId !== 'current' && surveyHistory.length > 0) {
      const latest = surveyHistory[surveyHistory.length - 1];
      const nextStudents = latest.students.map((s) => ({ ...s }));
      setStudents(nextStudents);
      const validIds = new Set(nextStudents.map((s) => s.id));
      setResponses((prev) =>
        prev
          .filter((r) => validIds.has(r.authorId))
          .map((r) => ({
            ...r,
            q1: r.q1.filter((id) => validIds.has(id)),
            q2: r.q2.filter((id) => validIds.has(id)),
            q3: r.q3.filter((id) => validIds.has(id)),
            q4: r.q4.filter((id) => validIds.has(id)),
            q5: r.q5.filter((id) => validIds.has(id)),
          }))
      );
    }
    setActiveHistoryId('current');
  };

  const handleSurveySubmit = async (surveyData) => {
    if (isCloudEnabled() && sessionId) {
      try {
        await cloudApi.postResponse(sessionId, surveyData);
      } catch {
        alert('클라우드에 저장하지 못했습니다. 네트워크와 Firestore/Supabase 설정을 확인해 주세요.');
        return;
      }
    }
    setResponses((prev) => {
      const next = prev.filter((r) => r.authorId !== surveyData.authorId);
      return [...next, surveyData];
    });
    setView('home');
  };

  const activeResponses = activeHistoryId === 'current' 
    ? responses 
    : (surveyHistory.find(h => h.id === activeHistoryId)?.responses || []);

  const activeStudents = activeHistoryId === 'current'
    ? students
    : (surveyHistory.find(h => h.id === activeHistoryId)?.students || []);

  const relationships = useMemo(() => {
    const rels = [];
    activeResponses.forEach(r => {
      r.q4.forEach(targetId => {
        rels.push({ id: `rel_${r.authorId}_${targetId}_pos`, source: r.authorId, target: targetId, type: 'positive' });
      });
      r.q5.forEach(targetId => {
        rels.push({ id: `rel_${r.authorId}_${targetId}_neg`, source: r.authorId, target: targetId, type: 'negative' });
      });
    });
    return rels;
  }, [activeResponses]);

  const handleCloseSurvey = () => {
    const today = new Date();
    const defaultTitle = `${today.getMonth() + 1}월 ${today.getDate()}일 설문 마감`;
    const title = prompt('마감할 설문의 제목(또는 마감일)을 입력하세요.', defaultTitle);

    if (title) {
      const newHistory = {
        id: Date.now().toString(),
        title: title,
        responses: [...responses],
        students: [...students],
      };
      setSurveyHistory([...surveyHistory, newHistory]);
      setResponses([]);
      if (isCloudEnabled() && sessionId) {
        cloudApi.putResponses(sessionId, []).catch((e) => console.error('close survey sync', e));
      }
      alert('설문이 마감되고 결과가 저장되었습니다. 과거 기록에서 열람할 수 있습니다.');
    }
  };

  const handleRemoveHistory = (e, idToDelete) => {
    e.stopPropagation();
    if (window.confirm('이 과거 설문 기록을 정말로 삭제하시겠습니까?\n(삭제 후에는 복구할 수 없습니다)')) {
      if (activeHistoryId === idToDelete) {
        setActiveHistoryId('current');
      }
      setSurveyHistory(surveyHistory.filter(h => h.id !== idToDelete));
    }
  };

  const handleTeacherAccess = () => {
    const isInitial = adminPassword === '0000';
    const pwPrompt = isInitial 
      ? '교사용 페이지입니다. 비밀번호를 입력하세요. (초기 비밀번호: 0000)'
      : '교사용 페이지입니다. 비밀번호를 입력하세요.';
      
    const password = prompt(pwPrompt);
    if (password === adminPassword) {
      setView('teacher');
    } else if (password !== null) {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const handleChangePassword = async () => {
    const currentPw = prompt('현재 비밀번호를 입력하세요.');
    if (currentPw === adminPassword) {
      const newPw = prompt('새로운 비밀번호를 입력하세요.');
      if (newPw) {
        if (isCloudEnabled() && sessionId) {
          try {
            await cloudApi.putAdminPassword(sessionId, newPw);
          } catch (e) {
            console.error(e);
            alert(
              e?.message ||
                '서버에 비밀번호를 저장하지 못했습니다. Supabase `admin_password` 열(마이그레이션 004)과 네트워크를 확인하세요. 다른 기기에 반영되지 않을 수 있습니다.'
            );
            return;
          }
        }
        setAdminPassword(newPw);
        localStorage.setItem('sociogram_admin_pw', newPw);
        alert('비밀번호가 변경되었습니다.');
      }
    } else if (currentPw !== null) {
      alert('현재 비밀번호가 틀렸습니다.');
    }
  };

  if (!cloudReady && isCloudEnabled()) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.75rem',
          color: 'var(--text-muted)',
          background: 'var(--background)',
        }}
      >
        <p style={{ margin: 0 }}>서버에서 데이터를 불러오는 중…</p>
      </div>
    );
  }

  /** 클라우드인데 이 브라우저에 `session`이 없을 때: 새로 만들기 또는 기존 URL·UUID로 연결 (로그인 학급 URL 직접진입은 initialSessionId로 스킵) */
  if (isCloudEnabled() && !sessionId && !initialSessionId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: 'white',
            padding: '1.75rem 1.5rem',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>클라우드 클래스 연결</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
            다른 PC나 브라우저에서도 <strong>같은</strong> 명단·설문을 보려면, 아래에서 기존 주소로 들어오거나 새 클래스를 만든 뒤 &quot;다른 PC용 주소
            복사&quot;로 즐겨찾기해 두면 됩니다.
            {isSupabaseTeacherPortalEnabled() ? (
              <>
                <br />
                <br />
                <Link to="/auth/login">교사로 로그인</Link>
                {` · `}
                <Link to="/auth/register">학급(학교/학년/반)으로 가입</Link>
                하면 URL 붙여넣기 없이 관리할 수 있습니다.
              </>
            ) : null}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConnectError('');
              const id = parseSessionIdFromInput(connectInput);
              if (!id) {
                setConnectError('?session= 이 있는 페이지 주소를 붙여 넣거나, UUID만 입력해 주세요.');
                return;
              }
              void connectToSession(id, true);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>기존 클래스 URL 또는 세션 ID</label>
            <input
              type="text"
              value={connectInput}
              onChange={(e) => {
                setConnectInput(e.target.value);
                if (connectError) setConnectError('');
              }}
              placeholder="https://...?session=... 또는 xxxxxxxx-xxxx-..."
              disabled={connectBusy}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
              }}
            />
            {connectError ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--danger)' }} role="alert">
                {connectError}
              </p>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={connectBusy}
                style={{ width: '100%', padding: '0.7rem' }}
              >
                {connectBusy ? '연결 중…' : '이 주소(세션)로 연결'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={connectBusy}
                onClick={() => void createNewClass()}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                새 클래스 만들기
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // HOME GATEWAY VIEW
  if (view === 'home') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isCloudEnabled() && sessionId && homeClassLabel ? (
          <div
            style={{
              position: 'absolute',
              top: '2rem',
              left: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-main)',
              fontWeight: 600,
              maxWidth: 'min(80vw, 22rem)',
            }}
            role="status"
            aria-label="현재 학급"
          >
            <School size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.35, fontSize: '0.95rem' }}>{homeClassLabel}</span>
          </div>
        ) : null}
        <button 
          onClick={() => setShowQR(true)}
          style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', color: 'var(--text-main)', fontWeight: 'bold' }}
        >
          <QrCode size={20} color="var(--primary)" />
          학생 접속용 QR코드 
        </button>

        {showQR && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowQR(false)}>
            <div style={{ background: 'white', padding: '2rem 2.25rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-xl)', gap: '1rem', textAlign: 'center', maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>학생 접속용 QR</h2>
              {students.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  먼저 <strong>교사용</strong>에서 명단을 등록한 뒤, 이 화면을 다시 여 주세요.
                </p>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  스마트폰 카메라로 QR을 스캔하면 설문으로 이동합니다.
                </p>
              )}
              <div style={{ padding: '1rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', lineHeight: 0 }}>
                <QRCodeSVG
                  value={buildStudentAccessUrl(students, isCloudEnabled() && sessionId ? sessionId : null)}
                  size={280}
                  level="L"
                  includeMargin
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)' }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        buildStudentAccessUrl(students, isCloudEnabled() && sessionId ? sessionId : null)
                      );
                      alert(
                        students.length
                          ? isCloudEnabled() && sessionId
                            ? '클라우드 링크를 복사했습니다. 학생 제출이 서버에 모입니다.'
                            : '명단이 포함된 주소를 복사했습니다.'
                          : '주소를 복사했습니다. 교사용에서 명단을 넣은 뒤 다시 복사하세요.'
                      );
                    } catch {
                      alert('복사에 실패했습니다. 브라우저 설정에서 클립보드 권한을 확인해 주세요.');
                    }
                  }}
                >
                  <Link2 size={16} />
                  명단 포함 링크 복사
                </button>
                <button
                  onClick={() => setShowQR(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Users size={40} />
            학급 교우 관계 분석기
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>학생 설문에 참여하거나 교사용 결과 대시보드로 이동하세요.</p>
          {isSupabaseTeacherPortalEnabled() ? (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.95rem' }}>
              <Link to="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>교사 로그인</Link>
              {' · '}
              <Link to="/auth/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>교사 회원가입(학급)</Link>
              {' · '}
              <Link to="/teacher" style={{ color: 'var(--primary)', fontWeight: 600 }}>내 학급 목록</Link>
            </p>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '2rem' }}>
          <div 
            onClick={() => setView('survey')}
            style={{
              background: 'white', padding: '3rem 4rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', width: '300px'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ background: '#EEF2FF', padding: '1.5rem', borderRadius: '50%', color: 'var(--primary)' }}>
              <FileText size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>학생용</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>나의 교우 관계와 솔직한 생각을 설문에 작성합니다.</p>
          </div>

          <div 
            onClick={handleTeacherAccess}
            style={{
              background: 'white', padding: '3rem 4rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', width: '300px'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ background: '#FEF2F2', padding: '1.5rem', borderRadius: '50%', color: 'var(--danger)' }}>
              <ShieldCheck size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>교사용</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>설문 결과를 바탕으로 관계도와 통계를 분석합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // SURVEY VIEW
  if (view === 'survey') {
    return (
      <div style={{ background: '#f3f4f6' }}>
        <SurveyForm 
          students={students} 
          responses={responses}
          onSubmit={handleSurveySubmit} 
          onCancel={() => setView('home')} 
        />
      </div>
    );
  }

  // TEACHER DASHBOARD VIEW
  return (
    <div className="app-container">
      <header className="header">
        <h1>
          <Users size={28} />
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
            {classroomLabel ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{classroomLabel}</span>
            ) : null}
            <span>
              {activeHistoryId === 'current'
                ? `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 현재 교우 관계 분석`
                : `과거 기록: ${surveyHistory.find((h) => h.id === activeHistoryId)?.title || '알 수 없음'}`}
            </span>
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
            onClick={handleChangePassword}
            title="교사용 화면 진입 시 묻는 비밀번호를 바꿉니다 (계정 로그인 아님)"
          >
            <Lock size={18} />
            교사 접속 비밀번호
          </button>
          <button
            className="btn"
            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
            onClick={() => (onLeaveTeacher ? onLeaveTeacher() : setView('home'))}
          >
            <ArrowLeft size={18} />
            {onLeaveTeacher ? '학급 목록으로' : '처음 화면으로'}
          </button>
        </div>
      </header>
      
      <main className="main-content">
        <aside className="sidebar">
          {activeHistoryId === 'current' ? (
            <>
              <StudentManager
                students={students}
                onAdd={addStudent}
                onAddMultiple={addMultipleStudents}
                onRemove={removeStudent}
                onClearAll={clearAllStudents}
              />
            </>
          ) : (
            <div className="panel-section">
              <h2 className="panel-title">설문 잠김</h2>
              <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>과거 기록을 열람 중입니다. 명단을 수정할 수 없습니다.</p>
            </div>
          )}
          
          <div className="panel-section" style={{ borderBottom: 'none' }}>
            <h2 className="panel-title">과거 설문 기록</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li 
                style={{ padding: '0.5rem', background: activeHistoryId === 'current' ? 'var(--primary)' : '#f3f4f6', color: activeHistoryId === 'current' ? 'white' : 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={handleSelectCurrentSurvey}
              >
                진행 중인 설문
              </li>
              {surveyHistory.map(h => (
                <li 
                  key={h.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: activeHistoryId === h.id ? 'var(--primary)' : '#f3f4f6', color: activeHistoryId === h.id ? 'white' : 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                  onClick={() => setActiveHistoryId(h.id)}
                >
                  <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{h.title}</span>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '0.2rem', color: activeHistoryId === h.id ? 'rgba(255,255,255,0.8)' : '#9ca3af' }}
                    onClick={(e) => handleRemoveHistory(e, h.id)}
                    title="기록 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {activeHistoryId === 'current' && (
            <div className="panel-section" style={{ borderBottom: 'none', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn" 
                style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleCloseSurvey}
              >
                현재 설문 마감 및 저장
              </button>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center'}}>
                설문을 마감하면 결과가 저장되고 응답이 초기화됩니다.
              </p>
            </div>
          )}
        </aside>
        
        <section className="graph-area">
          <SociogramNetwork 
            students={activeStudents} 
            relationships={relationships}
            responses={activeResponses}
            snapshotKey={activeHistoryId}
          />
        </section>
        
        <aside className="dashboard-panel">
          <InsightsDashboard 
            students={activeStudents} 
            relationships={relationships} 
            responses={activeResponses}
          />
        </aside>
      </main>
    </div>
  );
}
