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
            <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-8 xl:p-12 relative bg-[#030208] overflow-hidden border-r border-white/5">
                {/* Deep background ambient glowing blobs for elegance */}
                <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
                
                {/* Top Section - Brand/Back Link */}
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 group text-white/50 hover:text-white transition-colors text-sm font-medium">
                        <span>← Back to Home</span>
                    </Link>
                </div>

                {/* Center Section - Stacked Layout */}
                <div className="relative z-10 flex flex-col justify-center gap-8 xl:gap-12 my-auto">
                    
                    {/* Marketing Text */}
                    <div className="space-y-4 max-w-sm">
                        <h1 className="text-[28px] xl:text-[34px] font-extrabold leading-[1.25] text-white tracking-tight">
                            AI Agents That Talk. Close. <br />
                            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                                Grow Your Sales.
                            </span>
                        </h1>
                        <p className="text-zinc-400 text-sm xl:text-base font-normal leading-relaxed">
                            Your 24/7 AI Workforce for Sales, Support &amp; Growth.
                        </p>
                    </div>

                    {/* Funnel Mockup Graphic */}
                    <div className="relative w-full h-[320px] sm:h-[350px] mx-auto mt-4">
                        
                        {/* Animated SVG connecting dash path */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 350" fill="none">
                            <path 
                                d="M 120 120 C 180 120, 220 100, 240 130 C 260 160, 220 220, 160 230 C 100 240, 110 300, 210 290" 
                                stroke="url(#dash-gradient)" 
                                strokeWidth="2" 
                                strokeDasharray="6 6" 
                                className="animate-[dash_30s_linear_infinite]"
                            />
                            <defs>
                                <linearGradient id="dash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
                                    <stop offset="50%" stopColor="#C084FC" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#F472B6" stopOpacity="0.4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        
                        {/* Style block for path dash offset animation */}
                        <style>{`
                            @keyframes dash {
                                to {
                                    stroke-dashoffset: -1000;
                                }
                            }
                        `}</style>

                        {/* 1. Instagram Ad Card (Floats slightly) */}
                        <motion.div 
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-2 left-2 w-[180px] rounded-xl border border-white/10 bg-[#0B0A12]/80 backdrop-blur-md p-2.5 shadow-2xl overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 via-pink-500 to-yellow-500 flex items-center justify-center">
                                        <Instagram size={10} className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-white leading-none flex items-center gap-0.5">
                                            Your Brand
                                            <span className="text-blue-400 text-[8px]">✓</span>
                                        </span>
                                        <span className="text-[7px] text-zinc-500 leading-none">Sponsored</span>
                                    </div>
                                </div>
                                <span className="text-zinc-500 text-[10px] font-bold">•••</span>
                            </div>
                            
                            {/* Card Image */}
                            <div className="relative w-full aspect-square rounded-md overflow-hidden bg-zinc-800 mb-2 border border-white/5">
                                <img src="/images/login_mock_ad.jpg" alt="Mock Ad" className="w-full h-full object-cover" />
                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] font-bold text-yellow-400">
                                    50% OFF
                                </div>
                            </div>
                            
                            {/* Card Action Button */}
                            <div className="w-full bg-[#25D366] hover:bg-[#20ba59] transition-colors rounded-md py-1 px-2 flex items-center justify-between text-[8px] font-bold text-white cursor-pointer">
                                <span>Send Message</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="text-[7px] text-white/90">WhatsApp</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. WhatsApp Bubble Card */}
                        <motion.div 
                            animate={{ y: [0, 5, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute top-[80px] right-2 w-[160px] rounded-xl border border-white/10 bg-[#0B0A12]/80 backdrop-blur-md p-2.5 shadow-2xl flex flex-col gap-2"
                        >
                            {/* Message Header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                <span className="text-[8px] font-bold text-zinc-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> Chat Agent
                                </span>
                                <span className="text-[7px] text-zinc-500 font-medium">Active Now</span>
                            </div>
                            
                            {/* Ad Card inside chat */}
                            <div className="bg-[#1C1A27]/60 rounded-lg p-1.5 border border-white/5 flex gap-1.5 items-center">
                                <img src="/images/login_mock_ad.jpg" alt="Product" className="w-8 h-8 rounded object-cover" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] font-bold text-white leading-none truncate">Get 20% off...</span>
                                    <span className="text-[7px] text-zinc-500">Facebook Ad</span>
                                </div>
                            </div>
                            
                            {/* User reply bubble */}
                            <div className="self-end bg-violet-600/30 border border-violet-500/20 text-white rounded-lg rounded-tr-none px-2 py-1 text-[8.5px] max-w-[85%] relative font-sans">
                                I want to buy
                                <div className="absolute right-1 bottom-0.5 text-blue-400 text-[6px]">✓✓</div>
                            </div>
                        </motion.div>

                        {/* 3. Click Metric Card */}
                        <motion.div 
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="absolute bottom-20 left-[20px] rounded-xl border border-white/10 bg-[#0B0A12]/80 backdrop-blur-md px-3 py-2 shadow-2xl flex items-center gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <MousePointerClick size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white leading-none">3.2x</span>
                                <span className="text-[8px] text-zinc-500 font-bold tracking-wider uppercase leading-none mt-1">Clicks</span>
                            </div>
                        </motion.div>

                        {/* 4. ROI Metric Card */}
                        <motion.div 
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                            className="absolute bottom-[2px] left-[130px] rounded-xl border border-white/10 bg-[#0B0A12]/80 backdrop-blur-md px-3 py-2 shadow-2xl flex items-center gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ShoppingBag size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white leading-none">150X</span>
                                <span className="text-[8px] text-zinc-500 font-bold tracking-wider uppercase leading-none mt-1">ROI</span>
                            </div>
                        </motion.div>

                        {/* 5. Order Placed Confirmation */}
                        <motion.div 
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
                            className="absolute bottom-6 right-2 rounded-xl border border-white/10 bg-[#0B0A12]/80 backdrop-blur-md px-3 py-2.5 shadow-2xl flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <span className="text-xs font-bold text-white tracking-tight">Order Placed</span>
                        </motion.div>

                    </div>
                </div>

                {/* Footer Section */}
                <div className="relative z-10 flex items-center justify-between text-[11px] text-zinc-600 font-medium">
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
                        {appLogoUrl && !logoError ? (
                            <div className="flex items-center gap-2.5">
                                <img 
                                    src={appLogoUrl} 
                                    alt={appName} 
                                    className="h-[48px] w-auto object-contain group-hover:rotate-6 transition-all duration-300" 
                                    onError={() => setLogoError(true)}
                                />
                                <span className={`${jakarta.className} text-[18px] font-extrabold tracking-[0.1em] text-white flex items-center`}>
                                    ORBION
                                    <span className="bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#818CF8] bg-clip-text text-transparent ml-2 font-semibold tracking-[0.15em]">
                                        AGENTS
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                                    <Cpu className="text-white" size={18} strokeWidth={2.5} />
                                </div>
                                <span className="font-semibold text-lg tracking-tight">{appName}</span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Form Wrapper Card */}
                <div className="w-full max-w-[400px] mx-auto p-6 sm:p-8 rounded-[2rem] border border-white/[0.08] bg-[#0B0A12]/40 backdrop-blur-xl shadow-2xl relative overflow-hidden my-auto">
                    {/* Glowing card outline top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                    
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
                                    className="space-y-4"
                                >
                                    <button
                                        type="button"
                                        onClick={() => api.googleLogin('login')}
                                        className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl py-3 flex items-center justify-center gap-3 text-white font-semibold text-sm transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>

                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-white/5"></div>
                                        <span className="flex-shrink-0 mx-3 text-white/30 text-[10px] font-bold uppercase tracking-wider">or continue with email</span>
                                        <div className="flex-grow border-t border-white/5"></div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-zinc-400 ml-1 uppercase tracking-wider">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-white/[0.02] rounded-xl flex items-center border border-white/[0.08] overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/40 group-focus-within:bg-[#0E0E16] group-hover:border-white/15">
                                                <div className="pl-4 pr-2.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors duration-300">
                                                    <Mail size={16} strokeWidth={2} />
                                                </div>

                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-transparent py-3 pr-4 text-white placeholder:text-white/20 focus:outline-none text-sm"
                                                    placeholder="you@company.com"
                                                    style={{
                                                        WebkitBoxShadow: '0 0 0px 1000px #0E0E16 inset',
                                                        caretColor: '#ffffff',
                                                        transition: 'background-color 99999s ease-in-out 0s',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="relative w-full rounded-xl overflow-hidden group disabled:opacity-75 disabled:cursor-not-allowed mt-2 h-11"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center h-full gap-2 text-white font-bold text-sm">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                <>Continue with Email <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </div>
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