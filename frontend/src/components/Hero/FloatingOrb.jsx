"use client";
import { motion } from "framer-motion";

export default function FloatingOrb() {
  return (
    <div className="absolute right-0 top-0 w-full h-full pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Primary large glow behind card */}
      <motion.div
        className="absolute rounded-full"
        style={{
          right: "2%",
          top: "8%",
          width: "clamp(280px, 38vw, 520px)",
          height: "clamp(280px, 38vw, 520px)",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(167,139,250,0.10) 40%, transparent 70%)",
          filter: "blur(32px)",
        }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Teal accent orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          right: "18%",
          top: "55%",
          width: "clamp(80px, 12vw, 180px)",
          height: "clamp(80px, 12vw, 180px)",
          background:
            "radial-gradient(circle, rgba(99,202,246,0.13) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      {/* Small bright accent */}
      <motion.div
        className="absolute rounded-full"
        style={{
          right: "8%",
          top: "15%",
          width: 90,
          height: 90,
          background:
            "radial-gradient(circle, rgba(196,181,253,0.25) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}
