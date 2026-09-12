'use client';

import { Play } from 'lucide-react';

export default function DocsHeroVideoCard() {
  return (
    <div className="w-full h-full min-h-[260px] sm:min-h-[280px] lg:min-h-[310px] rounded-2xl border border-white/10 bg-[#090A12]/80 backdrop-blur-xl shadow-2xl shadow-black/80 flex items-center justify-center relative overflow-hidden group select-none">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#814ac8]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-900/10 rounded-full blur-2xl pointer-events-none" />

      {/* Subtle architectural dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(129, 74, 200, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Center Video Play Icon Button */}
      <div className="relative flex items-center justify-center z-10">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#814AC8] to-[#9d4edd] text-white flex items-center justify-center shadow-xl shadow-purple-950/80 border border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-900/90 cursor-pointer">
          <Play className="w-6 h-6 sm:w-7 h-7 fill-white translate-x-0.5 text-white" />
        </div>

        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-2xl border border-violet-500/30 animate-ping opacity-25 pointer-events-none" />
      </div>
    </div>
  );
}
