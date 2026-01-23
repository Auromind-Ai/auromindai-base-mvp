'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Phone,
    Instagram,
    Globe,
    Mail,
    Paperclip,
    Zap,
    Sparkles,
    Send,
    Clock,
    User,
    Star,
    Calendar,
    ArrowRight,
    ChevronRight,
    MoreHorizontal,
    Info
} from 'lucide-react';

const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: '#22c55e' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#ec4899' },
    { id: 'web', label: 'Web Chat', icon: Globe, color: '#3b82f6' },
    { id: 'email', label: 'Email', icon: Mail, color: '#f97316' },
];

const LEADS = {
    whatsapp: [
        { id: 1, name: 'Rahul Sharma', msg: 'Hi, I need help with my loan application...', time: '2m', status: 'New', unread: true, phone: '+91 98765 43210', score: 85 },
        { id: 2, name: 'Sneha Reddy', msg: 'I have uploaded the documents as requested', time: '15m', status: 'Docs', unread: true, phone: '+91 87654 32109', score: 72 },
        { id: 3, name: 'Meera Joshi', msg: 'Can you share the pricing details?', time: '1h', status: 'Flow', unread: false, phone: '+91 76543 21098', score: 68 },
        { id: 4, name: 'Karan Patel', msg: 'Thanks for the info, very helpful!', time: '3h', status: 'Done', unread: false, phone: '+91 65432 10987', score: 91 },
    ],
    instagram: [
        { id: 5, name: 'Priya Patel', msg: 'Love your products! 😍', time: '5m', status: 'New', unread: true, phone: '@priya_style', score: 78 },
        { id: 6, name: 'Ankit Verma', msg: 'When is the next sale?', time: '30m', status: 'Flow', unread: false, phone: '@ankit.v', score: 65 },
    ],
    web: [
        { id: 7, name: 'Amit Kumar', msg: 'Need a demo for my team', time: '10m', status: 'New', unread: true, phone: 'amit@company.com', score: 88 },
    ],
    email: [
        { id: 8, name: 'Vikram Singh', msg: 'RE: Product Demo Request', time: '1h', status: 'New', unread: true, phone: 'vikram@corp.com', score: 82 },
    ],
};

const MSGS = [
    { id: 1, from: 'them', text: 'Hi, I need help with my loan application.', time: '10:30 AM' },
    { id: 2, from: 'sys', text: 'Personal Loan flow started' },
    { id: 3, from: 'me', text: 'Hello Rahul! Let me check your application status.', time: '10:32 AM' },
    { id: 4, from: 'them', text: 'Thank you! What documents will I need to submit?', time: '10:33 AM' },
    { id: 5, from: 'ai', text: 'Suggest: "For personal loan you need PAN, Aadhaar, bank statement, and salary slips."' },
];

