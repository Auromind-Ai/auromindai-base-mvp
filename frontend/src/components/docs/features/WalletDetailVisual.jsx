'use client';

import React, { useState } from 'react';
import { 
  Coins, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  Zap, 
  CheckCircle2, 
  TrendingUp,
  Cpu
} from 'lucide-react';

const RUN_SCENARIOS = [
  {
    id: 'gpt4o',
    name: 'Omni Reasoning Agent',
    model: 'GPT-4o Multi-Turn',
    inputTokens: '1,420 tokens',
    outputTokens: '480 tokens',
    toolCalls: '2 MCP tools executed',
    deduction: '0.042 USD ($0.042)',
    units: '-42 AI Credits',
    balanceAfter: '124,858 Credits',
    log: 'Tool: search_pricing + order_lookup executed deterministically.'
  },
  {
    id: 'claude35',
    name: 'Complex Synthesis',
    model: 'Claude 3.5 Sonnet',
    inputTokens: '3,850 tokens',
    outputTokens: '1,240 tokens',
    toolCalls: '4 MCP tools executed',
    deduction: '0.088 USD ($0.088)',
    units: '-88 AI Credits',
    balanceAfter: '124,812 Credits',
    log: 'Deep document synthesis with multi-vector chunk aggregation.'
  },
  {
    id: 'flash',
    name: 'Fast Routing Bot',
    model: 'Gemini 1.5 Flash',
    inputTokens: '520 tokens',
    outputTokens: '110 tokens',
    toolCalls: '0 tools (Direct match)',
    deduction: '0.003 USD ($0.003)',
    units: '-3 AI Credits',
    balanceAfter: '124,897 Credits',
    log: 'Instant triage & FAQ response generated under 180ms.'
  }
];

export default function WalletDetailVisual() {
  const [activeScenario, setActiveScenario] = useState(RUN_SCENARIOS[0]);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(50);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden font-sans">
      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Token Metering & Real-Time Financial Ledger
            </h4>
            <p className="text-[11px] text-slate-400">
              Deterministic per-token metering, WCC balance tracking & auto-reload rules
            </p>
          </div>
        </div>

        {/* Live Simulation Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-white/5">
          <span className="text-[10px] text-slate-400 px-2 font-medium uppercase tracking-wider">Simulate Agent:</span>
          {RUN_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenario(sc)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                activeScenario.id === sc.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border-b border-white/10 bg-slate-950/40">
        {/* Card 1: AI Token Meter */}
        <div className="p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              AI Credits Balance
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            124,900 <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Equivalent to ~$124.90 platform compute reserves
          </div>
        </div>

        {/* Card 2: Meta WCC Credits */}
        <div className="p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              WhatsApp Cloud Balance (WCC)
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">Prepaid</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            $450.00 <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Direct pass-through for Meta Business 24h conversation fees
          </div>
        </div>

        {/* Card 3: Auto-Topup Guard */}
        <div className="p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              Zero-Downtime Auto-Reload
            </span>
            <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Configured</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {autoReloadThreshold} <span className="text-xs font-normal text-slate-400">USD buffer</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Auto-charges payment card if balance falls below threshold
          </div>
        </div>
      </div>

      {/* Main Grid: Live Execution Meter & Immutable Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left: Execution Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-5 space-y-4 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Real-Time Run Calculation
            </span>
            <span className="text-xs font-mono text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {activeScenario.units}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Orchestrator Model:</span>
              <span className="font-mono text-white font-medium">{activeScenario.model}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Input Tokens Ingested:</span>
              <span className="font-mono text-slate-300">{activeScenario.inputTokens}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Generated Completion Tokens:</span>
              <span className="font-mono text-slate-300">{activeScenario.outputTokens}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tool / MCP Execution:</span>
              <span className="font-mono text-slate-300">{activeScenario.toolCalls}</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Net Transaction Cost:</span>
              <span className="font-mono text-emerald-400">{activeScenario.deduction}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Runtime Audit Annotation
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {activeScenario.log}
            </p>
          </div>
        </div>

        {/* Right: Transparent Transaction Ledger (7 cols) */}
        <div className="lg:col-span-7 p-5 space-y-4 bg-slate-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Immutable Consumption Ledger
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Synced with Stripe & Meta APIs</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {/* Live Row based on selected scenario */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-white">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-amber-200">AGENT_INFERENCE_RUN</div>
                  <div className="text-[10px] text-slate-400 font-sans">Conv #C-84091 • {activeScenario.model}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-amber-400">{activeScenario.units}</div>
                <div className="text-[10px] text-slate-400">Just now</div>
              </div>
            </div>

            {/* Static realistic ledger history entries */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-slate-300">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200">META_WCC_CONVERSATION_FEE</div>
                  <div className="text-[10px] text-slate-400 font-sans">WhatsApp Business Marketing Window (24h)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sky-400">-$0.072</div>
                <div className="text-[10px] text-slate-500">2 mins ago</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-slate-300">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200">STRIPE_AUTO_TOPUP</div>
                  <div className="text-[10px] text-slate-400 font-sans">Automatic threshold trigger (Card •••• 4242)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-400">+100,000 Credits</div>
                <div className="text-[10px] text-slate-500">1 hour ago</div>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 font-sans">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Overdraft Protection Active: Never drops into negative balance
            </span>
            <span className="font-mono text-[10px]">Stripe ID: sub_10928a</span>
          </div>
        </div>
      </div>
    </div>
  );
}
