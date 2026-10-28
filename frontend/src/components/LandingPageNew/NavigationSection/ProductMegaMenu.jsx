'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAppUrl } from '@/lib/auth';
import Image from 'next/image';
import {
  Inbox,
  Bot,
  Brain,
  GitBranch,
  MessageCircle,
  Instagram,
  MessageSquare,
  Megaphone,
  BarChart3,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  Users,
  Filter,
  ShieldCheck,
  Database,
  Layers,
  Globe,
  TrendingUp,
  Smartphone,
  ChevronRight,
  Check
} from 'lucide-react';

export const PRODUCT_MODULES = [
  {
    id: 'inbox',
    number: '1',
    name: 'Inbox',
    subtitle: 'Unified omnichannel conversations',
    badge: 'AI + Human Handover',
    description:
      'Unified omnichannel conversation hub — manage customer chats across WhatsApp, Instagram, Email, SMS, and Website live with real-time AI assistance.',
    primaryHref: '/inbox',
    primaryLabel: 'Explore Inbox',
    demoHref: '/resources/demo-videos',
    icon: Inbox,
    channels: ['WhatsApp', 'Instagram', 'Email', 'SMS', 'Website'],
    features: [
      { title: 'All Channels in One Place', desc: 'Unified omnichannel inbox', icon: Globe },
      { title: 'Team Collaboration', desc: 'Assign, tag & resolve chats', icon: Users },
      { title: 'Smart Filters', desc: 'Open, Pending & Resolved', icon: Filter },
      { title: 'Conversation Analytics', desc: 'Track response time & CSAT', icon: TrendingUp },
    ],
  },
  {
    id: 'ai-agents',
    number: '2',
    name: 'AI Agents',
    subtitle: 'Autonomous sales & support',
    badge: 'Autonomous AI Employees',
    description:
      'Use Lead Qualifier, Sales Rep and Support Agent to collect customer details, answer questions using business knowledge, and handle support requests.',
    primaryHref: '/ai-agents',
    primaryLabel: 'Explore AI Agents',
    demoHref: '/resources/demo-videos',
    icon: Bot,
    features: [
      { title: 'Custom Personalities', desc: 'Align with brand voice', icon: Sparkles },
      { title: 'Objection Handling', desc: 'Trained on top sales scripts', icon: ShieldCheck },
      { title: 'Multi-Channel Deploy', desc: 'WhatsApp, IG, Web & SMS', icon: Layers },
      { title: 'Performance Tracking', desc: 'Track deals & conversions', icon: BarChart3 },
    ],
  },
  {
    id: 'ai-brain',
    number: '3',
    name: 'AI Brain',
    subtitle: 'Context-aware RAG knowledge',
    badge: 'Context-Aware RAG Engine',
    description:
      'Ground your agents in verified company facts. Ingest PDF catalogs, website links, Notion docs, and databases with pgvector semantic search.',
    primaryHref: '/brain',
    primaryLabel: 'Explore AI Brain',
    demoHref: '/resources/demo-videos',
    icon: Brain,
    features: [
      { title: 'Product Knowledge', desc: 'Auto-sync catalog & pricing', icon: Database },
      { title: 'Accurate Answers', desc: 'Zero hallucination guardrails', icon: CheckCircle2 },
      { title: 'Multi-Language', desc: 'Tamil, English & 30+ langs', icon: Globe },
      { title: 'Continuous Learning', desc: 'Auto-syncs on new updates', icon: Sparkles },
    ],
  },
  {
    id: 'wires',
    number: '4',
    name: 'Wires',
    subtitle: 'Visual automation flow builder',
    badge: 'Visual Flow Automation',
    description:
      'Visual drag-and-drop workflow canvas to orchestrate sales funnels, follow-up chains, conditional branches, and external CRM webhooks without code.',
    primaryHref: '/automation',
    primaryLabel: 'Explore Wires',
    demoHref: '/resources/demo-videos',
    icon: GitBranch,
    features: [
      { title: 'Visual Flow Builder', desc: 'Drag, drop & connect nodes', icon: GitBranch },
      { title: 'Ready Templates', desc: 'Pre-built SaaS & retail flows', icon: Layers },
      { title: 'Advanced Conditions', desc: 'Branch on intent & sentiment', icon: Filter },
      { title: 'Integrate Everything', desc: 'Shopify, Stripe & webhooks', icon: Globe },
    ],
  },
  {
    id: 'whatsapp',
    number: '5',
    name: 'WhatsApp',
    subtitle: 'Official Meta Cloud API',
    badge: 'Official Meta Cloud API',
    description:
      'Connect your official WhatsApp Business API to broadcast promotional campaigns, automate interactive catalogs, and send instant follow-ups at scale.',
    primaryHref: '/inbox?channel=whatsapp',
    primaryLabel: 'Explore WhatsApp',
    demoHref: '/resources/demo-videos',
    icon: MessageCircle,
    features: [
      { title: 'Official Meta Cloud API', desc: 'Verified, zero ban risk', icon: ShieldCheck },
      { title: 'Interactive Catalogs', desc: 'Products & quick replies', icon: Smartphone },
      { title: 'Automated Follow-ups', desc: 'Recover abandoned leads', icon: Sparkles },
      { title: 'Broadcast Campaigns', desc: 'Send bulk at 98% open rate', icon: Megaphone },
    ],
  },
  {
    id: 'instagram',
    number: '6',
    name: 'Instagram',
    subtitle: 'DM automation & sales',
    badge: 'DM Automation',
    description:
      'Automate Instagram direct messages, convert reel comments into sales conversations, reply to story mentions instantly, and capture leads 24/7.',
    primaryHref: '/inbox?channel=instagram',
    primaryLabel: 'Explore Instagram',
    demoHref: '/resources/demo-videos',
    icon: Instagram,
    features: [
      { title: 'Comment to DM', desc: 'Convert reel views to sales', icon: MessageCircle },
      { title: 'Story Mentions', desc: 'Auto-reply with promo codes', icon: Sparkles },
      { title: 'Direct Checkout', desc: 'Interactive product links', icon: ArrowRight },
      { title: 'Engagement Analytics', desc: 'Track ROI per reel & post', icon: BarChart3 },
    ],
  },
  {
    id: 'ai-chatbot',
    number: '7',
    name: 'AI Chatbot',
    subtitle: '24/7 intelligent web assistant',
    badge: '24/7 Web Assistant',
    description:
      'Deploy an intelligent web assistant that understands your business, answers questions, qualifies prospects, and books meetings on auto-pilot.',
    primaryHref: '/ai',
    primaryLabel: 'Explore AI Chatbot',
    demoHref: '/resources/demo-videos',
    icon: MessageSquare,
    features: [
      { title: '1-Line Embed', desc: 'Works on any web framework', icon: Globe },
      { title: 'Product Guidance', desc: 'Smart context-aware advice', icon: Sparkles },
      { title: 'Lead Capture Forms', desc: 'Validate emails & numbers', icon: CheckCircle2 },
      { title: 'Human Handover', desc: 'Instant team notifications', icon: Users },
    ],
  },
  {
    id: 'broadcast',
    number: '8',
    name: 'Broadcast',
    subtitle: 'Segmented messaging at scale',
    badge: 'Send at Scale',
    description:
      'Create and dispatch targeted broadcast campaigns across WhatsApp, SMS, and channels with granular audience segmentation and real-time delivery analytics.',
    primaryHref: '/marketing/bulkmessages',
    primaryLabel: 'Explore Broadcast',
    demoHref: '/resources/demo-videos',
    icon: Megaphone,
    features: [
      { title: 'Audience Segmentation', desc: 'Filter by tags & activity', icon: Users },
      { title: 'Personalized Messages', desc: 'Dynamic customer tokens', icon: Sparkles },
      { title: 'Scheduled Delivery', desc: 'Optimal time-zone sending', icon: Layers },
      { title: 'Detailed Analytics', desc: 'Delivery, read & click rates', icon: BarChart3 },
    ],
  },
  {
    id: 'crm',
    number: '9',
    name: 'CRM & Analytics',
    subtitle: 'Pipeline & revenue tracking',
    badge: 'Pipeline & Revenue',
    description:
      'Complete visibility into your customer journey. Track pipeline stages, monitor AI agent resolution times, and attribute revenue to every campaign.',
    primaryHref: '/crm',
    primaryLabel: 'Explore CRM',
    demoHref: '/resources/demo-videos',
    icon: BarChart3,
    features: [
      { title: 'Automated Lead Scoring', desc: 'Intent & qualification rank', icon: Sparkles },
      { title: 'Pipeline Kanban', desc: 'Drag & drop deal stages', icon: Layers },
      { title: 'Team Performance', desc: 'Response & resolution speed', icon: Users },
      { title: 'Revenue Attribution', desc: 'Direct ROI per channel', icon: TrendingUp },
    ],
  },
];

