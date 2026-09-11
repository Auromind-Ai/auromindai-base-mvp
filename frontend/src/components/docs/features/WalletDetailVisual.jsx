'use client';

import React, { useState } from 'react';
import { 
  Coins, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Cpu,
  Calculator,
  Gauge,
  UserCheck,
  Sparkles
} from 'lucide-react';

const RUN_SCENARIOS = [
  {
    id: 'claude',
    name: 'Claude',
    model: 'Claude',
    category: 'Complex Synthesis',
    inputTokens: '3,850 tokens',
    outputTokens: '1,240 tokens',
    toolCalls: '2 MCP tools executed',
    deduction: '0.088 Credits',
    units: '-88 AI Credits',
    balanceAfter: '250,903.29',
    log: 'Deep document synthesis with multi-vector chunk aggregation.'
  },
  {
    id: 'gpt',
    name: 'GPT',
    model: 'GPT',
    category: 'Omni Reasoning',
    inputTokens: '1,420 tokens',
    outputTokens: '480 tokens',
    toolCalls: '1 CRM tool executed',
    deduction: '0.042 Credits',
    units: '-42 AI Credits',
    balanceAfter: '250,949.29',
    log: 'Tool: search_pricing + order_lookup executed deterministically.'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    model: 'Gemini',
    category: 'Fast Routing Bot',
    inputTokens: '520 tokens',
    outputTokens: '110 tokens',
    toolCalls: '0 tools (Direct match)',
    deduction: '0.003 Credits',
    units: '-3 AI Credits',
    balanceAfter: '250,988.29',
    log: 'Instant triage & FAQ response generated under 180ms.'
  }
];

const WCC_RATES = {
  marketing: { label: 'Marketing', rate: 0.82, desc: 'Outbound campaigns, promotions & offers' },
  utility: { label: 'Utility', rate: 0.35, desc: 'Order tracking, OTPs & billing updates' },
  service: { label: 'Service', rate: 0.35, desc: 'User-initiated customer care 24h window' },
  authentication: { label: 'Auth / OTP', rate: 0.15, desc: 'Two-factor login verification' },
};

