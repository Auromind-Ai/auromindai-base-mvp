'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Check,
  Lock,
  Building2,
  ChevronRight,
  Clock,
  AlertCircle,
  ExternalLink,
  Send,
  Bot,
  Settings,
  BarChart,
  ChartNoAxesColumnIncreasing
} from 'lucide-react';


const SETUP_BENEFITS = [
  {
    icon: Send,
    iconSize: 16,
    strokeWidth: 2.2,
    gradient:
      'bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08]',
    border: 'border-white/20',
    shadow: 'shadow-[0_0_12px_rgba(20,184,166,0.18)]',
    line1: 'Send messages',
    line2: 'at scale',
  },
  {
    icon: Bot,
    iconSize: 16,
    strokeWidth: 2.2,
    gradient: 'from-[#2e1768] to-[#160b35]',
    border: 'border-white/20',
    shadow: 'shadow-[0_0_12px_rgba(129,74,200,0.2)]',
    line1: 'Use AI agents',
    line2: '24/7',
  },
  {
    icon: Settings,
    iconSize: 16,
    strokeWidth: 2.2,
    gradient: 'from-[#21166b] to-[#100b35]',
    border: 'border-white/20',
    shadow: 'shadow-[0_0_12px_rgba(99,102,241,0.2)]',
    line1: 'Access advanced',
    line2: 'automations',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    iconSize: 16,
    strokeWidth: 2.2,
    gradient: 'from-[#47105c] to-[#23082f]',
    border: 'border-white/20',
    shadow: 'shadow-[0_0_12px_rgba(217,70,239,0.2)]',
    line1: 'Track performance',
    line2: 'and analytics',
  },
];