export default function ProductMegaMenu({ isOpen, onClose }) {
  const { user, loading } = useAuth();
  const [activeTabId, setActiveTabId] = useState('inbox');

  if (!isOpen) return null;

  const currentModule = PRODUCT_MODULES.find((m) => m.id === activeTabId) || PRODUCT_MODULES[0];

  return (
    <div
      role="region"
      aria-label="Product mega menu"
      className="absolute left-0 right-0 top-[calc(100%+16px)] mx-auto w-full max-w-7xl rounded-3xl border border-white/10 bg-[#0B0B0F]/98 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(139,92,246,0.15)] p-5 sm:p-7 z-50 text-white animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[560px]">
        {/* Left Sidebar: Product List */}
        <div className="w-full lg:w-[335px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 pr-0 lg:pr-4 space-y-1.5 overflow-y-auto max-h-[580px] custom-scrollbar">
          <div className="px-3 py-1.5 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Platform & Products
            </span>
            <span className="text-[10px] font-medium text-[#C084FC] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 px-2 py-0.5 rounded-full">
              {PRODUCT_MODULES.length} Modules
            </span>
          </div>

          {PRODUCT_MODULES.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTabId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTabId(item.id)}
                className={`w-full text-left rounded-xl p-3 transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 text-white shadow-sm shadow-[#8B5CF6]/10'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#8B5CF6]/25 border border-[#8B5CF6]/40 text-[#C084FC]'
                        : 'bg-white/5 border border-white/10 text-white/70 group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-white tracking-tight">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-white/45 truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-all ${
                    isActive
                      ? 'text-[#C084FC] translate-x-0 opacity-100'
                      : 'text-white/20 -translate-x-1 opacity-0 group-hover:opacity-60 group-hover:translate-x-0'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Right Main Showcase */}
        <div className="flex-1 flex flex-col justify-between min-w-0 pl-0 lg:pl-4">
          {/* Top header row */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="text-[#C084FC]">{currentModule.number}.</span>
                  <span>{currentModule.name}</span>
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white bg-[#8B5CF6]/12 border border-white/20 rounded-full px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                  {currentModule.badge}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  href={getAppUrl(user ? currentModule.primaryHref : '/login')}
                  aria-disabled={loading}
                  onClick={(event) => {
                    if (loading) {
                      event.preventDefault();
                      return;
                    }
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#814AC8] hover:bg-[#8d58d1] px-5 py-2.5 text-[14px] font-semibold text-white transition-all shadow-md shadow-[#814AC8]/25 hover:shadow-[#814AC8]/40 active:scale-95 group"
                >
                  <span>{currentModule.primaryLabel}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href={currentModule.demoHref}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-[13.5px] font-medium text-white/80 hover:text-white transition-all active:scale-95"
                >
                  <PlayCircle className="w-4 h-4 text-[#C084FC]" />
                  <span>Watch Demo</span>
                </Link>
              </div>
            </div>

            <p className="text-white/65 text-[14px] sm:text-[14.5px] leading-relaxed max-w-3xl mb-4.5">
              {currentModule.description}
            </p>

            {/* Product Preview */}
            <div className={`h-[320px] rounded-2xl border border-white/10 bg-[#07060A]/90 shadow-inner flex flex-col ${(activeTabId === 'inbox' || activeTabId === 'ai-brain' || activeTabId === 'whatsapp' || activeTabId === 'ai-chatbot' || activeTabId === 'broadcast' || activeTabId === 'crm' || activeTabId === 'instagram' || activeTabId === 'wires' || activeTabId === 'ai-agents') ? 'overflow-hidden justify-center' : 'p-5 sm:p-6 overflow-y-auto'}`}>
              {activeTabId === 'inbox' && <InboxPreview />}
              {activeTabId === 'ai-agents' && <AiAgentsPreview />}
              {activeTabId === 'ai-brain' && <AiBrainPreview />}
              {activeTabId === 'wires' && <WiresPreview />}
              {activeTabId === 'whatsapp' && <WhatsAppPreview />}
              {activeTabId === 'instagram' && <InstagramPreview />}
              {activeTabId === 'ai-chatbot' && <AiChatbotPreview />}
              {activeTabId === 'broadcast' && <BroadcastPreview />}
              {activeTabId === 'crm' && <CrmPreview />}
            </div>
          </div>

          {/* Bottom 4 Feature Highlight Pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
            {currentModule.features.map((feat, idx) => {
              const FeatIcon = feat.icon;
              const iconColor = ['#6848D1', '#21457F', '#17775F', '#874922'][idx % 4];
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/8 bg-white/[0.025] hover:bg-white/[0.05] p-3 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0" style={{ backgroundColor: iconColor, borderColor: iconColor }}>
                    <FeatIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-white/90 truncate leading-snug">
                      {feat.title}
                    </p>
                    <p className="text-[11px] text-white/45 truncate leading-tight">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxPreview() {
  const channels = [
    { label: 'WhatsApp', src: '/images/integrations/whatsapp.png' },
    { label: 'Instagram', src: '/images/integrations/instagram.png' },
    { label: 'Twilio', src: '/images/integrations/twilio_fixed.svg' },
  ];

  return (
    <div className="grid grid-cols-[0.95fr_1.05fr] items-center gap-6 xl:gap-8 h-full p-5 sm:p-6">
      <div className="min-w-0 space-y-4 text-left">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC] mb-2">UNIFIED INBOX</p>
          <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
            Every conversation.<br />One smart inbox.
          </h4>
          <div className="mt-2 w-fit max-w-full">
            <p className="text-xs leading-relaxed text-white/60">WhatsApp, Instagram, Twilio and more.</p>
        <div className="grid grid-cols-3 items-start gap-2 w-full mt-4">
          {channels.map(({ label, src }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center">
                <Image src={src} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              </span>
              <span className="text-[9px] text-white/60">{label}</span>
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
      {/* Inbox dashboard preview */}
      <div className="relative w-full aspect-[990/690] overflow-hidden rounded-xl">
        <Image
          src="/images/product-previews/inbox-preview-v3.png"
          alt="Inbox dashboard with customer conversations, AI replies and a product recommendation"
          width={1774}
          height={887}
          sizes="(max-width: 1280px) 65vw, 850px"
          className="absolute max-w-none"
          style={{ width: '179.2%', height: '128.55%', left: '-75.76%', top: '-14.49%' }}
        />
      </div>
    </div>
  );
}

function AiAgentsPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">SPECIALISED AI AGENTS</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          Qualify. Sell. Support.<br />With the right AI agent.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Put your business knowledge to work with dedicated agents for customer enquiries, sales and support.
        </p>
        <ChannelFeaturePills labels={['Lead Qualifier', 'Sales Rep', 'Support Agent']} />
      </div>
      <Image
        src="/images/product-previews/ai-agents-preview.png"
        alt="Orbion Lead Qualifier, Sales Rep and Support Agent handling customer details, demos, payment links and support tickets"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function AiBrainPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">YOUR BUSINESS KNOWLEDGE</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          One brain.<br />Smarter conversations.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Give your agents the context they need to answer questions about your products, pricing and policies.
        </p>
        <ul className="space-y-2 text-[11px] leading-relaxed text-white/75">
          {['Connect documents and website content', 'Find relevant knowledge for each question', 'Support sales, marketing and service agents'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C084FC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/images/product-previews/ai-brain-agent-hub.png"
        alt="AI assistant connecting sales, marketing, support and custom agents with communication channels"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-auto max-h-full object-contain rounded-xl"
      />
    </div>
  );
}

function WiresPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">VISUAL WORKFLOW AUTOMATION</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          Connect the steps.<br />Automate the follow-through.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Build workflows that turn incoming enquiries into relevant replies, team assignments and follow-up actions.
        </p>
        <ul className="space-y-2 text-[11px] leading-relaxed text-white/75">
          {['Connect triggers and actions without code', 'Branch conversations by customer intent', 'Send product information or route to your team'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C084FC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/images/product-previews/wires-preview.png"
        alt="Visual workflow routing a new customer message by sales or support intent to a product catalog or team assignment"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function ChannelFeaturePills({ labels }) {
  const icons = [ShieldCheck, MessageSquare, Sparkles, MessageCircle];
  const colors = ['text-blue-400', 'text-rose-400', 'text-violet-400', 'text-purple-400'];

  return (
    <ul className="flex flex-wrap gap-2">
      {labels.map((label, index) => {
        const Icon = icons[index];
        return (
          <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121322] px-2.5 py-2 text-[10px] font-medium leading-none text-white/85">
            <Icon className={`h-3 w-3 shrink-0 ${colors[index]}`} />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function WhatsAppPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">WHATSAPP FOR BUSINESS</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          From first message.<br />To the next step.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Handle enquiries, share proposals and keep follow-ups organised in one WhatsApp conversation.
        </p>
        <ChannelFeaturePills labels={["Official API","Template Messaging","Automation","Live Chat"]} />
      </div>
      <Image
        src="/images/product-previews/whatsapp-sunglow-preview-v2.png"
        alt="SunGlow WhatsApp shopping conversation with sunscreen product details, cart and checkout"
        width={1351}
        height={1164}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function InstagramPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">INSTAGRAM DM AUTOMATION</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          From reel replies.<br />To ready-to-buy customers.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Help shoppers discover products and get the answers they need, right inside your Instagram DMs.
        </p>
        <ChannelFeaturePills labels={["Auto Reply","Comment to DM","Product Sharing","Analytics"]} />
      </div>
      <Image
        src="/images/product-previews/instagram-shopping-preview.png"
        alt="Instagram shopping conversations showing a reel reply, saree recommendations, product details and a checkout link"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function AiChatbotPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">YOUR EVERYDAY AI ASSISTANT</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          Ask a question.<br />Get a useful next step.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Turn questions, documents and ideas into clear answers and drafts you can review and use.
        </p>
        <ul className="space-y-2 text-[11px] leading-relaxed text-white/75">
          {['Summarise PDFs and find key details in images', 'Draft replies, meeting agendas and campaign copy', 'Refine answers with follow-up questions'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C084FC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/images/product-previews/ai-chatbot-preview.png"
        alt="Orbion AI assistant dashboard with a chat prompt, attachments and shortcuts for writing and document analysis"
        width={1564}
        height={1006}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function BroadcastPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">PERSONALISED CAMPAIGNS</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          Reach the right people.<br />Make every message count.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Send relevant offers and updates to selected customers, then see how your audience responds.
        </p>
        <ul className="space-y-2 text-[11px] leading-relaxed text-white/75">
          {['Segment customers by tags and activity', 'Personalise messages and schedule delivery', 'Track delivery, reads and link clicks'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C084FC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/images/product-previews/broadcast-preview.png"
        alt="Orbion broadcast campaign with audience segments, personalised messages, scheduled delivery and campaign analytics"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}

function CrmPreview() {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-5 h-full min-h-0 p-5 sm:p-6">
      <div className="min-w-0 text-left space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#C084FC]">PIPELINE & REVENUE</p>
        <h4 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white">
          Know your leads.<br />See what converts.
        </h4>
        <p className="text-xs leading-relaxed text-white/60">
          Keep customer details, deal progress and follow-ups together, with a clear view of sales performance.
        </p>
        <ul className="space-y-2 text-[11px] leading-relaxed text-white/75">
          {['Track leads from first contact to won deals', 'Prioritise prospects and plan the next follow-up', 'Monitor conversions, deal values and revenue'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C084FC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/images/product-previews/crm-analytics-preview.png"
        alt="CRM pipeline with lead stages, customer details, follow-up actions and revenue analytics"
        width={1536}
        height={1024}
        sizes="(max-width: 1280px) 35vw, 450px"
        className="block w-full h-full min-h-0 object-contain rounded-xl"
      />
    </div>
  );
}
