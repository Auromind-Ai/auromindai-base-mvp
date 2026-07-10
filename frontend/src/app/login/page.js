'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Shield, Sparkles, AlertTriangle, Instagram, MousePointerClick, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const features = [
    {
        title: "Automate Sales with AI.",
        desc: "Deploy intelligent agents that qualify leads, handle objections, and close deals 24/7."
    },
    {
        title: "Omnichannel Inbox.",
        desc: "Seamlessly collaborate with AI across WhatsApp, Email, and Social Media in one unified workspace."
    },
    {
        title: "Visual Automation Wires.",
        desc: "Build complex, high-converting lead flows and follow-up sequences without writing a single line of code."
    }
];
const getErrorMessage = (err) => {
    let msg = err?.message || '';
    let status = err?.status;
   
    if (msg.includes("Invalid or expired OTP") || msg.includes("Invalid OTP") || msg.includes("expired OTP")) {
        return "Invalid or expired OTP. Please request a new code.";
    }
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("Please log in") || msg.includes("Email already registered")) {
        return "Account already exists. Please log in.";
    }
    if (msg.includes("not registered") || msg.includes("not found") || msg.includes("sign up first") || msg.includes("Account not found")) {
        return "Account not found. Please sign up.";
    }
    if (msg.includes("Too many OTP requests") || msg.includes("too many requests") || status === 429) {
        return "Too many OTP requests. Please wait before trying again.";
    }
    if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("aborted")) {
        return "Network error. Please check your connection and try again.";
    }
    if (status >= 500 || msg.toLowerCase().includes("server error") || msg.toLowerCase().includes("non-json response")) {
        return "Server error. Please try again later.";
    }
    return "Something went wrong. Please try again.";
};

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { appName, appLogoUrl } = useBranding();
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        setLogoError(false);
    }, [appLogoUrl]);

    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [featureIndex, setFeatureIndex] = useState(0);
    const [pendingToken, setPendingToken] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [deletionDate, setDeletionDate] = useState('');
    const [cancelRestoreLoading, setCancelRestoreLoading] = useState(false);
    const [showCanvas, setShowCanvas] = useState(false);

    useEffect(() => {
        // Delay mounting of 3D Canvas until after initial form animations finish
        const timer = setTimeout(() => {
            setShowCanvas(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            router.push(redirectPath || '/user/admin/dashboard');
        }
    }, [user, authLoading, router, redirectPath]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.substring(1);
            if (hash.startsWith('token=')) {
                const token = hash.split('=')[1];
                setToken(token);
                window.history.replaceState(null, '', window.location.pathname);
                refreshUser().then(() => {
                    router.push(redirectPath || '/user/admin/dashboard');
                }).catch((err) => {
                    console.error("Failed to refresh user after OAuth callback:", err);
                    setError("Failed to initialize session. Please try again.");
                });
            }
        }
    }, [router, redirectPath, refreshUser]);

    useEffect(() => {
        const err = searchParams.get('error');
        if (err) {
            let decodedErr = decodeURIComponent(err);
            // Handle google oauth error callback redirect gracefully
            let mappedErr = getErrorMessage({ message: decodedErr });
            // If it's for non-existent email on google login, requirement asks for:
            // "Account not found. Please sign up first."
            if (decodedErr.includes("not registered") || decodedErr.includes("not found") || decodedErr.includes("sign up first")) {
                mappedErr = "Account not found. Please sign up first.";
            }
            setError(mappedErr);
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const id = setInterval(() => setResendTimer(t => t - 1), 1000);
        return () => clearInterval(id);
    }, [resendTimer]);

    useEffect(() => {
        const interval = setInterval(() => {
            setFeatureIndex((prev) => (prev + 1) % features.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.sendOTP(email, 'login');
            setStep('otp');
            setResendTimer(60);
        } catch (err) {
            const mappedError = getErrorMessage(err);
            setError(mappedError);
        } finally {
            setLoading(false);
        }
    };
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.verifyOTP(email, otp, 'login');
            //  2FA gate ─
            if (data?.requiresTwoFactor) {
                setPendingToken(data.pending_token);
                setTotpCode('');
                setStep('2fa');
                return;
            }
            //  END 2FA gate
            //  Pending deletion gate ─
            if (data?.user?.deletion_scheduled_at) {
                const adminToken = localStorage.getItem('admin_backup_token');
                localStorage.clear();
                if (adminToken) {
                    localStorage.setItem('admin_backup_token', adminToken);
                }
                setToken(data.access_token);
                setUser(data.user);
                if (data.workspaces?.length > 0) {
                    setWorkspace(data.workspaces[0]);
                    localStorage.setItem('workspace_id', data.workspaces[0].id);
                }
                setDeletionDate(data.user.deletion_scheduled_at);
                setStep('restore');
                return;
            }
            //  END pending deletion gate ─
            if (!data?.access_token) throw new Error('Verification failed');
            if (!data?.access_token) throw new Error('Verification failed');
            const adminToken = localStorage.getItem('admin_backup_token');
            localStorage.clear();
            if (adminToken) localStorage.setItem('admin_backup_token', adminToken);
            setToken(data.access_token);
            setUser(data.user);
            if (data.user?.role === 'admin' || data.user?.is_platform_admin) {
                localStorage.setItem('admin_backup_token', data.access_token);
            }
            if (data.workspaces?.length > 0) {
                setWorkspace(data.workspaces[0]);
               localStorage.setItem('workspace_id', data.workspaces[0].id);
            }
            await refreshUser();
            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    const handleResend = async () => {
        if (resendTimer > 0) return;
        setError('');
        setLoading(true);
        try {
            await api.sendOTP(email, 'login');
            setResendTimer(60);
            setOtp('');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreAccount = async () => {
        setCancelRestoreLoading(true);
        setError('');
        try {
            await api.cancelAccountDeletion();      // if this throws → show error
            try {
                await refreshUser();                // if this throws → non-fatal, continue
            } catch {
                // refreshUser failure doesn't block redirect
            }
            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setCancelRestoreLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.verifyLogin2FA(pendingToken, totpCode);
            //  Pending deletion gate ─
            if (data?.user?.deletion_scheduled_at) {
                const adminToken = localStorage.getItem('admin_backup_token');
                localStorage.clear();
                if (adminToken) {
                    localStorage.setItem('admin_backup_token', adminToken);
                }
                setToken(data.access_token);
                setUser(data.user);
                if (data.workspaces?.length > 0) {
                    setWorkspace(data.workspaces[0]);
                    localStorage.setItem('workspace_id', data.workspaces[0].id);
                }

                setDeletionDate(data.user.deletion_scheduled_at);
                setStep('restore');
                return;
            }
            //  END pending deletion gate ─
            if (!data?.access_token) throw new Error('Verification failed');
            const adminToken = localStorage.getItem('admin_backup_token');
            localStorage.clear();
            if (adminToken) localStorage.setItem('admin_backup_token', adminToken);
            setToken(data.access_token);
            setUser(data.user);
            if (data.user?.role === 'admin' || data.user?.is_platform_admin) {
                localStorage.setItem('admin_backup_token', data.access_token);
            }
            if (data.workspaces?.length > 0) {
                setWorkspace(data.workspaces[0]);
                localStorage.setItem('workspace_id', data.workspaces[0].id);
            }
            await refreshUser();
            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const fadeVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, x: 20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white flex overflow-hidden font-sans">
            {/* Left Pane - Visual Conversions Funnel */}
            <div className="hidden lg:flex lg:w-[40%] h-screen flex-col justify-between py-8 px-8 xl:px-10 relative bg-[#030208] overflow-hidden border-r border-white/5 sticky top-0">
                {/* Background blobs */}
                <div className="absolute top-[-20%] left-[-20%] w-[90%] h-[90%] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-fuchsia-600/8 rounded-full blur-[120px] pointer-events-none" />

                {/* Top: Back Link */}
                <div className="relative z-10 shrink-0">
                    <Link href="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-xs font-medium tracking-wide">
                        <span>←</span> <span>Back to Home</span>
                    </Link>
                </div>

                {/* Middle: Marketing text + Mockup cards */}
                <div className="relative z-10 flex flex-col gap-6 flex-1 justify-center min-h-0">

                    {/* Headline */}
                    <div className="space-y-2">
                        <h1 className="text-2xl xl:text-3xl font-extrabold leading-[1.2] text-white tracking-tight">
                            AI Agents That<br />Talk. Close.{' '}
                            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                                Grow Your Sales.
                            </span>
                        </h1>
                        <p className="text-zinc-500 text-xs xl:text-sm font-normal leading-relaxed">
                            Your 24/7 AI Workforce for Sales, Support &amp; Growth.
                        </p>
                    </div>

                    {/* Cards Grid — fully contained, no absolute overflow */}
                    <div className="relative flex flex-col gap-3 w-full min-h-0">

                        {/* Animated dashed connector */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
                            <path
                                d="M 50 10 C 80 20, 80 50, 50 60 C 20 70, 20 85, 50 95"
                                stroke="url(#dl)"
                                strokeWidth="0.8"
                                strokeDasharray="3 3"
                                className="animate-[dash_20s_linear_infinite]"
                            />
                            <defs>
                                <linearGradient id="dl" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#F472B6" stopOpacity="0.5" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <style>{`@keyframes dash { to { stroke-dashoffset: -200; } }`}</style>

                        {/* Row 1: Instagram Ad Card */}
                        <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="relative z-10 self-start w-[200px] rounded-xl border border-white/10 bg-[#0C0B14]/90 backdrop-blur-md p-2.5 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 via-pink-500 to-yellow-400 flex items-center justify-center shrink-0">
                                        <Instagram size={9} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold text-white leading-none flex items-center gap-0.5">
                                            Your Brand <span className="text-blue-400 text-[8px]">✓</span>
                                        </div>
                                        <div className="text-[7px] text-zinc-500">Sponsored</div>
                                    </div>
                                </div>
                                <span className="text-zinc-600 text-[11px]">•••</span>
                            </div>
                            <div className="relative rounded-md overflow-hidden bg-zinc-900 mb-2 border border-white/5" style={{height: '90px'}}>
                                <img src="/images/login_mock_ad.jpg" alt="Ad" className="w-full h-full object-cover" />
                                <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] font-bold text-yellow-400 tracking-wide">
                                    50% OFF
                                </div>
                            </div>
                            <div className="w-full bg-[#25D366] rounded-md py-1 px-2 flex items-center justify-between text-[8px] font-bold text-white">
                                <span>Send Message</span>
                                <span className="text-[7px] opacity-80">WhatsApp</span>
                            </div>
                        </motion.div>

                        {/* Row 2: Chat bubble — aligned right */}
                        <motion.div
                            animate={{ y: [0, 3, 0] }}
                            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            className="relative z-10 self-end w-[185px] rounded-xl border border-white/10 bg-[#0C0B14]/90 backdrop-blur-md p-2.5 shadow-2xl flex flex-col gap-1.5"
                        >
                            <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                <span className="text-[8px] font-semibold text-zinc-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block" /> Chat Agent
                                </span>
                                <span className="text-[7px] text-zinc-600">Active Now</span>
                            </div>
                            <div className="bg-[#1C1A27]/60 rounded-lg p-1.5 border border-white/5 flex gap-1.5 items-center">
                                <img src="/images/login_mock_ad.jpg" alt="Product" className="w-7 h-7 rounded object-cover shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[8px] font-bold text-white truncate">Get 20% off...</div>
                                    <div className="text-[7px] text-zinc-500">Facebook Ad</div>
                                </div>
                            </div>
                            <div className="self-end bg-violet-600/30 border border-violet-500/20 text-white rounded-lg rounded-tr-none px-2 py-1 text-[8px] relative">
                                I want to buy
                                <div className="absolute right-1 bottom-0.5 text-blue-400 text-[6px]">✓✓</div>
                            </div>
                        </motion.div>

                        {/* Row 3: Metric chips row */}
                        <div className="flex items-center gap-3 z-10">
                            <motion.div
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0C0B14]/90 backdrop-blur-md px-3 py-2 shadow-xl"
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                    <MousePointerClick size={13} />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-white leading-none">3.2x</div>
                                    <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Clicks</div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 3, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0C0B14]/90 backdrop-blur-md px-3 py-2 shadow-xl"
                            >
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                    <ShoppingBag size={13} />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-white leading-none">150X</div>
                                    <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">ROI</div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
                                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md px-2.5 py-2 shadow-xl"
                            >
                                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                <span className="text-[9px] font-bold text-white tracking-tight whitespace-nowrap">Order Placed</span>
                            </motion.div>
                        </div>

                    </div>
                </div>

                {/* Bottom: Footer */}
                <div className="relative z-10 shrink-0 flex items-center justify-between text-[10px] text-zinc-700 font-medium">
                    <span>© {new Date().getFullYear()} {appName}</span>
                    <span>Secure Portal</span>
                </div>
            </div>
            {/* Right Pane - Authentication Form */}
            <div className="w-full lg:w-[60%] flex flex-col justify-between p-6 sm:p-10 md:p-12 relative z-10 border-l border-white/5 bg-[#06050C]">
                {/* Deep background ambient glowing blobs for elegance */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
                
                {/* Logo Header */}
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center group">
                        <div className="flex items-center gap-2.5">
                            <img 
                                src="/logo.png" 
                                alt={appName} 
                                className="h-[48px] w-auto object-contain group-hover:rotate-6 transition-all duration-300" 
                            />
                            <span className={`${jakarta.className} text-[18px] font-extrabold tracking-[0.1em] text-white flex items-center`}>
                                ORBION
                                <span className="bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#818CF8] bg-clip-text text-transparent ml-2 font-semibold tracking-[0.15em]">
                                    AGENTS
                                </span>
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Form Wrapper Card */}
                <div className="w-full max-w-[420px] mx-auto px-6 py-8 sm:px-10 sm:py-10 rounded-3xl border border-white/[0.08] bg-[#0D0C15] shadow-2xl relative overflow-hidden my-auto">
                    {/* Subtle top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                    
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 text-center">
                            {step === 'email' ? 'Welcome back'
                                : step === 'otp' ? 'Check inbox'
                                : step === '2fa' ? 'Authenticator Code'
                                : 'Account Scheduled for Deletion'}
                        </h1>
                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed text-center">
                            {step === 'email'
                                ? 'Log in to access your intelligent workspace and continue your journey.'
                                : step === 'otp'
                                ? `We've sent a secure verification code to ${email}`
                                : step === '2fa'
                                ? 'Enter the 6-digit code from your Google Authenticator app.'
                                : 'Your account is currently scheduled for deletion. You can restore it now.'}
                        </p>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 backdrop-blur-md"
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className="min-w-5 text-red-400 mt-0.5 text-xs">⚠️</div>
                                    <div className="text-red-400 text-xs font-semibold">{error}</div>
                                </div>
                                {error.includes("sign up first") && (
                                    <Link href="/signup" className="text-indigo-400 text-xs font-bold ml-7 hover:text-indigo-300 transition-colors">
                                        Create an account →
                                    </Link>
                                )}
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            {step === 'email' && (
                                <motion.form
                                    key="email-form"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleSendOTP}
                                    className="space-y-5"
                                >
                                    {/* Google Button — solid white */}
                                    <button
                                        type="button"
                                        onClick={() => api.googleLogin('login')}
                                        className="w-full bg-white hover:bg-zinc-100 active:bg-zinc-200 transition-colors rounded-2xl py-3.5 flex items-center justify-center gap-3 font-bold text-[#111] text-sm shadow-lg"
                                    >
                                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>

                                    {/* Divider */}
                                    <div className="relative flex items-center py-1">
                                        <div className="flex-grow border-t border-white/10" />
                                        <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">or continue with email</span>
                                        <div className="flex-grow border-t border-white/10" />
                                    </div>

                                    {/* Email Field */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-white/80 ml-0.5">Email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-[#1A1825] border border-white/[0.06] hover:border-white/[0.12] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 rounded-2xl py-4 px-5 text-white placeholder:text-zinc-600 focus:outline-none text-sm transition-all duration-200"
                                                placeholder="your@email.com"
                                                style={{
                                                    WebkitBoxShadow: '0 0 0px 1000px #1A1825 inset',
                                                    WebkitTextFillColor: '#fff',
                                                    caretColor: '#ffffff',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 text-white font-bold text-sm shadow-lg shadow-violet-900/30"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue with Email'}
                                    </button>
                                </motion.form>
                            )}

                            {step === 'otp' && (
                                <motion.form
                                    key="otp-form"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleVerifyOTP}
                                    className="space-y-5"
                                >
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-zinc-400 ml-1 uppercase tracking-wider">6-Digit Secure Code</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-white/[0.02] rounded-xl flex items-center border border-white/[0.08] overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/40 group-focus-within:bg-[#0E0E16] group-hover:border-white/15">
                                                <div className="pl-4 pr-2 text-zinc-500 group-focus-within:text-purple-400 transition-colors duration-300">
                                                    <Shield size={18} strokeWidth={2} />
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-transparent py-3 px-2 text-white placeholder:text-white/10 focus:outline-none text-xl font-mono tracking-[0.3em]"
                                                    placeholder="000000"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || otp.length < 6}
                                        className="relative w-full rounded-xl overflow-hidden group disabled:opacity-75 disabled:cursor-not-allowed h-11"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center h-full gap-2 text-white font-bold text-sm">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                <>Verify &amp; Log In <Sparkles className="w-4 h-4" /></>
                                            )}
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-between mt-4">
                                        <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                                            className="text-zinc-500 hover:text-white text-xs font-semibold transition-colors">
                                            ← Change email
                                        </button>
                                        <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading}
                                            className="text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 disabled:cursor-not-allowed text-xs font-semibold transition-colors">
                                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                                        </button>
                                    </div>
                                </motion.form>
                            )}

                            {step === '2fa' && (
                                <motion.form
                                    key="2fa-form"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleVerify2FA}
                                    className="space-y-5"
                                >
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-zinc-400 ml-1 uppercase tracking-wider">Authenticator Code</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-white/[0.02] rounded-xl flex items-center border border-white/[0.08] overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/40 group-focus-within:bg-[#0E0E16] group-hover:border-white/15">
                                                <div className="pl-4 pr-2 text-zinc-500 group-focus-within:text-violet-400 transition-colors duration-300">
                                                    <Shield size={18} strokeWidth={2} />
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    required
                                                    maxLength={6}
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-transparent py-3 px-2 text-white placeholder:text-white/10 focus:outline-none text-xl font-mono tracking-[0.3em]"
                                                    placeholder="000000"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading || totpCode.length < 6}
                                        className="relative w-full rounded-xl overflow-hidden group disabled:opacity-75 disabled:cursor-not-allowed h-11">
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center h-full gap-2 text-white font-bold text-sm">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Verify &amp; Log In</>}
                                        </div>
                                    </button>

                                    <div className="flex items-center justify-between mt-4">
                                        <button type="button" onClick={() => { setStep('email'); setOtp(''); setTotpCode(''); setError(''); }}
                                            className="text-zinc-500 hover:text-white text-xs font-semibold transition-colors">
                                            ← Start over
                                        </button>
                                    </div>
                                </motion.form>
                            )}

                            {step === 'restore' && (
                                <motion.div
                                    key="restore-screen"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="space-y-5"
                                >
                                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                                        <div className="flex items-start gap-2.5">
                                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-xs font-bold text-red-300 mb-0.5">Deletion scheduled</p>
                                                <p className="text-[11px] text-white/60 leading-relaxed">
                                                    Your account is set for permanent deletion on{' '}
                                                    <span className="text-white/90 font-semibold">
                                                        {new Date(deletionDate).toLocaleDateString('en-US', {
                                                            year: 'numeric', month: 'long', day: 'numeric',
                                                        })}
                                                    </span>
                                                    . Restoring will cancel this process.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleRestoreAccount} disabled={cancelRestoreLoading}
                                        className="relative w-full rounded-xl overflow-hidden group disabled:opacity-75 disabled:cursor-not-allowed h-11">
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center h-full gap-2 text-white font-bold text-sm">
                                            {cancelRestoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '✦ Restore My Account'}
                                        </div>
                                    </button>
                                    <button type="button"
                                        onClick={async () => { await refreshUser(); router.push(redirectPath || '/user/admin/dashboard'); }}
                                        className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors text-center py-2">
                                        Continue without restoring →
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Footer Signup */}
                <div className="relative z-10 flex flex-col items-center mt-8">
                    <p className="text-zinc-500 text-sm font-medium">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-white hover:text-indigo-400 transition-colors font-bold relative group">
                            Sign up for free
                            <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-400 transition-all duration-300 group-hover:w-full" />
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6">
                <div className="w-full max-w-sm space-y-4">
                    <div className="h-4 w-3/4 rounded-full shimmer-container shimmer-bg mx-auto" />
                    <div className="h-4 w-1/2 rounded-full shimmer-container shimmer-bg mx-auto" />
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}