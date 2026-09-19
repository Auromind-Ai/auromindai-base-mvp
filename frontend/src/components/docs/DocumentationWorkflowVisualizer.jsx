'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Cpu,
  GitBranch,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  Send,
  Database,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Trigger',
    sub: 'Customer Message',
    icon: MessageSquare,
    desc: 'Incoming message from WhatsApp, Instagram, or Webchat triggers the flow.',
    color: 'emerald',
  },
  {
    step: '02',
    title: 'Understand',
    sub: 'AI Intent & RAG',
    icon: Cpu,
    desc: 'LLM extracts customer intent, lead budget, sentiment, and queries the Brain.',
    color: 'violet',
  },
  {
    step: '03',
    title: 'Decide',
    sub: 'Conditional Rules',
    icon: GitBranch,
    desc: 'Flow logic branches based on lead score (>75 Hot Lead vs Support Inquiry).',
    color: 'cyan',
  },
  {
    step: '04',
    title: 'Act',
    sub: 'Lead & Agent',
    icon: UserCheck,
    desc: 'Creates CRM lead, notifies sales rep, and sends automated template reply.',
    color: 'amber',
  },
  {
    step: '05',
    title: 'Measure',
    sub: 'Telemetry & ROI',
    icon: CheckCircle2,
    desc: 'Logs response time, conversion outcome, token spend, and audit trace.',
    color: 'pink',
  },
];

export default function DocumentationWorkflowVisualizer({ className = '' }) {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#08090E]/90 p-5 sm:p-6 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300 mb-1">
            <Zap className="w-3 h-3 text-violet-400" aria-hidden="true" />
            <span>Workflow Pipeline</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Event-Driven Execution Flow
          </h3>
        </div>
        <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10 w-fit">
          <Clock className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
          <span>Continuous State Engine</span>
        </div>
      </div>

      {/* Pipeline Steps Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-2 pt-6">
        {WORKFLOW_STEPS.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeStep === index;

          return (
            <button
              key={item.step}
              onClick={() => setActiveStep(index)}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-violet-500/15 border-violet-500/50 shadow-lg shadow-violet-950/40 translate-y-[-2px]'
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? 'text-violet-300' : 'text-zinc-400'
                  }`}
                >
                  {item.step}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p
                  className={`text-xs font-semibold tracking-tight ${
                    isActive ? 'text-white' : 'text-zinc-300'
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">{item.sub}</p>
              </div>

              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-violet-400 shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Step Description Card */}
      <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Step {WORKFLOW_STEPS[activeStep].step} — {WORKFLOW_STEPS[activeStep].title} (
            {WORKFLOW_STEPS[activeStep].sub})
          </h4>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            {WORKFLOW_STEPS[activeStep].desc}
          </p>
        </div>
      </div>

      {/* Miniature Visual Logic Flowchart */}
      <div className="mt-5 pt-5 border-t border-white/10">
        <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-3">
          Runtime Node Execution Graph
        </span>

        <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Node 1 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white w-full md:w-auto justify-center">
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-poppins">Inbound Message</span>
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-400 hidden md:block" />

          {/* Node 2 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white w-full md:w-auto justify-center">
            <Database className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-poppins">RAG Vector Query</span>
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-400 hidden md:block" />

          {/* Node 3: Decision */}
          <div className="flex flex-col items-center gap-1 w-full md:w-auto">
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-center">
              Score &gt; 75?
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="text-emerald-400">Yes: Lead</span>
              <span>|</span>
              <span className="text-zinc-400">No: FAQ</span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-400 hidden md:block" />

          {/* Node 4: Action */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#814AC8]/20 border border-[#814AC8]/40 text-violet-200 w-full md:w-auto justify-center">
            <UserCheck className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-poppins">Assign Rep + Reply</span>
          </div>
        </div>
      </div>
    </div>
  );
}
