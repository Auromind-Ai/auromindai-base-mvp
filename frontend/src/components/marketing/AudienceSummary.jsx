'use client';

import React from 'react';
import { Users, CheckCircle2, AlertTriangle, MessageSquare, Info, ShieldCheck } from 'lucide-react';

export default function AudienceSummary({
  total = 0,
  valid = 0,
  invalid = 0,
  optedIn = 0,
  optedOut = 0,
  estimatedMessages = null,
  estimatedCost = null,
  ratePerMessage = 0.8,
  isBalanceSufficient = true,
  shortfall = 0,
  portfolioRemainingToday = null,
  isWhatsAppConnected = true,
}) {
  const validPct = total > 0 ? ((valid / total) * 100).toFixed(1) : '0.0';
  const invalidPct = total > 0 ? ((invalid / total) * 100).toFixed(1) : '0.0';

  const displayEstimatedMessages = estimatedMessages || `~ ${valid.toLocaleString()} messages`;
  const costDisplay = estimatedCost !== null
    ? `₹${Number(estimatedCost).toFixed(2)}`
    : `~ ₹${(valid * (ratePerMessage || 0.8)).toFixed(2)}`;

  return (
    <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-5 text-xs sm:text-sm transition-all duration-200">
      <h4 className="font-medium text-white text-sm sm:text-base tracking-tight mb-4">
        Audience Summary
      </h4>

      {/* Main Total Count */}
      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#1b2238]">
        <div className="w-12 h-12 rounded-xl bg-[#814AC8]/20 border border-[#814AC8]/30 flex items-center justify-center text-[#C49FE0] shrink-0 shadow-[0_0_20px_rgba(129,74,200,0.15)]">
          <Users size={22} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight leading-none">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-[#c4c0db] mt-1 font-normal">
            Total recipients
          </div>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="space-y-3 mb-5 pb-4 border-b border-[#1b2238]">
        {/* Valid Numbers / Opted-In */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-medium text-white block leading-tight">Valid Numbers</span>
              <span className="text-xs text-emerald-400 font-normal">WhatsApp opted-in</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs sm:text-sm font-medium text-white block">{valid.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-medium">{validPct}%</span>
          </div>
        </div>

        {/* Invalid / Opted-Out */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-xs sm:text-sm font-medium text-white block leading-tight">Invalid / Opted-out</span>
              <span className="text-xs text-amber-300 font-normal">Excluded from send</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs sm:text-sm font-medium text-white block">{invalid.toLocaleString()}</span>
            <span className="text-xs text-amber-300 font-medium">{invalidPct}%</span>
          </div>
        </div>
      </div>

      {/* Estimated Cost Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5">
            Estimated Cost <Info size={13} className="text-[#814AC8]" />
          </span>
          {ratePerMessage && (
            <span className="text-xs text-[#c4c0db] font-normal">
              ₹{Number(ratePerMessage).toFixed(2)} / msg
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#080a12] border border-[#1b2238]">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
              <MessageSquare size={13} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white">
              {displayEstimatedMessages}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-emerald-400">
            {costDisplay}
          </span>
        </div>

        {/* Balance Warning if insufficient */}
        {!isBalanceSufficient && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2 font-normal">
            <AlertTriangle size={15} className="text-rose-400 shrink-0" />
            <span>
              Insufficient wallet balance. Shortfall: <strong>₹{Number(shortfall || 0).toFixed(2)}</strong>. Please recharge before blast.
            </span>
          </div>
        )}

        {/* Portfolio Tier Limit Info */}
        <div className="flex items-center justify-between text-xs text-[#c4c0db] px-1 pt-1 font-normal">
          <span>Meta 24h Quota:</span>
          {!isWhatsAppConnected || portfolioRemainingToday === 0 || portfolioRemainingToday === null ? (
            <span className="text-amber-400 font-medium">
              0 remaining (Not Connected)
            </span>
          ) : (
            <span className="text-[#C49FE0] font-medium">
              {portfolioRemainingToday.toLocaleString()} remaining
            </span>
          )}
        </div>

        <p className="text-xs text-[#a1a1aa] leading-relaxed pt-1 font-normal">
          Final cost settled atomically upon Meta delivery receipt. Unused escrow is refunded instantly.
        </p>
      </div>
    </div>
  );
}
