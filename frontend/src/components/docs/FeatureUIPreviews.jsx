'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
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
  ArrowUpRight,
  Flame,
  Activity,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
  const [tab, setTab] = useState('ai');

  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3">
      {/* Title & Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            Credits &amp; Wallet
          </span>
        </div>
        <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setTab('ai')}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
              tab === 'ai'
                ? 'bg-purple-500/20 text-purple-300 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            AI Credits
          </button>
          <button
            onClick={() => setTab('wcc')}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${
              tab === 'wcc'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            WhatsApp WCC
          </button>
        </div>
      </div>

      {tab === 'ai' ? (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          <div>
            <div className="flex justify-between items-baseline mb-1 font-mono">
              <span className="text-[10px] text-zinc-400">LLM Inference Quota</span>
              <span className="text-purple-300 text-[11px] font-bold">250,991 / 251,000 (99.9%)</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full w-[99.9%]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] pt-1">
            <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block text-[9px]">Claude</span>
              <span className="font-bold text-white">Active</span>
            </div>
            <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block text-[9px]">Runway</span>
              <span className="font-bold text-purple-300">28.4 days</span>
            </div>
            <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-emerald-400 block text-[9px]">Fallback</span>
              <span className="font-bold text-emerald-300">Human Takeover</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          <div>
            <div className="flex justify-between items-baseline mb-1 font-mono">
              <span className="text-[10px] text-zinc-400">Meta WCC Balance</span>
              <span className="text-emerald-400 text-[11px] font-bold">₹3,000.00 (Healthy)</span>
            </div>
            {/* 4-Segment Fuel Bar */}
            <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-zinc-800">
              <div className="w-1/4 h-full bg-[#dc2626]" />
              <div className="w-1/4 h-full bg-[#d97706]" />
              <div className="w-1/4 h-full bg-[#16a34a]" />
              <div className="w-1/4 h-full bg-[#e5e5d8]" />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-0.5">
              <span>Empty</span>
              <span>Low</span>
              <span className="text-emerald-400 font-bold">Healthy (82%)</span>
              <span>Full</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] pt-1">
            <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block text-[9px]">Marketing</span>
              <span className="font-bold text-emerald-400">₹0.82/msg</span>
            </div>
            <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block text-[9px]">Service 24h</span>
              <span className="font-bold text-sky-400">₹0.35/msg</span>
            </div>
            <div className="p-1.5 rounded bg-white/[0.02] border border-white/5">
              <span className="text-zinc-400 block text-[9px]">Auto-Reload</span>
              <span className="font-bold text-zinc-300">₹500 buffer</span>
            </div>
          </div>
        </div>
      )}
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

