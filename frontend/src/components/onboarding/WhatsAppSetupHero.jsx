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
  X,
} from 'lucide-react';
import WhatsApp3DIllustration from './WhatsApp3DIllustration';

const FaWhatsapp = ({ size = 24, className = "text-white" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8.01 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 13.98C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.12 10.45C10.25 10.31 10.29 10.2 10.37 10.05C10.45 9.9 10.41 9.77 10.35 9.66C10.29 9.54 9.82 8.37 9.62 7.89C9.42 7.41 9.23 7.48 9.09 7.47C8.95 7.47 8.79 7.33 8.53 7.33Z" />
  </svg>
);

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
  const [activeStepTab, setActiveStepTab] = useState(null);

  const isStep1Done = Boolean(onboardingData?.whatsapp_connected);
  const isStep2Done = Boolean(onboardingData?.two_factor_enabled);
  const isStep3Done = onboardingData?.business_verification_status === 'verified';

  const businessId =
    onboardingData?.meta_business_id ||
    onboardingData?.steps?.step_1?.business_id ||
    onboardingData?.steps?.step_2?.business_id ||
    onboardingData?.steps?.step_3?.business_id ||
    (typeof window !== 'undefined' ? localStorage.getItem('whatsapp_business_id') : '');

  const twoFactorUrl =
    onboardingData?.two_factor_url ||
    onboardingData?.steps?.step_2?.meta_url ||
    (businessId
      ? `https://business.facebook.com/latest/settings/business_info?business_id=${businessId}`
      : 'https://business.facebook.com/latest/settings/business_info');

  const verificationUrl =
    onboardingData?.verification_url ||
    onboardingData?.steps?.step_3?.meta_url ||
    (businessId
      ? `https://business.facebook.com/latest/settings/security_center?business_id=${businessId}`
      : 'https://business.facebook.com/latest/settings/security_center');

  const handleConfigure2FA = () => {
    if (typeof window !== 'undefined') {
      window.open(twoFactorUrl, '_blank', 'noopener,noreferrer');
    }
    if (onOpenStep2) onOpenStep2();
  };

  const handleStartVerification = () => {
    if (typeof window !== 'undefined') {
      window.open(verificationUrl, '_blank', 'noopener,noreferrer');
    }
    if (onOpenStep3) onOpenStep3();
  };

  // Determine which step tab to view if not clicked
  const effectiveActiveStep = isStep1Done ? (isStep2Done ? 3 : 2) : 1;
  const currentTab = activeStepTab ?? effectiveActiveStep;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-[#814AC8]/35 shadow-[0_0_50px_-12px_rgba(129,74,200,0.28)] p-5 sm:p-6 md:p-7 overflow-hidden text-white h-full flex flex-col justify-between"
    >
      {/* Top ambient violet halo */}
      <div
        className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-48 bg-[#814AC8]/15 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-6 sm:pb-7">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#25D366] to-[#128C7E] flex items-center justify-center text-white shadow-lg shadow-[#25D366]/30 shrink-0">
            <FaWhatsapp size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">WhatsApp setup</h2>
            <p className="text-xs sm:text-[13px] text-white/55 mt-0.5">
              Complete these 3 steps to start using Orbion Agents with WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-14 sm:pl-0">
          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <Clock size={14} className="text-white/50" />
            <span>About 5 minutes to get started</span>
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
                ? 'bg-[#10b981] text-white'
                : currentTab === 1
                ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/25 text-white/40'
            }`}
          >
            {isStep1Done ? <Check size={16} strokeWidth={2.6} /> : '1'}
          </div>
          <div>
            <p className={`text-sm font-medium ${isStep1Done ? 'text-white' : currentTab === 1 ? 'text-white' : 'text-white/60'}`}>
              1. Connect WhatsApp
            </p>
            <p className="text-[12px] text-white/50">
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
                ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            {isStep2Done ? <Check size={16} strokeWidth={2.6} /> : <Lock size={15} />}
          </div>
          <div>
            <p className={`text-sm font-medium ${isStep2Done ? 'text-white' : currentTab === 2 ? 'text-white' : 'text-white/60'}`}>
              2. Secure Business Suite
            </p>
            <p className="text-[12px] text-white/50">
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
                ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white ring-4 ring-[#814AC8]/30 shadow-md shadow-[#814AC8]/40'
                : 'bg-white/5 border border-white/15 text-white/40'
            }`}
          >
            {isStep3Done ? <Check size={16} strokeWidth={2.6} /> : <Building2 size={15} />}
          </div>
          <div>
            <p className={`text-sm font-medium ${isStep3Done ? 'text-white' : currentTab === 3 ? 'text-white' : 'text-white/60'}`}>
              3. Verify your business
            </p>
            <p className="text-[12px] text-white/50">
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
      <div className="rounded-2xl bg-[#0b0c16]/90 border border-white/[0.07] p-5 sm:p-7 md:p-8 flex-1 flex flex-col justify-center">
        {currentTab === 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10 my-auto">
            {/* Left: 3D Illustration */}
            <WhatsApp3DIllustration />

            {/* Right: Step 1 Actions */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Connect your WhatsApp Business account
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Link your Meta business and start managing customer conversations from Orbion Agents.
              </p>

              <div className="pt-2 flex flex-col items-center md:items-start gap-3 w-full sm:w-auto">
                {isStep1Done ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 text-white text-xs sm:text-sm font-semibold">
                    <Check size={16} /> WhatsApp Connected: {onboardingData?.meta_display_phone || 'Active'}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectWhatsApp}
                    disabled={isConnectingWhatsApp}                
                    className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 hover:from-[#814AC8]/60 hover:to-[#221253]/60 active:scale-[0.98] text-white text-xs sm:text-sm font-medium border border-white/20 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
              <div className="flex items-center gap-2 pt-3 text-[12px] sm:text-xs text-white/45">
                <ShieldCheck size={15} className="text-white/40 shrink-0" />
                <span>Your data is secure. We only access the necessary permissions to enable messaging for your workspace.</span>
              </div>
            </div>
          </div>
        )}

        {currentTab === 2 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 my-auto">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 border border-white/20 text-white text-xs font-medium mb-1">
                <Lock size={12} /> Step 2: Meta Business Security
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Enable Two-Factor Authentication
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Secure your Meta Business Suite by requiring two-factor authentication for everyone on your business account.
              </p>
              {!isStep1Done && (
                <p className="text-[11px] sm:text-xs text-amber-400/90 flex items-center gap-1.5 justify-center md:justify-start pt-1">
                  <Lock size={12} className="shrink-0" />
                  <span>Please complete Step 1 (Connect WhatsApp) first to configure 2FA.</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={!isStep1Done}
                onClick={!isStep1Done ? undefined : (isStep2Done ? onOpenStep2 : handleConfigure2FA)}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                  !isStep1Done
                    ? 'bg-white/5 border border-white/10 text-white/35 cursor-not-allowed opacity-50 shadow-none'
                    : 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 hover:from-[#814AC8]/60 hover:to-[#221253]/60 text-white shadow-lg shadow-[#814AC8]/30 cursor-pointer active:scale-[0.98]'
                }`}
                title={!isStep1Done ? 'Complete Step 1 (Connect WhatsApp) first' : undefined}
              >
                <span>{isStep2Done ? 'View Security Status' : 'Configure 2FA'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {currentTab === 3 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 my-auto">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#814AC8]/20 border border-white/20 text-white text-xs font-medium mb-1">
                <Building2 size={12} /> Step 3: Business Verification
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Complete Meta Business Verification
              </h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-lg">
                Submit official registration documents to Meta to elevate messaging limits and secure your verified status.
              </p>
              {!isStep2Done && (
                <p className="text-[11px] sm:text-xs text-amber-400/90 flex items-center gap-1.5 justify-center md:justify-start pt-1">
                  <Lock size={12} className="shrink-0" />
                  <span>Please complete Step 2 (Enable Two-Factor Authentication) first to start verification.</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={!isStep2Done}
                onClick={!isStep2Done ? undefined : (isStep3Done ? onOpenStep3 : handleStartVerification)}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
                  !isStep2Done
                    ? 'bg-white/5 border border-white/10 text-white/35 cursor-not-allowed opacity-50 shadow-none'
                    : 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 hover:from-[#814AC8]/60 hover:to-[#221253]/60 text-white shadow-lg shadow-[#814AC8]/30 cursor-pointer active:scale-[0.98]'
                }`}
                title={!isStep2Done ? 'Complete Step 2 (Enable Two-Factor Authentication) first' : undefined}
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