export default function WalletDetailVisual() {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'wcc'
  const [activeScenario, setActiveScenario] = useState(RUN_SCENARIOS[0]);
  const [audienceSize, setAudienceSize] = useState(1000);
  const [wccCategory, setWccCategory] = useState('marketing');
  const [autoReloadThreshold] = useState(500);

  const calculatedWccCost = (audienceSize * WCC_RATES[wccCategory].rate).toFixed(2);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#090A10] shadow-2xl backdrop-blur-xl overflow-hidden font-sans">
      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Credits &amp; Wallet Console (/user/admin/credits)
            </h4>
            <p className="text-[11px] text-zinc-400">
              Deterministic per-token metering, Meta WCC fuel gauge &amp; Razorpay auto-reload
            </p>
          </div>
        </div>

        {/* Dual Tab Switcher (matches real platform) */}
        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            AI Credits
          </button>
          <button
            onClick={() => setActiveTab('wcc')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeTab === 'wcc'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            WhatsApp WCC
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: AI CREDITS ==================== */}
      {activeTab === 'ai' && (
        <div>
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border-b border-white/10 bg-slate-950/40">
            {/* Card 1: AI Token Meter */}
            <div className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  AI Models Usage
                </span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  99.9% Left
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                250,991.29 <span className="text-xs font-normal text-zinc-400">/ 251,000</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Runway: ~28.4 days remaining at current burn rate
              </div>
            </div>

            {/* Card 2: Human Takeover Guard */}
            <div className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Human Takeover Guard
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Active
                </span>
              </div>
              <div className="text-base font-semibold text-white">
                Zero-Drop Fallback
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Chats seamlessly route to human agents if credits ever reach zero
              </div>
            </div>

            {/* Card 3: Auto-Topup Guard */}
            <div className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  Razorpay Auto-Reload
                </span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  Configured
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                ₹{autoReloadThreshold} <span className="text-xs font-normal text-zinc-400">threshold</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans">
                Auto-reloads ₹1,000 pack when balance falls below ₹500
              </div>
            </div>
          </div>

          {/* Main Grid: Live Execution Meter & Simulated Run */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {/* Left: Execution Breakdown (6 cols) */}
            <div className="lg:col-span-6 p-5 space-y-3.5 bg-slate-950/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Live Agent Token Metering
                </span>
                <span className="text-xs font-mono text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {activeScenario.units}
                </span>
              </div>

              {/* Model Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-white/5">
                <span className="text-[10px] text-zinc-400 px-2 font-medium">Model:</span>
                {RUN_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setActiveScenario(sc)}
                    className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                      activeScenario.id === sc.id
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Foundation Model:</span>
                  <span className="font-mono text-white font-medium">{activeScenario.model}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Input Tokens Ingested:</span>
                  <span className="font-mono text-zinc-300">{activeScenario.inputTokens}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Completion Tokens:</span>
                  <span className="font-mono text-zinc-300">{activeScenario.outputTokens}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Tool Calls:</span>
                  <span className="font-mono text-zinc-300">{activeScenario.toolCalls}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-zinc-300">Remaining Balance:</span>
                  <span className="font-mono text-emerald-400">{activeScenario.balanceAfter} credits</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Execution Trace
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  {activeScenario.log}
                </p>
              </div>
            </div>

            {/* Right: Transparent Transaction Ledger (6 cols) */}
            <div className="lg:col-span-6 p-5 space-y-3.5 bg-slate-900/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Itemized Transaction Ledger
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">Real-time sync</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-white">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-purple-200">AI_INFERENCE_RUN</div>
                      <div className="text-[10px] text-zinc-400 font-sans">Conv #C-84091 • {activeScenario.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-300">{activeScenario.units}</div>
                    <div className="text-[10px] text-zinc-400">Just now</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-medium text-zinc-200">META_WCC_SERVICE_FEE</div>
                      <div className="text-[10px] text-zinc-400 font-sans">Inbound Customer Service Window (24h)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sky-400">-₹0.35</div>
                    <div className="text-[10px] text-zinc-500">2 mins ago</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-medium text-zinc-200">RAZORPAY_RELOAD</div>
                      <div className="text-[10px] text-zinc-400 font-sans">UPI Autopay • Inv #INV-2026-081</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">+100,000 Credits</div>
                    <div className="text-[10px] text-slate-500">1 hour ago</div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 font-sans">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Protected by Razorpay &amp; Meta Verified Endpoints
                </span>
                <span className="font-mono text-[10px]">GST Compliant</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: WHATSAPP WCC ==================== */}
      {activeTab === 'wcc' && (
        <div>
          {/* WCC Fuel Gauge Card */}
          <div className="p-5 border-b border-white/10 bg-slate-950/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400 font-medium">WhatsApp Conversation Wallet (WCC)</p>
                <div className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight mt-1">
                  ₹3,000.00
                </div>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">
                  ● ≈ 2,400 Marketing messages or 8,500 Service conversations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Overage Protected
                </span>
              </div>
            </div>

            {/* 4-Segment Fuel Gauge matching real app */}
            <div className="max-w-2xl space-y-1.5">
              <div className="relative pt-2">
                {/* Pointer Needle */}
                <div
                  className="absolute top-0 transition-all duration-500 ease-out z-10"
                  style={{ left: '82%', transform: 'translateX(-50%)' }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: '5px solid #ffffff',
                    }}
                  />
                </div>

                {/* 4 Distinct Colored Segments */}
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-zinc-800">
                  <div className="w-1/4 h-full bg-[#dc2626]" title="Empty" />
                  <div className="w-1/4 h-full bg-[#d97706]" title="Low" />
                  <div className="w-1/4 h-full bg-[#16a34a]" title="Healthy" />
                  <div className="w-1/4 h-full bg-[#e5e5d8]" title="Full" />
                </div>
              </div>

              {/* Scale Labels */}
              <div className="grid grid-cols-4 text-[10px] font-mono text-zinc-500">
                <span className="text-left text-rose-400">Empty</span>
                <span className="text-center text-amber-400">Low</span>
                <span className="text-center text-emerald-400 font-bold">Healthy (82%)</span>
                <span className="text-right text-zinc-300">Full</span>
              </div>
            </div>
          </div>

          {/* Campaign Cost Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            <div className="lg:col-span-7 p-5 space-y-4 bg-slate-950/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  Campaign Pre-Flight Cost Calculator
                </span>
                <span className="text-[11px] font-mono text-zinc-400">Official Meta Rate Card</span>
              </div>

              {/* Message Category Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(WCC_RATES).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => setWccCategory(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      wccCategory === key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-sm'
                        : 'border-white/5 bg-slate-900/60 text-zinc-400 hover:border-white/10'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-xs font-mono text-emerald-400 mt-0.5">₹{item.rate}/msg</div>
                  </button>
                ))}
              </div>

              {/* Slider for Audience Size */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Broadcast Audience Size:</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {audienceSize.toLocaleString('en-IN')} recipients
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="100"
                  value={audienceSize}
                  onChange={(e) => setAudienceSize(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>100</span>
                  <span>5,000</span>
                  <span>10,000</span>
                  <span>20,000</span>
                </div>
              </div>
            </div>

            {/* Right: Calculated Summary & Quick Top-Up */}
            <div className="lg:col-span-5 p-5 space-y-4 bg-slate-900/30 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Estimated Campaign Outlay
                </span>

                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="text-xs text-zinc-400">Total Meta Session Charge:</div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400">
                    ₹{Number(calculatedWccCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {audienceSize.toLocaleString('en-IN')} × ₹{WCC_RATES[wccCategory].rate} ({WCC_RATES[wccCategory].label})
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Charges are deducted dynamically as Meta acknowledges message delivery within the 24h window.
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Sufficient WCC Balance (₹3,000)
                </span>
                <span className="font-mono text-emerald-400 font-bold">Ready to Send</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

