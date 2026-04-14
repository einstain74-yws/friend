import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, FileText, Lock, ArrowLeft, ShieldCheck, QrCode, Trash2, Link2, Cloud } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StudentManager from './components/StudentManager';
import SociogramNetwork from './components/SociogramNetwork';
import InsightsDashboard from './components/InsightsDashboard';
import SurveyForm from './components/SurveyForm';
import { decodeRosterFromLocation, buildStudentAccessUrl, stripRosterFromAddressBar } from './utils/rosterUrl';
import { isCloudEnabled } from './config.js';
import * as cloudApi from './api/cloudApi.js';
import AuthPanel from './components/AuthPanel.jsx';

const LS_SESSION = 'sociogram_cloud_session_id';

function App() {
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
    const q = new URLSearchParams(window.location.search).get('session');
    if (q) return q;
    if (isCloudEnabled()) return localStorage.getItem(LS_SESSION);
    return null;
  });

  const [cloudReady, setCloudReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!isCloudEnabled()) return true;
    const q = new URLSearchParams(window.location.search).get('session');
    const stored = localStorage.getItem(LS_SESSION);
    return !(q || stored);
  });

  const rosterSyncTimer = useRef(null);

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
    const sid = q || localStorage.getItem(LS_SESSION);
    if (!sid) {
      setCloudReady(true);
      return;
    }
    setSessionId(sid);
    localStorage.setItem(LS_SESSION, sid);
    (async () => {
      try {
        const [st, resp] = await Promise.all([cloudApi.fetchRoster(sid), cloudApi.fetchResponses(sid)]);
        setStudents(st);
        setResponses(resp);
      } catch (e) {
        console.error(e);
        alert(
          'Supabase에서 데이터를 불러오지 못했습니다. VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY와 SQL 마이그레이션을 확인하세요.'
        );
      } finally {
        setCloudReady(true);
        if (window.location.search.includes('session=')) {
          const u = new URL(window.location.href);
          u.searchParams.delete('session');
          window.history.replaceState(null, '', u.pathname + u.search + window.location.hash);
        }
        stripRosterFromAddressBar();
      }
    })();
  }, []);

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

  const addStudent = (name) => {
    if (!name.trim()) return;
    const newStudent = { id: Date.now().toString(), name: name.trim() };
    setStudents([...students, newStudent]);
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
    setStudents(students.filter(s => s.id !== id));
    setResponses(responses.filter(r => r.authorId !== id).map(r => ({
      ...r,
      q1: r.q1.filter(x => x !== id),
      q2: r.q2.filter(x => x !== id),
      q3: r.q3.filter(x => x !== id),
      q4: r.q4.filter(x => x !== id),
      q5: r.q5.filter(x => x !== id)
    })));
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
        alert('Supabase에 저장하지 못했습니다. 네트워크를 확인해 주세요.');
        return;
      }
    }
    const newResponses = responses.filter((r) => r.authorId !== surveyData.authorId);
    setResponses([...newResponses, surveyData]);
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

  const handleCreateCloudSession = async () => {
    try {
      const { id } = await cloudApi.createSession();
      setSessionId(id);
      localStorage.setItem(LS_SESSION, id);
      await cloudApi.putRoster(id, students);
      await cloudApi.putResponses(id, responses);
      alert(
        '클라우드 클래스가 생성되었습니다. 학생용 QR·링크는 짧은 주소(?session=)로 생성되며, 제출 내용이 Supabase에 모입니다.'
      );
    } catch (e) {
      alert(e.message || '세션을 만들 수 없습니다. Supabase URL·키·SQL 마이그레이션을 확인하세요.');
    }
  };

  const handleJoinCloudSession = async () => {
    const raw = window.prompt('연결할 세션 ID를 붙여 넣으세요. (다른 PC에서 복사)');
    if (!raw?.trim()) return;
    const id = raw.trim();
    try {
      const [st, resp] = await Promise.all([cloudApi.fetchRoster(id), cloudApi.fetchResponses(id)]);
      setSessionId(id);
      localStorage.setItem(LS_SESSION, id);
      setStudents(st);
      setResponses(resp);
      alert('서버 데이터를 불러왔습니다.');
    } catch {
      alert('세션을 찾을 수 없거나 서버 오류입니다.');
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

  const handleChangePassword = () => {
    const currentPw = prompt('현재 비밀번호를 입력하세요.');
    if (currentPw === adminPassword) {
      const newPw = prompt('새로운 비밀번호를 입력하세요.');
      if (newPw) {
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

  // HOME GATEWAY VIEW
  if (view === 'home') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 5 }}>
          <AuthPanel />
        </div>

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
          {activeHistoryId === 'current' 
            ? `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 현재 교우 관계 분석` 
            : `과거 기록: ${surveyHistory.find(h => h.id === activeHistoryId)?.title || '알 수 없음'}`}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <AuthPanel compact />
          <button className="btn" style={{ background: 'var(--background)', border: '1px solid var(--border)' }} onClick={handleChangePassword}>
            <Lock size={18} />
            비밀번호 변경
          </button>
          <button className="btn" style={{ background: 'var(--background)', border: '1px solid var(--border)' }} onClick={() => setView('home')}>
            <ArrowLeft size={18} />
            처음 화면으로
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
              {isCloudEnabled() && (
                <div className="panel-section" style={{ borderBottom: 'none' }}>
                  <h2 className="panel-title" style={{ alignItems: 'center', gap: '0.35rem' }}>
                    <Cloud size={18} />
                    클라우드 (서버 동기화)
                  </h2>
                  {sessionId ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                      세션 ID가 저장되어 있습니다. 명단·설문 제출이 같은 서버에 모이며, 다른 컴퓨터에서도{' '}
                      <strong>세션 ID로 연결</strong>하면 같은 결과를 볼 수 있습니다.
                      <br />
                      <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{sessionId}</code>
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                      새로 만들면 학생용 링크가 <code>?session=</code> 한 줄로 짧아지고, 제출 데이터가 서버에 쌓입니다.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!sessionId && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleCreateCloudSession}
                      >
                        새 클라우드 클래스 만들기
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn"
                      style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--background)' }}
                      onClick={handleJoinCloudSession}
                    >
                      세션 ID로 연결 (다른 PC)
                    </button>
                  </div>
                </div>
              )}
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

export default App;
