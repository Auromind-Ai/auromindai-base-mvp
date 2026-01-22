'use client';

import Link from 'next/link';

export default function StatusBadge({ status = 'active' }) {
    const statusConfig = {
        active: {
            bg: 'bg-emerald-100',
            text: 'text-emerald-700',
            dot: 'bg-emerald-500',
            label: 'Active'
        },
        paused: {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            dot: 'bg-slate-400',
            label: 'Paused'
        },
        'needs-setup': {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            dot: 'bg-amber-500 animate-pulse',
            label: 'Needs Setup'
        }
    };

    const config = statusConfig[status] || statusConfig.active;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
        </span>
    );
}
