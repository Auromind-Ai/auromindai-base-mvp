'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Brain,
  Cpu,
  Bot,
  Workflow,
  Shield,
  ShieldCheck,
  Users,
  Target,
  Send,
  Database,
  FileText,
  Globe,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ArrowDown,
  CheckCircle2,
  Zap,
  Sliders,
  Smartphone,
  MessageCircle,
  Activity,
  Flame,
  Headphones,
  Check,
  Lock,
  ExternalLink,
  Calendar,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  CheckCheck,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   6 REALISTIC PRODUCT UI MOCKUPS FOR SECTION 5 ZIG-ZAG SHOWCASE
   ───────────────────────────────────────────────────────────────────────────── */

function SalesQualificationVisual() {
  return (
    <div className="rounded-2xl border border-[#222e35] bg-[#0b141a] shadow-2xl overflow-hidden font-sans text-xs">
      {/* WhatsApp Header */}
      <div className="bg-[#202c33] border-b border-[#111b21] px-3.5 py-2.5 flex items-center justify-between text-[#e9edef]">
        <div className="flex items-center gap-2.5">
          <ChevronLeft className="w-4 h-4 text-[#aebac1] cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-inner">
            JD
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[#e9edef] text-xs">John Davis</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
            </div>
            <span className="text-[10px] text-[#25d366] block leading-none mt-0.5">online</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5 text-[#aebac1]">
          <Video className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
          <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* WhatsApp Chat Wallpaper & Stream */}
      <div className="p-3.5 space-y-3 bg-[#0b141a]">
        {/* Encryption notice pill */}
        <div className="bg-[#182229] text-[#ffd279] text-[10px] px-3 py-1 rounded-md text-center mx-auto max-w-[85%] border border-[#222e35]/50 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-[#ffd279] shrink-0" />
          <span>Messages are end-to-end encrypted. No one outside can read them.</span>
        </div>

        {/* Date divider */}
        <div className="flex justify-center">
          <span className="bg-[#182229] text-[#8696a0] text-[10px] uppercase font-medium px-2.5 py-0.5 rounded shadow-sm">
            Today
          </span>
        </div>

        {/* Inbound Customer Message */}
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] text-[#e9edef] p-2.5 shadow-sm border border-white/[0.03] space-y-1">
            <p className="leading-relaxed text-xs">
              Hi! We need an AI sales assistant for our 35-person sales team to qualify inbound leads. What is your pricing and rollout time?
            </p>
            <div className="flex justify-end text-[10px] text-[#8696a0]">10:24 AM</div>
          </div>
        </div>

        {/* Outbound AI Message */}
        <div className="flex flex-col items-end">
          <div className="max-w-[88%] rounded-2xl rounded-tr-none bg-[#005c4b] text-[#e9edef] p-2.5 shadow-sm border border-emerald-500/10 space-y-1">
            <p className="leading-relaxed text-xs">
              Hello John! For 35 sales agents, Orbion deploys in under 24 hours with custom CRM sync and unlimited WhatsApp broadcasts. What is your planned budget and deployment timeline?
            </p>
            <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
              <span>10:24 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>

        {/* Inbound Customer Message */}
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] text-[#e9edef] p-2.5 shadow-sm border border-white/[0.03] space-y-1">
            <p className="leading-relaxed text-xs">
              We want to deploy this month. Our budget is approx $18,000.
            </p>
            <div className="flex justify-end text-[10px] text-[#8696a0]">10:25 AM</div>
          </div>
        </div>

        {/* Outbound AI Message with WhatsApp Native Interactive CTA Button */}
        <div className="flex flex-col items-end">
          <div className="max-w-[88%] rounded-2xl rounded-tr-none bg-[#005c4b] text-[#e9edef] shadow-sm border border-emerald-500/10 overflow-hidden">
            <div className="p-2.5 space-y-1">
              <p className="leading-relaxed text-xs">
                Understood! Based on your 35-seat requirement and timeline, you qualify for our Senior Architecture Program. Book a 15-minute slot directly below:
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
                <span>10:25 AM</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              </div>
            </div>
            {/* Real WhatsApp Interactive Action Button */}
            <div className="border-t border-[#004d3e] bg-[#005243] hover:bg-[#004739] cursor-pointer py-2 px-3 text-center flex items-center justify-center gap-2 text-[#53bdeb] font-medium transition-colors">
              <Calendar className="w-3.5 h-3.5 text-[#53bdeb]" />
              <span>Book 15-Min Demo with Sales Lead</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Discreet CRM Sync Footer */}
      <div className="px-3.5 py-2 bg-[#111b21] border-t border-[#202c33] flex items-center justify-between text-[11px] text-[#8696a0]">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#25d366]" />
          <span>Auto-Qualified: 🔥 Hot Lead ($18k • 96 pts)</span>
        </div>
        <span className="text-[10px] text-zinc-400">Synced to CRM</span>
      </div>
    </div>
  );
}

function CustomerSupportVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#000000] shadow-2xl overflow-hidden font-sans text-xs">
      {/* Instagram DM Header */}
      <div className="bg-[#000000] border-b border-[#262626] px-4 py-2.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <ChevronLeft className="w-5 h-5 text-white cursor-pointer" />
          {/* Instagram Story Gradient Ring Avatar */}
          <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
              OA
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white text-xs">orbion.official</span>
              <span className="w-3 h-3 rounded-full bg-[#0095f6] text-white flex items-center justify-center text-[7px] font-bold" title="Verified">
                ✓
              </span>
            </div>
            <span className="text-[10px] text-[#a8a8a8] block leading-none mt-0.5">Active now</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5 text-white">
          <Phone className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
          <Video className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
      </div>

      {/* Instagram DM Stream */}
      <div className="p-4 space-y-3 bg-[#000000]">
        {/* Instagram Timestamp */}
        <div className="text-center">
          <span className="text-[10px] text-[#737373] font-medium">2:14 PM</span>
        </div>

        {/* Customer Inbound Bubble (Grey #262626) */}
        <div className="flex flex-col items-start">
          <div className="max-w-[80%] rounded-[20px] rounded-bl-sm bg-[#262626] text-white px-3.5 py-2.5 shadow-sm text-xs leading-relaxed">
            Can I return my order if the packaging is already opened? My order number is #ORB-8821.
          </div>
        </div>

        {/* Outbound AI Bubble with signature Instagram Sunset Gradient */}
        <div className="flex flex-col items-end">
          <div className="max-w-[84%] rounded-[20px] rounded-br-sm bg-gradient-to-tr from-[#7000ff] via-[#d62976] to-[#fa2e7f] text-white p-3 shadow-md space-y-2 text-xs leading-relaxed">
            <p>
              Yes! Under Section 3.2 of our policy, opened items qualify for a full refund within 30 days if all original accessories are included. Zero restocking fees apply.
            </p>
            {/* Clean citation sticker */}
            <div className="p-2 rounded-xl bg-black/35 backdrop-blur-sm border border-white/15 text-[10px] text-white/95 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Grounded in Return_Policy_2026.pdf (Page 4)</span>
            </div>
            <p className="text-[11px] text-white/90">
              Would you like me to generate your prepaid return shipping label now?
            </p>
          </div>
        </div>

        {/* Instagram Interactive Action Pills */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
          <button className="px-3 py-1.5 rounded-full bg-[#1a1a1a] hover:bg-[#262626] text-white text-[11px] font-medium border border-[#363636] transition-colors">
            Generate Return Label
          </button>
          <button className="px-3 py-1.5 rounded-full bg-[#1a1a1a] hover:bg-[#262626] text-zinc-300 text-[11px] font-medium border border-[#363636] transition-colors">
            Transfer to Human Rep
          </button>
        </div>

        {/* Instagram "Seen" receipt */}
        <div className="flex justify-end text-[10px] text-[#737373] pr-1">
          Seen just now
        </div>
      </div>

      {/* Instagram Message Bar */}
      <div className="px-3 py-2 border-t border-[#262626] bg-[#000000] flex items-center gap-2">
        <div className="flex-1 bg-[#262626] rounded-full px-3.5 py-1.5 text-zinc-400 text-[11px] flex items-center justify-between">
          <span>Message...</span>
        </div>
        <Send className="w-4 h-4 text-[#0095f6] cursor-pointer hover:opacity-80 transition-opacity" />
      </div>
    </div>
  );
}

