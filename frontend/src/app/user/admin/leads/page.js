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
    Whatsapp: {
        icon: Phone,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        dot: 'bg-emerald-400',
        score: 'text-emerald-400'
    },
    Instagram: {
        icon: Instagram,
        color: 'text-pink-400',
        bg: 'bg-pink-400/10',
        dot: 'bg-pink-400',
        score: 'text-pink-400'
    },
    Web: {
        icon: Globe,
        color: 'text-sky-400',
        bg: 'bg-sky-400/10',
        dot: 'bg-sky-400',
        score: 'text-sky-400'
    },
    Email: {
        icon: Mail,
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
        dot: 'bg-orange-400',
        score: 'text-amber-400'
    },
};

const STATUSES = [
    { id: 'new', label: 'New', color: 'bg-sky-400' },
    { id: 'progress', label: 'In Progress', color: 'bg-violet-400' },
    { id: 'docs', label: 'Docs Pending', color: 'bg-amber-400' },
    { id: 'won', label: 'Won', color: 'bg-emerald-400' },
];

const INITIAL_LEADS = [
    { id: 1, name: 'Rahul Sharma', channel: 'Whatsapp', status: 'new', score: 85, lastActive: '2m ago', value: '₹1.5L', prob: '82%', unread: true },
    { id: 2, name: 'Priya Patel', channel: 'Instagram', status: 'progress', score: 72, lastActive: '15m ago', value: '₹80K', prob: '60%', unread: false },
    { id: 3, name: 'Amit Kumar', channel: 'Web', status: 'won', score: 94, lastActive: '1h ago', value: '₹2.5L', prob: '100%', unread: false },
    { id: 4, name: 'Sneha Reddy', channel: 'Whatsapp', status: 'docs', score: 78, lastActive: '3h ago', value: '₹1.2L', prob: '65%', unread: true },
    { id: 5, name: 'Vikram Singh', channel: 'Email', status: 'new', score: 64, lastActive: '1d ago', value: '₹95K', prob: '45%', unread: false },
];

