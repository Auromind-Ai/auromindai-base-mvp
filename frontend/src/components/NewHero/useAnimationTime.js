// useAnimationTime.js
// Returns a ref whose .current holds elapsed milliseconds (not seconds).
// This matches the WAVE_SPEED constant above which expects ms.

import { useEffect, useRef } from 'react';

export function useAnimationTime() {
  const timeRef  = useRef(0);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    function tick(ts) {
      if (startRef.current === null) startRef.current = ts;
      timeRef.current = ts - startRef.current;   // ms elapsed
      rafRef.current  = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return timeRef;   // .current = ms
}