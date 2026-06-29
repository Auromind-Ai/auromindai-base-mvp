'use client';

import { motion } from "framer-motion";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] select-none pointer-events-auto">
      {/* Top glowing progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(124,58,237,0.8)]"
        initial={{ width: "0%" }}
        animate={{ width: "90%" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Centered neat loader container */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Inner ring */}
          <motion.div
            className="absolute w-12 h-12 border-2 border-white/5 border-t-violet-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />

          {/* Outer floating blur ring */}
          <motion.div
            className="absolute w-16 h-16 border border-indigo-500/20 rounded-full blur-[2px]"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />

          {/* Logo center dot */}
          <motion.div
            className="w-2.5 h-2.5 bg-violet-400 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.8)]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Loading text */}
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="text-white/60 text-[10px] font-mono uppercase tracking-[0.25em] font-medium">
            Orbionagents
          </span>
          <span className="text-violet-400 text-[10px] font-mono uppercase tracking-[0.25em] font-bold">
            AI
          </span>
        </motion.div>
      </div>
    </div>
  );
}
