'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      router.replace('/login?error=Invalid+callback+parameters');
      return;
    }

    // Redirect to the backend proxy endpoint on the same frontend domain.
    // This ensures cookies are written correctly for the frontend Dev Tunnel domain.
    window.location.href = `/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 overflow-hidden relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex flex-col items-center max-w-md w-full text-center space-y-8"
      >
        {/* Animated Brand Header */}
        <div className="flex items-center space-x-2 text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <span>Auromind AI</span>
        </div>

        {/* Visual Loading Centerpiece */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-transparent"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 shadow-xl"
          >
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </motion.div>
        </div>

        {/* Status Texts */}
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-200">
            Completing Google Authentication
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Verifying secure credentials and setting up your workspace environment.
          </p>
        </div>

        {/* Spinner */}
        <div className="flex items-center justify-center space-x-2 text-sm text-indigo-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Securing session...</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
