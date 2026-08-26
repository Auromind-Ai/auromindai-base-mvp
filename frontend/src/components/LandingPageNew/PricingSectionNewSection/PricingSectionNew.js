'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronsDown } from 'lucide-react';

import api from '@/lib/api';
import PricingComparisonTable from './PricingComparisonTable';

const TOKENS_PER_CREDIT = 1000;

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 35,
  },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      delay: index * 0.1,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function CheckIcon() {
  return (
    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20">
      <svg className="h-2.5 w-2.5 text-[#C084FC]" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/* ─ Single Grand Pricing Card ─ */
function PricingCardItem({ plan, index, onPlanClick, billing }) {
  const isFeatured = plan.featured;
  const isEnterprise = plan.key === 'enterprise';
  const showPerPeriod = !['Free', 'Custom', "Let's Talk"].includes(plan.displayPrice);

  const scrollContainerRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check scroll overflow
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

  // 🔹 Custom Ultra-Slow & Smooth Line-by-Line Scroll
  const handleScrollDown = (e) => {
    e.stopPropagation();
    const el = scrollContainerRef.current;
    if (!el) return;

    const start = el.scrollTop;
    const distance = 42; // one feature line height
    const duration = 400; // soft and gentle speed
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

  const cardBg = isFeatured
    ? 'border-[#7C3AED]/40 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.25),rgba(10,10,12,1)_70%)] shadow-[0_0_50px_rgba(124,58,237,0.22)]'
    : 'border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.25)_0%,rgba(6,6,8,1)_65%)] shadow-xl';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className={`relative w-full sm:w-[350px] lg:w-[380px] xl:w-[400px] rounded-[32px] border p-7 md:p-8 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between shrink-0 ${cardBg}`}
    >
      {/* Featured ambient background glow */}
      {isFeatured && (
        <div className="absolute -top-24 left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[#7C3AED]/25 blur-[120px] pointer-events-none" />
      )}

      {/* Badges */}
      {isFeatured && (
        <div className="absolute top-5 right-5 rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/15 px-3 py-1 text-xs font-semibold text-purple-200 shadow-sm">
          Popular
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{plan.icon}</span>
            <span className="text-2xl font-semibold text-white tracking-tight">
              {plan.name}
            </span>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${billing}-${plan.displayPrice}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline"
              >
                <span className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
                  {plan.displayPrice}
                </span>
                {showPerPeriod && (
                  <span className="ml-1.5 text-sm md:text-base font-normal text-white/60">
                    {plan.pricePeriod}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description */}
          <p className="mt-3.5 text-[13px] md:text-sm leading-relaxed text-white/70 min-h-[44px]">
            {plan.description}
          </p>

          {/* Action CTA Button */}
          <div className="mt-5">
            <button
              onClick={onPlanClick}
              className={`w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isFeatured
                  ? 'bg-[#814AC8] text-white hover:bg-[#9B5DE5] shadow-[0_15px_35px_rgba(129,74,200,0.4)]'
                  : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        </div>

        {/* 🔹 What's included Section */}
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
            {plan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckIcon />
                <span className="text-[13px] md:text-[14px] text-white/90 leading-snug">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Gentle Floating Double Down Arrow Indicator */}
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

/* ─ Main PricingSectionNew ─ */
export default function PricingSectionNew() {
  const [billing, setBilling] = useState('monthly');
  const [settings, setSettings] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api.getPricing()
      .then(setSettings)
      .catch(err => console.warn('Failed to load pricing details:', err?.message || err));
  }, []);

  const handlePlanClick = () => {
    const paymentUrl = '/user/admin/billing/payment';
    if (user) {
      router.push(paymentUrl);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(paymentUrl)}`);
    }
  };

  const iconMap = {
    free: "🚀",
    solo: "⚡",
    pro: "🔥",
    enterprise: "👑",
  };

  const dynamicPlans = (settings?.plans && Array.isArray(settings.plans) && settings.plans.length > 0)
    ? settings.plans.map(p => {
        const isYearly = billing === 'annual';
        const rawPrice = isYearly ? p.yearly_price : p.monthly_price;
        const displayPrice = (p.key === 'free' || rawPrice === 0)
          ? 'Free'
          : (p.key === 'enterprise' || rawPrice === 0)
          ? "Let's Talk"
          : `₹${Number(rawPrice).toLocaleString('en-IN')}`;

        const repliesCount = p.credits
          ? `${Math.round(p.credits).toLocaleString('en-IN')} AI Replies`
          : `${Math.round((p.token_limit || 1000000) / TOKENS_PER_CREDIT).toLocaleString('en-IN')} AI Replies`;

        return {
          key: p.key,
          name: p.name || p.display_name,
          icon: iconMap[p.key] || "⚡",
          displayPrice,
          pricePeriod: isYearly ? '/year' : '/month',
          description: p.description,
          features: (p.features && p.features.length > 0)
            ? p.features
            : [repliesCount, 'Basic Workflows', 'Meta API Included'],
          buttonText: p.key === 'free' ? 'Choose this plan' : (p.key === 'enterprise' ? 'Schedule a call' : 'Choose this plan'),
          featured: p.featured || p.is_featured || p.key === 'pro',
        };
      })
    : [
        {
          key: 'free',
          name: settings?.free_plan_name || 'Free Starter',
          icon: "🚀",
          displayPrice: (settings?.free_plan_price ?? 0) === 0 ? 'Free' : `₹${settings?.free_plan_price}`,
          pricePeriod: billing === 'annual' ? '/year' : '/month',
          description: settings?.free_plan_desc || 'A controlled top-of-funnel acquisition tier for getting started.',
          features: settings?.free_plan_features || [
            `${Math.round((settings?.token_limit_per_plan?.free || 1000000) / TOKENS_PER_CREDIT)} AI Replies`,
            '₹50 WhatsApp Wallet (~45 messages)',
            '2 Flow Executions / month',
            '2 Active Automations',
            '5 Knowledge Base Documents',
            '100 MB Brain File Storage',
            '50 Leads & CRM',
            '10 Meetings / month',
            '1 Gmail Connection',
            '1 Team Member',
          ],
          buttonText: 'Choose this plan',
          featured: false,
        },
        {
          key: 'solo',
          name: settings?.solo_plan_name || 'Solo Smart',
          icon: "⚡",
          displayPrice: billing === 'annual'
            ? `₹${Number(settings?.solo_yearly_plan_price || 9990).toLocaleString('en-IN')}`
            : `₹${Number(settings?.solo_plan_price || 999).toLocaleString('en-IN')}`,
          pricePeriod: billing === 'annual' ? '/year' : '/month',
          description: settings?.solo_plan_desc || 'RAG & custom knowledge base on a budget for solopreneurs.',
          features: settings?.solo_plan_features || [
            `${Math.round((settings?.token_limit_per_plan?.solo || 15000000) / TOKENS_PER_CREDIT)} AI Replies`,
            '₹200 WhatsApp Wallet',
            '5 Flow Executions / month',
            '10 Active Automations',
            '25 Knowledge Base Documents',
            '1 GB Brain File Storage',
            '500 Leads & CRM',
            '50 Meetings / month',
            '2 Gmail Connections',
            '3 Team Members',
          ],
          buttonText: 'Choose this plan',
          featured: false,
        },
        {
          key: 'pro',
          name: settings?.pro_plan_name || 'Pro',
          icon: "🔥",
          displayPrice: billing === 'annual'
            ? `₹${Number(settings?.pro_yearly_plan_price || 59990).toLocaleString('en-IN')}`
            : `₹${Number(settings?.pro_plan_price || 5999).toLocaleString('en-IN')}`,
          pricePeriod: billing === 'annual' ? '/year' : '/month',
          description: settings?.pro_plan_desc || 'Advanced features for growing teams and scalable workflows.',
          features: settings?.pro_plan_features || [
            `${Math.round((settings?.token_limit_per_plan?.pro || 100000000) / TOKENS_PER_CREDIT)} AI Replies`,
            '₹500 WhatsApp Wallet (~450 messages)',
            '10 Flow Executions / month',
            '50 Active Automations',
            '100 Knowledge Base Documents',
            '5 GB Brain File Storage',
            '100 Leads & CRM',
            '500 Meetings / month',
            '5 Gmail Connections',
            '10 Team Members',
          ],
          buttonText: 'Choose this plan',
          featured: true,
        },
        {
          key: 'enterprise',
          name: settings?.enterprise_plan_name || 'Enterprise',
          icon: "👑",
          displayPrice: "Let's Talk",
          pricePeriod: billing === 'annual' ? '/year' : '/month',
          description: settings?.enterprise_plan_desc || 'For large-scale operations with dedicated infrastructure and limits.',
          features: settings?.enterprise_plan_features || [
            '500,000 AI Credits / month',
            '₹500 WhatsApp Wallet',
            'Unlimited Flow Executions',
            'Unlimited Active Automations',
            '1,000 Knowledge Base Documents',
            '100 GB Brain File Storage',
            'Unlimited Leads & CRM',
            'Unlimited Meetings / month',
            'Unlimited Gmail Connections',
            '50 Team Members',
          ],
          buttonText: 'Schedule a call',
          featured: false,
        },
      ];

  const plans = dynamicPlans;

  return (
    <section id="pricing" className="relative bg-[#050507] min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-900/15 blur-[150px]" />

      <div className="max-w-[1440px] mx-auto w-full flex flex-col items-center relative z-10">
        
        {/* Header Section */}
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

          {/* Billing Toggle (Kept ready if needed)
          <div className="mt-8 flex justify-center items-center gap-4 px-2">
            <span className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-white/40'}`}>
              Monthly
            </span>

            <button
              type="button"
              onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 rounded-full transition-colors focus:outline-none cursor-pointer"
              style={{
                background: billing === 'annual' ? 'linear-gradient(135deg, #7C3AED, #9B5DE5)' : 'rgba(255,255,255,0.15)',
                boxShadow: billing === 'annual' ? '0 0 14px rgba(124,58,237,0.5)' : 'none',
              }}
            >
              <motion.div
                animate={{ x: billing === 'annual' ? 24 : 3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
              />
            </button>

            <span className={`text-sm font-medium transition-colors ${billing === 'annual' ? 'text-white' : 'text-white/40'}`}>
              Annually
              <span className="ml-2 rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-[11px] text-[#B794F4]">
                Save 20%
              </span>
            </span>
          </div> */}
        </div>

        {/* Grand Cards Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="w-full flex flex-wrap justify-center items-stretch gap-6 lg:gap-8"
        >
          {plans.map((plan, index) => (
            <PricingCardItem
              key={plan.key || plan.name}
              plan={plan}
              index={index}
              onPlanClick={handlePlanClick}
              billing={billing}
            />
          ))}
        </motion.div>

        {/* Feature Comparison Table matching requested design */}
        <PricingComparisonTable onSelectPlan={handlePlanClick} />
      </div>
    </section>
  );
}