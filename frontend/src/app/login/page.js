'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Cpu, Lock } from 'lucide-react';
import { setToken, setUser, setWorkspace } from '@/lib/auth';

export default function LoginPage() {

    const router = useRouter();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();
        setError('');
        setLoading(true);

        try {

            const body = new URLSearchParams();
            body.append("username", formData.email);
            body.append("password", formData.password);

            const response = await fetch("http://localhost:8002/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body
            });

            const data = await response.json();

            console.log("Login API Response:", data);

            if (!response.ok) {
                throw new Error(data.detail || "Login failed");
            }

            setToken(data.access_token);
            setUser(data.user);

            if (data.workspaces && data.workspaces.length > 0) {
                setWorkspace(data.workspaces[0]);
            }

            router.push('/user/admin/dashboard');

        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
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

            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-900/15 blur-[100px]" />
            </div>

            <div className="w-full max-w-md animate-fade-in">

                <div className="flex flex-col items-center mb-8">

                    <Link href="/" className="group flex items-center gap-3 mb-6">

                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Cpu className="text-white" size={24} strokeWidth={2.5} />
                        </div>

                        <span className="text-3xl font-extrabold text-white tracking-tight">
                            Auromind
                        </span>

                    </Link>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        Welcome back
                    </h1>

                    <p className="text-slate-400 text-center">
                        Login to your AI workforce dashboard
                    </p>

                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative">

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

                            <div className="relative">

                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                                    <Mail size={18}/>
                                </div>

                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value
                                        })
                                    }
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white"
                                />

                            </div>

                        </div>

                        <div className="space-y-2">

                            <label className="text-sm font-semibold text-slate-300 ml-1">
                                Password
                            </label>

                            <div className="relative">

                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                                    <Lock size={18}/>
                                </div>

                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value
                                        })
                                    }
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white"
                                />

                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >

                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20}/>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight size={20}/>
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