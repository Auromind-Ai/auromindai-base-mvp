'use client';

import { useState } from 'react';
import {
  UserCheck,
  TrendingUp,
  Tag,
  Phone,
  Mail,
  Calendar,
  Flame,
  Clock,
  Sparkles,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

export default function LeadsDetailVisual() {
  const [activeTier, setActiveTier] = useState('Hot');

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-white text-sm">AI Lead Intelligence &amp; Qualification Pipeline</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
            Autonomous Entity Extraction
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Tier Summary Tabs */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => setActiveTier('Hot')}
            className={`p-3 rounded-xl border transition-all ${
              activeTier === 'Hot'
                ? 'bg-red-500/15 border-red-500/50 shadow-md'
                : 'bg-white/[0.02] border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-red-400 font-bold mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>HOT LEADS</span>
            </div>
            <span className="text-xs font-mono font-bold text-white">Score &gt; 75</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">High Purchase Intent</span>
          </button>

          <button
            onClick={() => setActiveTier('Warm')}
            className={`p-3 rounded-xl border transition-all ${
              activeTier === 'Warm'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                : 'bg-white/[0.02] border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>WARM LEADS</span>
            </div>
            <span className="text-xs font-mono font-bold text-white">Score 40 - 75</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">Evaluating Options</span>
          </button>

          <button
            onClick={() => setActiveTier('Cold')}
            className={`p-3 rounded-xl border transition-all ${
              activeTier === 'Cold'
                ? 'bg-blue-500/15 border-blue-500/50 shadow-md'
                : 'bg-white/[0.02] border-white/5 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-blue-400 font-bold mb-1">
              <span>❄</span>
              <span>COLD LEADS</span>
            </div>
            <span className="text-xs font-mono font-bold text-white">Score &lt; 40</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">Early Research</span>
          </button>
        </div>

        {/* Lead Intelligence Dossier Card */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-bold text-white text-sm">
                PS
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Priya Sharma</h4>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> +91 98401 •••••
                  </span>
                  <span>•</span>
                  <span>Channel: WhatsApp Business</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-center font-mono">
                <span className="text-sm font-extrabold text-red-400">88</span>
                <span className="text-[10px] text-zinc-400 block leading-none">Lead Score</span>
              </div>
            </div>
          </div>

          {/* AI Extracted Signals Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block mb-0.5">Detected Budget</span>
              <span className="font-bold text-white text-xs">₹1.15 Cr - ₹1.3 Cr</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block mb-0.5">Timeline / Urgency</span>
              <span className="font-bold text-emerald-400 text-xs">Immediate (&lt; 30 Days)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block mb-0.5">Financing Status</span>
              <span className="font-bold text-cyan-300 text-xs">Pre-Approved HDFC</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block mb-0.5">Property Preference</span>
              <span className="font-bold text-violet-300 text-xs">2BHK East Facing</span>
            </div>
          </div>

          {/* Conversation Signals Extraction Box */}
          <div className="p-3 rounded-lg bg-violet-950/20 border border-violet-500/20 text-[11px] space-y-1.5">
            <span className="font-bold text-violet-300 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              Automated Signal Reasoning
            </span>
            <p className="text-zinc-300 leading-relaxed font-sans text-xs">
              &ldquo;Customer requested immediate weekend floor plan inspection and explicitly stated budget range for Tower B. Pre-approved home loan confirms high buying capacity.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