// 11: Executive Dashboard & Analytics Simulator
export function DashboardPreview() {
  const [activeRange, setActiveRange] = useState('This Month');

  const metrics = activeRange === 'This Month' ? [
    { label: 'Total Revenue', value: '₹1,50,000', change: '+14.2%', trend: 'up', subtext: 'vs last month' },
    { label: 'Active Leads', value: '24', change: '+6', trend: 'up', subtext: 'in active pipeline' },
    { label: 'Conversion Rate', value: '18.5%', change: '+2.4%', trend: 'up', subtext: 'target 15.0%' },
    { label: 'Avg. Response Time', value: '42s', change: '-8s', trend: 'up', subtext: 'instant AI triage' },
  ] : [
    { label: 'Total Revenue', value: '₹38,500', change: '+9.1%', trend: 'up', subtext: 'vs last week' },
    { label: 'Active Leads', value: '9', change: '+3', trend: 'up', subtext: 'in active pipeline' },
    { label: 'Conversion Rate', value: '19.2%', change: '+1.8%', trend: 'up', subtext: 'target 15.0%' },
    { label: 'Avg. Response Time', value: '39s', change: '-4s', trend: 'up', subtext: 'instant AI triage' },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#070012] p-4 text-xs font-sans select-none shadow-2xl space-y-3.5">
      {/* Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WhatsApp Meta API: Connected</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/10 text-zinc-300 text-[10px] font-mono">
            <Coins className="w-3 h-3 text-amber-400" />
            <span>Fuel: 82%</span>
          </div>
        </div>

        {/* Range Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
          {['This Week', 'This Month'].map((r) => (
            <button
              key={r}
              onClick={(e) => {
                e.preventDefault();
                setActiveRange(r);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeRange === r
                  ? 'bg-violet-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Bento Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-2.5 rounded-xl border border-purple-500/20 bg-white/[0.02] hover:border-purple-500/40 transition-all flex flex-col justify-between"
          >
            <span className="text-[10px] text-zinc-400 font-medium block truncate">
              {m.label}
            </span>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-white font-mono">
                {m.value}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                {m.change}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 truncate block">
              {m.subtext}
            </span>
          </div>
        ))}
      </div>

      {/* Mini Comparative Revenue Chart */}
      <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">Monthly Revenue Trajectory</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-0.5 bg-[#39ff7e] rounded" /> 2026 (Neon)
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-0.5 bg-[#b794f4] rounded" /> 2025 (Prior)
            </span>
          </div>
        </div>

        {/* SVG Chart Graphic */}
        <div className="h-16 w-full relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 400 60" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="15" x2="400" y2="15" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            {/* 2025 Line (Purple) */}
            <path
              d="M0,48 Q80,45 160,38 T320,32 T400,28"
              fill="none"
              stroke="#b794f4"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.7"
            />
            {/* 2026 Line (Neon Green) */}
            <path
              d="M0,45 Q80,35 160,22 T320,14 T400,8"
              fill="none"
              stroke="#39ff7e"
              strokeWidth="2.5"
            />
            {/* Glowing peak dot */}
            <circle cx="400" cy="8" r="3" fill="#39ff7e" className="animate-ping" opacity="0.6" />
            <circle cx="400" cy="8" r="2.5" fill="#39ff7e" />
          </svg>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-0.5 border-t border-white/5">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>

      {/* AI Insights & Live Activity Snippet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {/* AI Insight Card */}
        <div className="p-2.5 rounded-lg bg-violet-950/20 border border-violet-500/20 flex items-start gap-2">
          <span className="p-1 rounded bg-red-500/20 text-red-400 shrink-0 mt-0.5 text-xs">
            🔥
          </span>
          <div>
            <span className="font-semibold text-white text-[11px] block">
              3 High-Intent Hot Leads
            </span>
            <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
              AI scored &gt; 85. Ready for immediate closing call.
            </span>
          </div>
        </div>

        {/* Activity Card */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
          <div>
            <span className="font-semibold text-zinc-200 text-[11px] block truncate">
              WhatsApp Inbound: Priya S.
            </span>
            <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
              Qualified for 3BHK • AI answered in 38s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 12: Subscription & Pricing Tiers Simulator Preview
export function PricingPreview() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [dynamicPlans, setDynamicPlans] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getPricing()
      .then((res) => {
        if (isMounted && res && res.plans && Array.isArray(res.plans) && res.plans.length > 0) {
          setDynamicPlans(res.plans);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const defaultPlans = [
    {
      key: 'free',
      name: 'Free Starter',
      price: '₹0',
      period: '/month',
      badge: 'Free Tier',
      credits: '20,000',
      wcc: '₹50 (~45 msgs)',
      automations: '2 Active Wires',
      storage: '100 MB Brain',
      cta: 'Choose this plan',
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '₹199',
      period: '/month',
      badge: 'Popular',
      credits: '250,000',
      wcc: '₹500 (~450 msgs)',
      automations: '50 Active Wires',
      storage: '5 GB Brain',
      cta: 'Choose this plan',
      featured: true,
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: "Let's Talk",
      period: '',
      badge: 'Custom Scale',
      credits: '500,000+',
      wcc: 'Custom Wallet',
      automations: 'Unlimited Wires',
      storage: '100 GB Brain',
      cta: 'Schedule a call',
    },
  ];

  const plans = dynamicPlans && dynamicPlans.length > 0
    ? dynamicPlans
        .filter((p) => p.key !== 'solo')
        .map((p) => {
          const rawPrice = p.monthly_price;
          const displayPrice =
            p.key === 'free' || rawPrice === 0
              ? '₹0'
              : p.key === 'enterprise'
              ? "Let's Talk"
              : `₹${Number(rawPrice).toLocaleString('en-IN')}`;

          const creditsVal = p.included_ai_credits || p.credits;
          const creditsStr = creditsVal ? Number(creditsVal).toLocaleString('en-IN') : '20,000';
          const wccVal = Number(p.included_wcc_wallet || 0);
          const wccStr = wccVal > 0 ? `₹${wccVal} (~${Math.round(wccVal / 1.1)} msgs)` : '₹0';
          const autoStr = p.automation_limit === -1 ? 'Unlimited Wires' : `${p.automation_limit} Active Wires`;
          const storageMb = Number(p.storage_limit_mb || 100);
          const storageStr = storageMb >= 1024 ? `${storageMb / 1024} GB Brain` : `${storageMb} MB Brain`;

          return {
            key: p.key,
            name: p.display_name || p.name,
            price: displayPrice,
            period: p.key === 'enterprise' ? '' : '/month',
            badge: p.key === 'free' ? 'Free Tier' : p.is_featured || p.key === 'pro' ? 'Popular' : 'Custom Scale',
            credits: creditsStr,
            wcc: wccStr,
            automations: autoStr,
            storage: storageStr,
            cta: p.key === 'enterprise' ? 'Schedule a call' : 'Choose this plan',
            featured: p.is_featured || p.key === 'pro',
          };
        })
    : defaultPlans;

  return (
    <div className="rounded-xl border border-white/10 bg-[#070012] p-4 text-xs font-sans select-none shadow-2xl space-y-3.5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Interactive Tier Simulator</span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-zinc-300 text-[10px] font-mono">
          Billing: Monthly Cadence
        </div>
      </div>

      {/* 3 Interactive Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.key;
          return (
            <div
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                p.featured
                  ? isSelected
                    ? 'border-violet-500 bg-violet-950/30 ring-1 ring-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                    : 'border-violet-500/40 bg-violet-950/10 hover:border-violet-500/60'
                  : isSelected
                  ? 'border-white/40 bg-white/5 ring-1 ring-white/20'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold text-white text-[12px] truncate">{p.name}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                      p.featured
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                        : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-base font-bold text-white font-mono">{p.price}</span>
                  {p.period && <span className="text-[10px] text-zinc-400">{p.period}</span>}
                </div>

                <div className="space-y-1 text-[10px] pt-2 border-t border-white/10 font-mono text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-violet-400 shrink-0" />
                    <span>{p.credits} Credits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{p.wcc}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{p.automations}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{p.storage}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5">
                <div
                  className={`w-full py-1 text-center rounded-lg text-[10px] font-semibold transition-colors ${
                    p.featured
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm'
                      : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                  }`}
                >
                  {p.cta}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Selected Plan Entitlement Telemetry */}
      <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Provisioning: Instant via Razorpay</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-300">
          <span>Top-ups:</span>
          <span
            className={
              selectedPlan === 'free' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
            }
          >
            {selectedPlan === 'free' ? 'Upgrade required' : 'Instant Top-ups Allowed'}
          </span>
        </div>
      </div>
    </div>
  );
}

// 13: GST Compliance & Tax Invoice Preview Simulator
export function GSTInvoicePreview() {
  const [supplyType, setSupplyType] = useState('intra');
  const baseAmount = 199.0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (supplyType === 'intra') {
    cgst = Number((baseAmount * 0.09).toFixed(2));
    sgst = Number((baseAmount * 0.09).toFixed(2));
    igst = 0;
  } else if (supplyType === 'inter') {
    cgst = 0;
    sgst = 0;
    igst = Number((baseAmount * 0.18).toFixed(2));
  } else {
    cgst = 0;
    sgst = 0;
    igst = 0;
  }

  const totalTax = Number((cgst + sgst + igst).toFixed(2));
  const totalAmount = Number((baseAmount + totalTax).toFixed(2));

  return (
    <div className="rounded-xl border border-white/10 bg-[#070012] p-4 text-xs font-sans select-none shadow-2xl space-y-3.5">
      {/* Top Header with Location Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>GST Tax Breakdown &amp; Invoice Preview</span>
        </div>

        {/* Supply Selector Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setSupplyType('intra')}
            className={`px-2 py-0.5 rounded transition-colors ${
              supplyType === 'intra'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tamil Nadu (Intra)
          </button>
          <button
            type="button"
            onClick={() => setSupplyType('inter')}
            className={`px-2 py-0.5 rounded transition-colors ${
              supplyType === 'inter'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inter-State (IGST)
          </button>
          <button
            type="button"
            onClick={() => setSupplyType('export')}
            className={`px-2 py-0.5 rounded transition-colors ${
              supplyType === 'export'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Export (0%)
          </button>
        </div>
      </div>

      {/* Invoice Card Mockup */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
        {/* Invoice Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-[12px] font-mono">AUR/2026-27/000042</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono">
                Tax Invoice
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Supplier: Orbion Agents Pvt Ltd (Chennai, TN)</span>
          </div>
          <div className="text-right font-mono text-[10px]">
            <span className="text-zinc-400 block">Supplier GSTIN:</span>
            <span className="text-zinc-200 font-semibold">33ABCDE1234F1Z5</span>
          </div>
        </div>

        {/* Customer & Place of Supply */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-2 rounded-lg bg-black/40 border border-white/5">
          <div>
            <span className="text-zinc-500 block uppercase text-[9px]">Customer Business</span>
            <span className="text-white font-bold block truncate">Acme Tech Solutions</span>
            <span className="text-zinc-400 text-[9px]">
              GSTIN: {supplyType === 'intra' ? '33XYZAB5678C1Z2' : supplyType === 'inter' ? '29XYZAB5678C1Z2' : 'N/A (Export)'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 block uppercase text-[9px]">Place of Supply</span>
            <span className="text-emerald-400 font-bold block">
              {supplyType === 'intra' ? 'Tamil Nadu (Code 33)' : supplyType === 'inter' ? 'Karnataka (Code 29)' : 'Outside India'}
            </span>
            <span className="text-zinc-400 text-[9px]">ITC Eligible: {supplyType === 'export' ? 'No' : 'Yes (B2B)'}</span>
          </div>
        </div>

        {/* Itemized Calculation Breakdown */}
        <div className="space-y-1.5 font-mono text-[11px] pt-1">
          <div className="flex justify-between text-zinc-300">
            <span>Pro Plan Subscription (Taxable Base)</span>
            <span className="text-white font-semibold">₹{baseAmount.toFixed(2)}</span>
          </div>

          {supplyType === 'intra' ? (
            <>
              <div className="flex justify-between text-zinc-400 text-[10px] pl-2">
                <span>↳ CGST (9.0%)</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[10px] pl-2">
                <span>↳ SGST (9.0%)</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
            </>
          ) : supplyType === 'inter' ? (
            <div className="flex justify-between text-zinc-400 text-[10px] pl-2">
              <span>↳ IGST (18.0%)</span>
              <span>₹{igst.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-zinc-400 text-[10px] pl-2">
              <span>↳ Export GST (Zero-rated)</span>
              <span>₹0.00</span>
            </div>
          )}

          <div className="flex justify-between text-white font-bold pt-2 border-t border-white/10 text-xs">
            <span>Total Payable Amount</span>
            <span className="text-emerald-400 font-mono text-sm">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Button: Download PDF Receipt */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
          <span className="text-zinc-400">PDF compiled with ReportLab Engine</span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-semibold cursor-pointer transition-colors">
            <Download className="w-3 h-3 text-violet-400" />
            <span>Download Invoice PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 13: System Diagnostics & Troubleshooting Preview
export function SystemDiagnosticsPreview() {
  const [activeTab, setActiveTab] = useState('meta'); // 'meta' | 'whatsapp' | 'twilio' | 'wallet'

  // Meta 24h Window state
  const [metaStatus, setMetaStatus] = useState('expired'); // 'healthy' | 'expired'
  const [templateSent, setTemplateSent] = useState(false);

  // Channel Connection status state
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState(null);

  // Twilio state
  const [twilioMode, setTwilioMode] = useState('trial'); // 'trial' | 'production'
  const [isDestinationVerified, setIsDestinationVerified] = useState(false);

  // Wallet / Handoff state
  const [walletBalance, setWalletBalance] = useState(0); // 0 or 450

  const handleCheckHealth = () => {
    setIsCheckingHealth(true);
    setHealthResult(null);
    setTimeout(() => {
      setIsCheckingHealth(false);
      setHealthResult({
        status: 'healthy',
        message: 'All systems active: Messages are flowing smoothly with your Omni-Inbox.',
      });
    }, 500);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#090A10] p-4 text-xs font-sans select-none shadow-inner space-y-3.5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="font-bold text-white text-sm">Channel &amp; Safeguards Console</span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          Automatic Protection
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('meta')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors font-medium ${
            activeTab === 'meta'
              ? 'bg-violet-600 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${metaStatus === 'healthy' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          24h Care Window
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors font-medium ${
            activeTab === 'whatsapp'
              ? 'bg-violet-600 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Channel Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('twilio')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors font-medium ${
            activeTab === 'twilio'
              ? 'bg-violet-600 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${twilioMode === 'production' || isDestinationVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Twilio Setup
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors font-medium ${
            activeTab === 'wallet'
              ? 'bg-violet-600 text-white font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${walletBalance > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Human Takeover
        </button>
      </div>

      {/* Tab 1: 24h Customer Care Window */}
      {activeTab === 'meta' && (
        <div className="space-y-3">
          {/* Sub-toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-zinc-400 text-[11px]">Customer Status:</span>
            <div className="inline-flex rounded bg-black/60 p-0.5 border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setMetaStatus('healthy');
                  setTemplateSent(false);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  metaStatus === 'healthy'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Messaged Today (&lt;24h)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMetaStatus('expired');
                  setTemplateSent(false);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  metaStatus === 'expired'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Inactive (&gt;24h)
              </button>
            </div>
          </div>

          {metaStatus === 'healthy' ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conversation Active
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 18h remaining to reply
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                The customer messaged recently. Your AI agent and human team can reply freely with messages, photos, and links.
              </p>
              <div className="p-2.5 rounded bg-black/40 border border-white/5 text-[11px] text-zinc-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Customer said:</span>
                  <span className="text-white">&ldquo;Can you share product pricing?&rdquo;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">AI Response:</span>
                  <span className="text-emerald-400 font-medium">Delivered to WhatsApp ✓</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  24-Hour Window Closed
                </span>
                <span className="text-[10px] text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Last message: 27 hours ago
                </span>
              </div>

              {/* User-friendly explanation */}
              <div className="p-2.5 rounded bg-black/60 border border-rose-500/20 text-[11px] text-rose-200/90 leading-relaxed">
                <strong className="block text-rose-300 font-semibold mb-0.5">Why messaging is paused:</strong>
                WhatsApp rules require an approved Reconnection Template to reach customers after 24 hours of inactivity. Orbion automatically pauses normal text to protect your WhatsApp business number from spam penalties.
              </div>

              {/* Resolution: 1-click reconnect */}
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-medium">Reconnect with 1-Click:</span>
                  <span className="text-violet-400 font-mono text-[10px]">Pre-Approved Template</span>
                </div>
                <p className="text-zinc-400 text-[10px] leading-relaxed">
                  Send a friendly pre-approved follow-up message. When the customer replies, your regular conversation window re-opens immediately:
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[10px] text-zinc-300 bg-black/40 px-2.5 py-1 rounded border border-white/5 truncate">
                    Template: <span className="text-emerald-400 font-semibold">Order Follow-up (Utility)</span>
                  </div>
                  {templateSent ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Reconnection Sent!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTemplateSent(true)}
                      className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[10px] transition-colors shrink-0"
                    >
                      Send Reconnect Message →
                    </button>
                  )}
                </div>
                {templateSent && (
                  <p className="text-emerald-300/90 text-[10px] pt-1">
                    ↳ As soon as the customer answers, normal AI chat resumes automatically.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Channel Connection & Sync */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-[11px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="text-white font-semibold block">WhatsApp Business Account</span>
                <span className="text-zinc-400 text-[10px]">Connected via 1-Click Meta Official Setup</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            </div>

            {/* What is automatically handled */}
            <div className="space-y-2">
              <span className="text-zinc-400 block text-[10px] font-medium uppercase tracking-wider">
                What Orbion Automatically Manages:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-zinc-300 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Inbound Messages</strong>
                    <span className="text-zinc-400">Routes straight to Omni-Inbox</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-zinc-300 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">AI Real-time Replies</strong>
                    <span className="text-zinc-400">Answers using company facts</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-zinc-300 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Delivery Receipts</strong>
                    <span className="text-zinc-400">Sent &amp; Read checkmarks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Channel Health */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-zinc-300 text-[11px]">Test Channel Synchronization:</span>
            <button
              type="button"
              onClick={handleCheckHealth}
              disabled={isCheckingHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[10px] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              {isCheckingHealth ? 'Checking...' : 'Check Connection Status'}
            </button>
          </div>

          {healthResult && (
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-[11px] space-y-1 text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connection Fully Active &amp; Verified
              </div>
              <p className="text-zinc-300 text-[10px]">
                Orbion keeps your WhatsApp channel synchronized in real-time. No manual server maintenance or complex setup required!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Twilio Gateway */}
      {activeTab === 'twilio' && (
        <div className="space-y-3">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-zinc-400 text-[11px]">Twilio Account Status:</span>
            <div className="inline-flex rounded bg-black/60 p-0.5 border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setTwilioMode('trial');
                  setIsDestinationVerified(false);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  twilioMode === 'trial'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Trial Mode (Testing)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwilioMode('production');
                  setIsDestinationVerified(true);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  twilioMode === 'production'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Live Production Mode
              </button>
            </div>
          </div>

          {twilioMode === 'trial' ? (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Twilio Trial: Number Verification Required
                  </span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Testing Mode
                  </span>
                </div>

                <div className="p-2.5 rounded bg-black/50 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  Twilio trial accounts can only send messages to phone numbers you add as a &ldquo;Verified Number&rdquo; in your Twilio account.
                </div>

                {/* Recipient verification toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                  <span className="text-zinc-300">Test Phone: +91 98765 43210</span>
                  <button
                    type="button"
                    onClick={() => setIsDestinationVerified(!isDestinationVerified)}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
                      isDestinationVerified
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {isDestinationVerified ? '✓ Verified in Twilio' : 'Simulate Verified Number'}
                  </button>
                </div>

                {isDestinationVerified ? (
                  <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Delivered successfully to verified test phone!
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-400 leading-relaxed space-y-1 pt-1">
                    <p className="text-zinc-300 font-medium">Simple steps to send:</p>
                    <p>1. In your Twilio Console, add your test phone under &ldquo;Verified Caller IDs&rdquo;.</p>
                    <p>2. Or add funds to your Twilio account to upgrade to Live mode and send to anyone worldwide.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Twilio Live Mode Active
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Global Delivery
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Live mode is active. You can send SMS and WhatsApp messages directly to any customer anywhere in the world without pre-registering their number.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: AI Credits & Auto Human Takeover */}
      {activeTab === 'wallet' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-zinc-400 text-[11px]">Credit Balance:</span>
            <div className="inline-flex rounded bg-black/60 p-0.5 border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => setWalletBalance(450)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  walletBalance === 450
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ₹450 (Healthy)
              </button>
              <button
                type="button"
                onClick={() => setWalletBalance(0)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  walletBalance === 0
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ₹0.00 (Zero Balance)
              </button>
            </div>
          </div>

          {walletBalance > 0 ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> AI Agent Responding Automatically
                </span>
                <span className="text-emerald-300 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                  Balance: ₹450.00
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Your AI agent is actively answering customer questions around the clock using facts from your uploaded documents.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Automatic Human Takeover Active
                </span>
                <span className="text-rose-300 text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium">
                  Balance: ₹0.00
                </span>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-amber-500/20 text-[11px] text-zinc-300 leading-relaxed">
                <strong className="text-amber-300 block mb-0.5">Orbion Safety Feature:</strong>
                When your AI balance reaches zero, we never drop or abandon your customers! Incoming conversations are smoothly handed over to your human team in the Omni-Inbox.
              </div>
              <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                <span>Top up anytime in Settings &gt; Wallet</span>
                <span className="text-violet-400 font-semibold cursor-pointer hover:underline">
                  Add Balance →
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

