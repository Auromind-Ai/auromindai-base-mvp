'use client';

import { motion } from 'framer-motion';
import HeroBackground from './HeroBackground';

const TRUST_BADGES = [
  { icon: '🤝', label: 'Meta Business Partner' },
  { icon: '🏆', label: 'G2 Leader 2026' },
  { icon: '⭐', label: '4.8 / 5 Rating' },
];

const stagger = {
  container: {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.13,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: 'easeOut',
      },
    },
  },
};

export default function AnimatedHeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-violet-50">
      <HeroBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-24 lg:pt-32 pb-16">
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          {/* LEFT SIDE */}
          <motion.div
            className="max-w-[580px] text-center flex flex-col items-center"
            variants={stagger.container}
            initial="hidden"
            animate="show"
          >
            {/* Badge */}
            <motion.div variants={stagger.item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/80 bg-violet-50/90 px-4 py-2 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.22em] text-violet-600 shadow-sm mb-8">
                <span className="text-violet-400 text-sm">✦</span>
                The Future of Sales Is Here
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={stagger.item}
              // HEADING
              className="text-[46px] leading-[0.98] sm:text-[62px] lg:text-[74px] xl:text-[82px] font-black tracking-[-0.055em] text-zinc-950"
            >
              Make the Most Out of Every
              <br />
               Single{' '}
              
              <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                 Conversation.
              </span>
            </motion.h1>

            {/* Paragraph */}
            <motion.p
              variants={stagger.item}
              className="mt-7 max-w-[480px] text-[16px] sm:text-[19px] leading-[1.6] text-zinc-700"
            >
              Scalable AI Sales Assistant for Instagram, WhatsApp, and Telegram.
              Automate every conversation to close more sales while you sleep.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={stagger.item}
              className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button className="h-14 px-8 rounded-full bg-zinc-950 text-white text-sm font-bold uppercase tracking-[0.18em] shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-600">
                Get Started Free
              </button>

              <button className="h-14 px-8 rounded-full border border-zinc-300 bg-white/80 backdrop-blur-sm text-zinc-700 text-sm font-bold uppercase tracking-[0.18em] transition-all duration-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50">
                Book a Demo
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={stagger.item}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            >
              {TRUST_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-400"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE CARD */}
          {/* <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[400px] rounded-[30px] border border-white/70 bg-white/85 backdrop-blur-xl p-6 shadow-[0_32px_90px_rgba(139,92,246,0.16)]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  AI
                </div>

                <div>
                  <p className="text-xl font-bold text-zinc-900">
                    Revenue Assistant
                  </p>
                  <p className="text-sm text-zinc-500">
                    Active · 24 / 7 Automation
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="ml-auto max-w-[250px] rounded-2xl rounded-tr-md bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-4 text-white text-base font-semibold shadow-lg">
                  Hey 👋 Can I get pricing details?
                </div>

                <div className="max-w-[280px] rounded-2xl rounded-tl-md bg-zinc-100 px-5 py-4 text-[15px] leading-7 text-zinc-600">
                  Sure! Our starter plan begins at ₹999/month. Want a demo link?
                </div>

                <div className="ml-auto max-w-[200px] rounded-2xl border border-violet-200 bg-violet-50/60 px-5 py-3 text-[15px] font-medium text-violet-700">
                  Yes, send it.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-3xl bg-[#07122d] text-white shadow-inner">
                <div className="px-6 py-5 border-r border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/45 mb-2">
                    Conversion Rate
                  </p>
                  <p className="text-5xl font-black">+38%</p>
                </div>

                <div className="px-6 py-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/45 mb-2">
                    Response Time
                  </p>
                  <p className="text-5xl font-black">1.2s</p>
                </div>
              </div>

              {/* glow */}
              {/* <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-fuchsia-400/15 blur-3xl" />
            </div>
          </motion.div> */} 
        </div>
      </div>
    </section>
  );
}