import React, { useState, useRef } from 'react';
import { UserPlus, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StudentManager({ students, onAdd, onAddMultiple, onRemove, onClearAll }) {
  const [name, setName] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(name);
    setName('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const names = [];
        data.forEach(row => {
          if (Array.isArray(row)) {
            const cellVal = row.find(cell => typeof cell === 'string' && cell.trim() !== '');
            if (cellVal) {
              names.push(cellVal.trim());
            }
          }
        });

        if (names.length > 0) {
          onAddMultiple(names);
          alert(`${names.length}명의 학생을 일괄 추가했습니다.`);
        } else {
          alert('엑셀 파일에서 학생 이름을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error(err);
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleClearAll = () => {
    if (students.length === 0) return;
    if (!window.confirm('등록된 학생을 모두 삭제하시겠습니까?\n진행 중인 설문 응답도 함께 삭제됩니다.')) return;
    onClearAll();
  };

  return (
    <div className="panel-section">
      <h2 className="panel-title">학생 명단 관리</h2>
      
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="학생 이름 입력" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <div className="input-group">
          <button type="submit" className="btn btn-primary" disabled={!name.trim()} style={{ flex: 1 }}>
            <UserPlus size={18} />
            추가
          </button>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--danger)' }}
            onClick={handleClearAll}
            disabled={students.length === 0}
            title="명단 전체 삭제"
          >
            <Trash2 size={18} />
            일괄 삭제
          </button>
        </div>
      </form>

      <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button 
          className="btn" 
          style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }} 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          엑셀로 일괄 추가
        </button>
      </div>
      
      {students.length === 0 ? (
        <div className="empty-state">등록된 학생이 없습니다.</div>
      ) : (
        <div className="student-list">
          {students.map(student => (
            <div key={student.id} className="student-item">
              <span>{student.name}</span>
              <button 
                className="btn-icon" 
                onClick={() => onRemove(student.id)}
                title="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
