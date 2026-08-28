'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronsDown } from 'lucide-react';

/* ─ Logic ─ */

const PLAN_ORDER = {
  free: 0,
  solo: 1,
  pro: 2,
  enterprise: 3,
  custom: 3,
  letstalk: 3,
};

const TOKENS_PER_CREDIT = 1000;

/* ─ Animation variants ─ */

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden:  { opacity: 0, y: 35 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─ PricingCard with Grand Spacing, Gradient Fade & Smooth Line Scroll ─ */

function PricingCard({ plan, currentPlan, onUpgrade, index, isAnnual }) {
  const isEnterprise = plan.key === 'enterprise' || plan.key === 'custom' || plan.key === 'letstalk' || (plan.name || '').toLowerCase().includes('enterprise') || (plan.label || '').toLowerCase().includes('enterprise');
  const isCurrent    = currentPlan === plan.key;

  const currentRank            = PLAN_ORDER[currentPlan] ?? 0;
  const planRank              = PLAN_ORDER[plan.key]    ?? 0;
  const shouldShowActionButton = isEnterprise || planRank >= currentRank;

  const scrollContainerRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check whether content overflows and can be scrolled
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

  // Smooth Line-by-Line Scroll
  const handleScrollDown = (e) => {
    e.stopPropagation();
    const el = scrollContainerRef.current;
    if (!el) return;

    const start = el.scrollTop;
    const distance = 42;
    const duration = 400;
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
    if (currentPlan === planKey) return 'Current Plan';
    if (planKey === 'solo')      return 'Upgrade to Solo Smart';
    if (planKey === 'pro')        return 'Upgrade to Pro';
    if (planKey === 'enterprise' || planKey === 'custom' || isEnterprise) return "Let's Talk";
    return 'Choose this plan';
  };

  const isFeatured = plan.featured;
  const showPerPeriod = !['Free', 'Custom', "Let's Talk", "Let's Start"].includes(plan.price) && !isEnterprise;

  const cardBg = isCurrent
    ? 'border-[#814AC8]/60 bg-[radial-gradient(circle_at_top,rgba(129,74,200,0.25),rgba(10,10,12,1)_70%)] shadow-[0_0_50px_rgba(129,74,200,0.30)] ring-1 ring-[#814AC8]/40'
    : isFeatured
    ? 'border-[#7C3AED]/40 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.25),rgba(10,10,12,1)_70%)] shadow-[0_0_50px_rgba(124,58,237,0.22)]'
    : 'border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.25)_0%,rgba(6,6,8,1)_65%)] shadow-xl';

  const buttonClass = isCurrent
    ? 'cursor-not-allowed border border-[#814AC8]/30 bg-[#814AC8]/10 text-[#C4A0F0]'
    : isEnterprise
    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9B5DE5] text-white hover:opacity-95 shadow-[0_10px_25px_rgba(124,58,237,0.35)] cursor-pointer'
    : isFeatured
    ? 'bg-[#814AC8] text-white hover:bg-[#9B5DE5] shadow-[0_15px_35px_rgba(129,74,200,0.4)] cursor-pointer'
    : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black cursor-pointer';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className={`relative overflow-hidden rounded-[32px] border w-full sm:w-[350px] lg:w-[360px] xl:w-[380px] p-7 md:p-8 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between shrink-0 ${cardBg}`}
    >
      {/* Featured glow */}
      {isFeatured && (
        <div className="absolute -top-24 left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[#7C3AED]/25 blur-[120px] pointer-events-none" />
      )}

      {/* Badges */}
      {isFeatured && !isCurrent && (
        <div className="absolute top-5 right-5 rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/15 px-3 py-1 text-xs font-semibold text-purple-200 shadow-sm">
          Popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-5 right-5 rounded-lg border border-[#814AC8]/40 bg-[#814AC8]/15 px-3.5 py-1 text-xs font-semibold text-[#D8B4FE] shadow-sm">
          Current Plan
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{plan.icon}</span>
            <span className="text-2xl font-semibold text-white tracking-tight">
              {plan.name}
            </span>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
              {plan.price}
            </span>
            {showPerPeriod && (
              <span className="ml-1.5 text-sm md:text-base font-normal text-white/60">
                {isAnnual ? '/year' : '/month'}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mt-3.5 text-[13px] md:text-sm leading-relaxed text-white/70 min-h-[44px]">
            {plan.description}
          </p>

          {/* Action button */}
          {shouldShowActionButton && (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleClick}
                disabled={isCurrent}
                className={`relative z-20 w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center ${buttonClass}`}
              >
                {getCTA(plan.key)}
              </button>
            </div>
          )}
        </div>

        {/* What's included Section */}
        <div className="mt-8 pt-5 border-t border-white/10 relative">
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3.5">
            What&#39;s included
          </p>

          {/* Hidden Scrollbar Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex flex-col gap-2.5 h-[240px] md:h-[260px] overflow-y-auto pb-10 pr-1.5"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check
                  className="h-4 w-4 text-[#C084FC] flex-shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <span className="text-[13px] md:text-[14px] text-white/90 leading-snug">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Floating Double Down Arrow Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent flex items-end justify-center pb-1 pointer-events-none rounded-b-[24px]">
              <motion.button
                type="button"
                onClick={handleScrollDown}
                title="Scroll down for more features"
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="pointer-events-auto p-1.5 text-[#C084FC] hover:text-white hover:scale-115 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                <ChevronsDown size={18} strokeWidth={2.5} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─ Main PricingPage ─ */

export default function PricingPage({ currentPlan = 'free', onUpgrade, settings, dbPlans = [] }) {
  const [isAnnual] = useState(false);

  if (!settings) {
    return (
      <section className="relative overflow-hidden bg-black py-24 md:py-32 min-h-screen flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.30)_0%,rgba(0,0,0,1)_60%)] px-6 py-16 text-center text-white/60">
            Loading...
          </div>
        </div>
      </section>
    );
  }

  const iconMap = {
    free: '🚀',
    solo: '⚡',
    pro: '🔥',
    enterprise: '👑',
    custom: '👑',
    letstalk: '👑',
  };

  const plans = dbPlans && dbPlans.length > 0
    ? dbPlans.map(plan => {
        const isPlanEnterprise = plan.key === 'enterprise' || plan.key === 'custom' || plan.key === 'letstalk' || (plan.name || '').toLowerCase().includes('enterprise') || (plan.label || '').toLowerCase().includes('enterprise');
        const rawPrice = isAnnual ? (plan.yearly_price ?? plan.amount * 10) : (plan.monthly_price ?? plan.amount);
        const displayPrice = (plan.key === 'free' || rawPrice === 0)
          ? 'Free'
          : (isPlanEnterprise || rawPrice === 0)
          ? "Let's Talk"
          : `₹${Number(rawPrice).toLocaleString('en-IN')}`;

        return {
          key:         plan.key,
          icon:        iconMap[plan.key] || (isPlanEnterprise ? '👑' : '🚀'),
          name:        plan.name || plan.label,
          price:       displayPrice,
          usage:       `${Math.round((plan.tokens || 1000000) / TOKENS_PER_CREDIT)} credits / month`,
          description: plan.description,
          featured:    plan.featured || plan.is_featured || plan.key === 'pro',
          features:    plan.features || [],
        };
      })
    : [
    {
      key:        'free',
      icon:       '🚀',
      name:       settings.free_plan_name  || 'Free',
      price:      settings.free_plan_price === 0 ? 'Free' : `₹${settings.free_plan_price}`,
      usage:      `${Math.round((settings.token_limit_per_plan?.free || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description: settings.free_plan_desc  || 'Try Auromind for free and see the ROI yourself.',
      features:    settings.free_plan_features || [
        `${Math.round((settings.token_limit_per_plan?.free || 0) / TOKENS_PER_CREDIT)} monthly AI credits`,
        'Core workspace access',
        'Basic automations',
        'Community support',
      ],
    },
    {
      key:        'solo',
      icon:       '⚡',
      name:       settings.solo_plan_name  || 'Solo Smart',
      price: isAnnual
        ? `₹${Number(settings.solo_yearly_plan_price || 9990).toLocaleString('en-IN')}`
        : `₹${Number(settings.solo_plan_price || 999).toLocaleString('en-IN')}`,
      usage:      `${Math.round((settings.token_limit_per_plan?.solo || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description: settings.solo_plan_desc  || 'RAG & custom knowledge base on a budget for solopreneurs.',
      features:    settings.solo_plan_features || [
        `${Math.round((settings.token_limit_per_plan?.solo || 0) / TOKENS_PER_CREDIT)} monthly AI credits`,
        'RAG Knowledge Base (10 files)',
        '1 Gmail account integration',
        'Up to 500 leads database',
      ],
    },
    {
      key:        'pro',
      icon:       '🔥',
      name:       settings.pro_plan_name  || 'Pro',
      price: isAnnual
        ? `₹${Number(settings.pro_yearly_plan_price || 59990).toLocaleString('en-IN')}`
        : `₹${Number(settings.pro_plan_price || 5999).toLocaleString('en-IN')}`,
      usage:      `${Math.round((settings.token_limit_per_plan?.pro || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description: settings.pro_plan_desc  || 'Advanced features for growing teams and scalable workflows.',
      featured:    true,
      features:    settings.pro_plan_features || [
        `${Math.round((settings.token_limit_per_plan?.pro || 0) / TOKENS_PER_CREDIT)} monthly AI credits`,
        'Priority model access',
        'Advanced workflow automations',
        'Team collaboration tools',
        'Priority email support',
      ],
    },
    {
      key:        'enterprise',
      icon:       '👑',
      name:       settings.enterprise_plan_name  || 'Enterprise',
      price:      "Let's Talk",
      usage:      'Custom credits and seats',
      description: settings.enterprise_plan_desc  || 'Tailored capacity, security, and support for larger organizations.',
      features:    settings.enterprise_plan_features || [
        'Custom usage limits',
        'Dedicated onboarding',
        'SSO and advanced controls',
        'Custom SLA and support',
        'Procurement-ready billing',
      ],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#050507] min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-900/15 blur-[150px]" />

      <div className="max-w-[1440px] mx-auto w-full flex flex-col items-center relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-12 md:mb-16">
          <h2 className="font-['Poppins'] text-3xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.15]">
            Simple, Transparent Pricing
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
              For Every Stage of Growth
            </span>
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/70 leading-relaxed font-normal">
            Choose the perfect plan for your business and scale your AI-powered sales system with confidence.
          </p>
        </div>

        {/* Auto-Center Flex Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="w-full flex flex-wrap min-[1350px]:flex-nowrap justify-center items-stretch gap-6 lg:gap-8"
        >
          {plans.map((plan, index) => (
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