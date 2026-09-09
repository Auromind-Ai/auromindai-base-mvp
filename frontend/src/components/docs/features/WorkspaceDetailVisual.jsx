'use client';

import { useState } from 'react';
import {
  Bot,
  User,
  Wrench,
  Sparkles,
  Sliders,
  ChevronDown,
  Play,
  Terminal,
  Cpu,
  Zap,
} from 'lucide-react';

export default function WorkspaceDetailVisual() {
  const [selectedModel, setSelectedModel] = useState('Claude 3.5 Sonnet');
  const [temperature, setTemperature] = useState(0.2);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Studio Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-white text-sm">AI Workspace &amp; Agent Testing Studio</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
            Real-Time Token Stream
          </span>
        </div>
      </div>

      {/* 3-Column Studio Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
        {/* Col 1: Sessions & Instructions (3 cols) */}
        <div className="md:col-span-3 border-r border-white/10 p-3 bg-white/[0.01] space-y-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
              Agent System Prompt
            </span>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-zinc-300 leading-relaxed max-h-36 overflow-y-auto">
              &ldquo;You are Orbion Senior Sales Assistant. Always check Brain RAG before answering. Never offer discounts above 10% without admin approval.&rdquo;
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Active Sessions
            </span>
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-white font-medium">
              Lead Follow-up Test #4
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] text-zinc-400">
              Technical Support Dry-Run
            </div>
          </div>
        </div>

        {/* Col 2: Streaming Conversation Canvas (6 cols) */}
        <div className="md:col-span-6 border-r border-white/10 p-4 bg-black/30 flex flex-col justify-between">
          <div className="space-y-3">
            {/* User Message */}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 text-xs leading-relaxed max-w-[85%]">
                &ldquo;A prospect wants 50 seats with annual billing. What is the custom discount and SLA guarantee?&rdquo;
              </div>
            </div>

            {/* Dynamic Tool Calling Indicator */}
            <div className="ml-8 flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono w-fit">
              <Wrench className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Executing Tool: brain_vector_search(&ldquo;enterprise 50 seats pricing SLA&rdquo;)</span>
            </div>

            {/* Agent Streaming Answer */}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-md bg-[#814AC8] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-white text-xs leading-relaxed space-y-2 flex-1">
                <p>
                  For an organization with 50 seats on annual commitment, the standard discount is 15% with our Enterprise SLA providing 99.95% uptime and dedicated WhatsApp webhook queueing.
                </p>
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 pt-1 border-t border-white/5">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>Tokens streamed: 84 • Latency: 210ms • Temp: {temperature}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Input Form */}
          <div className="pt-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value="Simulate next conversational prompt..."
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-zinc-400 outline-none"
            />
            <button className="px-3 py-2 rounded-lg bg-[#814AC8] text-white flex items-center gap-1 font-semibold text-xs">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Col 3: Model & Execution Inspector (3 cols) */}
        <div className="md:col-span-3 p-3 bg-white/[0.01] space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
              LLM Model Routing
            </span>
            <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-white font-medium flex items-center justify-between">
              <span>{selectedModel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span>Temperature</span>
              <span className="text-violet-300 font-bold">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#814AC8]"
            />
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2 text-[11px] font-mono">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Execution Telemetry
            </span>
            <div className="flex justify-between text-zinc-300">
              <span>Input Tokens:</span>
              <span className="text-white">142</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Output Tokens:</span>
              <span className="text-white">84</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Tools Called:</span>
              <span className="text-cyan-400">1 (RAG)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
