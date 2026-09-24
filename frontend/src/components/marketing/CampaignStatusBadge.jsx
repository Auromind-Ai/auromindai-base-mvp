'use client';

import React from 'react';
import { CheckCircle2, Clock, PauseCircle, FileText } from 'lucide-react';

function Spinner({ size = 13, className = '', style = {} }) {
  return (
    <svg
      className={`animate-spin shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 0.85s linear infinite', ...style }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-95"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

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
    icon: Spinner,
    spin: true,
    bg: 'bg-[#5E5CE6]',
    shadow: 'shadow-[0_0_12px_rgba(94,92,230,0.4)]',
    border: 'border-[#818CF8]/40',
    text: 'text-white',
    iconColor: 'text-white',
  },
  In_progress: {
    label: 'Sending',
    icon: Spinner,
    spin: true,
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
};

export default function CampaignStatusBadge({ status }) {
  const rawStatus = (status || '').toLowerCase();
  let normalized = 'Draft';
  if (rawStatus === 'in_progress' || rawStatus === 'sending') {
    normalized = 'Sending';
  } else if (rawStatus === 'scheduled') {
    normalized = 'Scheduled';
  } else if (rawStatus === 'paused') {
    normalized = 'Paused';
  } else if (rawStatus === 'draft' || rawStatus === 'pending') {
    normalized = 'Draft';
  } else {
    // completed, failed, cancelled or any finished state maps to Completed
    normalized = 'Completed';
  }
  const cfg = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.Completed;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.shadow || ''} shrink-0`}
    >
      <Icon
        size={13}
        className={`${cfg.iconColor} ${cfg.spin ? 'animate-spin' : ''} shrink-0`}
        style={cfg.spin ? { animation: 'spin 0.85s linear infinite' } : undefined}
      />
      <span>{cfg.label}</span>
    </span>
  );
}
