'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, Filter, Phone, Instagram, Globe, Mail,
    MessageSquare, Clock, User, ChevronDown, ArrowUpRight,
    TrendingUp, Check, MoreHorizontal, Star, Inbox, Zap, Users,
    FileText
} from 'lucide-react';
import AddLeadModal from '@/components/leads/AddLeadModal';
import ConvertLeadModal from '@/components/leads/ConvertLeadModal';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';
import MessageRenderer from '@/components/chat/MessageRenderer';

// ─── DATA META ────────────────────────────────────────────────────────────────

const CHANNEL_META = {
    Whatsapp: { icon: Phone,     gradient: 'from-[#25D366] to-[#128C7E]', dot: 'bg-emerald-400', label: 'Whatsapp',  textColor: 'text-emerald-400', scoreColor: 'text-emerald-400' },
    Instagram: { icon: Instagram, gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]', dot: 'bg-pink-400',    label: 'Instagram', textColor: 'text-pink-400',    scoreColor: 'text-pink-400'    },
    Web:       { icon: Globe,     gradient: 'from-[#3B82F6] to-[#1D4ED8]', dot: 'bg-sky-400',   label: 'Web',       textColor: 'text-sky-400',     scoreColor: 'text-sky-400'     },
    Email:     { icon: Mail,      gradient: 'from-[#F97316] to-[#EA580C]', dot: 'bg-orange-400', label: 'Email',     textColor: 'text-orange-400',  scoreColor: 'text-amber-400'   },
    Twilio:    { icon: Zap,       gradient: 'from-[#F22F46] to-[#CE272D]', dot: 'bg-red-500',    label: 'Twilio',    textColor: 'text-red-500',     scoreColor: 'text-red-500'     },
};

const TAG_META = {
    'Premium Lead': { bg: 'bg-[#7C3AED]/20', text: 'text-[#A78BFA]', border: 'border-[#7C3AED]/30' },
    'High Priority': { bg: 'bg-[#DC2626]/20', text: 'text-[#F87171]', border: 'border-[#DC2626]/30' },
    'Interested':    { bg: 'bg-[#059669]/20', text: 'text-[#34D399]', border: 'border-[#059669]/30' },
};

const TAG_PILL_META = {
    'High Priority': { bg: 'bg-[#7B1A2E]', text: 'text-white' },
    'Premium Lead':  { bg: 'bg-[#4B2580]', text: 'text-white' },
    'Interested':    { bg: 'bg-[#145A32]', text: 'text-white' },
    // Status mappings
    'New':           { bg: 'bg-[#1e293b]', text: 'text-zinc-300' },
    'Active':        { bg: 'bg-[#0f172a]', text: 'text-sky-400' },
    'Converted':     { bg: 'bg-[#1e1b4b]', text: 'text-purple-400' },
    'Lost':          { bg: 'bg-[#450a0a]', text: 'text-rose-400' },
};

const ANALYTICS_ICONS = {
    'Intent':          Zap,
    'Engagement':      TrendingUp,
    'Response Speed':  Clock,
    'Last active':     Clock,
};

const CHANNEL_THEME = {
    Whatsapp: {
        bubbleGradient: 'from-[#25D366] to-[#128C7E]',
        scoreColor: 'text-emerald-400',
        scoreBg: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
        accentBorder: 'border-emerald-500/20',
        accentGlow: 'shadow-emerald-500/5',
        buttonColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25',
        cardBorder: 'border-emerald-500/20 shadow-lg shadow-emerald-500/5',
        timelineIconBg: 'bg-emerald-500/10 border-emerald-500/20',
        timelineIconText: 'text-emerald-400',
        headerBorder: 'border-b border-emerald-500/10 shadow-lg shadow-emerald-500/[0.02]',
    },
    Instagram: {
        bubbleGradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
        scoreColor: 'text-pink-400',
        scoreBg: 'bg-pink-400/10 border-pink-400/20 text-pink-400',
        accentBorder: 'border-pink-500/20',
        accentGlow: 'shadow-pink-500/5',
        buttonColor: 'bg-pink-500/15 border-pink-500/30 text-pink-400 hover:bg-pink-500/25',
        cardBorder: 'border-pink-500/20 shadow-lg shadow-pink-500/5',
        timelineIconBg: 'bg-pink-500/10 border-pink-500/20',
        timelineIconText: 'text-pink-400',
        headerBorder: 'border-b border-pink-500/10 shadow-lg shadow-pink-500/[0.02]',
    },
    Twilio: {
        bubbleGradient: 'from-[#F22F46] to-[#CE272D]',
        scoreColor: 'text-red-500',
        scoreBg: 'bg-red-500/10 border-red-500/20 text-red-500',
        accentBorder: 'border-red-500/20',
        accentGlow: 'shadow-red-500/5',
        buttonColor: 'bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25',
        cardBorder: 'border-red-500/20 shadow-lg shadow-red-500/5',
        timelineIconBg: 'bg-red-500/10 border-red-500/20',
        timelineIconText: 'text-red-500',
        headerBorder: 'border-b border-red-500/10 shadow-lg shadow-red-500/[0.02]',
    },
    Email: {
        bubbleGradient: 'from-[#F97316] to-[#EA580C]',
        scoreColor: 'text-orange-400',
        scoreBg: 'bg-orange-400/10 border-orange-400/20 text-orange-400',
        accentBorder: 'border-orange-500/20',
        accentGlow: 'shadow-orange-500/5',
        buttonColor: 'bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25',
        cardBorder: 'border-orange-500/20 shadow-lg shadow-orange-500/5',
        timelineIconBg: 'bg-orange-500/10 border-orange-500/20',
        timelineIconText: 'text-orange-400',
        headerBorder: 'border-b border-orange-500/10 shadow-lg shadow-orange-500/[0.02]',
    },
    Web: {
        bubbleGradient: 'from-[#3B82F6] to-[#1D4ED8]',
        scoreColor: 'text-sky-400',
        scoreBg: 'bg-sky-400/10 border-sky-400/20 text-sky-400',
        accentBorder: 'border-sky-500/20',
        accentGlow: 'shadow-sky-500/5',
        buttonColor: 'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25',
        cardBorder: 'border-sky-500/20 shadow-lg shadow-sky-500/5',
        timelineIconBg: 'bg-sky-500/10 border-sky-500/20',
        timelineIconText: 'text-sky-400',
        headerBorder: 'border-b border-sky-500/10 shadow-lg shadow-sky-500/[0.02]',
    }
};

