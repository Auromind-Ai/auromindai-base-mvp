'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Filter,
    Zap,
    MessageSquare,
    Users,
    Clock,
    LayoutCircle,
    CheckCircle2,
    Play,
    Save,
    MoreHorizontal,
    Sparkles,
    ChevronDown,
    ArrowDown,
    Settings,
    Shield,
    Bot,
    Send,
    UserPlus,
    Tag,
    Bell,
    Wand2,
    X,
    Check,
    Split,
    Activity
} from 'lucide-react';

const TRIGGERS = [
    { id: 'new_lead', label: 'New lead created', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'msg_recv', label: 'Message received', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { id: 'flow_done', label: 'Flow completed', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { id: 'no_reply', label: 'No reply for X minutes', icon: Clock, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { id: 'deal_move', label: 'Deal moved to stage', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

const ACTIONS = [
    { id: 'send_msg', label: 'Send message', icon: Send },
    { id: 'assign_agent', label: 'Assign agent', icon: Users },
    { id: 'create_task', label: 'Create task', icon: CheckCircle2 },
    { id: 'move_stage', label: 'Move pipeline stage', icon: Split },
    { id: 'notification', label: 'Send notification', icon: Bell },
    { id: 'add_tag', label: 'Add tag', icon: Tag },
];

const INITIAL_AUTOMATIONS = [
    { id: 1, name: 'Lead Nudge - WhatsApp', trigger: 'no_reply', status: 'Active', lastRun: '12m ago' },
    { id: 2, name: 'Auto-assign Instagram Leads', trigger: 'new_lead', status: 'Active', lastRun: '1h ago' },
    { id: 3, name: 'Welcome Flow Trigger', trigger: 'msg_recv', status: 'Paused', lastRun: '2d ago' },
    { id: 4, name: 'Deal Conversion Alert', trigger: 'deal_move', status: 'Draft', lastRun: 'Never' },
];

export default function AutomationPage() {
    const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
    const [selectedItem, setSelectedItem] = useState(INITIAL_AUTOMATIONS[0]);
    const [search, setSearch] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [aiInput, setAiInput] = useState('');

    useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) return null;

    const filteredAutomations = automations.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-[#0d0d0e] text-[#d4d4d4] font-sans selection:bg-indigo-500/30 overflow-hidden">
            {/* Top Command Bar */}
            <header className="h-14 flex items-center justify-between px-6 border-b border-[#1f1f20] bg-[#0d0d0e] z-30 shrink-0">
                <div className="flex items-center gap-8">
                    <h1 className="text-[15px] font-bold text-white tracking-tight">Automations</h1>

                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search automations..."
                            className="w-80 h-8 pl-9 pr-4 bg-[#161617] border border-[#1f1f20] rounded-md text-[13px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161617] border border-[#1f1f20] rounded-md text-[12px] font-medium text-[#a1a1aa] hover:text-white transition-colors">
                        <Filter size={14} />
                        Status: All
                    </button>
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 rounded-md text-[12px] font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 transition-all active:scale-[0.98]">
                        <Plus size={16} />
                        Create Automation
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden">

                {/* LEFT PANEL — Library List */}
                <aside className="w-[360px] flex flex-col border-r border-[#1f1f20] bg-[#0d0d0e] shrink-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                        {filteredAutomations.map((item) => {
                            const active = selectedItem?.id === item.id;
                            const trigger = TRIGGERS.find(t => t.id === item.trigger);
                            const Icon = trigger?.icon || Zap;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`group px-4 py-4 cursor-pointer transition-all duration-150 border-l-2 ${active ? 'bg-[#161617] border-indigo-500' : 'hover:bg-[#161617]/50 border-transparent'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[13px] font-bold truncate ${active ? 'text-white' : 'text-[#a1a1aa]'}`}>
                                            {item.name}
                                        </span>
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${item.status === 'Active' ? 'bg-indigo-600' : 'bg-[#27272a]'}`}>
                                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${item.status === 'Active' ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${trigger?.bg} ${trigger?.color}`}>
                                                <Icon size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[#a1a1aa] capitalize">{trigger?.label.split(' ')[0]} Trigger</span>
                                                <span className="text-[#52525b]">Last run: {item.lastRun}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* RIGHT PANEL — Automation Builder */}
                <div className="flex-1 flex flex-col bg-[#0d0d0e] overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedItem ? (
                            <motion.div
                                key={selectedItem.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                {/* Header */}
                                <div className="h-16 flex items-center justify-between px-8 border-b border-[#1f1f20] shrink-0">
                                    <div className="flex items-center gap-4 flex-1">
                                        <input
                                            defaultValue={selectedItem.name}
                                            className="text-[15px] font-black text-white bg-transparent outline-none w-full max-w-md focus:border-b border-[#1f1f20]"
                                        />
                                        <div className="flex items-center gap-2 px-2 py-1 bg-[#161617] rounded-md border border-[#1f1f20]">
                                            <div className={`w-1.5 h-1.5 rounded-full ${selectedItem.status === 'Active' ? 'bg-indigo-500' : 'bg-[#52525b]'}`} />
                                            <span className="text-[11px] font-bold text-[#a1a1aa]">{selectedItem.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button className="flex items-center gap-2 px-4 py-1.5 bg-[#161617] border border-[#1f1f20] rounded-md text-[12px] font-bold text-[#a1a1aa] hover:text-white transition-all active:scale-[0.98]">
                                            <Play size={14} />
                                            Test
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-1.5 bg-[#1f1f20] rounded-md text-[12px] font-bold text-white hover:bg-[#27272a] transition-all">
                                            <Save size={14} />
                                            Save
                                        </button>
                                        <button className="flex items-center gap-2 px-5 py-1.5 bg-indigo-600 rounded-md text-[12px] font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/10">
                                            Publish
                                        </button>
                                    </div>
                                </div>

                                {/* Builder Canvas */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090a] relative">
                                    <div className="max-w-xl mx-auto py-16 space-y-8 flex flex-col items-center">

                                        {/* Step 1: Trigger */}
                                        <div className="w-full space-y-3 px-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-600/20">1</div>
                                                <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em]">Trigger</h4>
                                            </div>
                                            <div className="bg-[#0d0d0e] border border-[#1f1f20] rounded-2xl p-6 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                                                            <Clock size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[14px] font-black text-white">No reply for 60 minutes</p>
                                                            <p className="text-[12px] text-[#52525b] font-medium">When a customer message sits unreplied.</p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown size={18} className="text-[#3f3f46]" />
                                                </div>
                                            </div>
                                        </div>

                                        <ArrowDown size={24} className="text-[#1f1f20]" />

                                        {/* Step 2: Condition (Optional) */}
                                        <div className="w-full space-y-3 px-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-[#1f1f20] flex items-center justify-center text-[10px] font-black text-[#a1a1aa]">2</div>
                                                <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em]">Condition (Optional)</h4>
                                            </div>
                                            <div className="bg-[#0d0d0e] border border-[#1f1f20] rounded-2xl p-6 group cursor-pointer hover:bg-[#111112] transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-[#161617] flex items-center justify-center text-[#52525b] border border-[#1f1f20]">
                                                            <Filter size={24} />
                                                        </div>
                                                        <p className="text-[14px] font-bold text-[#a1a1aa]">If Channel = WhatsApp</p>
                                                    </div>
                                                    <X size={18} className="text-[#3f3f46] hover:text-rose-400 transition-colors" />
                                                </div>
                                            </div>
                                        </div>

                                        <ArrowDown size={24} className="text-[#1f1f20]" />

                                        {/* Step 3: Action */}
                                        <div className="w-full space-y-3 px-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-emerald-600/20">3</div>
                                                <h4 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em]">Action</h4>
                                            </div>
                                            <div className="bg-[#0d0d0e] border border-emerald-500/10 rounded-2xl p-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                                            <Send size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[14px] font-black text-white">Send "Wait Nudge" message</p>
                                                            <p className="text-[12px] text-[#52525b] font-medium">Automatic reply via WhatsApp.</p>
                                                        </div>
                                                    </div>
                                                    <MoreHorizontal size={18} className="text-[#3f3f46]" />
                                                </div>
                                                <div className="p-4 bg-[#161617] rounded-xl border border-[#1f1f20] space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-[#52525b] uppercase tracking-widest">Template</span>
                                                        <span className="text-[11px] font-bold text-indigo-400 cursor-pointer">Edit Template</span>
                                                    </div>
                                                    <div className="text-[13px] text-[#a1a1aa] leading-relaxed italic">
                                                        "Hi {'{{'} name {'}}'}, just checking in to see if you had any questions about the loan options?"
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 w-full flex justify-center">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-[#161617] border border-[#1f1f20] rounded-full text-[12px] font-bold text-[#52525b] hover:text-white hover:border-[#27272a] transition-all">
                                                <Plus size={14} />
                                                Add Completion Action
                                            </button>
                                        </div>
                                    </div>

                                    {/* AI Assistant Panel */}
                                    <div className="sticky bottom-8 left-0 right-0 px-8 z-40 pointer-events-none">
                                        <div className="max-w-lg mx-auto bg-[#161617]/90 backdrop-blur-xl border border-indigo-500/20 rounded-2xl shadow-2xl p-4 pointer-events-auto shadow-indigo-500/10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Sparkles size={16} className="text-indigo-400" />
                                                <span className="text-[12px] font-black text-white uppercase tracking-widest">AI Build Assistant</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={aiInput}
                                                    onChange={(e) => setAiInput(e.target.value)}
                                                    placeholder="e.g. 'When someone doesn’t reply for 1 hour, remind them.'"
                                                    className="flex-1 bg-transparent text-[13px] text-[#a1a1aa] outline-none placeholder:text-[#3f3f46]"
                                                />
                                                <button className="px-3 py-1 bg-indigo-600 rounded-lg text-[11px] font-bold text-white hover:bg-indigo-500 transition-all">
                                                    Build
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-20">
                                <Wand2 size={60} strokeWidth={1} />
                                <p className="mt-4 text-[14px] font-medium uppercase tracking-[0.2em]">Select an automation to begin orchestration</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Automation Summary / Metadata Panel */}
                <aside className="w-[300px] bg-[#0d0d0e] border-l border-[#1f1f20] shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    <div>
                        <h3 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em] mb-6">Orchestration Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[#a1a1aa]">Total Runs</span>
                                <span className="text-white font-black">1.4K</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[#a1a1aa]">Success Rate</span>
                                <span className="text-emerald-400 font-black">99.2%</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[#a1a1aa]">Avg. Response</span>
                                <span className="text-indigo-400 font-black">4.2s</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-black text-[#52525b] uppercase tracking-[0.2em] mb-6">System Nodes</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'MCP Execution', status: 'Online', icon: Bot, color: 'text-indigo-400' },
                                { label: 'RAG Policy Check', status: 'Verified', icon: Shield, color: 'text-emerald-400' },
                                { label: 'Scheduler', status: 'Active', icon: Clock, color: 'text-amber-400' }
                            ].map((node, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg bg-[#161617] border border-[#1f1f20] flex items-center justify-center ${node.color}`}>
                                        <node.icon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-white">{node.label}</p>
                                        <p className="text-[10px] text-[#52525b] font-medium">{node.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                        <p className="text-[11px] text-[#a1a1aa] font-medium leading-relaxed">
                            "This automation respects the <span className="text-indigo-400 font-bold">Business Policy (v2.4)</span> retrieved via RAG."
                        </p>
                    </div>
                </aside>
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
