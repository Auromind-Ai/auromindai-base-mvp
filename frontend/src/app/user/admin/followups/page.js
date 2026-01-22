'use client';

import { Users, Clock, CheckCircle2, Send, Calendar } from 'lucide-react';

const MOCK_LEADS = [
    { id: 1, name: 'Ananya Patel', email: 'ananya@company.com', status: 'pending', scheduledFor: 'Today, 3:00 PM', aiDraft: 'Following up on our conversation about your Q1 goals...' },
    { id: 2, name: 'Vikram Singh', email: 'vikram@startup.io', status: 'sent', scheduledFor: 'Yesterday', aiDraft: null },
    { id: 3, name: 'Neha Gupta', email: 'neha@enterprise.com', status: 'overdue', scheduledFor: '2 days ago', aiDraft: 'Hi Neha, just checking in on the proposal we discussed...' },
];

export default function FollowUpsPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 p-4">
                <h1 className="text-2xl font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">Follow-Up Manager</h1>
                <p className="text-[#9b9b9b] font-medium">Never miss a lead or promise again.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4">
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Users size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">24</div>
                            <div className="text-sm font-bold text-[#787878] uppercase tracking-widest text-[10px]">Active Leads</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">5</div>
                            <div className="text-sm font-bold text-[#787878] uppercase tracking-widest text-[10px]">Pending Today</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">18</div>
                            <div className="text-sm font-bold text-[#787878] uppercase tracking-widest text-[10px]">Converted</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Leads List */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--notion-border)] overflow-hidden mx-4 shadow-xl">
                <div className="p-4 border-b border-[var(--notion-border)] bg-[#252525]/50">
                    <h2 className="font-bold text-[#D4D4D4] tracking-tight">Upcoming Follow-Ups</h2>
                </div>
                <div className="divide-y divide-[#2f2f2f]">
                    {MOCK_LEADS.map((lead) => (
                        <div key={lead.id} className="p-4 hover:bg-[#252525] transition-all group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#2c2c2c] border border-[#3f3f3f] flex items-center justify-center text-[#D4D4D4] font-bold shadow-sm">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#D4D4D4] tracking-tight">{lead.name}</div>
                                        <div className="text-sm text-[#787878] font-medium">{lead.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#565656] uppercase tracking-wider">
                                        <Calendar size={14} />
                                        <span className={lead.status === 'overdue' ? 'text-red-500' : ''}>
                                            {lead.scheduledFor}
                                        </span>
                                    </div>
                                    {lead.aiDraft && (
                                        <button className="px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#3f3f3f] text-[#D4D4D4] text-xs font-bold rounded-lg border border-[#3f3f3f] transition-all active:scale-95 shadow-sm">
                                            Approve AI Draft
                                        </button>
                                    )}
                                    {lead.status === 'sent' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.15em] rounded-full border border-emerald-500/20">
                                            <CheckCircle2 size={12} />
                                            Sent
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
