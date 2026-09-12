'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Brain,
  Cpu,
  Bot,
  Workflow,
  ShieldCheck,
  Users,
  Target,
  Send,
  Globe,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
  Smartphone,
  MessageCircle,
  Activity,
  Flame,
  Headphones,
  ShoppingBag,
  TrendingUp,
  Code2,
  Truck,
} from 'lucide-react';

export default function IntroductionDetailView({ article, prevArticle, nextArticle }) {
  const [activeStage, setActiveStage] = useState(0);

  // Target Personas for Section 2 (Who is OrbionAgents Built For?)
  const TARGET_PERSONAS = [
    {
      title: 'Inbound Sales & Revenue Teams',
      description:
        'Qualify inbound leads 24/7, parse buyer budget and timeline, auto-score Hot/Warm/Cold leads, and book Google Calendar meetings instantly in chat.',
      tag: 'Revenue',
      icon: Target,
      glowColor: 'bg-[#0f8b6c]/20',
      iconStyle: 'bg-[#0f8b6c] text-white shadow-[0_0_24px_rgba(15,139,108,0.65)]',
      accentBorder: 'border-white/[0.08]',
    },
    {
      title: 'Support & Success Desks',
      description:
        'Automate 70%+ of Tier-1 customer tickets, answer complex policy questions with exact document citations, and smoothly escalate edge cases to human reps.',
      tag: 'Support',
      icon: Headphones,
      glowColor: 'bg-[#245bb5]/20',
      iconStyle: 'bg-[#245bb5] text-white shadow-[0_0_24px_rgba(36,91,181,0.65)]',
      accentBorder: 'border-white/[0.08]',
    },
    {
      title: 'E-Commerce & DTC Brands',
      description:
        'Deploy interactive WhatsApp product catalogs, automated order tracking lookups, return label generation, and abandoned cart re-engagement flows.',
      tag: 'E-Commerce',
      icon: ShoppingBag,
      glowColor: 'bg-[#a45422]/20',
      iconStyle: 'bg-[#a45422] text-white shadow-[0_0_24px_rgba(164,84,34,0.65)]',
      accentBorder: 'border-white/[0.08]',
    },
    {
      title: 'Marketing & Growth Teams',
      description:
        'Send Meta-verified WhatsApp Cloud API broadcasts with 98% open rates, launch VIP drops, and automate Click-to-WhatsApp ad conversational funnels.',
      tag: 'Marketing',
      icon: TrendingUp,
      glowColor: 'bg-[#9f1239]/20',
      iconStyle: 'bg-[#9f1239] text-white shadow-[0_0_20px_rgba(159,18,57,0.5)]',
      accentBorder: 'border-white/[0.08]',
    },
    {
      title: 'Operations & Logistics',
      description:
        'Query ERP/database backends, generate automated PDF receipts and invoices, and dispatch real-time Slack/SMS operational alerts to fulfillment teams.',
      tag: 'Operations',
      icon: Truck,
      glowColor: 'bg-[#5851ea]/20',
      iconStyle: 'bg-[#5851ea] text-white shadow-[0_0_24px_rgba(88,81,234,0.65)]',
      accentBorder: 'border-white/[0.08]',
    },
    {
      title: 'Developers & IT Architects',
      description:
        'Build on visual node canvases, integrate webhooks and REST endpoints, switch between top LLMs (OpenAI, Gemini, Anthropic), and enforce PII data masking.',
      tag: 'Developers',
      icon: Code2,
      glowColor: 'bg-[#7c3aed]/20',
      iconStyle: 'bg-[#7c3aed] text-white shadow-[0_0_24px_rgba(124,58,237,0.65)]',
      accentBorder: 'border-white/[0.08]',
    },
  ];

  // Runtime Pipeline Stages for Section 2 (How AI Conversations Flow)
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
      color: 'from-rose-500/20 to-pink-500/20 text-violet-400 border-pink-500/30',
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

  // What You Can Build for Section 3 (Outcomes & Production Blueprints)
  const USE_CASES = [
    {
      title: 'Sales Qualification',
      category: 'Revenue Operations',
      icon: Target,
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
      image: {
        src: '/docs/screenshots/intro-sales-qualification-v3.png',
        alt: 'AI Sales Qualification WhatsApp Assistant',
        caption: 'Instant WhatsApp lead qualification with automated scoring and demo booking',
        annotation: 'Sales Qualification',
      },
    },
    {
      title: 'Customer Support',
      category: 'Support & Success',
      icon: Headphones,
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
      image: {
        src: '/docs/screenshots/intro-customer-support-v4.png',
        alt: 'Autonomous AI Customer Support Agent and Order Tracking',
        caption: 'Autonomous Tier-1 support with document citations, order tracking, and live agent handoff',
        annotation: 'Customer Support',
      },
    },
    {
      title: 'Knowledge-Based AI Agents',
      category: 'Enterprise Knowledge',
      icon: Brain,
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
      image: {
        src: '/docs/screenshots/intro-knowledge-copilot-v5.png',
        alt: 'Knowledge AI Agent Grounding Architecture and Citations',
        caption: 'Vector-grounded knowledge retrieval across PDFs, documents, spreadsheets & URLs with strict citations',
        annotation: 'Knowledge AI Agent',
      },
    },
    {
      title: 'AI Lead Intelligence & CRM Sync',
      category: 'CRM Synchronization',
      icon: Activity,
      outcomeMetric: '100% Data Capture Fidelity',
      outcomeSub: 'Unstructured chat converted to structured CRM fields',
      description:
        'Turn chaotic conversations into organized records. The AI extracts customer name, company, phone number, and requirements into clean CRM records with automated lifecycle stage updates.',
      bulletPoints: [
        'Extracts unstructured chat details into structured CRM fields',
        'Auto-updates pipeline lifecycle stages from New to Qualified',
        '1-click export to HubSpot, Salesforce, or custom webhooks',
      ],
      targetIndustries: ['Agencies', 'Healthcare & Clinics', 'Professional Services'],
      image: {
        src: '/docs/screenshots/intro-lead-management-v2.png',
        alt: 'AI Lead Intelligence & Automated CRM Record Creation',
        caption: 'Unstructured WhatsApp conversations automatically extracted and synced into structured CRM records',
        annotation: 'CRM Pipeline',
      },
    },
  ];

  // Explore OrbionAgents Links for Section 4
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
      className="w-full min-w-0 space-y-6 sm:space-y-8 pb-14 font-['Poppins',sans-serif] select-text"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* 1. HERO SECTION */}
      <header className="space-y-4 border-b border-white/10 pb-5 pt-1">
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
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

      {/* ─────────────────────────────────────────────────────────────
          2. WHO IS ORBIONAGENTS FOR? (6 Comprehensive Target Personas)
          ───────────────────────────────────────────────────────────── */}
      <section id="target-audience" className="space-y-4 scroll-mt-24 pt-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Users className="w-3.5 h-3.5" />
            <span>Target Personas &amp; Teams</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Who is OrbionAgents Built For?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Tailored solutions designed for fast-growing sales teams, high-volume support desks, e-commerce stores, and modern developers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TARGET_PERSONAS.map((persona, idx) => {
            const Icon = persona.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-7 rounded-[26px] border border-white/[0.08] bg-[#16161a]/95 transition-colors duration-200 flex flex-col justify-between shadow-2xl shadow-black/70 relative overflow-hidden min-h-[250px] backdrop-blur-xl"
              >
                {/* Atmospheric Ambient Glow */}
                <div
                  className={`absolute -top-12 -right-12 w-48 h-48 ${persona.glowColor} rounded-full blur-3xl pointer-events-none opacity-40`}
                />
                <div
                  className={`absolute -bottom-12 -left-12 w-36 h-36 ${persona.glowColor} rounded-full blur-3xl pointer-events-none opacity-20`}
                />

                {/* TOP ROW: Icon Container & Tag Pill */}
                <div className="flex items-center justify-between relative z-10 mb-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${persona.iconStyle}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 shadow-inner">
                    {persona.tag}
                  </span>
                </div>

                {/* MIDDLE: Title & Description */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug">
                    {persona.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed font-normal mt-2">
                    {persona.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW ORBIONAGENTS WORKS (Conceptual Runtime Lifecycle)
          ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="space-y-6 scroll-mt-24 border-t border-white/10 pt-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Activity className="w-3.5 h-3.5" />
            <span>AI Conversation Flow</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
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
              const isSelected = activeStage === sIdx;
              return (
                <button
                  key={stg.id}
                  onClick={() => setActiveStage(sIdx)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#6730e6]/35 to-[#221253]/15 border-violet-500/50'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-semibold block truncate text-white">
                    {stg.title}
                  </span>
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
                <div className="space-y-1">
                  <span className="text-xs font-medium text-violet-400">
                    {RUNTIME_STAGES[activeStage].badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {RUNTIME_STAGES[activeStage].title} — {RUNTIME_STAGES[activeStage].subtitle}
                  </h3>
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

      {/* ─────────────────────────────────────────────────────────────
          4. WHAT YOU CAN BUILD (Real-World Production Showcases)
          ───────────────────────────────────────────────────────────── */}
      <section id="what-you-can-build" className="space-y-8 scroll-mt-24 border-t border-white/10 pt-10">
        <div className="space-y-3.5 w-full">

          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
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
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>Enterprise Knowledge &amp; Document Grounding</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>AI Lead Intelligence &amp; Structured CRM Sync</span>
            </div>
          </div>
        </div>

        {/* Real-World Blueprints: Open Zig-Zag Showcase with Production Screenshots */}
        <div className="divide-y divide-white/10">
          {USE_CASES.map((uc, ucIdx) => {
            const isEven = ucIdx % 2 === 0;
            const Icon = uc.icon;

            return (
              <div
                key={ucIdx}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center py-8 sm:py-10 first:pt-4 last:pb-4"
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
                    <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
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

                {/* Photo Column (Right on even, Left on odd) */}
                <div
                  className={`flex items-center justify-center ${
                    isEven ? 'lg:col-span-6 lg:order-2' : 'lg:col-span-6 lg:order-1'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uc.image.src}
                    alt={uc.image.alt}
                    className={`${
                      uc.image.className ||
                      'max-h-[420px] sm:max-h-[460px] lg:max-h-[490px] w-auto max-w-full'
                    } h-auto object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-[1.02]`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. EXPLORE ORBIONAGENTS (Capability Cards -> Respective Docs)
          ───────────────────────────────────────────────────────────── */}
      <section id="explore-orbionagents" className="space-y-6 scroll-mt-24 border-t border-white/10 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Documentation Directory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-1">
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
                    <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
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

      {/* ─────────────────────────────────────────────────────────────
          6. ARTICLE PAGINATION FOOTER (Prev / Next Links)
          ───────────────────────────────────────────────────────────── */}
      <footer className="pt-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous link (Docs Directory) */}
        <Link
          href="/docs"
          className="w-full sm:w-auto p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3 text-left group"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400 group-hover:-translate-x-1 transition-transform" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-medium">
              Previous Page
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
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
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-medium">
              Next Step
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
              Creating an Account &amp; Setup
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </footer>
    </article>
  );
}
