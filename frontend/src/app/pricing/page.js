'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Poppins } from 'next/font/google';
import { Check, ChevronsDown } from 'lucide-react';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '@/components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import api from '@/lib/api';
import PricingComparisonTable from '@/components/LandingPageNew/PricingSectionNewSection/PricingComparisonTable';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

const TOKENS_PER_CREDIT = 1000;

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden: { opacity: 0, y: 35 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─ PricingCard Component sizing & styling ─ */
function PricingCard({ plan, index, billing }) {
  const isFeatured = plan.featured;
  const isEnterprise = plan.key === 'enterprise';
  const showPerPeriod = !['Free', 'Custom', "Let's Talk", "Let's Start"].includes(plan.price);

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

  const cardBg = isFeatured
    ? 'border-[#7C3AED]/40 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.30),rgba(10,10,14,0.95)_75%)] shadow-[0_0_60px_rgba(124,58,237,0.25)] ring-1 ring-[#7C3AED]/30'
    : 'border-white/10 bg-[#0c0c0e]/90 shadow-2xl';

  const buttonClass = isEnterprise
    ? 'bg-[#1e1e24] text-white hover:bg-[#2a2a34] border border-white/10 shadow-lg cursor-pointer'
    : isFeatured
    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white hover:opacity-95 shadow-[0_10px_30px_rgba(124,58,237,0.4)] cursor-pointer'
    : 'bg-[#1e1e24] text-white hover:bg-[#2a2a34] border border-white/10 cursor-pointer';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      className={`relative overflow-hidden rounded-[32px] border w-full max-w-[420px] mx-auto min-h-[640px] p-8 md:p-9 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between ${cardBg}`}
    >
      {/* Featured glow */}
      {isFeatured && (
        <div className="absolute -top-28 left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[#7C3AED]/30 blur-[130px] pointer-events-none" />
      )}

      {/* Popular Badge */}
      {isFeatured && (
        <div className="absolute top-6 right-6 rounded-full border border-[#7C3AED]/50 bg-[#7C3AED]/20 px-3.5 py-1 text-xs font-semibold text-[#D8B4FE] shadow-sm">
          Popular
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
          <div className="mt-5 flex items-baseline">
            <AnimatePresence mode="wait">
              <motion.div
                key={billing + plan.price}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline"
              >
                <span className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
                  {plan.price}
                </span>
                {showPerPeriod && (
                  <span className="ml-2 text-sm md:text-base font-normal text-white/60">
                    {billing === 'annual' ? '/year' : '/month'}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description */}
          <p className="mt-4 text-[13.5px] md:text-[14px] leading-relaxed text-white/70 min-h-[48px]">
            {plan.description}
          </p>

          {/* Action Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                // Now directly goes to login page regardless of the plan
                window.location.href = `/login?redirect=${encodeURIComponent('/user/admin/billing/payment')}`;
              }}
              className={`relative z-20 w-full h-12 rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center justify-center ${buttonClass}`}
            >
              {plan.buttonText}
            </button>
          </div>
        </div>

        {/* What's included Section */}
        <div className="mt-10 pt-6 border-t border-white/10 relative flex-1 flex flex-col justify-end">
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
            WHAT&apos;S INCLUDED
          </p>

          {/* Features Scroll Area */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex flex-col gap-3 h-[270px] md:h-[290px] overflow-y-auto pb-10 pr-1.5"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check
                  className="h-4 w-4 text-[#A78BFA] flex-shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <span className="text-[13.5px] md:text-[14px] text-white/90 leading-snug">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Floating Scroll Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent flex items-end justify-center pb-1 pointer-events-none rounded-b-[24px]">
              <motion.button
                type="button"
                onClick={handleScrollDown}
                title="Scroll down for more features"
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="pointer-events-auto p-1.5 text-[#C084FC] hover:text-white hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
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

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [settings, setSettings] = useState(null);
  const compareRef = useRef(null);

  useEffect(() => {
    api.getPricing()
      .then(setSettings)
      .catch((err) => console.warn('Failed to load pricing details:', err?.message || err));
  }, []);

  const scrollToCompare = () => {
    compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const iconMap = {
    free: '🚀',
    solo: '⚡',
    pro: '🔥',
    enterprise: '👑',
  };

  const dynamicPlans =
    settings?.plans && Array.isArray(settings.plans) && settings.plans.length > 0
      ? settings.plans
          .filter((p) => p.key !== 'solo') // Show 3 columns (Free, Pro, Enterprise) as in Image 1
          .map((p) => {
            const isYearly = billing === 'annual';
            const rawPrice = isYearly ? p.yearly_price : p.monthly_price;
            const displayPrice =
              p.key === 'free' || rawPrice === 0
                ? 'Free'
                : p.key === 'enterprise'
                ? "Let's Talk"
                : `₹${Number(rawPrice).toLocaleString('en-IN')}`;

            const repliesCount = p.credits
              ? `${Math.round(p.credits).toLocaleString('en-IN')} monthly AI replies`
              : `${Math.round((p.token_limit || 1000000) / TOKENS_PER_CREDIT).toLocaleString('en-IN')} monthly AI replies`;

            return {
              key: p.key,
              name: p.name || p.display_name,
              icon: iconMap[p.key] || '⚡',
              price: displayPrice,
              description: p.description,
              features:p.features && p.features.length > 0
                  ? p.features
                  : [repliesCount, 'Basic workspace access', 'Meta API Included'],
              buttonText:
                p.key === 'free'
                  ? 'Choose this plan'
                  : p.key === 'enterprise'
                  ? 'Schedule a call'
                  : `Choose this plan`,
              featured: p.featured || p.is_featured || p.key === 'pro',
            };
          })
      : [
          {
            key: 'free',
            name: settings?.free_plan_name || 'Free Starter',
            icon: '🚀',
            price: (settings?.free_plan_price ?? 0) === 0 ? 'Free' : `₹${settings?.free_plan_price}`,
            description: settings?.free_plan_desc || 'A controlled top-of-funnel acquisition tier.',
            features: settings?.free_plan_features || [
              '20,000 AI Credits / month',
              '₹50 WhatsApp Wallet (~45 messages)',
              '2 Flow Executions / month',
              '2 Active Automations',
              '5 Knowledge Base Documents',
              '100 MB Brain File Storage',
              '50 Leads & CRM',
              '10 Meetings / month',
            ],
            buttonText: 'Choose this plan',
            featured: false,
          },
          {
            key: 'pro',
            name: settings?.pro_plan_name || 'Pro',
            icon: '🔥',
            price:
              billing === 'annual'
                ? `₹${Number(settings?.pro_yearly_plan_price || 999).toLocaleString('en-IN')}`
                : `₹${Number(settings?.pro_plan_price || 199).toLocaleString('en-IN')}`,
            description: settings?.pro_plan_desc || 'Billed at ₹199 monthly or ₹999 annually (58% annual discount).',
            features: settings?.pro_plan_features || [
              '250,000 AI Credits / month',
              '₹500 WhatsApp Wallet (~450 messages)',
              '10 Flow Executions / month',
              '50 Active Automations',
              '100 Knowledge Base Documents',
              '5 GB Brain File Storage',
              '100 Leads & CRM',
              '500 Meetings / month',
            ],
            buttonText: 'Choose this plan',
            featured: true,
          },
          {
            key: 'enterprise',
            name: settings?.enterprise_plan_name || 'Enterprise',
            icon: '👑',
            price: "Let's Talk",
            description: settings?.enterprise_plan_desc || 'For large-scale operations with dedicated infrastructure and unlimited limits.',
            features: settings?.enterprise_plan_features || [
              '500,000 AI Credits / month',
              '₹500 WhatsApp Wallet',
              'Unlimited Flow Executions',
              'Unlimited Active Automations',
              '1,000 Knowledge Base Documents',
              '100 GB Brain File Storage',
              'Unlimited Leads & CRM',
              'Unlimited Meetings / month',
            ],
            buttonText: 'Schedule a call',
            featured: false,
          },
        ];

  const plans = dynamicPlans;

  return (
    <main className={`${poppins.className} min-h-screen bg-black text-white relative overflow-x-hidden`}>
      <ModernSaaSBackground />
      <NavigationSection />

      <div className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header (Doc 1 Style) */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="font-['Poppins'] text-[32px] font-semibold text-white tracking-[-0.03em] leading-[1.15em] sm:text-[56px]">
            Simple, Transparent Pricing
            <br />
            For Every Stage of Growth
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/70 leading-relaxed font-normal">
            Choose the perfect plan for your business and scale your AI-powered sales system with confidence.
          </p>
        </div>

        {/* 3-Column Plan Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch"
        >
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              index={index}
              billing={billing}
            />
          ))}
        </motion.div>

        {/* Detailed Plan Comparison Section */}
        <div ref={compareRef} className="mt-12 md:mt-20">
          <PricingComparisonTable />
        </div>
      </div>

      <FooterSection />
    </main>
  );
}