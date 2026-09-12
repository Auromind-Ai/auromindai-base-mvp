'use client';

import { useState } from 'react';
import {
  Workflow,
  GitBranch,
  Send,
  UserCheck,
  Sparkles,
  Sliders,
  CheckCircle2,
  Play,
  Settings,
  ArrowRight,
} from 'lucide-react';

export default function AutomationDetailVisual() {
  const [selectedNode, setSelectedNode] = useState('decision');

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Canvas Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-white text-sm">Visual Automation Wire &amp; Flow Canvas</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Graph Status: Validated
          </span>
        </div>
      </div>

      {/* Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
        {/* Left: Interactive Wire Canvas (8 cols) */}
        <div className="lg:col-span-8 p-6 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] bg-[#06070B] flex flex-col items-center justify-center relative">
          <div className="w-full max-w-md space-y-4 text-[11px]">
            {/* Node 1: Trigger */}
            <div
              onClick={() => setSelectedNode('trigger')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-lg ${
                selectedNode === 'trigger'
                  ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-[#0B0D13] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <span className="text-white font-bold block">Inbound Message Trigger</span>
                  <span className="text-[10px] text-zinc-400">WhatsApp / Instagram Webhook</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400">Trigger</span>
            </div>

            {/* Connecting Wire */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-violet-400 mx-auto" />

            {/* Node 2: AI Intent Classifier */}
            <div
              onClick={() => setSelectedNode('intent')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-lg ${
                selectedNode === 'intent'
                  ? 'bg-violet-950/40 border-violet-400 ring-2 ring-violet-500/20'
                  : 'bg-[#0B0D13] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-white font-bold block">AI Intent &amp; Urgency Parser</span>
                  <span className="text-[10px] text-zinc-400">Model: Fast Routing</span>
                </div>
              </div>
              <span className="text-[10px] text-violet-400">AI Evaluation</span>
            </div>

            {/* Connecting Wire */}
            <div className="w-0.5 h-6 bg-gradient-to-b from-violet-400 to-cyan-400 mx-auto" />

            {/* Node 3: Decision Split */}
            <div
              onClick={() => setSelectedNode('decision')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-lg ${
                selectedNode === 'decision'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/20'
                  : 'bg-[#0B0D13] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-white font-bold block">Decision Rule: Is High-Intent Lead?</span>
                  <span className="text-[10px] text-zinc-400">Condition: Score &gt;= 75</span>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400">Branching</span>
            </div>

            {/* Visual Fork Split */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* Branch YES */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-1">
                <span className="text-emerald-300 font-bold text-[10px] block">
                  Branch A: True (High Intent)
                </span>
                <span className="text-white text-xs font-semibold block">
                  Assign Closer &amp; Tag VIP
                </span>
              </div>

              {/* Branch NO */}
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
                <span className="text-zinc-400 font-bold text-[10px] block">
                  Branch B: False (FAQ)
                </span>
                <span className="text-zinc-300 text-xs font-semibold block">
                  Auto Reply via Brain RAG
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Node Properties Inspector (4 cols) */}
        <div className="lg:col-span-4 p-4 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#080A10] space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
              Node Configuration Inspector
            </span>
            <h4 className="text-sm font-bold text-white capitalize">
              Selected: {selectedNode} Node
            </h4>
          </div>

          <div className="space-y-3 text-[11px]">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Trigger Event</label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-white">
                messages.whatsapp.received
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Decision Metric</label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-cyan-300">
                lead.intent_score &gt;= 75
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Fallback Delay Timer</label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-zinc-300">
                120 seconds (if no agent pickup)
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-200">
            <span className="font-bold block mb-1">Live Validation Check</span>
            All graph ports linked. No circular deadlocks or disconnected endpoints detected.
          </div>
        </div>
      </div>
    </div>
  );
}
