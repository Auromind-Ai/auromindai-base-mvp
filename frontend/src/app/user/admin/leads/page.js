'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Filter,
    Phone,
    Instagram,
    Globe,
    Mail,
    MessageSquare,
    CheckCircle2,
    Clock,
    User,
    ChevronDown,
    ArrowUpRight,
    Sparkles,
    CheckSquare,
    MoreHorizontal,
    Target,
    TrendingUp,
    Check
} from 'lucide-react';

const CHANNELS = {
    whatsapp: { icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    instagram: { icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    web: { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    email: { icon: Mail, color: 'text-orange-400', bg: 'bg-orange-400/10' },
};

const STATUSES = [
    { id: 'new', label: 'New', color: 'bg-blue-500' },
    { id: 'progress', label: 'In Progress', color: 'bg-indigo-500' },
    { id: 'docs', label: 'Docs Pending', color: 'bg-amber-500' },
    { id: 'won', label: 'Won', color: 'bg-emerald-500' },
];

const INITIAL_LEADS = [
    { id: 1, name: 'Rahul Sharma', channel: 'whatsapp', status: 'new', score: 85, lastActive: '2m ago', value: '₹1.5L', prob: '82%', unread: true },
    { id: 2, name: 'Priya Patel', channel: 'instagram', status: 'progress', score: 72, lastActive: '15m ago', value: '₹80K', prob: '60%', unread: false },
    { id: 3, name: 'Amit Kumar', channel: 'web', status: 'won', score: 94, lastActive: '1h ago', value: '₹2.5L', prob: '100%', unread: false },
    { id: 4, name: 'Sneha Reddy', channel: 'whatsapp', status: 'docs', score: 78, lastActive: '3h ago', value: '₹1.2L', prob: '65%', unread: true },
    { id: 5, name: 'Vikram Singh', channel: 'email', status: 'new', score: 64, lastActive: '1d ago', value: '₹95K', prob: '45%', unread: false },
];

const MOCK_MESSAGES = [
    { role: 'them', text: 'Hi, I need help with the business loan application.', time: '10:30 AM' },
    { role: 'me', text: 'Hello! I can certainly help. Which documents do you have ready?', time: '10:32 AM' },
    { role: 'them', text: 'I have my PAN and Aadhaar, but need to fetch bank statements.', time: '10:33 AM' },
];

const MOCK_TASKS = [
    { id: 1, label: 'Send introductory message', due: 'Completed', owner: 'AI System', done: true },
    { id: 2, label: 'Collect KYC documents', due: 'In 2h', owner: 'Rahul S.', done: false },
    { id: 3, label: 'Verify income details', due: 'Tomorrow', owner: 'System', done: false },
    { id: 4, label: 'Schedule advisor call', due: 'Jan 12', owner: 'Rahul S.', done: false },
];

export default function LeadsPage() {
    const [leads, setLeads] = useState(INITIAL_LEADS);
    const [selectedLead, setSelectedLead] = useState(INITIAL_LEADS[0]);
    const [search, setSearch] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsMounted(true), 0);
    }, []);

    if (!isMounted) return null;

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-[#0d0d0e] text-[#d4d4d4] font-sans selection:bg-indigo-500/30 overflow-hidden">
            {/* Top Command Bar */}
            <header className="h-14 flex items-center justify-between px-6 border-b border-[#1f1f20] bg-[#0d0d0e] z-20 shrink-0">
                <div className="flex items-center gap-8">
                    <h1 className="text-[15px] font-bold text-white tracking-tight">Leads</h1>

                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, phone, channel..."
                            className="w-80 h-8 pl-9 pr-4 bg-[#161617] border border-[#1f1f20] rounded-md text-[13px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161617] border border-[#1f1f20] rounded-md text-[12px] font-medium text-[#a1a1aa] hover:text-white transition-colors">
                        <Filter size={14} />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 rounded-md text-[12px] font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 transition-all active:scale-[0.98]">
                        <Plus size={16} />
                        New Lead
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden">

                {/* LEFT PANEL — Lead List */}
                <aside className="w-[380px] flex flex-col border-r border-[#1f1f20] bg-[#0d0d0e] shrink-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                        {filteredLeads.map((lead) => {
                            const Ch = CHANNELS[lead.channel];
                            const Status = STATUSES.find(s => s.id === lead.status);
                            const active = selectedLead?.id === lead.id;

                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`group px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${active ? 'bg-[#161617] border-indigo-500' : 'hover:bg-[#161617]/50 border-transparent'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className={`w-1.5 h-1.5 rounded-full ${Status.color}`} />
                                            <span className={`text-[13px] font-bold truncate ${lead.unread ? 'text-white' : 'text-[#a1a1aa]'}`}>
                                                {lead.name}
                                            </span>
                                        </div>
                                        <div className={`px-1.5 py-0.5 rounded-[4px] bg-[#1f1f20] text-[10px] font-black tracking-tight ${lead.score >= 85 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                            {lead.score}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] ${Ch.bg} ${Ch.color}`}>
                                                <Ch.icon size={10} />
                                                <span className="capitalize">{lead.channel}</span>
                                            </div>
                                            <span className="text-[#52525b]">{lead.lastActive}</span>
                                        </div>
                                        <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                            {lead.value}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* RIGHT PANEL — Lead Workspace */}
                <div className="flex-1 flex flex-col bg-[#0d0d0e] overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedLead ? (
                            <motion.div
                                key={selectedLead.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col h-full overflow-y-auto custom-scrollbar p-10 space-y-12"
                            >
                                {/* A. Lead Header */}
                                <header className="flex items-start justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#1f1f20] to-[#161617] border border-[#27272a] shadow-2xl flex items-center justify-center text-3xl font-black text-white">
                                            {selectedLead.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">{selectedLead.name}</h2>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-[#161617] border border-[#1f1f20] rounded-lg text-[12px] font-bold text-[#a1a1aa]">
                                                    {selectedLead.value}
                                                </div>
                                                <div className="relative group">
                                                    <button className="flex items-center gap-2 px-3 py-1 bg-[#161617] border border-[#1f1f20] rounded-lg text-[12px] font-bold text-[#a1a1aa] hover:text-white hover:border-[#27272a] transition-all">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${STATUSES.find(s => s.id === selectedLead.status).color}`} />
                                                        {STATUSES.find(s => s.id === selectedLead.status).label}
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-[#52525b] uppercase tracking-[0.2em] mb-1">AI Trust Score</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-black text-white">{selectedLead.score}%</span>
                                                <span className="text-[12px] font-black text-emerald-400 bg-emerald-400/5 px-2 py-1 rounded-md border border-emerald-400/10">
                                                    {selectedLead.prob} P(c)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {/* B. Conversation Preview */}
                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em] flex items-center gap-2">
                                                <MessageSquare size={14} className="text-indigo-400" />
                                                Conversation Preview
                                            </h4>
                                            <button className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                                Open full chat <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                        <div className="bg-[#111112] border border-[#1f1f20] rounded-2xl p-6 space-y-4 shadow-sm">
                                            {MOCK_MESSAGES.map((m, i) => (
                                                <div key={i} className={`flex flex-col ${m.role === 'me' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-[13px] leading-relaxed shadow-sm ${m.role === 'me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#1f1f20] text-[#d4d4d4] rounded-tl-none'}`}>
                                                        {m.text}
                                                    </div>
                                                    <span className="text-[9px] font-medium text-[#52525b] mt-1 uppercase tracking-widest">{m.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* C. Flow & Tasks */}
                                    <section className="space-y-4">
                                        <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em]">Flow & Objectives</h4>
                                        <div className="bg-[#111112] border border-[#1f1f20] rounded-2xl overflow-hidden divide-y divide-[#1f1f20] shadow-sm">
                                            {MOCK_TASKS.map((task) => (
                                                <div key={task.id} className="group p-4 flex items-center justify-between hover:bg-[#161617] transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <button className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${task.done ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-[#27272a] group-hover:border-[#3f3f46]'}`}>
                                                            {task.done && <Check size={14} className="text-white" />}
                                                        </button>
                                                        <div>
                                                            <p className={`text-[13px] font-bold ${task.done ? 'text-[#52525b] line-through' : 'text-[#d4d4d4]'}`}>{task.label}</p>
                                                            <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-[#52525b]">
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {task.due}</span>
                                                                <span className="flex items-center gap-1"><User size={10} /> {task.owner}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <MoreHorizontal size={14} className="text-[#27272a] group-hover:text-[#52525b] cursor-pointer" />
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                {/* D. AI Suggestions */}
                                <section className="space-y-4">
                                    <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em]">Contextual Intelligence</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { icon: Sparkles, text: 'This lead is hot — follow up now.', color: 'text-indigo-400', bg: 'bg-indigo-400/5', border: 'border-indigo-400/10' },
                                            { icon: Target, text: 'Users from WhatsApp convert 40% faster.', color: 'text-emerald-400', bg: 'bg-emerald-400/5', border: 'border-emerald-400/10' },
                                            { icon: TrendingUp, text: 'Suggesting to ask for PAN card next.', color: 'text-blue-400', bg: 'bg-blue-400/5', border: 'border-blue-400/10' }
                                        ].map((item, i) => (
                                            <div key={i} className={`p-4 rounded-xl border ${item.bg} ${item.border} flex items-start gap-4 group hover:bg-opacity-10 transition-all`}>
                                                <item.icon size={16} className={`${item.color} mt-0.5`} />
                                                <p className="text-[13px] font-bold text-white leading-relaxed">{item.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
                                <Sparkles size={60} strokeWidth={1} />
                                <p className="mt-4 text-[14px] font-medium uppercase tracking-[0.2em]">Select a lead to begin workspace</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1f1f20;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #27272a;
                }
            `}</style>
        </div>
    );
}
