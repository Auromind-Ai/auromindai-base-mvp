'use client';

import { CreditCard, Zap, TrendingUp, Clock } from 'lucide-react';

export default function CreditsPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 p-4">
                <h1 className="text-2xl font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">Credits</h1>
                <p className="text-[#9b9b9b] font-medium">Manage your AI credits and usage.</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 mb-8 mx-4 text-white shadow-2xl shadow-indigo-900/40 border border-indigo-500/30 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
                    <CreditCard size={120} />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Available Credits</p>
                        <div className="text-5xl font-bold tracking-tighter">2,450</div>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-pulse" />
                            <p className="text-indigo-200/80 text-xs font-bold">≈ ₹2,450 value • Infinite Validity</p>
                        </div>
                    </div>
                    <button className="px-8 py-3 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl shadow-black/20">
                        Buy Credits
                    </button>
                </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4">
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Zap size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">312</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Used Today</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">2,180</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">This Month</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#D4D4D4]">~8 days</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#565656]">Credits Left</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Plans */}
            {/* Pricing Plans */}
            <h2 className="text-sm font-bold text-[#565656] uppercase tracking-[0.2em] mb-4 p-4">Top Up Credits</h2>
            <div className="grid grid-cols-3 gap-4 p-4">
                <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--notion-border)] hover:bg-[#252525] transition-all cursor-pointer group shadow-xl">
                    <div className="text-sm font-bold text-[#787878] uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">Starter</div>
                    <div className="text-4xl font-bold text-[#D4D4D4] mb-1 tracking-tight">₹999</div>
                    <div className="text-xs font-bold text-[#565656] uppercase mb-6 tracking-wider">1,000 credits</div>
                    <button className="w-full py-2.5 bg-[#2c2c2c] hover:bg-[#3f3f3f] text-[#D4D4D4] text-xs font-bold rounded-xl border border-[#3f3f3f] transition-all active:scale-95 shadow-sm">
                        Select Plan
                    </button>
                </div>
                <div className="bg-[var(--card)] rounded-2xl p-6 border-2 border-indigo-500/50 hover:bg-[#252525] transition-all cursor-pointer relative shadow-2xl shadow-indigo-900/10 group">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-indigo-600/30">
                        Popular
                    </span>
                    <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">Pro</div>
                    <div className="text-4xl font-bold text-[#D4D4D4] mb-1 tracking-tight">₹2,499</div>
                    <div className="text-xs font-bold text-[#565656] uppercase mb-6 tracking-wider">3,000 credits</div>
                    <button className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                        Select Plan
                    </button>
                </div>
                <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--notion-border)] hover:bg-[#252525] transition-all cursor-pointer group shadow-xl">
                    <div className="text-sm font-bold text-[#787878] uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">Enterprise</div>
                    <div className="text-4xl font-bold text-[#D4D4D4] mb-1 tracking-tight">₹9,999</div>
                    <div className="text-xs font-bold text-[#565656] uppercase mb-6 tracking-wider">15,000 credits</div>
                    <button className="w-full py-2.5 bg-[#2c2c2c] hover:bg-[#3f3f3f] text-[#D4D4D4] text-xs font-bold rounded-xl border border-[#3f3f3f] transition-all active:scale-95 shadow-sm">
                        Select Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
