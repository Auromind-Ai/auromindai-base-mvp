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
    Wand2,
    CheckCircle2,
    Clock,
    User,
    ChevronDown,
    Sparkles,
    CheckSquare,
    MoreHorizontal,
    Target,
    Menu,
    MessageSquare,
    Save,
    Play,
    Settings,
    ArrowRight,
    Type,
    X,
    DraftingCompass
} from 'lucide-react';

const CHANNELS = {
    whatsapp: { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    web: { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    email: { icon: Mail, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const INITIAL_FLOWS = [
    { id: 1, name: 'Loan – Personal', type: 'flow', channel: 'whatsapp', mode: 'Step-by-step', status: 'Active' },
    { id: 2, name: 'Lead Qualification', type: 'flow', channel: 'web', mode: 'AI Chat', status: 'Draft' },
    { id: 3, name: 'Welcome Message', type: 'template', channel: 'instagram', status: 'Active' },
    { id: 4, name: 'Follow-up – Day 1', type: 'template', channel: 'whatsapp', status: 'Active' },
    { id: 5, name: 'Mortgage Form', type: 'flow', channel: 'email', mode: 'Step-by-step', status: 'Draft' },
];

const MOCK_FLOW_STEPS = [
    { id: 1, title: 'Intro', text: 'Hi! I can help with your loan application. What is your full name?', type: 'text', logic: 'Next step: Contact info' },
    { id: 2, title: 'Contact info', text: 'Great! Please provide your phone number.', type: 'number', logic: 'Next step: Income' },
    { id: 3, title: 'Income', text: 'What is your monthly income?', type: 'number', logic: 'End flow' },
];

export default function FlowsPage() {
    const [activeTab, setActiveTab] = useState('flows');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(INITIAL_FLOWS[0]);
    const [isMounted, setIsMounted] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    useEffect(() => { setTimeout(() => setIsLibraryOpen(false), 0); }, []);

    if (!isMounted) return null;

    const filteredItems = INITIAL_FLOWS.filter(item =>
        (activeTab === 'flows' ? item.type === 'flow' : item.type === 'template') &&
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-screen flex flex-col bg-[var(--notion-bg)] text-[var(--notion-text)] font-sans overflow-hidden">
            {/* Header / Nav */}
            <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-[var(--notion-border)] bg-[var(--notion-sidebar)]/50 backdrop-blur-md z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                        className="lg:hidden p-2 hover:bg-[var(--notion-hover)] rounded-md transition-colors"
                    >
                        <Menu size={18} className="text-[#9b9b9b]" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Wand2 size={18} className="text-indigo-500" />
                        <h1 className="text-sm font-semibold text-white tracking-tight">Flows & Templates</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group hidden sm:block">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787878]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find a flow..."
                            className="w-48 xl:w-64 h-8 pl-9 pr-3 bg-[var(--notion-active)] border border-[var(--notion-border)] rounded-md text-xs text-white outline-none focus:border-indigo-500/30 transition-all placeholder:text-[#5a5a5a]"
                        />
                    </div>
                    <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-8 bg-[var(--notion-active)] border border-[var(--notion-border)] rounded-md text-[11px] font-medium text-[#9b9b9b] hover:text-white transition-colors">
                        <Filter size={12} />
                        <span>Filter</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-1.5 h-8 bg-indigo-600 rounded-md text-[11px] font-bold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]">
                        <Plus size={14} />
                        <span>Create</span>
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex flex-1 overflow-hidden relative">
                {/* LIBRARY SIDEBAR */}
                <aside
                    className={`
                        ${isLibraryOpen ? 'absolute inset-0 z-40 bg-[var(--notion-sidebar)]' : 'hidden'} 
                        lg:relative lg:flex lg:w-72 xl:w-80 flex-col border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)]/30 shrink-0 overflow-hidden
                    `}
                >
                    <div className="p-3 border-b border-[var(--notion-border)] flex gap-1">
                        <button
                            onClick={() => setActiveTab('flows')}
                            className={`flex-1 py-1 text-[11px] font-bold rounded-[4px] transition-all ${activeTab === 'flows' ? 'bg-[var(--notion-active)] text-white' : 'text-[#7e7e7e] hover:text-[#9b9b9b]'}`}
                        >
                            Flows
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`flex-1 py-1 text-[11px] font-bold rounded-[4px] transition-all ${activeTab === 'templates' ? 'bg-[var(--notion-active)] text-white' : 'text-[#7e7e7e] hover:text-[#9b9b9b]'}`}
                        >
                            Templates
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-1.5 py-2">
                        {filteredItems.map((item) => {
                            const active = selectedItem?.id === item.id;
                            const Ch = CHANNELS[item.channel];
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setIsLibraryOpen(false);
                                    }}
                                    className={`
                                        group relative px-3 py-2.5 rounded-[4px] cursor-pointer transition-all duration-150 mb-0.5
                                        ${active ? 'bg-[var(--notion-active)]' : 'hover:bg-[var(--notion-hover)]'}
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className={`text-[13px] font-medium truncate ${active ? 'text-white' : 'text-[#d4d4d4]'}`}>
                                            {item.name}
                                        </span>
                                        {item.status === 'Active' && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-[#7e7e7e]">
                                            <Ch.icon size={10} className={Ch.color} />
                                            <span className="capitalize">{item.channel}</span>
                                        </div>
                                        <span className="text-[10px] text-[#5a5a5a] font-medium">{item.mode || 'Template'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* EDITOR WORKSPACE */}
                <div className="flex-1 flex flex-col bg-[var(--notion-bg)] relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedItem ? (
                            <motion.div
                                className="flex flex-col h-full overflow-hidden"
                                key={selectedItem.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Workspace Header */}
                                <div className="h-12 border-b border-[var(--notion-border)] flex items-center justify-between px-6 bg-[var(--notion-bg)]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[13px] font-semibold text-white">{selectedItem.name}</span>
                                        <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${selectedItem.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-[#71717a]'}`}>
                                            {selectedItem.status}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-2 px-3 py-1 rounded-[4px] text-[11px] font-medium text-[#9b9b9b] hover:text-white hover:bg-[var(--notion-hover)] transition-all">
                                            <Play size={12} />
                                            Preview
                                        </button>
                                        <button className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-[4px] text-[11px] font-bold text-white hover:bg-white/10 transition-all">
                                            Publish
                                        </button>
                                        <button
                                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                            className="p-2 text-[#7e7e7e] hover:text-white hover:bg-[var(--notion-hover)] rounded-[4px] transition-all ml-1"
                                        >
                                            <Settings size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Canvas Area */}
                                <div className="flex-1 overflow-y-auto bg-[#0f0f0f] relative custom-scrollbar">
                                    {/* Grid Pattern Overlay */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_0)] [background-size:20px_20px]" />

                                    <div className="max-w-2xl mx-auto py-12 px-6 relative z-10 space-y-8">
                                        {MOCK_FLOW_STEPS.map((step, idx) => (
                                            <div key={step.id} className="relative group">
                                                {/* Vertical Connector Line */}
                                                {idx < MOCK_FLOW_STEPS.length - 1 && (
                                                    <div className="absolute left-6 top-12 bottom-[-42px] w-[1px] bg-[var(--notion-border)] z-0" />
                                                )}

                                                <div className="flex gap-6 relative z-10">
                                                    {/* Step Index Pointer */}
                                                    <div className="shrink-0 w-12 h-12 rounded-full bg-[var(--notion-sidebar)] border border-[var(--notion-border)] flex items-center justify-center text-xs font-bold text-[#71717a] group-hover:border-indigo-500 transition-colors shadow-lg">
                                                        {idx + 1}
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="flex-1 bg-[var(--notion-sidebar)] border border-[var(--notion-border)] rounded-xl shadow-2xl overflow-hidden group-hover:border-white/10 transition-all">
                                                        <div className="px-5 py-3 border-b border-[var(--notion-border)] bg-black/20 flex items-center justify-between">
                                                            <input
                                                                defaultValue={step.title}
                                                                className="bg-transparent text-[13px] font-bold text-white outline-none w-full"
                                                            />
                                                            <button className="text-[#5a5a5a] hover:text-[#9b9b9b] transition-colors">
                                                                <MoreHorizontal size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="p-5 space-y-5">
                                                            <div className="relative">
                                                                <textarea
                                                                    defaultValue={step.text}
                                                                    rows={2}
                                                                    className="w-full bg-black/30 border border-white/5 rounded-lg p-3 text-[13px] text-[#d4d4d4] placeholder:text-[#3a3a3a] outline-none focus:border-indigo-500/30 transition-all resize-none"
                                                                />
                                                                <Sparkles size={12} className="absolute right-3 bottom-3 text-indigo-500/50 hover:text-indigo-400 cursor-pointer transition-colors" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 pt-1">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-[#5a5a5a] uppercase tracking-wider">Input Type</label>
                                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border border-white/5 rounded-md text-[11px] text-[#9b9b9b] hover:border-white/10 cursor-pointer transition-all">
                                                                        <div className="flex items-center gap-2">
                                                                            <Type size={12} className="text-indigo-500" />
                                                                            <span>Text</span>
                                                                        </div>
                                                                        <ChevronDown size={12} />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-[#5a5a5a] uppercase tracking-wider">Navigation</label>
                                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border border-white/5 rounded-md text-[11px] text-[#9b9b9b] hover:border-white/10 cursor-pointer transition-all">
                                                                        <span className="truncate">{step.logic}</span>
                                                                        <ChevronDown size={12} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button className="w-full h-12 border-2 border-dashed border-[var(--notion-border)] rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold text-[#5a5a5a] hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all group">
                                            <Plus size={16} className="group-hover:translate-y-[-1px] transition-transform" />
                                            Append Step
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                                <DraftingCompass size={48} strokeWidth={1.5} />
                                <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#71717a]">Initialize a module to view editor</span>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Quick AI FAB */}
                    <div className="absolute bottom-6 right-6">
                        <button className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden relative">
                            <Sparkles size={20} className="relative z-10 group-hover:rotate-12 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>

                {/* SETTINGS PANEL */}
                <aside
                    className={`
                        ${isSettingsOpen ? 'fixed lg:relative right-0 top-0 bottom-0 z-50 lg:z-10' : 'hidden'} 
                        w-[280px] xl:w-[320px] bg-[var(--notion-sidebar)] border-l border-[var(--notion-border)] flex flex-col shrink-0 shadow-2xl lg:shadow-none
                    `}
                >
                    <div className="h-12 border-b border-[var(--notion-border)] flex items-center justify-between px-6 bg-[var(--notion-sidebar)]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9b9b9b]">Configuration</span>
                        <button onClick={() => setIsSettingsOpen(false)} className="lg:hidden p-1 text-[#5a5a5a] hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Section 1 */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-[#5a5a5a] uppercase tracking-[0.2em]">Execution Trigger</h3>
                            <div className="p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[13px] font-bold text-white group-hover:text-indigo-400">Word Triggers</span>
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                </div>
                                <p className="text-[11px] text-[#71717a] leading-relaxed">System reacts when incoming text matches defined keywords.</p>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-[#5a5a5a] uppercase tracking-[0.2em]">Post-Flow Logic</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-4 h-4 rounded border border-[var(--notion-border)] bg-[var(--notion-active)] flex items-center justify-center">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-[#d4d4d4] block mb-1">Lead Migration</label>
                                        <p className="text-[11px] text-[#71717a]">Move entries to CRM upon flow termination.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 opacity-50">
                                    <div className="mt-1 w-4 h-4 rounded border border-[var(--notion-border)]" />
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-[#71717a] block mb-1">Dynamic Escalation</label>
                                        <p className="text-[11px] text-[#5a5a5a]">Auto-handover to human agent (Enterprise).</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Section */}
                        <div className="pt-6 border-t border-[var(--notion-border)]">
                            <div className="bg-indigo-600/5 rounded-xl p-5 border border-indigo-500/10 hover:bg-indigo-600/10 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className="text-indigo-400" />
                                    <span className="text-[13px] font-bold text-white">AI Weaver</span>
                                </div>
                                <p className="text-[11px] text-[#71717a] mb-5 leading-relaxed">
                                    Describe your process goals and let Auromind construct the flow steps automatically.
                                </p>
                                <button className="w-full py-2 bg-indigo-600 text-white text-[11px] font-bold rounded-md shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                                    Initiate AI Mapping
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
