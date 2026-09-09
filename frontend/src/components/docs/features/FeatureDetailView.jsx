'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  Layers
} from 'lucide-react';
import DocumentationVideo from '@/components/docs/DocumentationVideo';
import DocumentationScreenshot from '@/components/docs/DocumentationScreenshot';

// Import all 8 bespoke feature visuals
import InboxDetailVisual from './InboxDetailVisual';
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

export default function FeatureDetailView({ config, prevArticle, nextArticle }) {
  const VisualComponent = VISUAL_COMPONENTS[config.visualKey] || null;

  return (
    <article className="w-full min-w-0 space-y-16 lg:space-y-24 pb-20 font-sans">
      {/* SECTION 1: OVERVIEW & PRODUCT UI (Content Left | UI Right) */}
      <section id="overview" className="scroll-mt-24">
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
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-violet-400 font-bold block">
                What is it?
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* Right: Product UI / Visual Component */}
          <div className="lg:col-span-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Product UI &amp; Simulator
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Console View</span>
              </div>
              {VisualComponent ? (
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
                  <VisualComponent />
                </div>
              ) : (
                <DocumentationScreenshot
                  alt={`${config.title} Product Interface`}
                  caption={`Interactive console view for ${config.title}`}
                  annotation="Live Interface"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WHY USE IT? (Video Left | Content Right) */}
      <section id="benefits" className="scroll-mt-24 pt-4 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Product Video / Media */}
          <div className="lg:col-span-6 order-2 lg:order-1 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Product Walkthrough Tour
              </span>
              {config.videoPlaceholder?.duration && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {config.videoPlaceholder.duration}
                </span>
              )}
            </div>
            <DocumentationVideo
              title={config.videoPlaceholder?.title || `Touring ${config.title}`}
              duration={config.videoPlaceholder?.duration}
              caption={config.videoPlaceholder?.description}
            />
          </div>

          {/* Right: Content */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1">
                Why use it?
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Core Capabilities &amp; Value
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Purpose-built operational advantages engineered for high-throughput teams.
              </p>
            </div>

            {/* Benefits Cards */}
            <div className="space-y-3">
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
      </section>

      {/* SECTION 3: CONFIGURATION & PIPELINE (Content Left | Product UI Right) */}
      <section id="configuration" className="scroll-mt-24 pt-4 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left: Content */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-pink-400 font-bold block mb-1">
                Configuration &amp; Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {config.architecture.title}
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                {config.architecture.description}
              </p>
            </div>

            {/* Setup Steps */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block font-mono">
                Configuration Milestones:
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
          </div>

          {/* Right: Product UI / Screenshot & Pipeline Stages */}
          <div className="lg:col-span-6 space-y-4">
            <DocumentationScreenshot
              alt={config.setupSteps?.[0]?.screenshotPlaceholder?.title || `${config.title} Configuration Screen`}
              caption={config.setupSteps?.[0]?.screenshotPlaceholder?.description || `Configuration and operational console for ${config.title}`}
              annotation="Console Configuration"
            />

            {/* 4 Pipeline Stages */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
                Execution Pipeline Stages:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {st.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: RESULT & VERIFICATION (Media Left | Content Right) */}
      <section id="verification" className="scroll-mt-24 pt-4 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Product Visual / Screenshot */}
          <div className="lg:col-span-6 order-2 lg:order-1 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Live Verification &amp; State Audit
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Status: Active</span>
            </div>
            <DocumentationScreenshot
              alt={`${config.title} Verification Console`}
              caption={`Operational execution trace verifying state transitions, telemetry, and handling for ${config.title}.`}
              annotation="Production SLA Verified"
            />
          </div>

          {/* Right: Content */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                Result &amp; Verification
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Target Operational SLA &amp; Outcome
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
                  Guaranteed Operational SLA:
                </span>
                {config.expectedOutcome}
              </div>
            </div>

            {/* Deterministic Verification Checklist */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                Verification Checklist:
              </span>
              <div className="space-y-2 text-xs sm:text-sm text-zinc-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Channel webhooks verified with valid HMAC signatures.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Active thread created and synchronized across connected consoles.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Audit trail logs each decision with exact timestamp and agent ID.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: REAL-WORLD SCENARIOS (if present) */}
      {config.useCases && config.useCases.length > 0 && (
        <section id="use-cases" className="scroll-mt-24 pt-4 border-t border-white/10 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
              Operational Scenarios
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Real-World Deployment Scenarios
            </h2>
            <p className="text-sm text-zinc-400">
              Proven deployment patterns implemented across production teams.
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
              Diagnostics
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Feature Troubleshooting &amp; Diagnostics
            </h2>
            <p className="text-sm text-zinc-400">
              Immediate resolutions for common configuration and runtime issues.
            </p>
          </div>

          <div className="space-y-3">
            {config.troubleshooting.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-2"
              >
                <div className="flex items-start gap-2 text-sky-300 font-semibold text-xs sm:text-sm">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                  <span>{item.question}</span>
                </div>
                <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                  <strong className="text-emerald-400 font-medium">Diagnostic: </strong>
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
