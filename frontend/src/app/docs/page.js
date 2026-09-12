'use client';

import Link from 'next/link';
import { useState } from 'react';
import FeatureDiscoveryCard from '@/components/docs/FeatureDiscoveryCard';
import DocsHeroVideoCard from '@/components/docs/DocsHeroVideoCard';

import {
  Rocket,
  Sparkles,
  Share2,
  Shield,
  CreditCard,
  HelpCircle,
  Film,
  ArrowRight,
  CheckCircle2,
  Zap,
  BookOpen,
  Search,
  Bot,
  MessageSquare,
  Workflow,
  Cpu,
  Layers,
  Phone,
  Terminal,
  Activity,
  ShieldCheck,
  Flame,
  Send,
} from 'lucide-react';

const ICONS_MAP = {
  Rocket: Rocket,
  Sparkles: Sparkles,
  Share2: Share2,
  Shield: Shield,
  CreditCard: CreditCard,
  HelpCircle: HelpCircle,
};

// Popular Workflows Section Data
const POPULAR_WORKFLOWS = [
  {
    title: 'Create your first AI automation',
    description: 'Build a prompt-to-wire bot that automatically qualifies inbound buyer requests.',
    href: '/docs/features/agentic-orchestrator',
    tag: '5 min setup',
    icon: Workflow,
    glowColor: 'bg-teal-500/25',
    iconStyle: 'bg-teal-500/15 border-teal-500/30 text-teal-300 group-hover:bg-teal-500 group-hover:text-white',
    accentBorder: 'group-hover:border-teal-500/50',
    actionColor: 'text-teal-400 group-hover:text-teal-300',
  },
  {
    title: 'Connect WhatsApp Business Cloud API',
    description: 'Integrate your Meta Phone Number ID and configure webhooks with zero downtime.',
    href: '/docs/integrations/whatsapp-cloud-api',
    tag: 'Enterprise Meta API',
    icon: Phone,
    glowColor: 'bg-amber-500/25',
    iconStyle: 'bg-amber-500/15 border-amber-500/30 text-amber-300 group-hover:bg-amber-500 group-hover:text-white',
    accentBorder: 'group-hover:border-amber-500/50',
    actionColor: 'text-amber-400 group-hover:text-amber-300',
  },
  {
    title: 'Ingest company PDFs into AI Brain',
    description: 'Upload pricing sheets, catalogs, and URLs for pgvector grounded question-answering.',
    href: '/docs/features/brain-rag',
    tag: 'RAG Knowledge',
    icon: Cpu,
    glowColor: 'bg-rose-500/25',
    iconStyle: 'bg-rose-500/15 border-rose-500/30 text-rose-300 group-hover:bg-rose-500 group-hover:text-white',
    accentBorder: 'group-hover:border-rose-500/50',
    actionColor: 'text-rose-400 group-hover:text-rose-300',
  },
  {
    title: 'Manage live customer conversations',
    description: 'Collaborate with AI in the Omni-Inbox and take over high-ticket sales chats.',
    href: '/docs/features/omni-inbox',
    tag: 'Omni-Channel',
    icon: MessageSquare,
    glowColor: 'bg-blue-500/25',
    iconStyle: 'bg-blue-500/15 border-blue-500/30 text-blue-300 group-hover:bg-blue-500 group-hover:text-white',
    accentBorder: 'group-hover:border-blue-500/50',
    actionColor: 'text-blue-400 group-hover:text-blue-300',
  },
  {
    title: 'Qualify & score inbound leads',
    description: 'Extract buyer budget, urgency, and contact info into structured CRM pipelines.',
    href: '/docs/features/leads-crm',
    tag: 'CRM Pipeline',
    icon: Bot,
    glowColor: 'bg-purple-500/25',
    iconStyle: 'bg-purple-500/15 border-purple-500/30 text-purple-300 group-hover:bg-purple-500 group-hover:text-white',
    accentBorder: 'group-hover:border-purple-500/50',
    actionColor: 'text-purple-400 group-hover:text-purple-300',
  },
  {
    title: 'Lead follow-ups with WhatsApp templates',
    description: 'Trigger Meta-approved WhatsApp template notifications and automated follow-up sequences.',
    href: '/docs/features/templates',
    tag: 'WhatsApp Templates',
    icon: Send,
    glowColor: 'bg-emerald-500/25',
    iconStyle: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white',
    accentBorder: 'group-hover:border-emerald-500/50',
    actionColor: 'text-emerald-400 group-hover:text-emerald-300',
  },
];

