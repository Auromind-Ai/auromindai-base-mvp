'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function PlanLockedOnboardingHero({
  planName = 'free',
  onDismiss,
}) {
  const router = useRouter();

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-purple-500/30 shadow-[0_0_50px_-12px_rgba(129,74,200,0.25)] p-5 sm:p-6 md:p-7 overflow-hidden text-white h-full flex flex-col justify-between"
    >
      {/* Ambient purple halo */}
      <div
        className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-48 bg-purple-600/15 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600/40 to-violet-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-900/30 shrink-0">
            <Lock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Messaging Channels Locked
              </h2>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {planName} Plan
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-white/55 mt-0.5">
              Your current plan does not include live messaging channels (WhatsApp, Instagram, or Twilio).
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer self-start sm:self-auto"
            title="Dismiss view"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* BODY CONTENT */}
      <div className="rounded-2xl bg-[#0b0c16]/90 border border-white/[0.07] p-6 sm:p-7 my-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
              Upgrade your plan to connect customer channels
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xl">
              To connect your WhatsApp Business account or Instagram and deploy 24/7 autonomous AI agents, choose a plan with live channel entitlements.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/billing/payment')}
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold border border-purple-500/40 flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-purple-900/40 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Upgrade Plan to Connect Channels</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="text-xs sm:text-[13px] text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
              >
                Compare all plans
              </button>
            </div>
          </div>

          {/* Quick Plan Summary Box */}
          <div className="w-full md:w-64 p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-2.5 shrink-0">
            <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block">
              Available Plans:
            </span>
            <div className="space-y-1.5 text-zinc-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Starter (₹1,299/mo)</span>
                <span className="text-emerald-400 font-medium">WhatsApp</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Creator (₹999/mo)</span>
                <span className="text-pink-400 font-medium">Instagram</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Growth (₹2,499/mo)</span>
                <span className="text-purple-300 font-medium">Omnichannel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="flex items-center gap-2 pt-4 text-[12px] text-white/45">
        <ShieldCheck size={15} className="text-white/40 shrink-0" />
        <span>Plan upgrades take effect immediately with full prorated billing and instant channel activation.</span>
      </div>
    </motion.section>
  );
}
