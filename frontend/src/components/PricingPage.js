'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronsDown, Sparkles, Zap, MessageSquare, TrendingUp, Flame, Crown } from 'lucide-react';
import { buildDynamicCardFeatures } from '@/lib/utils/pricingMapper';

/* ─ Logic ─ */

const PLAN_ORDER = {
  free: 0,
  creator: 1,
  starter: 2,
  growth: 3,
  business: 4,
  enterprise: 5,
  solo: 1,
  pro: 3,
  custom: 5,
  letstalk: 5,
};

const TOKENS_PER_CREDIT = 1000;

/* ─ Animation variants ─ */

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function getPlanIcon(key) {
  const k = (key || '').toLowerCase();
  if (k.includes('free')) {
    return <Sparkles className="w-5 h-5 text-emerald-400" />;
  }
  if (k.includes('creator') || k.includes('solo')) {
    return <Zap className="w-5 h-5 text-purple-400" />;
  }
  if (k.includes('starter')) {
    return <MessageSquare className="w-5 h-5 text-blue-400" />;
  }
  if (k.includes('growth')) {
    return <TrendingUp className="w-5 h-5 text-indigo-400" />;
  }
  if (k.includes('business') || k.includes('pro')) {
    return <Flame className="w-5 h-5 text-fuchsia-400" />;
  }
  return <Crown className="w-5 h-5 text-amber-400" />;
}

/* ─ PricingCard Component ─ */

