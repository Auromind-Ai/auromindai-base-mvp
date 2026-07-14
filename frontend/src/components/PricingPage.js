'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

/* ─ Logic (Doc 2 — untouched) ─ */

const PLAN_ORDER = {
  free: 0,
  solo: 1,
  pro: 2,
  enterprise: 3,
};

const TOKENS_PER_CREDIT = 1000;
const ANNUAL_DISCOUNT = 0.8;

/* ─ Animation variants (Doc 1)  */

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden:  { opacity: 0, y: 80, scale: 0.96 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: index === 1 ? 1.03 : 1,
    transition: { duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─ Checkmark icon (Doc 1) ─ */

function CheckIcon() {
  return (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20">
      <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/* ─ PricingCard — Doc 2 logic · Doc 1 UI ─ */

function PricingCard({ plan, currentPlan, onUpgrade, index }) {
  /*  Logic: Doc 2 (unchanged)  */
  const isCurrent    = currentPlan === plan.key;
  const isEnterprise = plan.key === 'enterprise';

  const currentRank          = PLAN_ORDER[currentPlan] ?? 0;
  const planRank             = PLAN_ORDER[plan.key]    ?? 0;
  const shouldShowActionButton = planRank >= currentRank;

  const handleClick = () => {
    if (isCurrent || isEnterprise || typeof onUpgrade !== 'function') return;
    onUpgrade(plan.key);
  };

  const getCTA = (planKey) => {
    if (currentPlan === planKey) return 'Current Plan';
    if (planKey === 'solo')      return 'Upgrade to Solo Smart';
    if (planKey === 'pro')       return 'Upgrade to Pro';
    return 'Contact Sales';
  };
  /*  end Doc 2 logic  */

  const isFeatured = plan.featured;
  const showPerMonth = !['Free', 'Custom'].includes(plan.price);

  /*  Card background (Doc 1 style + isCurrent tint)  */
  const cardBg = isCurrent
    ? 'border-[#814AC8]/50 bg-[radial-gradient(circle_at_top,rgba(129,74,200,0.22),rgba(12,12,12,1)_68%)] shadow-[0_0_40px_rgba(129,74,200,0.28)]'
    : isFeatured
    ? 'border-[#7C3AED]/30 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),rgba(12,12,12,1)_68%)] shadow-[0_0_40px_rgba(124,58,237,0.18)]'
    : 'border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.30)_0%,rgba(0,0,0,1)_60%)]';

  /*  Button style (Doc 1 featured purple / non-featured ghost + Doc 2 disabled states)  */
  const buttonClass = isCurrent
    ? 'cursor-not-allowed border border-[#814AC8]/30 bg-[#814AC8]/10 text-[#C4A0F0]'
    : isEnterprise
    ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-zinc-400'
    : isFeatured
    ? 'bg-[#814AC8] text-white hover:bg-[#9B5DE5] shadow-[0_20px_40px_rgba(129,74,200,0.35)]'
    : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className={`relative overflow-hidden rounded-[32px] border min-h-[465px] px-[30px] pt-[28px] pb-[28px] backdrop-blur-xl transition-all duration-500 flex flex-col ${cardBg}`}
    >
      {/* Purple glow blob — featured only (Doc 1) */}
      {isFeatured && (
        <div className="absolute -top-20 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#7C3AED]/20 blur-[100px] pointer-events-none" />
      )}

      {/* Top-right badge */}
      {isFeatured && !isCurrent && (
        <div className="absolute top-4 right-4 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-1 text-[13px] font-medium text-white/90">
          Popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-4 right-4 rounded-[8px] border border-[#814AC8]/30 bg-[#814AC8]/10 px-3 py-1 text-[13px] font-medium text-[#C4A0F0]">
          Current Plan
        </div>
      )}

      {/* Card content */}
      <div className="relative z-10 flex h-full flex-col flex-1">

        {/* Plan name + icon */}
        <h3 className="font-['Poppins'] text-[23px] font-medium text-white/80 tracking-[-0.02em] leading-[1.2em] flex items-center gap-2">
          <span className="text-[22px]">{plan.icon}</span>
          {plan.name}
        </h3>

        {/* Price */}
        <div className="mt-4 flex items-end">
          <span className="text-[40px] leading-none font-semibold tracking-[-0.04em] text-white">
            {plan.price ?? 'Custom'}
          </span>
          {showPerMonth && (
            <span className="ml-1 mb-[4px] text-[14px] text-white/60">/month</span>
          )}
        </div>

        {/* Description */}
        <p className="mt-4 text-sm lg:text-base leading-6 text-white/85">
          {plan.description}
        </p>

        {/* CTA button — logic: Doc 2 · style: Doc 1 */}
        {shouldShowActionButton && (
          <div className="mt-7">
            <button
              type="button"
              onClick={handleClick}
              disabled={isCurrent || isEnterprise}
              className={`w-full h-[44px] rounded-[8px] text-[14px] font-medium transition-all duration-300 flex items-center justify-center gap-2 ${buttonClass}`}
            >
              <span>{getCTA(plan.key)}</span>
              {isEnterprise && !isCurrent && <ChevronRight size={16} />}
            </button>
          </div>
        )}

        {/* Feature list */}
        <div className="mt-8 flex-1">
          <p className="text-white/90 text-sm lg:text-base font-medium mb-4">
            What's Included:
          </p>
          <div className="space-y-2">
            {plan.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 text-sm lg:text-base text-white/80"
              >
                <CheckIcon />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

/* ─ PricingPage — Doc 2 logic · Doc 1 layout ─ */

export default function PricingPage({ currentPlan = 'free', onUpgrade, settings, dbPlans = [] }) {

  const [isAnnual, setIsAnnual] = useState(false);

  /* Loading state (Doc 2 — logic unchanged) */
  if (!settings) {
    return (
      <section className="relative overflow-hidden bg-black py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.30)_0%,rgba(0,0,0,1)_60%)] px-6 py-12 text-center text-white/60">
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
  };

  /* Plans array — fetched from DB or fallback to settings */
  const plans = dbPlans && dbPlans.length > 0
    ? dbPlans.map(plan => ({
        key:         plan.key,
        icon:        iconMap[plan.key] || '🚀',
        name:        plan.label,
        price:       plan.key === 'free' ? 'Free' : plan.key === 'enterprise' ? 'Custom' : (isAnnual
          ? `₹${Math.round(plan.amount * ANNUAL_DISCOUNT)}`
          : `₹${plan.amount}`),
        usage:       `${Math.round(plan.tokens / TOKENS_PER_CREDIT)} credits / month`,
        description: plan.description,
        featured:    plan.key === 'pro',
        features:    plan.features || [],
      }))
    : [
    {
      key:         'free',
      icon:        '🚀',
      name:        settings.free_plan_name  || 'Free',
      price:       settings.free_plan_price === 0 ? 'Free' : `₹${settings.free_plan_price}`,
      usage:       `${Math.round((settings.token_limit_per_plan?.free || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description: settings.free_plan_desc  || 'Try Auromind for free and see the ROI yourself.',
      features:    settings.free_plan_features || [
        `${Math.round((settings.token_limit_per_plan?.free || 0) / TOKENS_PER_CREDIT)} monthly AI credits`,
        'Core workspace access',
        'Basic automations',
        'Community support',
      ],
    },
    {
      key:         'solo',
      icon:        '⚡',
      name:        settings.solo_plan_name  || 'Solo Smart',
      price: isAnnual
        ? `₹${Math.round((settings.solo_plan_price || 999) * ANNUAL_DISCOUNT)}`
        : `₹${settings.solo_plan_price || 999}`,
      usage:       `${Math.round((settings.token_limit_per_plan?.solo || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description: settings.solo_plan_desc  || 'RAG & custom knowledge base on a budget for solopreneurs.',
      features:    settings.solo_plan_features || [
        `${Math.round((settings.token_limit_per_plan?.solo || 0) / TOKENS_PER_CREDIT)} monthly AI credits`,
        'RAG Knowledge Base (10 files)',
        '1 Gmail account integration',
        'Up to 500 leads database',
      ],
    },
    {
      key:         'pro',
      icon:        '🔥',
      name:        settings.pro_plan_name  || 'Pro',
      price: isAnnual
        ? `₹${Math.round((settings.pro_plan_price || 5999) * ANNUAL_DISCOUNT)}`
        : `₹${settings.pro_plan_price || 5999}`,
      usage:       `${Math.round((settings.token_limit_per_plan?.pro || 0) / TOKENS_PER_CREDIT)} credits / month`,
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
      key:         'enterprise',
      icon:        '👑',
      name:        settings.enterprise_plan_name  || 'Enterprise',
      price:       'Custom',
      usage:       'Custom credits and seats',
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
    <section className="relative overflow-hidden bg-black py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header (Doc 1) */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-['Poppins'] text-[26px] font-medium text-white tracking-[-0.04em] leading-[1.1em] sm:text-[50px]">
            Simple, Transparent Pricing
            <br />
            For Every Stage of Growth
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-md md:text-base lg:text-lg text-white/80 leading-7 font-normal">
            Choose the perfect plan for your business and scale your AI-powered
            sales system with confidence.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className={`text-[15px] font-medium transition-colors duration-200 ${
            !isAnnual ? 'text-white' : 'text-white/40'
          }`}>
            Monthly
          </span>

          <button
            type="button"
            onClick={() => setIsAnnual(prev => !prev)}
            className={`relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-300 focus:outline-none ${
              isAnnual ? 'bg-[#7C3AED]' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                isAnnual ? 'translate-x-[28px]' : 'translate-x-1'
              }`}
            />
          </button>

          <span className={`text-[15px] font-medium transition-colors duration-200 ${
            isAnnual ? 'text-white' : 'text-white/40'
          }`}>
            Annually
          </span>

          <span className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-300 ${
            isAnnual
              ? 'bg-[#7C3AED] text-white'
              : 'bg-white/10 text-white/50'
          }`}>
            Save 20%
          </span>
        </div>

        {/* Cards grid (Doc 1 animations · Doc 2 logic) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16 md:mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-start"
        >
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              index={index}
              currentPlan={currentPlan}
              onUpgrade={onUpgrade}
            />
          ))}
        </motion.div>

      </div>
    </section>
  );
}