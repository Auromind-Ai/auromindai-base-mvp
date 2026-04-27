'use client';

import { useEffect, useRef, useState } from 'react';

const CARDS = [
  { step: 'Step 1', title: 'Connect\nAccount',    accent: '#7fff6e', bg: '#0f0f0f', textColor: '#ffffff' },
  { step: 'Step 2', title: 'Configure\nAI',        accent: '#6eb4ff', bg: '#0a0a1a', textColor: '#ffffff' },
  { step: 'Step 3', title: 'Go Live\nInstantly',   accent: '#ff8c6e', bg: '#1a0a0a', textColor: '#ffffff' },
];

const CARD_W = 270;
const CARD_H = 380;
const ROPE_H = 200;

function LanyardCard({ step, title, accent, bg, textColor, anchorX, index }) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);

  useEffect(() => {
    if (dragging) return;
    const tick = () => {
      const SPRING = 0.12;
        const DAMPING = 0.85;

        velRef.current.x -= posRef.current.x * SPRING;
        velRef.current.y -= posRef.current.y * SPRING;

        velRef.current.x *= DAMPING;
        velRef.current.y *= DAMPING;
        velRef.current.y += 0.4;
      
      posRef.current.x += velRef.current.x;
      posRef.current.y += velRef.current.y;
      if (Math.abs(posRef.current.x) < 0.05 && Math.abs(velRef.current.x) < 0.05 && Math.abs(posRef.current.y) < 0.05 && Math.abs(velRef.current.y) < 0.05) {
        posRef.current = { x: 0, y: 0 };
        velRef.current = { x: 0, y: 0 };
        setPos({ x: 0, y: 0 });
        return;
      }
      setPos({ ...posRef.current });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [dragging]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(animRef.current);
    setDragging(true);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: posRef.current.x, oy: posRef.current.y };
  };
  const onPointerMove = (e) => {
    if (!dragging || !dragStart.current) return;
    const nx = dragStart.current.ox + (e.clientX - dragStart.current.px);
    const ny = dragStart.current.oy + (e.clientY - dragStart.current.py);
    const dx = nx - posRef.current.x;
    const dy = ny - posRef.current.y;

    velRef.current = {
        x: dx * 0.6,
        y: dy * 0.6
    };

    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
    };
  const onPointerUp = () => { setDragging(false); dragStart.current = null; };

  const cardCX = pos.x;
  const BASE_OFFSET = 120;
  const EXTRA_CENTER_OFFSET = index === 1 ? 110 : 0; 

  const cardCY = ROPE_H + CARD_H / 2 + BASE_OFFSET + EXTRA_CENTER_OFFSET + pos.y;
  const cardTopY = ROPE_H + BASE_OFFSET + EXTRA_CENTER_OFFSET + pos.y;
  const cardTopX = cardCX;
  
  const tilt = velRef.current.x * 0.2;

  const ropeLagX = pos.x * 0.6;
  const ropeLagY = pos.y * 0.6;

  return (
    <div style={{ position: 'absolute', top: 0, left: anchorX, width: 0, height: 0, pointerEvents: 'none' }}>
      <svg 
        style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            overflow: 'visible', 
            pointerEvents: 'none', 
            zIndex: 2
        }} 
        width="300" 
        height={ROPE_H + CARD_H}
        >
        <path
          d={`M 0 4 
            C ${ropeLagX * 0.25} ${ROPE_H * 0.4}, 
                ${ropeLagX * 0.75} ${ROPE_H * 0.75}, 
                ${ropeLagX} ${ROPE_H + ropeLagY}`}
          stroke={accent} strokeWidth="2.5" fill="none" opacity="0.75" strokeLinecap="round"
        />
      </svg>
      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        style={{
          position: 'absolute', top: cardCY - CARD_H / 2, left: cardCX - CARD_W / 2,
          width: CARD_W, height: CARD_H, borderRadius: 18, background: bg,
          border: `1.5px solid ${accent}30`, boxShadow: `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px ${accent}18`,
          transform: `rotate(${tilt}deg)`, cursor: dragging ? 'grabbing' : 'grab',
          pointerEvents: 'all', userSelect: 'none', zIndex: dragging ? 20 : 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 14px',
        }}
      >
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 26, height: 14, borderRadius: 5, background: 'linear-gradient(180deg,#d4d4d4,#888)', boxShadow: '0 3px 6px rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'absolute', top: 16, left: 14, background: accent, color: bg, fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.06em' }}>{step}</div>
        <div style={{ color: textColor, fontSize: 17, fontWeight: 700, textAlign: 'center', lineHeight: 1.35, whiteSpace: 'pre-line', marginTop: 22 }}>{title}</div>
        <div style={{ position: 'absolute', bottom: 42, width: '78%', height: 1, background: accent, opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: 18, display: 'flex', gap: 7 }}>
          {[1, 0.3, 0.3, 0.3].map((op, i) => (<div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, opacity: op }} />))}
        </div>
      </div>
    </div>
  );
}

function useAnchorPositions() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      const cx = w / 2;

      const gapLeft = w < 640 ? 160 : w < 1024 ? 260 : 460;
      const gapRight = w < 640 ? 160 : w < 1024 ? 260 : 460;

      setPositions([
        cx - gapLeft,   // Step 1
        cx,             // Step 2
        cx + gapRight   // Step 3
      ]);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return positions;
}

export default function Lanyard() {
  const anchors = useAnchorPositions();
  if (!anchors.length) return null;
  const totalH = ROPE_H + CARD_H + 300;
  return (
    <section style={{ position: 'relative', width: '100%', height: totalH, overflow: 'hidden', background: '#000000' }}>
      <div style={{ position: 'absolute', top: 0, left: anchors[0] - 20, width: anchors[2] - anchors[0] + 40, height: 5, borderRadius: 4, background: 'linear-gradient(90deg,#7fff6e55,#6eb4ff55,#ff8c6e55)', zIndex: 5 }} />
      {CARDS.map((card, i) => (
        <div key={i} style={{ position: 'absolute', top: -5, left: anchors[i] - 7, width: 14, height: 14, borderRadius: '50%', background: card.accent, boxShadow: `0 0 10px ${card.accent}`, zIndex: 6 }} />
      ))}
      {anchors.map((ax, i) => (
    <LanyardCard key={i} {...CARDS[i]} anchorX={ax} index={i} />
    ))}
    </section>
  );
}
