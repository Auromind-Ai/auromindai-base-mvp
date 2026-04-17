'use client';

import { useEffect, useRef } from 'react';

export default function HeroBackground() {
  const canvasRef = useRef(null);

  const mouse = useRef({
  x: -9999,
  y: -9999,
  tx: -9999,
  ty: -9999,
  vx: 0,
  vy: 0,
});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    function handlePointerMove(e) {
  mouse.current.tx = e.clientX;
  mouse.current.ty = e.clientY;
}

window.addEventListener('pointermove', handlePointerMove);

    let frame;

    function draw() {
  const t = performance.now() * 0.00075;

  mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.12;
mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.12;

mouse.current.vx +=
  ((mouse.current.tx - mouse.current.x) - mouse.current.vx) * 0.18;
  

mouse.current.vy +=
  ((mouse.current.ty - mouse.current.y) - mouse.current.vy) * 0.18;

ctx.clearRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = 'rgba(6, 1, 10, 0.34)';
ctx.lineWidth = 1.2;

const lineGap = 10;
const amplitude = 26;

for (let i = 0; i < canvas.width / lineGap + 2; i++) {
  
  const baseX = i * lineGap;

  ctx.beginPath();

  for (let y = 0; y <= canvas.height; y += 10) {
  const progress = y / canvas.height;

  const localAmp =
    14 * (1 - progress) + 6 + amplitude * Math.pow(progress, 2.1);

  const phase = progress * 2.2;

  const wave1 = Math.sin(
    y * 0.01 + i * 0.18 - t + phase
  );

  const wave2 = Math.sin(
    y * 0.004 + i * 0.12 - t * 0.6 + phase
  );

  const offset = (wave1 + wave2 * 0.45) * localAmp;

  const dx = baseX - mouse.current.x;
  const dy = y - mouse.current.y;

  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = 220;

  let hoverOffset = 0;

  if (distance < radius) {
    const influence = 1 - distance / radius;
    const force = Math.pow(influence, 2.2);

    hoverOffset =
      (mouse.current.vx * 1.4 + dx * 0.025) *
      force *
      (0.4 + progress * 1.8);
  }

  const warpedBaseX = baseX + hoverOffset * 0.6;
  const x = warpedBaseX + offset + hoverOffset;

  if (y === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
}

  ctx.stroke();
}

  frame = requestAnimationFrame(draw);
}

    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}