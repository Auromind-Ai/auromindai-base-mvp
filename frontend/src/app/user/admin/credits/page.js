'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, TrendingUp, Clock, Wallet, Info,
  Calculator, History, Plus, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Coins, X, HelpCircle,
  Minus, PieChart, Receipt, Gauge, Download, FileText,
  ArrowLeftRight, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import HistoryModal from '@/components/common/HistoryModal';
import { TABLE_PREVIEW_LIMIT, TRANSACTION_TYPES } from '@/lib/constants/billingConstants';
import { formatBillingDate, formatBillingAmount, getActivityMeta, formatPaymentMethod } from '@/lib/utils/activityMapper';

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

    // WCC Sessions History State
    const [wccSessions, setWccSessions] = useState([]);
    const [wccSessionsLoading, setWccSessionsLoading] = useState(true);
    const [wccSessionsPage, setWccSessionsPage] = useState(1);

    // WCC Recharge History State
    const [wccRecharges, setWccRecharges] = useState([]);
    const [wccRechargesLoading, setWccRechargesLoading] = useState(true);

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
    const [rechargeAmount, setRechargeAmount] = useState('1000');
    const [customAmount, setCustomAmount] = useState('');
    const [toastMessage, setToastMessage] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // History Modals
    const [isWccRechargeHistoryModalOpen, setIsWccRechargeHistoryModalOpen] = useState(false);
    const [isAiCreditHistoryModalOpen, setIsAiCreditHistoryModalOpen] = useState(false);

    // Estimator State
    const [audienceSize, setAudienceSize] = useState(1000);
    const [msgType, setMsgType] = useState('marketing');

    // UI state
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
        } catch (err) {
            console.error('[WCC] Failed to fetch sessions:', err);
        } finally {
            setWccSessionsLoading(false);
        }
    };

    // Fetch WCC Recharge History
    const fetchWccRecharges = async () => {
        if (!workspaceId) return;
        try {
            setWccRechargesLoading(true);
            const res = await api.getWccUserRechargeLogs(workspaceId, { page: 1, limit: TABLE_PREVIEW_LIMIT });
            const data = res.data ?? res;
            setWccRecharges(data.recharges ?? []);
        } catch (err) {
            console.error('[WCC RECHARGES] Failed to fetch user recharges:', err);
        } finally {
            setWccRechargesLoading(false);
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

    // Workspace Entitlements State
    const [workspaceEntitlements, setWorkspaceEntitlements] = useState(null);

    const fetchWorkspaceEntitlements = async () => {
        if (!workspaceId) return;
        try {
            const res = await api.getWorkspaceEntitlements(workspaceId);
            setWorkspaceEntitlements(res.data ?? res ?? null);
        } catch (err) {
            console.error('[ENTITLEMENTS] Failed to fetch workspace entitlements:', err);
        }
    };

    // Initial load - Batched with in-flight guard to prevent rate-limit over-fetching
    const isInitialDataLoadingRef = useRef(false);

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
        if (isInitialDataLoadingRef.current) return;
        isInitialDataLoadingRef.current = true;

        const loadAllCreditsData = async () => {
            await Promise.allSettled([
                fetchWccBalance(),
                fetchCreditSummary(),
                fetchCreditPacks(),
                fetchWccRates(),
                fetchWccRecharges(),
                fetchWorkspaceEntitlements(),
                fetchCreditHistory(creditHistoryPage),
                fetchWccSessions(wccSessionsPage)
            ]);
            isInitialDataLoadingRef.current = false;
        };

        loadAllCreditsData();
    }, [workspaceId]);

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

    // WCC Recharge Order Flow with Optimistic Balance Update & Promise.all() Refetching
    const handleRechargeSubmit = async (e) => {
        e.preventDefault();
        if (workspaceEntitlements && workspaceEntitlements.allow_wcc_recharge === false) {
            triggerToast('⚠️ WhatsApp Wallet recharge is not available for your current plan. Please upgrade to Pro.');
            return;
        }
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
                    const previousBalance = wccBalance;
                    try {
                        setActionLoading(true);
                        // Optimistically update wallet balance
                        setWccBalance(prev => (prev || 0) + amount);

                        const verifyPayload = {
                            workspace_id: workspaceId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        };
                        await api.verifyWccRecharge(verifyPayload);
                        setCustomAmount('');
                        triggerToast(`✅ Wallet successfully recharged with ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

                        // Refetch all metrics simultaneously
                        await Promise.all([
                            fetchWccBalance(),
                            fetchCreditSummary(),
                            fetchCreditHistory(creditHistoryPage),
                            fetchWccRecharges()
                        ]);
                    } catch (verifyErr) {
                        console.error('[WCC RECHARGE] Verification failed:', verifyErr);
                        setWccBalance(previousBalance);
                        triggerToast('⚠️ Payment received but verification failed. Contact support.');
                        await fetchWccBalance();
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
        if (workspaceEntitlements && workspaceEntitlements.allow_ai_topup === false) {
            triggerToast('⚠️ AI Credit top-up is not available for your current plan. Please upgrade to Pro.');
            return;
        }
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

                        // Refetch metrics in parallel
                        await Promise.all([
                            fetchCreditSummary(),
                            fetchCreditHistory(creditHistoryPage),
                            fetchWccBalance(),
                            fetchWccRecharges()
                        ]);
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

    const handleRechargeWalletClick = () => {
        if (activeTab === 'ai') {
            const pack = creditPacks[selectedPackIndex] || creditPacks[0];
            if (pack) {
                handlePurchaseCreditPack(pack.pack_id, pack.name, parseFloat(pack.amount));
            } else {
                setActiveTab('wcc');
                setTimeout(scrollToAddFunds, 100);
            }
        } else {
            scrollToAddFunds();
        }
    };

    const scrollToAddFunds = () => {
        addFundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const formatCredits = (num, decimals = 0) => {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    const getUsedToday = () => {
        if (!creditSummary?.daily_usage?.length) return '0.00';
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntry = creditSummary.daily_usage.find(d => d.date === todayStr);
        return todayEntry ? formatCredits(todayEntry.credits_used, 2) : '0.00';
    };

    const cycleTotal = Number(creditSummary?.monthly_grant ?? creditSummary?.credits_added ?? 0);
    const cycleUsed = Number(creditSummary?.credits_used ?? 0);
    const usedPct = cycleTotal > 0 ? Math.min((cycleUsed / cycleTotal) * 100, 100) : 0;
    const remainingPct = cycleTotal > 0 ? Math.max(0, 100 - usedPct) : 0;

    const avgDailyBurn = creditSummary?.avg_daily_burn ?? (
        creditSummary?.daily_usage?.length
            ? creditSummary.daily_usage.reduce((sum, d) => sum + Number(d.credits_used || 0), 0) / creditSummary.daily_usage.length
            : null
    );

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
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-3xl lg:text-[34px] font-normal sm:font-medium text-white tracking-tight font-display mb-1.5 sm:mb-2">Credits &amp; Wallet</h1>
                    <p className="text-[#8f8f97] text-xs sm:text-sm font-normal sm:font-medium max-w-3xl leading-relaxed font-sans">
                        Track <span className="text-purple-400 font-normal sm:font-semibold">AI Workspace Credits</span> usage and your <span className="text-emerald-400 font-normal sm:font-semibold">WhatsApp (WCC)</span> prepaid balance in one place — with live burn rate, forecasts, and recharge tools.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-white/5 mb-5 sm:mb-6 overflow-x-auto no-scrollbar gap-5 sm:gap-7">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 pb-2.5 sm:pb-3.5 text-xs sm:text-sm tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
                            activeTab === 'ai'
                            ? 'border-purple-500 text-purple-400 font-normal sm:font-bold'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 font-normal sm:font-semibold'
                        }`}
                    >
                        AI Workspace Credits
                    </button>
                    <button
                        onClick={() => setActiveTab('wcc')}
                        className={`flex items-center gap-2 pb-2.5 sm:pb-3.5 text-xs sm:text-sm tracking-tight border-b-2 transition-all shrink-0 select-none cursor-pointer ${
                            activeTab === 'wcc'
                            ? 'border-emerald-500 text-emerald-400 font-normal sm:font-bold'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 font-normal sm:font-semibold'
                        }`}
                    >
                        WhatsApp Credits (WCC)
                    </button>
                </div>

                {/* ==================== TAB 1: AI CREDITS ==================== */}
                {activeTab === 'ai' && (
                    <div className="animate-in fade-in-50 duration-300 space-y-6">

                        {/* Row 1: Wallet Overview + Recharge Packs */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">

                            {/* Wallet Overview (spans 2 cols) */}
                            <div className="lg:col-span-2 bg-[#0e0e14] rounded-2xl p-4 sm:p-7 border border-white/5 shadow-xl relative overflow-hidden">
                                <p className="text-white/60 text-xs sm:text-[14px] font-normal sm:font-medium mb-3 sm:mb-4">Wallet Overview</p>
                                <p className="text-zinc-400 text-[11px] sm:text-xs font-normal sm:font-medium mb-3 sm:mb-5">AI Workspace Credits available</p>

                                <div className="text-2xl sm:text-4xl md:text-5xl font-semibold sm:font-bold tracking-tight text-white leading-none mb-5 sm:mb-7">
                                    {creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_balance, 2)}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 sm:mb-8 text-xs sm:text-sm">
                                    <div>
                                        <span className="text-white/55 text-[11px] sm:text-xs font-normal mr-1.5">Used today</span>
                                        <span className="font-normal sm:font-semibold text-white">{creditSummaryLoading ? '...' : getUsedToday()}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/55 text-[11px] sm:text-xs font-normal mr-1.5">Used this month</span>
                                        <span className="font-normal sm:font-semibold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_used, 2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/55 text-xs mr-1.5">Runway</span>
                                        <span className="font-semibold text-white">
                                            {creditSummaryLoading ? '...' : (!creditSummary || creditSummary.days_remaining === -1 || creditSummary.days_remaining == null) ? '—' : `${Number(creditSummary.days_remaining).toFixed(2)} days`}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-5 sm:mb-6">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <span className="text-[11px] sm:text-xs font-normal sm:font-bold text-zinc-400">Credit Used</span>
                                        <span className="text-[11px] sm:text-xs font-normal sm:font-bold text-purple-300">{cycleTotal > 0 ? `${usedPct.toFixed(2)} %` : '—'}</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                                            style={{ width: `${cycleTotal > 0 ? usedPct : 0}%` }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleRechargeWalletClick}
                                    className="px-6 py-3 bg-[#814AC8] hover:bg-[#905ad6] text-white font-medium text-sm rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-900/30 cursor-pointer"
                                >
                                    Recharge Wallet
                                </button>
                            </div>

                            {/* Recharge Packs (sidebar) */}
                            <div className="lg:col-span-2 xl:col-span-1 bg-[#0e0e14] rounded-2xl p-4 sm:p-6 border border-white/5 shadow-xl flex flex-col">
                                <p className="text-white/60 text-xs sm:text-[14px] font-normal sm:font-medium mb-1">Recharge packs</p>
                                <p className="text-white text-xs sm:text-base font-normal sm:font-medium mb-3 sm:mb-4">Top up AI Credits</p>

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
                                                className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                    selectedPackIndex === idx
                                                        ? 'border-purple-500 bg-purple-500/5'
                                                        : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[9px] sm:text-[10px] font-normal sm:font-bold text-zinc-500 uppercase tracking-widest mb-1">{pack.name}</div>
                                                        <div className="text-sm sm:text-lg font-semibold sm:font-extrabold text-white leading-none">
                                                            ₹{parseFloat(pack.amount).toLocaleString('en-IN')}
                                                            <span className="text-[10px] sm:text-[11px] font-normal sm:font-medium text-zinc-500 ml-1">per month</span>
                                                        </div>
                                                        <div className="text-[11px] sm:text-xs font-normal sm:font-medium text-zinc-500 mt-1">{pack.credits.toLocaleString()} AI credits</div>
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

                                {workspaceEntitlements?.allow_ai_topup === false && (
                                    <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2">
                                        <AlertTriangle size={15} className="shrink-0" />
                                        <span>AI Credit top-up is disabled on your plan. Upgrade to Pro plan to purchase top-up credits.</span>
                                    </div>
                                )}

                                <button
                                    disabled={creditPacks.length === 0 || actionLoading || workspaceEntitlements?.allow_ai_topup === false}
                                    title={workspaceEntitlements?.allow_ai_topup === false ? "Upgrade to Pro to purchase AI Credits." : ""}
                                    onClick={() => {
                                        if (workspaceEntitlements?.allow_ai_topup === false) {
                                            triggerToast("⚠️ AI Credit top-up is not available for your current plan. Please upgrade to Pro.");
                                            return;
                                        }
                                        const pack = creditPacks[selectedPackIndex];
                                        if (pack) handlePurchaseCreditPack(pack.pack_id, pack.name, parseFloat(pack.amount));
                                    }}
                                    className="mt-4 w-full py-2.5 sm:py-3 bg-[#814AC808] hover:bg-[#814AC8] hover:text-white text-[#814AC8] font-normal sm:font-medium text-xs sm:text-sm rounded-xl border border-purple-500/30 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {workspaceEntitlements?.allow_ai_topup === false ? "Upgrade plan to top up" : "Purchase selected pack"}
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Credit Health / Credit Distribution / Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" style={{ gridAutoRows: '1fr' }}>

                            {/* Credit Health */}
                            <div className="bg-[#0e0e14] rounded-2xl p-4 sm:p-7 border border-white/5 shadow-xl flex flex-col overflow-hidden">
                                <p className="text-white/60 text-xs sm:text-[14px] font-normal sm:font-medium mb-1">Credit Health</p>
                                <p className="text-white text-xs sm:text-base font-normal sm:font-medium mb-6 sm:mb-10">Monthly Cycle</p>

                                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-5">
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
                                            <span className="text-lg sm:text-3xl font-semibold sm:font-extrabold text-white">{cycleTotal > 0 ? `${remainingPct.toFixed(0)}%` : '—'}</span>
                                            <span className="text-[10px] sm:text-[11px] text-zinc-500 font-normal sm:font-semibold mt-0.5 sm:mt-1">Remaining</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Monthly grant</span>
                                            <span className="font-normal sm:font-bold text-white">{creditSummary?.monthly_grant != null ? formatCredits(creditSummary.monthly_grant, 2) : (cycleTotal > 0 ? formatCredits(cycleTotal, 2) : '—')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Used this cycle</span>
                                            <span className="font-normal sm:font-bold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_used, 2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Avg. daily burn (7d)</span>
                                            <span className="font-normal sm:font-bold text-white">{avgDailyBurn != null ? formatCredits(avgDailyBurn, 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Cycle resets</span>
                                            <span className="font-bold text-emerald-400">{creditSummary?.cycle_reset_date ? formatBillingDate(creditSummary.cycle_reset_date) : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Distribution */}
                            <div className="bg-[#0e0e14] rounded-2xl p-4 sm:p-7 border border-white/5 shadow-xl flex flex-col overflow-hidden">
                                <p className="text-white/60 text-xs sm:text-[14px] font-normal sm:font-medium mb-1">Credit Distribution</p>
                                <p className="text-white text-xs sm:text-base font-normal sm:font-medium mb-1">Where credits go <span className="text-zinc-500 text-[11px] sm:text-xs font-normal">- recent history</span></p>
                                <p className="text-lg sm:text-2xl font-semibold sm:font-extrabold text-white mt-3 sm:mt-4 mb-1">
                                    {distributionTotal > 0 ? formatCredits(distributionTotal, 2) : '0.00'}
                                    <span className="text-[11px] sm:text-xs font-normal text-zinc-500 ml-1.5">credits consumed</span>
                                </p>

                                <div className="space-y-4 sm:space-y-5 mt-5 sm:mt-7 flex-1">
                                    {distributionEntries.length > 0 ? distributionEntries.map((entry) => (
                                        <div key={entry.label}>
                                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                <span className="text-[11px] sm:text-xs font-normal sm:font-semibold text-zinc-300 capitalize">{entry.label}</span>
                                                <span className="text-[10px] sm:text-[11px] font-normal sm:font-bold text-zinc-500">
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
                            <div className="lg:col-span-2 xl:col-span-1 bg-[#0e0e14] rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                                <div className="p-5 md:p-6 pb-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-white text-base sm:text-lg font-regular">Activity</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsAiCreditHistoryModalOpen(true)}
                                            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer flex items-center gap-1"
                                        >
                                            <span>View all</span>
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 w-full bg-[#0a0812] p-1.5 rounded-2xl border border-white/10 mb-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setActivityView('transactions')}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                activityView === 'transactions'
                                                    ? 'bg-[#1c122c] border border-[#814ac8] text-white shadow-sm'
                                                    : 'bg-transparent border border-transparent text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <ArrowLeftRight size={15} className={activityView === 'transactions' ? 'text-white' : 'text-zinc-400'} />
                                            <span>Transactions</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActivityView('billing')}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                activityView === 'billing'
                                                    ? 'bg-[#1c122c] border border-[#814ac8] text-white shadow-sm'
                                                    : 'bg-transparent border border-transparent text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <Receipt size={15} className={activityView === 'billing' ? 'text-white' : 'text-zinc-400'} />
                                            <span>Billing</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto min-h-[175px] max-h-[220px]">
                                    {activityView === 'transactions' ? (
                                        creditHistoryLoading ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-purple-500" />
                                            </div>
                                        ) : creditHistory.length > 0 ? (
                                            creditHistory.slice(0, TABLE_PREVIEW_LIMIT).map((item) => {
                                                const value = Number(item.credits_delta ?? 0);
                                                const isDeduction = value < 0;
                                                return (
                                                    <div key={item.id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-[#181326] border border-purple-500/20 flex items-center justify-center shrink-0">
                                                                <Zap size={14} className="text-purple-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-zinc-100 truncate">{item.description || 'System Process'}</p>
                                                                <p className="text-[10px] text-zinc-400 mt-0.5">{formatBillingDate(item.created_at, true)}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs font-semibold shrink-0 ${isDeduction ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            {isDeduction ? '' : '+'}{formatCredits(item.credits_delta, 2)}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-zinc-500 text-xs font-normal">No AI usage yet.</div>
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
                                                billingEntries.slice(0, TABLE_PREVIEW_LIMIT).map((item) => (
                                                    <div key={item.id} className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-[#181326] border border-purple-500/20 flex items-center justify-center shrink-0">
                                                                <Receipt size={14} className="text-purple-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-zinc-100 truncate">{item.description || 'Credit Addition'}</p>
                                                                <p className="text-[10px] text-zinc-400 mt-0.5">{formatBillingDate(item.created_at, true)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-emerald-400 shrink-0">
                                                            +{formatCredits(Math.abs(Number(item.credits_delta ?? 0)), 2)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 text-zinc-500 text-xs font-normal">No billing history yet. Purchase a credit pack to see entries here.</div>
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
                        <div className="bg-[#0e0e14] rounded-2xl p-4 sm:p-8 border border-white/5 shadow-xl">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                                <div className="flex-1">
                                    <p className="text-white/70 text-xs sm:text-[13px] font-normal sm:font-medium mb-1">WhatsApp conversation wallet (WCC)</p>

                                    <div className="text-2xl sm:text-4xl md:text-5xl font-semibold sm:font-bold tracking-tight text-white leading-none my-3 sm:my-4">
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
                                                <span key={zone.key} className="text-[9px] sm:text-[10px] font-normal sm:font-semibold text-zinc-500">{zone.key}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-zinc-400 text-[11px] sm:text-xs font-normal leading-relaxed mt-3 sm:mt-4 mb-4 sm:mb-5 max-w-xl">
                                        {wccBalance > 0
                                            ? 'Your wallet is active. Recharge anytime to keep Marketing, Utility, Authentication and Service-window conversations running.'
                                            : 'Your wallet is empty, so message sending is currently paused. Recharge to resume Marketing, Utility, Authentication and Service-window conversations instantly.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cost Calculator + Add Funds - equal height, side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">

                            {/* WCC Campaign Cost Calculator */}
                            <div className="lg:col-span-2 bg-[#0e0e14] rounded-2xl border border-white/5 p-4 sm:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-xs sm:text-[13px] font-normal sm:font-medium mb-1">Cost Calculator</p>
                                <p className="text-white text-xs sm:text-base font-normal sm:font-semibold mb-1">What will this campaign cost?</p>
                                <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-4 sm:mb-5">Pick a conversation type — pricing updates as you go.</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-5 sm:mb-6">
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
                                            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-xs font-normal sm:font-bold border transition-all cursor-pointer ${
                                                msgType === opt.key
                                                    ? 'bg-[#110229] border-[#814ac8] text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-white/80 hover:text-white hover:border-white/35'
                                            }`}
                                        >
                                            {opt.label}
                                            <div className="text-[11px] font-normal sm:font-medium text-white/60 mt-0.5">
                                                {opt.key === 'service' ? 'Free / custom reply' : `₹${(opt.rate || 0).toFixed(3)} / ${opt.unit}`}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-5 sm:mb-6">
                                    <label className="block text-[10px] sm:text-[11px] font-normal sm:font-bold text-white/60 mb-2">Target Audience Size</label>
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
                                            className="w-16 sm:w-20 px-2 sm:px-2.5 py-1 bg-[#1c1c24] border border-white/5 rounded-lg text-xs sm:text-sm text-center font-normal sm:font-bold text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-auto p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] font-normal sm:font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-1">Estimated Cost</p>
                                        <div className="text-lg sm:text-2xl font-semibold sm:font-black text-white">
                                            ₹{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-[9px] sm:text-[10px] text-white/60 font-normal mt-0.5 sm:mt-1">Calculated at Indian Meta rates</p>
                                    </div>

                                    <div className="w-full sm:w-auto flex sm:justify-end">
                                        {wccBalance >= estimatedCost ? (
                                            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-normal sm:font-semibold">
                                                <CheckCircle2 size={13} />
                                                <span>Balance sufficient for this campaign size</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] sm:text-xs font-normal sm:font-medium">
                                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="font-normal sm:font-bold">Insufficient balance.</span> Needs top-up of ₹{(estimatedCost - wccBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add Funds (inline recharge form) */}
                            <div ref={addFundsRef} className="lg:col-span-2 xl:col-span-1 bg-[#0e0e14] rounded-2xl border border-white/5 p-6 md:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-[13px] font-medium mb-1">Add Funds</p>
                                <p className="text-white text-base font-semibold mb-5">Recharge wallet</p>

                                <form onSubmit={handleRechargeSubmit} className="space-y-4 sm:space-y-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(-100)}
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <div className="text-lg sm:text-2xl font-semibold sm:font-extrabold text-white tabular-nums">
                                            ₹{rechargeAmountNumber.toLocaleString('en-IN')}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(100)}
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                        {['500', '1000', '1500', '2000'].map((val) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => { setRechargeAmount(val); setCustomAmount(''); }}
                                                className={`py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-normal sm:font-bold transition-all border cursor-pointer ${
                                                    rechargeAmount === val
                                                     ? 'bg-[#110229] border-[#814ac8] text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-white/80 hover:text-white hover:border-white/35'
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                        <p className="text-[9px] sm:text-[10px] font-normal sm:font-black text-white/70 mb-1">This buys you approximately</p>
                                        <div className="text-lg sm:text-2xl font-semibold sm:font-extrabold text-white">{approxConversations.toLocaleString('en-IN')}</div>
                                        <p className="text-[9px] sm:text-[10px] text-white/60 font-normal mt-0.5 sm:mt-1">Marketing Conversations</p>
                                    </div>

                                    {workspaceEntitlements?.allow_wcc_recharge === false && (
                                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2">
                                            <AlertTriangle size={15} className="shrink-0" />
                                            <span>WhatsApp Wallet recharge is disabled on your current plan. Please upgrade to Pro plan to unlock wallet recharges.</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={actionLoading || workspaceEntitlements?.allow_wcc_recharge === false}
                                        className={`mt-auto w-full py-3 text-white font-medium text-sm rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-1.5 cursor-pointer ${
                                            workspaceEntitlements?.allow_wcc_recharge === false
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                                                : actionLoading ? 'bg-emerald-700 cursor-not-allowed opacity-70' : 'bg-[#814ac8] hover:bg-[#905ad6]'
                                        }`}
                                    >
                                        <CheckCircle2 size={16} />
                                        {workspaceEntitlements?.allow_wcc_recharge === false
                                            ? 'Recharge Disabled (Upgrade to Pro)'
                                            : actionLoading ? 'Processing...' : 'Add funds to wallet'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* WCC Recharge History Section - Real Data + View All Modal + Action-oriented Empty State */}
                        <div className="bg-[#0e0e14] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                            <div className="px-5 md:px-7 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Plus size={16} className="text-zinc-400" />
                                    <h3 className="font-bold text-sm text-white tracking-tight">Recharge History</h3>
                                </div>
                                {wccRecharges.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsWccRechargeHistoryModalOpen(true)}
                                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
                                    >
                                        View all recharges
                                    </button>
                                )}
                            </div>

                            {wccRechargesLoading ? (
                                <div className="p-8 space-y-3">
                                    {[1, 2, 3].map(i => <div key={i} className="h-10 w-full rounded-lg bg-white/5 animate-pulse" />)}
                                </div>
                            ) : wccRecharges.length === 0 ? (
                                <div className="text-center py-12 px-6 flex flex-col items-center justify-center">
                                    <Wallet size={36} className="text-zinc-600 mb-3" />
                                    <p className="text-sm font-semibold text-zinc-300 mb-1">No recharge history yet</p>
                                    <p className="text-xs text-zinc-500 max-w-sm mb-5">Recharge your wallet to start using WhatsApp Credits for Marketing, Utility and Service conversations.</p>
                                    <button
                                        type="button"
                                        onClick={scrollToAddFunds}
                                        className="px-5 py-2.5 bg-[#814ac8] hover:bg-[#905ad6] text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-900/30 transition-all active:scale-95 cursor-pointer"
                                    >
                                        Recharge Wallet
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-white/[0.02] border-b border-white/5 text-zinc-500 font-semibold uppercase text-[10px]">
                                                <th className="p-4 px-6">Date</th>
                                                <th className="p-4 px-6">Amount</th>
                                                <th className="p-4 px-6">Transaction ID</th>
                                                <th className="p-4 px-6">Status</th>
                                                <th className="p-4 px-6">Method</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-zinc-300">
                                            {wccRecharges.slice(0, TABLE_PREVIEW_LIMIT).map((r) => (
                                                <tr key={r.id || r.payment_id} className="hover:bg-white/[0.02]">
                                                    <td className="p-4 px-6">{formatBillingDate(r.date, true)}</td>
                                                    <td className="p-4 px-6 font-bold text-white">₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-4 px-6 font-mono text-zinc-400 text-[11px]">{r.payment_id || 'N/A'}</td>
                                                    <td className="p-4 px-6">
                                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-block ${
                                                            r.status === 'success' || r.status === 'PAID'
                                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                                                : r.status === 'failed'
                                                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                                        }`}>
                                                            {r.status === 'success' ? 'Success' : r.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 px-6 font-medium text-zinc-200" title={formatPaymentMethod(r.payment_method || r.method, r.provider).tooltip}>
                                                        {formatPaymentMethod(r.payment_method || r.method, r.provider).label}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Universal History Modal for WCC Recharge History */}
            <HistoryModal
                isOpen={isWccRechargeHistoryModalOpen}
                onClose={() => setIsWccRechargeHistoryModalOpen(false)}
                title="WCC Wallet Recharge History"
                subtitle="Full log of prepaid WhatsApp wallet recharge transactions"
                emptyStateText="No recharge logs found"
                emptyStateSubtext="You have not initiated any WhatsApp wallet recharges yet."
                emptyStateAction={{
                    label: "Recharge Wallet Now",
                    onClick: scrollToAddFunds
                }}
                fetchDataFn={({ page, limit, search, status, sort }) =>
                    api.getWccUserRechargeLogs(workspaceId, { page, limit, search, status, sort })
                }
                columns={[
                    {
                        key: "date",
                        label: "Date & Time",
                        render: (r) => <span className="text-zinc-300">{formatBillingDate(r.date, true)}</span>
                    },
                    {
                        key: "amount",
                        label: "Amount",
                        render: (r) => <span className="font-bold text-emerald-400">₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    },
                    {
                        key: "payment_id",
                        label: "Payment / Order ID",
                        render: (r) => <span className="font-mono text-zinc-400 text-[11px]">{r.payment_id || r.gateway_order_id || "N/A"}</span>
                    },
                    {
                        key: "status",
                        label: "Status",
                        render: (r) => (
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-block ${
                                r.status === 'success'
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    : r.status === 'failed'
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                                {r.status === 'success' ? 'Success' : r.status}
                            </span>
                        )
                    },
                    {
                        key: "method",
                        label: "Method",
                        render: (r) => {
                            const m = formatPaymentMethod(r.payment_method || r.method, r.provider);
                            return (
                                <span className="font-semibold text-white" title={m.tooltip}>
                                    {m.label}
                                </span>
                            );
                        }
                    }
                ]}
            />

            {/* Universal History Modal for AI Credit History */}
            <HistoryModal
                isOpen={isAiCreditHistoryModalOpen}
                onClose={() => setIsAiCreditHistoryModalOpen(false)}
                title="AI Workspace Credit History"
                subtitle="Complete log of credit grants, topups, and feature usages"
                fetchDataFn={async ({ page }) => {
                    const res = await api.getCreditHistory(workspaceId, page);
                    const data = res.data ?? res;
                    return {
                        data: data.entries || [],
                        pagination: {
                            page,
                            limit: 10,
                            total: data.total || (data.entries || []).length,
                            pages: Math.ceil((data.total || (data.entries || []).length) / 10) || 1
                        }
                    };
                }}
                columns={[
                    {
                        key: "date",
                        label: "Date",
                        render: (r) => formatBillingDate(r.created_at, true)
                    },
                    {
                        key: "description",
                        label: "Description",
                        render: (r) => <span className="font-medium text-white">{r.description || "System Process"}</span>
                    },
                    {
                        key: "type",
                        label: "Type",
                        render: (r) => <span className="text-zinc-400 capitalize">{r.entry_type || "usage"}</span>
                    },
                    {
                        key: "delta",
                        label: "Credits Delta",
                        render: (r) => {
                            const val = Number(r.credits_delta ?? 0);
                            const isNeg = val < 0;
                            return (
                                <span className={`font-bold ${isNeg ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {isNeg ? '' : '+'}{formatCredits(r.credits_delta, 2)}
                                </span>
                            );
                        }
                    }
                ]}
            />

            {/* Razorpay Checkout Script */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        </div>
    );
}