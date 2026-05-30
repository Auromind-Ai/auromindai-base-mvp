'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Zap, Clock, ArrowDownLeft, Gift, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

function getWorkspaceId() {
    if (typeof window === 'undefined') return null;
    try {
        const ws = localStorage.getItem('workspace');
        if (ws) return JSON.parse(ws).id;
        const token = localStorage.getItem('access_token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.workspace_id;
        }
    } catch { }
    return null;
}

function AnimatedNumber({ value, duration = 800 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = display;
        const diff = value - start;
        if (diff === 0) return;
        const steps = 30;
        const stepTime = duration / steps;
        let current = 0;
        const timer = setInterval(() => {
            current++;
            setDisplay(Math.round(start + (diff * current) / steps));
            if (current >= steps) {
                setDisplay(value);
                clearInterval(timer);
            }
        }, stepTime);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{display.toLocaleString('en-IN')}</span>;
}

function UsageChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#71717A] text-sm gap-2">
                <Zap size={24} className="opacity-20" />
                <span>No usage data yet</span>
            </div>
        );
    }
    const max = Math.max(...data.map(d => d.credits_used), 1);
    return (
        <div className="flex items-end gap-1.5 h-full px-2">
            {data.map((d, i) => {
                const height = Math.max((d.credits_used / max) * 100, 4);
                return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#27272A] border border-white/10 text-white text-[11px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl font-medium tracking-wide">
                            {d.credits_used} cr <span className="text-[#A1A1AA] mx-1">•</span> {d.date?.slice(5)}
                        </div>
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: `${height}%`, opacity: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.05, type: 'spring', bounce: 0.2 }}
                            className="w-full rounded-t-sm bg-gradient-to-t from-indigo-600/40 hover:from-indigo-500/60 to-purple-400/80 hover:to-purple-300 transition-all duration-300"
                            style={{ minHeight: '4px' }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

function EntryBadge({ type }) {
    const config = {
        token_grant: { label: 'Credit Grant', color: 'emerald', icon: Gift },
        usage: { label: 'AI Usage', color: 'indigo', icon: Zap },
        usage_reservation: { label: 'Reserved', color: 'amber', icon: Clock },
        overage: { label: 'Overage', color: 'rose', icon: AlertTriangle },
    };
    const c = config[type] || { label: type, color: 'zinc', icon: Zap };
    const Icon = c.icon;
    const colors = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${colors[c.color]}`}>
            <Icon size={12} strokeWidth={2.5} />
            {c.label}
        </span>
    );
}

function CreditRing({ used, total, health }) {
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const remaining = total - used;
    const radius = 76;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;
    const ringColor = health === 'critical' ? '#F43F5E' : health === 'warning' ? '#F59E0B' : '#8B5CF6';
    const gradientId = `ring-grad-${health}`;

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 160 160">
                <defs>
                    <linearGradient id="ring-grad-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                    <linearGradient id="ring-grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#FCD34D" />
                    </linearGradient>
                    <linearGradient id="ring-grad-critical" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E11D48" />
                        <stop offset="100%" stopColor="#F43F5E" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {/* Track */}
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                {/* Progress */}
                <motion.circle
                    cx="80" cy="80" r={radius} fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    filter="url(#glow)"
                />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="text-4xl font-bold text-white tracking-tight leading-none"
                >
                    <AnimatedNumber value={Math.round(remaining)} />
                </motion.div>
                <div className="text-[11px] font-semibold text-[#A1A1AA] mt-2 uppercase tracking-widest">Credits Left</div>
            </div>
        </div>
    );
}

export default function CreditsPage() {
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyPage, setHistoryPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);

    const workspaceId = getWorkspaceId();

    const fetchData = useCallback(async (showRefresh = false) => {
        if (!workspaceId) return;
        if (showRefresh) setRefreshing(true);
        try {
            const [summaryData, historyData] = await Promise.all([
                api.getCreditSummary(workspaceId),
                api.getCreditHistory(workspaceId, historyPage),
            ]);
            setSummary(summaryData);
            setHistory(historyData);
        } catch (err) {
            console.error('Failed to load credit data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [workspaceId, historyPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const topUpPacks = [
        { name: 'Starter', credits: 50, price: 999, popular: false, desc: 'Perfect for exploring platform capabilities.' },
        { name: 'Growth', credits: 150, price: 2499, popular: true, desc: 'Ideal for scaling your active campaigns.' },
        { name: 'Scale', credits: 500, price: 9999, popular: false, desc: 'Maximum value for high-volume operations.' },
    ];

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-6 md:p-8">
                <div className="animate-pulse space-y-8">
                    <div className="h-10 bg-[#1A1A1A] rounded-xl w-64" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4 h-72 bg-[#121214] border border-white/5 rounded-2xl" />
                        <div className="lg:col-span-8 h-72 bg-[#121214] border border-white/5 rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1,2,3].map(i => <div key={i} className="h-64 bg-[#121214] border border-white/5 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    const s = summary || {
        credits_balance: 0, credits_added: 0, credits_used: 0,
        burn_rate: 0, days_remaining: -1, usage_percent: 0,
        health: 'healthy', daily_usage: [],
    };

    return (
        <div className="min-h-screen bg-[#09090B] text-[#EDEDED] font-sans pb-20">
            <div className="max-w-[1100px] mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* Header */}
                <div className="flex items-end justify-between mb-8 pb-6 border-b border-white/[0.06]">
                    <div>
                        <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                            Credits & Usage
                        </h1>
                        <p className="text-[#A1A1AA] text-sm mt-1.5 font-medium">Monitor your AI consumption, manage limits, and top up balance.</p>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#18181B] border border-white/10 hover:bg-[#27272A] hover:border-white/20 transition-all text-sm font-medium ${refreshing ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                        <RefreshCw size={14} className={`text-[#A1A1AA] ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Low Credit Alert */}
                <AnimatePresence>
                    {s.health === 'critical' && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mb-8 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-red-500/5 border border-rose-500/20 flex items-start sm:items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                                <AlertTriangle size={20} className="text-rose-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-rose-300 text-[15px] font-bold tracking-tight">Credits running critically low</div>
                                <div className="text-rose-400/80 text-sm mt-0.5">You have less than 20% credits remaining. Top up soon to avoid interruption to your AI automations.</div>
                            </div>
                            <button className="hidden sm:block px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-rose-500/20">
                                Top Up Now
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Primary Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                    
                    {/* Balance Overview */}
                    <div className="lg:col-span-5 bg-[#121214] rounded-[24px] p-8 border border-white/[0.06] shadow-xl relative overflow-hidden group">
                        {/* Soft Glow Background */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <h2 className="text-sm font-bold text-white mb-6 tracking-wide flex items-center gap-2">
                            <CreditCard size={16} className="text-indigo-400" /> Current Balance
                        </h2>
                        
                        <div className="flex flex-col items-center">
                            <CreditRing used={s.credits_used} total={s.credits_added || 100} health={s.health} />
                            
                            <div className="w-full mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-[#18181B] p-3.5 rounded-xl border border-white/[0.04]">
                                    <div className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">Burn Rate</div>
                                    <div className="text-lg font-bold text-white flex items-baseline gap-1">
                                        {s.burn_rate} <span className="text-xs text-[#71717A] font-medium">cr/day</span>
                                    </div>
                                </div>
                                <div className="bg-[#18181B] p-3.5 rounded-xl border border-white/[0.04]">
                                    <div className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">Est. Remaining</div>
                                    <div className="text-lg font-bold text-white">
                                        {s.days_remaining > 0 ? `~${Math.round(s.days_remaining)} days` : '∞'}
                                    </div>
                                </div>
                                <div className="bg-[#18181B] p-3.5 rounded-xl border border-white/[0.04] col-span-2 flex justify-between items-center">
                                    <div>
                                        <div className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1">Total Usage</div>
                                        <div className="text-[13px] font-medium text-white">
                                            <span className="text-rose-400 font-bold">{Math.round(s.credits_used).toLocaleString()}</span> 
                                            <span className="text-[#52525B] mx-1.5">/</span> 
                                            {Math.round(s.credits_added).toLocaleString()} cr
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                        <Zap size={18} className="text-indigo-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Usage Chart */}
                    <div className="lg:col-span-7 bg-[#121214] rounded-[24px] p-8 border border-white/[0.06] shadow-xl flex flex-col">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                                    <TrendingUp size={16} className="text-purple-400" /> Usage Trend
                                </h2>
                                <p className="text-[12px] text-[#A1A1AA] font-medium mt-1.5">Daily credit consumption over the last 30 days</p>
                            </div>
                            {s.daily_usage?.length > 0 && (
                                <div className="flex items-center gap-4 bg-[#18181B] px-3 py-1.5 rounded-lg border border-white/[0.04]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#71717A] font-semibold uppercase tracking-wider">Daily Avg</span>
                                        <span className="text-[13px] text-white font-bold">{(s.daily_usage.reduce((a, d) => a + d.credits_used, 0) / s.daily_usage.length).toFixed(1)}</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/[0.06]" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#71717A] font-semibold uppercase tracking-wider">Peak</span>
                                        <span className="text-[13px] text-white font-bold">{Math.max(...s.daily_usage.map(d => d.credits_used))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-h-[220px] bg-[#18181B] rounded-xl border border-white/[0.04] p-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                            <div className="relative z-10 h-full">
                                <UsageChart data={s.daily_usage} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Up Section */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white tracking-tight">Top Up Credits</h2>
                        <span className="text-[12px] text-[#A1A1AA] font-medium">Credits never expire</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topUpPacks.map((pack, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={pack.name}
                                className={`relative bg-[#121214] rounded-[24px] p-6 border flex flex-col group overflow-hidden cursor-pointer transition-all duration-300 ${pack.popular
                                        ? 'border-indigo-500/40 shadow-2xl shadow-indigo-500/10 hover:border-indigo-500/60'
                                        : 'border-white/[0.06] hover:border-white/20 hover:bg-[#18181B]'
                                    }`}
                            >
                                {/* Hover Glow */}
                                <div className="absolute -inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {pack.popular && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                                )}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`text-sm font-bold tracking-wide ${pack.popular ? 'text-indigo-400' : 'text-white'}`}>
                                        {pack.name} Pack
                                    </div>
                                    {pack.popular && (
                                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-indigo-500/20">
                                            Most Popular
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mb-2 flex items-baseline gap-1.5">
                                    <span className="text-4xl font-bold text-white tracking-tight">{pack.credits}</span>
                                    <span className="text-sm font-semibold text-[#71717A]">credits</span>
                                </div>
                                
                                <p className="text-[12px] text-[#A1A1AA] leading-relaxed min-h-[40px] mb-6">
                                    {pack.desc}
                                </p>
                                
                                <div className="mt-auto pt-6 border-t border-white/[0.06]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-2xl font-bold text-white">
                                            ₹{pack.price.toLocaleString('en-IN')}
                                        </div>
                                        <div className="text-[11px] font-medium text-[#71717A]">
                                            ₹{(pack.price / pack.credits).toFixed(1)} / credit
                                        </div>
                                    </div>
                                    
                                    <button
                                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${pack.popular
                                                ? 'bg-white text-black hover:bg-gray-200'
                                                : 'bg-[#27272A] text-white hover:bg-[#3F3F46]'
                                            }`}
                                    >
                                        Purchase <ArrowRight size={16} className={pack.popular ? "text-black" : "text-[#A1A1AA]"} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-[#121214] rounded-[24px] border border-white/[0.06] shadow-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-[#18181B]/50">
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Transaction History</h2>
                            <p className="text-[12px] text-[#A1A1AA] font-medium mt-1">
                                {history?.total || 0} entries found
                            </p>
                        </div>
                        {history && history.total > history.limit && (
                            <div className="flex items-center gap-3 bg-[#18181B] p-1 rounded-lg border border-white/[0.04]">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage <= 1}
                                    className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} className="text-[#A1A1AA]" />
                                </button>
                                <span className="text-[12px] text-[#A1A1AA] font-semibold min-w-[60px] text-center">
                                    Page {historyPage}
                                </span>
                                <button
                                    onClick={() => setHistoryPage(p => p + 1)}
                                    disabled={historyPage >= Math.ceil(history.total / history.limit)}
                                    className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={16} className="text-[#A1A1AA]" />
                                </button>
                            </div>
                        )}
                    </div>

                    {!history?.entries?.length ? (
                        <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-white/5 flex items-center justify-center mb-4">
                                <CreditCard size={28} className="text-[#52525B]" />
                            </div>
                            <h3 className="text-[#E4E4E7] text-sm font-bold tracking-wide">No transactions yet</h3>
                            <p className="text-[#71717A] text-xs mt-1.5 max-w-xs">Your credit purchases, grants, and usage history will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {history.entries.map((entry) => (
                                <div key={entry.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#18181B]/50 transition-colors group">
                                    <div className="flex items-start sm:items-center gap-4">
                                        <div className="mt-0.5 sm:mt-0">
                                            <EntryBadge type={entry.entry_type} />
                                        </div>
                                        <div>
                                            <div className="text-sm text-[#E4E4E7] font-semibold group-hover:text-white transition-colors">{entry.description || entry.entry_type}</div>
                                            <div className="text-[12px] text-[#71717A] mt-1 font-medium flex items-center gap-2">
                                                {entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-base font-bold tabular-nums flex items-center gap-1 ${entry.credits_delta > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {entry.credits_delta > 0 ? '+' : ''}{entry.credits_delta}
                                        <span className="text-[12px] text-[#71717A] font-semibold">cr</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
