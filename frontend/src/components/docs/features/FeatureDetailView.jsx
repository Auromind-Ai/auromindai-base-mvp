'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './FeatureDetailView.module.css';
import { 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  Layers,
  ShieldAlert,
  Smartphone,
  UserCheck,
  Trash2,
  ExternalLink,
  Link2,
  Building2,
  KeyRound,
  Globe,
  Hash,
  ShieldCheck,
  Mail,
  Calendar,
  FileText
} from 'lucide-react';
import DocumentationVideo from '@/components/docs/DocumentationVideo';
import DocumentationScreenshot from '@/components/docs/DocumentationScreenshot';

// Import all 8 bespoke feature visuals
import InboxDetailVisual from './InboxDetailVisual';
import InboxChannelDemo from './InboxChannelDemo';
import BrainDetailVisual from './BrainDetailVisual';
import WorkspaceDetailVisual from './WorkspaceDetailVisual';
import LeadsDetailVisual from './LeadsDetailVisual';
import AutomationDetailVisual from './AutomationDetailVisual';
import GovernanceDetailVisual from './GovernanceDetailVisual';
import WalletDetailVisual from './WalletDetailVisual';
import IntegrationsDetailVisual from './IntegrationsDetailVisual';

const VISUAL_COMPONENTS = {
  inbox: InboxDetailVisual,
  brain: BrainDetailVisual,
  workspace: WorkspaceDetailVisual,
  leads: LeadsDetailVisual,
  automation: AutomationDetailVisual,
  governance: GovernanceDetailVisual,
  wallet: WalletDetailVisual,
  integrations: IntegrationsDetailVisual,
};

