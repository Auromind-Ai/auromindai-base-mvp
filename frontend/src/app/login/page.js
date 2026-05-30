'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Lock } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';

function LoginPageContent() {

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (isAuthenticated() && getUser()) {
            router.push(redirectPath || '/user/admin/dashboard');
        }
    }, [router, redirectPath]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

    try {
            const data = await api.login(email);
            console.log("Login API Response:", data);

            //  Backup admin token if applicable
            const adminToken = localStorage.getItem("admin_backup_token");
            sessionStorage.clear();
            localStorage.clear();
            if (adminToken) {
                localStorage.setItem("admin_backup_token", adminToken);
            }

            // Set fresh data
            setToken(data.access_token);
            setUser(data.user);

            if (data.user?.role === 'admin' || data.user?.is_platform_admin) {
                localStorage.setItem("admin_backup_token", data.access_token);
            }

            if (data.workspaces && data.workspaces.length > 0) {
                setWorkspace(data.workspaces[0]);
                sessionStorage.setItem("workspace_id", data.workspaces[0].id);
            }

            router.push(redirectPath || '/user/admin/dashboard');

        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        const style = document.createElement('style');

        style.textContent = `
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }

        @keyframes fadeIn {
          from { opacity:0; transform: translateY(10px); }
          to { opacity:1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        `;

        document.head.appendChild(style);

        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };

    }, []);

    return (

        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 font-sans">

            {/* background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-900/15 blur-[100px]" />
            </div>

            <div className="w-full max-w-md animate-fade-in">

                {/* logo */}
                <div className="flex flex-col items-center mb-8">

                    <div
                        className="group flex items-center gap-3 mb-6 cursor-default select-none transition-transform active:scale-95"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Cpu className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-3xl font-extrabold text-white tracking-tight">
                            Auromind
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        Welcome back
                    </h1>

                    <p className="text-slate-400 text-center">
                        Login with your email
                    </p>

                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">

                            <label className="text-sm font-semibold text-slate-300 ml-1">
                                Email Address
                            </label>

                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    placeholder="owner@business.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Log In to Console
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-400">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-indigo-400 font-bold">
                            Sign up free
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
