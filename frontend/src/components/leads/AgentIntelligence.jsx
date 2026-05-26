'use client';

import { TrendingUp, Send, UserCheck, AlertCircle } from 'lucide-react';

export default function AgentIntelligence({ score, lead_tier }) {
  // Determine dynamic recommendations based on score and tier
  let actions = [];

  if (score >= 75 || lead_tier === 'hot') {
    actions = [
      {
        id: 'reply-fast',
        text: 'Reply immediately to capture high intent.',
        Icon: Send,
        color: 'emerald',
        iconClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/20',
      },
      {
        id: 'assign-human',
        text: 'Consider manual intervention / handoff.',
        Icon: UserCheck,
        color: 'blue',
        iconClass: 'text-blue-400',
        bgClass: 'bg-blue-500/10',
        borderClass: 'border-blue-500/20',
      }
    ];
  } else if (score >= 40 || lead_tier === 'warm') {
    actions = [
      {
        id: 'nurture',
        text: 'Send a nurturing follow-up template.',
        Icon: TrendingUp,
        color: 'amber',
        iconClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/20',
      }
    ];
  } else {
    actions = [
      {
        id: 'auto-pilot',
        text: 'Leave on AI auto-pilot until intent increases.',
        Icon: AlertCircle,
        color: 'zinc',
        iconClass: 'text-zinc-400',
        bgClass: 'bg-zinc-500/10',
        borderClass: 'border-zinc-500/20',
      }
    ];
  }

  return (
    <div className="relative rounded-2xl bg-[#121218] border border-white/5 p-5 overflow-hidden mt-4">
      <h3 className="relative text-[10px] font-semibold tracking-[0.15em] text-indigo-400 uppercase mb-4">
        Suggested Actions
      </h3>

      <div className="relative space-y-2.5">
        {actions.map(({ id, text, Icon, iconClass, bgClass, borderClass }) => (
          <div
            key={id}
            className={`group flex items-center gap-3 rounded-2xl border ${borderClass} ${bgClass} p-3
                        hover:border-white/10 hover:shadow-lg transition-all duration-200 cursor-default`}
          >
            <div className={`flex-shrink-0 ${iconClass}`}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <span className="text-[11px] leading-snug text-zinc-300">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
