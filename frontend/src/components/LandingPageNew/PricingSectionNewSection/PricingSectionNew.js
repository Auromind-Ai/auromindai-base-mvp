'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const plans = [
  {
    name: 'Free',
    monthlyPrice: '₹399',
    annualPrice: '₹399',
    description: 'Try Auromind for free and see the ROI yourself.',
    features: [
      '100 AI Replies',
      'Basic Workflows',
      'Meta API Included',
    ],
    buttonText: 'Choose this plan',
    featured: false,
  },
  {
    name: 'Professional',
    monthlyPrice: '₹6,999',
    annualPrice: '₹6,999',
    description:
      'Advanced features for growing teams and scalable workflows.',
    features: [
      'Unlimited AI Replies',
      'Advanced Workflows',
      'Priority Support',
      'Full Analytics',
    ],
    buttonText: 'Choose this plan',
    featured: true,
  },
  {
    name: 'Business',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    description:
      'Perfect for small businesses starting with AI automation.',
    features: [
      'Dedicated Manager',
      'Custom API Access',
      'On-premise Options',
      'Global SLA',
    ],
    buttonText: 'Schedule a call',
    featured: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: {},
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 80,
    scale: 0.96,
  },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: index === 1 ? 1.03 : 1,
    transition: {
      duration: 0.8,
      delay: index * 0.12,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function PricingSectionNew() {
  const [billing, setBilling] = useState('monthly');

  return (
    <section className="relative overflow-hidden bg-black py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-['Poppins'] text-[26px] font-medium text-white tracking-[-0.04em] leading-[1.1em] text-center sm:text-[50px]">
            Simple, Transparent Pricing
            <br />
            For Every Stage of Growth
          </h2>

          <p className="mt-5 max-w-2xl mx-auto text-md md:text-base text-white/50 leading-7 text-center font-normal">
            Choose the perfect plan for your business and scale your AI-powered
            sales system with confidence.
          </p>

          <div className="mt-12 md:mt-14 flex justify-center items-center gap-4 px-2">
  
            {/* Monthly label */}
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

            {/* Annually label */}
            <span className={`text-sm md:text-[15px] font-medium transition-colors duration-300 ${
              billing === 'annual' ? 'text-white' : 'text-white/40'
            }`}>
              Annually
              <span className="ml-2 rounded-full bg-[#7C3AED]/20 px-2 py-1 text-[11px] text-[#B794F4]">
                Save 20%
              </span>
            </span>

          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16 md:mt-20 grid md:grid-cols-3 gap-6 xl:gap-8"
        >
          {plans.map((plan, index) => {
            const isFeatured = plan.featured;
            const isEnterprise = plan.name === 'Enterprise';

            return (
              <motion.div
                key={plan.name}
                custom={index}
                variants={cardVariants}
                className={`relative overflow-hidden rounded-[32px] border h-[465px] px-[30px] pt-[20px] pb-[20px] backdrop-blur-xl transition-all duration-500 flex flex-col gap-[35px] ${
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

                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <h3 className="font-['Poppins'] text-[23px] font-medium text-white/80 tracking-[-0.02em] leading-[1.2em]">
                      {plan.name}
                    </h3>

                    {/* PRICE BELOW TITLE */}
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
                            {plan.monthlyPrice}
                          </span>
                          <span className="ml-1 mb-[4px] text-[14px] text-white/60">
                            /month
                          </span>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* DESCRIPTION */}
                    <p className="mt-4 text-sm leading-7 text-white/55">
                      {plan.description}
                    </p>

                    

                    <div className="mt-[28px]">
                    <button
                      className={`w-full h-[44px] rounded-[8px] text-[14px] font-medium transition-all duration-300 ${
                        isFeatured
                          ? 'bg-[#814AC8] text-white hover:bg-[#9B5DE5] shadow-[0_20px_40px_rgba(129,74,200,0.35)]'
                          : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  </div>

                    <div className="mt-10 space-y-4">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3 text-sm text-white/80"
                        >
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20">
                            <svg
                              className="h-3 w-3 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}