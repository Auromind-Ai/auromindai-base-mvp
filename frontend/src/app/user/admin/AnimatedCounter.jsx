'use client'

import { useEffect, useState } from "react";

export default function AnimatedCounter({ value = 0, duration = 1200,formatter }) {

  const [count, setCount] = useState(0);

  useEffect(() => {

    const end = Number(value) || 0;   // ⭐ prevent NaN
    let start = 0;

    if (end === 0) {
      setCount(0);
      return;
    }

    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;

    const timer = setInterval(() => {

      start += increment;

      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }

    }, stepTime);

    return () => clearInterval(timer);

  }, [value, duration]);

  return <span>
    {formatter ? formatter(count) : Math.floor(count)}
  </span>;
}