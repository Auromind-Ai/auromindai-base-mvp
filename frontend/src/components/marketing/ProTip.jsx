'use client';

import React from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';

export default function ProTip({ message }) {
  const defaultMsg = "Smaller, targeted audiences get higher engagement. Try segmenting your audience for better results.";

  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 text-xs transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#635BFF]/20 flex items-center justify-center shrink-0">
          <Lightbulb size={14} className="text-[#a78bfa]" />
        </div>
        <span className="font-semibold text-white text-xs">Pro Tip</span>
      </div>
      <p className="text-[#8c94a6] leading-relaxed text-[11px] pl-1">
        {message || defaultMsg}
      </p>
    </div>
  );
}
