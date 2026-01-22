'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Building, ArrowRight, Loader2, Cpu, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { setToken, setUser, setWorkspace } from '@/lib/auth';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        workspace_name: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.signup(
                formData.email,
                formData.password,
                formData.full_name,
                formData.workspace_name
            );

            // Store auth data (auto-login after signup)
            setToken(response.access_token);
            setUser(response.user);
            if (response.workspaces && response.workspaces.length > 0) {
                setWorkspace(response.workspaces[0]);
            }

            // Redirect to dashboard
            router.push('/user/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 selection:bg-indigo-500/30 font-sans">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-900/15 blur-[100px]" />
            </div>

            <div className="w-full max-w-xl animate-fade-in py-12">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <Link href="/" className="group flex items-center gap-3 mb-6 transition-transform hover:scale-105">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Cpu className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-3xl font-extrabold text-white tracking-tight">Auromind</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2 text-center text-3xl md:text-4xl">Start your free trial</h1>
                    <p className="text-slate-400 text-center">Build your AI workforce in minutes. No credit card required.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Benefits Section */}
                    <div className="hidden md:flex flex-col gap-8 self-center pr-4">
                        <div className="space-y-6">
                            {[
                                { title: "Unified Inbox", desc: "All your customer conversations in one place." },
                                { title: "AI Follow-ups", desc: "Never let a lead go cold again." },
                                { title: "Founder Assistant", desc: "Automate routine tasks and summaries." }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 group-hover:bg-indigo-500/30 transition-colors">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm tracking-wide uppercase">{item.title}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm">
                            <p className="text-sm italic text-slate-400">
                                "Auromind transformed how we handle follow-ups. Our response rate improved by 40% in just two weeks."
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800" />
                                <div>
                                    <p className="text-xs font-bold text-white">Sarah Jenkins</p>
                                    <p className="text-[10px] text-slate-500">Founder, CloudScale</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
                        {/* Inner Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                        placeholder="John Doe"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="you@company.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        placeholder="Min. 8 characters"
                                        minLength={8}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Workspace Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Building size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.workspace_name}
                                        onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })}
                                        required
                                        placeholder="e.g. Acme Corp"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="group w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <span>Create free account</span>
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center space-y-4 text-sm">
                            <p className="text-slate-400">
                                Already have an account?{' '}
                                <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                            <Link href="/" className="inline-block text-slate-500 hover:text-slate-300 transition-colors">
                                &larr; Back to home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
            `}</style>
        </div>
    );
}
