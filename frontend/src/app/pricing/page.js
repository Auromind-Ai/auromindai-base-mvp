'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Poppins } from 'next/font/google';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '@/components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import api from '@/lib/api';

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
  hidden: { opacity: 0, y: 80, scale: 0.96 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: index === 2 ? 1.03 : 1, // Professional is index 2, featured card slightly scaled
    transition: { duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

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

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly'); // 'monthly' or 'annual'
  const [settings, setSettings] = useState(null);
  const compareRef = useRef(null);

  useEffect(() => {
    api.getPricing()
      .then(setSettings)
      .catch(err => console.warn('Failed to load pricing details:', err?.message || err));
  }, []);

  const scrollToCompare = () => {
    compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Compute pricing values dynamically
  const freePriceVal = settings?.free_plan_price ?? 0;
  const soloPriceVal = settings?.solo_plan_price ?? 999;
  const proPriceVal = settings?.pro_plan_price ?? 5999;
  const enterprisePriceVal = settings?.enterprise_plan_price ?? 24999;

  const getPriceString = (basePrice, isYearly, key) => {
    if (basePrice === 0) return 'Free';
    if (isYearly) {
      // Pro uses 4999 (custom discount), others use standard 20%
      if (key === 'pro') return '₹4,999';
      return `₹${Math.round(basePrice * 0.8).toLocaleString('en-IN')}`;
    }
    return `₹${basePrice.toLocaleString('en-IN')}`;
  };

  const plans = [
    {
      key: 'free',
      name: settings?.free_plan_name || 'Free',
      icon: '🚀',
      price: getPriceString(freePriceVal, billing === 'annual', 'free'),
      description: settings?.free_plan_desc || 'Try Orbion Agents for free and see the ROI yourself.',
      features: settings?.free_plan_features || [
        '1,000 monthly AI replies',
        'Basic workspace access',
        '1 Gmail account integration',
        'Up to 100 leads database'
      ],
      buttonText: 'Choose Free',
      featured: false,
    },
    {
      key: 'solo',
      name: settings?.solo_plan_name || 'Solo Smart',
      icon: '⚡',
      price: getPriceString(soloPriceVal, billing === 'annual', 'solo'),
      description: settings?.solo_plan_desc || 'RAG & custom knowledge base on a budget for solopreneurs.',
      features: settings?.solo_plan_features || [
        '15,000 monthly AI replies',
        'RAG Knowledge Base (10 files)',
        '1 Gmail account integration',
        'Up to 500 leads database',
        'Web chat campaigns'
      ],
      buttonText: 'Get Solo Smart',
      featured: false,
    },
    {
      key: 'pro',
      name: settings?.pro_plan_name || 'Professional',
      icon: '🔥',
      price: getPriceString(proPriceVal, billing === 'annual', 'pro'),
      description: settings?.pro_plan_desc || 'Advanced features for growing teams and scalable workflows.',
      features: settings?.pro_plan_features || [
        '100,000 monthly AI replies',
        'RAG Knowledge Base (100 files)',
        '5 Gmail account integrations',
        'Up to 10,000 leads database',
        'Priority live chat support'
      ],
      buttonText: 'Get Professional',
      featured: true,
    },
    {
      key: 'enterprise',
      name: settings?.enterprise_plan_name || 'Business',
      icon: '👑',
      price: getPriceString(enterprisePriceVal, billing === 'annual', 'enterprise'),
      description: settings?.enterprise_plan_desc || 'Perfect for businesses starting with AI automation at scale.',
      features: settings?.enterprise_plan_features || [
        '500,000 monthly AI replies',
        'Rollover unused credits',
        '₹1,000 Promo WhatsApp credit',
        'Unlimited leads & integrations',
        'Dedicated success manager'
      ],
      buttonText: 'Contact Sales',
      featured: false,
    },
  ];

  return (
    <main className={`${poppins.className} min-h-screen bg-black text-white relative overflow-x-hidden`}>
      <ModernSaaSBackground />
      <NavigationSection />

      <div className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header (Doc 1 Style) */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-['Poppins'] text-[26px] font-medium text-white tracking-[-0.04em] leading-[1.1em] text-center sm:text-[50px]">
            Simple, Transparent Pricing
            <br />
            For Every Stage of Growth
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-md md:text-base lg:text-lg text-white/80 leading-7 text-center font-normal">
            Choose the perfect plan for your business and scale your AI-powered
            sales system with confidence.
          </p>

          {/* Toggle Control + Compare Scroll Button */}
          <div className="mt-12 md:mt-14 flex flex-col sm:flex-row justify-center items-center gap-6 px-2">
            <div className="flex items-center gap-4">
              {/* Monthly Label */}
              <span className={`text-sm md:text-[15px] font-medium transition-colors duration-300 ${
                billing === 'monthly' ? 'text-white' : 'text-white/40'
              }`}>
                Monthly
              </span>

              {/* iOS Toggle Switch */}
              <button
                onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
                className="relative w-[52px] h-[28px] rounded-full transition-colors duration-300 focus:outline-none"
                style={{
                  background: billing === 'annual'
                    ? 'linear-gradient(135deg, #7C3AED, #9B5DE5)'
                    : 'rgba(255,255,255,0.15)',
                  boxShadow: billing === 'annual'
                    ? '0 0 16px rgba(124,58,237,0.5)'
                    : 'none',
                }}
              >
                {/* Knob */}
                <motion.div
                  animate={{ x: billing === 'annual' ? 26 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md"
                />
              </button>

              {/* Annually Label */}
              <span className={`text-sm md:text-[15px] font-medium transition-colors duration-300 ${
                billing === 'annual' ? 'text-white' : 'text-white/40'
              }`}>
                Annually
                <span className="ml-2 rounded-full bg-[#7C3AED]/20 px-2 py-1 text-[11px] text-[#B794F4]">
                  Save 20%
                </span>
              </span>
            </div>

            {/* Compare Plans Button */}
            <button
              onClick={scrollToCompare}
              className="border border-white/10 bg-white/10 hover:bg-white/20 text-white px-5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300"
            >
              📊 Compare Plans
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid (Exact styling match with homepage) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="relative mt-16 md:mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8"
        >
          {plans.map((plan, index) => {
            const isFeatured = plan.featured;
            return (
              <motion.div
                key={plan.key}
                custom={index}
                variants={cardVariants}
                className={`relative overflow-hidden rounded-[32px] border px-[30px] py-[30px] min-h-[520px] lg:min-h-[550px] h-auto backdrop-blur-xl transition-all duration-500 flex flex-col justify-between ${
                  isFeatured
                    ? 'border-[#7C3AED]/30 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),rgba(12,12,12,1)_68%)] shadow-[0_0_40px_rgba(124,58,237,0.18)]'
                    : 'border-white/10 bg-[linear-gradient(to_top,rgba(129,74,200,0.30)_0%,rgba(0,0,0,1)_60%)]'
                }`}
              >
                {isFeatured && (
                  <>
                    <div className="absolute -top-20 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#7C3AED]/20 blur-[100px]" />
                    <div className="absolute top-4 right-4 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-1 text-[13px] font-medium text-white/90">
                      Popular
                    </div>
                  </>
                )}

                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    <h3 className="font-['Poppins'] text-[23px] font-medium text-white/80 tracking-[-0.02em] leading-[1.2em] flex items-center gap-2">
                      <span className="text-[22px]">{plan.icon}</span>
                      {plan.name}
                    </h3>

                    {/* Price with slide-in animation */}
                    <div className="mt-4 flex items-end">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={billing}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-end"
                        >
                          <span className="text-[40px] leading-none font-semibold tracking-[-0.04em] text-white">
                            {plan.price}
                          </span>
                          {plan.key !== 'free' && (
                            <span className="ml-1 mb-[4px] text-[14px] text-white/60">
                              /month
                            </span>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-sm lg:text-base leading-6 text-white/85">
                      {plan.description}
                    </p>

                    {/* Action Button */}
                    <div className="mt-[28px]">
                      <button
                        onClick={() => {
                          if (plan.key === 'enterprise') {
                            window.location.href = 'mailto:sales@orbionagents.com?subject=Enterprise Inquiry';
                          } else {
                            window.location.href = `/login?redirect=${encodeURIComponent('/user/admin/billing/payment')}`;
                          }
                        }}
                        className={`w-full h-[44px] rounded-[8px] text-[14px] font-medium transition-all duration-300 ${
                          isFeatured
                            ? 'bg-[#814AC8] text-white hover:bg-[#9B5DE5] shadow-[0_20px_40px_rgba(129,74,200,0.35)]'
                            : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black'
                        }`}
                      >
                        {plan.buttonText}
                      </button>
                    </div>

                    {/* What's Included */}
                    <div className="mt-10">
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
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Detailed Plan Comparison Section (Rendered inline below pricing cards) */}
        <div ref={compareRef} className="mt-32 border-t border-white/10 pt-20">
          <div className="mx-auto max-w-4xl text-center mb-16">
            <h2 className="font-['Poppins'] text-[24px] font-medium text-white tracking-[-0.03em] leading-[1.2em] sm:text-[40px]">
              Detailed Feature Comparison
            </h2>
            <p className="mt-3 text-sm md:text-base text-white/60">
              Compare features and limit allocations across all available tiers to find your match.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-neutral-950/40 backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-5 text-sm font-bold uppercase tracking-wider text-white/40 w-1/3">
                    Features
                  </th>
                  <th className="py-5 text-sm font-bold uppercase tracking-wider text-white/70 text-center">
                    Free
                    <div className="text-xs text-white/40 font-normal mt-0.5">₹0</div>
                  </th>
                  <th className="py-5 text-sm font-bold uppercase tracking-wider text-[#A78BFA] text-center">
                    Solo Smart
                    <div className="text-xs text-[#A78BFA]/75 font-normal mt-0.5">
                      {billing === 'annual' ? '₹799/mo' : '₹999/mo'}
                    </div>
                  </th>
                  <th className="py-5 text-sm font-bold uppercase tracking-wider text-[#9B5DE5] text-center">
                    Pro
                    <div className="text-xs text-[#9B5DE5]/75 font-normal mt-0.5">
                      {billing === 'annual' ? '₹4,999/mo' : '₹5,999/mo'}
                    </div>
                  </th>
                  <th className="py-5 text-sm font-bold uppercase tracking-wider text-white/70 text-center">
                    Business
                    <div className="text-xs text-white/40 font-normal mt-0.5">
                      {billing === 'annual' ? '₹19,999/mo' : '₹24,999/mo'}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* LIMITS & SCALE Section */}
                <tr>
                  <td colSpan="5" className="py-5 text-xs font-bold text-[#9B5DE5] uppercase tracking-wider bg-white/[0.02] px-3 rounded-lg">
                    LIMITS & SCALE
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Messaging speed</td>
                  <td className="py-4 text-sm text-white/60 text-center">5/sec</td>
                  <td className="py-4 text-sm text-[#A78BFA] text-center font-medium">10/sec</td>
                  <td className="py-4 text-sm text-white text-center font-medium">40/sec</td>
                  <td className="py-4 text-sm text-white/60 text-center">1,000/sec</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Tags allowed</td>
                  <td className="py-4 text-sm text-white/60 text-center">2</td>
                  <td className="py-4 text-sm text-[#A78BFA] text-center font-medium">20</td>
                  <td className="py-4 text-sm text-white text-center font-medium">100</td>
                  <td className="py-4 text-sm text-white/60 text-center">500</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Custom attributes</td>
                  <td className="py-4 text-sm text-white/60 text-center">5</td>
                  <td className="py-4 text-sm text-[#A78BFA] text-center font-medium">20</td>
                  <td className="py-4 text-sm text-white text-center font-medium">50</td>
                  <td className="py-4 text-sm text-white/60 text-center">100</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Agent seats included</td>
                  <td className="py-4 text-sm text-white/60 text-center">2</td>
                  <td className="py-4 text-sm text-[#A78BFA] text-center font-medium">1</td>
                  <td className="py-4 text-sm text-white text-center font-medium">10</td>
                  <td className="py-4 text-sm text-white/60 text-center">50</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Webhooks</td>
                  <td className="py-4 text-sm text-white/30 text-center">-</td>
                  <td className="py-4 text-sm text-white/30 text-center">-</td>
                  <td className="py-4 text-sm text-white text-center font-medium">1</td>
                  <td className="py-4 text-sm text-white/60 text-center">3</td>
                </tr>

                {/* INCLUDED ON EVERY PLAN Section */}
                <tr>
                  <td colSpan="5" className="py-5 text-xs font-bold text-[#9B5DE5] uppercase tracking-wider bg-white/[0.02] px-3 rounded-lg mt-4">
                    INCLUDED ON EVERY PLAN
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Unlimited contacts</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Multi-agent live chat</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Broadcasting & retargeting</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Click-to-WhatsApp Ads Manager</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>

                {/* CAMPAIGNS & AUTOMATION Section */}
                <tr>
                  <td colSpan="5" className="py-5 text-xs font-bold text-[#9B5DE5] uppercase tracking-wider bg-white/[0.02] px-3 rounded-lg mt-4">
                    CAMPAIGNS & AUTOMATION
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Campaign Scheduler</td>
                  <td className="py-4 text-center text-white/30">-</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">RAG Knowledge Base (Custom AI)</td>
                  <td className="py-4 text-center text-white/30">-</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-4 text-sm text-white/80 pl-3">Governed MCP Actions</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                  <td className="py-4 text-center text-emerald-500">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FooterSection />
    </main>
  );
}
