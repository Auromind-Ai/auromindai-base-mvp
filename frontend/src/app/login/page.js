'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Shield, Sparkles } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (isAuthenticated() && getUser()) {
            router.push(redirectPath || '/user/admin/dashboard');
        }
    }, [router, redirectPath]);

    // Resend countdown timer
    useEffect(() => {
        if (resendTimer <= 0) return;
        const id = setInterval(() => setResendTimer(t => t - 1), 1000);
        return () => clearInterval(id);
    }, [resendTimer]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.sendOTP(email, 'login');
            setStep('otp');
            setResendTimer(60);
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
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

            router.push(redirectPath || '/user/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
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
            setError(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch("http://localhost:8000/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "admin@gmail.com" })
            });
            if (!res.ok) throw new Error("Auto-login failed");
            const data = await res.json();
            
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

            router.push('/user/admin/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
            
            {/* Animated Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-fuchsia-900/15 rounded-full blur-[100px] mix-blend-screen" />
                
                {/* Subtle Grid overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="relative group mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500" />
                        <div className="relative w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                            <Cpu className="text-white" size={26} strokeWidth={2} />
                        </div>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-3">
                        {step === 'email' ? 'Welcome back' : 'Check your inbox'}
                    </h1>
                    <p className="text-sm sm:text-base text-white/50 max-w-[300px]">
                        {step === 'email'
                            ? 'Enter your email to sign in to your Auromind workspace'
                            : `We sent a secure code to ${email}`}
                    </p>
                </div>

                {/* Main Card with Glassmorphism */}
                <div className="relative rounded-[2rem] p-[1px] bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] blur-xl" />
                    
                    <div className="relative bg-[#0A0A0A]/80 backdrop-blur-2xl rounded-[2rem] p-8 sm:p-10 border border-white/5">
                        
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 animate-shake">
                                <div className="flex items-start gap-3">
                                    <div className="min-w-5 text-red-400 mt-0.5">⚠️</div>
                                    <div className="text-red-400 text-sm font-medium">{error}</div>
                                </div>
                                {error.includes("sign up first") && (
                                    <Link href="/signup" className="text-indigo-400 text-sm font-semibold ml-8 hover:underline">
                                        Go to Sign Up →
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Step 1: Email */}
                        {step === 'email' && (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="text-sm font-medium text-white/70 ml-1">Email Address</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-focus-within/input:opacity-100 transition duration-300 blur-sm" />
                                        <div className="relative bg-black rounded-2xl flex items-center border border-white/10 overflow-hidden transition-colors group-focus-within/input:border-white/20">
                                            <div className="pl-4 pr-3 flex items-center justify-center text-white/40 group-focus-within/input:text-white/80 transition-colors">
                                                <Mail size={18} strokeWidth={2} />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-transparent py-4 pr-4 text-white placeholder:text-white/20 focus:outline-none text-[15px]"
                                                placeholder="you@company.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="relative w-full overflow-hidden rounded-2xl group/btn disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#A855F7] transition-transform duration-300 group-hover/btn:scale-105" />
                                    <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                Continue with Email
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-white/40 text-sm">or</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => api.googleLogin('login')}
                                    className="relative w-full overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors py-4 flex items-center justify-center gap-3 text-white font-medium"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                            </form>
                        )}

                        {/* Step 2: OTP */}
                        {step === 'otp' && (
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="text-sm font-medium text-white/70 ml-1">6-Digit Code</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-focus-within/input:opacity-100 transition duration-300 blur-sm" />
                                        <div className="relative bg-black rounded-2xl flex items-center border border-white/10 overflow-hidden transition-colors group-focus-within/input:border-white/20">
                                            <div className="pl-5 pr-2 flex items-center justify-center text-white/40 group-focus-within/input:text-indigo-400 transition-colors">
                                                <Shield size={20} strokeWidth={2} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-transparent py-4 px-2 text-white placeholder:text-white/10 focus:outline-none text-2xl font-mono tracking-[0.3em]"
                                                placeholder="000000"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length < 6}
                                    className="relative w-full overflow-hidden rounded-2xl group/btn disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#A855F7] transition-transform duration-300 group-hover/btn:scale-105" />
                                    <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                Verify Code
                                                <Sparkles className="w-4 h-4" />
                                            </>
                                        )}
                                    </div>
                                </button>

                                <div className="flex items-center justify-between text-sm mt-6">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                                        className="text-white/40 hover:text-white transition-colors"
                                    >
                                        ← Back to email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resendTimer > 0 || loading}
                                        className="text-indigo-400 hover:text-indigo-300 disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {resendTimer > 0 ? `Resend code (${resendTimer}s)` : 'Resend code'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-white/40 text-sm">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-white hover:text-indigo-400 transition-colors font-medium relative group">
                            Sign up for free
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    </p>
                    <p className="text-white/40 text-sm mt-4">
                        <button onClick={handleAdminLogin} disabled={loading} className="text-amber-400 hover:text-amber-300 transition-colors font-medium relative group">
                            [Test] Auto-Login as Admin
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </p>
                </div>
                
            </div>
            
            <style jsx global>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px); }
                    40% { transform: translateX(4px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
}