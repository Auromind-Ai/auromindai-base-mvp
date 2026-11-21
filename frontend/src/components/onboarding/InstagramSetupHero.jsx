'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  Check,
  Lock,
  ArrowRight,
  ShieldCheck,
  Instagram,
  Sparkles,
  MessageSquare,
  Bot,
  Brain,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function InstagramSetupHero({
  workspaceId,
  isIgConnected = false,
  igUsername = '',
  onDismiss,
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeStepTab, setActiveStepTab] = useState(1);
  const [connecting, setConnecting] = useState(false);

  const handleConnectInstagram = async () => {
    setConnecting(true);
    try {
      const activeWs = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('workspace_id') : null);
      const res = await api.getInstagramAuthUrl({
        workspace_id: activeWs,
        redirect_uri: `${window.location.origin}/channels?action=instagram-callback`,
      });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        router.push('/channels');
      }
    } catch (err) {
      console.error('Failed to get Instagram auth URL:', err);
      const msg = err?.data?.detail || err?.message || 'Could not initiate Instagram connection. Opening channels page.';
      showToast(msg, 'warning');
      router.push('/channels');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-pink-500/30 shadow-[0_0_50px_-12px_rgba(236,72,153,0.25)] p-5 sm:p-6 md:p-7 overflow-hidden text-white h-full flex flex-col justify-between"
    >
      {/* Top ambient pink/purple halo */}
      <div
        className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-48 bg-pink-500/15 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-6 sm:pb-7">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-pink-500/30 shrink-0">
            <Instagram size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Instagram setup</h2>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Creator Plan
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-white/55 mt-0.5">
              Connect your Instagram Professional account to automate DMs, comments, and story replies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-14 sm:pl-0">
          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <Clock size={14} className="text-white/50" />
            <span>About 2 minutes to get started</span>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close setup view"
              aria-label="Close setup view"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* STEPPER NAVIGATION */}
      <div className="hidden md:flex items-center justify-between mb-7 px-1">
        {/* Step 1 */}
        <div
          onClick={() => setActiveStepTab(1)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            activeStepTab === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              isIgConnected
                ? 'bg-emerald-500 text-white'
                : activeStepTab === 1
                ? 'bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white ring-4 ring-pink-500/30 shadow-md shadow-pink-500/40'
                : 'bg-white/5 border border-white/25 text-white/40'
            }`}
          >
            {isIgConnected ? <Check size={16} strokeWidth={2.6} /> : '1'}
          </div>
          <div>
            <p className={`text-sm font-medium ${isIgConnected || activeStepTab === 1 ? 'text-white' : 'text-white/60'}`}>
              1. Connect Instagram
            </p>
            <p className="text-[12px] text-white/50">
              {isIgConnected ? (igUsername ? `@${igUsername} linked` : 'Account linked') : 'Link Professional account'}
            </p>
          </div>
        </div>

        {/* Stepper Line 1 -> 2 */}
        <div
          className={`h-0.5 flex-1 mx-4 rounded-full transition-all duration-300 ${
            isIgConnected ? 'bg-gradient-to-r from-emerald-500 to-pink-500' : 'bg-white/10'
          }`}
        />

        {/* Step 2 */}
        <div
          onClick={() => setActiveStepTab(2)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            activeStepTab === 2 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              activeStepTab === 2
                ? 'bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white ring-4 ring-pink-500/30 shadow-md shadow-pink-500/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            <Bot size={15} />
          </div>
          <div>
            <p className={`text-sm font-medium ${activeStepTab === 2 ? 'text-white' : 'text-white/60'}`}>
              2. AI Auto-Replies
            </p>
            <p className="text-[12px] text-white/50">
              Set up DM & comment workflows
            </p>
          </div>
        </div>

        {/* Stepper Line 2 -> 3 */}
        <div className="h-0.5 flex-1 mx-4 rounded-full bg-white/10" />

        {/* Step 3 */}
        <div
          onClick={() => setActiveStepTab(3)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            activeStepTab === 3 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              activeStepTab === 3
                ? 'bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white ring-4 ring-pink-500/30 shadow-md shadow-pink-500/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            <Brain size={15} />
          </div>
          <div>
            <p className={`text-sm font-medium ${activeStepTab === 3 ? 'text-white' : 'text-white/60'}`}>
              3. Knowledge Base
            </p>
            <p className="text-[12px] text-white/50">
              Train on your creator docs
            </p>
          </div>
        </div>
      </div>

      {/* STEP CONTENT CONTAINER */}
      <div className="rounded-2xl bg-[#0b0c16]/90 border border-white/[0.07] p-5 sm:p-7 md:p-8 flex-1 flex flex-col justify-center">
        {activeStepTab === 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10 my-auto">
            {/* Visual Icon Box */}
            <div className="relative flex items-center justify-center w-36 h-36 rounded-3xl bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-orange-500/20 border border-pink-500/30 shadow-[0_0_35px_rgba(236,72,153,0.3)]">
              <Instagram size={56} className="text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
              <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold">
                PRO DM
              </div>
            </div>

            {/* Right: Step 1 Actions */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Connect your Instagram Professional account
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Link your Instagram Professional or Creator account to start automating customer DMs, comment replies, and story interactions.
              </p>

              <div className="pt-2 flex flex-col items-center md:items-start gap-3 w-full sm:w-auto">
                {isIgConnected ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-950 to-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold">
                    <Check size={16} /> Instagram Connected: {igUsername ? `@${igUsername}` : 'Active'}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    disabled={connecting}
                    className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 active:scale-[0.98] text-white text-xs sm:text-sm font-medium border border-white/20 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg shadow-pink-900/40 disabled:opacity-50"
                  >
                    {connecting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Instagram size={16} />
                        <span>Connect Instagram</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                )}

                {!isIgConnected && onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-xs sm:text-[13px] text-pink-400 hover:text-white underline underline-offset-4 cursor-pointer transition-colors mt-1"
                  >
                    I&apos;ll do this later
                  </button>
                )}
              </div>

              {/* Security info note */}
              <div className="flex items-center gap-2 pt-3 text-[12px] sm:text-xs text-white/45">
                <ShieldCheck size={15} className="text-white/40 shrink-0" />
                <span>We only request permissions to manage Instagram DMs and replies for your workspace.</span>
              </div>
            </div>
          </div>
        )}

        {activeStepTab === 2 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 my-auto">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-base sm:text-lg font-semibold text-white">Configure AI DM & Comment Workflows</h3>
              <p className="text-xs sm:text-sm text-white/60 max-w-md">
                Create intelligent automated responses that engage followers, answer product questions, and capture leads 24/7.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/ai-agents')}
              className="px-6 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Manage AI Agents</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {activeStepTab === 3 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 my-auto">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-base sm:text-lg font-semibold text-white">Brain Knowledge Base</h3>
              <p className="text-xs sm:text-sm text-white/60 max-w-md">
                Upload your FAQs, pricing sheets, or catalog links so your Instagram bot answers queries accurately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/brain')}
              className="px-6 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Knowledge Base</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}
