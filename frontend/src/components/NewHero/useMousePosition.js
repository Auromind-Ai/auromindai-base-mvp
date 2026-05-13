// useMousePosition.js
// Tracks raw mouse position relative to the hero element.


import { useEffect, useRef } from 'react';

export function useMousePosition(elementRef) {
  const pos = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const el = elementRef?.current;
    if (!el) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      pos.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => {
      pos.current = { ...pos.current, active: false };
    };
    const onTouch = (e) => {
      if (!e.touches[0]) return;
      const r = el.getBoundingClientRect();
      pos.current = {
        x: e.touches[0].clientX - r.left,
        y: e.touches[0].clientY - r.top,
        active: true,
      };
    };
    const onTouchEnd = () => {
      pos.current = { ...pos.current, active: false };
    };

    el.addEventListener('mousemove',  onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchmove',  onTouch,    { passive: true });
    el.addEventListener('touchend',   onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('mousemove',  onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchmove',  onTouch);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [elementRef]);

  return pos;
}