'use client';

import React from 'react';
import { CheckCircle2, Clock, Send, PauseCircle, AlertCircle, FileText } from 'lucide-react';

const STATUS_CONFIGS = {
  Completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  Scheduled: {
    label: 'Scheduled',
    icon: Clock,
    bg: 'bg-blue-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/25',
    dot: 'bg-sky-400',
  },
  Sending: {
    label: 'Sending',
    icon: Send,
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400 animate-ping',
  },
  Paused: {
    label: 'Paused',
    icon: PauseCircle,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    dot: 'bg-amber-400',
  },
  Draft: {
    label: 'Draft',
    icon: FileText,
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-400',
  },
  Failed: {
    label: 'Failed',
    icon: AlertCircle,
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/25',
    dot: 'bg-rose-400',
  },
};

export default function CampaignStatusBadge({ status }) {
  const normalized = status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : 'Draft';
  const cfg = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.Draft;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}
