'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    Calendar,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    Search
} from 'lucide-react';

const METRICS = [
    { label: 'Total Revenue', value: '₹12.4L', change: '+18.2%', trend: 'up', subtext: 'vs last month' },
    { label: 'Active Leads', value: '124', change: '+12%', trend: 'up', subtext: 'vs last week' },
    { label: 'Conversion Rate', value: '18%', change: '-2.1%', trend: 'down', subtext: 'vs target' },
    { label: 'Avg. Response Time', value: '12m', change: '8m', trend: 'neutral', subtext: 'improving' },
];

const ATTENTION_ITEMS = [
    { id: 1, name: 'Rahul Sharma', status: 'Documents Pending', time: '12 min ago', priority: 'high' },
    { id: 2, name: 'Priya Patel', status: 'Demo Not Scheduled', time: '45 min ago', priority: 'medium' },
    { id: 3, name: 'Amit Kumar', status: 'Follow-up Overdue', time: '2h ago', priority: 'high' },
    { id: 4, name: 'Sneha Gupta', status: 'Contract Review', time: '4h ago', priority: 'low' },
];

const AI_INSIGHTS = [
    { type: 'opportunity', text: '3 leads from LinkedIn show high engagement today.' },
    { type: 'optimization', text: 'WhatsApp messages sent between 2-4 PM convert 15% better.' },
];

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setTimeout(() => setMounted(true), 0); }, []);

    if (!mounted) return null;

    return (
        <div className="w-full min-h-screen bg-black text-[#d4d4d4] font-sans selection:bg-indigo-500/30 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#333335] pb-6 sm:pb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">Dashboard</h1>
                        <p className="text-sm text-[#71717a] mt-1">Overview of your business performance.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-transparent border border-[#333335] rounded-lg text-sm text-[#a1a1aa] hover:text-white transition-colors whitespace-nowrap">
                            <Calendar size={14} />
                            <span>Last 7 Days</span>
                            <ChevronDown size={14} className="opacity-50" />
                        </button>
                        <button className="p-2 bg-transparent border border-[#333335] rounded-lg text-[#a1a1aa] hover:text-white transition-colors relative shrink-0">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        </button>
                    </div>
                </header>

                {/* Metrics Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {METRICS.map((metric, i) => (
                        <div key={i} className="bg-transparent border border-[#333335] rounded-xl p-5 hover:border-indigo-500/30 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-[10px] font-black text-[#52525b] uppercase tracking-widest">{metric.label}</p>
                                <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${metric.trend === 'up' ? 'text-emerald-400' :
                                    metric.trend === 'down' ? 'text-red-400' :
                                        'text-[#52525b]'
                                    }`}>
                                    {metric.trend === 'up' ? <ArrowUpRight size={12} className="mr-1" /> :
                                        metric.trend === 'down' ? <ArrowDownRight size={12} className="mr-1" /> : null}
                                    {metric.change}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">{metric.value}</h3>
                                <p className="text-[10px] text-[#52525b] uppercase font-bold">{metric.subtext}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Action Center - Main Column */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-transparent border border-[#333335] rounded-xl overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-[#333335] flex items-center justify-between">
                                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle size={16} className="text-indigo-400" />
                                    Needs Attention
                                </h2>
                                <button className="text-[10px] uppercase font-black text-[#52525b] hover:text-[#a1a1aa] transition-colors">View All</button>
                            </div>
                            <div className="divide-y divide-[#333335]">
                                {ATTENTION_ITEMS.map((item) => (
                                    <div key={item.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#161617]/50 transition-colors group gap-4 sm:gap-0">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${item.priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                                item.priority === 'medium' ? 'bg-amber-500' :
                                                    'bg-[#52525b]'
                                                }`} />
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{item.name}</p>
                                                <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mt-0.5">{item.status}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-6 pl-6 sm:pl-0">
                                            <span className="text-[10px] text-[#52525b] font-black uppercase tracking-wider">{item.time}</span>
                                            <button className="p-1.5 hover:bg-[#1f1f20] rounded text-[#52525b] hover:text-white transition-colors">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-3 bg-[#0d0d0e]/50 border-t border-[#333335]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-center text-[#52525b]">Summary: {ATTENTION_ITEMS.length} active items</p>
                            </div>
                        </div>

                        {/* Recent Activity / Flow (Placeholder Design) */}
                        <div className="bg-transparent border border-[#333335] rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Today's Flow</h2>
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-[#161617] border border-[#333335] rounded text-emerald-400">Live</div>
                            </div>

                            <div className="relative pt-2 pb-6">
                                <div className="flex justify-between text-[10px] font-black text-[#52525b] uppercase tracking-wider mb-2">
                                    <span>New</span>
                                    <span>Working</span>
                                    <span>Review</span>
                                    <span>Closed</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#161617] rounded-full overflow-hidden flex">
                                    <div className="h-full bg-indigo-500/20 w-[30%]" />
                                    <div className="h-full bg-indigo-500/40 w-[20%]" />
                                    <div className="h-full bg-indigo-500/60 w-[15%]" />
                                    <div className="h-full bg-indigo-500 w-[35%]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                                {[
                                    { label: 'New', count: 42 },
                                    { label: 'Working', count: 28 },
                                    { label: 'Review', count: 12 },
                                    { label: 'Closed', count: 24 }
                                ].map((stat, i) => (
                                    <div key={i} className="text-center p-3 bg-[#161617]/30 border border-[#333335] rounded-lg">
                                        <p className="text-xl sm:text-2xl font-black text-white tracking-tighter">{stat.count}</p>
                                        <p className="text-[10px] text-[#52525b] font-black uppercase tracking-widest mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* AI Insights Card */}
                        <div className="bg-[#161617]/30 border border-indigo-500/20 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4 text-indigo-400">
                                <Sparkles size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">AI Insights</span>
                            </div>
                            <div className="space-y-3">
                                {AI_INSIGHTS.map((insight, i) => (
                                    <div key={i} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                                        <p className="text-sm text-indigo-100/70 leading-relaxed font-medium">{insight.text}</p>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10 transition-colors">
                                View Full Report
                            </button>
                        </div>

                        {/* Quick Stats / Mini Calendar */}
                        <div className="bg-transparent border border-[#333335] rounded-xl p-5">
                            <h3 className="text-[10px] font-black text-[#52525b] uppercase tracking-widest mb-4">Upcoming Schedule</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-[#161617] border border-[#333335] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                                        <span className="text-xs font-black">24</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Team Review</p>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[#52525b] mt-0.5">2:00 PM • Zoom</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-[#161617] border border-[#333335] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                                        <span className="text-xs font-black">25</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Product Launch</p>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[#52525b] mt-0.5">10:00 AM • Main Hall</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
