'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Zap, BarChart2 } from 'lucide-react';

export default function WhatsApp3DIllustration() {
  return (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 flex items-center justify-center select-none shrink-0 pointer-events-none">
      {/* Background ambient radial glow */}
      <div 
        className="absolute w-44 h-44 rounded-full bg-[#814AC8]/25 blur-3xl pointer-events-none"
        aria-hidden="true" 
      />
      <div 
        className="absolute w-36 h-36 rounded-full bg-[#25D366]/20 blur-2xl pointer-events-none"
        aria-hidden="true" 
      />

      {/* Floating Badge 1: Top Left - Chat Bubble */}
      <motion.div
        animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-4 left-3 z-20 flex items-center justify-center w-8 h-8 rounded-xl bg-[#23153c]/90 border border-[#814AC8]/40 shadow-lg shadow-[#814AC8]/20 backdrop-blur-md"
      >
        <MessageSquare size={14} className="text-[#a77bee]" />
      </motion.div>

      {/* Floating Badge 2: Top Right - Chat message */}
      <motion.div
        animate={{ y: [4, -4, 4], rotate: [2, -2, 2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-2 right-4 z-20 flex items-center justify-center w-8 h-8 rounded-xl bg-[#23153c]/90 border border-[#814AC8]/40 shadow-lg shadow-[#814AC8]/20 backdrop-blur-md"
      >
        <MessageSquare size={14} className="text-[#a77bee]" />
      </motion.div>

      {/* Floating Badge 3: Bottom Left - Lightning bolt */}
      <motion.div
        animate={{ y: [3, -5, 3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute bottom-8 left-2 z-20 flex items-center justify-center w-8 h-8 rounded-xl bg-[#14233c]/90 border border-cyan-500/30 shadow-lg shadow-cyan-500/20 backdrop-blur-md"
      >
        <Zap size={14} className="text-cyan-400" />
      </motion.div>

      {/* Floating Badge 4: Bottom Right - Analytics bar chart */}
      <motion.div
        animate={{ y: [-3, 5, -3] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-8 right-2 z-20 flex items-center justify-center w-8 h-8 rounded-xl bg-[#23153c]/90 border border-[#814AC8]/40 shadow-lg shadow-[#814AC8]/20 backdrop-blur-md"
      >
        <BarChart2 size={14} className="text-[#a77bee]" />
      </motion.div>

      {/* 3D Platform Pedestal Base */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Main WhatsApp 3D Icon with gentle levitation */}
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-[0_12px_35px_rgba(37,211,102,0.45)] border border-white/20"
          style={{
            background: 'linear-gradient(135deg, #2fe574 0%, #20b857 55%, #10853c 100%)',
          }}
        >
          {/* Inner glossy reflection highlight */}
          <div className="absolute inset-x-2 top-1.5 h-8 rounded-t-2xl bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

          {/* WhatsApp Phone SVG */}
          <svg
            viewBox="0 0 48 48"
            className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M38.5 9.5C34.7 5.7 29.6 3.6 24.2 3.6 13.1 3.6 4.1 12.6 4.1 23.7c0 3.5 1 7 2.8 10L3.6 44.4l11-2.9c2.9 1.6 6.2 2.4 9.6 2.4 11.1 0 20.1-9 20.1-20.1 0-5.4-2.1-10.5-5.8-14.3zm-14.3 31.1c-3 0-5.9-.8-8.4-2.3l-.6-.4-6.3 1.6 1.7-6.1-.4-.6c-1.7-2.6-2.5-5.6-2.5-8.7 0-9 7.3-16.3 16.3-16.3 4.4 0 8.5 1.7 11.6 4.8 3.1 3.1 4.8 7.2 4.8 11.6 0 9-7.3 16.4-16.3 16.4zm8.9-12.2c-.5-.2-2.9-1.4-3.3-1.6-.4-.2-.8-.2-1.1.2s-1.3 1.6-1.6 1.9-.6.4-1.1.1c-.5-.2-2-0.7-3.7-2.3-1.4-1.2-2.3-2.7-2.6-3.2-.3-.5 0-.8.3-1 .2-.2.5-.6.7-.9.2-.3.3-.6.5-1 .1-.3 0-.7-.1-1s-1.1-2.7-1.5-3.7c-.4-.9-.8-.8-1.1-.8h-1c-.3 0-.8.1-1.3.6-.4.5-1.7 1.6-1.7 4 0 2.4 1.7 4.7 2 5 .2.3 3.3 5 8 7 1.1.5 2 .8 2.7 1 1.1.4 2.1.3 2.9.2 1-.2 2.9-1.2 3.3-2.3.4-1.1.4-2.1.3-2.3-.1-.2-.4-.3-.9-.6z" />
          </svg>
        </motion.div>

        {/* 3D Pedestal Platform Ellipse */}
        <div className="relative -mt-6 sm:-mt-7 w-36 sm:w-44 h-12 flex items-center justify-center">
          {/* Neon rim ring */}
          <div 
            className="absolute inset-0 rounded-[100%] border border-[#814AC8]/60 bg-gradient-to-b from-[#1b1233] to-[#0c061a] shadow-[0_0_20px_rgba(129,74,200,0.5)]" 
          />
          {/* Inner reflection glow */}
          <div 
            className="absolute inset-x-4 top-1.5 h-6 rounded-[100%] bg-[#25D366]/20 blur-[6px]" 
          />
          {/* Dark pedestal shadow underneath */}
          <div 
            className="absolute -bottom-2 inset-x-2 h-4 rounded-[100%] bg-black/80 blur-sm" 
          />
        </div>
      </div>
    </div>
  );
}