const getTheme = (channel) => CHANNEL_THEME[channel] || CHANNEL_THEME.Web;

// ─── HELPERS & MAPPERS ────────────────────────────────────────────────────────

const getChannelKey = (source) => {
    if (!source) return 'Web';
    const src = source.toLowerCase();
    if (src.includes('whatsapp')) return 'Whatsapp';
    if (src.includes('instagram')) return 'Instagram';
    if (src.includes('twilio') || src.includes('sms')) return 'Twilio';
    if (src.includes('web')) return 'Web';
    if (src.includes('email') || src.includes('mail')) return 'Email';
    return 'Web';
};

const getNormalizedTag = (tier) => {
    const t = (tier || '').toLowerCase();
    if (t === 'hot') return 'Premium Lead';
    if (t === 'warm') return 'Interested';
    return 'High Priority';
};

const formatAmount = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
};

const formatBudgetText = (min, max) => {
    if (min === null && max === null) return '₹0';
    if (min !== null && max === null) return `≥ ₹${formatAmount(min)}`;
    if (min === null && max !== null) return `≤ ₹${formatAmount(max)}`;
    return `₹${formatAmount(min)} - ₹${formatAmount(max)}`;
};

const formatLastActive = (dateStr) => {
    if (!dateStr) return 'never';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'never';
        const diffMs = new Date() - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString();
    } catch {
        return 'never';
    }
};

const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const getMessageDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return '';
    }
};

const formatTimelineTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (d.toDateString() === today.toDateString()) {
            return `Today ${timePart}`;
        }
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${timePart}`;
        }
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timePart}`;
    } catch {
        return '';
    }
};

const isOnline = (lastActivityAt) => {
    if (!lastActivityAt) return false;
    try {
        const diff = new Date() - new Date(lastActivityAt);
        return diff < 600000; // 10 minutes
    } catch {
        return false;
    }
};

const getLeadAvatar = (lead, detail) => {
    if (detail) {
        if (detail.profile_image) return detail.profile_image;
        if (detail.avatar_url) return detail.avatar_url;
        if (detail.contact_photo) return detail.contact_photo;
        if (detail.profile_pic) return detail.profile_pic;
    }
    if (lead) {
        if (lead.profile_image) return lead.profile_image;
        if (lead.avatar_url) return lead.avatar_url;
        if (lead.contact_photo) return lead.contact_photo;
        if (lead.profile_pic) return lead.profile_pic;
    }
    return null;
};

const getLeadInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const resolveLeadChannel = (lead, detail = null) => {
    const rawVal = (
        detail?.channel ||
        detail?.source ||
        detail?.conversation?.channel ||
        lead?.channel ||
        lead?.source ||
        'web'
    ).toString().toLowerCase();

    if (rawVal.includes('whatsapp')) return 'Whatsapp';
    if (rawVal.includes('instagram')) return 'Instagram';
    if (rawVal.includes('twilio') || rawVal.includes('sms')) return 'Twilio';
    if (rawVal.includes('email') || rawVal.includes('mail')) return 'Email';
    return 'Web';
};

const normalizeLead = (lead) => {
    if (!lead) return null;
    return {
        id: lead.lead_id || lead.id,
        name: lead.name || 'Unknown Lead',
        phone: lead.phone || '',
        source: lead.source || 'manual',
        channel: getChannelKey(lead.source),
        tag: getNormalizedTag(lead.lead_tier || lead.status),
        score: lead.score !== undefined ? lead.score : 0,
        value: formatBudgetText(lead.budget_min, lead.budget_max),
        prob: lead.breakdown?.intent?.score !== undefined 
            ? `${lead.breakdown.intent.score}%` 
            : (lead.semantic_intent_score !== undefined ? `${lead.semantic_intent_score}%` : '0%'),
        lastActive: formatLastActive(lead.last_activity_at),
        online: isOnline(lead.last_activity_at),
        lead_tier: lead.lead_tier || 'cold',
        status: lead.status || 'new',
        budget_min: lead.budget_min,
        budget_max: lead.budget_max,
        conversation_id: lead.conversation_id,
        assigned_to: lead.assigned_to,
        created_at: lead.created_at,
        ai_summary: lead.ai_summary || '',
        profile_image: lead.profile_image || lead.profile_pic || null,
        avatar_url: lead.avatar_url || null,
        contact_photo: lead.contact_photo || null,
        breakdown: lead.breakdown || null,
        avg_reply_minutes: lead.avg_reply_minutes !== undefined ? lead.avg_reply_minutes : null,
        is_converted: lead.is_converted || lead.status === 'converted',
        conversion_amount: lead.conversion_amount,
        converted_at: lead.converted_at,
        converted_product: lead.converted_product,
        conversion_notes: lead.conversion_notes
    };
};

