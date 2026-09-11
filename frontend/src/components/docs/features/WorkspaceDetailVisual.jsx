'use client';

import { useState } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Paperclip,
  Globe,
  Search,
  Inbox,
  FileText,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Plus,
  MessageSquare,
  Check,
  Zap,
} from 'lucide-react';

const MODELS = [
  { id: 'auto', name: '✨ Auto' },
  { id: 'groq', name: '⚡ Fast (Groq)' },
  { id: 'sonnet', name: '🧠 Smart (Sonnet)' },
  { id: 'opus', name: '🧪 Deep (Opus)' },
  { id: 'gemini', name: '💡 Flash (Gemini)' },
];

const SOURCES = [
  { id: 'internal_web', label: 'All Sources', icon: Globe },
  { id: 'vector_db', label: 'Documents (Brain)', icon: FileText },
  { id: 'direct_storage', label: 'Email', icon: Inbox },
  { id: 'web_search', label: 'Web Search', icon: Search },
];

export default function WorkspaceDetailVisual() {
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [selectedSource, setSelectedSource] = useState('vector_db');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Top Workspace Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-900/40">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">AI Workspace</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                /user/admin/ai
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live NDJSON Streaming
          </span>
        </div>
      </div>

      {/* 2-Column Console Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[440px]">
        {/* Left Column: Chat Sessions History (4 cols) */}
        <div className="md:col-span-4 border-r border-white/10 p-3 bg-white/[0.015] flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            {/* New Chat Button */}
            <button className="w-full py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-white font-medium flex items-center justify-center gap-1.5 transition-all text-xs">
              <Plus className="w-3.5 h-3.5 text-violet-300" />
              <span>New Conversation</span>
            </button>

            {/* Sessions List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block px-1">
                Recent Sessions
              </span>

              {/* Active Session */}
              <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-white flex items-start gap-2 shadow-sm">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold truncate text-[11px]">
                    Enterprise SLA &amp; Refund Audit
                  </p>
                  <p className="text-[10px] text-violet-300/80 font-mono">
                    Active • 2m ago
                  </p>
                </div>
              </div>

              {/* Inactive Sessions */}
              <div className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-zinc-400 flex items-center gap-2 transition-colors cursor-pointer">
                <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate text-[11px]">Q3 Revenue PDF Summary</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-zinc-400 flex items-center gap-2 transition-colors cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate text-[11px]">Customer Onboarding Email Draft</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-zinc-400 flex items-center gap-2 transition-colors cursor-pointer">
                <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate text-[11px]">Competitor Pricing Research</span>
              </div>
            </div>
          </div>

          {/* Bottom Credits Telemetry */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Workspace Credits
              </span>
              <span className="text-emerald-300 font-bold">14,280 tok</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full w-[68%]" />
            </div>
          </div>
        </div>

        {/* Right Column: Chat Stream & Model Routing (8 cols) */}
        <div className="md:col-span-8 p-3.5 bg-black/25 flex flex-col justify-between space-y-3">
          {/* Top Controls: Models & Sources */}
          <div className="space-y-2 pb-2.5 border-b border-white/10">
            {/* Model Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-mono text-zinc-500 shrink-0 mr-1 uppercase">
                Model:
              </span>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all shrink-0 border ${
                    selectedModel === m.id
                      ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-950/40'
                      : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:bg-white/[0.06] hover:text-zinc-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* Source Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-mono text-zinc-500 shrink-0 mr-1 uppercase">
                Source:
              </span>
              {SOURCES.map((s) => {
                const IconComponent = s.icon;
                const isSelected = selectedSource === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSource(s.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-medium'
                        : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Stream */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {/* User Message with Attached PDF */}
            <div className="flex items-start gap-2.5 justify-end">
              <div className="space-y-1.5 max-w-[85%] text-right">
                <div className="p-2.5 rounded-2xl rounded-tr-none bg-violet-600/30 border border-violet-500/30 text-white text-xs leading-relaxed text-left">
                  What is our standard enterprise SLA uptime and refund policy for 50+ seats on annual billing?
                </div>
                {/* File Attachment Pill */}
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-mono">
                  <Paperclip className="w-3 h-3 text-violet-400" />
                  <span>enterprise-agreement-2026.pdf</span>
                  <span className="text-zinc-500 text-[9px]">• 1.4 MB</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Assistant Streaming Response */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-slate-900/60 border border-white/10 text-zinc-200 text-xs leading-relaxed space-y-2 flex-1 max-w-[92%]">
                {/* Citation Pill */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 w-fit">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>Grounding: Brain RAG • enterprise-agreement-2026.pdf (p.14)</span>
                </div>

                <p className="text-zinc-300">
                  According to Section 4.2 of your uploaded <strong>Enterprise Agreement</strong>:
                </p>
                <ul className="space-y-1 text-zinc-300 pl-3 border-l-2 border-violet-500/40 text-[11px]">
                  <li>
                    <strong className="text-white">Uptime Guarantee:</strong> 99.95% committed monthly availability with dedicated priority queueing.
                  </li>
                  <li>
                    <strong className="text-white">Refund Terms:</strong> Full prorated refund on remaining annual months upon 30-day written cancellation.
                  </li>
                </ul>

                {/* Footer Telemetry & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    <span>Sonnet • 112 tok • 185ms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors">
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors">
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Prompt Bar Mockup */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-black/60 border border-white/15">
              <button
                className="p-1 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-white/5 transition-colors"
                title="Attach PDF or Image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                readOnly
                value="Ask questions, summarize documents, or draft emails..."
                className="flex-1 bg-transparent text-[11px] text-zinc-400 outline-none select-none cursor-default"
              />
              <button className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1 font-semibold text-xs shadow-md shadow-violet-950/50">
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
