'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function QuickTips({ tips = [] }) {
  const defaultTips = [
    'Use a clear and relevant campaign name',
    'Choose the right campaign type',
    'Make sure you have added recipients in the next step'
  ];

  const items = tips.length > 0 ? tips : defaultTips;

  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 text-xs">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={15} className="text-amber-400 shrink-0" />
        <span className="font-semibold text-white tracking-tight">Quick Tips</span>
      </div>
      <ul className="space-y-2 text-[#8c94a6] text-[11px] leading-relaxed">
        {items.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-white/40 shrink-0">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
