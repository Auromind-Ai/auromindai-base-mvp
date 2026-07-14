'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Poppins } from "next/font/google";
import Image from 'next/image';
import { Activity } from 'lucide-react';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500"],
});

const steps = [
  {
    step: '01',
    label: 'Connect',
    title: 'Connect Account',
    description:
      'Securely connect your WhatsApp Business account using the official Cloud API to automate messaging, manage conversations at scale, and deliver reliable customer support — all with enterprise-grade security.',
    features: [
      'Official Meta API Integration',
      'Instant Response Automation',
      'Verified Green Badge Status',
      'Fully Scalable Delivery Platform',
    ],
    image: '/images/StepOne.webp',
  },
  {
    step: '02',
    label: 'Train',
    title: 'Configure AI Brain',
    description:
      'Train your AI by setting rules and training it on your business data so it responds accurately, works exactly for your business needs, and continuously improves across more interactions.',
    features: [
      'Custom Context Injection',
      'Behavioral Alignment Rules',
      'Knowledge Base Embeddings',
      'Adaptive Learning Over Time',
    ],
    image: '/images/StepTwo.webp',
  },
  {
    step: '03',
    label: 'Launch',
    title: 'Go Live Instantly',
    description:
      'Launch your autonomous sales system in minutes and let it automatically engage leads, qualify prospects, and convert conversations into revenue around the clock.',
    features: [
      'One-Click Production Launch',
      '24/7 Autopilot Processing',
      'CRM System Integrations',
      'Revenue Attribution Dashboards',
    ],
    image: '/images/StepThree.webp',
  },
];

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const autoplayTimer = useRef(null);
  const progressTimer = useRef(null);

  const resetAutoplay = () => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(0);

    const stepDuration = 6000; // 6 seconds per step
    const intervalTime = 50;   // Update progress every 50ms
    const stepIncrement = (intervalTime / stepDuration) * 100;

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    autoplayTimer.current = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
      setProgress(0);
    }, stepDuration);
  };

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [currentStep]);

  const activeItem = steps[currentStep];

  return (
    <section id="process" className="bg-[#03020A] py-24 sm:py-32 relative overflow-hidden font-sans border-b border-white/[0.04]">
      {/* Dynamic Background Glow changing according to step accent color */}
      <div className="pointer-events-none absolute inset-0 transition-all duration-1000 ease-in-out -z-10">
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[500px] rounded-full blur-[140px] opacity-40 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${activeItem.accent} 0%, transparent 70%)`
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-purple-300 tracking-wider uppercase mb-5">
            <Activity size={12} className="text-purple-400 animate-pulse" />
            Seamless Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Launch in Three Simple Steps
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Configure your autonomous sales agent and start automating customer conversations in minutes.
          </p>
        </div>

        {/* Timeline / Progress Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 sm:mb-24 max-w-4xl mx-auto">
          {steps.map((s, i) => {
            const isActive = i === currentStep;
            return (
              <button
                key={i}
                onClick={() => {
                  setCurrentStep(i);
                }}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                  isActive
                    ? 'bg-white/[0.03] border-white/15 shadow-xl'
                    : 'bg-transparent border-white/[0.04] hover:bg-white/[0.01] hover:border-white/10'
                }`}
              >
                {/* Horizontal Progress bar for active tab */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.05]">
                    <div 
                      className="h-full transition-all duration-75 ease-linear"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: s.accent,
                        boxShadow: `0 0 10px ${s.accent}`
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      isActive 
                        ? 'text-white' 
                        : 'bg-white/[0.04] border border-white/10 text-zinc-500 group-hover:text-zinc-300'
                    }`}
                    style={isActive ? { backgroundColor: s.accent } : {}}
                  >
                    {s.step}
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-white/50' : 'text-zinc-600'}`}>
                      {s.label}
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                      {s.title}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Layout */}
        <div className="relative min-h-[500px] md:min-h-[420px] flex items-center bg-[#090812]/50 border border-white/[0.06] rounded-[2.5rem] p-6 sm:p-8 md:p-12 lg:p-16 backdrop-blur-xl shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="w-full grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center"
            >
              {/* Image */}
              <div
                className="relative mx-auto w-full max-w-[320px] md:max-w-[460px] xl:max-w-[540px] h-[240px] md:h-[340px] xl:h-[400px] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
              >
                <Image
                  src={activeItem.image}
                  alt={activeItem.title}
                  fill
                  sizes="(max-width: 768px) 320px, (max-width: 1200px) 460px, 540px"
                  className="w-full h-full object-cover"
                />
                
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl group cursor-pointer">
                  <img
                    src={activeItem.image}
                    alt={activeItem.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Neon Color Mask Overlay */}
                  <div 
                    className="absolute inset-0 mix-blend-color opacity-25 transition-all duration-500"
                    style={{ backgroundColor: activeItem.accent }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </div>

              {/* Right Side: Copy Panel */}
              <div className="md:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-zinc-300">
                  {activeItem.icon}
                  <span>Phase {activeItem.step}</span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                  {activeItem.title}
                </h3>

                <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
                  {activeItem.description}
                </p>

                {/* Features List */}
                <div className="pt-4 border-t border-white/[0.06] space-y-3.5">
                  <p className="text-sm font-bold tracking-wider text-white uppercase">
                    Capabilities Included
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeItem.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${activeItem.accent}15` }}
                        >
                          <span className="text-[10px]" style={{ color: activeItem.accent }}>✓</span>
                        </div>
                        <span className="text-sm text-zinc-300 font-medium">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}