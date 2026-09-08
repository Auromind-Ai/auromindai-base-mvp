'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Check,
  X,
  AlertTriangle,
  FileText,
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  Share2,
  ShieldAlert,
  Coins,
  ArrowRight,
  GitBranch,
  Phone,
  Mail,
  Instagram,
  Globe,
  Clock,
  ChevronDown,
} from 'lucide-react';

// 01: Omni-Channel Inbox Preview
export function InboxPreview() {
  const [activeChannel, setActiveChannel] = useState('WhatsApp');

  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner">
      {/* Channel Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          {['WhatsApp', 'Instagram', 'Gmail'].map((ch) => (
            <button
              key={ch}
              onClick={(e) => {
                e.preventDefault();
                setActiveChannel(ch);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeChannel === ch
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Stream
        </span>
      </div>

      {/* Mini Chat Snippets */}
      <div className="space-y-2 mb-3">
        <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <div>
              <span className="font-semibold text-white block">Priya Sharma</span>
              <span className="text-[11px] text-zinc-300">
                &ldquo;Can I see the 2BHK floor plans and pricing?&rdquo;
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
            AI Active
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5 flex items-start justify-between opacity-80">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-300 block">Rahul Kumar</span>
              <span className="text-[11px] text-zinc-400">
                &ldquo;What is the schedule for Saturday visit?&rdquo;
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Agent Handoff
          </span>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-white/10 font-mono text-[10px]">
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-zinc-400 block">Active</span>
          <span className="font-bold text-white">24 Chats</span>
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-violet-400 block">AI Handled</span>
          <span className="font-bold text-violet-300">8 Bots</span>
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-amber-400 block">Takeovers</span>
          <span className="font-bold text-amber-300">3 Reps</span>
        </div>
      </div>
    </div>
  );
}

