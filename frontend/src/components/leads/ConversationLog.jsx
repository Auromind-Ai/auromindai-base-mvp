'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowUpRight } from 'lucide-react';

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ConversationLog({ messages = [], conversationId }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#121218] p-6 space-y-6 shadow-2xl flex flex-col h-full">
      {/* Subtle indigo glow — top-right */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-[3px] text-zinc-400">
            Conversation Log
          </h3>
        </div>

        {conversationId && (
          <Link
            href={`/user/admin/inbox?conversation=${conversationId}`}
            className="group flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[2px] text-indigo-400 transition-all duration-200 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300"
          >
            Open Nexus
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Chat bubbles */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-[500px] space-y-4 pr-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="text-sm text-zinc-600">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl border border-white/10 p-4 text-sm leading-relaxed transition-colors duration-200 ${
                    isOutbound
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                      : 'bg-[#1a1a24] text-[#E5E5E5]'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="mt-1.5 px-1 text-[11px] text-zinc-600">
                  {formatTime(msg.sent_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