export default function FeatureDetailView({ config: baseConfig, prevArticle, nextArticle }) {
  const [walletType, setWalletType] = useState('ai');
  const config = baseConfig.walletVariants
    ? { ...baseConfig, ...baseConfig.walletVariants[walletType] }
    : baseConfig;
  const VisualComponent = VISUAL_COMPONENTS[config.visualKey] || null;

  // Flags used across sections (merged from both branches)
  const isInbox = config.visualKey === 'inbox';
  const alignPanels = config.visualKey === 'brain' || isInbox;
  const stretchBenefits = Boolean(config.screenshots?.benefits?.guideItems) || config.visualKey === 'leads';
  const isChannelType = ['integrations', 'instagram', 'twilio', 'email-calendar', 'templates'].includes(config.visualKey);

  // Guided setup step selection (used by the "default" clickable setup layout)
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const activeStep = config.setupSteps && config.setupSteps[selectedStepIndex]
    ? config.setupSteps[selectedStepIndex]
    : (config.setupSteps?.[0] || null);

  return (
    <article style={config.visualKey === 'wallet' ? { '--wallet-border': walletType === 'ai' ? 'rgba(167, 139, 250, 0.6)' : 'rgba(52, 211, 153, 0.7)', '--wallet-glow': walletType === 'ai' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)' } : undefined} className={`w-full min-w-0 space-y-16 lg:space-y-24 pb-20 ${alignPanels || config.visualKey === 'leads' ? `${styles.poppins} ${styles.screenshotFrames}` : config.visualKey === 'wallet' ? `${styles.poppins} ${styles.walletScreenshots}` : 'font-sans'} ${isInbox ? styles.inboxScreenshots : ''}`}>
      {/* SECTION 1: OVERVIEW & PRODUCT UI (Content Left | UI Right) */}
      <section id="overview" className="scroll-mt-24">
        {config.hideVisual || config.hideSimulator ? (
          <div className="max-w-4xl space-y-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <Link href="/docs" className="hover:text-white transition-colors">
                Docs
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <span className="text-zinc-300">Core Features</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <span className="text-violet-300 font-semibold truncate">
                {config.title}
              </span>
            </nav>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 uppercase tracking-wider font-mono">
                Feature {config.featureNumber} • {config.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Verified Module
              </span>
            </div>

            {/* Heading & Tagline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {config.title}
              </h1>
              <p className="text-base sm:text-lg text-violet-200/90 font-medium leading-relaxed">
                {config.tagline}
              </p>
            </div>

            {/* What is it? Box */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold block">
                What is it?
              </span>
              <p className="text-base text-zinc-300 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div className="lg:col-span-6 space-y-5">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <Link href="/docs" className="hover:text-white transition-colors">
                Docs
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <span className="text-zinc-300">Core Features</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <span className="text-violet-300 font-semibold truncate">
                {config.title}
              </span>
            </nav>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30 uppercase tracking-wider font-mono">
                Feature {config.featureNumber} &bull; {config.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Verified Module
              </span>
            </div>

            {/* Heading & Tagline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {config.title}
              </h1>
              <p className="text-base sm:text-lg text-violet-200/90 font-medium leading-relaxed">
                {config.tagline}
              </p>
            </div>

            {/* What is it? Box */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-violet-400 font-bold block">
                What is it?
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* Right: Product UI / Visual Component or Setup Video */}
          <div className="lg:col-span-6">
            {config.visualKey === 'integrations' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Official Setup Video Walkthrough
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                    Click Expand for Theater Mode
                  </span>
                </div>
                <DocumentationVideo
                  url={config.videoUrl || config.videoPlaceholder?.url}
                  fallbackUrl={config.videoFallbackUrl || config.videoPlaceholder?.fallbackUrl}
                  poster={config.videoPlaceholder?.poster}
                  title={config.videoPlaceholder?.title || `Touring ${config.title}`}
                  duration={config.videoPlaceholder?.duration}
                  caption={config.videoPlaceholder?.description}
                />
              </div>
            ) : config.visualKey === 'instagram' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Official Channel Integration
                  </span>
                  <span className="text-[10px] font-mono text-pink-400 font-semibold">Meta Business</span>
                </div>
                <DocumentationScreenshot
                  src={config.heroScreenshot || '/images/docs/whatsapp-connect/instagram/step_1.png'}
                  alt={`${config.title} Channels Dashboard`}
                  caption="Channels Console — Connect your Instagram Business account to Orbionagents"
                  annotation="Live Interface"
                />
              </div>
            ) : config.visualKey === 'twilio' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    Official Channel Integration
                  </span>
                  <span className="text-[10px] font-mono text-red-400 font-semibold">Twilio Powered</span>
                </div>
                <DocumentationScreenshot
                  src={config.heroScreenshot || '/images/docs/whatsapp-connect/twilio/t_step_1.png'}
                  alt={`${config.title} Channels Dashboard`}
                  caption="Channels Console — Connect your Twilio SMS & WhatsApp Gateway to Orbionagents"
                  annotation="Live Interface"
                />
              </div>
            ) : config.visualKey === 'email-calendar' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Official Workspace Integration
                  </span>
                  <span className="text-[10px] font-mono text-blue-400 font-semibold">Google Workspace</span>
                </div>
                <DocumentationScreenshot
                  src={config.heroScreenshot || '/images/docs/email-calendar/step_1.png'}
                  alt={`${config.title} Channels Dashboard`}
                  caption="Channels Console — Connect Gmail and Google Calendar to Orbion Agents"
                  annotation="Live Interface"
                />
              </div>
            ) : config.visualKey === 'templates' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    WhatsApp Template Studio
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Meta Approved</span>
                </div>
                <DocumentationScreenshot
                  src={config.heroScreenshot || '/images/docs/whatsapp_template/wt_step_1.png'}
                  alt={`${config.title} Templates Dashboard`}
                  caption="Message Templates Console — Create, preview, and dispatch Meta-approved WhatsApp templates"
                  annotation="Live Interface"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {config.visualKey !== 'wallet' && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {config.visualLabel || 'Live Product UI & Simulator'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Console View</span>
                  </div>
                )}
                {VisualComponent ? (
                  <div className={config.visualKey === 'brain' || config.visualKey === 'wallet' || config.visualFrameless ? '' : 'rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40'}>
                    <VisualComponent selected={walletType} onSelect={setWalletType} />
                  </div>
                ) : (
                  <DocumentationScreenshot
                    alt={`${config.title} Product Interface`}
                    caption={`Interactive console view for ${config.title}`}
                    annotation="Live Interface"
                  />
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </section>

      {/* SECTION 2: WHY USE IT? */}
      <section id="benefits" className="scroll-mt-24 pt-4 border-t border-white/10">
        {isChannelType || config.visualKey === 'governance' ? (
          /* For Integrations (WhatsApp & Instagram) / Governance: Full-width 2-column grid of capabilities */
          <div className="space-y-6">
            <div className="max-w-2xl">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1">
                Why use it?
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Core Capabilities &amp; Value
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {config.copy?.benefitsIntro || 'Purpose-built operational advantages engineered for high-throughput teams.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.benefits.map((b, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-xs shrink-0 mt-0.5 font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {b.title}
                      </h3>
                      {b.highlight && (
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {b.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Default: Media Left | Content Right (supports video or screenshot + guide items) */
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 ${stretchBenefits ? 'items-stretch' : config.visualKey === 'leads' ? 'items-start' : 'items-center'}`}>
            {/* Left: Product Video / Media */}
            <div className="lg:col-span-6 order-2 lg:order-1 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  {config.screenshots?.benefits?.label || 'Product Walkthrough Tour'}
                </span>
                {!config.screenshots?.benefits && config.videoPlaceholder?.duration && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    {config.videoPlaceholder.duration}
                  </span>
                )}
              </div>
              {config.screenshots?.benefits ? (
                <DocumentationScreenshot {...config.screenshots.benefits} />
              ) : (
                <DocumentationVideo
                  url={config.videoUrl || config.videoPlaceholder?.url}
                  fallbackUrl={config.videoFallbackUrl || config.videoPlaceholder?.fallbackUrl}
                  poster={config.videoPlaceholder?.poster}
                  title={config.videoPlaceholder?.title || `Touring ${config.title}`}
                  duration={config.videoPlaceholder?.duration}
                  caption={config.videoPlaceholder?.description}
                />
              )}
              {config.screenshots?.benefits?.guideItems && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    {config.screenshots.benefits.guideTitle}
                  </h3>
                  <dl className="space-y-3">
                    {config.screenshots.benefits.guideItems.map((item) => (
                      <div key={item.title} className="border-l-2 border-violet-500/40 pl-3">
                        <dt className="text-xs font-semibold text-zinc-200">{item.title}</dt>
                        <dd className="mt-1 text-xs text-zinc-400 leading-relaxed">{item.description}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Right: Content */}
            <div className={`lg:col-span-6 order-1 lg:order-2 ${stretchBenefits ? 'flex flex-col gap-4' : 'space-y-4'} ${config.visualKey === 'leads' ? 'lg:pt-11 lg:pb-6' : ''}`}>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1">
                  Why use it?
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Core Capabilities &amp; Value
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {config.copy?.benefitsIntro || 'Purpose-built operational advantages engineered for high-throughput teams.'}
                </p>
              </div>

              {/* Benefits Cards */}
              <div className={stretchBenefits ? 'grid gap-3 lg:flex-1 lg:auto-rows-fr' : 'space-y-3'}>
                {config.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">
                          {b.title}
                        </h3>
                        {b.highlight && (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {b.highlight}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2.5: MANDATORY PREREQUISITES & CONNECTION RULES */}
      {config.connectionRules && config.connectionRules.length > 0 && (
        <section id="connection-rules" className="scroll-mt-24 pt-4 border-t border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  Mandatory Prerequisites
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {config.rulesPolicyBadge || (
                    config.visualKey === 'twilio' 
                      ? 'Twilio Gateway Policy' 
                      : config.visualKey === 'email-calendar'
                      ? 'Google OAuth 2.0 Security'
                      : 'Strict Meta Policy'
                  )}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                {config.rulesTitle || (
                  config.visualKey === 'twilio'
                    ? 'Twilio Connect Rules & Requirements'
                    : config.visualKey === 'instagram'
                    ? 'Instagram Connect Rules & Requirements'
                    : config.visualKey === 'email-calendar'
                    ? 'Google Workspace Connect Rules & Requirements'
                    : 'WhatsApp Connect Rules & Requirements'
                )}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {config.rulesDescription || (
                  config.visualKey === 'twilio'
                    ? 'Review these essential credentials and webhook settings before activating your Twilio gateway.'
                    : config.visualKey === 'instagram'
                    ? 'Review these essential account prerequisites before connecting your Instagram Professional account.'
                    : config.visualKey === 'email-calendar'
                    ? 'Review these essential requirements before connecting your Google account for automated email & calendar scheduling.'
                    : 'Review these essential requirements before connecting your business number to ensure seamless Meta verification.'
                )}
              </p>
            </div>
            <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {config.rulesBadge || (
                  config.visualKey === 'twilio'
                    ? `${config.connectionRules.length} Core Prerequisites`
                    : config.visualKey === 'email-calendar'
                    ? `${config.connectionRules.length} Core Requirements`
                    : `${config.connectionRules.length} Golden Rules`
                )}
              </span>
            </div>
          </div>

          <div className={
            config.connectionRules.length === 4
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'
              : 'grid grid-cols-1 md:grid-cols-3 gap-5'
          }>
            {config.connectionRules.map((rule, idx) => {
              // Select channel-appropriate icons (no Trash icon for Instagram, Twilio, or Google Workspace!)
              let RuleIcon = ShieldAlert;
              if (config.visualKey === 'twilio') {
                const twilioIcons = [Hash, KeyRound, Smartphone, Globe];
                RuleIcon = twilioIcons[idx] || KeyRound;
              } else if (config.visualKey === 'instagram') {
                const instaIcons = [Building2, UserCheck, Link2];
                RuleIcon = instaIcons[idx] || Link2;
              } else if (config.visualKey === 'email-calendar') {
                const emailIcons = [Mail, ShieldCheck, Calendar];
                RuleIcon = emailIcons[idx] || Mail;
              } else if (config.visualKey === 'templates') {
                const templateIcons = [Smartphone, CheckCircle2, FileText];
                RuleIcon = templateIcons[idx] || FileText;
              } else {
                // WhatsApp
                const waIcons = [Smartphone, UserCheck, Trash2];
                RuleIcon = waIcons[idx] || ShieldAlert;
              }

              // Only WhatsApp rule 3 ("delete your existing WhatsApp account") warrants the red delete warning style
              const isAlert = config.visualKey === 'integrations' && idx === 2;

              const guidelineHeader = rule.guidelineLabel || (
                isAlert 
                  ? 'Required Action:' 
                  : config.visualKey === 'twilio' 
                  ? 'Twilio Guideline:' 
                  : config.visualKey === 'email-calendar'
                  ? 'Google Guideline:'
                  : 'Meta Guideline:'
              );

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                    isAlert
                      ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
                      : 'border-white/10 bg-slate-900/40 hover:border-violet-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isAlert
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          <RuleIcon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-xs font-bold text-zinc-400">
                          RULE {rule.ruleNumber}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isAlert
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {rule.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                      {rule.title}
                    </h3>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  {rule.details && (
                    <div
                      className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                        isAlert
                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-200/90'
                          : 'bg-white/[0.02] border-white/5 text-zinc-400'
                      }`}
                    >
                      <strong className={isAlert ? 'text-rose-300 block mb-0.5' : 'text-zinc-200 block mb-0.5'}>
                        {guidelineHeader}
                      </strong>
                      {rule.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: CONFIGURATION
          - isInbox (no zigzag/clickable): pipeline-style layout with InboxChannelDemo
          - channel types or generic features with setupSteps: guided walkthrough (zigzag or clickable+sticky)
          - everything else with an architecture/stages model: pipeline-style layout
      */}
      {!config.hideConfiguration && (
        !isInbox && config.setupSteps && config.setupSteps.length > 0 ? (
          <section id="configuration" className="scroll-mt-24 pt-4 border-t border-white/10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-pink-400 font-bold block mb-1">
                  Configuration &amp; Guided Setup
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {config.architecture?.title || 'Step-by-Step WhatsApp Onboarding Guide'}
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed mt-1">
                  {config.architecture?.description || 'Follow these video-verified steps to authenticate with Meta and activate your WhatsApp Cloud API integration.'}
                </p>
              </div>
              <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                {config.setupSteps?.length || 0} Video-Verified Steps
              </div>
            </div>

            {isChannelType ? (
              /* Alternating Zigzag Layout: Image Left / Explain Right & Image Right / Explain Left */
              <div className="space-y-8">
                {config.setupSteps.map((s, idx) => {
                  const isImageLeft = idx % 2 === 0;

                  const textBlock = (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold">
                          STEP {s.step < 10 ? `0${s.step}` : s.step}
                        </span>
                        {s.highlight && (
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs">
                            {s.highlight}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {s.title}
                      </h3>

                      <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                        {s.description}
                      </p>

                      {s.uiElements && s.uiElements.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
                            Key Actions on Screen:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {s.uiElements.map((elem, eIdx) => (
                              <span
                                key={eIdx}
                                className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                {elem}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  const imageBlock = (
                    <div className="space-y-2">
                      <DocumentationScreenshot
                        src={s.screenshot}
                        alt={s.caption || s.title}
                        caption={s.caption || s.description}
                        stepNumber={s.step}
                        aspectRatio={s.aspectRatio || 'aspect-[16/9]'}
                        objectFit={s.objectFit || 'cover'}
                        className={s.className || ''}
                        annotation={config.visualKey === 'email-calendar' ? 'Google Workspace' : 'Live Video Capture'}
                      />
                    </div>
                  );

                  return (
                    <div
                      key={s.step}
                      className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-slate-900/40 hover:border-violet-500/30 transition-all shadow-xl backdrop-blur-sm"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
                        {/* Left Column on Desktop */}
                        <div className={`lg:col-span-6 ${isImageLeft ? 'order-2 lg:order-1' : 'order-1 lg:order-1'}`}>
                          {isImageLeft ? imageBlock : textBlock}
                        </div>

                        {/* Right Column on Desktop */}
                        <div className={`lg:col-span-6 ${isImageLeft ? 'order-1 lg:order-2' : 'order-2 lg:order-2'}`}>
                          {isImageLeft ? textBlock : imageBlock}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Default Layout for other features: clickable milestone list + sticky preview */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-6 space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block font-mono mb-2">
                    Setup Milestones (Click to Inspect Screen):
                  </span>
                  {config.setupSteps.map((s, idx) => {
                    const isSelected = selectedStepIndex === idx;
                    return (
                      <div
                        key={s.step}
                        onClick={() => setSelectedStepIndex(idx)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'border-pink-500/60 bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-slate-900/60 shadow-lg shadow-pink-950/20'
                            : 'border-white/10 bg-slate-900/40 hover:bg-slate-900/70 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-md border flex items-center justify-center font-mono text-xs font-bold ${
                                isSelected
                                  ? 'bg-pink-500 text-white border-pink-400'
                                  : 'bg-pink-500/10 border-pink-500/20 text-pink-400'
                              }`}
                            >
                              {s.step}
                            </span>
                            <h3 className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                              {s.title}
                            </h3>
                          </div>
                          {s.highlight && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 hidden sm:inline-block">
                              {s.highlight}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed pl-8">
                          {s.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-24">
                  {activeStep && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                          <span className="text-xs font-mono text-pink-300 font-semibold uppercase tracking-wider">
                            Step {activeStep.step} of {config.setupSteps.length}: {activeStep.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">Click image to expand</span>
                      </div>

                      {activeStep.screenshot ? (
                        <DocumentationScreenshot
                          src={activeStep.screenshot}
                          alt={activeStep.caption || activeStep.title}
                          caption={activeStep.caption || activeStep.description}
                          stepNumber={activeStep.step}
                          aspectRatio={activeStep.aspectRatio || 'aspect-[16/9]'}
                          objectFit={activeStep.objectFit || 'cover'}
                          className={activeStep.className || ''}
                          annotation="Live Video Capture"
                        />
                      ) : (
                        <DocumentationScreenshot
                          alt={activeStep.screenshotPlaceholder?.title || `${config.title} Configuration Screen`}
                          caption={activeStep.screenshotPlaceholder?.description || `Configuration and operational console for ${config.title}`}
                          annotation="Console Configuration"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (isInbox || config.architecture) ? (
          <section id="configuration" className="scroll-mt-24 pt-4 border-t border-white/10">
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 ${alignPanels ? 'items-stretch' : 'items-start'}`}>
              {/* Left: Content */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-pink-400 font-bold block mb-1">
                    {config.copy?.setupLabel || 'Configuration & Workflow'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {config.architecture?.title}
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                    {config.architecture?.description}
                  </p>
                </div>

                {/* Setup Steps */}
                {config.setupSteps && config.setupSteps.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block font-mono">
                      {config.copy?.stepsLabel || 'Configuration Milestones:'}
                    </span>
                    {config.setupSteps.map((s) => (
                      <div
                        key={s.step}
                        className="p-3.5 rounded-xl border border-white/10 bg-slate-900/40 space-y-1.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-mono text-xs">
                            {s.step}
                          </span>
                          <h3 className="text-sm font-semibold text-white">
                            {s.title}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Product UI / Screenshot & Pipeline Stages */}
              <div className={`lg:col-span-6 ${alignPanels ? 'flex flex-col gap-4' : 'space-y-4'}`}>
                {isInbox ? <InboxChannelDemo /> : <DocumentationScreenshot
                  alt={config.setupSteps?.[0]?.screenshotPlaceholder?.title || `${config.title} Configuration Screen`}
                  caption={config.setupSteps?.[0]?.screenshotPlaceholder?.description || `Configuration and operational console for ${config.title}`}
                  annotation="Console Configuration"
                  {...config.screenshots?.setup}
                />}

                {/* Pipeline Stages */}
                {!isInbox && !config.hideWorkflowStages && config.architecture?.stages && (
                  <div className={`p-4 rounded-xl border border-white/10 bg-white/[0.02] ${alignPanels ? 'flex flex-col gap-3 lg:flex-1' : 'space-y-2.5'}`}>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
                      {config.copy?.stagesLabel || 'Execution Pipeline Stages:'}
                    </span>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${alignPanels ? 'lg:flex-1 auto-rows-fr' : ''}`}>
                      {config.architecture.stages.map((st) => (
                        <div key={st.number} className="p-2.5 rounded-lg border border-white/5 bg-black/40 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-violet-400 font-bold bg-violet-500/10 px-1.5 py-0.5 rounded">
                              S{st.number}
                            </span>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {st.name}
                            </span>
                          </div>
                          <p className={`text-[11px] text-zinc-400 ${alignPanels ? 'leading-relaxed' : 'line-clamp-2'}`}>
                            {st.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null
      )}

      {/* SECTION 4: RESULT & VERIFICATION (Media Left | Content Right) */}
      {!config.hideVerification && (config.activeConsoleScreenshot || config.expectedOutcome || config.screenshots?.verification) && (
      <section id="verification" className="scroll-mt-24 pt-4 border-t border-white/10">
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 ${isInbox ? 'items-stretch' : 'items-center'}`}>
          {/* Left: Product Visual / Screenshot */}
          <div className={`${isInbox ? 'lg:col-span-5' : 'lg:col-span-6'} order-2 lg:order-1 space-y-2`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {config.screenshots?.verification?.label || 'Live Verification & State Audit'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">{config.screenshots?.verification?.statusLabel || (config.screenshots?.verification ? 'Source Status' : 'Status: Active')}</span>
            </div>
            <DocumentationScreenshot
              src={config.activeConsoleScreenshot || config.setupSteps?.[config.setupSteps.length - 1]?.screenshot}
              alt={`${config.title} Active Channel Status`}
              caption={`Verified active status in Channels Console for ${config.title}.`}
              annotation="Operational & Active"
              {...config.screenshots?.verification}
            />

          </div>

          {/* Right: Content */}
          <div className={`${isInbox ? 'lg:col-span-7 flex flex-col gap-4' : 'lg:col-span-6 space-y-4'} order-1 lg:order-2`}>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                Result &amp; Verification
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {config.copy?.verificationTitle || 'Active Integration & Expected Outcome'}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                What to verify in your console after completing setup.
              </p>
            </div>

            {/* Expected Outcome Callout */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
                <span className="font-semibold block text-emerald-300 mb-1">
                  {config.copy?.outcomeLabel || 'Active Features & Capabilities:'}
                </span>
                {config.expectedOutcome}
              </div>
            </div>

            {/* Verification Checklist */}
            <div className={`p-4 rounded-xl border border-white/10 bg-white/[0.02] ${isInbox ? 'flex flex-col gap-3' : 'space-y-2'}`}>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                Verification Checklist:
              </span>
              <div className={`${isInbox ? 'grid gap-4' : 'space-y-2'} text-xs sm:text-sm text-zinc-300`}>
                {(config.verificationChecklist || [
                  'Channels dashboard displays a green "✓ Connected" status badge.',
                  `AI Agent replies conversationally to incoming customer ${config.title} messages 24/7.`,
                  'Automated workflows and interactive message templates trigger instantly.'
                ]).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {config.contactGuide && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">{config.visualKey === 'leads' ? 'Understanding Lead Overview' : 'Understanding Contact Details'}</h3>
                <dl className="space-y-3">
                  {config.contactGuide.map((item) => <div key={item.title}><dt className="text-xs font-semibold text-zinc-200">{item.title}</dt><dd className="text-xs text-zinc-400 leading-relaxed mt-1">{item.description}</dd></div>)}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {config.featureGuides?.map((guide) => (
        <section key={guide.title} className="pt-4 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {guide.screenshot && <DocumentationScreenshot {...guide.screenshot} />}
          <div className={`space-y-4 ${guide.screenshot ? '' : 'lg:col-span-2'}`}>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{guide.title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{guide.description}</p>
            {guide.layout === 'alternating' ? (
              <div className="space-y-8 lg:space-y-10">
                {guide.items.map((item, index) => (
                  <div key={item.title} className={`grid items-center gap-6 md:grid-cols-2 md:gap-12 ${index ? 'border-t border-white/10 pt-8 lg:pt-10' : 'pt-2'}`}>
                    <div className={`flex justify-center ${index % 2 ? 'md:order-2' : ''}`}>
                      {item.screenshot && <DocumentationScreenshot {...item.screenshot} className="w-full max-w-[700px]" aspectRatio="h-[220px] sm:h-[260px] lg:h-[280px] [&_img]:object-contain [&_img]:!scale-100" />}
                    </div>
                    <div className={`mx-auto w-full max-w-[680px] space-y-3 md:px-5 lg:px-10 ${index % 2 ? 'md:order-1' : ''}`}>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Step {index + 1}</span>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white">{item.title.replace(/^\d+\.\s*/, '')}</h3>
                      <p className="max-w-xl text-sm leading-relaxed text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <dl className={guide.screenshot ? 'space-y-3' : 'grid gap-3 md:grid-cols-2'}>
              {guide.items.map((item) => (
                <div key={item.title} data-wallet-image-card={config.visualKey === 'wallet' && item.screenshot ? '' : undefined} className={`p-4 rounded-xl border border-white/10 bg-white/[0.02] ${item.fullWidth ? 'md:col-span-2' : ''}`}>
                  <dt className="text-sm font-semibold text-white">{item.title}</dt>
                  <dd className="mt-1 text-xs text-zinc-400 leading-relaxed">{item.description}</dd>
                  {item.screenshot && <div className="mt-4"><DocumentationScreenshot {...item.screenshot} /></div>}
                </div>
              ))}
            </dl>}
          </div>
        </section>
      ))}

      {/* SECTION 5: REAL-WORLD SCENARIOS (if present) */}
      {config.useCases && config.useCases.length > 0 && (
        <section id="use-cases" className="scroll-mt-24 pt-4 border-t border-white/10 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
              {config.copy?.useCasesLabel || 'Operational Scenarios'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {config.copy?.useCasesTitle || 'Real-World Deployment Scenarios'}
            </h2>
            <p className="text-sm text-zinc-400">
              {config.copy?.useCasesIntro || 'Proven deployment patterns implemented across production teams.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.useCases.map((uc, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:border-amber-500/30 transition-all space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                    {i + 1}
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">
                    {uc.title}
                  </h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="text-zinc-400">
                    <strong className="text-zinc-300">Challenge: </strong>
                    {uc.scenario}
                  </p>
                  <p className="text-zinc-300">
                    <strong className="text-amber-400">Solution: </strong>
                    {uc.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: TROUBLESHOOTING (if present) */}
      {config.troubleshooting && config.troubleshooting.length > 0 && (
        <section id="troubleshooting" className="scroll-mt-24 pt-4 border-t border-white/10 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold block">
              FAQ &amp; Troubleshooting
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {config.copy?.troubleshootingTitle || 'Feature Troubleshooting & Common Questions'}
            </h2>
            <p className="text-sm text-zinc-400">
              {config.copy?.troubleshootingIntro || `Clear answers and solutions to common questions when connecting and managing ${config.title}.`}
            </p>
          </div>

          <div className="space-y-3">
            {config.troubleshooting.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-2 hover:border-sky-500/30 transition-all"
              >
                <div className="flex items-start gap-2 text-sky-300 font-semibold text-xs sm:text-sm">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                  <span>{item.question}</span>
                </div>
                <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                  <strong className="text-emerald-400 font-medium">{config.copy?.answerLabel || 'Answer:'} </strong>
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation Footer */}
      <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {prevArticle ? (
          <Link
            href={`/docs/${prevArticle.slug}`}
            className="w-full sm:w-auto p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 flex items-center gap-3 transition-all group text-left"
          >
            <ArrowLeft className="w-4 h-4 text-violet-400 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">
                Previous Guide
              </span>
              <span className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate max-w-[200px] block">
                {prevArticle.title}
              </span>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextArticle && (
          <Link
            href={`/docs/${nextArticle.slug}`}
            className="w-full sm:w-auto p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 flex items-center justify-between sm:justify-end gap-3 transition-all group text-right ml-auto"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">
                Next Guide
              </span>
              <span className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate max-w-[200px] block">
                {nextArticle.title}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        )}
      </footer>
    </article>
  );
}