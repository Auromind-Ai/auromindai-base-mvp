'use client';

import React from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';

export default function ProTip({ message }) {
  const defaultMsg = "Smaller, targeted audiences get higher engagement. Try segmenting your audience for better results.";

  return (
    <div className="rounded-xl bg-[#180e2d]/70 border border-purple-500/30 p-4 text-xs transition-all duration-200 hover:border-purple-500/50 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#814AC8]/20 flex items-center justify-center shrink-0">
          <Lightbulb size={14} className="text-[#C49FE0]" />
        </div>
        <span className="font-semibold text-[#e2d5fa] text-xs">Pro Tip</span>
      </div>
      <p className="text-[#a8a3c2] leading-relaxed text-[11px] pl-1">
        {message || defaultMsg}
      </p>
    </div>
  );
}
