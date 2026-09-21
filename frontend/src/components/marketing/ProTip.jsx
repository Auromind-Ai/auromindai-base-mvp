'use client';

import React from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';

export default function ProTip({ message }) {
  const defaultMsg = "Smaller, targeted audiences get higher engagement. Try segmenting your audience for better results.";

  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 sm:p-5 text-xs sm:text-sm transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#814AC8]/20 flex items-center justify-center shrink-0">
          <Lightbulb size={14} className="text-[#C49FE0]" />
        </div>
        <span className="font-medium text-white text-xs sm:text-sm">Pro Tip</span>
      </div>
      <p className="text-[#c4c0db] leading-relaxed text-xs sm:text-[13px] pl-1 font-normal">
        {message || defaultMsg}
      </p>
    </div>
  );
}
