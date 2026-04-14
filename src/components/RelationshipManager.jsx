import React, { useState } from 'react';
import { Heart, HeartOff, Trash2 } from 'lucide-react';

export default function RelationshipManager({ students, relationships, onAdd, onRemove }) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState('positive');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(sourceId, targetId, type);
    // Reset Target but keep Source for convenience
    setTargetId('');
  };

  const getStudentName = (id) => students.find(s => s.id === id)?.name || '알 수 없음';

  return (
    <div className="panel-section">
      <h2 className="panel-title">교우 관계 입력</h2>
      <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
        누가 누구를 좋아하는지/싫어하는지 선택하세요.
      </p>
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
          <option value="" disabled>보내는 학생 (누가)</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
          <option value="" disabled>받는 학생 (누구에게)</option>
          {students.map(s => (
            <option key={s.id} value={s.id} disabled={s.id === sourceId}>
              {s.name}
            </option>
          ))}
        </select>
        
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button 
            type="button" 
            className={`btn ${type === 'positive' ? 'btn-success' : ''}`}
            style={{ flex: 1, ...(type !== 'positive' ? {background: 'var(--background)', color: 'var(--text-main)', border: '1px solid var(--border)'} : {}) }}
            onClick={() => setType('positive')}
            disabled={!sourceId || !targetId}
          >
            <Heart size={16} /> 좋아함
          </button>
          <button 
            type="button" 
            className={`btn ${type === 'negative' ? 'btn-warning' : ''}`}
            style={{ flex: 1, ...(type !== 'negative' ? {background: 'var(--background)', color: 'var(--text-main)', border: '1px solid var(--border)'} : {}) }}
            onClick={() => setType('negative')}
            disabled={!sourceId || !targetId}
          >
            <HeartOff size={16} /> 싫어함
          </button>
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={!sourceId || !targetId}>
          관계 추가
        </button>
      </form>

      {relationships.length > 0 && (
        <div className="student-list" style={{maxHeight: '200px'}}>
          {relationships.map(rel => (
            <div key={rel.id} className={`relation-item ${rel.type}`}>
              <span>
                <strong>{getStudentName(rel.source)}</strong> ➔ <strong>{getStudentName(rel.target)}</strong>
              </span>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span className={`badge ${rel.type === 'positive' ? 'badge-positive' : 'badge-negative'}`}>
                  {rel.type === 'positive' ? '좋아함' : '싫어함'}
                </span>
                <button className="btn-icon" onClick={() => onRemove(rel.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
