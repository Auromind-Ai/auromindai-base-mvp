'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useAuth } from '@/context/AuthContext';
import { 
  Zap, TrendingUp, Clock, Wallet, Info, 
  Calculator, History, Plus, Sparkles, CheckCircle2, 
  AlertTriangle, ArrowRight, Coins, X, HelpCircle
} from 'lucide-react';
import api from '@/lib/api';

export default function CreditsPage() {
    const { workspaceId } = useAuth();
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab === 'wcc') return 'wcc';
        }
        return 'ai';
    });

    // WCC Balance State
    const [wccBalance, setWccBalance] = useState(null);
    const [wccBalanceLoading, setWccBalanceLoading] = useState(true);

    // AI Credit Summary State
    const [creditSummary, setCreditSummary] = useState(null);
    const [creditSummaryLoading, setCreditSummaryLoading] = useState(true);

    // AI Credit History State
    const [creditHistory, setCreditHistory] = useState([]);
    const [creditHistoryLoading, setCreditHistoryLoading] = useState(true);
    const [creditHistoryPage, setCreditHistoryPage] = useState(1);
    const [creditHistoryTotal, setCreditHistoryTotal] = useState(0);
    const [creditHistoryVisible, setCreditHistoryVisible] = useState(5);

    // WCC Sessions History State
    const [wccSessions, setWccSessions] = useState([]);
    const [wccSessionsLoading, setWccSessionsLoading] = useState(true);
    const [wccSessionsPage, setWccSessionsPage] = useState(1);
    const [wccSessionsTotal, setWccSessionsTotal] = useState(0);
    const [wccSessionsVisible, setWccSessionsVisible] = useState(5);

    // WCC Rates State
    const [wccRates, setWccRates] = useState([]);
    const [estimatorRates, setEstimatorRates] = useState({
        marketing: 1.25,
        utility: 0.18,
        auth: 0.18,
        service: 0.05
    });

    // Credit Packs State
    const [creditPacks, setCreditPacks] = useState([]);
    const [creditPacksLoading, setCreditPacksLoading] = useState(true);

    // Modals & Action Loading State
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('1000');
    const [customAmount, setCustomAmount] = useState('');
    const [toastMessage, setToastMessage] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Estimator State
    const [audienceSize, setAudienceSize] = useState(1000);
    const [msgType, setMsgType] = useState('marketing');

    // Fetch WCC Balance
    const fetchWccBalance = async () => {
        if (!workspaceId) return;
        try {
            setWccBalanceLoading(true);
            const res = await api.getWccBalance(workspaceId);
            setWccBalance(parseFloat(res.balance ?? res.data?.balance ?? 0));
        } catch (err) {
            console.error('[WCC] Failed to fetch balance:', err);
        } finally {
            setWccBalanceLoading(false);
        }
    };

    // Fetch AI Credit Summary
    const fetchCreditSummary = async () => {
        if (!workspaceId) return;
        try {
            setCreditSummaryLoading(true);
            const res = await api.getCreditSummary(workspaceId);
            setCreditSummary(res.data ?? res ?? null);
        } catch (err) {
            console.error('[CREDITS] Failed to fetch credit summary:', err);
        } finally {
            setCreditSummaryLoading(false);
        }
    };

    // Fetch AI Credit History (TokenLedger)
    const fetchCreditHistory = async (page) => {
        if (!workspaceId) return;
        try {
            setCreditHistoryLoading(true);
            const res = await api.getCreditHistory(workspaceId, page);
            const data = res.data ?? res;
            setCreditHistory(data.entries ?? []);
            setCreditHistoryTotal(data.total ?? 0);
        } catch (err) {
            console.error('[CREDITS] Failed to fetch credit history:', err);
        } finally {
            setCreditHistoryLoading(false);
        }
    };



    // Fetch WCC Sessions History
    const fetchWccSessions = async (page) => {
        if (!workspaceId) return;
        try {
            setWccSessionsLoading(true);
            const res = await api.getWccSessions(workspaceId, page, 10);
            const data = res.data ?? res;
            setWccSessions(data.sessions ?? []);
            setWccSessionsTotal(data.total_count ?? 0);
        } catch (err) {
            console.error('[WCC] Failed to fetch sessions:', err);
        } finally {
            setWccSessionsLoading(false);
        }
    };

    // Fetch Credit Packs
    const fetchCreditPacks = async () => {
        if (!workspaceId) return;
        try {
            setCreditPacksLoading(true);
            const res = await api.getCreditPacks(workspaceId);
            setCreditPacks(res.data ?? res ?? []);
        } catch (err) {
            console.error('[CREDITS] Failed to fetch credit packs:', err);
        } finally {
            setCreditPacksLoading(false);
        }
    };

    // Fetch WCC Rates
    const fetchWccRates = async () => {
        if (!workspaceId) return;
        try {
            const res = await api.getWccRates(workspaceId);
            const ratesList = res.data ?? res ?? [];
            setWccRates(ratesList);
            
            // Populate estimator rates mapping for Indian region (or default first matching)
            const map = { ...estimatorRates };
            ratesList.forEach(item => {
                if (item.region === 'IN' || !item.region) {
                    map[item.category.toLowerCase()] = parseFloat(item.rate_per_message);
                }
            });
            setEstimatorRates(map);
        } catch (err) {
            console.error('[WCC] Failed to fetch rates:', err);
        }
    };

    // Initial load
    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchWccBalance();
            fetchCreditSummary();
            fetchCreditHistory(creditHistoryPage);
            fetchWccSessions(wccSessionsPage);
            fetchCreditPacks();
            fetchWccRates();
        }
    }, [workspaceId]);

    // Handle page changes
    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchCreditHistory(creditHistoryPage);
        }
    }, [creditHistoryPage]);

    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchWccSessions(wccSessionsPage);
        }
    }, [wccSessionsPage]);

    const estimatedCost = audienceSize * (estimatorRates[msgType] || 0);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // WCC Recharge Order Flow
    const handleRechargeSubmit = async (e) => {
        e.preventDefault();
        const amount = rechargeAmount === 'custom' ? parseFloat(customAmount) : parseFloat(rechargeAmount);
        if (isNaN(amount) || amount <= 0) {
            triggerToast('⚠️ Please enter a valid recharge amount');
            return;
        }
        if (!workspaceId) {
            triggerToast('⚠️ Workspace not found. Please sign in again.');
            return;
        }
        setActionLoading(true);
        try {
            const checkout = await api.initiateWccRecharge(workspaceId, amount);
            const orderData = checkout.data ?? checkout;

            api.openRazorpayCheckout({
                orderData,
                name: 'Auromind',
                description: `WCC Wallet Recharge - ₹${amount}`,
                handler: async (response) => {
                    try {
                        setActionLoading(true);
                        const verifyPayload = {
                            workspace_id: workspaceId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        };
                        await api.verifyWccRecharge(verifyPayload);
                        await fetchWccBalance();
                        setIsRechargeModalOpen(false);
                        setCustomAmount('');
                        triggerToast(`✅ Wallet successfully recharged with ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
                    } catch (verifyErr) {
                        console.error('[WCC RECHARGE] Verification failed:', verifyErr);
                        triggerToast('⚠️ Payment received but verification failed. Contact support.');
                    } finally {
                        setActionLoading(false);
                    }
                },
                ondismiss: () => {
                    setActionLoading(false);
                }
            });
        } catch (err) {
            console.error('[WCC RECHARGE] Error:', err);
            triggerToast(`⚠️ Failed to initiate recharge: ${err.message || 'Unknown error'}`);
            setActionLoading(false);
        }
    };

    // Credit Pack Purchase Flow
    const handlePurchaseCreditPack = async (packId, packName, amount) => {
        if (!workspaceId) {
            triggerToast('⚠️ Workspace context missing.');
            return;
        }
        setActionLoading(true);
        try {
            triggerToast(`🛒 Initiating purchase for ${packName}...`);
            const res = await api.initiateCreditPackPurchase(workspaceId, packId);
            const orderData = res.data ?? res;

            api.openRazorpayCheckout({
                orderData,
                name: 'Auromind',
                description: `AI Credit Pack - ${packName}`,
                handler: async (response) => {
                    try {
                        setActionLoading(true);
                        const verifyPayload = {
                            workspace_id: workspaceId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            provider: 'razorpay'
                        };
                        await api.verifyCreditPackPayment(verifyPayload);
                        triggerToast(`✅ Successfully purchased ${packName}!`);
                        fetchCreditSummary();
                        fetchCreditHistory(creditHistoryPage);
                    } catch (verifyErr) {
                        console.error('[CREDITS PURCHASE] Verification failed:', verifyErr);
                        triggerToast('⚠️ Payment received but verification failed. Contact support.');
                    } finally {
                        setActionLoading(false);
                    }
                },
                ondismiss: () => {
                    setActionLoading(false);
                }
            });
        } catch (err) {
            console.error('[CREDITS PURCHASE] Error:', err);
            triggerToast(`⚠️ Failed to initiate purchase: ${err.message || 'Unknown error'}`);
            setActionLoading(false);
        }
    };

    // Helper to format dates safely
    const formatDate = (value) => {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    };

    // Helper to format credits safely with configurable precision
    const formatCredits = (value, precision = 2) => {
        if (value === undefined || value === null || isNaN(Number(value))) return '—';
        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    };

    // Helper to calculate Used Today from daily_usage
    const getUsedToday = () => {
        if (!creditSummary || !creditSummary.daily_usage) return '—';
        const todayStr = new Date().toISOString().split('T')[0];
        const todayUsage = creditSummary.daily_usage.find(item => (item.date || item.day) === todayStr);
        return todayUsage ? formatCredits(todayUsage.credits_used, 2) : '0.00';
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
                    <p className="text-[#9b9b9b] text-sm font-medium max-w-3xl leading-relaxed font-sans">
                        Your account balances are separated: <span className="text-purple-400 font-semibold">AI Workspace Credits</span> are used to power AI model executions (LLMs) and vector database document synchronization, while <span className="text-emerald-400 font-semibold">WhatsApp Credits (WCC)</span> act as a prepaid wallet to pay Meta directly for WhatsApp API conversation charges.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-white/5 mb-8 overflow-x-auto no-scrollbar gap-6">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 pb-3.5 text-sm font-bold tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
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
                        className={`flex items-center gap-2 pb-3.5 text-sm font-bold tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
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
                    <div className="animate-in fade-in-50 duration-300 space-y-8">
                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-[#1a1333] to-[#0c081e] rounded-2xl p-6 md:p-8 text-white shadow-2xl border border-purple-500/20 overflow-hidden relative group">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                                <Coins size={140} />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                                <div className="space-y-3">
                                    <p className="text-purple-300/80 text-[10px] font-black uppercase tracking-[0.2em]">Available AI Workspace Credits</p>
                                    <div className="flex flex-col gap-2">
                                        <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                                            {creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_balance, 2)}
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md w-fit">
                                            AI Model credits remaining
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-purple-500/10">
                                        <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                                        <p className="text-zinc-400 text-xs font-medium">
                                            {creditSummaryLoading ? 'Loading details...' : `Reserved: ${formatCredits(creditSummary?.credits_reserved ?? 0, 2)} • Automatic reset on monthly cycle`}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => triggerToast('ℹ️ AI credits are replenished upon your plan subscription renewal cycle.')}
                                    className="px-6 py-3 bg-[#814AC8] hover:bg-[#905ad6] text-white font-bold text-sm rounded-xl transition-all active:scale-95 hover:scale-[1.02] shadow-lg shadow-purple-900/30 w-full sm:w-auto text-center cursor-pointer"
                                >
                                    View Subscription Plan
                                </button>
                            </div>
                        </div>

                        {/* Usage Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 shadow-lg flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-purple-50/5 flex items-center justify-center text-purple-400 border border-white/5">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">{creditSummaryLoading ? '...' : getUsedToday()}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Used Today</div>
                                </div>
                            </div>

                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 shadow-lg flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-purple-50/5 flex items-center justify-center text-purple-400 border border-white/5">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_used, 2)}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Used This Month</div>
                                </div>
                            </div>

                            <div className="bg-[#13131a] rounded-xl p-5 border border-white/5 shadow-lg flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-purple-50/5 flex items-center justify-center text-purple-400 border border-white/5">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">
                                        {creditSummaryLoading ? '...' : (!creditSummary || creditSummary.days_remaining === -1 || creditSummary.days_remaining == null) ? '—' : `${creditSummary.days_remaining} days`}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Estimated Days Left</div>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Credit Top-up packs */}
                        <div>
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Top Up AI Credits</h2>
                            {creditPacksLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
                                </div>
                            ) : creditPacks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                                    {creditPacks.map((pack) => (
                                        <div key={pack.id} className="bg-[#13131a] rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between h-full min-h-[200px] group">
                                            <div>
                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 group-hover:text-purple-400 transition-colors">{pack.name}</div>
                                                <div className="text-3xl font-bold text-white mb-0.5 tracking-tight">₹{parseFloat(pack.amount).toLocaleString('en-IN')}</div>
                                                <div className="text-xs font-medium text-zinc-500 tracking-wide mb-6">{pack.credits.toLocaleString()} AI Credits</div>
                                            </div>
                                            <button 
                                                onClick={() => handlePurchaseCreditPack(pack.pack_id, pack.name, parseFloat(pack.amount))}
                                                className="w-full py-2.5 bg-white/[0.03] hover:bg-purple-600 hover:text-white transition-all text-zinc-300 text-xs font-bold rounded-xl border border-white/10 active:scale-95 shadow-sm font-sans cursor-pointer"
                                            >
                                                Purchase Pack
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                                    No top-up plans available.
                                </div>
                            )}
                        </div>

                        {/* AI Credit Ledger History */}
                        <div className="bg-[#13131a] rounded-xl border border-white/5 overflow-hidden shadow-xl">
                            <div className="px-5 py-4 border-b border-white/5 bg-[#171722]/50 flex items-center gap-2">
                                <History size={16} className="text-zinc-400" />
                                <h3 className="font-bold text-sm text-white tracking-tight">AI Credit History</h3>
                            </div>
                            {creditHistoryLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
                                </div>
                            ) : creditHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                                        <thead>
                                            <tr className="border-b border-white/5 text-zinc-500 font-bold bg-[#171722]/10 uppercase tracking-wider text-[10px]">
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Feature</th>
                                                <th className="p-4">Credits Used</th>
                                                <th className="p-4">Balance Source</th>
                                                <th className="p-4">Remaining Credits</th>
                                                <th className="p-4">Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02] text-zinc-300">
                                           {creditHistory.slice(0, creditHistoryVisible).map((item) => {
                                                const value = Number(item.credits_delta ?? 0);
                                                const isDeduction = value < 0;
                                                const isZero = Math.abs(value) < 0.0000001;
                                                return (
                                                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="p-4 text-zinc-400 font-medium">{formatDate(item.created_at)}</td>
                                                        <td className="p-4 font-semibold text-zinc-200">{item.description || 'System Process'}</td>
                                                        <td className={`p-4 font-bold ${isDeduction ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            {isDeduction || isZero ? '' : '+'}{formatCredits(item.credits_delta, 4)}
                                                        </td>
                                                        <td className="p-4 capitalize font-medium text-zinc-400">{item.entry_type.replace('_', ' ')}</td>
                                                        <td className="p-4 text-zinc-500">—</td>
                                                        <td className="p-4 font-mono text-zinc-500 text-[10px] tracking-tight">{item.id.slice(0, 8)}...</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-500 text-xs">
                                    No AI usage yet.
                                </div>
                            )}

                            {/* Credit ledger Pagination */}
                            {creditHistory.length > 5 && (
                                                            <div className="px-5 py-4 border-t border-white/5 flex justify-center">
                                                                {creditHistoryVisible < creditHistory.length ? (
                                                                    <button
                                                                        onClick={() =>
                                                                            setCreditHistoryVisible((prev) =>
                                                                                Math.min(prev + 5, creditHistory.length)
                                                                            )
                                                                        }
                                                                        className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
                                                                    >
                                                                        View More
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setCreditHistoryVisible(5)}
                                                                        className="px-5 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold"
                                                                    >
                                                                        View Less
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
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
                                                {wccBalanceLoading ? '...' : `₹${wccBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
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
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25d366] hover:bg-[#20bd5a] text-black font-extrabold text-sm rounded-xl transition-all active:scale-95 hover:scale-[1.02] shadow-lg shadow-emerald-900/20 w-full sm:w-auto text-center cursor-pointer"
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
                                                className="flex-1 accent-emerald-500 h-1.5 rounded-lg bg-zinc-800 self-center"
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
                                            <option value="marketing">Marketing (₹{(estimatorRates.marketing || 0).toFixed(3)} / msg)</option>
                                            <option value="utility">Utility (₹{(estimatorRates.utility || 0).toFixed(3)} / msg)</option>
                                            <option value="auth">Authentication (₹{(estimatorRates.auth || 0).toFixed(3)} / msg)</option>
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
                                {wccSessionsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500" />
                                    </div>
                                ) : wccSessions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-white/5 text-zinc-500 font-bold bg-[#171722]/10 uppercase tracking-wider text-[10px]">
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Meta Conversation / Session ID</th>
                                                    <th className="p-4">Conversation Category</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4 text-right">Debit Amount</th>
                                                    <th className="p-4">Wallet Balance After Debit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02] text-zinc-300">
                                                {wccSessions.slice(0, wccSessionsVisible).map((tx, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="p-4 text-zinc-400 font-medium">{formatDate(tx.date)}</td>
                                                        <td className="p-4 font-mono text-zinc-500 tracking-tight">{tx.session_id}</td>
                                                        <td className="p-4 capitalize font-semibold text-zinc-200">{tx.category}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                tx.status === 'success' || tx.status === 'free_session' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                                                            }`}>
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right font-bold text-zinc-100">
                                                            ₹{parseFloat(tx.debit_amount).toFixed(2)}
                                                        </td>
                                                        <td className="p-4 text-zinc-500">—</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 text-xs">
                                        No conversation sessions found.
                                    </div>
                                )}

                                {/* WCC Sessions Pagination */}
                                {wccSessions.length > 5 && (
    <div className="px-5 py-4 border-t border-white/5 flex justify-center">
        {wccSessionsVisible < wccSessions.length ? (
            <button
                onClick={() =>
                    setWccSessionsVisible((prev) =>
                        Math.min(prev + 5, wccSessions.length)
                    )
                }
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            >
                View More
            </button>
        ) : (
            <button
                onClick={() => setWccSessionsVisible(5)}
                className="px-5 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold"
            >
                View Less
            </button>
        )}
    </div>
)}
                            </div>

                            {/* WCC Recharge Logs Section */}
                            <div className="bg-[#13131a] rounded-xl border border-white/5 overflow-hidden shadow-xl">
                                <div className="px-5 py-4 border-b border-white/5 bg-[#171722]/50 flex items-center gap-2">
                                    <Plus size={16} className="text-zinc-400" />
                                    <h3 className="font-bold text-sm text-white tracking-tight">Recharge History</h3>
                                </div>
                                <div className="text-center py-12 text-zinc-500 text-xs">
                                    No recharge history available.
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
                                    <h3 className="font-bold text-sm text-white tracking-tight">WhatsApp Conversation Pricing</h3>
                                </div>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                                    WhatsApp Business API charges are calculated on a 24-hour conversation session basis. Rates below represent our platform's conversation charges.
                                </p>

                                <div className="space-y-4">
                                    {[
                                        { title: 'Marketing', desc: 'Promos, offers, reminders', cost: `₹${(estimatorRates.marketing || 0).toFixed(3)} / conversation`, color: 'border-l-pink-500' },
                                        { title: 'Utility', desc: 'Order alerts, transaction info', cost: `₹${(estimatorRates.utility || 0).toFixed(3)} / conversation`, color: 'border-l-sky-500' },
                                        { title: 'Authentication', desc: 'Security codes, logins', cost: `₹${(estimatorRates.auth || 0).toFixed(3)} / conversation`, color: 'border-l-amber-500' },
                                        { title: 'Service Window', desc: 'User-initiated conversations (includes ₹0.05 platform fee)', cost: `₹${(estimatorRates.service || 0).toFixed(3)} / conversation`, color: 'border-l-purple-500' },
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
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 cursor-pointer"
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
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
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
                                disabled={actionLoading}
                                className={`w-full py-3 text-black font-extrabold text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-1.5 mt-2 cursor-pointer ${
                                    actionLoading ? 'bg-emerald-700 cursor-not-allowed opacity-70' : 'bg-[#25d366] hover:bg-[#20bd5a]'
                                }`}
                            >
                                <CheckCircle2 size={16} />
                                {actionLoading ? 'Processing...' : 'Confirm Recharge'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Razorpay Checkout Script */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        </div>
    );
}