export default function WhatsAppSetupChecklist({
  onboardingData,
  onOpenStep1,
  onOpenStep2,
  onOpenStep3,
  isHeroDismissed = false,
  onReopenHero,
}) {
  const isStep1Done = Boolean(onboardingData?.whatsapp_connected);
  const isStep2Done = Boolean(onboardingData?.two_factor_enabled);
  const isStep3Done = onboardingData?.business_verification_status === 'verified';
  const isStep3Pending = onboardingData?.business_verification_status === 'pending';

  const completedCount = onboardingData?.completed_count ?? (
    (isStep1Done ? 1 : 0) + (isStep2Done ? 1 : 0) + (isStep3Done ? 1 : 0)
  );

  const percentage = onboardingData?.progress_percentage ?? Math.round((completedCount / 3) * 100);

  return (
    <motion.aside
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-white/10 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] p-5 sm:p-6 text-white h-full flex flex-col justify-between"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 flex items-center justify-center text-white shrink-0">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-sm sm:text-[15px] font-semibold text-white tracking-tight">
              Finish your WhatsApp setup
            </h3>
          </div>
          <span className="text-xs text-white/60 shrink-0 font-normal">
            {completedCount} of 3 completed
          </span>
        </div>

        <p className="text-[12px] sm:text-xs text-white/60 mt-1 mb-3.5 leading-relaxed">
          Complete the remaining steps to unlock the full power of Orbion Agents.
        </p>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold text-white/80 shrink-0">{percentage}%</span>
        </div>

        {/* 3 Step List Items */}
        <div className="space-y-2.5">
          {/* Item 1: Connect WhatsApp */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
              isStep1Done
                ? 'bg-white/[0.02] border-white/[0.06]'
                : 'bg-white/[0.04] border-[#814AC8]/25 hover:border-[#814AC8]/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isStep1Done
                    ? 'bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 text-white'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {isStep1Done ? <Check size={14} strokeWidth={2.6} /> : '1'}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-[13px] font-medium text-white truncate">Connect WhatsApp</p>
                <p className="text-[11px] text-white/45 truncate">
                  {isStep1Done ? 'WhatsApp Business connected' : 'Link your Meta business account'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isStep1Done ? (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <Check size={12} strokeWidth={2.6} /> Completed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenStep1}
                  className="text-xs font-medium text-[#a77bee] hover:text-[#c4a1ff] flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  Connect <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Item 2: Enable two-factor authentication */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
              isStep2Done
                ? 'bg-white/[0.02] border-white/[0.06]'
                : 'bg-white/[0.03] border-white/[0.07] hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isStep2Done
                    ? 'bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 text-white'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {isStep2Done ? <Check size={14} strokeWidth={2.6} /> : <Lock size={14} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-[13px] font-medium text-white truncate">
                  Enable two-factor authentication
                </p>
                <p className="text-[11px] text-white/45 truncate">
                  {isStep2Done ? 'Two-factor active' : 'Secure your Meta Business Suite'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isStep2Done ? (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <Check size={12} strokeWidth={2.6} /> Completed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={isStep1Done ? onOpenStep2 : undefined}
                  disabled={!isStep1Done}
                  className={`text-xs font-medium flex items-center gap-0.5 transition-colors ${
                    !isStep1Done
                      ? 'text-white/25 cursor-not-allowed opacity-50'
                      : 'text-[#a77bee] hover:text-[#c4a1ff] cursor-pointer'
                  }`}
                  title={!isStep1Done ? 'Complete Step 1 (Connect WhatsApp) first' : undefined}
                >
                  Continue <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Item 3: Complete business verification */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
              isStep3Done
                ? 'bg-white/[0.02] border-white/[0.06]'
                : isStep3Pending
                ? 'bg-amber-500/[0.04] border-amber-500/25'
                : 'bg-white/[0.03] border-white/[0.07] hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isStep3Done
                    ? 'bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 text-white'
                    : isStep3Pending
                    ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {isStep3Done ? (
                  <Check size={14} strokeWidth={2.6} />
                ) : isStep3Pending ? (
                  <Clock size={14} />
                ) : (
                  <Building2 size={14} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-[13px] font-medium text-white truncate">
                  Complete business verification
                </p>
                <p className="text-[11px] text-white/45 truncate">
                  {isStep3Done
                    ? 'Business verified with Meta'
                    : isStep3Pending
                    ? 'Pending Meta review'
                    : 'Verify your business with Meta'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isStep3Done ? (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <Check size={12} strokeWidth={2.6} /> Completed
                </span>
              ) : isStep3Pending ? (
                <button
                  type="button"
                  onClick={onOpenStep3}
                  className="text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  In Review <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isStep2Done ? onOpenStep3 : undefined}
                  disabled={!isStep2Done}
                  className={`text-xs font-medium flex items-center gap-0.5 transition-colors ${
                    !isStep2Done
                      ? 'text-white/25 cursor-not-allowed opacity-50'
                      : 'text-[#a77bee] hover:text-[#c4a1ff] cursor-pointer'
                  }`}
                  title={!isStep2Done ? 'Complete Step 2 (Enable Two-Factor Authentication) first' : undefined}
                >
                  Continue <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Why complete the setup? */}
      <div className="mt-auto pt-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-sm sm:text-base leading-none select-none" role="img" aria-label="rocket">
              🚀
            </span>
            <h4 className="text-xs sm:text-[13px] font-semibold text-white tracking-tight">
              Why complete the setup?
            </h4>
          </div>

          <div
            className={`rounded-2xl bg-white/[0.02] border border-purple-500/20 p-3 sm:p-3.5 grid gap-2.5 sm:gap-3 ${
              isHeroDismissed ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
            }`}
          >
            {SETUP_BENEFITS.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${item.gradient} border ${item.border} ${item.shadow} flex items-center justify-center text-white shrink-0`}
                  >
                    <IconComponent size={item.iconSize} strokeWidth={item.strokeWidth} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-medium text-white/90 leading-tight">
                      {item.line1}
                    </p>
                    <p className="text-[11px] sm:text-xs font-medium text-white/90 leading-tight">
                      {item.line2}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* If the large hero card is dismissed/collapsed and user hasn't finished, show subtle expand link */}
        {isHeroDismissed && !isStep1Done && onReopenHero && (
          <div className="pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40">
            <span>WhatsApp setup pending</span>
            <button
              type="button"
              onClick={onReopenHero}
              className="text-[#a77bee] hover:text-white underline cursor-pointer transition-colors"
            >
              Show full setup guide
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
