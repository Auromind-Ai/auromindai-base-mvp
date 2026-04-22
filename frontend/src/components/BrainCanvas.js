"use client";

import { useEffect, useRef } from "react";

export default function BrainCanvas({ progress }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const SIZE = 340;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = 120;
    const RINGS = 10;
    const SEGMENTS = 32;

    function projectPoint(x, y, z) {
      const fov = 600;
      const scale = fov / (fov + z);
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        z,
        scale,
      };
    }

    function drawSphere(angle) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      const lines = [];

      // Latitude rings
      for (let i = 0; i <= RINGS; i++) {
        const phi = (Math.PI * i) / RINGS;
        const ring = [];
        for (let j = 0; j <= SEGMENTS; j++) {
          const theta = (2 * Math.PI * j) / SEGMENTS + angle;
          const x = R * Math.sin(phi) * Math.cos(theta);
          const y = R * Math.cos(phi);
          const z = R * Math.sin(phi) * Math.sin(theta);
          ring.push(projectPoint(x, y, z));
        }
        lines.push(ring);
      }

      // Longitude lines
      const longLines = [];
      for (let j = 0; j < SEGMENTS; j += 3) {
        const line = [];
        for (let i = 0; i <= RINGS; i++) {
          const phi = (Math.PI * i) / RINGS;
          const theta = (2 * Math.PI * j) / SEGMENTS + angle;
          const x = R * Math.sin(phi) * Math.cos(theta);
          const y = R * Math.cos(phi);
          const z = R * Math.sin(phi) * Math.sin(theta);
          line.push(projectPoint(x, y, z));
        }
        longLines.push(line);
      }

      const allLines = [...lines, ...longLines];

      allLines.forEach((ring) => {
        ctx.beginPath();
        ring.forEach((p, idx) => {
          const alpha = Math.max(0, (p.z + R) / (2 * R));
          ctx.strokeStyle = `rgba(76, 201, 240, ${0.15 + alpha * 0.55})`;
          ctx.lineWidth = 0.8;
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    function animate() {
      rotationRef.current += 0.008;
      drawSphere(rotationRef.current);
      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        opacity: progress,
        width: "100%",
        height: "100%",
        display: "block",
        transition: "opacity 0.3s",
      }}
    />
  );
}