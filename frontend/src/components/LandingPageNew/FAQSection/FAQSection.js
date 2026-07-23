'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: 'How does the AI understand customer intent?',
    answer:
      'Our AI uses advanced NLP models trained specifically on sales conversations to detect buying signals and objections.',
  },
  {
    question: 'Is it safe to link my WhatsApp Business account?',
    answer:
      'Yes. All account connections are encrypted and securely handled using industry-standard authentication methods.',
  },
  {
    question: 'Can I switch between AI and human agents?',
    answer:
      'Absolutely. You can instantly hand over any conversation from AI to a human support or sales agent.',
  },
  {
    question: "What happens if the AI doesn't know the answer?",
    answer:
      'The AI can automatically escalate the conversation to a human agent or fallback workflow.',
  },
  {
    question: 'Can the AI learn from past customer conversations?',
    answer:
      'Yes. The system continuously improves using historical customer interactions and feedback patterns.',
  },
];

export default function FAQSection() {
  const [activeIndex, setActiveIndex] = useState(-1);

  const toggleFAQ = (index) => {
    setActiveIndex(index === activeIndex ? -1 : index);
  };

  return (
    <section className="relative overflow-hidden bg-black px-5 py-[90px] md:px-8 lg:px-0 lg:py-[120px] font-[Poppins]">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[35%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-[720px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.3 }}
          className="mb-12 flex flex-col items-center text-center md:mb-14"
        >
          <div className="mb-6 inline-flex items-center rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-[14px] py-[8px] text-[13px] font-medium text-white/90 backdrop-blur-sm">
            FAQs
          </div>

          <h2 className="max-w-[760px] font-['Poppins'] text-[26px] sm:text-[34px] md:text-[42px] lg:text-[50px] font-medium leading-[1.1] tracking-[-0.04em] text-white text-center">
            We&apos;ve Got the Answers
            <br />
            You&apos;re Looking For
          </h2>

          <p className="mt-[14px] text-[18px] font-normal text-white/85 md:text-[16px]">
            Everything you need to know about Auromind
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.2 }}
          className="space-y-[10px]"
        >
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index;

            return (
              <motion.div
                key={index}
                whileHover={{
                  borderColor: 'rgba(168,85,247,0.35)',
                  boxShadow: '0 0 30px rgba(124,58,237,0.12)',
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden w-full min-h-[52px] rounded-[10px] border border-[rgba(129,74,200,0.15)] bg-[rgba(129,74,200,0.06)]"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-[18px] text-left"
                >
                  <span className="pr-2 text-[15px] font-medium leading-[1.35] text-white lg:text-[16px]">
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/75 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.4, ease: 'easeInOut' },
                        opacity: { duration: 0.3, ease: 'easeInOut' },
                      }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 8, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="px-5 pb-5 md:px-6 md:pb-6"
                      >
                        <p className="max-w-[90%] text-[12px] leading-[1.7] text-white/70 sm:text-[12px] md:text-[13px] lg:text-[15px]">
                          {faq.answer}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}