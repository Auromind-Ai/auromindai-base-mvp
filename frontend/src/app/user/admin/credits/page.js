'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, TrendingUp, Clock, Wallet, Info,
  Calculator, History, Plus, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Coins, X, HelpCircle,
  Minus, PieChart, Receipt, Gauge, Download, FileText
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
    const [wccFuelData, setWccFuelData] = useState({
        fillPercentage: 100,
        referenceFullAmount: null,
        lastRechargeAmount: null,
        lastRechargeAt: null,
    });
    const [wccOverageBalance, setWccOverageBalance] = useState(0);
    const [wccOverageEnabled, setWccOverageEnabled] = useState(false);

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
    const [estimatorRates, setEstimatorRates] = useState({});

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
            const data = res.data ?? res ?? {};
            const bal = parseFloat(data.current_balance ?? data.balance ?? 0);
            const refFull = data.reference_full_amount != null ? parseFloat(data.reference_full_amount) : (bal > 0 ? bal : 0);
            let fillPct = 0;
            if (data.fill_percentage != null) {
                fillPct = parseFloat(data.fill_percentage);
            } else if (refFull > 0 && bal > 0) {
                fillPct = Math.min(100, Math.round((bal / refFull) * 100));
            } else if (bal > 0) {
                fillPct = 100;
            }

            setWccBalance(bal);
            setWccOverageBalance(parseFloat(data.overage_balance ?? 0));
            setWccOverageEnabled(data.overage_enabled ?? false);
            setWccFuelData({
                fillPercentage: fillPct,
                referenceFullAmount: refFull,
                lastRechargeAmount: data.last_recharge_amount != null ? parseFloat(data.last_recharge_amount) : null,
                lastRechargeAt: data.last_recharge_at ?? null,
                wcc_locked: data.wcc_locked ?? false,
                spending_allowed: data.spending_allowed ?? true,
                status_message: data.status_message ?? null,
            });
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

            const map = {};
            ratesList.forEach(item => {
                if (item.region === 'IN' || !item.region) {
                    const cat = item.category.toLowerCase();
                    const val = parseFloat(item.customer_price ?? item.rate_per_message ?? 0);
                    map[cat] = val;
                    if (cat === 'authentication') map['auth'] = val;
                    if (cat === 'auth') map['authentication'] = val;
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

    const cycleTotal = Number(creditSummary?.quota_limit ?? creditSummary?.included_credits ?? 0);
    const cycleUsed = Number(creditSummary?.cycle_used ?? 0);
    const usedPct = creditSummary?.usage_percent !== undefined && creditSummary?.usage_percent !== null
        ? Number(creditSummary.usage_percent)
        : (cycleTotal > 0 ? Math.min((cycleUsed / cycleTotal) * 100, 100) : 0);
    const remainingPct = Math.max(0, 100 - usedPct);

    const formatRemainingPercent = (pct, usedAmt) => {
        if (usedAmt === 0 || pct >= 100) return '100%';
        if (pct > 99.9) return '99.9%';
        return `${pct.toFixed(1)}%`;
    };

    const avgDailyBurn = creditSummary?.burn_rate ?? null;

    const distributionPalette = ['#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#38bdf8'];
    const serverDist = creditSummary?.credit_distribution;

    let distributionEntries = [];
    if (Array.isArray(serverDist) && serverDist.length > 0) {
        const totalDistUsed = serverDist.reduce((sum, item) => sum + Number(item.credits_used || 0), 0);
        distributionEntries = serverDist
            .sort((a, b) => Number(b.credits_used || 0) - Number(a.credits_used || 0))
            .slice(0, 3)
            .map((item, i) => ({
                label: item.label || item.category || 'AI Processing',
                value: Number(item.credits_used || 0),
                pct: totalDistUsed > 0 ? (Number(item.credits_used || 0) / totalDistUsed) * 100 : 0,
                color: distributionPalette[i % distributionPalette.length]
            }));
    } else {
        const distributionMap = {};
        creditHistory.filter(item => Number(item.credits_delta || 0) < 0 && (item.entry_type || '').toLowerCase() === 'usage').forEach(item => {
            const rawKey = (item.feature_key || item.entry_type || 'other').replace('_', ' ');
            const label = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
            const amt = Math.abs(Number(item.credits_delta || 0));
            distributionMap[label] = (distributionMap[label] || 0) + amt;
        });
        const distributionTotal = Object.values(distributionMap).reduce((a, b) => a + b, 0);
        distributionEntries = Object.entries(distributionMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([label, value], i) => ({
                label,
                value,
                pct: distributionTotal > 0 ? (value / distributionTotal) * 100 : 0,
                color: distributionPalette[i % distributionPalette.length]
            }));
    }
    const distributionTotal = distributionEntries.reduce((sum, item) => sum + Number(item.value || 0), 0);

    const rechargeAmountNumber = parseFloat(rechargeAmount) || 0;
    const marketingRate = (estimatorRates.marketing && estimatorRates.marketing > 0) ? estimatorRates.marketing : null;
    const approxConversations = marketingRate ? Math.floor(rechargeAmountNumber / marketingRate) : 0;

    const adjustRechargeAmount = (delta) => {
        const current = parseFloat(rechargeAmount) || 0;
        const next = Math.max(100, Math.min(100000, current + delta));
        setRechargeAmount(String(next));
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

                                {creditSummary?.purchased_credits_locked && (
                                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
                                            <span>🔒</span>
                                            <span>{creditSummary?.status_message || "Credits locked — Upgrade to Pro to use purchased credits"}</span>
                                        </div>
                                        <a href="/user/admin/billing/payment" className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition whitespace-nowrap">
                                            Upgrade
                                        </a>
                                    </div>
                                )}

                                <div className="text-2xl sm:text-4xl md:text-5xl font-semibold sm:font-bold tracking-tight text-white leading-none mb-5 sm:mb-7">
                                    {creditSummaryLoading ? '...' : formatCredits(creditSummary?.credits_balance, 2)}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 sm:mb-8 text-xs sm:text-sm">
                                    <div>
                                        <span className="text-white/55 text-[11px] sm:text-xs font-normal mr-1.5">Used today</span>
                                        <span className="font-normal sm:font-semibold text-white">{creditSummaryLoading ? '...' : getUsedToday()}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/55 text-[11px] sm:text-xs font-normal mr-1.5">Used this cycle</span>
                                        <span className="font-normal sm:font-semibold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.cycle_used, 2)}</span>
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
                            <div className="bg-[#0e0e14] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-xl flex flex-col justify-between self-start">
                                <div>
                                    <p className="text-white/60 text-xs sm:text-[13px] font-normal sm:font-medium mb-0.5">Recharge packs</p>
                                    <p className="text-white text-xs sm:text-sm font-semibold mb-3">Top up AI Credits</p>

                                    {creditPacksLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-purple-500" />
                                        </div>
                                    ) : creditPacks.length > 0 ? (
                                        <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                                            {creditPacks.map((pack, idx) => (
                                                <button
                                                    key={pack.id}
                                                    type="button"
                                                    onClick={() => setSelectedPackIndex(idx)}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                                        selectedPackIndex === idx
                                                            ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-950/20'
                                                            : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2.5">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">{pack.name}</div>
                                                            <div className="text-sm sm:text-base font-bold text-white leading-tight flex items-baseline gap-1">
                                                                <span>₹{parseFloat(pack.amount).toLocaleString('en-IN')}</span>
                                                                <span className="text-[10px] sm:text-[11px] font-normal text-zinc-400">per month</span>
                                                            </div>
                                                            <div className="text-[11px] sm:text-xs font-normal text-zinc-400 mt-0.5">{pack.credits.toLocaleString()} AI credits</div>
                                                        </div>
                                                        <span className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            selectedPackIndex === idx ? 'border-purple-500 bg-purple-500/20' : 'border-zinc-600'
                                                        }`}>
                                                            {selectedPackIndex === idx && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                                            No top-up plans available.
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3">
                                    {workspaceEntitlements?.allow_ai_topup === false && (
                                        <div className="mb-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2">
                                            <AlertTriangle size={14} className="shrink-0" />
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
                                        className="w-full py-2.5 sm:py-3 bg-[#814AC8] hover:bg-[#905ad6] text-white font-medium text-xs sm:text-sm rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {workspaceEntitlements?.allow_ai_topup === false ? "Upgrade plan to top up" : "Purchase selected pack"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Credit Health / Credit Distribution / Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" style={{ gridAutoRows: '1fr' }}>

                            {/* Credit Health */}
                            <div className="bg-[#0e0e14] rounded-2xl p-4 sm:p-6 border border-white/5 shadow-xl flex flex-col overflow-hidden">
                                <p className="text-white/60 text-xs sm:text-[13px] font-normal sm:font-medium mb-0.5">Credit Health</p>
                                <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-3 sm:mb-4">Monthly Cycle</p>

                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                                        <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90">
                                            <defs>
                                                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#22d3ee" />
                                                    <stop offset="100%" stopColor="#818cf8" />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                                            <circle
                                                cx="50" cy="50" r="42" fill="none"
                                                stroke="url(#healthGradient)" strokeWidth="7" strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 42}`}
                                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - (cycleTotal > 0 ? remainingPct / 100 : 0.99))}`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-sm sm:text-lg font-bold text-white">{cycleTotal > 0 ? formatRemainingPercent(remainingPct, cycleUsed) : '—'}</span>
                                            <span className="text-[9px] sm:text-[10px] text-zinc-500 font-medium mt-0.5">Remaining</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Included Remaining</span>
                                            <span className="font-medium sm:font-bold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.included_remaining ?? 0, 2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Purchased Remaining</span>
                                            <span className={`font-medium sm:font-bold ${creditSummary?.purchased_credits_locked ? 'text-amber-400 flex items-center gap-1.5' : 'text-white'}`}>
                                                {creditSummaryLoading ? '...' : (
                                                    creditSummary?.purchased_credits_locked
                                                        ? <><span className="text-xs">🔒</span> {formatCredits(creditSummary?.purchased_remaining ?? 0, 2)}</>
                                                        : formatCredits(creditSummary?.purchased_remaining ?? 0, 2)
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Used This Cycle</span>
                                            <span className="font-medium sm:font-bold text-white">{creditSummaryLoading ? '...' : formatCredits(creditSummary?.cycle_used ?? 0, 2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Avg. Daily Burn</span>
                                            <span className="font-medium sm:font-bold text-white">{avgDailyBurn != null ? formatCredits(avgDailyBurn, 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500 font-normal">Cycle resets</span>
                                            <span className="font-semibold text-emerald-400">{creditSummary?.cycle_reset_date ? formatBillingDate(creditSummary.cycle_reset_date) : '—'}</span>
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

                                <div className="space-y-3.5 sm:space-y-4.5 mt-4 sm:mt-6 flex-1 overflow-hidden">
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
                            <div className="bg-[#0e0e14] rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                                <div className="p-6 md:p-7 pb-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-white/60 text-[14px] font-medium">Activity</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsAiCreditHistoryModalOpen(true)}
                                            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                                        >
                                            View all
                                        </button>
                                    </div>
                                    <div className="flex justify-center w-full bg-white/[0.03] p-1 rounded-lg border border-white/5">
                                        <button
                                            onClick={() => setActivityView('transactions')}
                                            className={`px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-normal sm:font-bold transition-all cursor-pointer ${activityView === 'transactions' ? 'bg-[#814AC8]/25 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            Transactions
                                        </button>
                                        <button
                                            onClick={() => setActivityView('billing')}
                                            className={`px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-normal sm:font-bold transition-all cursor-pointer ${activityView === 'billing' ? 'bg-[#814AC8]/25 text-white' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            Billing
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto max-h-[220px] pr-1 scrollbar-thin scrollbar-thumb-white/10">
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
                                                    <div key={item.id} className="px-4 sm:px-7 py-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs font-medium text-zinc-200">{item.description || 'System Process'}</p>
                                                            <p className="text-[10px] text-zinc-400 mt-0.5">{formatBillingDate(item.created_at, true)}</p>
                                                        </div>
                                                        <span className={`text-[11px] sm:text-xs font-normal sm:font-bold ${isDeduction ? 'text-rose-400' : 'text-emerald-400'}`}>
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
                                                    <div key={item.id} className="px-6 md:px-7 py-3.5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs font-medium text-zinc-200">{item.description || 'Credit Addition'}</p>
                                                            <p className="text-[10px] text-zinc-400 mt-0.5">{formatBillingDate(item.created_at, true)}</p>
                                                        </div>
                                                        <span className="text-[11px] sm:text-xs font-normal sm:font-bold text-emerald-400">
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

                                    {wccFuelData?.wcc_locked && (
                                        <div className="my-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between max-w-2xl">
                                            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
                                                <span>🔒</span>
                                                <span>{wccFuelData?.status_message || "WCC wallet locked — Upgrade to a paid plan to use your purchased balance"}</span>
                                            </div>
                                            <a href="/user/admin/billing/payment" className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition whitespace-nowrap">
                                                Upgrade
                                            </a>
                                        </div>
                                    )}

                                    <div className="text-2xl sm:text-4xl md:text-5xl font-semibold sm:font-bold tracking-tight text-white leading-none my-3 sm:my-4">
                                        {wccBalanceLoading ? '...' : `₹${(wccBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                    </div>

                                    {/* 4-Segment Fuel Gauge Bar — expanded length & sleek height */}
                                    <div className="mb-2 max-w-xl sm:max-w-2xl">
                                        <div className="relative pt-2 mb-0.5">
                                            {/* Triangle indicator pointing down at current balance position */}
                                            <div
                                                className="absolute top-0 transition-all duration-700 ease-out z-10"
                                                style={{
                                                    left: `${Math.max(1, Math.min(99, wccFuelData?.fillPercentage ?? ((wccBalance ?? 0) > 0 ? 100 : 0)))}%`,
                                                    transform: 'translateX(-50%)'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 0,
                                                        height: 0,
                                                        borderLeft: '4px solid transparent',
                                                        borderRight: '4px solid transparent',
                                                        borderTop: '5px solid #ffffff',
                                                    }}
                                                />
                                            </div>

                                            {/* 4 distinct equal color segments */}
                                            <div className="h-2 w-full rounded-full overflow-hidden flex bg-zinc-800">
                                                {(wccBalance ?? 0) <= 0 ? (
                                                    <div className="w-full h-full bg-zinc-700" />
                                                ) : (
                                                    <>
                                                        <div className="w-1/4 h-full bg-[#dc2626]" />
                                                        <div className="w-1/4 h-full bg-[#d97706]" />
                                                        <div className="w-1/4 h-full bg-[#16a34a]" />
                                                        <div className="w-1/4 h-full bg-[#e5e5d8]" />
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Scale labels: Empty · Low · Healthy · Full aligned under the 4 segments */}
                                        <div className="grid grid-cols-4 text-[10px] font-normal text-zinc-500 mt-1.5">
                                            <span className="text-left">Empty</span>
                                            <span className="text-center">Low</span>
                                            <span className="text-center">Healthy</span>
                                            <span className="text-right">Full</span>
                                        </div>

                                        {/* Context line matching screenshot */}
                                        <p className="text-zinc-400 text-[11px] sm:text-xs font-normal leading-relaxed mt-2.5">
                                            {(wccBalance ?? 0) > 0
                                                ? 'Your wallet is active. Recharge anytime to keep Marketing, Utility, Authentication and Service window conversations running.'
                                                : 'Your wallet is empty. Recharge anytime to keep Marketing, Utility, Authentication and Service window conversations running.'}
                                        </p>
                                    </div>

                                    {/* Overage Debt Banner — shown only when outstanding debt exists */}
                                    {wccOverageBalance > 0 && (
                                        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 mb-4 max-w-xl">
                                            <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)] mt-1 flex-shrink-0" />
                                            <div>
                                                <p className="text-rose-300 text-[12px] font-semibold">
                                                    Outstanding debt: ₹{Number(wccOverageBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-rose-400/80 text-[11px] mt-0.5">
                                                    Your wallet ran into overage. This amount will be automatically settled on your next recharge.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Overage enabled info pill */}
                                    {wccOverageEnabled && wccOverageBalance <= 0 && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-400 mb-4">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            Overage enabled — messages will send even if balance runs low
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Cost Calculator + Add Funds - equal height, side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">

                            {/* WCC Campaign Cost Calculator */}
                            <div className="lg:col-span-2 bg-[#0e0e14] rounded-2xl border border-white/5 p-4 sm:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-xs sm:text-[13px] font-normal sm:font-medium mb-1">Cost Calculator</p>
                                <p className="text-white text-xs sm:text-base font-normal sm:font-semibold mb-1">What will this campaign cost?</p>
                                <p className="text-zinc-500 text-[11px] sm:text-xs font-normal mb-4 sm:mb-5">Pick a conversation type — pricing updates as you go.</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-5 sm:mb-6">
                                    {[
                                        { key: 'marketing', label: 'Marketing', rate: estimatorRates.marketing, unit: 'msg' },
                                        { key: 'utility', label: 'Utility', rate: estimatorRates.utility, unit: 'msg' },
                                        { key: 'auth', label: 'Authentication', rate: estimatorRates.auth ?? estimatorRates.authentication, unit: 'msg' },
                                        { key: 'service', label: 'Service', rate: estimatorRates.service, unit: 'msg' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setMsgType(opt.key)}
                                            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-normal sm:font-bold border transition-all cursor-pointer ${
                                                msgType === opt.key
                                                    ? 'bg-[#110229] border-[#814ac8] text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-white/80 hover:text-white hover:border-white/35'
                                            }`}
                                        >
                                            {opt.label}
                                            <div className="text-[9px] font-normal sm:font-semibold text-zinc-500 mt-0.5">
                                                {opt.rate != null ? `₹${Number(opt.rate).toFixed(3)} / ${opt.unit}` : 'Loading...'}
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
                                        <p className="text-[9px] sm:text-[10px] text-white/60 font-normal mt-0.5 sm:mt-1">Based on your configured WhatsApp pricing</p>
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
                            <div ref={addFundsRef} className="bg-[#0e0e14] rounded-2xl border border-white/5 p-6 md:p-7 shadow-xl flex flex-col">
                                <p className="text-white/70 text-[13px] font-medium mb-1">Add Funds</p>
                                <p className="text-white text-base font-semibold mb-3">Recharge wallet</p>
                                <form onSubmit={handleRechargeSubmit} className="space-y-4 sm:space-y-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(-100)}
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer shrink-0"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <div className="relative flex items-center justify-center max-w-[180px]">
                                            <span className="text-lg sm:text-2xl font-semibold sm:font-extrabold text-white/70 mr-1 select-none">₹</span>
                                            <input
                                                type="number"
                                                min="100"
                                                max="100000"
                                                value={rechargeAmount}
                                                onChange={(e) => setRechargeAmount(e.target.value)}
                                                placeholder="3900"
                                                className="w-full text-lg sm:text-2xl font-semibold sm:font-extrabold text-white bg-transparent border-b border-white/20 focus:border-[#814ac8] focus:outline-none text-center tabular-nums transition-colors py-0.5"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => adjustRechargeAmount(100)}
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-white/5 transition-all cursor-pointer shrink-0"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                        {['500', '1000', '1500', '2000'].map((val) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setRechargeAmount(val)}
                                                className={`py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-normal sm:font-bold transition-all border cursor-pointer ${
                                                    String(rechargeAmount) === val
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
                                <div className="max-h-[280px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 bg-[#0e0e14] z-10 shadow-sm border-b border-white/5">
                                            <tr className="bg-white/[0.02] text-zinc-500 font-semibold uppercase text-[10px]">
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