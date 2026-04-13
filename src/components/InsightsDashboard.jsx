import React, { useMemo, useState } from 'react';
import { HeartHandshake, AlertCircle, HandHeart, MessageSquareText, Award, Frown, Download } from 'lucide-react';

export default function InsightsDashboard({ students, relationships, responses }) {
  const [showMessages, setShowMessages] = useState(false);

  // We have Q1, Q2, Q3 stats
  // and we still have Most Trusted (Q4) / Most Resented (Q5) logic
  const stats = useMemo(() => {
    const init = {};
    students.forEach(s => {
      init[s.id] = {
        id: s.id,
        name: s.name,
        q1_kind: 0,
        q2_mean: 0,
        q3_help: 0,
        q4_positiveIn: 0, // from relationships
        q5_negativeIn: 0, // from relationships
        totalIn: 0,
        totalOut: 0
      };
    });

    // Q1, Q2, Q3 counts
    if (responses) {
      responses.forEach(r => {
        r.q1.forEach(id => { if (init[id]) init[id].q1_kind++; });
        r.q2.forEach(id => { if (init[id]) init[id].q2_mean++; });
        r.q3.forEach(id => { if (init[id]) init[id].q3_help++; });
      });
    }

    // Relationships (Q4, Q5 and total degrees for isolation)
    relationships.forEach(r => {
      if (init[r.target] && init[r.source]) {
        if (r.type === 'positive') init[r.target].q4_positiveIn++;
        if (r.type === 'negative') init[r.target].q5_negativeIn++;
        
        init[r.target].totalIn++;
        init[r.source].totalOut++;
      }
    });

    const studentsArray = Object.values(init);

    const getTop5 = (key) => {
      return [...studentsArray]
        .filter(s => s[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .slice(0, 5);
    };

    return { 
      topQ1: getTop5('q1_kind'),
      topQ2: getTop5('q2_mean'),
      topQ3: getTop5('q3_help'),
      mostTrusted: getTop5('q4_positiveIn'),
      mostResented: getTop5('q5_negativeIn'),
      isolated: studentsArray.filter(s => s.totalIn === 0 && s.totalOut === 0)
    };
  }, [students, relationships, responses]);

  const [selectedNeurosisRisk, setSelectedNeurosisRisk] = useState(null);

  const neurosisRiskStudents = useMemo(() => {
    if (!responses) return [];
    
    return responses
      .filter(r => {
        if (typeof r.q6 === 'number' && typeof r.q7 === 'number' && typeof r.q8 === 'number') {
          const avg = (r.q6 + r.q7 + r.q8) / 3;
          return avg >= 4;
        }
        return false;
      })
      .map(r => {
        const student = students.find(s => s.id === r.authorId);
        return {
          id: r.authorId,
          name: student ? student.name : '알 수 없음',
          q6: r.q6,
          q7: r.q7,
          q8: r.q8,
          q9: r.q9,
          q10: r.q10,
          avg: ((r.q6 + r.q7 + r.q8) / 3).toFixed(1)
        };
      });
  }, [responses, students]);

  const downloadReport = () => {
    let textContent = `학급 교우 관계 분석 보고서\n생성일: ${new Date().toLocaleDateString()}\n\n`;
    
    const appendRanking = (title, dataList, countLabel) => {
      textContent += `[${title}]\n`;
      if (dataList.length === 0) {
        textContent += `데이터가 없습니다.\n\n`;
      } else {
        dataList.forEach((s, idx) => {
          textContent += `${idx + 1}위. ${s.name} (${s[countLabel]}표)\n`;
        });
        textContent += `\n`;
      }
    };

    appendRanking('1. 친절하고 존중하는 학생', stats.topQ1, 'q1_kind');
    appendRanking('2. 놀리거나 힘들게 하는 학생', stats.topQ2, 'q2_mean');
    appendRanking('3. 도움이 필요한 학생', stats.topQ3, 'q3_help');
    appendRanking('관계망 분석 - 가장 친한 친구로 지목된 학생', stats.mostTrusted, 'q4_positiveIn');
    appendRanking('관계망 분석 - 불편한 관계로 지목된 학생', stats.mostResented, 'q5_negativeIn');
    
    textContent += `[관계망 분석 - 고립된 학생(지목받지도, 하지도 않은 학생)]\n`;
    if (stats.isolated.length === 0) {
        textContent += `데이터가 없습니다.\n\n`;
    } else {
        stats.isolated.forEach((s) => {
            textContent += `- ${s.name}\n`;
        });
        textContent += `\n`;
    }

    textContent += "[심리검사 결과 (6~9번 문항, 리커트 5점 척도)]\n";
    let hasPsych = false;
    responses?.forEach(r => {
      if (r.hasOwnProperty('q6') && r.q6 !== null && typeof r.q6 === 'number') {
        const studentName = getStudentName(r.authorId);
        textContent += `- [${studentName}]\n`;
        textContent += `  6. 나에게 나쁜 일이...: ${r.q6}점\n`;
        textContent += `  7. 화가 나서 참지...: ${r.q7}점\n`;
        textContent += `  8. 죽어버리고 싶을...: ${r.q8}점\n`;
        textContent += `  9. 우리 반 아이들은...: ${r.q9}점\n`;
        hasPsych = true;
      }
    });

    if (!hasPsych) {
      textContent += `데이터가 없습니다.\n`;
    }
    textContent += `\n`;

    textContent += "[선생님께 남긴 메시지 (설문 10번 문항)]\n";
    let hasMessage = false;
    responses?.forEach(r => {
      // Changed from r.q6 to r.q10
      if (r.q10 && r.q10.trim()) {
        const studentName = getStudentName(r.authorId);
        textContent += `- [${studentName}]: ${r.q10}\n`;
        hasMessage = true;
      }
    });

    if (!hasMessage) {
      textContent += `메시지가 없습니다.\n`;
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학급설문_분석보고서_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStudentName = (id) => students.find(s => s.id === id)?.name || '알수없음';

  if (students.length === 0) {
    return (
      <div className="panel-section">
        <h2 className="panel-title">분석 대시보드</h2>
        <div className="empty-state">학생들을 추가하면 분석 결과가 나타납니다.</div>
      </div>
    );
  }

  return (
    <div className="panel-section" style={{padding: 0, border: 'none'}}>
      <div className="insight-header" style={{marginBottom: '1.5rem', justifyContent: 'space-between', display: 'flex', width: '100%'}}>
        <h2 className="panel-title" style={{margin: 0}}>통계 및 분석</h2>
        <button className="btn btn-icon" onClick={downloadReport} title="분석 결과를 텍스트로 저장하여 NotebookLM 등에서 활용하세요" style={{color: 'var(--primary)', background: '#EEF2FF', padding: '0.5rem 1rem'}}>
          <Download size={18} />
          <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>분석 보고서(TXT) 다운로드</span>
        </button>
      </div>
      
      {/* Question 1: Kind */}
      <div className="insight-card">
        <div className="insight-header-title" style={{color: '#059669', marginBottom: '1rem'}}>
          <HeartHandshake size={20} />
          1. 친절하고 존중하는 학생 (Top 5)
        </div>
        {stats.topQ1.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem'}}>데이터가 없습니다.</div>
        ) : (
          <ol className="ranking-list">
            {stats.topQ1.map((s, idx) => (
              <li key={s.id} className={`rank-${idx + 1}`}>
                <div className="rank-info">
                  <span className="rank-number">{idx + 1}</span>
                  <strong>{s.name}</strong>
                </div>
                <span className="count-badge" style={{color: '#059669', background: '#D1FAE5'}}>{s.q1_kind}표</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Question 2: Mean */}
      <div className="insight-card">
        <div className="insight-header-title" style={{color: '#DC2626', marginBottom: '1rem'}}>
          <AlertCircle size={20} />
          2. 놀리거나 힘들게 하는 학생 (Top 5)
        </div>
        {stats.topQ2.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem'}}>데이터가 없습니다.</div>
        ) : (
          <ol className="ranking-list">
            {stats.topQ2.map((s, idx) => (
              <li key={s.id} className={`rank-${idx + 1}`}>
                <div className="rank-info">
                  <span className="rank-number">{idx + 1}</span>
                  <strong>{s.name}</strong>
                </div>
                <span className="count-badge" style={{color: '#B91C1C', background: '#FEE2E2'}}>{s.q2_mean}표</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Question 3: Needs Help */}
      <div className="insight-card">
        <div className="insight-header-title" style={{color: '#4F46E5', marginBottom: '1rem'}}>
          <HandHeart size={20} />
          3. 도움이 필요한 학생 (Top 5)
        </div>
        {stats.topQ3.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem'}}>데이터가 없습니다.</div>
        ) : (
          <ol className="ranking-list">
            {stats.topQ3.map((s, idx) => (
              <li key={s.id} className={`rank-${idx + 1}`}>
                <div className="rank-info">
                  <span className="rank-number">{idx + 1}</span>
                  <strong>{s.name}</strong>
                </div>
                <span className="count-badge" style={{color: '#4338CA', background: '#EEF2FF'}}>{s.q3_help}표</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Section Divider for Q4/Q5 Relational stats (Legacy support/Sociogram summary) */}
      <div style={{margin: '2rem 0', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem'}}>
        관계망(도식) 분석 결과
      </div>

      <div className="insight-card">
        <div className="insight-header-title" style={{color: '#059669', marginBottom: '1rem'}}>
          <Award size={20} />
          가장 친한 친구로 지목된 (Top 5)
        </div>
        {stats.mostTrusted.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem'}}>데이터가 없습니다.</div>
        ) : (
          <ol className="ranking-list">
            {stats.mostTrusted.map((s, idx) => (
              <li key={s.id} className={`rank-${idx + 1}`}>
                <div className="rank-info">
                  <span className="rank-number">{idx + 1}</span>
                  <strong>{s.name}</strong>
                </div>
                <span className="count-badge" style={{color: '#059669', background: '#D1FAE5'}}>{s.q4_positiveIn}표</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="insight-card">
        <div className="insight-header-title" style={{color: '#D97706', marginBottom: '1rem'}}>
          <Frown size={20} />
          불편한 관계로 지목된 (Top 5)
        </div>
        {stats.mostResented.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem'}}>데이터가 없습니다.</div>
        ) : (
          <ol className="ranking-list">
            {stats.mostResented.map((s, idx) => (
              <li key={s.id} className={`rank-${idx + 1}`}>
                <div className="rank-info">
                  <span className="rank-number">{idx + 1}</span>
                  <strong>{s.name}</strong>
                </div>
                <span className="count-badge" style={{color: '#B45309', background: '#FEF3C7'}}>{s.q5_negativeIn}표</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Neurosis High Risk Group */}
      <div style={{margin: '2rem 0', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: '#9f1239'}}>
        신경증 고위험군 분석
      </div>

      <div className="insight-card" style={{borderColor: '#fda4af', backgroundColor: '#fff1f2'}}>
        <div className="insight-header-title" style={{color: '#be123c', marginBottom: '1rem'}}>
          <AlertCircle size={20} />
          신경증 고위험군
          <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#881337', marginLeft: '0.5rem'}}>(6, 7, 8번 평균 4.0 이상)</span>
        </div>
        {neurosisRiskStudents.length === 0 ? (
          <div className="empty-state" style={{padding: '1rem', color: '#be123c'}}>해당하는 학생이 없습니다.</div>
        ) : (
          <ul className="ranking-list" style={{listStyle: 'none', padding: 0, margin: 0}}>
            {neurosisRiskStudents.map((s) => (
              <li 
                key={s.id} 
                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #fecdd3', background: 'white', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer', transition: 'background 0.2s'}}
                onClick={() => setSelectedNeurosisRisk(s)}
              >
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                  <strong style={{color: '#9f1239'}}>{s.name}</strong>
                  <span style={{fontSize: '0.8rem', color: '#be123c'}}>평균 점수: {s.avg}점</span>
                </div>
                <button className="btn" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#ffe4e6', color: '#be123c', border: 'none'}} onClick={(e) => { e.stopPropagation(); setSelectedNeurosisRisk(s); }}>
                  답변 보기
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedNeurosisRisk && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setSelectedNeurosisRisk(null)}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '16px', maxWidth: '500px', width: '90%', 
            maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h3 style={{margin: 0, color: '#be123c'}}>{selectedNeurosisRisk.name} 학생의 설문 답변</h3>
              <button className="btn-icon" onClick={() => setSelectedNeurosisRisk(null)}>X</button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <div style={{background: '#f3f4f6', padding: '1rem', borderRadius: '8px'}}>
                <p style={{margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '0.9rem'}}>6. 나에게 나쁜 일이 생길까봐 걱정할 때가 많다.</p>
                <p style={{margin: 0, color: 'var(--primary)'}}>{selectedNeurosisRisk.q6}점</p>
              </div>
              <div style={{background: '#f3f4f6', padding: '1rem', borderRadius: '8px'}}>
                <p style={{margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '0.9rem'}}>7. 화가 나서 참지 못할 때가 많다.</p>
                <p style={{margin: 0, color: 'var(--primary)'}}>{selectedNeurosisRisk.q7}점</p>
              </div>
              <div style={{background: '#f3f4f6', padding: '1rem', borderRadius: '8px'}}>
                <p style={{margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '0.9rem'}}>8. 죽어버리고 싶을 만큼 괴로운 일을 겪었다.</p>
                <p style={{margin: 0, color: 'var(--primary)'}}>{selectedNeurosisRisk.q8}점</p>
              </div>
              <div style={{background: '#f3f4f6', padding: '1rem', borderRadius: '8px'}}>
                <p style={{margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '0.9rem'}}>9. 우리 반 아이들은 내가 친절한 사람이라고 생각한다.</p>
                <p style={{margin: 0, color: 'var(--primary)'}}>{selectedNeurosisRisk.q9}점</p>
              </div>
              <div style={{background: '#f3f4f6', padding: '1rem', borderRadius: '8px'}}>
                <p style={{margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '0.9rem'}}>10. 선생님께 하고 싶은 말이나 바라는 점</p>
                <p style={{margin: 0, color: 'var(--primary)', whiteSpace: 'pre-wrap'}}>{selectedNeurosisRisk.q10 || '응답 없음'}</p>
              </div>
            </div>
            <div style={{marginTop: '2rem', textAlign: 'center'}}>
              <button className="btn btn-primary" onClick={() => setSelectedNeurosisRisk(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
