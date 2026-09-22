'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Shield, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTurnstile } from '@/hooks/useTurnstile';
import { jakarta } from '@/lib/fonts';

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
   
    if (msg.toLowerCase().includes("deactivat")) {
        return "Your account is deactivated due to some reason. Please call or contact the support team.";
    }
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
    const {
        containerRef,
        loading: turnstileLoading,
        error: turnstileError,
        siteKeyMissing,
        execute: executeTurnstile,
        initWidget: initTurnstileWidget
    } = useTurnstile();

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { appName } = useBranding();

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
    const [resendSuccess, setResendSuccess] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
    const tokenHandledRef = useRef(false);

    useEffect(() => {
        initTurnstileWidget();
    }, [initTurnstileWidget]);

    useEffect(() => {
        // Delay mounting of 3D Canvas until after initial form animations finish
        const timer = setTimeout(() => {
            setShowCanvas(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token && !tokenHandledRef.current) {
            tokenHandledRef.current = true;
            setToken(token);
            refreshUser().then(() => {
                router.replace(redirectPath || '/user/admin/dashboard');
            }).catch(() => {
                // If refresh fails, keep tokenHandledRef true so we don't loop
            });
            return;
        }
        
        if (!token && !authLoading && user) {
            router.replace(redirectPath || '/user/admin/dashboard');
        }
    }, [user, authLoading, router, redirectPath, searchParams, refreshUser]);

    useEffect(() => {
        const isDeactivated = searchParams.get('deactivated');
        const isSessionExpired = searchParams.get('session_expired');
        const err = searchParams.get('error');

        if (isDeactivated === 'true') {
            setShowDeactivatedModal(true);
            setError("Your account is deactivated due to some reason. Please call or contact the support team.");
        } else if (isSessionExpired === 'true') {
            setError("Your session has expired. Please log in again to continue.");
        } else if (err) {
            let decodedErr = decodeURIComponent(err);
            if (decodedErr.toLowerCase().includes("deactivat")) {
                setShowDeactivatedModal(true);
                setError("Your account is deactivated due to some reason. Please call or contact the support team.");
            } else if (decodedErr.includes("not registered") || decodedErr.includes("not found") || decodedErr.includes("sign up first")) {
                setError("Account not found. Please sign up first.");
            } else {
                let mappedErr = getErrorMessage({ message: decodedErr });
                setError(mappedErr);
            }
        }
    }, [searchParams, router]);

    useEffect(() => {
        const requires2FA = searchParams.get('requires_2fa');
        if (requires2FA === 'true') {
            setPendingToken('');
            setTotpCode('');
            setStep('2fa');
        }
    }, [searchParams]);

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
            const token = await executeTurnstile();
            // token retrieved
            await api.sendOTP(email, 'login', token);
            setStep('otp');
            setResendTimer(60);
        } catch (err) {
            const mappedError = getErrorMessage(err);
            if (err?.message?.toLowerCase()?.includes('deactivat') || mappedError.toLowerCase().includes('deactivat')) {
                setShowDeactivatedModal(true);
            }
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
            const token = await executeTurnstile();
            // token retrieved
            const data = await api.verifyOTP(email, otp, 'login', null, null, null, token);
            //  2FA gate ─
            if (data?.requiresTwoFactor) {
                setPendingToken(data.pending_token);
                setTotpCode('');
                setStep('2fa');
                return;
            }
            //  END 2FA gate
            if (data?.user?.deletion_scheduled_at) {
                setToken(data.access_token);
                setUser(data.user);
                if (data.workspaces?.length > 0) {
                    setWorkspace(data.workspaces[0]);
                }
                setDeletionDate(data.user.deletion_scheduled_at);
                setStep('restore');
                return;
            }
            //  END pending deletion gate ─
            if (!data?.access_token) throw new Error('Verification failed');
            setToken(data.access_token);
            setUser(data.user);
            if (data.workspaces?.length > 0) {
                setWorkspace(data.workspaces[0]);
            }
            await refreshUser();
            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            const mappedError = getErrorMessage(err);
            if (err?.message?.toLowerCase()?.includes('deactivat') || mappedError.toLowerCase().includes('deactivat')) {
                setShowDeactivatedModal(true);
            }
            setError(mappedError);
        } finally {
            setLoading(false);
        }
    };
    const handleResend = async () => {
        if (resendTimer > 0 || resendLoading) return;
        setError('');
        setResendSuccess('');
        setResendLoading(true);
        try {
            const token = await executeTurnstile();
            await api.sendOTP(email, 'login', token);
            setResendTimer(60);
            setOtp('');
            // Success message 
            setResendSuccess('Verification code resent successfully...');
            setTimeout(() => setResendSuccess(''), 4500);
        } catch (err) {
            const mappedError = getErrorMessage(err);
            if (err?.message?.toLowerCase()?.includes('deactivat') || mappedError.toLowerCase().includes('deactivat')) {
                setShowDeactivatedModal(true);
            }
            setError(mappedError);
        } finally {
            setResendLoading(false);
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
            const mappedError = getErrorMessage(err);
            if (err?.message?.toLowerCase()?.includes('deactivat') || mappedError.toLowerCase().includes('deactivat')) {
                setShowDeactivatedModal(true);
            }
            setError(mappedError);
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
                setToken(data.access_token);
                setUser(data.user);
                if (data.workspaces?.length > 0) {
                    setWorkspace(data.workspaces[0]);
                }

                setDeletionDate(data.user.deletion_scheduled_at);
                setStep('restore');
                return;
            }
            //  END pending deletion gate ─
            if (!data?.access_token) throw new Error('Verification failed');
            setToken(data.access_token);
            setUser(data.user);
            if (data.workspaces?.length > 0) {
                setWorkspace(data.workspaces[0]);
            }
            await refreshUser();
            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            const mappedError = getErrorMessage(err);
            if (err?.message?.toLowerCase()?.includes('deactivat') || mappedError.toLowerCase().includes('deactivat')) {
                setShowDeactivatedModal(true);
            }
            setError(mappedError);
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
        <div className="min-h-screen bg-[#06050C] text-white flex overflow-hidden font-sans">
            {/* Left Pane - Visual Dark Poster with border and clean framing */}
            <div 
                className="hidden lg:flex h-screen relative bg-[#06050C] shrink-0 border-r border-white/10 select-none sticky top-0 overflow-hidden"
                style={{ aspectRatio: '896 / 1200' }}
            >
                {/* Subtle ambient glow in left pane */}
                <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-purple-600/[0.08] rounded-full blur-[120px] pointer-events-none" />

                {/* Clean Dark Poster Image */}
                <img
                    src="/images/login_hero_dark_clean.jpg"
                    alt="Automate every WhatsApp conversation - Orbion Agents"
                    className="w-full h-full object-cover select-none pointer-events-none"
                />

                {/* Real Crisp Brand Logo with Plus Jakarta Sans */}
                <div className="absolute top-6 left-6 xl:top-8 xl:right-8 z-20">
                    <Link href="/" className="inline-flex items-center gap-2.5 group">
                        <img 
                            src="/logo.png" 
                            alt={appName || "Orbion Agents"} 
                            className="h-8 xl:h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.45)] group-hover:scale-105 transition-all duration-300" 
                        />
                        <div className="flex items-center">
                            <span className={`${jakarta.className} text-[18px] xl:text-[20px] font-extrabold tracking-[0.05em] text-white`}>
                                ORBION
                            </span>
                            <span className={`${jakarta.className} ml-2 text-[18px] xl:text-[20px] font-extrabold tracking-[0.08em] bg-gradient-to-r from-[#c084fc] via-[#a855f7] to-[#818cf8] bg-clip-text text-transparent`}>
                                AGENTS
                            </span>
                        </div>
                    </Link>
                </div>


            </div>

            {/* Right Pane - Authentication Form */}
            <div className="w-full flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-6 xl:p-8 relative z-10 bg-[#06050C] min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden overflow-x-hidden">
                {/* Subtle ambient glows matching clean dark theme */}
                <div className="absolute top-[-5%] right-[-5%] w-[420px] h-[420px] bg-purple-600/[0.07] rounded-full blur-[130px] pointer-events-none" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[420px] h-[420px] bg-indigo-600/[0.05] rounded-full blur-[140px] pointer-events-none" />

                {/* Mobile / Tablet Header (Hidden on Desktop since Left Pane handles it) */}
                <div className="relative z-10 mb-3 sm:mb-4 shrink-0 flex items-center justify-center lg:hidden w-full max-w-[430px] mx-auto pt-1 sm:pt-2">
                    <Link href="/" className="inline-flex items-center group">
                        <div className="flex items-center gap-2">
                            <img 
                                src="/logo.png" 
                                alt={appName || "Orbion Agents"} 
                                className="h-7 sm:h-8 w-auto object-contain group-hover:rotate-6 transition-all duration-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]" 
                            />
                            <div className="flex items-center">
                                <span className={`${jakarta.className} text-[17px] sm:text-[18px] font-extrabold tracking-[0.05em] text-white`}>
                                    ORBION
                                </span>
                                <span className={`${jakarta.className} ml-2 text-[17px] sm:text-[18px] font-extrabold tracking-[0.08em] bg-gradient-to-r from-[#c084fc] via-[#a855f7] to-[#818cf8] bg-clip-text text-transparent`}>
                                    AGENTS
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Form Wrapper Card matching exact SignupFormCard design */}
                <div 
                    className="my-auto mx-auto shrink-0 w-full max-w-[430px] rounded-[22px] sm:rounded-[28px] bg-[#111111] border border-white/[0.08] p-5 sm:p-7 md:p-8 shadow-2xl z-10"
                    style={{
                        fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: '#ffffff', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.3px' }} className="text-[22px] sm:text-[26px]">
                            {step === 'email' ? 'Welcome Back'
                                : step === 'otp' ? 'Enter OTP'
                                : step === '2fa' ? 'Authenticator Code'
                                : 'Account Scheduled for Deletion'}
                        </h2>
                        <p style={{ color: '#9ca3af', margin: 0 }} className="text-[13px] sm:text-[14px]">
                            {step === 'email' ? 'Log in to your account to continue'
                                : step === 'otp' ? `OTP sent to ${email}`
                                : step === '2fa' ? 'Enter the 6-digit code from your app'
                                : 'Your account is scheduled for deletion.'}
                        </p>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>{error}</div>
                            {error.includes("sign up first") && (
                                <Link href="/signup" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    Create an account →
                                </Link>
                            )}
                        </div>
                    )}
                    {resendSuccess && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#34d399', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} />
                            <span>{resendSuccess}</span>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 'email' && (
                            <motion.div
                                key="email-form-wrap"
                                variants={fadeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {/* Google OAuth Button */}
                                <button
                                    type="button"
                                    onClick={() => api.googleLogin('login')}
                                    style={{ 
                                        width: '100%', 
                                        background: '#ffffff', 
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: '9999px', 
                                        padding: '14px 20px', 
                                        color: '#111827', 
                                        fontSize: '15px', 
                                        fontWeight: '600', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s ease',
                                        marginBottom: '2px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)'}
                                    onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Continue with Google
                                </button>

                                {/* Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0 20px' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                                    <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '600' }}>or continue with email</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                                </div>

                                {/* Email Field and Submit Button */}
                                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Email</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="your@email.com"
                                            disabled={siteKeyMissing}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            style={{ width: '100%', background: '#1d1d21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 18px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || turnstileLoading || siteKeyMissing || !email}
                                        style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '4px', opacity: (loading || turnstileLoading || siteKeyMissing || !email) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 22px rgba(129, 74, 200, 0.45)', transition: 'all 0.2s ease' }}
                                        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 26px rgba(129, 74, 200, 0.6)'}
                                        onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 22px rgba(129, 74, 200, 0.45)'}
                                    >
                                        {loading || turnstileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In Free'}
                                    </button>
                                </form>

                                <p style={{ textAlign: 'center', marginTop: '22px', marginBottom: 0, color: '#9ca3af', fontSize: '13px' }}>
                                    Don&apos;t have an account?{' '}
                                    <Link href="/signup" style={{ color: '#ffffff', fontWeight: '700', textDecoration: 'none' }}>
                                        Sign Up
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {step === 'otp' && (
                            <motion.form
                                key="otp-form-wrap"
                                variants={fadeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onSubmit={handleVerifyOTP}
                                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                            >
                                <div>
                                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px' }}>6-digit OTP</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter OTP"
                                        disabled={siteKeyMissing}
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        maxLength={6}
                                        style={{ width: '100%', background: '#1d1d21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 18px', color: '#ffffff', fontSize: '20px', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', textAlign: 'center', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || turnstileLoading || siteKeyMissing || otp.length < 6}
                                    style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: (loading || turnstileLoading || siteKeyMissing || otp.length < 6) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 22px rgba(129, 74, 200, 0.45)' }}
                                >
                                    {loading || turnstileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', padding: 0 }}
                                    >
                                        ← Change email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resendTimer > 0 || resendLoading || loading || turnstileLoading || siteKeyMissing}
                                        style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '13px', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', padding: 0, opacity: resendTimer > 0 ? 0.6 : 1 }}
                                    >
                                        {resendLoading ? 'Resending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {step === '2fa' && (
                            <motion.form
                                key="2fa-form-wrap"
                                variants={fadeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onSubmit={handleVerify2FA}
                                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                            >
                                <div>
                                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Authenticator Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        maxLength={6}
                                        placeholder="000000"
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                        style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '20px', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', textAlign: 'center', boxShadow: 'inset 0px 4px 20px 0px rgba(255,255,255,0.18)' }}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || totpCode.length < 6}
                                    style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '28px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: (loading || totpCode.length < 6) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('email'); setOtp(''); setTotpCode(''); setError(''); }}
                                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        ← Start over
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {step === 'restore' && (
                            <motion.div
                                key="restore-screen-wrap"
                                variants={fadeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                            >
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px', color: '#fca5a5', fontSize: '13px' }}>
                                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>Deletion scheduled</div>
                                    <div>
                                        Your account is set for permanent deletion on{' '}
                                        <strong>{new Date(deletionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                                        Restoring will cancel this process.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRestoreAccount}
                                    disabled={cancelRestoreLoading}
                                    style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '28px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {cancelRestoreLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✦ Restore My Account'}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => { await refreshUser(); router.push(redirectPath || '/user/admin/dashboard'); }}
                                    style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
                                >
                                    Continue without restoring →
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Trust & Security Badge */}
                <div className="relative z-10 shrink-0 text-center py-2.5">
                    <p className="text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 tracking-wide">
                        <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="font-bold text-zinc-200">Enterprise-grade security • End-to-end encrypted</span>
                    </p>
                </div>
            </div>
            {/* Deactivated Account Modal Popup */}
            <AnimatePresence>
                {showDeactivatedModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#0f0e17] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Top decorative accent */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                            
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                    <AlertTriangle size={26} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                                        Account Deactivated
                                    </h3>
                                    <p className="text-xs text-zinc-400 font-medium">
                                        Access Restricted
                                    </p>
                                </div>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                                    Your account is deactivated due to some reason. Please call or contact the support team.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href="mailto:support@auromind.ai?subject=Account%20Reactivation%20Request"
                                    className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs text-center transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
                                >
                                    <Mail size={15} /> Contact Support
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowDeactivatedModal(false)}
                                    className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 rounded-xl text-xs font-semibold transition text-center"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden Turnstile Container */}
            <div 
                ref={containerRef} 
                style={{ 
                    position: 'absolute', 
                    left: '-9999px', 
                    top: '-9999px',
                    width: '0px', 
                    height: '0px'
                }} 
            />
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