export default function DocsHomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const featuredVideos = [
    {
      title: 'Agentic Orchestrator: Node Construction & Flow Health',
      duration: '0:18',
      slug: 'features/agentic-orchestrator',
      url: '/images/docs/videos/agentic-orchestrator.mp4',
      desc: 'Visual workflow construction, trigger configuration, and error validation.',
    },
    {
      title: 'AI Workspace: Real-Time Streaming & Dynamic Tool Selection',
      duration: '0:38',
      slug: 'features/ai-workspace',
      url: '/images/docs/videos/ai-workspace.mp4',
      desc: 'Live agent testing, tool badges, and multi-model routing.',
    },
    {
      title: 'Magic Wire: Prompt-to-Flow Automatic Bot Builder',
      duration: '0:17',
      slug: 'features/magic-wire',
      url: '/images/docs/videos/magic-wire.mp4',
      desc: 'Generate complete real-estate and lead bots directly from natural language prompts.',
    },
    {
      title: 'Decision Nodes: Conditional Branching & Urgency Logic',
      duration: '0:09',
      slug: 'features/conditional-logic',
      url: '/images/docs/videos/conditional-logic.mp4',
      desc: 'Dynamic decision rules evaluating urgency and keyword matches.',
    },
  ];

  return (
    <div className="w-full space-y-24 sm:space-y-28 pb-28">
      {/* 1. Hero Section - Expansive Balanced Grid */}
      <section className="relative pt-2 sm:pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
          {/* Left Hero Content (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-tight text-white leading-[1.12]">
                Build Smarter.{' '}
                <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                  Ship Faster.
                </span>
              </h1>
              <p className="text-[11px] sm:text-lg text-zinc-300 leading-relaxed max-w-2xl font-normal">
                One AI-native workspace for conversations, customers, knowledge, automation and revenue. Explore official guides, interactive UI previews, and production blueprints.
              </p>
            </div>

            {/* Global Search Trigger Bar */}
            <div className="w-full max-w-2xl pt-1">
              <Link
                href="#directory"
                className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-violet-500/50 text-sm text-zinc-400 hover:text-white transition-all shadow-2xl group relative overflow-hidden backdrop-blur-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                    Search documentation, APIs, and workflows...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-mono font-semibold bg-white/[0.06] border border-white/10 rounded-lg text-zinc-300 shadow-inner">
                    ⌘K
                  </kbd>
                </div>
              </Link>
            </div>

            {/* Quick Guide Fast-Track Action Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/docs/getting-started/quickstart"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#814AC8] to-[#9333ea] hover:from-[#8d51db] hover:to-[#9f3ff2] text-xs font-semibold text-white shadow-lg shadow-purple-950/40 hover:shadow-purple-900/60 transition-all hover:-translate-y-0.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>5-Minute Quick Start</span>
              </Link>

              <Link
                href="/docs/features/agentic-orchestrator"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 text-xs font-semibold text-zinc-200 hover:text-white transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Explore Visual Wires</span>
              </Link>

              <Link
                href="/docs/integrations/whatsapp-cloud-api"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-xs font-semibold text-zinc-200 hover:text-white transition-all hover:-translate-y-0.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connect WhatsApp</span>
              </Link>
            </div>
          </div>

          {/* Right Hero Video Panel (5 Cols) - Blank Card with Centered Play Icon */}
          <div className="lg:col-span-5 h-full flex items-center">
            <DocsHeroVideoCard />
          </div>
        </div>
      </section>

      {/* 2. Popular Workflows Section - Balanced 3x2 Grid */}
      <section className="space-y-6 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Blueprints</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Popular Workflows
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Proven execution patterns designed for rapid production deployment.
            </p>
          </div>
          <span className="text-xs text-zinc-400 hidden sm:block">6 Ready-to-use Blueprints</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POPULAR_WORKFLOWS.map((wf, idx) => {
            const Icon = wf.icon;
            return (
              <Link
                key={idx}
                href={wf.href}
                className={`p-6 sm:p-7 rounded-[26px] border border-white/[0.08] bg-[#16161a]/95 hover:bg-[#191920] ${wf.accentBorder} transition-all duration-300 group flex flex-col justify-between shadow-2xl shadow-black/70 hover:-translate-y-1 relative overflow-hidden min-h-[250px] backdrop-blur-xl`}
              >
                {/* Atmospheric Ambient Glow */}
                <div
                  className={`absolute -top-12 -right-12 w-48 h-48 ${wf.glowColor} rounded-full blur-3xl pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-500`}
                />
                <div
                  className={`absolute -bottom-12 -left-12 w-36 h-36 ${wf.glowColor} rounded-full blur-3xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-500`}
                />

                {/* TOP ROW: Icon Container & Tag Pill */}
                <div className="flex items-center justify-between relative z-10 mb-4">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 shadow-md ${wf.iconStyle}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 shadow-inner">
                    {wf.tag}
                  </span>
                </div>

                {/* MIDDLE: Title & Description */}
                <div className="relative z-10 mb-4 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug group-hover:text-white transition-colors">
                    {wf.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed line-clamp-2 font-normal mt-2">
                    {wf.description}
                  </p>
                </div>

                {/* BOTTOM: Action Guide Link */}
                <div
                  className={`pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold ${wf.actionColor} relative z-10 transition-colors`}
                >
                  <span>Start Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Feature Discovery Section (The 8 Rich Visual Showcase Cards) */}
      <section id="features-discovery" className="space-y-6 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-400 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Interactive Product Showcase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Core Capabilities &amp; Architecture
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-3xl">
              Miniature visual representations of actual Orbion surfaces. Click any card to enter the full step-by-step walkthrough.
            </p>
          </div>
          <span className="text-xs text-white/90 bg-[#814AC8]/50 px-3 py-1 rounded-full border border-white/10 font-medium w-fit">
            8 Core Modules Available
          </span>
        </div>

        {/* The 8 Rich Visual Cards Grid - Spacious 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 pt-2">
          {/* Omni-Channel Inbox */}
          <FeatureDiscoveryCard
            title="Omni-Channel Inbox"
            category="Conversations"
            badge="Live Sync"
            description="Unite WhatsApp, Instagram, Twilio SMS, and Webchat in a single collaborative inbox with automated AI handoffs. Manage all conversations, track contact details, and convert leads — from one powerful interface."
            href="/docs/features/omni-inbox"
            imageSrc="/images/docs/Docs_OmniInbox.png"
            priority={true}
          />

          {/* AI Brain */}
          <FeatureDiscoveryCard
            title="AI Brain (RAG Knowledge Base)"
            category="Intelligence"
            badge="pgvector"
            description="Ingest company PDFs, dynamic URLs, and sitemaps. Generate strictly grounded answers with exact source citations."
            href="/docs/features/brain-rag"
            imageSrc="/images/docs/Docs_AI_Brain.png"
            priority={true}
          />

          {/* AI Workspace */}
          <FeatureDiscoveryCard
            title="AI Workspace & Agent Studio"
            category="Execution"
            badge="Multi-Model"
            description="Test live prompt variations with token-by-token streaming, intent scoring, and dynamic tool-calling inspection."
            href="/docs/features/ai-workspace"
            imageSrc="/images/docs/Docs_AiWorkspace.png"
          />

          {/* AI Lead Intelligence */}
          <FeatureDiscoveryCard
            title="AI Lead Intelligence & CRM"
            category="Pipeline"
            badge="Scoring Engine"
            description="Dynamically categorize conversations into Hot, Warm, and Cold tiers with automated contact extraction."
            href="/docs/features/leads-crm"
            imageSrc="/images/docs/Docs_Lead_CRM.png?v=2"
          />

          {/* Automation Wire */}
          <FeatureDiscoveryCard
            title="Automation Wire (Flow Builder)"
            category="Automations"
            badge="Showcase Hero"
            description="Visual canvas for constructing multi-step logic, intent triggers, delay timers, and human handoff conditions."
            href="/docs/features/agentic-orchestrator"
            imageSrc="/images/docs/Docs_Automation.png"
          />

          {/* AI Governance */}
          <FeatureDiscoveryCard
            title="AI Governance & Safeguards (MCP)"
            category="Safety"
            badge="Deterministic"
            description="Enforce Model Context Protocol policies, PII redaction, blacklisted competitor terms, and human escalations."
            href="/docs/account/ai-governance"
            imageSrc="/images/docs/Docs_AI_Governance.png"
          />

          {/* Wallet & Credits */}
          <FeatureDiscoveryCard
            title="Credits, Wallet & Token Metering"
            category="Operations"
            badge="Orbion Fuel"
            description="Track real-time token expenditure, WhatsApp conversation credits (WCC), and configure auto-recharge triggers."
            href="/docs/features/credits-wallet"
            imageSrc="/images/docs/Docs_Credits.png"
          />

          {/* Multi-Channel Architecture */}
          <FeatureDiscoveryCard
            title="Multi-Channel Integrations Architecture"
            category="Infrastructure"
            badge="Meta Certified"
            description="Direct infrastructure connectors uniting Meta Cloud API, Instagram Graph API, Twilio, and Gmail in one stack."
            href="/docs/integrations/whatsapp-cloud-api"
            imageSrc="/images/docs/Docs_Channels.png"
          />
        </div>
      </section>
    </div>
  );
}

