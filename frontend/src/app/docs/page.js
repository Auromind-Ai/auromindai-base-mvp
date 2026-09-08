'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DOCS_NAVIGATION } from '@/docs-data/docs-navigation';
import FeatureDiscoveryCard from '@/components/docs/FeatureDiscoveryCard';
import {
  InboxPreview,
  AIBrainPreview,
  AIWorkspacePreview,
  LeadIntelligencePreview,
  AutomationPreview,
  AIGovernancePreview,
  WalletPreview,
  MultiChannelPreview,
} from '@/components/docs/FeatureUIPreviews';
import DocsVideoPlayer from '@/components/docs/DocsVideoPlayer';
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
  },
  {
    title: 'Connect WhatsApp Business Cloud API',
    description: 'Integrate your Meta Phone Number ID and configure webhooks with zero downtime.',
    href: '/docs/integrations/whatsapp-cloud-api',
    tag: 'Enterprise Meta API',
    icon: Phone,
  },
  {
    title: 'Ingest company PDFs into AI Brain',
    description: 'Upload pricing sheets, catalogs, and URLs for pgvector grounded question-answering.',
    href: '/docs/features/brain-rag',
    tag: 'RAG Knowledge',
    icon: Cpu,
  },
  {
    title: 'Manage live customer conversations',
    description: 'Collaborate with AI in the Omni-Inbox and take over high-ticket sales chats.',
    href: '/docs/features/omni-inbox',
    tag: 'Omni-Channel',
    icon: MessageSquare,
  },
  {
    title: 'Qualify & score inbound leads',
    description: 'Extract buyer budget, urgency, and contact info into structured CRM pipelines.',
    href: '/docs/features/leads-crm',
    tag: 'CRM Pipeline',
    icon: Bot,
  },
];