// 02: AI Brain (RAG & Knowledge Base) Preview
export function AIBrainPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3">
      {/* Knowledge Base Metrics */}
      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] pb-2.5 border-b border-white/10">
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block">Docs</span>
          <span className="font-bold text-white text-xs">128</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block">Chunks</span>
          <span className="font-bold text-violet-300 text-xs">14,820</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block">Sources</span>
          <span className="font-bold text-cyan-300 text-xs">12</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block">Indexed</span>
          <span className="font-bold text-emerald-400 text-xs">98%</span>
        </div>
      </div>

      {/* Query Simulation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-[11px]">
          <Search className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="font-mono text-white">
            &ldquo;What is your refund policy?&rdquo;
          </span>
        </div>

        <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-400" /> Grounded AI Answer
            </span>
            <span className="font-mono text-zinc-400">pgvector cosine: 0.94</span>
          </div>
          <p className="text-[11px] text-zinc-200 leading-relaxed">
            Customers can request a refund within 14 days of subscription renewal.
            Annual plans are eligible for prorated credits.
          </p>
          <div className="pt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-zinc-300">
              <FileText className="w-3 h-3 text-violet-400" />
              Source: Refund_Policy_2026.pdf [Page 4]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 03: AI Workspace Preview
export function AIWorkspacePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-2.5">
      {/* User Input Bubble */}
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-zinc-200 text-[11px] max-w-[85%]">
          &ldquo;Analyze this lead conversation and qualify urgency.&rdquo;
        </div>
      </div>

      {/* AI Streaming Response Card */}
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-md bg-[#814AC8] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 text-white space-y-2 flex-1">
          <div className="flex items-center justify-between border-b border-violet-500/20 pb-1.5">
            <span className="font-bold text-[11px] text-violet-300">
              Orbion Intent Engine
            </span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              High Priority
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-zinc-400">Intent:</span>
              <span className="font-bold text-white ml-1">Purchase 3BHK</span>
            </div>
            <div>
              <span className="text-zinc-400">Lead Score:</span>
              <span className="font-bold text-violet-300 ml-1">87 / 100</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-violet-500/20 text-[11px] space-y-1">
            <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">
              Autonomous Next Actions:
            </span>
            <div className="flex items-center gap-1.5 text-zinc-200">
              <span className="text-violet-400">→</span>
              <span>Assign to Senior Real Estate Agent</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-200">
              <span className="text-violet-400">→</span>
              <span>Schedule WhatsApp calendar invite in 2 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 04: AI Lead Intelligence Preview
export function LeadIntelligencePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3">
      {/* Tiers Header */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
            Hot
          </span>
          <span className="text-sm font-bold text-white font-mono">128</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Warm
          </span>
          <span className="text-sm font-bold text-white font-mono">342</span>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
            Cold
          </span>
          <span className="text-sm font-bold text-white font-mono">891</span>
        </div>
      </div>

      {/* Main Score Gauge */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
            Average Lead Quality
          </span>
          <span className="text-2xl font-extrabold text-white font-mono">87</span>
          <span className="text-[10px] text-zinc-400 block">High Closing Probability</span>
        </div>

        <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-400 border-r-violet-400 flex items-center justify-center font-mono text-sm font-bold text-violet-300">
          87%
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between mb-1 text-zinc-400">
            <span>Purchase Intent Confidence</span>
            <span className="text-violet-300 font-mono">92%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full w-[92%]" />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1 text-zinc-400">
            <span>Conversation Engagement Rate</span>
            <span className="text-cyan-300 font-mono">78%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full w-[78%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 05: Automation Wire Preview
export function AutomationPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-2.5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-violet-400" />
          Interactive Wire Canvas
        </span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono">
          State: Active
        </span>
      </div>

      {/* Mini Visual Flow Nodes */}
      <div className="space-y-2 pt-1 font-mono text-[10px]">
        {/* Step 1 */}
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
              1
            </span>
            <span className="text-white">Customer WhatsApp Message</span>
          </div>
          <span className="text-zinc-400">Trigger</span>
        </div>

        <div className="w-0.5 h-3 bg-violet-500/50 mx-auto" />

        {/* Step 2 */}
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-violet-500/30 text-violet-300 flex items-center justify-center font-bold">
              2
            </span>
            <span className="text-white">AI Intent Classification</span>
          </div>
          <span className="text-violet-300 font-bold">Decision</span>
        </div>

        <div className="w-0.5 h-3 bg-violet-500/50 mx-auto" />

        {/* Split Branch */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
            <span className="text-cyan-300 font-bold block">Qualified Lead</span>
            <span className="text-zinc-400 text-[9px]">Score &gt; 75</span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/60 border border-white/5 text-center">
            <span className="text-zinc-400 font-bold block">General Support</span>
            <span className="text-zinc-400 text-[9px]">FAQ Fallback</span>
          </div>
        </div>

        <div className="w-0.5 h-3 bg-violet-500/50 mx-auto" />

        {/* Step 4 */}
        <div className="p-2 rounded-lg bg-[#814AC8]/20 border border-[#814AC8]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-[#814AC8] text-white flex items-center justify-center font-bold">
              3
            </span>
            <span className="text-white">CRM Lead Created &amp; Agent Assigned</span>
          </div>
          <span className="text-emerald-400 font-bold">Outcome</span>
        </div>
      </div>
    </div>
  );
}

// 06: WhatsApp Campaigns Preview
export function CampaignPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3">
      {/* Campaign Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <span className="font-semibold text-white block text-[11px]">
            Summer Property Broadcast
          </span>
          <span className="text-[10px] text-zinc-400">Meta Cloud API • Approved</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
          98.2% Delivered
        </span>
      </div>

      {/* AiSensy Benchmark Telemetry Matrix */}
      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Audience</span>
          <span className="font-bold text-white">12,840</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Delivered</span>
          <span className="font-bold text-emerald-400">11,980</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Read</span>
          <span className="font-bold text-cyan-300">9,842</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Replies</span>
          <span className="font-bold text-violet-300">1,284</span>
        </div>
      </div>

      {/* Bottom Conversion Row */}
      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px]">
        <div>
          <span className="text-zinc-400 block text-[10px]">Qualified Pipeline</span>
          <span className="font-bold text-white font-mono">326 Leads</span>
        </div>
        <div className="text-right">
          <span className="text-zinc-400 block text-[10px]">Closed Sales</span>
          <span className="font-bold text-emerald-400 font-mono">48 Deals</span>
        </div>
      </div>
    </div>
  );
}

// 07: Customer 360 Preview
export function Customer360Preview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-2.5">
      {/* Profile Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
            RK
          </div>
          <div>
            <h4 className="font-bold text-white text-[12px]">Rahul Kumar</h4>
            <span className="text-[10px] text-zinc-400 font-mono">+91 98401 •••••</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] font-bold">
          Score 91 • Hot
        </span>
      </div>

      {/* Channels Verified */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300">
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          WhatsApp ✓
        </span>
        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
          Instagram ✓
        </span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
          Email ✓
        </span>
      </div>

      {/* AI Customer Summary */}
      <div className="p-2.5 rounded-lg bg-violet-950/20 border border-violet-500/20 text-[11px] space-y-1">
        <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Autonomous Customer Summary
        </span>
        <p className="text-zinc-300 leading-relaxed text-[11px]">
          Looking for a 3BHK apartment in Chennai within ₹1.2Cr. Pre-approved loan.
          Prefers site inspection on weekends.
        </p>
      </div>

      {/* Activity Counters */}
      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-zinc-400 pt-1">
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="block text-white font-bold">24</span> Conversations
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="block text-violet-300 font-bold">6</span> Campaigns
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="block text-emerald-400 font-bold">2</span> Payments
        </div>
      </div>
    </div>
  );
}