function TagPill({ label, size = 'md' }) {
    const m = TAG_PILL_META[label] || { bg: 'bg-white/10', text: 'text-white' };
    const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-4 py-1.5';
    const fontSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    return (
        <span className={`inline-flex items-center ${padding} rounded-full ${fontSize} font-semibold ${m.bg} ${m.text}`}>
            {label}
        </span>
    );
}

const WhatsAppIcon = ({ className }) => (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#25D366"/>
        <path d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" fill="white"/>
    </svg>
);

const TwilioIcon = ({ className }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#F22F46"/>
        <circle cx="24" cy="24" r="9" fill="none" stroke="white" strokeWidth="3.5"/>
        <circle cx="24" cy="15.5" r="2.8" fill="white"/>
        <circle cx="24" cy="32.5" r="2.8" fill="white"/>
        <circle cx="15.5" cy="24" r="2.8" fill="white"/>
        <circle cx="32.5" cy="24" r="2.8" fill="white"/>
    </svg>
);

function ChannelAvatar({ channel, size = 'md', avatar = null, name = '' }) {
    const sz = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const iconSz = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;
    const [imgError, setImgError] = useState(false);
    const [prevAvatar, setPrevAvatar] = useState(avatar);

    if (avatar !== prevAvatar) {
        setPrevAvatar(avatar);
        setImgError(false);
    }

    // 1. Real profile image
    if (avatar && !imgError) {
        return (
            <div className={`${sz} rounded-2xl overflow-hidden flex-shrink-0 bg-white/5`}>
                <img
                    src={avatar}
                    alt={name || 'Avatar'}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    // 2. Custom Channel SVG/Gradients (WhatsApp, Twilio, Instagram)
    if (channel === 'Whatsapp') {
        return (
            <div className={`${sz} flex-shrink-0`}>
                <WhatsAppIcon className="w-full h-full" />
            </div>
        );
    }

    if (channel === 'Twilio') {
        return (
            <div className={`${sz} flex-shrink-0`}>
                <TwilioIcon className="w-full h-full" />
            </div>
        );
    }

    if (channel === 'Instagram') {
        return (
            <div className={`${sz} rounded-2xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shadow-lg flex-shrink-0`}>
                <Instagram size={iconSz} className="text-white" />
            </div>
        );
    }

    // 3. Fallback for other standard channels
    const hasChannelMeta = channel && CHANNEL_META[channel];
    const meta = hasChannelMeta ? CHANNEL_META[channel] : null;

    if (meta) {
        const Icon = meta.icon;
        return (
            <div className={`${sz} rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <Icon size={iconSz} className="text-white" />
            </div>
        );
    }

    // 4. Initials fallback
    if (name) {
        const initials = getLeadInitials(name);
        if (initials) {
            const textSz = size === 'lg' ? 'text-sm' : size === 'sm' ? 'text-[10px]' : 'text-xs';
            return (
                <div className={`${sz} rounded-2xl bg-zinc-850 border border-white/[0.04] flex items-center justify-center shadow-lg flex-shrink-0 text-white font-bold tracking-wider ${textSz}`}>
                    {initials}
                </div>
            );
        }
    }

    // 5. Default channel icon (Web/Globe fallback)
    const defaultMeta = CHANNEL_META.Web;
    const DefaultIcon = defaultMeta.icon;
    return (
        <div className={`${sz} rounded-2xl bg-gradient-to-br ${defaultMeta.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <DefaultIcon size={iconSz} className="text-white" />
        </div>
    );
}

function LeadSkeleton() {
    return (
        <div className="w-full p-4 rounded-2xl border border-white/[0.04] bg-[#111119] animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="h-4 bg-white/5 rounded w-2/3" />
                        <div className="h-4 bg-white/5 rounded w-8" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="h-4 bg-white/5 rounded w-1/3" />
                        <div className="h-3 bg-white/5 rounded w-12" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChatSkeleton() {
    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#07010F] animate-pulse">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0D0D17]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5" />
                    <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded w-32" />
                        <div className="h-3 bg-white/5 rounded w-16" />
                    </div>
                </div>
                <div className="w-24 h-8 bg-white/5 rounded" />
            </div>
            <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto">
                <div className="flex justify-start">
                    <div className="w-2/3 h-10 bg-white/5 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                    <div className="w-1/2 h-16 bg-white/5 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                    <div className="w-1/3 h-10 bg-white/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

// ─── LEADS PANEL ─────────────────────────────────────────────────────────────

function LeadsPanel({ leads, selected, onSelect, show, loading, totalCount, hasMore, onLoadMore, leadsDetails = {} }) {
    return (
        <div className={`
            w-full lg:w-[380px] flex-shrink-0
            flex flex-col
            bg-[#0D0D17] border-r border-white/[0.06]
            overflow-hidden
            ${show ? 'flex' : 'hidden lg:flex'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">All Leads</span>
                    <span className="text-xs text-zinc-500 font-medium">{totalCount}</span>
                </div>
                <button className="text-zinc-500 hover:text-zinc-300">
                    <ChevronDown size={16} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading && leads.length === 0 ? (
                    Array.from({ length: 6 }).map((_, idx) => <LeadSkeleton key={idx} />)
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm">
                        <Users className="w-8 h-8 mb-2 text-zinc-600" />
                        No leads found
                    </div>
                ) : (
                    leads.map(lead => {
                        const active = selected?.id === lead.id;
                        const chKey = resolveLeadChannel(lead, leadsDetails?.[lead.id]);
                        const theme = getTheme(chKey);
                        const scoreColor = lead.score >= 80 ? theme.scoreColor : lead.score >= 50 ? 'text-sky-400' : 'text-orange-400';
                        return (
                            <button
                                key={lead.id}
                                onClick={() => onSelect(lead)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border
                                    ${active
                                        ? `bg-[#16162A] ${theme.cardBorder}`
                                        : 'bg-[#111119] border-white/[0.04] hover:bg-[#16162A] hover:border-white/[0.08]'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <ChannelAvatar
                                        channel={resolveLeadChannel(lead, leadsDetails?.[lead.id])}
                                        size="md"
                                        avatar={getLeadAvatar(lead, leadsDetails?.[lead.id])}
                                        name={lead.name}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
                                            <span className={`text-sm font-bold ml-2 ${scoreColor}`}>{lead.score}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TagPill label={lead.tag} size="sm" />
                                            <span className="text-[10px] text-zinc-600 ml-auto">· {lead.lastActive}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer / Pagination */}
            {hasMore && (
                <div className="p-4 border-t border-white/[0.06]">
                    <button
                        onClick={onLoadMore}
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-[#16161F] border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-all font-medium disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load more leads'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── CHAT SECTION ─────────────────────────────────────────────────────────────

function ChatSection({ lead, leadDetail, onBack, onOpenInInbox, onConvert }) {
    const endRef = useRef(null);
    const [previewMedia, setPreviewMedia] = useState(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [leadDetail?.conversation_log]);

    if (!lead) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#07010F] text-zinc-500 p-6 text-center">
                <Inbox size={48} className="text-zinc-700 mb-4 animate-pulse" />
                <p className="text-base font-semibold text-zinc-400">Select a lead to start messaging</p>
                <p className="text-xs text-zinc-600 mt-1">Manage conversation logs, scores, and timeline history in real time.</p>
            </div>
        );
    }

    // Process, normalize, sort, and deduplicate messages
    const getNormalizedMessages = (log) => {
        if (!log) return [];
        const sorted = [...log].sort((a, b) => {
            const t1 = new Date(a.sent_at || a.timestamp);
            const t2 = new Date(b.sent_at || b.timestamp);
            return t1 - t2;
        });

        const unique = [];
        const seen = new Set();
        for (const m of sorted) {
            const id = m.id || `${m.sent_at}-${m.content}`;
            if (!seen.has(id)) {
                seen.add(id);
                unique.push(m);
            }
        }

        return unique.map(m => ({
            id: m.id,
            role: m.role || (m.direction === 'inbound' ? 'them' : 'me'),
            text: m.content || m.text || '',
            time: m.time || formatMessageTime(m.sent_at),
            sent_at: m.sent_at,
            type: m.type || null,
            fileName: m.fileName || null,
            fileSize: m.fileSize || null,
            caption: m.caption || null,
            metadata: m.metadata || null
        }));
    };

    const messagesToRender = getNormalizedMessages(leadDetail?.conversation_log);
    let lastDateLabel = '';

    const chKey = resolveLeadChannel(lead, leadDetail);
    const theme = getTheme(chKey);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#07010F]">
            {/* Lead Header */}
            <div className={`flex items-center justify-between px-6 py-4 bg-[#0D0D17] flex-shrink-0 ${theme.headerBorder}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10"
                    >
                        ←
                    </button>
                    <ChannelAvatar
                        channel={chKey}
                        size="lg"
                        avatar={getLeadAvatar(lead, leadDetail)}
                        name={lead.name}
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-white">{lead.name}</h2>
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${lead.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                                <span className={`text-xs font-medium ${lead.online ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {lead.online ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-white/5 border border-white/[0.06] px-2 py-0.5 rounded-full select-none">
                                <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">Preview Only</span>
                            </div>
                        </div>
                        <TagPill label={lead.tag} size="sm" />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Lead Score</div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${theme.scoreColor}`}>{lead.score}%</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${theme.scoreBg}`}>{lead.prob}</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">Last activity : {lead.lastActive}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {leadDetail && !leadDetail.is_converted && (
                            <button
                                onClick={onConvert}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shadow-lg shadow-emerald-500/5 active:scale-95"
                            >
                                <Check size={12} />
                                <span>Convert Lead</span>
                            </button>
                        )}
                        <button
                            onClick={onOpenInInbox}
                            disabled={!leadDetail?.conversation_id}
                            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-all
                                ${leadDetail?.conversation_id
                                    ? `${theme.buttonColor} hover:text-white cursor-pointer`
                                    : 'bg-white/5 border-white/[0.04] text-zinc-500 border-white/[0.04] cursor-not-allowed opacity-50'
                                }`}
                            title={!leadDetail?.conversation_id ? 'No conversation associated with this lead' : 'Open in Inbox'}
                        >
                            <ArrowUpRight size={14} />
                            <span className="hidden xs:inline">Open in Inbox</span>
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-all">
                            <MoreHorizontal size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:bg-white/10 transition-all">
                            <Star size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area (Preview Mode - Read Only) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 space-y-2 max-w-full">
                {messagesToRender.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm">
                        <MessageSquare className="w-8 h-8 mb-2 text-zinc-700" />
                        No messages in this conversation
                    </div>
                ) : (
                    messagesToRender.map((m, i) => {
                        const dateLabel = getMessageDateLabel(m.sent_at);
                        const showSeparator = dateLabel && dateLabel !== lastDateLabel;
                        if (showSeparator) {
                            lastDateLabel = dateLabel;
                        }
                        const isMe = m.role === 'me';
                        const isTimeValid = m.sent_at && !isNaN(new Date(m.sent_at).getTime());
                        const displayTime = isTimeValid ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.time;

                        return (
                            <div key={m.id || i} className="space-y-2">
                                {showSeparator && (
                                    <div className="flex items-center justify-center my-4">
                                        <span className="text-xs text-zinc-600 bg-[#111118] px-4 py-1 rounded-full border border-white/[0.04]">{dateLabel}</span>
                                    </div>
                                )}
                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[72%] px-4 py-3 ${!isMe ? 'rounded-[20px_20px_20px_6px] bg-[#252525]' : `rounded-[20px_20px_6px_20px] bg-gradient-to-br ${theme.bubbleGradient} border border-white/10 shadow-lg ${theme.accentGlow}`}`}
                                        style={!isMe 
                                            ? { borderBottomLeftRadius: '6px' } 
                                            : { borderBottomRightRadius: '6px' }
                                        }
                                    >
                                        <MessageRenderer
                                            content={m.text}
                                            metadata={m.metadata}
                                            isMe={isMe}
                                            theme={theme}
                                            onPreviewMedia={setPreviewMedia}
                                        />
                                        <p className="text-[10px] text-white/40 mt-1.5">
                                            {displayTime}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={endRef} />
            </div>

            {/* Media preview modal */}
            {previewMedia && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewMedia(null)}>
                    {previewMedia.type === 'image' ? (
                        <img src={previewMedia.url} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl" alt="preview" />
                    ) : (
                        <video src={previewMedia.url} controls autoPlay onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
                    )}
                </div>
            )}
        </div>
    );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────

function RightPanel({ lead, details, history, loadingHistory }) {
    if (!lead) {
        return (
            <div className="hidden xl:flex w-[380px] flex-shrink-0 flex-col bg-[#0D0D17] border-l border-white/[0.06] items-center justify-center text-zinc-500 text-sm p-6 text-center">
                <Users size={32} className="text-zinc-700 mb-2" />
                Select a lead to view details
            </div>
        );
    }

    const chKey = resolveLeadChannel(lead, details);
    const theme = getTheme(chKey);

    const tier = details?.lead_tier || lead.lead_tier || 'cold';
    let tierTitle = 'Cold Lead';
    let tierSubtitle = 'Low chance of conversion';
    if (tier.toLowerCase() === 'hot') {
        tierTitle = 'Very Hot Lead';
        tierSubtitle = 'High chance of conversion';
    } else if (tier.toLowerCase() === 'warm') {
        tierTitle = 'Warm Lead';
        tierSubtitle = 'Medium chance of conversion';
    }

    // Intent calculation (scaled)
    const intentScore = details?.semantic_intent_score || lead.semantic_intent_score || 0;
    const maxIntentScore = details?.breakdown?.intent?.max || 60;
    const intentPercent = maxIntentScore > 0 ? (intentScore / maxIntentScore) * 100 : 0;
    let intentValue = 'Low';
    let intentColor = 'text-orange-400';
    if (intentPercent >= 80) {
        intentValue = 'High';
        intentColor = theme.scoreColor;
    } else if (intentPercent >= 50) {
        intentValue = 'Medium';
        intentColor = 'text-sky-400';
    }

    // Engagement score calculation (uses full behavioral_score, max 60)
    const engScore = details?.behavioral_score !== undefined ? details.behavioral_score : (lead.behavioral_score || 0);
    let engValue = 'Low';
    let engColor = 'text-orange-400';
    if (engScore >= 45) {
        engValue = 'High';
        engColor = theme.scoreColor;
    } else if (engScore >= 24) {
        engValue = 'Medium';
        engColor = 'text-sky-400';
    }

    const avgReply = details?.avg_reply_minutes;
    let respValue = 'no response';
    let respColor = 'text-zinc-500';
    if (avgReply !== null && avgReply !== undefined) {
        if (avgReply <= 15) {
            respValue = 'Fast';
            respColor = 'text-emerald-400';
        } else if (avgReply <= 60) {
            respValue = 'Medium';
            respColor = 'text-sky-400';
        } else {
            respValue = 'Slow';
            respColor = 'text-orange-400';
        }
    }

    const leadAnalytics = [
        { label: 'Intent', value: intentValue, valueColor: intentColor },
        { label: 'Engagement', value: engValue, valueColor: engColor },
        { label: 'Response Speed', value: respValue, valueColor: respColor },
        { label: 'Last active', value: lead.lastActive, valueColor: 'text-zinc-300' }
    ];

    // Compute Timeline Events
    const getTimelineEvents = () => {
        const events = [];
        if (history && history.length > 0) {
            history.forEach(item => {
                let icon = Clock;
                let label = item.reason || 'Score changed';

                if (item.reason === 'manual_creation' || item.reason === 'manual_recalculation') {
                    icon = User;
                    label = item.reason === 'manual_creation' ? 'Lead created' : 'Manual score recalculation';
                } else if (item.reason.startsWith('node_')) {
                    icon = Zap;
                    label = `Flow node progress: ${item.reason.replace('node_', '').replace(/_/g, ' ')}`;
                } else if (item.reason === 'message_intent') {
                    icon = MessageSquare;
                    label = 'Interaction - intent signals processed';
                } else if (item.reason === 'converted') {
                    icon = Check;
                    label = 'Lead converted successfully';
                }
                
                events.push({
                    icon,
                    label,
                    time: formatTimelineTime(item.created_at || new Date())
                });
            });
        }

        const hasCreation = events.some(e => e.label === 'Lead created');
        if (!hasCreation && lead.created_at) {
            events.push({
                icon: User,
                label: 'Lead created',
                time: formatTimelineTime(lead.created_at)
            });
        }

        return events;
    };

    const timelineEvents = getTimelineEvents();

    const tagsToDisplay = [lead.tag];
    if (lead.status) {
        tagsToDisplay.push(lead.status.charAt(0).toUpperCase() + lead.status.slice(1));
    }

    const isLeadConverted = details?.is_converted || lead.status === 'converted' || lead.is_converted;

    return (
        <div className="hidden xl:flex w-[380px] flex-shrink-0 flex-col bg-[#0D0D17] border-l border-white/[0.06] overflow-y-auto">
            {/* Lead Overview */}
            <div className="p-5 border-b border-white/[0.06]">
                <h3 className="text-lg font-bold text-white mb-5">Lead Overview</h3>

                {isLeadConverted && (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit mx-auto mb-4">
                        ✓ Converted
                    </div>
                )}

                <div className="text-center mb-6">
                    <p className="text-[16px] font-bold text-white">{tierTitle}</p>
                    <p className="text-xs text-white/65 mt-1">{tierSubtitle}</p>
                </div>

                <div className="space-y-4">
                    {leadAnalytics.map(a => {
                        const Icon = ANALYTICS_ICONS[a.label] || Clock;
                        return (
                            <div key={a.label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                                    <Icon size={14} className="text-zinc-500" />
                                    {a.label}
                                </div>
                                <span className={`text-xs font-semibold ${a.valueColor}`}>{a.value}</span>
                            </div>
                        );
                    })}
                </div>

                {isLeadConverted && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Revenue</span>
                            <span className="font-bold text-emerald-400">₹{Number(details?.conversion_amount || lead?.conversion_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Product</span>
                            <span className="font-semibold text-white">{details?.converted_product || lead?.converted_product || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Converted On</span>
                            <span className="text-zinc-300">
                                {details?.converted_at || lead?.converted_at ? new Date(details?.converted_at || lead?.converted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </span>
                        </div>
                        {(details?.conversion_notes || lead?.conversion_notes) && (
                            <div className="text-xs mt-2 bg-[#07010F] p-2.5 rounded-lg border border-white/[0.04]">
                                <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">Conversion Notes</span>
                                <p className="text-zinc-400 break-words leading-relaxed">{details?.conversion_notes || lead?.conversion_notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tags and Status */}
            <div className="p-5 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white mb-4">Tags and status</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {tagsToDisplay.map(t => <TagPill key={t} label={t} />)}
                </div>
            </div>

            {/* Lead Timeline */}
            <div className="p-5">
                <h3 className="text-sm font-bold text-white mb-5">Lead Timeline</h3>
                {loadingHistory && timelineEvents.length === 0 ? (
                    <div className="space-y-5 animate-pulse">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/5 rounded w-1/2" />
                                <div className="h-2 bg-white/5 rounded w-1/4" />
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/5 rounded w-2/3" />
                                <div className="h-2 bg-white/5 rounded w-1/3" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {timelineEvents.map((t, i) => {
                            const Icon = t.icon;
                            return (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full ${theme.timelineIconBg} border border-white/[0.08] flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={14} className={theme.timelineIconText} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <p className="text-xs text-zinc-200 font-medium">{t.label}</p>
                                        <p className="text-[11px] text-zinc-600 mt-0.5">{t.time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <button className="w-full mt-6 py-3 rounded-xl bg-[#111119] border border-white/[0.08] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all font-medium">
                    View full timeline
                </button>
            </div>
        </div>
    );
}

// ─── MAIN APP PAGE ────────────────────────────────────────────────────────────

export default function LeadsPage() {
    const router = useRouter();

    const [leads, setLeads] = useState([]);
    const [selectedLeadId, setSelectedLeadId] = useState(null);
    const [leadsDetails, setLeadsDetails] = useState({});
    const [historyLogs, setHistoryLogs] = useState({});
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [view, setView] = useState('leads'); // 'leads' | 'chat'
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState({});
    const [historyLoading, setHistoryLoading] = useState(null);

    // Pagination states
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const LIMIT = 50;

    const activeFetchesRef = useRef({});

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch Leads List with pagination capability
    const fetchLeadsList = async (currentOffset = 0, isAppend = false) => {
        const workspaceId = getWorkspaceIdFromToken();
        if (!workspaceId) return;

        setLoading(true);
        try {
            const res = await api.get(`/lead-scoring/leads?workspace_id=${workspaceId}&limit=${LIMIT}&offset=${currentOffset}`);
            const normalizedItems = (res.items || []).map(normalizeLead);

            setLeads(prev => {
                const list = isAppend ? [...prev, ...normalizedItems] : normalizedItems;
                const unique = [];
                const seen = new Set();
                for (const item of list) {
                    if (!seen.has(item.id)) {
                        seen.add(item.id);
                        unique.push(item);
                    }
                }
                return unique;
            });

            setTotalCount(res.total || 0);
            setHasMore((currentOffset + LIMIT) < (res.total || 0));
            setOffset(currentOffset);
        } catch (err) {
            console.error('Failed to fetch leads list:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load High-Priority Selected Lead Details & History
    const fetchSelectedLeadData = async (leadId) => {
        if (!leadId) return;

        // Cancel previous request for this lead if it is currently in progress
        if (activeFetchesRef.current[leadId]) {
            activeFetchesRef.current[leadId].abort();
        }

        const controller = new AbortController();
        activeFetchesRef.current[leadId] = controller;

        setDetailsLoading(prev => ({ ...prev, [leadId]: true }));
        setHistoryLoading(leadId);

        const workspaceId = getWorkspaceIdFromToken();

        try {
            const [detailRes, historyRes] = await Promise.allSettled([
                api.get(`/lead-scoring/leads/${leadId}/detail?workspace_id=${workspaceId}`, {
                    signal: controller.signal
                }),
                api.get(`/lead-scoring/leads/${leadId}/history?workspace_id=${workspaceId}`, {
                    signal: controller.signal
                })
            ]);

            if (detailRes.status === 'fulfilled') {
                const detail = detailRes.value;
                const normalizedDetail = normalizeLead(detail);

                setLeadsDetails(prev => ({
                    ...prev,
                    [leadId]: {
                        ...normalizedDetail,
                        conversation_log: detail.conversation_log || [],
                        breakdown: detail.breakdown || null
                    }
                }));

                // Reconcile details back to main list
                setLeads(prev => prev.map(l => {
                    if (l.id === leadId) {
                        return {
                            ...l,
                            score: normalizedDetail.score,
                            tag: normalizedDetail.tag,
                            lastActive: normalizedDetail.lastActive,
                            status: normalizedDetail.status,
                            lead_tier: normalizedDetail.lead_tier,
                            profile_image: normalizedDetail.profile_image,
                            avatar_url: normalizedDetail.avatar_url,
                            contact_photo: normalizedDetail.contact_photo
                        };
                    }
                    return l;
                }));
            }

            if (historyRes.status === 'fulfilled') {
                const historyData = historyRes.value;
                setHistoryLogs(prev => ({
                    ...prev,
                    [leadId]: historyData.history || []
                }));
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Failed to load lead details:', err);
            }
        } finally {
            setDetailsLoading(prev => ({ ...prev, [leadId]: false }));
            setHistoryLoading(null);
            delete activeFetchesRef.current[leadId];
        }
    };

    // Sequential Background Prefetch Queue (Low Priority)
    useEffect(() => {
        if (leads.length === 0) return;

        let active = true;
        // Filter out leads that are already fetched or are currently fetching
        const prefetchQueue = leads.filter(l => !leadsDetails[l.id] && !activeFetchesRef.current[l.id]);

        const processQueue = async () => {
            for (const lead of prefetchQueue) {
                if (!active) break;
                if (lead.id === selectedLeadId) continue;
                if (activeFetchesRef.current[lead.id]) continue;

                try {
                    // Small delay to prevent network congestion
                    await new Promise((resolve, reject) => {
                        const t = setTimeout(resolve, 800);
                        if (!active) {
                            clearTimeout(t);
                            reject(new Error('unmounted'));
                        }
                    });

                    if (!active) break;

                    const controller = new AbortController();
                    activeFetchesRef.current[lead.id] = controller;

                    const workspaceId = getWorkspaceIdFromToken();
                    const detail = await api.get(`/lead-scoring/leads/${lead.id}/detail?workspace_id=${workspaceId}`, {
                        signal: controller.signal
                    });

                    if (active) {
                        const normalizedDetail = normalizeLead(detail);
                        setLeadsDetails(prev => ({
                            ...prev,
                            [lead.id]: {
                                ...normalizedDetail,
                                conversation_log: detail.conversation_log || []
                            }
                        }));
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.warn(`Background prefetch failed for lead ${lead.id}:`, err);
                    }
                } finally {
                    delete activeFetchesRef.current[lead.id];
                }
            }
        };

        processQueue();

        return () => {
            active = false;
        };
    }, [leads, selectedLeadId, leadsDetails]);

    // Initial load: fetch list & restore selected lead from URL parameters
    useEffect(() => {
        const activeFetches = activeFetchesRef.current;
        const init = async () => {
            let urlLeadId = null;
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                urlLeadId = params.get('leadId');
            }

            const workspaceId = getWorkspaceIdFromToken();
            if (!workspaceId) return;

            setLoading(true);
            try {
                const res = await api.get(`/lead-scoring/leads?workspace_id=${workspaceId}&limit=${LIMIT}&offset=0`);
                const normalizedItems = (res.items || []).map(normalizeLead);

                setLeads(normalizedItems);
                setTotalCount(res.total || 0);
                setHasMore(LIMIT < (res.total || 0));
                setOffset(0);

                if (normalizedItems.length > 0) {
                    // Reopen saved URL lead or fallback to first lead in list
                    const targetLead = normalizedItems.find(l => l.id === urlLeadId) || normalizedItems[0];
                    setSelectedLeadId(targetLead.id);
                    fetchSelectedLeadData(targetLead.id);
                }
            } catch (err) {
                console.error('Failed to initialize CRM:', err);
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            // Clean up and abort all active fetches on unmount
            Object.values(activeFetches).forEach(c => c.abort());
        };
    }, []);

    // Sync selectedLeadId to URL search parameters (history persistence)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (selectedLeadId) {
                params.set('leadId', selectedLeadId);
            } else {
                params.delete('leadId');
            }
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [selectedLeadId]);

    // Selection click handler
    const handleSelectLead = (leadId) => {
        setSelectedLeadId(leadId);
        fetchSelectedLeadData(leadId);
    };

    // Optimistic lead creation reconciliation
    const handleLeadCreated = (newLeadResponse) => {
        const newLead = normalizeLead(newLeadResponse);

        // Prepend optimistic lead instantly into list
        setLeads(prev => {
            if (prev.some(l => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
        });

        setTotalCount(prev => prev + 1);
        setSelectedLeadId(newLead.id);
        setView('chat');

        // Fetch details of new lead
        fetchSelectedLeadData(newLead.id);
    };

    const handleLeadConverted = (updatedLeadResponse) => {
        const updatedLead = normalizeLead(updatedLeadResponse);

        // Update lead list
        setLeads(prev => prev.map(l => {
            if (l.id === updatedLead.id) {
                return {
                    ...l,
                    ...updatedLead
                };
            }
            return l;
        }));

        // Update lead details cache
        setLeadsDetails(prev => {
            const current = prev[updatedLead.id] || {};
            return {
                ...prev,
                [updatedLead.id]: {
                    ...current,
                    ...updatedLead
                }
            };
        });

        // Refetch selected lead data to ensure everything is synced
        fetchSelectedLeadData(updatedLead.id);
    };

    // Open in Inbox navigation
    const handleOpenInInbox = () => {
        const leadDetail = leadsDetails[selectedLeadId];
        if (leadDetail?.conversation_id) {
            router.push(`/user/admin/inbox?conversationId=${leadDetail.conversation_id}`);
        }
    };

    // Filter leads list based on debounced search text
    const filteredLeads = leads.filter(lead => {
        const query = debouncedSearch.toLowerCase().trim();
        if (!query) return true;

        const matchName = lead.name?.toLowerCase().includes(query);
        const matchPhone = lead.phone?.toLowerCase().includes(query);

        // Search messages in cached details
        const detail = leadsDetails[lead.id];
        const matchMessages = detail?.conversation_log?.some(m =>
            (m.content || m.text || '').toLowerCase().includes(query)
        );

        return matchName || matchPhone || matchMessages;
    });

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    return (
        <div className="h-screen flex bg-[#07010F] text-white overflow-hidden font-sans">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-[56px] flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0D0D17] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-white">Leads & CRM</span>
                    </div>

                    <div className="relative hidden sm:block">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search leads, conversations..."
                            className="h-9 pl-9 pr-4 w-64 lg:w-80 rounded-xl bg-[#111119] border border-white/[0.06] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#7C4DFF]/30 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 h-9 rounded-xl border border-white/[0.06] bg-[#111119] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all">
                            <Filter size={14} />
                            <span className="hidden sm:inline">Filter</span>
                        </button>
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            className="flex items-center gap-2 px-3 h-9 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#6A3DE8] text-sm text-white font-semibold shadow-lg shadow-[#7C4DFF]/20 hover:opacity-90 transition-all"
                        >
                            <Plus size={14} />
                            <span className="hidden sm:inline">New Lead</span>
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    <LeadsPanel
                        leads={filteredLeads}
                        selected={selectedLead}
                        onSelect={l => { handleSelectLead(l.id); setView('chat'); }}
                        show={view === 'leads'}
                        loading={loading}
                        totalCount={totalCount}
                        hasMore={hasMore}
                        onLoadMore={() => fetchLeadsList(offset + LIMIT, true)}
                        leadsDetails={leadsDetails}
                    />
                    <div className={`flex-1 flex overflow-hidden ${view === 'leads' ? 'hidden lg:flex' : 'flex'}`}>
                        {detailsLoading[selectedLeadId] && !leadsDetails[selectedLeadId] ? (
                            <ChatSkeleton />
                        ) : (
                            <ChatSection
                                lead={selectedLead}
                                leadDetail={leadsDetails[selectedLeadId]}
                                onBack={() => setView('leads')}
                                onOpenInInbox={handleOpenInInbox}
                                onConvert={() => setShowConvertModal(true)}
                            />
                        )}
                        <RightPanel
                            lead={selectedLead}
                            details={leadsDetails[selectedLeadId]}
                            history={historyLogs[selectedLeadId]}
                            loadingHistory={historyLoading === selectedLeadId}
                        />
                    </div>
                </div>
            </div>

            {/* New Lead Modal popup */}
            {showAddLeadModal && (
                <AddLeadModal
                    isOpen={showAddLeadModal}
                    onClose={() => setShowAddLeadModal(false)}
                    onSuccess={handleLeadCreated}
                />
            )}

            {/* Convert Lead Modal popup */}
            {showConvertModal && (
                <ConvertLeadModal
                    isOpen={showConvertModal}
                    onClose={() => setShowConvertModal(false)}
                    lead={leadsDetails[selectedLeadId] || selectedLead}
                    onSuccess={handleLeadConverted}
                />
            )}
        </div>
    );
}