export default function DocsHomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const featuredVideos = [
    {
      title: 'Agentic Orchestrator: Node Construction & Flow Health',
      duration: '0:18',
      slug: 'features/agentic-orchestrator',
      url: '/docs/videos/agentic-orchestrator.mp4',
      desc: 'Visual workflow construction, trigger configuration, and error validation.',
    },
    {
      title: 'AI Workspace: Real-Time Streaming & Dynamic Tool Selection',
      duration: '0:38',
      slug: 'features/ai-workspace',
      url: '/docs/videos/ai-workspace.mp4',
      desc: 'Live agent testing, tool badges, and multi-model routing.',
    },
    {
      title: 'Magic Wire: Prompt-to-Flow Automatic Bot Builder',
      duration: '0:17',
      slug: 'features/magic-wire',
      url: '/docs/videos/magic-wire.mp4',
      desc: 'Generate complete real-estate and lead bots directly from natural language prompts.',
    },
    {
      title: 'Decision Nodes: Conditional Branching & Urgency Logic',
      duration: '0:09',
      slug: 'features/conditional-logic',
      url: '/docs/videos/conditional-logic.mp4',
      desc: 'Dynamic decision rules evaluating urgency and keyword matches.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="space-y-6 text-center sm:text-left pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-semibold tracking-wider text-violet-300 uppercase">
          <BookOpen className="w-3.5 h-3.5 text-violet-400" />
          <span>OrbionAgents Documentation &amp; Architecture</span>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Build. Automate.{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Understand. Convert.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed pt-1">
            One AI-native workspace for conversations, customers, knowledge, automation and revenue. Explore official guides, interactive UI previews, and production blueprints.
          </p>
        </div>

        {/* Global Search Trigger Bar */}
        <div className="max-w-xl pt-2">
          <Link
            href="#directory"
            className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-sm text-zinc-400 hover:text-white transition-all shadow-inner group"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition-colors" />
              <span>Search documentation, APIs, and workflows...</span>
            </div>
            <kbd className="hidden sm:inline-block px-2 py-1 text-[11px] font-mono bg-white/5 border border-white/10 rounded text-zinc-400">
              ⌘K
            </kbd>
          </Link>
        </div>

        {/* Quick Guide Fast-Track Pills */}
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Link
            href="/docs/getting-started/quickstart"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#814AC8] hover:bg-[#9255dd] text-xs font-semibold text-white shadow-lg shadow-violet-950/40 transition-all hover:-translate-y-0.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>5-Minute Quick Start</span>
          </Link>

          <Link
            href="/docs/features/agentic-orchestrator"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Explore Visual Wires</span>
          </Link>

          <Link
            href="/docs/integrations/whatsapp-cloud-api"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all hover:-translate-y-0.5"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connect WhatsApp</span>
          </Link>
        </div>
      </section>

      {/* 2. Popular Workflows Section */}
      <section className="space-y-6 pt-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
            Recommended Blueprints
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">Popular Workflows</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Proven execution patterns designed for rapid production deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_WORKFLOWS.map((wf, idx) => {
            const Icon = wf.icon;
            return (
              <Link
                key={idx}
                href={wf.href}
                className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                      {wf.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                      {wf.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {wf.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                  <span>Start Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Feature Discovery Section (The 10 Visual Showcase Cards) */}
      <section id="features-discovery" className="space-y-6 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              Interactive Product Showcase
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Core Capabilities &amp; Architecture
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Miniature visual representations of actual Orbion surfaces. Click any card to enter the full step-by-step walkthrough.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">8 Core Modules Available</span>
        </div>

        {/* The 8 Rich Visual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* 01: Omni-Channel Inbox */}
          <FeatureDiscoveryCard
            number="01"
            title="Omni-Channel Inbox"
            category="Conversations"
            badge="Live Sync"
            description="Unite WhatsApp, Instagram, Twilio SMS, and Webchat in a single collaborative inbox with automated AI handoffs."
            href="/docs/features/omni-inbox"
            previewComponent={InboxPreview}
          />

          {/* 02: AI Brain */}
          <FeatureDiscoveryCard
            number="02"
            title="AI Brain (RAG Knowledge Base)"
            category="Intelligence"
            badge="pgvector"
            description="Ingest company PDFs, dynamic URLs, and sitemaps. Generate strictly grounded answers with exact source citations."
            href="/docs/features/brain-rag"
            previewComponent={AIBrainPreview}
          />

          {/* 03: AI Workspace */}
          <FeatureDiscoveryCard
            number="03"
            title="AI Workspace & Agent Studio"
            category="Execution"
            badge="Multi-Model"
            description="Test live prompt variations with token-by-token streaming, intent scoring, and dynamic tool-calling inspection."
            href="/docs/features/ai-workspace"
            previewComponent={AIWorkspacePreview}
          />

          {/* 04: AI Lead Intelligence */}
          <FeatureDiscoveryCard
            number="04"
            title="AI Lead Intelligence & CRM"
            category="Pipeline"
            badge="Scoring Engine"
            description="Dynamically categorize conversations into Hot, Warm, and Cold tiers with automated contact extraction."
            href="/docs/features/leads-crm"
            previewComponent={LeadIntelligencePreview}
          />

          {/* 05: Automation Wire */}
          <FeatureDiscoveryCard
            number="05"
            title="Automation Wire (Flow Builder)"
            category="Automations"
            badge="Showcase Hero"
            description="Visual canvas for constructing multi-step logic, intent triggers, delay timers, and human handoff conditions."
            href="/docs/features/agentic-orchestrator"
            previewComponent={AutomationPreview}
          />

          {/* 06: AI Governance */}
          <FeatureDiscoveryCard
            number="06"
            title="AI Governance & Safeguards (MCP)"
            category="Safety"
            badge="Deterministic"
            description="Enforce Model Context Protocol policies, PII redaction, blacklisted competitor terms, and human escalations."
            href="/docs/account/ai-governance"
            previewComponent={AIGovernancePreview}
          />

          {/* 07: Wallet & Credits */}
          <FeatureDiscoveryCard
            number="07"
            title="Credits, Wallet & Token Metering"
            category="Operations"
            badge="Orbion Fuel"
            description="Track real-time token expenditure, WhatsApp conversation credits (WCC), and configure auto-recharge triggers."
            href="/docs/features/credits-wallet"
            previewComponent={WalletPreview}
          />

          {/* 08: Multi-Channel Architecture */}
          <FeatureDiscoveryCard
            number="08"
            title="Multi-Channel Integrations Architecture"
            category="Infrastructure"
            badge="Meta Certified"
            description="Direct infrastructure connectors uniting Meta Cloud API, Instagram Graph API, Twilio, and Gmail in one stack."
            href="/docs/integrations/whatsapp-cloud-api"
            previewComponent={MultiChannelPreview}
          />
        </div>
      </section>

      {/* 4. Featured Video Tutorials Showcase */}
      <section className="space-y-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              Interactive Media
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Video Tutorials &amp; Overviews</h2>
          </div>
          <span className="text-xs text-zinc-400">Official HD Walkthroughs</span>
        </div>

        {/* Primary Featured Hero Video */}
        <DocsVideoPlayer
          video={{
            url: '/docs/videos/meet-orbion.mp4',
            title: 'Meet OrbionAgents: Complete System Walkthrough',
            duration: '0:40',
            caption: 'High-level overview covering AI Workspaces, Unified Inbox, Visual Automations, and Brain Knowledge Base.',
          }}
        />

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredVideos.map((v) => (
            <Link
              key={v.slug}
              href={`/docs/${v.slug}`}
              className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all">
                  <Film className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {v.duration}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-violet-300 transition-colors">
                {v.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {v.desc}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:translate-x-1 transition-transform">
                <span>Watch video &amp; read guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Categorized Documentation Directory Explorer */}
      <section id="directory" className="space-y-8 pt-8 border-t border-white/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
            Browse By Category
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">Documentation Directory</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Complete technical references, API guides, and governance standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOCS_NAVIGATION.map((cat) => {
            const IconComponent = ICONS_MAP[cat.icon] || BookOpen;

            return (
              <div
                key={cat.category}
                className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                      {cat.category}
                    </h3>
                  </div>

                  <ul className="space-y-2 mt-4">
                    {cat.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/docs/${item.slug}`}
                          className="text-xs text-zinc-400 hover:text-white flex items-center justify-between group py-0.5"
                        >
                          <span className="truncate group-hover:text-violet-300 transition-colors">
                            {item.title}
                          </span>
                          {item.hasVideo && (
                            <span className="p-0.5 text-violet-400" title="Includes video">
                              <Film className="w-3 h-3" />
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5">
                  <Link
                    href={`/docs/${cat.items[0]?.slug}`}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <span>View all {cat.category} guides</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
