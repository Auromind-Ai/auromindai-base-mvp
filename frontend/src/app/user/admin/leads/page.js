'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, Filter, Phone, Instagram, Globe, Mail,
    MessageSquare, Clock, User, ChevronDown, ArrowUpRight,
    Sparkles, Target, TrendingUp, Check, MoreHorizontal,
    Star, LayoutDashboard, Bot, Inbox, Zap, Users,
    Radio, Puzzle, Settings, LogOut, FileText, CreditCard,
    Send, Paperclip, Smile
} from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const CHANNEL_META = {
    Whatsapp: { icon: Phone,     gradient: 'from-[#25D366] to-[#128C7E]', dot: 'bg-emerald-400', label: 'Whatsapp',  textColor: 'text-emerald-400', scoreColor: 'text-emerald-400' },
    Instagram: { icon: Instagram, gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]', dot: 'bg-pink-400',    label: 'Instagram', textColor: 'text-pink-400',    scoreColor: 'text-pink-400'    },
    Web:       { icon: Globe,     gradient: 'from-[#3B82F6] to-[#1D4ED8]', dot: 'bg-sky-400',   label: 'Web',       textColor: 'text-sky-400',     scoreColor: 'text-sky-400'     },
    Email:     { icon: Mail,      gradient: 'from-[#F97316] to-[#EA580C]', dot: 'bg-orange-400', label: 'Email',     textColor: 'text-orange-400',  scoreColor: 'text-amber-400'   },
};

const TAG_META = {
    'Premium Lead': { bg: 'bg-[#7C3AED]/20', text: 'text-[#A78BFA]', border: 'border-[#7C3AED]/30' },
    'High Priority': { bg: 'bg-[#DC2626]/20', text: 'text-[#F87171]', border: 'border-[#DC2626]/30' },
    'Interested':    { bg: 'bg-[#059669]/20', text: 'text-[#34D399]', border: 'border-[#059669]/30' },
};

const LEADS = [
    { id: 1, name: 'Rahul Sharma', channel: 'Instagram', tag: 'Premium Lead', lastActive: 'now',   score: 85, value: '₹1.5L', prob: '12%', online: true  },
    { id: 2, name: 'Priya Patel',  channel: 'Whatsapp',  tag: 'High Priority',lastActive: 'now',   score: 19, value: '₹80K',  prob: '60%', online: false },
    { id: 3, name: 'Amit Kumar',   channel: 'Web',       tag: 'Interested',   lastActive: 'now',   score: 13, value: '₹2.5L', prob: '100%',online: false },
    { id: 4, name: 'Neha Reddy',   channel: 'Instagram', tag: 'Premium Lead', lastActive: 'now',   score: 11, value: '₹1.2L', prob: '65%', online: false },
    { id: 5, name: 'Vikram Singh', channel: 'Web',       tag: 'High Priority',lastActive: 'now',   score: 10, value: '₹95K',  prob: '45%', online: false },
    { id: 6, name: 'Karthik Raj',  channel: 'Whatsapp',  tag: 'Interested',   lastActive: 'now',   score: 10, value: '₹70K',  prob: '40%', online: false },
];

const MESSAGES = [
    { role: 'them', text: 'Hi, I would like to know about your product can you please explain?', time: '10:30 AM' },
    { role: 'me',   text: 'Hello Priya!\nSure, I\'d be happy to help you with that.\nWe have a few plans tailored to your needs.\nWould you like me to share the details?', time: '10:31 AM' },
    { role: 'them', text: 'Yes, please share the details', time: '10:32 AM' },
    { role: 'me',   type: 'file', fileName: 'Premium plans - Details.pdf', fileSize: '1.2 MB · PDF', caption: 'Here are the details of premium plans', time: '10:31 AM' },
    { role: 'them', text: 'Thank you, This helps a lot.', time: '10:32 AM' },
];

const TIMELINE = [
    { icon: User,        label: 'Lead created',              time: 'Today 10:25 AM' },
    { icon: Phone,       label: 'Phone verified',            time: 'Today 10:25 AM' },
    { icon: MessageSquare, label: 'Omini - conversation started', time: 'Today 10:25 AM' },
];

const TAGS_DISPLAY = ['High Priority', 'Premium Lead', 'Interested'];

