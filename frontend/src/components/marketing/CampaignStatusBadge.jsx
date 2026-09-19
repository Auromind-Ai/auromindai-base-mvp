'use client';

import React from 'react';
import { CheckCircle2, Clock, Send, PauseCircle, AlertCircle, FileText } from 'lucide-react';

const STATUS_CONFIGS = {
  Completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-[#0E845A]',
    shadow: 'shadow-[0_0_12px_rgba(14,132,90,0.4)]',
    border: 'border-[#10B981]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Scheduled: {
    label: 'Scheduled',
    icon: Clock,
    bg: 'bg-[#1E4BB8]',
    shadow: 'shadow-[0_0_12px_rgba(30,75,184,0.4)]',
    border: 'border-[#3B82F6]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Sending: {
    label: 'Sending',
    icon: Send,
    bg: 'bg-[#5E5CE6]',
    shadow: 'shadow-[0_0_12px_rgba(94,92,230,0.4)]',
    border: 'border-[#818CF8]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Paused: {
    label: 'Paused',
    icon: PauseCircle,
    bg: 'bg-[#9A5328]',
    shadow: 'shadow-[0_0_12px_rgba(154,83,40,0.4)]',
    border: 'border-[#F59E0B]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Draft: {
    label: 'Draft',
    icon: FileText,
    bg: 'bg-[#334155]',
    shadow: 'shadow-[0_0_10px_rgba(71,85,105,0.3)]',
    border: 'border-[#475569]/50',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Failed: {
    label: 'Failed',
    icon: AlertCircle,
    bg: 'bg-[#B91C1C]',
    shadow: 'shadow-[0_0_12px_rgba(185,28,28,0.4)]',
    border: 'border-[#EF4444]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
};

export default function CampaignStatusBadge({ status }) {
  const normalized = status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : 'Draft';
  const cfg = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.Draft;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.shadow || ''} shrink-0`}
    >
      <Icon size={13} className={`${cfg.iconColor} shrink-0`} />
      <span>{cfg.label}</span>
    </span>
  );
}
