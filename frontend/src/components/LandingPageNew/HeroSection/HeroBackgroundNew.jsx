"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./heroBackgroundNew.module.css";
import Nova from "./Nova";

// ─ Particle Generator ─

function generateParticles(count = 1100) {
  return Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100;
    const y = Math.random() * 100;

    // center = 50,50
    const dx = 50 - x;
    const dy = 50 - y;

    return {
      id: i,
      x,
      y,

      size: Math.random() < 0.88 ? 1.8 : 2.8,
      opacity: 0.35 + Math.random() * 0.25,

      duration: 18 + Math.random() * 30,
      delay: Math.random() * -40,

      pullX: dx * (0.35 + Math.random() * 0.45),
      pullY: dy * (0.35 + Math.random() * 0.45),

      parallaxDepth: 0.01 + Math.random() * 0.02,
    };
  });
}

const PARTICLES = generateParticles(220);

// ─ HeroBackground ─

export default function HeroBackground() {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  // Parallax mouse handler
  const handleMouseMove = useCallback((e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mouseRef.current = {
      x: (e.clientX - cx) / cx,   // -1 → 1
      y: (e.clientY - cy) / cy,
    };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const stars = containerRef.current?.querySelectorAll("[data-star]");

    function tick() {
      const { x: mx, y: my } = mouseRef.current;

      stars?.forEach((el, i) => {
        const p = PARTICLES[i];

        // move particle toward center
        p.x += (50 - p.x) * 0.0006 * p.parallaxDepth * 80;
        p.y += (50 - p.y) * 0.0006 * p.parallaxDepth * 80;

        // mouse parallax
        const offsetX = mx * p.parallaxDepth * -30;
        const offsetY = my * p.parallaxDepth * -30;

        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

        // when particle reaches center zone → respawn on outer edge
        const dx = p.x - 50;
        const dy = p.y - 50;

        const scaleX = 1;     
        const scaleY = 0.65;

        const dist = Math.sqrt(
          (dx * dx) / (scaleX * scaleX) +
          (dy * dy) / (scaleY * scaleY)
        );

        const KILL_RADIUS = 18; 
        const fadeStart = KILL_RADIUS + 6;

        if (dist < fadeStart) {
          const t = (dist - KILL_RADIUS) / (fadeStart - KILL_RADIUS);
          el.style.opacity = Math.max(t, 0);
        }

        if (dist < KILL_RADIUS) {
          const side = Math.floor(Math.random() * 4);

          if (side === 0) {
            p.x = Math.random() * 100;
            p.y = -5;
          } else if (side === 1) {
            p.x = 105;
            p.y = Math.random() * 100;
          } else if (side === 2) {
            p.x = Math.random() * 100;
            p.y = 105;
          } else {
            p.x = -5;
            p.y = Math.random() * 100;
          }

          // reset opacity randomly
          el.style.opacity = "0.8";
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <div
      className={styles.bgRoot}
      aria-hidden="true"
    >
      {/*  Stars  */}
      <div ref={containerRef} className={styles.starField}>
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            data-star
            className={styles.star}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,

              "--duration": `${p.duration}s`,
              "--delay": `${p.delay}s`,
              "--pull-x": `${p.pullX}px`,
              "--pull-y": `${p.pullY}px`,
            }}
          />
        ))}
      </div>

      {/*  Radial Vignette  */}
      <div className={styles.vignette} />

      {/*  Outer Halo  */}
      <div className={styles.outerHalo} />

      {/*  Secondary offset layer  */}
      <div className={styles.secondaryGlow} />

      {/*  Nova WebGL Orb — replaces ring layers  */}
      <div className={styles.novaWrapper}>
        <Nova
          hue={0}
          hoverIntensity={0.22}
          rotateOnHover={true}
        />
      </div>
    </div>
  );
}