const ANALYTICS = [
    { label: 'Engagement',      value: 'High',       valueColor: 'text-[#7C4DFF]' },
    { label: 'Responsive time', value: 'Fast',       valueColor: 'text-emerald-400' },
    { label: 'Last active',     value: 'Just now',   valueColor: 'text-zinc-300' },
];

const TAG_PILL_META = {
    'High Priority': { bg: 'bg-[#7B1A2E]', text: 'text-white' },
    'Premium Lead':  { bg: 'bg-[#4B2580]', text: 'text-white' },
    'Interested':    { bg: 'bg-[#145A32]', text: 'text-white' },
};

const ANALYTICS_ICONS = {
    'Engagement':      TrendingUp,
    'Responsive time': Clock,
    'Last active':     Clock,
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

// ─── AVATAR ───────────────────────────────────────────────────────────────────

function ChannelAvatar({ channel, size = 'md' }) {
    const meta = CHANNEL_META[channel];
    const Icon = meta.icon;
    const sz = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const iconSz = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;
    return (
        <div className={`${sz} rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon size={iconSz} className="text-white" />
        </div>
    );
}

function Tag({ label }) {
    const m = TAG_META[label] || { bg: 'bg-white/5', text: 'text-zinc-400', border: 'border-white/10' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${m.bg} ${m.text} ${m.border}`}>
            {label}
        </span>
    );
}

// ─── LEADS PANEL ─────────────────────────────────────────────────────────────
// WIDTH INCREASED: w-[300px] → w-[340px] to match design's wider left panel

function LeadsPanel({ leads, selected, onSelect, show }) {
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
                    <span className="text-xs text-zinc-500 font-medium">24</span>
                </div>
                <button className="text-zinc-500 hover:text-zinc-300">
                    <ChevronDown size={16} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {leads.map(lead => {
                    const active = selected?.id === lead.id;
                    const scoreColor = lead.score >= 80 ? 'text-[#7C4DFF]' : lead.score >= 50 ? 'text-sky-400' : 'text-orange-400';
                    return (
                        <button
                            key={lead.id}
                            onClick={() => onSelect(lead)}
                            className={`w-full text-left p-4 rounded-2xl transition-all border
                                ${active
                                    ? 'bg-[#16162A] border-[#7C4DFF]/20 shadow-lg shadow-[#7C4DFF]/5'
                                    : 'bg-[#111119] border-white/[0.04] hover:bg-[#16162A] hover:border-white/[0.08]'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <ChannelAvatar channel={lead.channel} size="md" />
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
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.06]">
                <button className="w-full py-2.5 rounded-xl bg-[#16161F] border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:bg-[#1e1e2e] transition-all font-medium">
                    View all leads
                </button>
            </div>
        </div>
    );
}

// CHAT SECTION

function ChatSection({ lead, onBack }) {
    const [msg, setMsg] = useState('');
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

    if (!lead) return null;

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#07010F]">
            {/* Lead Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0D0D17]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10"
                    >
                        ←
                    </button>
                    <ChannelAvatar channel={lead.channel} size="lg" />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-white">{lead.name}</h2>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-xs text-emerald-400 font-medium">Online</span>
                            </div>
                        </div>
                        <TagPill label={lead.tag} size="sm" />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Lead Score</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{lead.score}%</span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">{lead.prob}</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">Last activity : now</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-all">
                            <MoreHorizontal size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:bg-white/10 transition-all">
                            <Star size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {/* Date separator */}
                <div className="flex items-center justify-center">
                    <span className="text-xs text-zinc-600 bg-[#111118] px-4 py-1 rounded-full border border-white/[0.04]">Today</span>
                </div>

                {MESSAGES.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'me' ? 'justify-end' : 'justify-start'}`}>
                        {m.type === 'file' ? (
                            <div className="max-w-[60%] bg-[#814AC8] rounded-2xl rounded-tr-sm p-4 border border-white/10 shadow-lg shadow-[#7C4DFF]/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <FileText size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{m.fileName}</p>
                                        <p className="text-[10px] text-white/60">{m.fileSize}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-white/80">{m.caption}</p>
                                <p className="text-[10px] text-white/40 mt-2 text-right">{m.time}</p>
                            </div>
                        ) : m.role === 'me' ? (
                            <div className="max-w-[60%]">
                                <div className="bg-[#814AC8] px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-[#7C4DFF]/10 border border-white/10">
                                    <p className="text-sm text-white whitespace-pre-line">{m.text}</p>
                                </div>
                                <p className="text-[10px] text-zinc-700 mt-1 text-right px-1">{m.time}</p>
                            </div>
                        ) : (
                            <div className="max-w-[55%]">
                                <div className="bg-[#111119] border border-white/[0.06] px-4 py-3 rounded-2xl rounded-tl-sm shadow-md">
                                    <p className="text-sm text-zinc-200 whitespace-pre-line">{m.text}</p>
                                </div>
                                <p className="text-[10px] text-zinc-700 mt-1 px-1">{m.time}</p>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0D0D17]">
                <div className="flex items-center gap-3 bg-[#111119] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-[#7C4DFF]/40 transition-all">
                    <input
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                        placeholder="Type your message"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
                    />
                    <div className="flex items-center gap-2">
                        <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <Paperclip size={16} />
                        </button>
                        <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <Smile size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#6A3DE8] flex items-center justify-center shadow-lg shadow-[#7C4DFF]/20 hover:opacity-90 transition-all">
                            <Send size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────

function RightPanel() {
    return (
        <div className="hidden xl:flex w-[380px] flex-shrink-0 flex-col bg-[#0D0D17] border-l border-white/[0.06] overflow-y-auto">

            {/* Lead Overview */}
            <div className="p-5 border-b border-white/[0.06]">
                <h3 className="text-lg font-bold text-white mb-5">Lead Overview</h3>

                <div className="text-center mb-6">
                    <p className="text-[16px] font-bold text-white">Very Hot Lead</p>
                    <p className="text-xs text-white/65 mt-1">High chance of conversion</p>
                </div>

                <div className="space-y-4">
                    {ANALYTICS.map(a => {
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
            </div>

            {/* Tags */}
            <div className="p-5 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white mb-4">Tags and status</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {TAGS_DISPLAY.map(t => <TagPill key={t} label={t} />)}
                </div>
                <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Plus size={12} />
                    Add tag
                </button>
            </div>

            {/* Timeline */}
            <div className="p-5">
                <h3 className="text-sm font-bold text-white mb-5">Lead Timeline</h3>
                <div className="space-y-5">
                    {TIMELINE.map((t, i) => {
                        const Icon = t.icon;
                        return (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1A1A28] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                                    <Icon size={14} className="text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-xs text-zinc-200 font-medium">{t.label}</p>
                                    <p className="text-[11px] text-zinc-600 mt-0.5">{t.time}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button className="w-full mt-6 py-3 rounded-xl bg-[#111119] border border-white/[0.08] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all font-medium">
                    View full timeline
                </button>
            </div>
        </div>
    );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
    const [selected, setSelected] = useState(LEADS[0]);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('leads'); // 'leads' | 'chat'

    const filtered = LEADS.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="h-screen flex bg-[#07010F] text-white overflow-hidden font-sans">
            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-[56px] flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0D0D17] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-white">Leads & CRM</span>
                    </div>

                    <div className="relative hidden sm:block">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search leads, conversations..."
                            className="h-9 pl-9 pr-4 w-64 lg:w-80 rounded-xl bg-[#111119] border border-white/[0.06] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#7C4DFF]/30 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 h-9 rounded-xl border border-white/[0.06] bg-[#111119] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all">
                            <Filter size={14} />
                            <span className="hidden sm:inline">Filter</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 h-9 rounded-xl bg-[#814AC8] text-sm text-white font-semibold shadow-lg shadow-[#7C4DFF]/20 hover:opacity-90 transition-all">
                            <Plus size={14} />
                            <span className="hidden sm:inline">New Lead</span>
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    <LeadsPanel
                        leads={filtered}
                        selected={selected}
                        onSelect={l => { setSelected(l); setView('chat'); }}
                        show={view === 'leads'}
                    />
                    <div className={`flex-1 flex overflow-hidden ${view === 'leads' ? 'hidden lg:flex' : 'flex'}`}>
                        <ChatSection lead={selected} onBack={() => setView('leads')} />
                        <RightPanel />
                    </div>
                </div>
            </div>
        </div>
    );
}