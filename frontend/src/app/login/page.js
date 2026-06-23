'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Shield, Sparkles, AlertTriangle } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Environment, Float, Stars } from '@react-three/drei';

function AnimatedSphere() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <Sphere args={[1, 100, 100]} ref={meshRef} scale={1.6}>
        <MeshDistortMaterial
          color="#6366F1"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.9}
        />
      </Sphere>
      {/* Additional smaller spheres to create a constellation effect */}
      <Sphere args={[0.2, 32, 32]} position={[2, 2, -1]}>
        <meshStandardMaterial color="#A855F7" roughness={0.1} metalness={0.8} />
      </Sphere>
      <Sphere args={[0.15, 32, 32]} position={[-2, -1.5, 1]}>
        <meshStandardMaterial color="#EC4899" roughness={0.2} metalness={0.7} />
      </Sphere>
    </Float>
  );
}

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

    useEffect(() => {
        if (!authLoading && user) {
            router.push(redirectPath || '/user/admin/dashboard');
        }
    }, [user, authLoading, router, redirectPath]);

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
            if (mappedErr.includes("Account not found")) {
                console.log("useEffect QueryParamError: Setting redirect timeout to /signup");
                setTimeout(() => {
                    console.log("useEffect QueryParamError: Executing redirect to /signup via router.push");
                    router.push('/signup');
                }, 3000);
            } else if (mappedErr.includes("Account already exists")) {
                console.log("useEffect QueryParamError: Setting redirect timeout to /login");
                setTimeout(() => {
                    console.log("useEffect QueryParamError: Executing redirect to /login via router.push");
                    router.push('/login');
                }, 3000);
            }
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
            if (mappedError.includes("Account not found")) {
                console.log("Setting redirect timeout to /signup");
                setTimeout(() => {
                    console.log("Executing redirect to /signup via router.push");
                    router.push('/signup');
                }, 3000);
            }
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
           
            {/* Left Pane - 3D Visual Experience */}
            <div className="hidden lg:block lg:w-[55%] relative bg-[#020202]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] z-0" />
               
                <div className="absolute inset-0 z-10">
                    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#A855F7" />
                        <directionalLight position={[-10, -10, -5]} intensity={1} color="#6366F1" />
                        <pointLight position={[0, 0, 0]} intensity={0.5} color="#EC4899" />
                       
                        <AnimatedSphere />
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                        <Environment preset="city" />
                    </Canvas>
                </div>

                <div className="absolute bottom-8 left-8 xl:bottom-16 xl:left-16 z-20 text-left pointer-events-none w-full max-w-md">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={featureIndex}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                            <h2 className="text-3xl xl:text-4xl font-bold text-white mb-3 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] tracking-tight">
                                {features[featureIndex].title}
                            </h2>
                            <p className="text-white/60 text-sm xl:text-base leading-relaxed drop-shadow-md pr-8">
                                {features[featureIndex].desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                   
                    {/* Progress indicators */}
                    <div className="flex gap-2 mt-8">
                        {features.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-700 ease-in-out ${i === featureIndex ? 'w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'w-2 bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Pane - Authentication Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 sm:p-12 relative z-10 border-l border-white/5 bg-[#050505]">
                {/* Background ambient glow for right pane */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            <Cpu className="text-white" size={18} strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Auromind</span>
                    </Link>
                </div>

                <div className="w-full max-w-[380px] mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 mb-4">
                            {step === 'email' ? 'Welcome back'
                                : step === 'otp' ? 'Check inbox'
                                : step === '2fa' ? 'Authenticator Code'
                                : 'Account Scheduled for Deletion'}
                        </h1>

                        <p className="text-white/50 text-[15px] mb-10 leading-relaxed">
                            {step === 'email'
                                ? 'Log in to access your intelligent workspace and continue your journey.'
                                : step === 'otp'
                                ? `We've sent a highly secure verification code to ${email}`
                                : step === '2fa'
                                ? 'Enter the 6-digit code from your Google Authenticator app.'
                                : 'Your account is currently scheduled for deletion. You can restore it now.'}
                        </p>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 backdrop-blur-md"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="min-w-5 text-red-400 mt-0.5">⚠️</div>
                                    <div className="text-red-400 text-sm font-medium">{error}</div>
                                </div>
                                {error.includes("sign up first") && (
                                    <Link href="/signup" className="text-indigo-400 text-sm font-semibold ml-8 hover:text-indigo-300 transition-colors">
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
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-medium text-white/60 ml-1 uppercase tracking-wider">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-[#111] rounded-2xl flex items-center border border-white/5 overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/50 group-focus-within:bg-[#151515] group-hover:border-white/10">
                                                <div className="pl-4 pr-3 text-white/30 group-focus-within:text-indigo-400 transition-colors duration-300">
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
                                        className="relative w-full rounded-2xl overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium text-[15px]">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>Continue with Email <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </div>
                                    </button>
                                    <div className="relative flex items-center py-4">
                                        <div className="flex-grow border-t border-white/5"></div>
                                        <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-medium uppercase tracking-widest">or</span>
                                        <div className="flex-grow border-t border-white/5"></div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => api.googleLogin('login')}
                                        className="w-full bg-[#111] hover:bg-[#151515] border border-white/5 hover:border-white/10 rounded-2xl py-4 flex items-center justify-center gap-3 text-white font-medium text-[15px] transition-all duration-300"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
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
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-medium text-white/60 ml-1 uppercase tracking-wider">6-Digit Secure Code</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-[#111] rounded-2xl flex items-center border border-white/5 overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/50 group-focus-within:bg-[#151515] group-hover:border-white/10">
                                                <div className="pl-5 pr-2 text-white/30 group-focus-within:text-fuchsia-400 transition-colors duration-300">
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
                                        className="relative w-full rounded-2xl overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium text-[15px]">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <> Verify &amp; Log In <Sparkles className="w-4 h-4" /></>
                                            )}
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-between mt-6">
                                        <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                                            className="text-white/40 hover:text-white text-[13px] font-medium transition-colors">
                                            ← Use different email
                                        </button>
                                        <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading}
                                            className="text-indigo-400 hover:text-indigo-300 disabled:text-white/20 disabled:cursor-not-allowed text-[13px] font-medium transition-colors">
                                            {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend code'}
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
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-medium text-white/60 ml-1 uppercase tracking-wider">Authenticator Code</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
                                            <div className="relative bg-[#111] rounded-2xl flex items-center border border-white/5 overflow-hidden transition-all duration-300 group-focus-within:border-indigo-500/50 group-focus-within:bg-[#151515] group-hover:border-white/10">
                                                <div className="pl-5 pr-2 text-white/30 group-focus-within:text-violet-400 transition-colors duration-300">
                                                    <Shield size={20} strokeWidth={2} />
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    required
                                                    maxLength={6}
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-transparent py-4 px-2 text-white placeholder:text-white/10 focus:outline-none text-2xl font-mono tracking-[0.3em]"
                                                    placeholder="000000"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading || totpCode.length < 6}
                                        className="relative w-full rounded-2xl overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium text-[15px]">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield className="w-4 h-4" /> Verify &amp; Log In</>}
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-between mt-6">
                                        <button type="button" onClick={() => { setStep('email'); setOtp(''); setTotpCode(''); setError(''); }}
                                            className="text-white/40 hover:text-white text-[13px] font-medium transition-colors">
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
                                    className="space-y-6"
                                >
                                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <p className="text-sm font-semibold text-red-300 mb-1">Deletion scheduled</p>
                                                <p className="text-xs text-white/60 leading-relaxed">
                                                    Your account is set for permanent deletion on{' '}
                                                    <span className="text-white/90 font-medium">
                                                        {new Date(deletionDate).toLocaleDateString('en-US', {
                                                            year: 'numeric', month: 'long', day: 'numeric',
                                                        })}
                                                    </span>
                                                    . After this date, all your data will be permanently removed.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleRestoreAccount} disabled={cancelRestoreLoading}
                                        className="relative w-full rounded-2xl overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center py-4 gap-2 text-white font-medium text-[15px]">
                                            {cancelRestoreLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✦ Restore My Account'}
                                        </div>
                                    </button>
                                    <button type="button"
                                        onClick={async () => { await refreshUser(); router.push(redirectPath || '/user/admin/dashboard'); }}
                                        className="w-full text-white/40 hover:text-white/70 text-[13px] font-medium transition-colors text-center py-2">
                                        Continue to dashboard without restoring →
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 mt-12">
                    <p className="text-white/40 text-[13px] font-medium">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-white hover:text-indigo-400 transition-colors relative group">
                            Sign up for free
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-400 transition-all duration-300 group-hover:w-full" />
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
