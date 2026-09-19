'use client';

import React from 'react';
import { CheckCircle2, Clock, Send, PauseCircle, AlertCircle, FileText } from 'lucide-react';

const STATUS_CONFIGS = {
  Completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-[#0d281e]',
    text: 'text-[#22c55e]',
    border: 'border-[#155e3c]',
    iconColor: 'text-[#22c55e]',
  },
  Scheduled: {
    label: 'Scheduled',
    icon: Clock,
    bg: 'bg-[#0f223d]',
    text: 'text-[#38bdf8]',
    border: 'border-[#1d4ed8]',
    iconColor: 'text-[#38bdf8]',
  },
  Sending: {
    label: 'Sending',
    icon: Send,
    bg: 'bg-[#23123b]',
    text: 'text-[#c084fc]',
    border: 'border-[#7e22ce]',
    iconColor: 'text-[#c084fc]',
  },
  Paused: {
    label: 'Paused',
    icon: PauseCircle,
    bg: 'bg-[#2e1f0a]',
    text: 'text-[#f59e0b]',
    border: 'border-[#854d0e]',
    iconColor: 'text-[#f59e0b]',
  },
  Draft: {
    label: 'Draft',
    icon: FileText,
    bg: 'bg-[#161922]',
    text: 'text-[#94a3b8]',
    border: 'border-[#2a3347]',
    iconColor: 'text-[#94a3b8]',
  },
  Failed: {
    label: 'Failed',
    icon: AlertCircle,
    bg: 'bg-[#2b1118]',
    text: 'text-[#f87171]',
    border: 'border-[#991b1b]',
    iconColor: 'text-[#f87171]',
  },
};

export default function CampaignStatusBadge({ status }) {
  const normalized = status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : 'Draft';
  const cfg = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.Draft;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}
    >
      <Icon size={13} className={`${cfg.iconColor} shrink-0`} />
      <span>{cfg.label}</span>
    </span>
  );
}
