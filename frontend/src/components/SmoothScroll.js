
'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }) {
  useEffect(() => {
    // ─── Mobile check ────────────────────────────────────────────────
    // Mobile browsers have native GPU-accelerated inertia scroll.
    // Lenis replaces it with JS-driven scroll on the main thread → lag.
    // Detect: touch-capable device OR narrow screen → skip Lenis entirely.
    const isMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth <= 1024;

    if (isMobile) {
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      lerp: 0.1,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);
    const onLock = () => lenis.stop();
    const onUnlock = () => lenis.start();

    window.addEventListener("section-scroll-lock", onLock);
    window.addEventListener("section-scroll-unlock", onUnlock);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener("section-scroll-lock", onLock);
      window.removeEventListener("section-scroll-unlock", onUnlock);
    };
  }, []);

  return <>{children}</>;
}
