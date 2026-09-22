'use client';

import React from 'react';
import { Moon, Info } from 'lucide-react';

export default function QuietHours({ enabled, onChange }) {
  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 sm:p-5 text-xs sm:text-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 flex items-center justify-center text-white">
            <Moon size={15} />
          </div>
          <span className="font-medium text-white text-xs sm:text-sm">Quiet Hours</span>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-[#814AC8]' : 'bg-[#1b2238]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="text-[#c4c0db] text-xs sm:text-[13px] leading-relaxed mb-3 font-normal">
        Avoid sending messages during non-business hours to maintain a good customer experience.
      </p>

      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] font-normal">
        <Info size={13} className="text-[#814AC8] shrink-0" />
        <span>Quiet hours: 10:00 PM - 8:00 AM (IST)</span>
      </div>
    </div>
  );
}
