'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Check,
  Lock,
  Building2,
  ArrowRight,
  ShieldCheck,
  Bot,
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import WhatsApp3DIllustration from './WhatsApp3DIllustration';

const WhatsAppWhiteIcon = ({ className = "w-4 h-4 text-white" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

export default function WhatsAppSetupHero({
  onboardingData,
  onConnectWhatsApp,
  isConnectingWhatsApp,
  onDismiss,
  onOpenStep2,
  onOpenStep3,
}) {
  const [activeStepTab, setActiveStepTab] = useState(1);

  const isStep1Done = Boolean(onboardingData?.whatsapp_connected);
  const isStep2Done = Boolean(onboardingData?.two_factor_enabled);
  const isStep3Done = onboardingData?.business_verification_status === 'verified';

  // Determine which step tab to view if not clicked
  const effectiveActiveStep = isStep1Done ? (isStep2Done ? 3 : 2) : 1;
  const currentTab = activeStepTab || effectiveActiveStep;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-[#814AC8]/35 shadow-[0_0_50px_-12px_rgba(129,74,200,0.28)] p-5 sm:p-6 md:p-7 overflow-hidden text-white"
    >
      {/* Top ambient violet halo */}
      <div
        className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-48 bg-[#814AC8]/15 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-6 sm:pb-7">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#814AC8] flex items-center justify-center text-white shadow-lg shadow-[#814AC8]/35 shrink-0">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">WhatsApp setup</h2>
            <p className="text-xs sm:text-[13px] text-white/55 mt-0.5">
              Complete these 3 steps to start using Orbion Agents with WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/45 shrink-0 pl-14 sm:pl-0">
          <Clock size={14} className="text-white/40" />
          <span>About 5 minutes to get started</span>
        </div>
      </div>

      {/* STEPPER NAVIGATION */}
      {/* Desktop / Tablet Stepper (Horizontal) */}
      <div className="hidden md:flex items-center justify-between mb-7 px-1">
        {/* Step 1 */}
        <div
          onClick={() => setActiveStepTab(1)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            currentTab === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              isStep1Done
                ? 'bg-[#10b981] text-white shadow-md shadow-[#10b981]/30'
                : currentTab === 1
                ? 'bg-[#814AC8] text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            {isStep1Done ? <Check size={16} strokeWidth={2.6} /> : '1'}
          </div>
          <div>
            <p className={`text-xs font-semibold ${isStep1Done ? 'text-white' : currentTab === 1 ? 'text-white' : 'text-white/60'}`}>
              1. Connect WhatsApp
            </p>
            <p className="text-[11px] text-white/45">
              {isStep1Done ? 'Meta business account linked' : 'Link your Meta business account'}
            </p>
          </div>
        </div>

        {/* Stepper Line 1 -> 2 */}
        <div
          className={`h-0.5 flex-1 mx-4 rounded-full transition-all duration-300 ${
            isStep1Done
              ? 'bg-gradient-to-r from-[#10b981] to-[#814AC8]'
              : 'bg-white/10'
          }`}
        />

        {/* Step 2 */}
        <div
          onClick={() => setActiveStepTab(2)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            currentTab === 2 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              isStep2Done
                ? 'bg-[#10b981] text-white shadow-md shadow-[#10b981]/30'
                : currentTab === 2
                ? 'bg-[#814AC8] text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            {isStep2Done ? <Check size={16} strokeWidth={2.6} /> : <Lock size={15} />}
          </div>
          <div>
            <p className={`text-xs font-semibold ${isStep2Done ? 'text-white' : currentTab === 2 ? 'text-white' : 'text-white/60'}`}>
              2. Secure Business Suite
            </p>
            <p className="text-[11px] text-white/45">
              {isStep2Done ? 'Two-factor enabled' : 'Enable two-factor authentication'}
            </p>
          </div>
        </div>

        {/* Stepper Line 2 -> 3 */}
        <div
          className={`h-0.5 flex-1 mx-4 rounded-full transition-all duration-300 ${
            isStep2Done
              ? 'bg-gradient-to-r from-[#10b981] to-[#814AC8]'
              : 'bg-white/10'
          }`}
        />

        {/* Step 3 */}
        <div
          onClick={() => setActiveStepTab(3)}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            currentTab === 3 ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              isStep3Done
                ? 'bg-[#10b981] text-white shadow-md shadow-[#10b981]/30'
                : currentTab === 3
                ? 'bg-[#814AC8] text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            {isStep3Done ? <Check size={16} strokeWidth={2.6} /> : <Building2 size={15} />}
          </div>
          <div>
            <p className={`text-xs font-semibold ${isStep3Done ? 'text-white' : currentTab === 3 ? 'text-white' : 'text-white/60'}`}>
              3. Verify your business
            </p>
            <p className="text-[11px] text-white/45">
              {isStep3Done ? 'Business verified' : 'Complete Meta business verification'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Stepper (Vertical summary pills) */}
      <div className="md:hidden flex items-center justify-between gap-1.5 mb-5 p-1 bg-white/[0.03] border border-white/[0.07] rounded-xl text-xs">
        <button
          type="button"
          onClick={() => setActiveStepTab(1)}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all ${
            currentTab === 1 ? 'bg-[#814AC8] text-white shadow-sm' : 'text-white/50'
          }`}
        >
          {isStep1Done ? <Check size={13} className="text-emerald-400" /> : '1.'} WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setActiveStepTab(2)}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all ${
            currentTab === 2 ? 'bg-[#814AC8] text-white shadow-sm' : 'text-white/50'
          }`}
        >
          {isStep2Done ? <Check size={13} className="text-emerald-400" /> : <Lock size={12} />} 2FA
        </button>
        <button
          type="button"
          onClick={() => setActiveStepTab(3)}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all ${
            currentTab === 3 ? 'bg-[#814AC8] text-white shadow-sm' : 'text-white/50'
          }`}
        >
          {isStep3Done ? <Check size={13} className="text-emerald-400" /> : <Building2 size={12} />} Verify
        </button>
      </div>

      {/* STEP CONTENT CONTAINER */}
      <div className="rounded-2xl bg-[#0b0c16]/90 border border-white/[0.07] p-5 sm:p-7 md:p-8">
        {currentTab === 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10">
            {/* Left: 3D Illustration */}
            <WhatsApp3DIllustration />

            {/* Right: Step 1 Actions */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Connect your WhatsApp Business account
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Link your Meta business and start managing customer conversations from Orbion Agents.
              </p>

              <div className="pt-2 flex flex-col items-center md:items-start gap-3 w-full sm:w-auto">
                {isStep1Done ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold">
                    <Check size={16} /> WhatsApp Connected: {onboardingData?.meta_display_phone || 'Active'}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectWhatsApp}
                    disabled={isConnectingWhatsApp}
                    className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#814AC8] hover:bg-[#703bb5] active:scale-[0.98] text-white text-xs sm:text-sm font-medium shadow-lg shadow-[#814AC8]/35 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnectingWhatsApp ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting to Meta...
                      </>
                    ) : (
                      <>
                        <WhatsAppWhiteIcon className="w-4 h-4 text-white" />
                        <span>Connect WhatsApp</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                )}

                {!isStep1Done && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-xs sm:text-[13px] text-[#a77bee] hover:text-white underline underline-offset-4 cursor-pointer transition-colors mt-1"
                  >
                    I&apos;ll do this later
                  </button>
                )}
              </div>

              {/* Security info note */}
              <div className="flex items-center gap-2 pt-3 text-[11px] sm:text-xs text-white/45">
                <ShieldCheck size={15} className="text-white/40 shrink-0" />
                <span>Your data is secure. We only access the necessary permissions to enable messaging for your workspace.</span>
              </div>
            </div>
          </div>
        )}

        {currentTab === 2 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#814AC8]/20 border border-[#814AC8]/40 text-[#a77bee] text-xs font-medium mb-1">
                <Lock size={12} /> Step 2: Meta Business Security
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Enable Two-Factor Authentication
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Secure your Meta Business Suite by requiring two-factor authentication for everyone on your business account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenStep2}
                className="px-6 py-2.5 rounded-full bg-[#814AC8] hover:bg-[#703bb5] text-white text-xs sm:text-sm font-medium shadow-lg shadow-[#814AC8]/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{isStep2Done ? 'View Security Status' : 'Configure 2FA'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {currentTab === 3 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#814AC8]/20 border border-[#814AC8]/40 text-[#a77bee] text-xs font-medium mb-1">
                <Building2 size={12} /> Step 3: Business Verification
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Complete Meta Business Verification
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Submit official registration documents to Meta to elevate messaging limits and secure your verified status.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenStep3}
                className="px-6 py-2.5 rounded-full bg-[#814AC8] hover:bg-[#703bb5] text-white text-xs sm:text-sm font-medium shadow-lg shadow-[#814AC8]/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{isStep3Done ? 'View Verification Status' : 'Start Verification'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