// 08: AI Governance & MCP Safeguards Preview
export function AIGovernancePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-2.5">
      {/* Telemetry Actions */}
      <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] pb-2 border-b border-white/10">
        <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-emerald-400 font-bold block">1,842</span>
          <span className="text-zinc-400 text-[9px]">Allowed</span>
        </div>
        <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20">
          <span className="text-amber-400 font-bold block">37</span>
          <span className="text-zinc-400 text-[9px]">Escalated</span>
        </div>
        <div className="p-1 rounded bg-red-500/10 border border-red-500/20">
          <span className="text-red-400 font-bold block">124</span>
          <span className="text-zinc-400 text-[9px]">Blocked</span>
        </div>
      </div>

      {/* MCP Policy Check Card */}
      <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-white">AI Request: Send Broadcast</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
            BLOCKED
          </span>
        </div>

        <div className="space-y-1 font-mono text-[10px]">
          <div className="flex items-center justify-between text-zinc-300">
            <span>Workspace Policy Compliance</span>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between text-zinc-300">
            <span>Meta WhatsApp Cloud Policy</span>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between text-red-400">
            <span>User Explicit Opt-In Consent</span>
            <X className="w-3.5 h-3.5 text-red-400" />
          </div>
        </div>

        <p className="text-[10px] text-zinc-400 pt-1 border-t border-white/5">
          Action aborted: Safe fallback triggered to prevent compliance violation.
        </p>
      </div>
    </div>
  );
}

// 09: Wallet & Credits (Orbion Fuel) Preview
export function WalletPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-400" /> Orbion Fuel &amp; Usage
        </span>
        <span className="text-[10px] font-mono text-zinc-400">Auto-Topup: Enabled</span>
      </div>

      {/* Progress Gauges */}
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between mb-1 text-zinc-300 font-mono">
            <span>AI LLM Tokens</span>
            <span className="text-violet-300">18,420 Remaining (82%)</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full w-[82%]" />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1 text-zinc-300 font-mono">
            <span>WhatsApp Conversation Credits (WCC)</span>
            <span className="text-cyan-300">₹4,820 Remaining (64%)</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full w-[64%]" />
          </div>
        </div>
      </div>

      {/* Monthly Utilization */}
      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] pt-1">
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">AI Calls</span>
          <span className="font-bold text-white">42,180</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Messages</span>
          <span className="font-bold text-violet-300">18,492</span>
        </div>
        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
          <span className="text-zinc-400 block text-[9px]">Automations</span>
          <span className="font-bold text-emerald-400">3,821</span>
        </div>
      </div>
    </div>
  );
}

// 10: Multi-Channel Architecture Preview
export function MultiChannelPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-2.5">
      {/* Top Origin */}
      <div className="text-center">
        <span className="px-3 py-1 rounded-md bg-[#814AC8]/20 border border-[#814AC8]/40 text-white font-mono text-[11px] font-bold">
          ORBION AGENTS CORE
        </span>
      </div>

      <div className="w-0.5 h-3 bg-violet-500/50 mx-auto" />

      {/* Channel Nodes */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center gap-1">
          <Phone className="w-3 h-3" />
          <span>WhatsApp</span>
        </div>
        <div className="p-2 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300 flex items-center justify-center gap-1">
          <Instagram className="w-3 h-3" />
          <span>Instagram</span>
        </div>
        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center gap-1">
          <Mail className="w-3 h-3" />
          <span>Email / SMS</span>
        </div>
      </div>

      <div className="w-0.5 h-3 bg-violet-500/50 mx-auto" />

      {/* Central Processing & CRM */}
      <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-center font-mono text-[10px] space-y-1">
        <span className="text-violet-300 font-bold block">
          AI Brain &amp; Vector Embeddings
        </span>
        <span className="text-zinc-400 block text-[9px]">
          Unified CRM Contact Synchronization
        </span>
      </div>
    </div>
  );
}
