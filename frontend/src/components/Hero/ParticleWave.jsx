"use client";
import { motion } from "framer-motion";

const PARTICLES = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,      // full width
  y: Math.random() * 100,      // full height
  size: 8 + Math.random() * 12, // bigger
  opacity: 0.45 + Math.random() * 0.4,
  duration: 8 + Math.random() * 8,
  delay: Math.random() * 6,
  driftX: 30 + Math.random() * 50,
  driftY: -(20 + Math.random() * 50),
}));

export default function ParticleWave() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full mix-blend-screen"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            filter: "blur(0.5px)",
            background: `radial-gradient(
                circle,
                rgba(139,92,246,${p.opacity}) 0%,
                rgba(168,85,247,${p.opacity * 0.7}) 50%,
                transparent 100%
            )`,
            }}
          animate={{
            x: [0, p.driftX, p.driftX * 0.6],
            y: [0, p.driftY, p.driftY * 1.4],
            opacity: [0, p.opacity, 0],
            scale: [0.6, 1.2, 0.4],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div 
          key={`dot-${i}`}
          className="absolute rounded-full mix-blend-screen"
          style={{
            left: `${2 + (i * 7.3) % 38}%`,
            top: `${55 + (i * 5.7) % 42}%`,
            width: 3,
height: 3,
opacity: 0.4,
boxShadow: "0 0 12px rgba(139,92,246,0.8)",
background: "#8b5cf6",
          }}
          animate={{
            opacity: [0.08, 0.28, 0.08],
            scale: [0.8, 1.4, 0.8],
          }}
          transition={{
            duration: 3 + (i % 4),
            delay: (i * 0.37) % 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
