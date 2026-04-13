import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SociogramNetwork({ students, relationships }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData = useMemo(() => {
    const nodes = students.map(s => ({
      id: s.id,
      name: s.name,
      val: 1
    }));

    const links = relationships.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type,
      color: r.type === 'positive' ? '#10B981' : '#F59E0B'
    }));

    return { nodes, links };
  }, [students, relationships]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData]);

  const downloadPDF = async () => {
    if (!containerRef.current) return;
    try {
      const canvasElements = containerRef.current.getElementsByTagName('canvas');
      let targetCanvas = canvasElements[0];
      
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('교우관계도.pdf');
    } catch (error) {
      console.error('PDF 저장 오류:', error);
      alert('PDF 저장 중 오류가 발생했습니다.');
    }
  };

  if (students.length === 0) {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-muted)'}}>
        학생을 추가하여 관계망을 확인하세요.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: 'white' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={() => '#4F46E5'}
        nodeRelSize={6}
        linkColor="color"
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
        linkWidth={2}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Inter, Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fill();
          
          ctx.fillStyle = '#4F46E5';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#111827';
          ctx.fillText(label, node.x, node.y + 10 + fontSize/2);
        }}
      />
      <div className="floating-controls" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', position: 'absolute', bottom: '1rem', right: '1rem' }}>
        <button 
          className="btn" 
          style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }} 
          onClick={downloadPDF}
        >
          <Download size={14} />
          PDF로 저장
        </button>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          <span style={{width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block'}}></span> 좋아함
          <span style={{width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', marginLeft: '0.5rem'}}></span> 싫어함
        </div>
      </div>
    </div>
  );
}
