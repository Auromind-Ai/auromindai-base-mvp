'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { poppins } from '@/lib/fonts';
import { 
  Instagram, 
  MessageCircle, 
  Globe, 
  Sparkles, 
  Phone, 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  Check 
} from 'lucide-react';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '@/components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import PricingComparisonTable from '@/components/LandingPageNew/PricingSectionNewSection/PricingComparisonTable';
import BrandChannelRow from '@/components/BrandChannelIcons';
import { 
  CORE_ORBION_PLANS,
  CREATOR_PLAN
} from '@/lib/constants/pricingTiers';
import api from '@/lib/api';

/* ─ Plan Card Component Pixel-Matching Image 1 (Spacious, No Squeezing) ─ */
function PlanCard({ plan, billing, gstRate = 18 }) {
  const isBusiness = plan.key === 'business';
  const isEnterprise = plan.key === 'enterprise';
  const isFree = plan.key === 'free';
  const isCreator = plan.key === 'creator';

  const price = billing === 'annual' && plan.priceMonthly > 0
    ? plan.displayPriceYearly
    : plan.displayPrice;

  const gstPrice = billing === 'annual' && plan.priceYearlyGst > 0
    ? `₹${plan.priceYearlyGst.toLocaleString('en-IN')}/mo incl. ${gstRate}% GST`
    : plan.priceMonthlyGst > 0
    ? `₹${plan.priceMonthlyGst.toLocaleString('en-IN')}/mo incl. ${gstRate}% GST`
    : null;

  const billingNote = plan.priceMonthly > 0
    ? (billing === 'annual' ? 'billed annually' : 'billed monthly')
    : (isFree ? 'no credit card required' : 'custom billing & net-30 terms');

  const handleAction = () => {
    if (isEnterprise) {
      window.location.href = 'mailto:sales@orbionagents.com?subject=Enterprise Custom Plan Inquiry';
    } else {
      window.location.href = `/login?redirect=${encodeURIComponent('/user/admin/billing/payment')}`;
    }
  };

  return (
    <div
      className={`relative rounded-3xl p-5 sm:p-6 lg:p-6 xl:p-5 flex flex-col justify-between transition-all duration-300 font-['Poppins',sans-serif] ${
        isBusiness
          ? 'bg-[#0b0c14] border-2 border-purple-500 shadow-[0_0_35px_rgba(139,92,246,0.3)] ring-1 ring-purple-400/50'
          : isCreator
          ? 'bg-[#0b0c14] border-2 border-purple-500/80 shadow-[0_0_30px_rgba(168,85,247,0.25)]'
          : isFree
          ? 'bg-[#0b0c14] border-2 border-emerald-500/40 hover:border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
          : 'bg-[#0b0c14] border border-white/[0.08] hover:border-white/20 shadow-xl'
      }`}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div>
        {/* Plan Badge */}
        {plan.badge && (
          <div className="mb-2">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full inline-block ${
              isBusiness 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                : isFree
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.05] text-zinc-400 border border-white/10'
            }`}>
              {plan.badge}
            </span>
          </div>
        )}

        {/* Plan Title in Purple or Emerald for Free */}
        <h3 className={`text-2xl font-bold tracking-tight ${isFree ? 'text-emerald-400' : 'text-purple-400'}`}>
          {plan.name}
        </h3>

        {/* Subtitle matching Image 1 */}
        <p className="text-xs text-zinc-400 mt-1 min-h-[18px]">
          {plan.subtitle}
        </p>

        {/* Price & GST Note matching Image 1 */}
        <div className="mt-4">
          <div className="flex items-baseline">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {price}
            </span>
            {plan.priceMonthly > 0 && (
              <span className="ml-1 text-xs text-zinc-400 font-normal">
                {plan.period}
              </span>
            )}
            {isFree && (
              <span className="ml-1 text-xs text-emerald-400 font-medium">
                forever
              </span>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 font-normal mt-1 min-h-[16px]">
            {gstPrice || (isFree ? '100% Free · No card needed' : 'custom pricing')}
          </div>

          <div className="text-[11px] text-zinc-500 font-normal">
            {isFree ? 'instant access · never expires' : billingNote}
          </div>
        </div>

        {/* Action Button: Rounded Pill matching Image 1 */}
        <div className="mt-5">
          <button
            onClick={handleAction}
            className={`w-full py-2.5 px-4 sm:px-6 rounded-full font-semibold text-xs sm:text-sm transition-all duration-200 text-center block cursor-pointer ${
              isBusiness || isCreator
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.35)]'
                : isFree
                ? 'border-2 border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'border border-white/20 bg-white/[0.03] hover:bg-white/10 hover:border-white/40 text-white'
            }`}
          >
            {plan.buttonText}
          </button>
        </div>

        {/* Green Setup Box matching Image 1 */}
        <div className="mt-4">
          <div className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-center ${
            isFree
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
          }`}>
            <span className="text-emerald-400 font-bold text-sm leading-none shrink-0">+</span>
            <span>{plan.setupNote || 'Free setup — we build your chatbot flow for you'}</span>
          </div>
        </div>

        {/* Brand Channel Avatars matching Image 1 */}
        <BrandChannelRow plan={plan} />

        {/* Feature Checklist matching Image 1: Purple / Emerald Checkmark */}
        <ul className="mt-4 space-y-2.5">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
              <span className={`${isFree ? 'text-emerald-400' : 'text-purple-400'} font-bold shrink-0 mt-0.5`}>✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'
  const [pricingData, setPricingData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPricing() {
      try {
        const data = await api.getPricing();
        if (isMounted && data) {
          setPricingData(data);
        }
      } catch (err) {
        console.warn('[PRICING] Failed to fetch dynamic pricing, using local fallback:', err);
      }
    }
    loadPricing();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge live database plans with canonical visuals
  const activePlans = (CORE_ORBION_PLANS || []).map((fallbackPlan) => {
    if (!pricingData?.plans || !Array.isArray(pricingData.plans)) {
      return fallbackPlan;
    }

    const dbPlan = pricingData.plans.find(
      (p) => (p.key || p.name || '').toLowerCase() === fallbackPlan.key.toLowerCase()
    );
    if (!dbPlan) return fallbackPlan;

    const isFree = fallbackPlan.key === 'free';
    const isEnterprise = fallbackPlan.key === 'enterprise';

    const monthlyPrice = Number(dbPlan.monthly_price ?? fallbackPlan.priceMonthly ?? 0);
    const yearlyPrice = Number(dbPlan.yearly_price ?? fallbackPlan.priceYearly ?? 0);
    const yearlyPerMonth = yearlyPrice > 0 ? Math.round(yearlyPrice / 12) : Math.round(monthlyPrice * 0.95);

    const displayPrice = isFree
      ? '₹0'
      : isEnterprise || monthlyPrice <= 0
      ? 'Custom'
      : `₹${monthlyPrice.toLocaleString('en-IN')}`;

    const displayPriceYearly = isFree
      ? '₹0'
      : isEnterprise || yearlyPrice <= 0
      ? 'Custom'
      : `₹${yearlyPerMonth.toLocaleString('en-IN')}`;

    const features = Array.isArray(dbPlan.features) && dbPlan.features.length > 0
      ? dbPlan.features
      : fallbackPlan.features;

    const channels = dbPlan.feature_flags?.allowed_channels || fallbackPlan.channels;

    return {
      ...fallbackPlan,
      name: dbPlan.display_name || fallbackPlan.name,
      subtitle: dbPlan.description || fallbackPlan.subtitle,
      description: dbPlan.description || fallbackPlan.description,
      priceMonthly: monthlyPrice,
      priceYearly: yearlyPrice,
      priceMonthlyGst: monthlyPrice,
      priceYearlyGst: yearlyPerMonth,
      displayPrice,
      displayPriceYearly,
      features,
      channels,
      badge: dbPlan.is_featured ? '★ Most Popular' : fallbackPlan.badge,
    };
  });

  const gstRate = pricingData?.gst_rate ?? 18;

  return (
    <div className={`min-h-screen bg-black text-white ${poppins.className} selection:bg-purple-600/30 selection:text-purple-200`}>
      <NavigationSection />

      {/* Main Container */}
      <main className="relative pt-28 sm:pt-32 pb-24 overflow-x-hidden w-full max-w-[100vw] min-w-0">
        <ModernSaaSBackground />

        <div className="relative z-10 max-w-7xl mx-auto w-full min-w-0 px-3.5 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12 px-4">
            <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs text-purple-200 mb-3 sm:mb-5 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              <span className="uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[10px] sm:text-[11px] font-semibold text-purple-200">
                ORBION AGENTS PLATFORM PRICING
              </span>
            </div>

            <h1 className="text-[22px] xs:text-2xl sm:text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-tight sm:leading-[1.16] text-balance break-words">
              Simple, Transparent Pricing{' '}
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
                For Every Stage of Growth.
              </span>
            </h1>

            <p className="mt-3 sm:mt-4 text-xs sm:text-base md:text-lg text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed text-balance px-2">
              Official Meta Cloud API partner. Choose between our dedicated Instagram Creator plan or scalable WhatsApp &amp; Omnichannel workforce teams.
            </p>
          </div>

          {/* Clean, Beautiful Monthly / Annual Toggler with Balanced Symmetry & Floating Savings Badge */}
          <div className="flex flex-col items-center justify-center mb-10 sm:mb-12 px-2 gap-3.5">
            <div className="relative inline-flex items-center p-1 sm:p-1.5 rounded-full bg-[#0d0e17] border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/5">
              {/* Monthly Button */}
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-4 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_22px_rgba(147,51,234,0.45)] ring-1 ring-purple-400/50'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Monthly billing
              </button>

              {/* Annual Button with Floating Save 5% Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative z-10 px-4 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_22px_rgba(147,51,234,0.45)] ring-1 ring-purple-400/50'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  Annual billing
                </button>

                {/* Floating Modern Pill Badge */}
                <span className="absolute -top-3.5 -right-2 z-20 pointer-events-none select-none inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_0_14px_rgba(236,72,153,0.55)] border border-white/30">
                  Save 5%
                </span>
              </div>
            </div>

            {/* GST Notice Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs font-medium shadow-[0_0_12px_rgba(168,85,247,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All plans include {gstRate}% GST</span>
            </div>
          </div>

          {/* ─ UNIFIED CORE PLANS SECTION ─ */}
          <div className="mb-14 sm:mb-20">
            {/* Free Sandbox Feature Highlight Banner */}
            <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0b0c14] to-purple-950/20 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 w-full">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 bg-black flex items-center justify-center">
                  <Image 
                    src="/icons/free_sandbox_icon.jpg" 
                    alt="Free Sandbox Icon" 
                    width={48} 
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-bold text-white tracking-tight">Free Forever Plan &amp; Evaluation Sandbox</h4>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      ₹0 Forever · No Card Required
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 max-w-2xl break-words leading-relaxed">
                    Test official WhatsApp AI agents safely without risking phone number bans · 1 User seat · 50 Free AI test credits · 50 Contact leads · Instant access
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white font-semibold text-xs tracking-wide transition-all text-center shadow-sm cursor-pointer"
                >
                  Start Free Forever →
                </button>
              </div>
            </div>

            {/* 6 Core Platform Plans Grid: Free Forever, Starter, Growth, Business, Creator, Enterprise */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {activePlans.map((plan) => (
                <PlanCard key={plan.key} plan={plan} billing={billingCycle} gstRate={gstRate} />
              ))}
            </div>
          </div>

          {/* ─ 3. FEATURE MATRIX COMPARISON TABLE (Matching Image 2) ─ */}
          <PricingComparisonTable billing={billingCycle} dbPlans={pricingData?.plans} />

        </div>
      </main>

      <FooterSection />
    </div>
  );
}