export default function InboxPage() {
    const [ch, setCh] = useState(CHANNELS[0]);
    const [lead, setLead] = useState(null);
    const [msg, setMsg] = useState('');
    const [showInfo, setShowInfo] = useState(true);
    const ref = useRef(null);

    const leads = LEADS[ch.id] || [];
    const I = ch.icon;

    useEffect(() => { setLead(leads[0] || null); }, [ch, leads]);
    useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }); }, [lead]);

    return (
        <div className="h-screen flex flex-col bg-[#0f0f0f]">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-3 bg-[#161616] border-b border-[#1f1f1f]">
                {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    const on = ch.id === c.id;
                    return (
                        <button
                            key={c.id}
                            onClick={() => setCh(c)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all ${on ? 'text-white' : 'text-[#666] hover:text-[#999]'}`}
                            style={{ backgroundColor: on ? c.color : 'transparent' }}
                        >
                            <Icon size={15} strokeWidth={2} />
                            {c.label}
                            {on && <span className="ml-1 text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{leads.length}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Leads */}
                <div className="w-[340px] bg-[#161616] border-r border-[#1f1f1f] flex flex-col">
                    <div className="p-4">
                        <div className="flex items-center gap-2 text-[13px] font-semibold mb-4" style={{ color: ch.color }}>
                            <I size={15} strokeWidth={2} />
                            {ch.label} Leads
                        </div>
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" strokeWidth={2} />
                            <input
                                placeholder="Search leads..."
                                className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white placeholder:text-[#555] outline-none focus:border-[#333] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2">
                        {leads.map((l) => {
                            const sel = lead?.id === l.id;
                            return (
                                <button
                                    key={l.id}
                                    onClick={() => setLead(l)}
                                    className={`w-full p-3 mb-1 rounded-xl text-left transition-all ${sel ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
                                    style={{ borderLeft: sel ? `3px solid ${ch.color}` : '3px solid transparent' }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0" style={{ backgroundColor: `${ch.color}18`, color: ch.color }}>
                                            {l.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[13px] font-medium ${l.unread ? 'text-white' : 'text-[#888]'}`}>{l.name}</span>
                                                <span className="text-[11px] text-[#555]">{l.time}</span>
                                            </div>
                                            <p className="text-[12px] text-[#666] truncate leading-relaxed">{l.msg}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${ch.color}15`, color: ch.color }}>{l.status}</span>
                                                {l.unread && <span className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col bg-[#0f0f0f]">
                    {lead ? (
                        <>
                            <div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-b border-[#1f1f1f]">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold" style={{ backgroundColor: `${ch.color}18`, color: ch.color }}>
                                        {lead.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-semibold text-white">{lead.name}</h3>
                                        <p className="text-[12px] flex items-center gap-1.5" style={{ color: ch.color }}>
                                            <I size={12} strokeWidth={2} />
                                            {ch.label}
                                            <span className="text-emerald-400 ml-1">● Online</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-amber-500/10 text-amber-400">
                                        <Clock size={13} strokeWidth={2} />
                                        15 min
                                    </div>
                                    <button onClick={() => setShowInfo(!showInfo)} className={`p-2.5 rounded-lg transition-colors ${showInfo ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`} style={{ color: showInfo ? ch.color : '#666' }}>
                                        <Info size={18} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-3xl mx-auto space-y-3">
                                    {MSGS.map((m) => (
                                        <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : m.from === 'sys' ? 'justify-center' : 'justify-start'}`}>
                                            {m.from === 'sys' ? (
                                                <span className="text-[11px] text-[#555] bg-[#1a1a1a] px-4 py-2 rounded-full">{m.text}</span>
                                            ) : m.from === 'ai' ? (
                                                <div className="max-w-[75%] p-4 rounded-2xl" style={{ backgroundColor: `${ch.color}10`, border: `1px solid ${ch.color}20` }}>
                                                    <div className="flex items-center gap-2 mb-2" style={{ color: ch.color }}>
                                                        <Sparkles size={13} strokeWidth={2} />
                                                        <span className="text-[12px] font-semibold">AI Suggestion</span>
                                                    </div>
                                                    <p className="text-[13px] text-[#bbb] leading-relaxed">{m.text}</p>
                                                    <button className="flex items-center gap-1 mt-3 text-[12px] font-medium" style={{ color: ch.color }}>
                                                        Use reply <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`max-w-[75%] px-4 py-3 ${m.from === 'me' ? 'rounded-[20px_20px_6px_20px]' : 'rounded-[20px_20px_20px_6px]'}`} style={{ backgroundColor: m.from === 'me' ? ch.color : '#1c1c1c' }}>
                                                    <p className="text-[13px] text-white leading-relaxed">{m.text}</p>
                                                    {m.time && <p className="text-[10px] text-white/50 mt-2">{m.time}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={ref} />
                                </div>
                            </div>

                            <div className="p-4 bg-[#161616] border-t border-[#1f1f1f]">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex items-center gap-2 mb-3">
                                        {['Summarize', 'Suggest Reply', 'Next Action'].map((a, i) => (
                                            <button key={i} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: `${ch.color}12`, color: ch.color }}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            value={msg}
                                            onChange={(e) => setMsg(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-3 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white placeholder:text-[#555] outline-none focus:border-[#333]"
                                        />
                                        <button className="p-3 rounded-xl bg-[#1c1c1c] border border-[#282828] text-[#666] hover:text-white hover:border-[#333] transition-colors">
                                            <Paperclip size={18} strokeWidth={2} />
                                        </button>
                                        <button className="p-3 rounded-xl transition-colors" style={{ backgroundColor: `${ch.color}15`, color: ch.color }}>
                                            <Zap size={18} strokeWidth={2} />
                                        </button>
                                        <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold text-white" style={{ backgroundColor: ch.color }}>
                                            <Send size={16} strokeWidth={2} />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-[#444] text-[14px]">Select a conversation</div>
                    )}
                </div>

                {/* Info Panel */}
                <AnimatePresence>
                    {showInfo && lead && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#161616] border-l border-[#1f1f1f] overflow-hidden"
                        >
                            <div className="w-[300px] h-full overflow-y-auto p-5">
                                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-5">Lead Details</p>

                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold" style={{ backgroundColor: `${ch.color}18`, color: ch.color }}>
                                        {lead.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <h4 className="text-[15px] font-semibold text-white">{lead.name}</h4>
                                    <p className="text-[12px] text-[#666] mt-1">{lead.phone}</p>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] text-[#666]">Channel</span>
                                        <span className="text-[12px] flex items-center gap-1.5" style={{ color: ch.color }}>
                                            <I size={13} strokeWidth={2} />
                                            {ch.label}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] text-[#666]">Lead Score</span>
                                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${lead.score >= 80 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                            {lead.score}%
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: `${ch.color}08`, border: `1px solid ${ch.color}15` }}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[12px] font-semibold text-white">Personal Loan</span>
                                        <span className="text-[11px]" style={{ color: ch.color }}>5/8</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: '62%', backgroundColor: ch.color }} />
                                    </div>
                                    <p className="text-[11px] text-[#666] mt-2">Waiting for PAN Card</p>
                                </div>

                                <div className="space-y-2">
                                    {[{ icon: User, text: 'Assign Agent' }, { icon: Star, text: 'Mark Priority' }, { icon: Calendar, text: 'Schedule Follow-up' }].map((a, i) => (
                                        <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#282828] text-[13px] text-white hover:border-[#333] transition-colors">
                                            <a.icon size={16} strokeWidth={2} className="text-[#666]" />
                                            {a.text}
                                        </button>
                                    ))}
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold text-white" style={{ backgroundColor: ch.color }}>
                                        <ArrowRight size={16} strokeWidth={2} />
                                        Convert to Deal
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
