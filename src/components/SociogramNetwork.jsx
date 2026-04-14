import React, { useMemo, useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/** localStorage 등에서 문자열로 올 수 있음 */
function parseQ9(raw) {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 설문 9번(친화성) 점수 → 노드 반경·색 (리커트 1~5 가정) */
function getAgreeablenessStyle(q9) {
  const fallback = {
    outerR: 6,
    innerR: 5,
    ring: '#cbd5e1',
    fill: '#64748b',
  };
  const q = parseQ9(q9);
  if (q === undefined) {
    return fallback;
  }
  if (q > 5) {
    return { outerR: 18, innerR: 15, ring: '#FDE047', fill: '#EAB308' };
  }
  if (q < 1) {
    return { outerR: 6, innerR: 5, ring: '#C084FC', fill: '#7E22CE' };
  }
  if (q >= 4 && q <= 5) {
    return { outerR: 18, innerR: 15, ring: '#FDE047', fill: '#EAB308' };
  }
  if (q > 2 && q < 4) {
    return { outerR: 11, innerR: 9, ring: '#93C5FD', fill: '#2563EB' };
  }
  if (q >= 1 && q <= 2) {
    return { outerR: 6, innerR: 5, ring: '#C084FC', fill: '#7E22CE' };
  }
  return fallback;
}

/**
 * 명단만으로는 부족할 때(과거 스냅샷 누락 등) 응답·관계에 등장하는 id도 노드로 포함
 */
function mergeStudentsForGraph(students, responses, relationships) {
  const byId = new Map();
  const put = (id, nameHint) => {
    if (id == null || id === '') return;
    const sid = String(id);
    if (!byId.has(sid)) {
      byId.set(sid, { id: sid, name: nameHint || '' });
    } else if (nameHint && !byId.get(sid).name) {
      byId.get(sid).name = nameHint;
    }
  };
  (students || []).forEach((s) => put(s.id, s.name));
  (responses || []).forEach((r) => put(r.authorId, null));
  (relationships || []).forEach((rel) => {
    put(rel.source, null);
    put(rel.target, null);
  });
  (students || []).forEach((s) => {
    const sid = String(s.id);
    if (byId.has(sid)) byId.get(sid).name = s.name;
  });
  return Array.from(byId.values()).map((n) => ({
    id: n.id,
    name: n.name?.trim() || '이름 미상',
  }));
}

export default function SociogramNetwork({ students, relationships, responses = [], snapshotKey = 'current' }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef();

  const updateDimensions = () => {
    const el = containerRef.current;
    if (!el) return;
    let w = el.clientWidth;
    let h = el.clientHeight;
    if (w < 2 || h < 2) {
      const r = el.getBoundingClientRect();
      w = Math.max(r.width, w);
      h = Math.max(r.height, h);
    }
    if ((w < 2 || h < 2) && typeof window !== 'undefined') {
      w = Math.max(w, 320);
      h = Math.max(h, 320);
    }
    setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };

  useLayoutEffect(() => {
    updateDimensions();
    const id = requestAnimationFrame(() => {
      updateDimensions();
      requestAnimationFrame(updateDimensions);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    if (typeof ResizeObserver === 'undefined') {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    const ro = new ResizeObserver(() => updateDimensions());
    ro.observe(el);
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [students.length, snapshotKey]);

  const graphData = useMemo(() => {
    const merged = mergeStudentsForGraph(students, responses, relationships);

    const q9ByAuthor = {};
    (responses || []).forEach((r) => {
      if (r.authorId == null || r.authorId === '') return;
      const q = parseQ9(r.q9);
      if (q !== undefined) {
        q9ByAuthor[String(r.authorId)] = q;
      }
    });

    const nodes = merged.map((s) => {
      const q9 = q9ByAuthor[String(s.id)];
      const st = getAgreeablenessStyle(q9);
      return {
        id: s.id,
        name: s.name,
        q9,
        /* 기본 노드 반경: sqrt(val)*nodeRelSize ≈ outerR */
        val: Math.max(st.outerR * st.outerR, 1),
      };
    });

    const links = (relationships || []).map((r) => ({
      source: String(r.source),
      target: String(r.target),
      type: r.type,
      color: r.type === 'positive' ? '#10B981' : '#F59E0B',
    }));

    return { nodes, links };
  }, [students, relationships, responses]);

  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    const t = window.setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [graphData, snapshotKey, dimensions.width, dimensions.height]);

  const paintLabels = useCallback(
    (ctx, globalScale) => {
      const fg = fgRef.current;
      if (!fg) return;
      const { nodes } = fg.graphData();
      const gs = globalScale || 1;
      ctx.save();
      nodes.forEach((node) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
        const label = String(node.name || '');
        if (!label) return;
        const st = getAgreeablenessStyle(node.q9);
        let fontSize = 13 / gs;
        fontSize = Math.max(8, Math.min(56, fontSize));
        ctx.font = `600 ${fontSize}px system-ui, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const rDraw = Math.sqrt(Math.max(0, node.val || 1)) * 1;
        const labelY = node.y + rDraw + 4 / gs;
        ctx.lineWidth = Math.max(3 / gs, 1);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.98)';
        ctx.fillStyle = '#0f172a';
        ctx.strokeText(label, node.x, labelY);
        ctx.fillText(label, node.x, labelY);
      });
      ctx.restore();
    },
    []
  );

  const downloadPDF = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('교우관계도.pdf');
    } catch (error) {
      console.error('PDF 저장 오류:', error);
      alert('PDF 저장 중 오류가 발생했습니다.');
    }
  };

  if (graphData.nodes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: 'var(--text-muted)',
        }}
      >
        학생 명단이 없어 관계망을 표시할 수 없습니다.
      </div>
    );
  }

  const graphWidth = Math.max(dimensions.width, 1);
  const graphHeight = Math.max(dimensions.height, 1);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, width: '100%', minHeight: 0, height: '100%', position: 'relative', background: 'white' }}
    >
      <ForceGraph2D
        key={snapshotKey}
        ref={fgRef}
        width={graphWidth}
        height={graphHeight}
        graphData={graphData}
        nodeId="id"
        nodeLabel={() => ''}
        nodeColor={(n) => getAgreeablenessStyle(n.q9).fill}
        nodeRelSize={1}
        warmupTicks={80}
        cooldownTicks={50}
        onRenderFramePost={paintLabels}
        linkColor="color"
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
        linkWidth={2}
      />
      <div
        className="floating-controls"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'flex-end',
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
        }}
      >
        <button
          className="btn"
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            fontSize: '0.8rem',
            padding: '0.5rem 0.75rem',
          }}
          onClick={downloadPDF}
        >
          <Download size={14} />
          PDF로 저장
        </button>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            background: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.7rem' }}>관계 화살표</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              />{' '}
              좋아함
            </span>
            <span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#F59E0B',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginLeft: '0.25rem',
                }}
              />{' '}
              싫어함
            </span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '0.35rem',
              marginTop: '0.1rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              fontSize: '0.7rem',
            }}
          >
            9번 친화성 (노드)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.68rem' }}>
            <span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#EAB308',
                  border: '1px solid #FDE047',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              />{' '}
              큼 · 노랑 4~5점
            </span>
            <span>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              />{' '}
              중간 · 파랑 2초과~4미만
            </span>
            <span>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#7E22CE',
                  border: '1px solid #C084FC',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              />{' '}
              작음 · 보라 1~2점
            </span>
            <span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#64748b',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              />{' '}
              작음 · 회색 미응답
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