function PricingCard({ plan, currentPlan, onUpgrade, index, isAnnual }) {
  const isEnterprise =
    plan.key === 'enterprise' ||
    plan.key === 'custom' ||
    plan.key === 'letstalk' ||
    (plan.name || '').toLowerCase().includes('enterprise') ||
    (plan.label || '').toLowerCase().includes('enterprise');

  const isCurrent = currentPlan === plan.key;
  const currentRank = PLAN_ORDER[currentPlan] ?? 0;
  const planRank = PLAN_ORDER[plan.key] ?? 0;
  const shouldShowActionButton = isEnterprise || planRank >= currentRank;

  const scrollContainerRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasOverflow = el.scrollHeight > el.clientHeight;
      const isAtBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 6;
      setCanScrollDown(hasOverflow && !isAtBottom);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [plan.features]);

  const handleScrollDown = (e) => {
    e.stopPropagation();
    const el = scrollContainerRef.current;
    if (!el) return;

    const start = el.scrollTop;
    const distance = 46;
    const duration = 300;
    let startTime = null;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = easeOutCubic(progress);

      el.scrollTop = start + distance * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        checkScroll();
      }
    };

    requestAnimationFrame(step);
  };

  const handleClick = () => {
    if (isCurrent || typeof onUpgrade !== 'function') return;
    onUpgrade(plan.key, isAnnual ? 'yearly' : 'monthly');
  };

  const getCTA = (planKey) => {
    if (isCurrent) return 'Current Plan';
    if (planKey === 'enterprise' || planKey === 'custom' || isEnterprise) return "Let's Talk";
    return `Upgrade to ${plan.name || 'Plan'}`;
  };

  const isFeatured = plan.featured;
  const showPerPeriod =
    !['Free', 'Custom', "Let's Talk", "Let's Start"].includes(plan.price) && !isEnterprise;

  const cardBg = isCurrent
    ? 'border-emerald-500/50 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),rgba(10,10,14,0.96)_70%)] shadow-[0_0_35px_rgba(16,185,129,0.20)] ring-1 ring-emerald-500/30'
    : isFeatured
    ? 'border-purple-500/50 bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.22),rgba(12,10,20,0.96)_70%)] shadow-[0_0_40px_rgba(147,51,234,0.25)] ring-1 ring-purple-500/30'
    : 'border-white/10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_0%,rgba(8,8,12,0.95)_100%)] hover:border-white/20 shadow-xl';

  const buttonClass = isCurrent
    ? 'cursor-not-allowed border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : isEnterprise
    ? 'bg-gradient-to-r from-amber-500/20 to-purple-600/20 hover:from-amber-500/30 hover:to-purple-600/30 border border-amber-500/40 text-amber-200 cursor-pointer active:scale-[0.98]'
    : isFeatured
    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9B5DE5] hover:opacity-95 text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)] cursor-pointer active:scale-[0.98]'
    : 'border border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.16] hover:border-purple-400/50 cursor-pointer active:scale-[0.98]';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-14px)] min-[1520px]:w-[calc(20%-16px)] min-[1520px]:max-w-[325px] p-5 sm:p-6 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between shrink-0 ${cardBg}`}
    >
      {/* Featured glow */}
      {isFeatured && (
        <div className="absolute -top-24 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[#7C3AED]/25 blur-[100px] pointer-events-none" />
      )}

      {/* Badges */}
      {isFeatured && !isCurrent && (
        <div className="absolute top-4 right-4 rounded-full border border-purple-400/50 bg-gradient-to-r from-purple-500/25 to-indigo-500/25 px-2.5 py-0.5 text-[11px] font-bold text-purple-200 shadow-sm flex items-center gap-1">
          <Sparkles size={11} className="text-purple-300" /> Popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-4 right-4 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 shadow-sm flex items-center gap-1">
          <Check size={11} className="text-emerald-400" /> Current Plan
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              {getPlanIcon(plan.key)}
            </div>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {plan.name}
            </span>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline">
            <span className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-white leading-none">
              {plan.price}
            </span>
            {showPerPeriod && (
              <span className="ml-1.5 text-xs sm:text-sm font-medium text-white/50">
                {isAnnual ? '/year' : '/month'}
              </span>
            )}
          </div>
          {plan.subPriceText && (
            <p className="mt-1 text-[11px] font-medium text-purple-300/80 leading-tight">
              {plan.subPriceText}
            </p>
          )}

          {/* Description */}
          <p className="mt-2.5 text-xs leading-relaxed text-white/60 min-h-[34px] line-clamp-2">
            {plan.description}
          </p>

          {/* Action button */}
          {shouldShowActionButton && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleClick}
                disabled={isCurrent}
                className={`relative z-20 w-full h-10 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center ${buttonClass}`}
              >
                {getCTA(plan.key)}
              </button>
            </div>
          )}
        </div>

        {/* What's included Section */}
        <div className="mt-6 pt-4 border-t border-white/10 relative">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
            WHAT&#39;S INCLUDED
          </p>

          {/* Scrollable features container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex flex-col gap-2.5 h-[210px] sm:h-[230px] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(168,85,247,0.3) transparent',
            }}
          >
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-white/80">
                <Check
                  className="h-3.5 w-3.5 text-[#C084FC] flex-shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Floating Line Scroll Down Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#09090d] via-[#09090d]/80 to-transparent flex items-end justify-center pb-0.5 pointer-events-none rounded-b-2xl">
              <motion.button
                type="button"
                onClick={handleScrollDown}
                title="Scroll down for more features"
                animate={{ y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="pointer-events-auto p-1 text-[#C084FC] hover:text-white transition-all cursor-pointer flex items-center justify-center"
              >
                <ChevronsDown size={16} strokeWidth={2.5} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─ Main PricingPage ─ */

export default function PricingPage({
  currentPlan = 'free',
  onUpgrade,
  settings,
  dbPlans = [],
  loading = false,
  error = null,
  onRetry = null,
}) {
  const [isAnnual, setIsAnnual] = useState(false);

  if (loading || (!settings && !error)) {
    return (
      <section className="relative overflow-hidden bg-black py-20 min-h-screen flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.25)_0%,rgba(0,0,0,1)_60%)] px-6 py-16 text-center text-white/60">
            Loading live plans...
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="relative overflow-hidden bg-black py-20 min-h-screen flex items-center justify-center">
        <div className="max-w-xl mx-auto px-6 w-full">
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 px-6 py-12 text-center space-y-4">
            <p className="text-sm text-rose-200">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const plans = Array.isArray(dbPlans)
    ? dbPlans.map((plan) => {
        const key = String(plan.key || plan.name || '').toLowerCase().trim();
        const isPlanEnterprise =
          key === 'enterprise' ||
          key === 'custom' ||
          key === 'letstalk' ||
          (plan.name || '').toLowerCase().includes('enterprise') ||
          (plan.label || '').toLowerCase().includes('enterprise');

        const rawMonthly = Number(plan.monthly_price ?? plan.amount ?? 0);
        const rawYearly = Number(plan.yearly_price ?? rawMonthly * 10 ?? 0);
        const rawPrice = isAnnual ? rawYearly : rawMonthly;

        const displayPrice = isPlanEnterprise
          ? "Let's Talk"
          : key === 'free' || rawPrice === 0
          ? 'Free'
          : `₹${Number(rawPrice).toLocaleString('en-IN')}`;

        const subPriceText =
          !isPlanEnterprise && isAnnual && rawPrice > 0
            ? `(₹${Math.round(rawPrice / 12).toLocaleString('en-IN')}/mo billed annually)`
            : null;

        return {
          key,
          name: plan.display_name || plan.name || plan.label,
          price: displayPrice,
          subPriceText,
          usage: plan.usage || `${Math.round((plan.tokens || plan.token_limit || 1000000) / TOKENS_PER_CREDIT)} credits / month`,
          description: plan.description || '',
          featured: Boolean(plan.featured || plan.is_featured || key === 'business' || key === 'pro'),
          features: buildDynamicCardFeatures(plan),
        };
      })
    : [];

  const visiblePlans = plans.filter((plan) => plan.key !== 'free');

  if (visiblePlans.length === 0) {
    return (
      <section className="relative overflow-hidden bg-black py-20 min-h-screen flex items-center justify-center">
        <div className="max-w-xl mx-auto px-6 w-full">
          <div className="rounded-3xl border border-white/10 bg-[#0b0c14] px-6 py-12 text-center text-sm text-zinc-400">
            No upgradeable plans are currently configured.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-screen bg-[#050507] py-6 sm:py-10 lg:py-12 px-3 sm:px-6 lg:px-8 flex flex-col items-center overflow-y-auto">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-900/15 blur-[150px]" />

      <div className="max-w-[1720px] mx-auto w-full flex flex-col items-center relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
            <Sparkles size={12} className="text-purple-400" /> Plan Subscriptions
          </div>
          <h2 className="font-['Poppins'] text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Simple, Transparent Pricing
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
              For Every Stage of Growth
            </span>
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-white/60 leading-relaxed font-normal">
            Choose the perfect plan for your business and scale your AI-powered sales system with confidence.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 sm:mt-7 flex items-center justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  !isAnnual
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAnnual
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Annual billing</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Save ~5%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Auto-Fit Flex Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-wrap justify-center items-stretch gap-4 sm:gap-5"
        >
          {visiblePlans.map((plan, index) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              index={index}
              currentPlan={currentPlan}
              onUpgrade={onUpgrade}
              isAnnual={isAnnual}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
