'use client';

import React from 'react';
import { Users, CheckCircle2, AlertTriangle, MessageSquare, Info, ShieldCheck } from 'lucide-react';

export default function AudienceSummary({
  total = 2480,
  valid = 2430,
  invalid = 50,
  optedIn = 2430,
  optedOut = 50,
  estimatedMessages = '~ 2,430 messages'
}) {
  const validPct = total > 0 ? ((valid / total) * 100).toFixed(1) : '0.0';
  const invalidPct = total > 0 ? ((invalid / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-xl bg-[#0f0e1c] border border-[#251f42] p-5 text-xs transition-all duration-200 hover:border-purple-500/30">
      <h4 className="font-semibold text-white text-sm tracking-tight mb-4">
        Audience Summary
      </h4>

      {/* Main Total Count */}
      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#251f42]/70">
        <div className="w-12 h-12 rounded-xl bg-[#814AC8]/20 border border-[#814AC8]/30 flex items-center justify-center text-[#C49FE0] shrink-0 shadow-[0_0_20px_rgba(129,74,200,0.15)]">
          <Users size={22} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight leading-none">
            {total.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8c88a6] mt-1 font-medium">
            Total recipients
          </div>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="space-y-3 mb-5 pb-4 border-b border-[#251f42]/70">
        {/* Valid Numbers / Opted-In */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-medium text-[#D4D4D4] block leading-tight">Valid Numbers</span>
              <span className="text-[10px] text-emerald-400/80">WhatsApp opted-in</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-white block">{valid.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 font-medium">{validPct}%</span>
          </div>
        </div>

        {/* Invalid / Opted-Out */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-xs font-medium text-[#D4D4D4] block leading-tight">Invalid / Opted-out</span>
              <span className="text-[10px] text-amber-400/80">Excluded from send</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-white block">{invalid.toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 font-medium">{invalidPct}%</span>
          </div>
        </div>
      </div>

      {/* Estimated Cost Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#a8a3c2] flex items-center gap-1.5">
            Estimated Cost <Info size={11} className="text-[#814AC8]" />
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#17132e] border border-[#2b244d]">
          <div className="w-5 h-5 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
            <MessageSquare size={12} />
          </div>
          <span className="text-xs font-semibold text-white">
            {estimatedMessages}
          </span>
        </div>

        <p className="text-[10px] text-[#6d688c] leading-relaxed pt-1">
          Final cost may vary based on template category (marketing/utility) and Meta charges.
        </p>
      </div>
    </div>
  );
}