const MOCK_MESSAGES = [
 { role: 'them', text: 'Hi, I need help with the business loan application.', time: '10:30 AM' },
 { role: 'me', text: 'Hello! I can certainly help. Which documents do you have ready?', time: '10:30 AM' },
 { role: 'them', text: 'I have my PAN and Aadhaar, but need to fetch bank statements.', time: '10:31 AM' },
 { role: 'me', text: 'Great. We will need the last 6 months bank statement and GST details if available.', time: '10:32 AM' },
 { role: 'them', text: 'Okay I can upload those today.', time: '10:33 AM' },
 { role: 'me', text: 'Perfect. Once uploaded, we can check your eligibility and share loan offers.', time: '10:34 AM' }
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
    const [mobileView, setMobileView] = useState("leads");

    useEffect(() => {
        setTimeout(() => setIsMounted(true), 0);
    }, []);

    if (!isMounted) return null;

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0f0f14] via-[#0b0b10] to-[#060608] text-zinc-200 overflow-hidden">

    {/* TOP BAR */}
    <header className="h-14 lg:h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 border-b border-white/5 bg-[#0f0f14] backdrop-blur-xl shrink-0 overflow-visible">

      <div className="flex items-center gap-10">
        <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-white tracking-tight">
          Leads / CRM
        </h1>

        <div className="relative">
        <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />

        <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-40 sm:w-56 md:w-72 lg:w-80 h-9 pl-9 pr-4 rounded-lg bg-[#16161d] border border-white/5 text-sm text-white outline-none focus:border-indigo-500/40"
        />
        </div>
      </div>

      <div className="flex items-center gap-3">

        {/* Filter */}
        <div className="relative group">

        <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-white/5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06]">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
        </button>

        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] px-2 py-1 rounded bg-zinc-900 border border-white/10 text-zinc-300 opacity-0 group-hover:opacity-100 transition pointer-events-none sm:hidden z-50">
            Filter
        </span>
        </div>

        {/* New Lead */}
        <div className="relative group">

        <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/10">
            <Plus size={16} />
            <span className="hidden sm:inline">New Lead</span>
        </button>

        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] px-2 py-1 rounded bg-zinc-900 border border-white/10 text-zinc-300 opacity-0 group-hover:opacity-100 transition pointer-events-none sm:hidden z-50">
            New Lead
        </span>

        </div>
        </div>
    </header>

    {/* MAIN LAYOUT */}

    <main className="flex flex-1 overflow-hidden relative">

      {/* LEFT — LEAD LIST */}

      <aside
        className={`
          w-full lg:w-[360px]
          border-r border-white/5
          bg-[#0f0f14]
          overflow-y-auto
          custom-scrollbar
          p-3 lg:p-4
          space-y-2
          ${mobileView === "chat" ? "hidden lg:block" : "block"}
        `}
      >

        <div className="p-3 space-y-1">
          {filteredLeads.map((lead) => {
            const Ch = CHANNELS[lead.channel];
            const Status = STATUSES.find(s => s.id === lead.status);
            const active = selectedLead?.id === lead.id;

            return (
              <div
                key={lead.id}
                onClick={() => {
                  setSelectedLead(lead);
                  if (window.innerWidth < 1024) {
                    setMobileView("chat");
                  }
                }}
                className={`group p-4 rounded-lg cursor-pointer transition 
                  ${active
                    ? 'bg-gradient-to-r from-[#1a1a22] to-[#121218] border border-white/10 shadow-lg'
                    : 'hover:bg-[#15151b]'
                  }`}
              >

                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${Ch.dot}`} />

                    <span className={`text-xs lg:text-sm font-semibold ${lead.unread ? 'text-white' : 'text-zinc-400'}`}>
                      {lead.name}
                    </span>
                  </div>

                  <span className={`text-xs font-semibold ${Ch.score}`}>
                    {lead.score}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${Ch.bg} ${Ch.color}`}>
                      <Ch.icon size={10} />
                      {lead.channel}
                    </div>

                    <span className="text-zinc-500">
                      {lead.lastActive}
                    </span>
                  </div>

                  <span className="text-white font-semibold opacity-0 group-hover:opacity-100">
                    {lead.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* CENTER + RIGHT WORKSPACE */}
      <div
        className={`
          flex-1 flex flex-col
          p-3 sm:p-6 lg:p-8
          gap-6 lg:gap-8
          overflow-y-auto
          custom-scrollbar
          ${mobileView === "leads" ? "hidden lg:flex" : "flex"}
        `}
      >

        {selectedLead && (
          <>
            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
              
              {/* LEFT COLUMN - HEADER & CHAT */}
              <div className="xl:col-span-8 space-y-6">
                
                {/* LEAD HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6 lg:pb-8">
                  <div className="flex items-center gap-4 lg:gap-6">
                    <button
                      onClick={() => setMobileView("leads")}
                      className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
                    >
                      ←
                    </button>

                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-lg lg:text-xl font-bold text-white shadow-xl shadow-indigo-600/20 border border-white/10">
                      {selectedLead.name.charAt(0)}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-none">
                        {selectedLead.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white/5 border border-white/10 text-indigo-400">
                          {selectedLead.value}
                        </span>
                        <button className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUSES.find(s => s.id === selectedLead.status).color}`} />
                          {STATUSES.find(s => s.id === selectedLead.status).label}
                          <ChevronDown size={10} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-dashed border-white/5 pt-4 sm:pt-0 sm:border-t-0 px-2 sm:px-0">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#444]">
                      Lead Quality
                    </span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-2xl lg:text-3xl font-black text-white italic">
                        {selectedLead.score}%
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                        {selectedLead.prob} CONF
                      </span>
                    </div>
                  </div>
                </div>

                {/* CHAT PANEL */}
                <div className="rounded-3xl border border-white/5 bg-[#121218] p-6 lg:p-8 space-y-6 shadow-2xl relative overflow-hidden group/chat">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <div className="flex justify-between items-center relative z-10">
                    <h4 className="text-[11px] font-black uppercase tracking-[3px] text-[#555] flex items-center gap-3">
                      <MessageSquare size={16} className="text-indigo-500" />
                      Conversation Log
                    </h4>
                    <button className="text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5 rounded-full border border-indigo-500/10 transition-all">
                      Open Nexus
                      <ArrowUpRight size={14} />
                    </button>
                  </div>

                  <div className="space-y-6 pt-4 relative z-10">
                    {MOCK_MESSAGES.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.role === 'me' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-5 py-3 rounded-2xl text-sm max-w-[90%] sm:max-w-[80%] lg:max-w-[70%] shadow-xl transition-all duration-300
                          ${m.role === 'me'
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border border-white/10 shadow-indigo-600/10'
                            : 'bg-[#1a1a24] text-[#E5E5E5] border border-white/10'
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className="text-[10px] font-medium text-[#444] mt-2 px-1">
                          {m.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - TASKS & AI */}
              <div className="xl:col-span-4 space-y-8">
                {/* FLOW OBJECTIVES */}
                <div className="rounded-3xl border border-white/5 bg-[#121218] overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h4 className="text-[11px] font-black uppercase tracking-[3px] text-[#555]">
                      Active Flow Logic
                    </h4>
                  </div>
                  <div className="divide-y divide-white/5">
                    {MOCK_TASKS.map(task => (
                      <div key={task.id} className="p-5 flex items-start justify-between hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-all
                            ${task.done ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-[#333] group-hover:border-[#444]'}`}
                          >
                            {task.done && <Check size={14} strokeWidth={3} className="text-white" />}
                          </div>
                          <div>
                            <p className={`text-[14px] font-bold ${task.done ? 'line-through text-[#444]' : 'text-[#E5E5E5]'}`}>
                              {task.label}
                            </p>
                            <div className="flex items-center gap-4 mt-1.5">
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#555]">
                                <Clock size={12} className="text-zinc-600" /> {task.due}
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#555]">
                                <User size={12} className="text-zinc-600" /> {task.owner}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI INSIGHTS */}
                <div className="rounded-3xl border border-indigo-500/10 bg-[#121218] p-6 lg:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] -mr-24 -mt-24 pointer-events-none" />
                  
                  <h4 className="text-[11px] font-black uppercase tracking-[3px] text-indigo-400 relative z-10">
                    Agent Intelligence
                  </h4>

                  <div className="space-y-4 relative z-10">
                    {[
                      { icon: Sparkles, text: 'This lead is hot — follow up now.', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                      { icon: Target, text: 'Users from WhatsApp convert 40% faster.', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                      { icon: TrendingUp, text: 'Suggesting to ask for PAN card next.', color: 'text-blue-400', bg: 'bg-blue-400/10' }
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-400/20 transition-all cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} border border-white/5`}>
                          <item.icon size={18} className={item.color} />
                        </div>
                        <p className="text-sm font-medium text-[#E5E5E5] leading-relaxed flex-1">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  </div>
  );
}
