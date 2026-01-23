'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu } from 'lucide-react';
import api from '@/lib/api';
import { setToken, setUser, setWorkspace } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: 'admin@gmail.com',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.login(formData.email);

            // Store auth data
            setToken(response.access_token);
            setUser(response.user);
            if (response.workspaces && response.workspaces.length > 0) {
                setWorkspace(response.workspaces[0]);
            }

            // Redirect to dashboard
            router.push('/user/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed. Please check your email.');
        } finally {
            setLoading(false);
        }
    };

    // Inject custom styles for animations
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        `;
        document.head.appendChild(style);
        return () => {
            // Check if style is still in the document before removing
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 selection:bg-indigo-500/30 font-sans">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-900/15 blur-[100px]" />
            </div>

            <div className="w-full max-w-md animate-fade-in">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <Link href="/" className="group flex items-center gap-3 mb-6 transition-transform hover:scale-105">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Cpu className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-3xl font-extrabold text-white tracking-tight">Auromind</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                    <p className="text-slate-400 text-center">Login to your AI workforce dashboard</p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl overflow-hidden relative sm:p-10">
                    {/* Inner Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                            <p className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Mail size={18} strokeWidth={2} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ email: e.target.value })}
                                    required
                                    placeholder="name@company.com"
                                    autoFocus
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Continue</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800/50 text-center space-y-4 text-sm">
                        <p className="text-slate-400">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                                Sign up free
                            </Link>
                        </p>
                        <Link href="/" className="inline-block text-slate-500 hover:text-slate-300 transition-colors py-1">
                            &larr; Back to home
                        </Link>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-600 uppercase tracking-widest font-semibold">
                    Secure AI Portal • SSAE 16 Compliant
                </p>
                <p className="mt-2 text-center text-[10px] text-slate-800 font-mono">
                    v1.1.9
                </p>
            </div>
        </div>
    );
}


