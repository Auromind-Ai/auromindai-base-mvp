"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Loader2, Cpu, ArrowLeft } from 'lucide-react';
import { setToken, setUser, setWorkspace, isAuthenticated } from '@/lib/auth';
import Link from 'next/link';

const API = '/api'; // same-origin proxy

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/admin';

    const [secretKey, setSecretKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-redirect if already owner
    useEffect(() => {
        const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        if (isAuthenticated() && (user?.role === 'admin' || user?.is_platform_admin)) {
            router.push(redirectPath);
        }
    }, [router, redirectPath]);

    const handleSecretLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/auth/login/secret`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: secretKey })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Invalid master key");

            setToken(data.access_token);
            setUser(data.user);
            // Crucial: Set backup token for AdminAuthGuard stability
            localStorage.setItem("admin_backup_token", data.access_token);
            
            if (data.workspaces?.length > 0) setWorkspace(data.workspaces[0]);
            
            // Success animation or direct push
            router.push(redirectPath);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-500/5 blur-[100px]" />
            </div>

            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6">
                        <Shield className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Platform Owner</h1>
                    <p className="text-gray-500 text-sm font-medium tracking-wide">AUTHENTICATION REQUIRED</p>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                    
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSecretLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">
                                Master Access Key
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    autoFocus
                                    required
                                    className="w-full pl-11 pr-4 py-4 bg-[#020202] border border-white/10 rounded-2xl text-white placeholder:text-gray-700 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-mono"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "UNRESTRICTED ACCESS"}
                        </button>
                    </form>
                </div>

                <div className="flex justify-center">
                    <Link 
                        href="/login" 
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold tracking-wide"
                    >
                        <ArrowLeft size={14} />
                        BACK TO USER LOGIN
                    </Link>
                </div>
            </div>
        </div>
    );
}
