'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500"],
});

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
    image: '/images/StepOne.png',
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
    image: '/images/StepTwo.png',
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
    image: '/images/StepThree.png',
  },
];

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const contentVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? 40 : -40,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -40 : 40,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const imageVariants = {
    enter: (dir) => ({
      opacity: 0,
      scale: 0.95,
      x: dir > 0 ? 60 : -60,
    }),
    center: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (dir) => ({
      opacity: 0,
      scale: 0.95,
      x: dir > 0 ? -60 : 60,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const item = steps[currentStep];

  return (
    <section id="process" className="bg-black py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Heading */}
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className={`${poppins.className} text-[26px] font-medium text-white leading-[1.1em] tracking-[-0.04em] sm:text-[50px]`}
          >
            <span className="block">Launch in Three Simple Steps</span>
            <span className="block mt-1">With a Seamless Process</span>
          </h2>
          <p className="mt-5 text-sm md:text-base lg:text-xl text-white/90 max-w-xl mx-auto">
            Your autonomous sales force is just a few clicks away.
          </p>
        </div>

        {/* Step indicators */}
        <div className="mt-14 flex justify-center items-center gap-3">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentStep ? 1 : -1);
                setCurrentStep(i);
              }}
              className="flex items-center gap-2 group"
            >
              <div
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  i === currentStep
                    ? 'w-10 bg-[#814AC8]'
                    : 'w-5 bg-white/20 group-hover:bg-white/40'
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  i === currentStep ? 'text-white' : 'text-white/35'
                }`}
              >
                {s.step}
              </span>
            </button>
          ))}
        </div>

        {/* Content — fixed min-height to prevent jump */}
        <div className="mt-16 relative min-h-[480px] md:min-h-[420px] flex items-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={{ enter: contentVariants.enter, center: contentVariants.center, exit: contentVariants.exit }}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full grid md:grid-cols-2 items-center gap-10 md:gap-12 xl:gap-24"
            >
              {/* Image */}
              <motion.div
                custom={direction}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative mx-auto w-full max-w-[320px] md:max-w-[460px] xl:max-w-[540px] h-[240px] md:h-[340px] xl:h-[400px] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-black/25 to-transparent pointer-events-none rounded-3xl" />
              </motion.div>

              {/* Text */}
              <div className="text-center md:text-left max-w-xl mx-auto md:mx-0">
                <p className="text-sm lg:text-base text-white/60 mb-3 uppercase tracking-widest">
                  {item.step}
                </p>

                <h3 className="text-3xl md:text-[2.5rem] leading-tight font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-5 text-white/85 leading-7 text-base md:text-base lg:text-lg max-w-md mx-auto md:mx-0">
                  {item.description}
                </p>

                <div className="mt-8 max-w-sm mx-auto md:mx-0 text-left">
                  <p className="text-white text-base lg:text-lg font-medium mb-3">
                    Features:
                  </p>
                  <ul className="space-y-2 text-sm lg:text-base text-white/85">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-[#814AC8] mt-[2px]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}