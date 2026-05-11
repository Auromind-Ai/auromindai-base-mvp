"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  buildParticles,
  applyTailWarp,
  LAT_RINGS,
  WARP_EXP,
  PULL_STR,
  CONV_X,
  CONV_Y,
  CONV_Z,
  CONV_Z_STR,
} from "@/lib/particleGenerator";
import { computeVisuals, updateParticle } from "@/lib/particlePhysics";

// Rendering constants 
const YAW_SPEED = 0.0017;  // radians/frame — full rotation ≈ 37 s at 60 fps
const FOV       = 2.3;     // perspective field-of-view factor

// Simple perspective projection
function project(x3, y3, z3, CX, CY, RADIUS) {
  const scale = FOV / (FOV + z3);
  return {
    x: CX + x3 * RADIUS * scale,
    y: CY + y3 * RADIUS * scale,
    z: z3,
  };
}

export default function ParticleCanvas() {
  const canvasRef     = useRef(null);
  const particlesRef  = useRef([]);
  const animFrameRef  = useRef(0);
  const yawRef        = useRef(0);
  const mouseRef      = useRef({ x: -9999, y: -9999, on: false });

  // Store layout metrics in a ref so the draw callback always has fresh values
  // without needing to be recreated on resize
  const layoutRef = useRef({ CX: 0, CY: 0, RADIUS: 0 });

  // Draw one frame 
  const draw = useCallback((ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);

    yawRef.current += YAW_SPEED;
    const cosY = Math.cos(yawRef.current);
    const sinY = Math.sin(yawRef.current);

    const { CX, CY, RADIUS } = layoutRef.current;
    const radiusScale = RADIUS / 270;  // normalise dot radius to display size
    const drawList = [];

    for (const p of particlesRef.current) {
      // Rotate around Y axis
      const rx =  p.bx * cosY - p.bz * sinY;
      const ry =  p.by;
      const rz =  p.bx * sinY + p.bz * cosY;

      // Apply tail warp
      const { wx, wy, wz, warpAmt } = applyTailWarp(rx, ry, rz);

      // Project to screen
      const proj = project(wx, wy, wz, CX, CY, RADIUS);

      // Depth-based visuals
      const { r, o } = computeVisuals(wz, warpAmt, p.baseR, radiusScale);

      // Spring physics + mouse repulsion
      updateParticle(p, proj.x, proj.y, mouseRef.current);

      if (r > 0.15 && o > 0.012) {
        drawList.push({
        x: p.sx,
        y: p.sy,
        r,
        o,
        z: wz,
        seed: p.bx * 13.7 + p.by * 9.1 + p.bz * 5.3,
      });
      }
    }

    // Back-to-front depth sort
    drawList.sort((a, b) => a.z - b.z);

    for (const d of drawList) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.22, d.r), 0, Math.PI * 2);

      const t = performance.now() * 0.0015;

      // all particles change together
      const wave = (Math.sin(t) + 1) * 0.5;

      // darker black → deeper purple
      const rCol = Math.round(6 + (120 - 6) * wave);
      const gCol = Math.round(6 + (45 - 6) * wave);
      const bCol = Math.round(6 + (180 - 6) * wave);

      ctx.shadowBlur = 16;
      ctx.shadowColor = `rgba(${rCol}, ${gCol}, ${bCol}, ${0.22 + wave * 0.22})`;

      ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${Math.min(1, d.o + 0.08)})`;
      ctx.fill();
    }
  }, []);

  // Initialise canvas + start loop 
  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sphere placement: 50% × 46% matches the video
    const CX     = W * 0.50;
    const CY     = H * 0.52
    ;
    const RADIUS = Math.min(W * 0.24, H * 0.36);
    layoutRef.current = { CX, CY, RADIUS };

    // Build fresh particles if first run; on resize just update layout
    if (particlesRef.current.length === 0) {
      particlesRef.current = buildParticles();
    }

    // Teleport spring positions to avoid chaotic fly-in on load/resize
    const yaw0 = yawRef.current;
    const cy0  = Math.cos(yaw0);
    const sy0  = Math.sin(yaw0);
    for (const p of particlesRef.current) {
      const rx0 =  p.bx * cy0 - p.bz * sy0;
      const rz0 =  p.bx * sy0 + p.bz * cy0;
      const { wx, wy, wz } = applyTailWarp(rx0, p.by, rz0);
      const pr  = project(wx, wy, wz, CX, CY, RADIUS);
      p.sx = pr.x; p.sy = pr.y;
      p.vx = 0;    p.vy = 0;
    }

    cancelAnimationFrame(animFrameRef.current);
    const loop = () => {
      draw(ctx, W, H);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [draw]);

  // Lifecycle 
  useEffect(() => {
    init();

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 160);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [init]);

  // Mouse / touch handlers
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, on: true };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.on = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    mouseRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top, on: true };
  }, []);

  const handleTouchEnd = useCallback(() => {
    mouseRef.current.on = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-10"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-hidden="true"
    />
  );
}
