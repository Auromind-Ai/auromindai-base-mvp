'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Shield,
  Send,
  Phone,
  Instagram,
  Mail,
  Clock,
  Sparkles,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';

const SAMPLE_CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Priya Sharma',
    channel: 'WhatsApp',
    lastMessage: 'Can I see the 2BHK floor plans and pricing for Tower B?',
    time: '2m ago',
    status: 'AI Handling',
    statusColor: 'violet',
    leadScore: '88 • Hot',
    unread: true,
  },
  {
    id: 'c2',
    name: 'Rahul Varma',
    channel: 'Instagram',
    lastMessage: 'Is the weekend inspection slot still open for Saturday 4 PM?',
    time: '12m ago',
    status: 'Human Takeover',
    statusColor: 'amber',
    leadScore: '92 • Hot',
    unread: false,
  },
  {
    id: 'c3',
    name: 'Kavita Menon',
    channel: 'Webchat',
    lastMessage: 'Do you offer international bank financing or NRI loan support?',
    time: '35m ago',
    status: 'Waiting',
    statusColor: 'zinc',
    leadScore: '65 • Warm',
    unread: false,
  },
];

export default function InboxDetailVisual() {
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedConvo, setSelectedConvo] = useState(SAMPLE_CONVERSATIONS[0]);
  const [isTakeover, setIsTakeover] = useState(false);

  const channels = ['All', 'WhatsApp', 'Instagram', 'SMS', 'Webchat'];

  const filteredConvos =
    selectedChannel === 'All'
      ? SAMPLE_CONVERSATIONS
      : SAMPLE_CONVERSATIONS.filter((c) => c.channel === selectedChannel);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Top App Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white text-sm">Omni-Channel Collaborative Inbox</span>
          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-mono">
            WebSocket Live Sync
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
            Active Channel Routing
          </span>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
        {/* Col 1: Channel Selector (2 cols) */}
        <div className="md:col-span-3 border-r border-white/10 p-3 bg-white/[0.01] space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 block mb-2">
            Inbound Channels
          </span>
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                selectedChannel === ch
                  ? 'bg-[#814AC8]/20 text-white border border-[#814AC8]/40 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2">
                {ch === 'WhatsApp' && <Phone className="w-3.5 h-3.5 text-emerald-400" />}
                {ch === 'Instagram' && <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                {ch === 'SMS' && <MessageSquare className="w-3.5 h-3.5 text-blue-400" />}
                {ch === 'Webchat' && <MessageSquare className="w-3.5 h-3.5 text-violet-400" />}
                {ch === 'All' && <span className="w-3.5 h-3.5 text-center font-bold">#</span>}
                <span>{ch}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {ch === 'All' ? '3' : '1'}
              </span>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-white/10 px-2 space-y-2 text-[11px] text-zinc-400">
            <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
              Agent Queue State
            </span>
            <div className="flex items-center justify-between">
              <span>AI Active:</span>
              <span className="font-mono text-violet-300">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Human Escalate:</span>
              <span className="font-mono text-amber-300">1</span>
            </div>
          </div>
        </div>

        {/* Col 2: Conversation Queue (4 cols) */}
        <div className="md:col-span-4 border-r border-white/10 p-3 bg-black/20 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1 block mb-1">
            Active Threads ({filteredConvos.length})
          </span>

          {filteredConvos.map((c) => {
            const isSelected = selectedConvo.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedConvo(c)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-950/30 border-violet-500/50 shadow-md'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{c.name}</span>
                    {c.unread && (
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">{c.time}</span>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                  {c.lastMessage}
                </p>

                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono font-medium ${
                      c.statusColor === 'violet'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : c.statusColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-zinc-400 font-mono">{c.channel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Col 3: Live Conversation Dialogue & Takeover (5 cols) */}
        <div className="md:col-span-5 p-4 flex flex-col justify-between bg-black/40">
          <div>
            {/* Conversation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center font-bold text-violet-300 text-xs">
                  {selectedConvo.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{selectedConvo.name}</h4>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Source: {selectedConvo.channel} • Score: {selectedConvo.leadScore}
                  </span>
                </div>
              </div>

              {/* Human Takeover Switch */}
              <button
                onClick={() => setIsTakeover(!isTakeover)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  isTakeover
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-zinc-300 hover:text-white hover:bg-white/15'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>{isTakeover ? 'Human Intervened' : 'Take Over Chat'}</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="space-y-3 pt-1">
              {/* Customer Bubble */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 mt-1 shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 text-[11px] max-w-[85%] leading-relaxed">
                  {selectedConvo.lastMessage}
                </div>
              </div>

              {/* AI Draft Suggestion Box */}
              {!isTakeover ? (
                <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-violet-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      Suggested AI Response (Grounded in Brain)
                    </span>
                    <span className="font-mono text-emerald-400">Confidence: 96%</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    &ldquo;Hi {selectedConvo.name.split(' ')[0]}! Tower B features luxury 2BHK units starting from 1,240 sq.ft at ₹1.15 Cr. Would you like me to send the PDF floor plan on this WhatsApp number?&rdquo;
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button className="px-2.5 py-1 rounded-md bg-[#814AC8] text-white text-[10px] font-semibold hover:bg-[#9255dd] transition-colors">
                      Approve &amp; Send
                    </button>
                    <button className="px-2.5 py-1 rounded-md bg-white/5 text-zinc-300 text-[10px] hover:bg-white/10">
                      Edit Draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>AI bot paused. Sales agent has manual control of the thread.</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={isTakeover ? 'Type manual reply as sales agent...' : 'AI active — click Take Over to reply manually...'}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-zinc-400 outline-none"
            />
            <button className="p-2 rounded-lg bg-white/10 text-zinc-400">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
