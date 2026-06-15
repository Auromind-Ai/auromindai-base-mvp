'use client';

import { useState, useEffect } from 'react';
import { 
    CreditCard, Zap, TrendingUp, Clock, Wallet, Info, 
    Calculator, History, Plus, Sparkles, CheckCircle2, 
    AlertTriangle, ArrowRight, Coins, X
} from 'lucide-react';

export default function CreditsPage() {
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab === 'wcc') return 'wcc';
        }
        return 'ai';
    });
    const [wccBalance, setWccBalance] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('wcc_balance');
            return stored ? parseFloat(stored) : 1245.50;
        }
        return 1245.50;
    });
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('1000');
    const [customAmount, setCustomAmount] = useState('');
    const [toastMessage, setToastMessage] = useState(null);

    // Estimator State
    const [audienceSize, setAudienceSize] = useState(1000);
    const [msgType, setMsgType] = useState('marketing');

    // Rates Table
    const rates = {
        marketing: 1.09,
        utility: 0.145,
        auth: 0.145,
        service: 0.00
    };

    // Calculate Estimator Cost
    const ratePerMsg = rates[msgType];
    const estimatedCost = audienceSize * ratePerMsg;

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleRechargeSubmit = (e) => {
        e.preventDefault();
        const amount = rechargeAmount === 'custom' ? parseFloat(customAmount) : parseFloat(rechargeAmount);
        if (isNaN(amount) || amount <= 0) {
            triggerToast('⚠️ Please enter a valid recharge amount');
            return;
        }
        setWccBalance(prev => {
            const next = prev + amount;
            if (typeof window !== 'undefined') {
                localStorage.setItem('wcc_balance', next.toString());
            }
            return next;
        });
        setIsRechargeModalOpen(false);
        triggerToast(`✅ Wallet successfully recharged with ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        setCustomAmount('');
    };

    return (
        <div className="w-full bg-[#07070a] min-h-screen text-white pt-6 md:pt-10 pb-12 relative overflow-hidden font-sans">
            {/* Background Gradient Glow */}
            <div 
                className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none filter blur-[150px] opacity-10"
                style={{ background: 'radial-gradient(circle, #814AC8 0%, transparent 70%)' }}
            />
            <div 
                className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none filter blur-[130px] opacity-5"
                style={{ background: 'radial-gradient(circle, #25D366 0%, transparent 70%)' }}
            />

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300">
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
                        <X size={14} className="text-white/40 hover:text-white" />
                    </button>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                {/* Header */}
                <div className="mb-8 text-center sm:text-left">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight font-display mb-1.5 font-bold">Credits & Wallet</h1>
                    <p className="text-[#9b9b9b] text-sm font-medium max-w-3xl leading-relaxed">
                        Your account balances are separated: <span className="text-purple-400 font-semibold">AI Workspace Credits</span> are used to power AI model executions (LLMs) and vector database document synchronization, while <span className="text-emerald-400 font-semibold">WhatsApp Credits (WCC)</span> act as a prepaid wallet to pay Meta directly for WhatsApp API conversation charges.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-white/5 mb-8 overflow-x-auto no-scrollbar gap-6">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 pb-3.5 text-sm font-bold tracking-tight border-b-2 transition-all shrink-0 select-none ${
                            activeTab === 'ai' 
                            ? 'border-purple-500 text-purple-400 font-extrabold' 
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Sparkles size={16} />
                        AI Workspace Credits
                    </button>
                    <button
                        onClick={() => setActiveTab('wcc')}
                        className={`flex items-center gap-2 pb-3.5 text-sm font-bold tracking-tight border-b-2 transition-all shrink-0 select-none ${
                            activeTab === 'wcc' 
                            ? 'border-emerald-500 text-emerald-400 font-extrabold' 
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Wallet size={16} />
                        WhatsApp Credits (WCC)
                    </button>
                </div>

                {/* ==================== TAB 1: AI CREDITS ==================== */}
                {activeTab === 'ai' && (
                    <div className="animate-in fade-in-50 duration-300">
                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-[#1a1333] to-[#0c081e] rounded-2xl p-6 md:p-8 mb-8 text-white shadow-2xl border border-purple-500/20 overflow-hidden relative group">
                            {/* SVG Decorative Grid */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                                <Coins size={140} />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                                <div className="space-y-3">
                                    <p className="text-purple-300/80 text-[10px] font-black uppercase tracking-[0.2em]">Available AI Model Messages</p>
                                    <div className="flex flex-col gap-2">
                                        <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                                            2,450
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md w-fit">
                                            AI Messages remaining
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-purple-500/10">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <p className="text-zinc-400 text-xs font-medium">≈ ₹2,450.00 value • Automatic recharge on renewal</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => triggerToast('ℹ️ Billing handles AI package renewals')}
                                    className="px-6 py-3 bg-[#814AC8] hover:bg-[#905ad6] text-white font-bold text-sm rounded-xl transition-all active:scale-95 hover:scale-[1.02] shadow-lg shadow-purple-900/30 w-full sm:w-auto text-center"
                                >
                                    Renew Subscription
                                </button>
                            </div>
                        </div>

                        {/* Usage Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] duration-200 shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-white">312</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Used Today</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] duration-200 shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-white">2,180</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">This Month</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] duration-200 shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-white">8 days left</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Est. Days Left</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Up Plans */}
                        <div className="mb-6">
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Top Up AI Credits</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                                <div className="bg-[#13131a]/60 rounded-2xl p-6 border border-white/5 hover:border-white/10 hover:scale-[1.01] transition-all cursor-pointer group shadow-xl flex flex-col justify-between h-full min-h-[200px]">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 group-hover:text-purple-400 transition-colors">Starter Pack</div>
                                        <div className="text-3xl font-bold text-white mb-0.5 tracking-tight">₹999</div>
                                        <div className="text-xs font-medium text-zinc-500 tracking-wide mb-6">1,000 AI Messages</div>
                                    </div>
                                    <button 
                                        onClick={() => triggerToast('🛒 Redirecting to checkout...')}
                                        className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold rounded-xl border border-white/10 transition-all active:scale-95 shadow-sm font-sans"
                                    >
                                        Select Plan
                                    </button>
                                </div>
                                <div className="bg-[#13131a] rounded-2xl p-6 border-2 border-purple-500/30 hover:border-purple-500/50 hover:scale-[1.01] transition-all cursor-pointer relative shadow-2xl shadow-purple-900/10 group flex flex-col justify-between h-full min-h-[200px]">
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-purple-600 text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-lg shadow-purple-600/30">
                                        Most Popular
                                    </span>
                                    <div>
                                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5">Pro Pack</div>
                                        <div className="text-3xl font-bold text-white mb-0.5 tracking-tight">₹2,499</div>
                                        <div className="text-xs font-medium text-zinc-400 tracking-wide mb-6">3,000 AI Messages</div>
                                    </div>
                                    <button 
                                        onClick={() => triggerToast('🛒 Redirecting to checkout...')}
                                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-600/20 font-sans"
                                    >
                                        Select Plan
                                    </button>
                                </div>
                                <div className="bg-[#13131a]/60 rounded-2xl p-6 border border-white/5 hover:border-white/10 hover:scale-[1.01] transition-all cursor-pointer group shadow-xl flex flex-col justify-between h-full min-h-[200px]">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 group-hover:text-purple-400 transition-colors">Growth Pack</div>
                                        <div className="text-3xl font-bold text-white mb-0.5 tracking-tight">₹9,999</div>
                                        <div className="text-xs font-medium text-zinc-500 tracking-wide mb-6">15,000 AI Messages</div>
                                    </div>
                                    <button 
                                        onClick={() => triggerToast('🛒 Redirecting to checkout...')}
                                        className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold rounded-xl border border-white/10 transition-all active:scale-95 shadow-sm font-sans"
                                    >
                                        Select Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== TAB 2: WHATSAPP CREDITS (WCC) ==================== */}
                {activeTab === 'wcc' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-300">
                        {/* WCC Balance, Estimator & Logs - Left & Middle Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Prepaid WCC Wallet Card */}
                            <div className="bg-gradient-to-br from-[#122019] to-[#080d0a] rounded-2xl p-6 md:p-8 text-white shadow-2xl border border-emerald-500/25 overflow-hidden relative group">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                                    <Wallet size={130} />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                                    <div className="space-y-3">
                                        <p className="text-emerald-300/80 text-[10px] font-black uppercase tracking-[0.2em]">WhatsApp Conversation Wallet (WCC)</p>
                                        <div className="flex flex-col gap-2">
                                            <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                                                ₹{wccBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md w-fit">
                                                Available Wallet Balance
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/10">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <p className="text-zinc-400 text-xs font-medium">Used to settle direct Meta Business API conversation fees</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsRechargeModalOpen(true)}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25d366] hover:bg-[#20bd5a] text-black font-extrabold text-sm rounded-xl transition-all active:scale-95 hover:scale-[1.02] shadow-lg shadow-emerald-900/20 w-full sm:w-auto text-center"
                                    >
                                        <Plus size={16} strokeWidth={2.5} />
                                        Recharge Wallet
                                    </button>
                                </div>
                            </div>

                            {/* WCC Campaign Cost Calculator */}
                            <div className="bg-[#13131a] rounded-xl border border-white/5 p-6 shadow-xl">
                                <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-4">
                                    <Calculator size={18} className="text-emerald-400" />
                                    <h2 className="text-base font-bold text-white tracking-tight">WCC Campaign Cost Estimator</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Target Audience Size</label>
                                        <div className="flex gap-3">
                                            <input 
                                                type="range" 
                                                min="100" 
                                                max="20000" 
                                                step="100"
                                                value={audienceSize}
                                                onChange={(e) => setAudienceSize(parseInt(e.target.value))}
                                                className="flex-1 accent-emerald-500 h-1.5 rounded-lg bg-zinc-850 self-center"
                                            />
                                            <input 
                                                type="number"
                                                min="1"
                                                value={audienceSize}
                                                onChange={(e) => setAudienceSize(Math.max(1, parseInt(e.target.value) || 0))}
                                                className="w-20 px-2.5 py-1 bg-[#1c1c24] border border-white/5 rounded-lg text-sm text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Template Conversation Type</label>
                                        <select 
                                            value={msgType}
                                            onChange={(e) => setMsgType(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#1c1c24] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="marketing">Marketing (₹1.09 / msg)</option>
                                            <option value="utility">Utility (₹0.145 / msg)</option>
                                            <option value="auth">Authentication (₹0.145 / msg)</option>
                                            <option value="service">Service (Free / customer reply)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Calculation Results Panel */}
                                <div className="p-4 rounded-xl bg-[#171722]/50 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Estimated Cost</p>
                                        <div className="text-2xl font-black text-white">
                                            ₹{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-1">Calculated at Indian Meta rates</p>
                                    </div>

                                    {/* Balance Sufficiency Callout */}
                                    <div className="w-full sm:w-auto flex sm:justify-end">
                                        {wccBalance >= estimatedCost ? (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                                <CheckCircle2 size={14} />
                                                <span>Balance sufficient for this campaign size</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                                                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="font-bold">Insufficient balance.</span> Needs top-up of ₹{(estimatedCost - wccBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* WCC Transaction History Table */}
                            <div className="bg-[#13131a] rounded-xl border border-white/5 overflow-hidden shadow-xl">
                                <div className="px-5 py-4 border-b border-white/5 bg-[#171722]/50 flex items-center gap-2">
                                    <History size={16} className="text-zinc-400" />
                                    <h3 className="font-bold text-sm text-white tracking-tight">Direct Messaging Session History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-white/5 text-zinc-500 font-bold bg-[#171722]/10">
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Session ID</th>
                                                <th className="p-4">Type</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Debit Charge</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02] text-zinc-300">
                                            {[
                                                { date: 'Jun 13, 2026', sess: 'wba_sess_9a2b7c', type: 'Marketing Campaign', charge: '- ₹1,090.00', details: '1000 messages sent', status: 'Success', color: 'text-emerald-400 bg-emerald-500/10' },
                                                { date: 'Jun 12, 2026', sess: 'wba_sess_4f8e91', type: 'Service Support Session', charge: 'Free', details: 'Free Customer Window', status: 'Free Session', color: 'text-purple-400 bg-purple-500/10' },
                                                { date: 'Jun 11, 2026', sess: 'wba_sess_1d3c5f', type: 'Utility Alert', charge: '- ₹29.00', details: '200 notifications sent', status: 'Success', color: 'text-emerald-400 bg-emerald-500/10' },
                                                { date: 'Jun 10, 2026', sess: 'wba_sess_8e7f6d', type: 'OTP Verification', charge: '- ₹14.50', details: '100 OTP delivery auths', status: 'Success', color: 'text-emerald-400 bg-emerald-500/10' },
                                            ].map((tx, i) => (
                                                <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="p-4 text-zinc-400 font-medium">{tx.date}</td>
                                                    <td className="p-4 font-mono text-zinc-500 tracking-tight">{tx.sess}</td>
                                                    <td className="p-4">
                                                        <div className="font-semibold text-zinc-200">{tx.type}</div>
                                                        <div className="text-[10px] text-zinc-500 mt-0.5">{tx.details}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.color}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-right font-bold ${tx.charge === 'Free' ? 'text-purple-400' : 'text-zinc-100'}`}>
                                                        {tx.charge}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* WCC Official Rates Card - Right Column */}
                        <div className="space-y-6">
                            <div className="bg-[#13131a] rounded-xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Info size={80} />
                                </div>
                                <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
                                    <Info size={16} className="text-emerald-400" />
                                    <h3 className="font-bold text-sm text-white tracking-tight">Meta Messaging Rates</h3>
                                </div>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                                    Meta charges for WhatsApp Business conversations on a 24-hour session basis. These credits represent direct pass-through costs billed by Meta.
                                </p>

                                <div className="space-y-4">
                                    {[
                                        { title: 'Marketing', desc: 'Promos, offers, reminders', cost: '₹1.09 / msg', color: 'border-l-pink-500' },
                                        { title: 'Utility', desc: 'Order alerts, transaction info', cost: '₹0.145 / msg', color: 'border-l-sky-500' },
                                        { title: 'Authentication', desc: 'Security codes, logins', cost: '₹0.145 / msg', color: 'border-l-amber-500' },
                                        { title: 'Service Window', desc: 'User-initiated conversations', cost: 'Free / 24h', color: 'border-l-purple-500' },
                                    ].map((rate, i) => (
                                        <div key={i} className={`p-3 bg-[#171722]/50 border border-white/5 border-l-2 ${rate.color} rounded-r-lg`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-white">{rate.title}</span>
                                                <span className="text-xs font-black text-emerald-400">{rate.cost}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-snug">{rate.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-zinc-600" />
                                    <span>Rates represent base estimates for conversation initiation inside India. International traffic carries custom Meta region rates.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================== WCC RECHARGE MODAL ==================== */}
            {isRechargeModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
                    <div 
                        className="bg-[#0c0c12] border border-white/10 p-6 rounded-2xl w-full max-w-[420px] shadow-2xl relative"
                        style={{ boxShadow: '0 0 50px rgba(37,211,102,0.15)' }}
                    >
                        <button 
                            onClick={() => { setIsRechargeModalOpen(false); setCustomAmount(''); }} 
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                <Wallet size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white tracking-tight">Recharge WCC Wallet</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">WhatsApp Conversation Balance</p>
                            </div>
                        </div>

                        <form onSubmit={handleRechargeSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">Select Amount (INR)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['500', '1000', '2000', 'custom'].map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setRechargeAmount(val)}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                                rechargeAmount === val
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/20'
                                                : 'bg-[#171722]/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                                            }`}
                                        >
                                            {val === 'custom' ? 'Custom' : `₹${parseInt(val).toLocaleString('en-IN')}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {rechargeAmount === 'custom' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Enter Custom Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">₹</span>
                                        <input
                                            type="number"
                                            min="100"
                                            max="50000"
                                            placeholder="Min ₹100"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            className="w-full bg-[#13131a] border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors font-semibold"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-[#25d366] hover:bg-[#20bd5a] text-black font-extrabold text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-1.5 mt-2"
                            >
                                <CheckCircle2 size={16} />
                                Confirm Recharge
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
