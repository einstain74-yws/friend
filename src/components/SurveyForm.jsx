import React, { useState } from 'react';
import { Send, UserCircle2 } from 'lucide-react';

const MultiSelect = ({ label, options, selected, onChange, description }) => {
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="survey-question">
      <label className="question-label">{label}</label>
      {description && <p className="question-desc">{description}</p>}
      <div className="chip-group">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`chip ${selected.includes(opt.id) ? 'selected' : ''}`}
            onClick={() => toggle(opt.id)}
          >
            {opt.name}
          </button>
        ))}
        {options.length === 0 && <span className="empty-state">선택할 수 있는 친구가 없습니다.</span>}
      </div>
    </div>
  );
};

const LikertScale = ({ label, value, onChange }) => {
  const options = [
    { val: 1, text: "전혀 그렇지 않다" },
    { val: 2, text: "그렇지 않다" },
    { val: 3, text: "보통이다" },
    { val: 4, text: "그렇다" },
    { val: 5, text: "매우 그렇다" }
  ];

  return (
    <div className="survey-question">
      <label className="question-label" style={{marginBottom: '0.5rem', display: 'block'}}>{label}</label>
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem'}}>
        {options.map(opt => (
          <label key={opt.val} style={{display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', background: 'var(--background)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: value === opt.val ? '2px solid var(--primary)' : '1px solid var(--border)'}}>
            <input 
              type="radio" 
              name={label} 
              value={opt.val} 
              checked={value === opt.val} 
              onChange={() => onChange(opt.val)} 
              style={{display: 'none'}}
            />
            <span style={{color: value === opt.val ? 'var(--primary)' : 'var(--text-main)', fontWeight: value === opt.val ? 'bold' : 'normal'}}>{opt.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default function SurveyForm({ students, responses = [], onSubmit, onCancel }) {
  const [authorId, setAuthorId] = useState('');
  const [q1, setQ1] = useState([]);
  const [q2, setQ2] = useState([]);
  const [q3, setQ3] = useState([]);
  const [q4, setQ4] = useState([]);
  const [q5, setQ5] = useState([]);
  const [q6, setQ6] = useState(null);
  const [q7, setQ7] = useState(null);
  const [q8, setQ8] = useState(null);
  const [q9, setQ9] = useState(null);
  const [q10, setQ10] = useState('');

  const submittedIds = responses?.map(r => r.authorId) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!authorId) return alert('내 이름을 선택해주세요!');
    if (submittedIds.includes(authorId)) return alert('이미 설문을 제출했습니다.');
    if (!q6 || !q7 || !q8 || !q9) return alert('심리검사 문항(6~9번)을 모두 선택해주세요!');
    
    onSubmit({
      id: Date.now().toString(),
      authorId,
      q1,
      q2,
      q3,
      q4,
      q5,
      q6,
      q7,
      q8,
      q9,
      q10
    });

    alert('설문이 제출되었습니다. 고마워요!');
    // Reset Form
    setAuthorId('');
    setQ1([]); setQ2([]); setQ3([]); setQ4([]); setQ5([]); 
    setQ6(null); setQ7(null); setQ8(null); setQ9(null); setQ10('');
  };

  // Only show other students as options
  const otherStudents = students.filter(s => s.id !== authorId);

  return (
    <div className="survey-container">
      <div className="survey-header">
        <h2>교실 설문지</h2>
        <p>우리 반 친구들에 대한 솔직한 너의 생각을 알려줘. 이 설문은 선생님만 보게 될 거야.</p>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-icon" style={{position:'absolute', top: '1.5rem', right: '1.5rem'}}>돌아가기</button>}
      </div>

      <form onSubmit={handleSubmit} className="survey-form">
        <div className="survey-question">
          <label className="question-label"><UserCircle2 size={18} /> 내 이름은?</label>
          <select 
            value={authorId} 
            onChange={e => {
              setAuthorId(e.target.value);
              // reset selections if changing author
              setQ1([]); setQ2([]); setQ3([]); setQ4([]); setQ5([]);
              setQ6(null); setQ7(null); setQ8(null); setQ9(null); setQ10('');
            }} 
            required 
            className="form-select form-select-lg author-select shadow-sm"
          >
            <option value="" disabled>내 이름을 선택하세요</option>
            {students.map(s => {
              const hasSubmitted = submittedIds.includes(s.id);
              return (
                <option key={s.id} value={s.id} disabled={hasSubmitted}>
                  {s.name} {hasSubmitted ? '(제출 완료)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {authorId && (
          <div className="questions-wrapper">
            <MultiSelect 
              label="1. 이번 달에 친구들을 차별하지 않고 친절한 말과 행동으로 잘 대해 주며 존중하고 있는 친구들은 누구입니까?"
              description="해당하는 친구를 모두 선택해주세요."
              options={otherStudents}
              selected={q1}
              onChange={setQ1}
            />

            <MultiSelect 
              label="2. 아직도 다른 친구를 놀리는 말 또는 비꼬는 말 등을 해서 상처를 주거나 폭력적인 행동으로 힘들게 하는 친구는 누구입니까?"
              description="해당하는 친구를 모두 선택해주세요."
              options={otherStudents}
              selected={q2}
              onChange={setQ2}
            />

            <MultiSelect 
              label="3. 우리 반에 도움이 필요하다고 생각하는 친구는 누구입니까?"
              description="도움이 필요한 친구가 있다면 선택해주세요."
              options={otherStudents}
              selected={q3}
              onChange={setQ3}
            />

            <MultiSelect 
              label="4. 내가 가장 친하게 지내고 있는 친구를 적어주세요."
              description="가장 친한 친구를 모두 선택해주세요."
              options={otherStudents}
              selected={q4}
              onChange={setQ4}
            />

            <MultiSelect 
              label="5. 나와 불편한 관계에 있다고 생각되는 친구를 적어주세요."
              description="불편한 친구가 있다면 선택해주세요."
              options={otherStudents}
              selected={q5}
              onChange={setQ5}
            />

            <LikertScale
              label="6. 나에게 나쁜 일이 생길까봐 걱정할 때가 많다."
              value={q6}
              onChange={setQ6}
            />

            <LikertScale
              label="7. 화가 나서 참지 못할 때가 많다."
              value={q7}
              onChange={setQ7}
            />

            <LikertScale
              label="8. 죽어버리고 싶을 만큼 괴로운 일을 겪었다."
              value={q8}
              onChange={setQ8}
            />

            <LikertScale
              label="9. 우리 반 아이들은 내가 친절한 사람이라고 생각한다."
              value={q9}
              onChange={setQ9}
            />

            <div className="survey-question">
              <label className="question-label">10. 학급 담임선생님께 하고 싶은 말이나 바라는 점이 있다면 적어주세요.</label>
              <textarea 
                value={q10} 
                onChange={e => setQ10(e.target.value)} 
                rows={5} 
                className="form-control shadow-sm message-textarea"
                placeholder="여기에 자유롭게 적어주세요..."
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary submit-btn">
              <Send size={18} /> 설문 제출하기
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