function WhatsAppAutomationVisual() {
  return (
    <div className="rounded-2xl border border-[#222e35] bg-[#0b141a] shadow-2xl overflow-hidden font-sans text-xs">
      {/* WhatsApp Official Header */}
      <div className="bg-[#202c33] border-b border-[#111b21] px-3.5 py-2.5 flex items-center justify-between text-[#e9edef]">
        <div className="flex items-center gap-2.5">
          <ChevronLeft className="w-4 h-4 text-[#aebac1] cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center font-bold text-white text-xs shadow-inner">
            OA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[#e9edef] text-xs">Orbion Apparel</span>
              <span className="w-3.5 h-3.5 rounded-full bg-[#25d366] text-black flex items-center justify-center text-[8px] font-bold" title="Meta Verified">
                ✓
              </span>
            </div>
            <span className="text-[10px] text-[#8696a0] block leading-none mt-0.5">Official Business Account</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5 text-[#aebac1]">
          <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* WhatsApp Rich Template Message & Stream */}
      <div className="p-3.5 space-y-3 bg-[#0b141a]">
        {/* Template Card */}
        <div className="flex flex-col items-start w-full">
          <div className="w-full sm:max-w-[90%] rounded-2xl rounded-tl-none bg-[#202c33] text-[#e9edef] overflow-hidden shadow-lg border border-white/[0.04]">
            {/* Header Media Banner (clean dark luxury card) */}
            <div className="h-20 bg-gradient-to-r from-zinc-900 via-neutral-900 to-stone-900 border-b border-white/10 p-3 flex flex-col justify-end relative">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[#25d366] text-[10px] font-medium border border-white/10">
                VIP Early Access
              </div>
              <span className="font-bold text-white text-xs sm:text-sm">Summer 2026 Collection ☀️</span>
              <span className="text-[10px] text-zinc-300">Exclusive 25% launch voucher inside</span>
            </div>

            {/* Message Body */}
            <div className="p-3 space-y-1.5">
              <p className="leading-relaxed text-xs text-[#e9edef]">
                Hello Priya! Your VIP access code <span className="text-[#25d366] font-bold bg-[#005c4b]/30 px-1 py-0.5 rounded border border-[#005c4b]">[VIP-SUMMER25]</span> is active. Tap below to browse or track your orders:
              </p>
              <div className="flex justify-end text-[10px] text-[#8696a0]">11:30 AM</div>
            </div>

            {/* Interactive WhatsApp Quick Reply Buttons */}
            <div className="border-t border-[#2a3942] divide-y divide-[#2a3942] bg-[#182229]">
              <div className="w-full py-2.5 px-3 text-center text-xs font-medium text-[#53bdeb] hover:bg-[#202c33] cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <span>🛍️ Browse Summer Catalog</span>
              </div>
              <div className="w-full py-2.5 px-3 text-center text-xs font-medium text-[#53bdeb] hover:bg-[#202c33] cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <span>📍 Locate Nearest Boutique</span>
              </div>
              <div className="w-full py-2.5 px-3 text-center text-xs font-medium text-[#53bdeb] hover:bg-[#202c33] cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <span>📦 Track Existing Shipment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Tap Outgoing Message */}
        <div className="flex flex-col items-end">
          <div className="rounded-2xl rounded-tr-none bg-[#005c4b] text-[#e9edef] px-3.5 py-2 shadow-sm border border-emerald-500/10 space-y-1">
            <p className="text-xs">🛍️ Browse Summer Catalog</p>
            <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
              <span>11:30 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>

        {/* Instant Automated Product Card Response */}
        <div className="flex flex-col items-start w-full">
          <div className="w-full sm:max-w-[85%] rounded-2xl rounded-tl-none bg-[#202c33] text-[#e9edef] p-3 shadow-sm border border-white/[0.03] space-y-2">
            <p className="text-xs">
              Here is our top trending drop selected for you:
            </p>
            {/* Product Item Card */}
            <div className="bg-[#182229] rounded-xl p-2.5 border border-[#2a3942] flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center text-xl shrink-0">
                👗
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-xs truncate">Linen Summer Blazer</div>
                <div className="text-[11px] text-[#25d366] font-bold">₹3,499 <span className="text-zinc-400 line-through font-normal text-[10px]">₹4,699</span></div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-[#005c4b] text-[#e9edef] text-[10px] font-medium border border-[#00a884]/40 hover:bg-[#004d3e] transition-colors shrink-0">
                Quick Buy
              </button>
            </div>
            <div className="flex justify-end text-[10px] text-[#8696a0]">11:31 AM</div>
          </div>
        </div>
      </div>

      {/* Meta API Status Footer */}
      <div className="px-3.5 py-2 bg-[#111b21] border-t border-[#202c33] flex items-center justify-between text-[11px] text-[#8696a0]">
        <span className="text-emerald-400 font-medium">⚡ 98% Open Rate • Meta Cloud API</span>
        <span className="text-[10px] text-zinc-400">Automated Dispatch</span>
      </div>
    </div>
  );
}

function KnowledgeBaseVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0f172a] shadow-2xl overflow-hidden font-sans text-xs">
      {/* Knowledge Assistant Header */}
      <div className="bg-[#1e293b] border-b border-slate-700/60 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-xs">Enterprise Knowledge Copilot</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">pgvector RAG</span>
            </div>
            <span className="text-[10px] text-slate-400 block leading-none mt-0.5">Strict Grounding • Zero Guesswork</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Synced &amp; Verified</span>
        </div>
      </div>

      {/* Query & Verified Response Stream */}
      <div className="p-4 space-y-3 bg-[#0f172a]">
        {/* User Inbound Question */}
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#1e293b] text-slate-200 p-3 shadow-sm border border-slate-700/50 space-y-1">
            <p className="text-xs leading-relaxed">
              What is our guaranteed SLA for Tier-1 system outages and how are downtime credits calculated?
            </p>
            <div className="flex justify-end text-[10px] text-slate-400">11:42 AM</div>
          </div>
        </div>

        {/* AI Grounded Answer with Document Citation */}
        <div className="flex flex-col items-end">
          <div className="max-w-[90%] rounded-2xl rounded-tr-none bg-indigo-950/40 text-slate-100 p-3.5 shadow-sm border border-indigo-500/30 space-y-2.5">
            <p className="text-xs leading-relaxed">
              Under <strong>Section 8.1 of the Enterprise Master Agreement</strong>, Tier-1 outages guarantee an initial response within <strong>15 minutes</strong> and <strong>99.99% monthly availability</strong>. If monthly downtime exceeds 0.01%, credits are issued at <strong>10% of monthly fee per hour of outage</strong>.
            </p>

            {/* Authentic Document Citation Card */}
            <div className="p-2.5 rounded-xl bg-[#0b1120] border border-indigo-400/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold text-white">Enterprise_SLA_2026.pdf</div>
                  <div className="text-[9px] text-slate-400">Page 14 • Cosine Similarity: 0.96</div>
                </div>
              </div>
              <span className="text-[9px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">
                Strict Citation
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> PII Redacted
              </span>
              <span>11:42 AM</span>
            </div>
          </div>
        </div>

        {/* Interactive Document Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-medium border border-indigo-500/30 flex items-center gap-1.5 transition-colors">
            <FileText className="w-3 h-3 text-indigo-400" />
            <span>Download SLA PDF</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium border border-white/10 transition-colors">
            Ask Follow-up
          </button>
        </div>
      </div>

      {/* Latency & Grounding Footer */}
      <div className="px-4 py-2 bg-[#0b1120] border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Embeddings: text-embedding-3-large</span>
        <span className="text-indigo-300">Latency: 142ms • Zero Hallucination</span>
      </div>
    </div>
  );
}

function LeadManagementVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0c1015] shadow-2xl overflow-hidden font-sans text-xs">
      {/* CRM Sync Header */}
      <div className="bg-[#161b22] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-xs">AI Lead Intelligence &amp; CRM Sync</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Live Extraction</span>
            </div>
            <span className="text-[10px] text-zinc-400 block leading-none mt-0.5">Unstructured WhatsApp &rarr; Structured CRM</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
          100% Fidelity
        </span>
      </div>

      {/* Real-World Flow: WhatsApp Message -> CRM Record */}
      <div className="p-3.5 space-y-2.5 bg-[#0c1015]">
        {/* Step 1: Real WhatsApp Snippet */}
        <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222e35] space-y-2">
          <div className="flex items-center justify-between text-[10px] text-[#8696a0]">
            <span className="flex items-center gap-1 text-[#25d366] font-medium">
              <Smartphone className="w-3 h-3" /> Inbound WhatsApp Lead
            </span>
            <span>Today, 10:18 AM</span>
          </div>
          <div className="p-2.5 rounded-xl rounded-tl-none bg-[#202c33] text-[#e9edef] text-xs leading-relaxed">
            &quot;Hi, I&apos;m Vikram Patel from Skyline Logistics. We need 20 vehicle GPS tracking units next week. Budget is around ₹1,50,000. My email is vikram@skylinelog.com&quot;
          </div>
        </div>

        {/* Sync Transition Indicator */}
        <div className="flex items-center justify-center gap-2 py-0.5 text-[10px] text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Extracted Entities &amp; Qualified Automatically</span>
        </div>

        {/* Step 2: Structured CRM Record Card (HubSpot / Salesforce Dark Style) */}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-zinc-700/60 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                VP
              </div>
              <div>
                <span className="font-bold text-white text-xs block">Vikram Patel</span>
                <span className="text-[10px] text-zinc-400 font-normal">Director • Skyline Logistics</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              🔥 HOT LEAD (95 pts)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-[#0d1117] border border-zinc-800">
              <span className="text-zinc-500 block text-[9px]">Deal Value</span>
              <span className="font-bold text-emerald-400 text-xs">₹1,50,000</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0d1117] border border-zinc-800">
              <span className="text-zinc-500 block text-[9px]">Pipeline Stage</span>
              <span className="font-medium text-amber-300">Qualified Lead</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0d1117] border border-zinc-800">
              <span className="text-zinc-500 block text-[9px]">Work Email</span>
              <span className="font-medium text-zinc-200 truncate block">vikram@skylinelog.com</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0d1117] border border-zinc-800">
              <span className="text-zinc-500 block text-[9px]">Requirement</span>
              <span className="font-medium text-zinc-200 truncate block">20x GPS Trackers</span>
            </div>
          </div>

          <div className="w-full py-1.5 px-3 rounded-lg bg-[#0d1117] border border-zinc-800 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">Assigned: <strong className="text-zinc-200">Rohit (Senior AE)</strong></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Synced to CRM &amp; HubSpot
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowAutomationVisual() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0d1117] shadow-2xl overflow-hidden font-sans text-xs">
      {/* Automation Header */}
      <div className="bg-[#161b22] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between text-zinc-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-xs">Automation Wire Canvas</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Visual Graph</span>
            </div>
            <span className="text-[10px] text-zinc-400 block leading-none mt-0.5">Event-driven Webhooks &amp; Orchestration</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
          ⚡ 124ms SLA
        </span>
      </div>

      {/* Visual Node Flow Canvas */}
      <div className="p-4 space-y-2 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:16px_16px] bg-[#0d1117]">
        {/* Node 1: WhatsApp Inbound Trigger */}
        <div className="p-2.5 rounded-xl bg-[#161b22] border border-emerald-500/40 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">Trigger: Inbound WhatsApp Message</span>
              <span className="text-[10px] text-zinc-400">Condition: &quot;Track Order #ORB-8821&quot;</span>
            </div>
          </div>
          <span className="text-[9px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Webhook Event
          </span>
        </div>

        {/* Wire connector */}
        <div className="flex justify-center -my-1">
          <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-400 to-indigo-400" />
        </div>

        {/* Node 2: AI Parser */}
        <div className="p-2.5 rounded-xl bg-[#161b22] border border-indigo-500/40 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">Orbion AI: Intent &amp; Entity Parser</span>
              <span className="text-[10px] text-zinc-400">Parsed Order ID: #ORB-8821 (Confidence: 0.99)</span>
            </div>
          </div>
          <span className="text-[9px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            LLM 42ms
          </span>
        </div>

        {/* Wire connector */}
        <div className="flex justify-center -my-1">
          <div className="w-0.5 h-3 bg-gradient-to-b from-indigo-400 to-cyan-400" />
        </div>

        {/* Node 3: Shopify / ERP API Action */}
        <div className="p-2.5 rounded-xl bg-[#161b22] border border-cyan-500/40 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">API Action: Query Shopify Store</span>
              <span className="text-[10px] text-zinc-400">GET /orders/8821 → Status: &quot;Out for Delivery&quot;</span>
            </div>
          </div>
          <span className="text-[9px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            HTTP 200 OK
          </span>
        </div>

        {/* Wire connector */}
        <div className="flex justify-center -my-1">
          <div className="w-0.5 h-3 bg-gradient-to-b from-cyan-400 to-purple-400" />
        </div>

        {/* Branching Parallel Dispatch */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-[#161b22] border border-emerald-500/40 space-y-1">
            <span className="text-[9px] text-emerald-400 block font-bold">Branch A: WhatsApp Reply</span>
            <span className="text-[11px] text-zinc-200 block leading-tight">Dispatched live courier tracking link</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#161b22] border border-purple-500/40 space-y-1">
            <span className="text-[9px] text-purple-400 block font-bold">Branch B: Slack Alert</span>
            <span className="text-[11px] text-zinc-200 block leading-tight">Notified VIP Account Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntroductionDetailView({ article, prevArticle, nextArticle }) {
  const [activeStage, setActiveStage] = useState(0);

  // Runtime Pipeline Stages for Section 4
  const RUNTIME_STAGES = [
    {
      id: 'step-1',
      number: '01',
      title: 'Customer Message',
      subtitle: 'Customer Reaches Out',
      icon: MessageCircle,
      color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30',
      badge: 'Inbound Request',
      description:
        'A customer reaches out with a question, product inquiry, or support request through WhatsApp, Instagram Direct, Twilio SMS, or your website chat widget.',
      highlights: [
        'Connects seamlessly to WhatsApp, Instagram & Webchat',
        'Captures customer inquiries 24/7 without delays',
        'Maintains full conversation history across channels',
        'Routes new and returning customers automatically',
      ],
    },
    {
      id: 'step-2',
      number: '02',
      title: 'AI Understands',
      subtitle: 'Detects Intent & Urgency',
      icon: Cpu,
      color: 'from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30',
      badge: 'Understanding',
      description:
        'The AI reads the message, detects what the customer needs, recognizes their language and sentiment, and identifies key information like budget, timeline, or product preferences.',
      highlights: [
        'Understands natural language and conversational intent',
        'Detects customer urgency and purchase readiness',
        'Extracts contact details, budget, and requirements',
        'Identifies lead qualification tier (Hot, Warm, or Cold)',
      ],
    },
    {
      id: 'step-3',
      number: '03',
      title: 'Knowledge / Tools',
      subtitle: 'References Verified Facts',
      icon: Brain,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      badge: 'Knowledge Grounding',
      description:
        'The AI checks your uploaded company documents, catalogs, pricing sheets, and website FAQs to retrieve accurate, verified facts — ensuring dependable answers with zero guesswork.',
      highlights: [
        'Grounds responses strictly in your company documents',
        'Pulls real-time order, account, or calendar details',
        'Eliminates guesswork with verified source citations',
        'Keeps product information and pricing always up to date',
      ],
    },
    {
      id: 'step-4',
      number: '04',
      title: 'Agent Decides',
      subtitle: 'Chooses Best Course of Action',
      icon: Workflow,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      badge: 'Smart Reasoning',
      description:
        'Guided by your brand persona and business workflow rules, the agent formulates a verified answer or determines whether automated steps or team review is required.',
      highlights: [
        'Follows your custom brand persona and tone of voice',
        'Applies your business rules and workflow logic',
        'Protects sensitive customer information automatically',
        'Knows when to reply autonomously vs alert your team',
      ],
    },
    {
      id: 'step-5',
      number: '05',
      title: 'Action / Human',
      subtitle: 'Delivers Resolution or Handoff',
      icon: Send,
      color: 'from-rose-500/20 to-pink-500/20 text-pink-400 border-pink-500/30',
      badge: 'Resolution',
      description:
        'Delivers an instant, helpful response to the customer, records the lead in your CRM, triggers connected business tools, or smoothly transfers to a human team member.',
      highlights: [
        'Instant multi-channel reply delivered to the customer',
        'Captures qualified lead attributes directly in your CRM',
        'Triggers connected business actions or notifications',
        'Seamless 1-click takeover for human specialists',
      ],
    },
  ];

  // What You Can Build for Section 3 (Outcomes & Blueprints)
  const USE_CASES = [
    {
      title: 'Sales Qualification',
      category: 'Revenue Operations',
      icon: Target,
      color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
      outcomeMetric: '3x Faster Inbound Triage',
      outcomeSub: 'Zero response lag for inbound high-ticket buyers',
      description:
        'Capture leads 24/7 across WhatsApp and webchat. The agent interrogates buyer budget, timeline, and company size, auto-scores the lead as Hot/Warm/Cold, and books a calendar meeting with your sales executive.',
      bulletPoints: [
        'Inbounds qualified in under 30 seconds with zero wait times',
        'Auto-scores buyer into Hot (80+), Warm (50+), or Cold (<50)',
        'Direct 1-click Google Calendar meeting booking directly in chat',
      ],
      targetIndustries: ['B2B SaaS', 'Commercial Real Estate', 'High-Ticket Consulting'],
    },
    {
      title: 'Customer Support',
      category: 'Support & Success',
      icon: Headphones,
      color: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
      outcomeMetric: '70%+ First-Contact Resolution',
      outcomeSub: 'Autonomous Tier-1 resolution with zero wait times',
      description:
        'Resolve order tracking, returns, invoice requests, and technical troubleshooting directly against your grounded company knowledge base. Escalates edge-cases smoothly to live human reps with complete context.',
      bulletPoints: [
        'Cites exact page numbers & policy documents with pgvector RAG',
        'Resolves 70%+ of Tier-1 support queries autonomously',
        'Seamless human takeover with full conversation context when requested',
      ],
      targetIndustries: ['E-Commerce & DTC', 'Consumer Tech', 'Subscription Services'],
    },
    {
      title: 'WhatsApp Automation',
      category: 'Messaging Channels',
      icon: Smartphone,
      color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
      outcomeMetric: '98% Message Open Rate',
      outcomeSub: 'Meta-verified Cloud API broadcasts & button bots',
      description:
        'Deploy Meta-approved interactive WhatsApp bots featuring quick-reply button menus, appointment booking reminders, dispatch receipts, and broadcast messaging with dynamic variables.',
      bulletPoints: [
        'Official Meta-verified green checkmark business branding',
        'Interactive quick-reply buttons, list menus, and carousels',
        'Scheduled promotional & transactional broadcasts with high deliverability',
      ],
      targetIndustries: ['Retail & Hospitality', 'Healthcare Clinics', 'Financial Services'],
    },
    {
      title: 'Knowledge-Based AI Agents',
      category: 'Enterprise Knowledge',
      icon: Brain,
      color: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
      outcomeMetric: 'Zero Hallucination Risk',
      outcomeSub: 'Strictly cited answers from internal documentation',
      description:
        'Equip your employees and customers with autonomous domain experts that answer complex policy questions, technical specifications, and legal guidelines with exact document page citations.',
      bulletPoints: [
        'Parses PDFs, spreadsheets, technical docs, and live website URLs',
        'Semantic vector grounding ensures zero hallucination or guessing',
        'Strict enterprise data isolation and PII data sanitization',
      ],
      targetIndustries: ['Higher Education', 'Legal & Compliance', 'Internal IT Helpdesk'],
    },
    {
      title: 'Lead Management',
      category: 'CRM Synchronization',
      icon: Activity,
      color: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
      outcomeMetric: '100% Data Capture Fidelity',
      outcomeSub: 'Unstructured chat converted to structured CRM fields',
      description:
        'Turn chaotic conversations into organized records. The AI extracts customer name, company, phone number, and requirements into clean CRM records with automated lifecycle stage updates.',
      bulletPoints: [
        'Extracts unstructured chat details into structured CRM fields',
        'Auto-updates pipeline lifecycle stages from New to Qualified',
        '1-click export to HubSpot, Salesforce, or custom webhooks',
      ],
      targetIndustries: ['Agencies', 'Logistics Brokers', 'Professional Services'],
    },
    {
      title: 'Workflow Automation',
      category: 'Operations & APIs',
      icon: Zap,
      color: 'border-purple-500/30 bg-purple-500/5 text-purple-300',
      outcomeMetric: 'Zero-Code Orchestration',
      outcomeSub: 'Connect conversations directly to backend systems',
      description:
        'Build visual multi-step wires that trigger external APIs, query inventory databases, generate PDF quotes, process payments, and dispatch real-time Slack notifications to internal teams.',
      bulletPoints: [
        'Drag-and-drop visual node canvas for complex business wires',
        'Triggers external APIs, ERP lookups, and payment gateways',
        'Real-time internal team alerts via Slack, Webhooks, or SMS',
      ],
      targetIndustries: ['Fintech & Insurance', 'Supply Chain', 'On-Demand Services'],
    },
  ];

  const MOCKUP_COMPONENTS = [
    SalesQualificationVisual,
    CustomerSupportVisual,
    WhatsAppAutomationVisual,
    KnowledgeBaseVisual,
    LeadManagementVisual,
    WorkflowAutomationVisual,
  ];

  // Explore OrbionAgents Links for Section 6
  const EXPLORE_LINKS = [
    {
      title: 'Omni-Channel Inbox',
      category: 'Feature Guide',
      description: 'Unified queue for WhatsApp, Instagram & Webchat with live human takeover.',
      href: '/docs/features/omni-inbox',
      icon: MessageSquare,
      badge: 'Conversations',
    },
    {
      title: 'AI Brain (RAG Knowledge)',
      category: 'Feature Guide',
      description: 'Vector-grounded document store with pgvector and live URL sitemap ingestion.',
      href: '/docs/features/brain-rag',
      icon: Brain,
      badge: 'Intelligence',
    },
    {
      title: 'AI Workspace & Studio',
      category: 'Feature Guide',
      description: 'Interactive agent engineering studio, multi-model switching, and tool calling.',
      href: '/docs/features/ai-workspace',
      icon: Bot,
      badge: 'Execution',
    },
    {
      title: 'Automation Wire (Flows)',
      category: 'Feature Guide',
      description: 'Visual node canvas, conditional decision logic, and Magic Wire AI flow generation.',
      href: '/docs/features/agentic-orchestrator',
      icon: Workflow,
      badge: 'Automations',
    },
    {
      title: 'AI Lead Intelligence & CRM',
      category: 'Feature Guide',
      description: 'Capture, qualify, and score inbound leads into Hot/Warm/Cold pipelines.',
      href: '/docs/features/leads-crm',
      icon: Users,
      badge: 'Pipeline',
    },
    {
      title: 'AI Governance & Safeguards',
      category: 'Security Guide',
      description: 'Runtime policy boundaries, PII redaction, jailbreak defense, and audit trails.',
      href: '/docs/account/ai-governance',
      icon: ShieldCheck,
      badge: 'Governance',
    },
    {
      title: 'WhatsApp Cloud API Setup',
      category: 'Integration Guide',
      description: 'Meta Phone Number ID connection, webhook callbacks, and verified templates.',
      href: '/docs/integrations/whatsapp-cloud-api',
      icon: Smartphone,
      badge: 'Meta API',
    },
    {
      title: 'Credits, Wallet & Metering',
      category: 'Operations Guide',
      description: 'Real-time token expenditure, WhatsApp conversation credits, and auto-topup.',
      href: '/docs/features/credits-wallet',
      icon: Activity,
      badge: 'Operations',
    },
  ];

  return (
    <article
      className="w-full min-w-0 space-y-20 pb-20 font-['Poppins',sans-serif] select-text"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* 1. HERO SECTION */}
      <header className="space-y-6 border-b border-white/10 pb-12 pt-2">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium" aria-label="Breadcrumb">
          <Link href="/docs" className="hover:text-white transition-colors">
            Docs
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <span className="text-zinc-300">Getting Started</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <span className="text-violet-300 font-semibold truncate">
            Introduction to OrbionAgents
          </span>
        </nav>

        {/* Category & Status Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 font-poppins">
            Getting Started • Platform Overview
          </span>
        </div>

        {/* Hero Title & 2-Line Overview */}
        <div className="space-y-2 w-full">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight">
            Introduction to OrbionAgents
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
            Enterprise conversational AI platform uniting messaging channels, knowledge grounding, and visual automation to handle customer communication 24/7.
          </p>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
            Connect WhatsApp, Instagram, and Webchat with verified RAG knowledge grounding, visual workflow wires, and real-time CRM lead synchronization.
          </p>
        </div>
      </header>

      {/* 2. HOW ORBIONAGENTS WORKS (Conceptual Runtime Lifecycle) */}
      <section id="how-it-works" className="space-y-6 scroll-mt-24 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
            <Activity className="w-3.5 h-3.5" />
            <span>AI Conversation Flow</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How AI Conversations Flow
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            From first customer touchpoint to final resolution — how AI handles inbound conversations.
          </p>
        </div>

        {/* 5-Stage Sequential Pipeline Flow */}
        <div className="space-y-4">
          {/* Stage Buttons Carousel / Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {RUNTIME_STAGES.map((stg, sIdx) => {
              const Icon = stg.icon;
              const isSelected = activeStage === sIdx;
              return (
                <button
                  key={stg.id}
                  onClick={() => setActiveStage(sIdx)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-br from-[#6730e6]/35 to-[#221253]/15 border-r-white/[0.1]"
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                      {stg.number}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-400' : 'text-zinc-500'}`} />
                  </div>
                  <strong className="text-xs font-bold block truncate text-white">
                    {stg.title}
                  </strong>
                  <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                    {stg.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Deep-Dive Card */}
          {RUNTIME_STAGES[activeStage] && (
            <div className="p-6 rounded-2xl border border-violet-500/30 bg-gradient-to-b from-[#0F101A] to-[#0A0B12] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${RUNTIME_STAGES[activeStage].color}`}>
                    {React.createElement(RUNTIME_STAGES[activeStage].icon, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-400">
                        Stage {RUNTIME_STAGES[activeStage].number} of 05
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-white/50">
                        {RUNTIME_STAGES[activeStage].badge}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {RUNTIME_STAGES[activeStage].title} — {RUNTIME_STAGES[activeStage].subtitle}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => setActiveStage((prev) => (prev > 0 ? prev - 1 : RUNTIME_STAGES.length - 1))}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Previous Stage"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveStage((prev) => (prev < RUNTIME_STAGES.length - 1 ? prev + 1 : 0))}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Next Stage"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                {RUNTIME_STAGES[activeStage].description}
              </p>

              {/* Key Capabilities at this Stage */}
              <div className="pt-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block mb-2.5">
                  What Happens at this Stage:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RUNTIME_STAGES[activeStage].highlights.map((item, dIdx) => (
                    <div
                      key={dIdx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/*3. WHAT YOU CAN BUILD (6 Real-World Outcomes / Use Cases)*/}
      <section id="what-you-can-build" className="space-y-8 scroll-mt-24 border-t border-white/10 pt-10">
        <div className="space-y-3.5 w-full">

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            What You Can Build
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
            Real-world conversational solutions deployed by enterprises to accelerate revenue, resolve customer requests, and automate backend operations.
          </p>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
            OrbionAgents transforms everyday messaging channels into high-velocity operational hubs. By combining verified knowledge grounding (RAG), visual workflow wires, and automated CRM sync, businesses replace slow manual triage with dependable 24/7 autonomous agents backed by 1-click human oversight.
          </p>

          {/* Quick Blueprint Pillar Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Autonomous Tier-1 Customer Support</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Meta-Verified WhatsApp Broadcasts</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Event-Driven Workflow Automation</span>
            </div>
          </div>
        </div>

        {/* 6 Real-World Blueprints: Open Zig-Zag Showcase with Realistic UI Mockups */}
        <div className="divide-y divide-white/10">
          {USE_CASES.map((uc, ucIdx) => {
            const isEven = ucIdx % 2 === 0;
            const VisualMockup = MOCKUP_COMPONENTS[ucIdx];
            const Icon = uc.icon;

            return (
              <div
                key={ucIdx}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center py-12 sm:py-16 first:pt-4 last:pb-4"
              >
                {/* Content Column (Left on even, Right on odd) */}
                <div
                  className={`space-y-4 ${
                    isEven ? 'lg:col-span-6 lg:order-1' : 'lg:col-span-6 lg:order-2'
                  }`}
                >
                  <div className="flex items-center gap-2">                    
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                      {uc.title}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 ">
                        {uc.outcomeMetric}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {uc.outcomeSub}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                    {uc.description}
                  </p>

                  {/* Bullet Highlights */}
                  {uc.bulletPoints && (
                    <div className="space-y-2 pt-1">
                      {uc.bulletPoints.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                          <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Target Industries */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mr-1">
                      Ideal For:
                    </span>
                    {uc.targetIndustries.map((ind, iIdx) => (
                      <span
                        key={iIdx}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual Mockup Column (Right on even, Left on odd) */}
                <div
                  className={`${
                    isEven ? 'lg:col-span-6 lg:order-2' : 'lg:col-span-6 lg:order-1'
                  }`}
                >
                  <VisualMockup />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. EXPLORE ORBIONAGENTS (Capability Cards -> Respective Docs)*/}
      <section id="explore-orbionagents" className="space-y-6 scroll-mt-24 border-t border-white/10 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Documentation Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Explore OrbionAgents
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Deep-dive into comprehensive implementation guides, interactive product simulators, and developer documentation for each module.
            </p>
          </div>
          <Link
            href="/docs/getting-started/quickstart"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors self-start sm:self-auto shadow-lg shadow-violet-950/40"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>5-Min Quickstart</span>
          </Link>
        </div>

        {/* 8 Feature Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXPLORE_LINKS.map((link, lIdx) => {
            const Icon = link.icon;
            return (
              <Link
                key={lIdx}
                href={link.href}
                className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      {link.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                      {link.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-semibold text-violet-400 group-hover:text-violet-300">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6. ARTICLE PAGINATION FOOTER (Prev / Next Links)*/}
      <footer className="pt-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous link (Docs Directory) */}
        <Link
          href="/docs"
          className="w-full sm:w-auto p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3 text-left group"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400 group-hover:-translate-x-1 transition-transform" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Previous Page
            </span>
            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
              Documentation Home
            </span>
          </div>
        </Link>

        {/* Next link (Account Setup) */}
        <Link
          href="/docs/getting-started/account-setup"
          className="w-full sm:w-auto p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-end gap-3 text-right group sm:ml-auto"
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Next Step
            </span>
            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
              Creating an Account &amp; Setup
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </footer>
    </article>
  );
}
