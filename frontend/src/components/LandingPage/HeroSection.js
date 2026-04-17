'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import RevealOnScroll from './RevealOnScroll';

const HeroSection = () => {
  return (
    <RevealOnScroll>
      <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 px-6 overflow-hidden bg-white">
        {/* Subtle Grid Background */}
        <div className="absolute inset-x-0 top-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="max-w-7xl mx-auto w-full relative z-30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.05] border border-white/10 text-white/80 text-[10px] font-bold mb-10 tracking-[0.2em] uppercase backdrop-blur-md">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>The Future of Sales is Here</span>
                </div>

                <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-black tracking-tight mb-10 text-black leading-[0.9]">
                  Make the most out <br />
                  of every single <br />
                  <span className="text-[#A855F7]">conversation.</span>
                </h1>

                <p className="max-w-xl text-xl md:text-2xl text-black/60 font-medium leading-relaxed mb-14">
                  Automate Instagram, WhatsApp, and Telegram with AI that feels human. Close more sales while you sleep.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 mb-24">
                  <button className="px-12 py-6 bg-black text-white rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-zinc-800 shadow-xl shadow-black/10">
                    Get Started Free
                  </button>
                  <button className="px-12 py-6 bg-white border border-black/10 text-black rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-black/5 shadow-lg">
                    Book a Demo
                  </button>
                </div>

                {/* Trust Row / Partners */}
                <div className="pt-20 border-t border-black/5 flex flex-wrap items-center gap-12 opacity-30 grayscale items-center">
                  <div className="flex items-center gap-2">
                    <Zap size={14} fill="black" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Meta Business Partner</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black text-center">G2 Leader 2026</span>
                  </div>
                  <div className="flex items-center gap-2 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">4.9/5 Rating</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* --- FLOATING CHAT BUBBLES --- */}
            <div className="lg:col-span-4 relative h-[500px] hidden lg:block">
              {/* Automation Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                whileHover={{ y: -5 }}
                className="absolute top-20 right-0 w-[320px] p-6 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-2xl border border-white/20 z-30"
              >
                <p className="text-white text-sm mb-4">
                  Hey 👋 Here's that ebook you requested!
                </p>
                <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-bold transition-all border border-white/30">
                  Grab Your Guide
                </button>
              </motion.div>

              {/* User Inquiry Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                whileHover={{ y: -5 }}
                className="absolute bottom-20 left-0 w-[280px] p-5 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
              >
                <p className="text-white/70 text-xs mb-1 font-bold uppercase tracking-widest">Prospect</p>
                <p className="text-white text-sm">
                  Do you have a website where I can see more?
                </p>
                <div className="absolute -left-12 bottom-0 w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
                </div>
              </motion.div>

              {/* Animated Background Glow for Bubbles */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[100px] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 opacity-30"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
        </motion.div>
      </section>
    </RevealOnScroll>
  );
};

export default HeroSection;