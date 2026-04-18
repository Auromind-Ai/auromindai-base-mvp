'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const plans = [
  {
    name: 'Starter',
    monthlyPrice: '₹299',
    annualPrice: '₹4999',
    description:
      'Perfect for small businesses getting started with AI automation.',
    features: [
      '1 WhatsApp Number',
      '1 Instagram Account',
      '500 Conversations / Month',
      'Basic AI Automation',
      'Lead Capture',
      'Email Support',
    ],
    buttonText: 'Get Started',
    featured: false,
  },
  {
    name: 'Professional',
    monthlyPrice: '₹7,99',
    annualPrice: '₹7999',
    description:
      'Built for growing businesses that need more conversations and smarter automation.',
    features: [
      '3 WhatsApp Numbers',
      '3 Instagram Accounts',
      '5,000 Conversations / Month',
      'Advanced AI Responses',
      'Lead Qualification',
      'CRM Integration',
      'Priority Support',
    ],
    buttonText: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    description:
      'Custom-built solution for large teams and enterprise-scale workflows.',
    features: [
      'Unlimited Numbers',
      'Unlimited Conversations',
      'Custom AI Training',
      'Dedicated Success Manager',
      'Custom Integrations',
      '24/7 Premium Support',
    ],
    buttonText: 'Contact Sales',
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
          <h2 className="text-3xl md:text-5xl xl:text-6xl font-semibold text-white tracking-[-0.04em] leading-[1.05] text-center">
            Simple, Transparent Pricing
            <br />
            For Every Stage of Growth
          </h2>

          <p className="mt-5 max-w-2xl mx-auto text-sm md:text-base text-white/50 leading-7 text-center font-normal">
            Choose the perfect plan for your business and scale your AI-powered
            sales system with confidence.
          </p>

          <div className="mt-12 md:mt-14 flex justify-center px-2">
            <div className="relative inline-flex h-[52px] items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-6 md:px-8 py-3 rounded-full text-sm md:text-[15px] font-medium transition-all duration-300 ${
                  billing === 'monthly'
                    ? 'bg-[#7C3AED] text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Monthly
              </button>

              <button
                onClick={() => setBilling('annual')}
                className={`px-6 md:px-8 py-3 rounded-full text-sm md:text-[15px] font-medium transition-all duration-300 flex items-center ${
                  billing === 'annual'
                    ? 'bg-[#7C3AED] text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Annually
                <span className="ml-2 rounded-full bg-[#7C3AED]/20 px-2 py-1 text-[11px] text-[#B794F4]">
                  Save 20%
                </span>
              </button>
            </div>
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
                className={`relative overflow-hidden rounded-[32px] border p-6 md:p-9 min-h-[620px] backdrop-blur-xl transition-all duration-500 flex flex-col ${
                  isFeatured
                    ? 'border-[#7C3AED]/60 bg-[#7C3AED]/10 md:scale-[1.03] shadow-[0_30px_100px_rgba(124,58,237,0.35)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:-translate-y-2 hover:bg-white/[0.05]'
                }`}
              >
                {isFeatured && (
                  <>
                    <div className="absolute -top-20 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#7C3AED]/20 blur-[100px]" />
                    <div className="absolute top-5 right-5 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-medium text-white">
                      Most Popular
                    </div>
                  </>
                )}

                <div className="relative z-10 flex h-full flex-col">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {plan.name}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/55">
                      {plan.description}
                    </p>

                    <div className="mt-8 min-h-[72px]">
                      {isEnterprise ? (
                        <div className="text-4xl md:text-5xl font-semibold text-white tracking-[-0.04em]">
                          Let's Talk
                        </div>
                      ) : (
                        <div className="flex items-end">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={billing}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.25 }}
                              className="flex items-end"
                            >
                              <span className="text-4xl md:text-5xl font-semibold text-white tracking-[-0.04em]">
                                {billing === 'monthly'
                                  ? plan.monthlyPrice
                                  : plan.annualPrice}
                              </span>
                              <span className="ml-2 text-sm text-white/40 mb-1">
                                {billing === 'monthly' ? '/month' : '/year'}
                              </span>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      )}
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

                  <div className="mt-10 mt-auto">
                    <button
                      className={`w-full rounded-2xl py-4 text-sm font-medium transition-all duration-300 ${
                        isFeatured
                          ? 'bg-[#7C3AED] text-white hover:bg-[#8B5CF6] shadow-[0_20px_40px_rgba(124,58,237,0.35)]'
                          : 'border border-white/10 bg-white/10 text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
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