'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    step: 'Step 1',
    title: 'Connect Account',
    description:
      'Securely connect your WhatsApp Business account using the official Cloud API to automate messaging, manage conversations at scale, and deliver reliable customer support — all with enterprise-grade security.',
    features: [
      'Official & Secure',
      'Faster Response Time',
      'Verified Business Trust',
      'Seamless Automation',
    ],
    image: '/images/StepOne.jpeg',
  },
  {
    step: 'Step 2',
    title: 'Configure AI',
    description:
      'Train your AI by setting rules and training it on your business data so it responds accurately, works exactly for your business needs, and continuously improves across more interactions.',
    features: [
      'Configure custom AI rules',
      'Train on proprietary data',
      'Control response behavior',
      'Define tone and workflows',
    ],
    image: '/images/StepTwo.jpeg',
  },
  {
    step: 'Step 3',
    title: 'Go Live Instantly',
    description:
      'Launch your autonomous sales system in minutes and let it automatically engage leads, qualify prospects, and convert conversations into revenue around the clock.',
    features: [
      'Instant activation',
      '24/7 automated replies',
      'Lead qualification',
      'Revenue-focused workflows',
    ],
    image: '/images/StepThree.jpeg',
  },
];

const slideVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const imageVariants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const loopSteps = [...steps, steps[0]];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentStep === steps.length) {
      const timeout = setTimeout(() => {
        setIsResetting(true);
        setCurrentStep(0);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsResetting(false);
          });
        });
      }, 1200);

      return () => clearTimeout(timeout);
    }
  }, [currentStep]);

  return (
    <section className="bg-black py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl xl:text-6xl font-bold text-white leading-[1.05] tracking-[-0.04em]">
            <span className="block">Launch in Three Simple Steps</span>
            <span className="block mt-1">With a Seamless Process</span>
          </h2>

          <p className="mt-5 text-sm md:text-base text-white/50 max-w-xl mx-auto">
            Your autonomous sales force is just a few clicks away.
          </p>
        </div>
      </div>

      <div className="mt-20 relative w-full overflow-hidden">
        <motion.div
          className="flex"
          animate={{ x: `-${currentStep * 100}vw` }}
          transition={
            isResetting
              ? { duration: 0 }
              : {
                  duration: 1.2,
                  ease: [0.22, 1, 0.36, 1],
                }
          }
        >
          {loopSteps.map((item, index) => (
            <div
              key={`${item.step}-${index}`}
              className="w-[100vw] shrink-0 flex items-center justify-center px-5 md:px-8"
            >
              <AnimatePresence mode="wait">
                {currentStep === index && (
                  <motion.div
                    key={item.step}
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="max-w-6xl mx-auto grid md:grid-cols-2 items-center gap-10 md:gap-12 xl:gap-24"
                  >
                    <motion.div
                      variants={imageVariants}
                      className="relative mx-auto w-full max-w-[320px] md:max-w-[360px] xl:max-w-[420px] h-[240px] md:h-[280px] xl:h-[320px] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>

                    <motion.div
                      variants={slideVariants}
                      className="text-center md:text-left max-w-xl mx-auto md:mx-0"
                    >
                      <p className="text-sm text-white/40 mb-3">{item.step}</p>

                      <h3 className="text-3xl md:text-[2.5rem] leading-tight font-semibold text-white">
                        {item.title}
                      </h3>

                      <p className="mt-6 text-white/55 leading-8 text-sm md:text-base max-w-md mx-auto md:mx-0">
                        {item.description}
                      </p>

                      <div className="mt-8 max-w-sm mx-auto md:mx-0 text-left">
                        <p className="text-white/80 text-sm font-medium mb-3">
                          Features:
                        </p>

                        <ul className="space-y-2 text-sm text-white/90">
                          {item.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <span className="text-white/60 mt-[1px]">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}