'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, TrendingUp, Clock, Wallet, Info,
  Calculator, History, Plus, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Coins, X, HelpCircle,
  Minus, PieChart, Receipt, Gauge
} from 'lucide-react';
import api from '@/lib/api';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    variable: '--font-poppins',
});

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

    // ---- Presentational-only UI state (added for redesign; does not touch business logic) ----
    const [selectedPackIndex, setSelectedPackIndex] = useState(0);
    const [activityView, setActivityView] = useState('transactions'); // 'transactions' | 'billing'
    const addFundsRef = useRef(null);

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

    // Initial load for general credit stats
    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchWccBalance();
            fetchCreditSummary();
            fetchCreditPacks();
            fetchWccRates();
        }
    }, [workspaceId]);

    // Handle initial load & page changes for Credit History
    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchCreditHistory(creditHistoryPage);
        }
    }, [workspaceId, creditHistoryPage]);

    // Handle initial load & page changes for WCC Sessions
    useEffect(() => {
        if (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') {
            fetchWccSessions(wccSessionsPage);
        }
    }, [workspaceId, wccSessionsPage]);

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

            await api.openRazorpayCheckout({
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

            await api.openRazorpayCheckout({
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

    // ---- Presentation-only derived values (pure display math over already-fetched data; no new API calls, no change to stored calculations) ----
    const balanceNum = Number(creditSummary?.credits_balance ?? 0);
    const usedNum = Number(creditSummary?.credits_used ?? 0);
    const cycleTotal = balanceNum + usedNum;
    const usedPct = cycleTotal > 0 ? Math.min(100, (usedNum / cycleTotal) * 100) : 0;
    const remainingPct = cycleTotal > 0 ? Math.max(0, 100 - usedPct) : 0;

    const avgDailyBurn = creditSummary?.avg_daily_burn ?? (
        creditSummary?.daily_usage?.length
            ? creditSummary.daily_usage.reduce((sum, d) => sum + Number(d.credits_used || 0), 0) / creditSummary.daily_usage.length
            : null
    );

    // Group AI credit history by entry_type for a "where credits go" breakdown, purely for display
    const distributionPalette = ['#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#38bdf8'];
    const distributionMap = {};
    creditHistory.forEach(item => {
        const key = (item.entry_type || 'other').replace('_', ' ');
        const amt = Math.abs(Number(item.credits_delta || 0));
        distributionMap[key] = (distributionMap[key] || 0) + amt;
    });
    const distributionTotal = Object.values(distributionMap).reduce((a, b) => a + b, 0);
    const distributionEntries = Object.entries(distributionMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value], i) => ({
            label,
            value,
            pct: distributionTotal > 0 ? (value / distributionTotal) * 100 : 0,
            color: distributionPalette[i % distributionPalette.length]
        }));

    // WCC wallet health zone (Empty / Low / Healthy / Full) - purely presentational threshold on existing balance value
    const walletZones = [
        { key: 'Empty', color: '#f43f5e' },
        { key: 'Low', color: '#f59e0b' },
        { key: 'Healthy', color: '#25d366' },
        { key: 'Full', color: '#d4b483' },
    ];
    const getWalletZoneIndex = (balance) => {
        if (balance === null || balance === undefined) return 0;
        if (balance <= 0) return 0;
        if (balance < 500) return 1;
        if (balance < 5000) return 2;
        return 3;
    };
    const walletZoneIndex = getWalletZoneIndex(wccBalance);

    const scrollToAddFunds = () => {
        addFundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const rechargeAmountNumber = rechargeAmount === 'custom'
        ? (parseFloat(customAmount) || 0)
        : (parseFloat(rechargeAmount) || 0);
    const approxConversations = Math.floor(rechargeAmountNumber / (estimatorRates.marketing || 1));

    const adjustRechargeAmount = (delta) => {
        const current = rechargeAmount === 'custom' ? (parseFloat(customAmount) || 0) : (parseFloat(rechargeAmount) || 0);
        const next = Math.max(100, Math.min(50000, current + delta));
        setRechargeAmount(String(next));
        setCustomAmount('');
    };

    return (
        <div className={`${poppins.className} w-full bg-[#07070a] min-h-screen text-white pt-5 md:pt-8 pb-8 relative overflow-hidden`}>
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
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80 cursor-pointer">
                        <X size={14} className="text-white/40 hover:text-white" />
                    </button>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 relative z-10">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl lg:text-[34px] font-medium text-white tracking-tight font-display mb-2">Credits &amp; Wallet</h1>
                    <p className="text-[#8f8f97] text-sm font-medium max-w-3xl leading-relaxed font-sans">
                        Track <span className="text-purple-400 font-semibold">AI Workspace Credits</span> usage and your <span className="text-emerald-400 font-semibold">WhatsApp (WCC)</span> prepaid balance in one place — with live burn rate, forecasts, and recharge tools.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-white/5 mb-6 overflow-x-auto no-scrollbar gap-7">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 pb-3.5 text-sm tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
                            activeTab === 'ai'
                            ? 'border-purple-500 text-purple-400 font-bold'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 font-semibold'
                        }`}
                    >
                        AI Workspace Credits
                    </button>
                    <button
                        onClick={() => setActiveTab('wcc')}
                        className={`flex items-center gap-2 pb-3.5 text-sm tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
                            activeTab === 'wcc'
                            ? 'border-emerald-500 text-emerald-400 font-bold'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 font-semibold'
                        }`}
                    >
                        WhatsApp Credits (WCC)
                    </button>
                </div>

                {/* ==================== TAB 1: AI CREDITS ==================== */}
                {activeTab === 'ai' && (
                    <div className="animate-in fade-in-50 duration-300 space-y-6">

                        {/* Row 1: Wallet Overview + Recharge Packs */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                            {/* Wallet Overview (spans 2 cols) */}
                            <div className="lg:col-span-2 bg-[#0e0e14] rounded-2xl p-6 md:p-7 border border-white/5 shadow-xl relative overflow-hidden">
                                <p className="text-white/60 text-[14px] font-medium mb-4">Wallet Overview</p>
                                <p className="text-zinc-400 text-xs font-medium mb-5">AI Workspace Credits available</p>

                                <div className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none mb-7">
                                    {creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_balance, 2)}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-8 text-sm">
                                    <div>
                                        <span className="text-white/55 text-xs mr-1.5">Used today</span>
                                        <span className="font-semibold text-white">{creditSummaryLoading ? '...' : getUsedToday()}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/55 text-xs mr-1.5">Used this month</span>
                                        <span className="font-semibold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_used, 2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/55 text-xs mr-1.5">Runway</span>
                                        <span className="font-semibold text-white">
                                            {creditSummaryLoading ? '...' : (!creditSummary || creditSummary.days_remaining === -1 || creditSummary.days_remaining == null) ? '—' : `${creditSummary.days_remaining} days`}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-zinc-400">Credit Used</span>
                                        <span className="text-xs font-bold text-purple-300">{cycleTotal > 0 ? `${usedPct.toFixed(2)} %` : '—'}</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                                            style={{ width: `${cycleTotal > 0 ? usedPct : 0}%` }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => triggerToast('ℹ️ AI credits are replenished upon your plan subscription renewal cycle.')}
                                    className="px-6 py-3 bg-[#814AC8] hover:bg-[#905ad6] text-white font-medium text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-900/30 cursor-pointer"
                                >
                                    Recharge Wallet
                                </button>
                            </div>

                            {/* Recharge Packs (sidebar) */}
                            <div className="bg-[#0e0e14] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col">
                                <p className="text-white/60 text-[14px] font-medium mb-1">Recharge packs</p>
                                <p className="text-white text-base font-medium mb-4">Top up AI Credits</p>

                                {creditPacksLoading ? (
                                    <div className="flex justify-center py-10">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
                                    </div>
                                ) : creditPacks.length > 0 ? (
                                    <div className="space-y-3 flex-1">
                                        {creditPacks.map((pack, idx) => (
                                            <button
                                                key={pack.id}
                                                type="button"
                                                onClick={() => setSelectedPackIndex(idx)}
                                                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                    selectedPackIndex === idx
                                                        ? 'border-purple-500 bg-purple-500/5'
                                                        : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{pack.name}</div>
                                                        <div className="text-lg font-extrabold text-white leading-none">
                                                            ₹{parseFloat(pack.amount).toLocaleString('en-IN')}
                                                            <span className="text-[11px] font-medium text-zinc-500 ml-1">per month</span>
                                                        </div>
                                                        <div className="text-xs font-medium text-zinc-500 mt-1">{pack.credits.toLocaleString()} AI credits</div>
                                                    </div>
                                                    <span className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                                        selectedPackIndex === idx ? 'border-purple-500' : 'border-zinc-600'
                                                    }`}>
                                                        {selectedPackIndex === idx && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center text-zinc-500 text-xs flex-1 flex items-center justify-center">
                                        No top-up plans available.
                                    </div>
                                )}

                                <button
                                    disabled={creditPacks.length === 0 || actionLoading}
                                    onClick={() => {
                                        const pack = creditPacks[selectedPackIndex];
                                        if (pack) handlePurchaseCreditPack(pack.pack_id, pack.name, parseFloat(pack.amount));
                                    }}
                                    className="mt-4 w-full py-3 bg-[#814AC808] hover:bg-[#814AC8] hover:text-white text-[#814AC8] font-medium text-sm rounded-xl border border-purple-500/30 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Purchase selected pack
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Credit Health / Credit Distribution / Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ gridAutoRows: '1fr' }}>

                            {/* Credit Health */}
                            <div className="bg-[#0e0e14] rounded-2xl p-6 md:p-7 border border-white/5 shadow-xl flex flex-col overflow-hidden">
                                <p className="text-white/60 text-[14px] font-medium mb-1">Credit Health</p>
                                <p className="text-white text-base font-medium mb-10">Monthly Cycle</p>

                                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-5">
                                    {/* Circle - left side */}
                                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                                        <svg viewBox="0 0 100 100" className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90">
                                            <defs>
                                                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#22d3ee" />
                                                    <stop offset="100%" stopColor="#818cf8" />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                                            <circle
                                                cx="50" cy="50" r="42" fill="none"
                                                stroke="url(#healthGradient)" strokeWidth="9" strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 42}`}
                                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - (cycleTotal > 0 ? remainingPct / 100 : 0.99))}`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-white">{cycleTotal > 0 ? `${remainingPct.toFixed(0)}%` : '—'}</span>
                                            <span className="text-[11px] text-zinc-500 font-semibold mt-1">Remaining</span>
                                        </div>
                                    </div>

                                    {/* Details - right side */}
                                    <div className="flex-1 w-full space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Monthly grant</span>
                                            <span className="font-bold text-white">{creditSummary?.monthly_grant != null ? formatCredits(creditSummary.monthly_grant, 2) : (cycleTotal > 0 ? formatCredits(cycleTotal, 2) : '—')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Used this cycle</span>
                                            <span className="font-bold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_used, 2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Avg. daily burn (7d)</span>
                                            <span className="font-bold text-white">{avgDailyBurn != null ? formatCredits(avgDailyBurn, 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Cycle resets</span>
                                            <span className="font-bold text-emerald-400">{creditSummary?.cycle_reset_date ? formatDate(creditSummary.cycle_reset_date).split(',')[0] : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Distribution */}
                            <div className="bg-[#0e0e14] rounded-2xl p-6 md:p-7 border border-white/5 shadow-xl flex flex-col overflow-hidden">
                                <p className="text-white/60 text-[14px] font-medium mb-1">Credit Distribution</p>
                                <p className="text-white text-base font-medium mb-1">Where credits go <span className="text-zinc-500 text-xs font-medium">- recent history</span></p>
                                <p className="text-2xl font-extrabold text-white mt-4 mb-1">
                                    {distributionTotal > 0 ? formatCredits(distributionTotal, 2) : '0.00'}
                                    <span className="text-xs font-medium text-zinc-500 ml-1.5">credits consumed</span>
                                </p>

                                <div className="space-y-5 mt-7 flex-1">
                                    {distributionEntries.length > 0 ? distributionEntries.map((entry) => (
                                        <div key={entry.label}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-zinc-300 capitalize">{entry.label}</span>
                                                <span className="text-[11px] font-bold text-zinc-500">
                                                    {formatCredits(entry.value, 0)} credits <span className="text-zinc-400">{entry.pct.toFixed(0)}%</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${entry.pct}%`, backgroundColor: entry.color }}
                                                />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex items-center justify-center h-full py-8 text-zinc-500 text-xs">No usage recorded yet.</div>
                                    )}
                                </div>
                            </div>

                            {/* Activity: Transactions & Billing */}
                            <div className="bg-[#0e0e14] rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                                <div className="p-6 md:p-7 pb-0">
                                    <p className="text-white/60 text-[14px] font-medium mb-2">Activity</p>
                                    <div className="flex justify-center w-full bg-white/[0.03] p-1 rounded-lg border border-white/5">
                                        <button
                                            onClick={() => setActivityView('transactions')}
                                            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activityView === 'transactions' ? 'bg-[#814AC8]/25 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            Transactions
                                        </button>
                                        <button
                                            onClick={() => setActivityView('billing')}
                                            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activityView === 'billing' ? 'bg-[#814AC8]/25 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            Billing
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto min-h-[175px] max-h-[175px]">
                                    {activityView === 'transactions' ? (
                                        creditHistoryLoading ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-purple-500" />
                                            </div>
                                        ) : creditHistory.length > 0 ? (
                                            creditHistory.map((item) => {
                                                const value = Number(item.credits_delta ?? 0);
                                                const isDeduction = value < 0;
                                                return (
                                                    <div key={item.id} className="px-6 md:px-7 py-3.5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs font-medium text-zinc-200">{item.description || 'System Process'}</p>
                                                            <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(item.created_at)}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold ${isDeduction ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            {isDeduction ? '' : '+'}{formatCredits(item.credits_delta, 2)}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-zinc-500 text-xs">No AI usage yet.</div>
                                        )
                                    ) : (
                                        creditHistoryLoading ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-purple-500" />
                                            </div>
                                        ) : (() => {
                                            const billingEntries = creditHistory.filter(item => {
                                                const type = (item.entry_type || '').toLowerCase();
                                                const delta = Number(item.credits_delta ?? 0);
                                                return type === 'purchase' || type === 'token_grant' || type === 'topup' || type === 'plan_credits' || delta > 0;
                                            });
                                            return billingEntries.length > 0 ? (
                                                billingEntries.slice(0, 8).map((item) => (
                                                    <div key={item.id} className="px-6 md:px-7 py-3.5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs font-medium text-zinc-200">{item.description || 'Credit Addition'}</p>
                                                            <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(item.created_at)}</p>
                                                        </div>
                                                        <span className="text-xs font-bold text-emerald-400">
                                                            +{formatCredits(Math.abs(Number(item.credits_delta ?? 0)), 2)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-zinc-500 text-xs">No billing history yet. Purchase a credit pack to see entries here.</div>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        </div>
                     
                    </div>
                )}

                {/* ==================== TAB 2: WHATSAPP CREDITS (WCC) ==================== */}
                {activeTab === 'wcc' && (
                    <div className="space-y-6 animate-in fade-in-50 duration-300">

                        {/* Prepaid WCC Wallet Card - full width */}
                        <div className="bg-[#0e0e14] rounded-2xl p-6 md:p-8 border border-white/5 shadow-xl">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                <div className="flex-1">
                                    <p className="text-white/70 text-[13px] font-medium mb-1">WhatsApp conversation wallet (WCC)</p>

                                    <div className="text-4xl md:text-5xl font-semibold tracking-tight text-white leading-none my-4">
                                        {wccBalanceLoading ? '...' : `₹${(wccBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                    </div>

                                    {/* Wallet health gradient bar */}
                                    <div className="mb-2 max-w-2xl">
                                        <div className="relative">
                                            <div className="flex h-2.5 w-full rounded-full overflow-hidden">
                                                {walletZones.map((zone) => (
                                                    <div key={zone.key} className="flex-1" style={{ backgroundColor: zone.color, opacity: 0.85 }} />
                                                ))}
                                            </div>
                                            <div
                                                className="absolute -top-2.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-white transition-all duration-500"
                                                style={{ left: `${(walletZoneIndex / walletZones.length) * 100 + (100 / walletZones.length) / 2}%`, transform: 'translateX(-50%)' }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            {walletZones.map((zone) => (
                                                <span key={zone.key} className="text-[10px] font-semibold text-zinc-500">{zone.key}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-zinc-400 text-xs leading-relaxed mt-4 mb-5 max-w-xl">
                                        {wccBalance > 0
                                            ? 'Your wallet is active. Recharge anytime to keep Marketing, Utility, Authentication and Service-window conversations running.'
                                            : 'Your wallet is empty, so message sending is currently paused. Recharge to resume Marketing, Utility, Authentication and Service-window conversations instantly.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cost Calculator + Add Funds - equal height, side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                            {/* WCC Campaign Cost Calculator */}
                            <div className="lg:col-span-2 bg-[#0e0e14] rounded-2xl border border-white/5 p-6 md:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-[13px] font-medium mb-1">Cost Calculator</p>
                                <p className="text-white text-base font-semibold mb-1">What will this campaign cost?</p>
                                <p className="text-zinc-500 text-xs mb-5">Pick a conversation type — pricing updates as you go.</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                                    {[
                                        { key: 'marketing', label: 'Marketing', rate: estimatorRates.marketing, unit: 'msg' },
                                        { key: 'utility', label: 'Utility', rate: estimatorRates.utility, unit: 'msg' },
                                        { key: 'auth', label: 'Authentication', rate: estimatorRates.auth, unit: 'msg' },
                                        { key: 'service', label: 'Service', rate: estimatorRates.service, unit: 'custom reply' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setMsgType(opt.key)}
                                            className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                msgType === opt.key
                                                    ? 'bg-[#110229] border-[#814ac8] text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-white/80 hover:text-white hover:border-white/35'
                                            }`}
                                        >
                                            {opt.label}
                                            <div className="text-[9px] font-semibold text-zinc-500 mt-0.5">
                                                {opt.key === 'service' ? 'Free / custom reply' : `₹${(opt.rate || 0).toFixed(3)} / ${opt.unit}`}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[11px] font-bold text-white/60 mb-2">Target Audience Size</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="range"
                                            min="100"
                                            max="20000"
                                            step="100"
                                            value={audienceSize}
                                            onChange={(e) => setAudienceSize(parseInt(e.target.value))}
                                            className="flex-1 accent-[#814ac8] h-1.5 rounded-lg bg-zinc-800 self-center"
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

                                {/* Calculation Results Panel */}
                                <div className="mt-auto p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Estimated Cost</p>
                                        <div className="text-2xl font-black text-white">
                                            ₹{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-[10px] text-white/60 mt-1">Calculated at Indian Meta rates</p>
                                    </div>

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

                            {/* Add Funds (inline recharge form, replaces the old modal; same handler & state) */}
                            <div ref={addFundsRef} className="bg-[#0e0e14] rounded-2xl border border-white/5 p-6 md:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-[13px] font-medium mb-1">Add Funds</p>
                                <p className="text-white text-base font-semibold mb-5">Recharge wallet</p>

                                <form onSubmit={handleRechargeSubmit} className="space-y-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(-100)}
                                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <div className="text-2xl font-extrabold text-white tabular-nums">
                                            ₹{rechargeAmountNumber.toLocaleString('en-IN')}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(100)}
                                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {['500', '1000', '1500', '2000'].map((val) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => { setRechargeAmount(val); setCustomAmount(''); }}
                                                className={`py-2 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                                    rechargeAmount === val
                                                     ? 'bg-[#110229] border-[#814ac8] text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-white/80 hover:text-white hover:border-white/35'
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                        <p className="text-[10px] font-black text-white/70 mb-1.5">This buys you approximately</p>
                                        <div className="text-2xl font-extrabold text-white">{approxConversations.toLocaleString('en-IN')}</div>
                                        <p className="text-[10px] text-white/60 mt-1">Marketing Conversations</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className={`mt-auto w-full py-3 text-white font-medium text-sm rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-1.5 cursor-pointer ${
                                            actionLoading ? 'bg-emerald-700 cursor-not-allowed opacity-70' : 'bg-[#814ac8] hover:bg-[#905ad6]'
                                        }`}
                                    >
                                        <CheckCircle2 size={16} />
                                        {actionLoading ? 'Processing...' : 'Add funds to wallet'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* WCC Recharge Logs Section - full width */}
                        <div className="bg-[#0e0e14] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                            <div className="px-5 md:px-7 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                                <Plus size={16} className="text-zinc-400" />
                                <h3 className="font-bold text-sm text-white tracking-tight">Recharge History</h3>
                            </div>
                            <div className="text-center py-12 text-zinc-500 text-xs">
                                No recharge history available.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Razorpay Checkout Script */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        </div>
    );
}