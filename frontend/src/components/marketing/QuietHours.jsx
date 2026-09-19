'use client';

import React from 'react';
import { Moon, Info } from 'lucide-react';

export default function QuietHours({ enabled, onChange }) {
  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 text-xs transition-all duration-200">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#635BFF]/15 flex items-center justify-center text-[#a78bfa]">
            <Moon size={14} />
          </div>
          <span className="font-semibold text-white text-xs">Quiet Hours</span>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-[#635BFF]' : 'bg-[#1b2238]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="text-[#8c94a6] text-[11px] leading-relaxed mb-3">
        Avoid sending messages during non-business hours to maintain a good customer experience.
      </p>

      <div className="flex items-center gap-1.5 text-[10px] text-[#6d7588]">
        <Info size={11} className="text-[#635BFF] shrink-0" />
        <span>Quiet hours: 10:00 PM - 8:00 AM (IST)</span>
      </div>
    </div>
  );
}
