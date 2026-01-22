'use client';

import { CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';

const MOCK_PROMISES = [
    { id: 1, customer: 'Raj Enterprises', promise: 'Send revised proposal by Friday', deadline: 'Tomorrow', status: 'pending' },
    { id: 2, customer: 'Tech Solutions Ltd', promise: 'Follow up on implementation timeline', deadline: 'In 3 days', status: 'pending' },
    { id: 3, customer: 'Global Corp', promise: 'Share case study PDF', deadline: 'Yesterday', status: 'overdue' },
    { id: 4, customer: 'StartupX', promise: 'Schedule demo call', deadline: 'Completed', status: 'fulfilled' },
];

export default function PromisesPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 p-4">
                <h1 className="text-2xl font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">Founder Assistant</h1>
                <p className="text-[#9b9b9b] font-medium">Keeps your commitments from slipping.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4">
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">6</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Due Soon</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-500">1</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Overdue</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">12</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Fulfilled</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promises Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 mb-8">
                {MOCK_PROMISES.map((promise) => (
                    <div
                        key={promise.id}
                        className={`bg-[var(--card)] rounded-xl p-5 border ${promise.status === 'overdue' ? 'border-red-500/30' : 'border-[var(--notion-border)]'
                            } hover:bg-[#252525] transition-all shadow-xl group`}
                    >
                        <div className="flex items-start justify-between mb-3 border-b border-[var(--notion-border)] pb-3">
                            <div className="font-bold text-[#D4D4D4] tracking-tight">{promise.customer}</div>
                            {promise.status === 'fulfilled' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.12em] rounded-full border border-emerald-500/20">
                                    <CheckCircle2 size={12} />
                                    Fulfilled
                                </span>
                            )}
                            {promise.status === 'overdue' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.12em] rounded-full border border-red-500/20">
                                    <AlertCircle size={12} />
                                    Overdue
                                </span>
                            )}
                            {promise.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.12em] rounded-full border border-amber-500/20">
                                    <Clock size={12} />
                                    Pending
                                </span>
                            )}
                        </div>
                        <p className="text-[#9b9b9b] text-sm mb-4 font-medium leading-relaxed">{promise.promise}</p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#565656] uppercase tracking-wider">
                            <Calendar size={14} />
                            <span className={promise.status === 'overdue' ? 'text-red-500' : ''}>
                                {promise.deadline}
                            </span>
                        </div>
                        {promise.status !== 'fulfilled' && (
                            <button className="mt-5 w-full py-2 bg-[#2c2c2c] hover:bg-[#3f3f3f] text-[#D4D4D4] text-xs font-bold rounded-xl border border-[#3f3f3f] transition-all active:scale-95 shadow-sm">
                                Mark as Fulfilled
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
