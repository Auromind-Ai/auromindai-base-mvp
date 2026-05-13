'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, Plus } from 'lucide-react';

const FeaturesSection = () => {
  return (
    <section id="features" className="py-40 px-6 bg-slate-50/50 relative border-y border-black/5">
      <div className="absolute inset-0 bg-dot-pattern opacity-[0.03] pointer-events-none" />
      <div className="max-w-7xl mx-auto space-y-64 relative z-10">
        {/* Feature 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-purple-500/10 rounded-[3rem] blur-2xl group-hover:bg-purple-500/20 transition-colors" />
            <div className="relative">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Automation Builder</span>
              <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.9] text-black tracking-tighter mb-8 text-center lg:text-left">
                Build human-feeling <br /> automations in minutes.
              </h2>
              <p className="text-xl text-black/60 font-medium leading-relaxed mb-12 text-center lg:text-left max-w-xl">
                Our drag-and-drop builder lets you create complex sales funnels without a single line of code. It's the end of busywork.
              </p>
              <div className="flex justify-center lg:justify-start">
                <button className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-[#A855F7] hover:gap-5 transition-all">
                  Explore Builder <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="relative p-12 bg-white rounded-[3rem] border border-black/5 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 space-y-6">
              <div className="w-full h-16 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center px-6 gap-4">
                <div className="w-6 h-6 rounded-full bg-purple-600 shadow-lg shadow-purple-200" />
                <div className="h-3 w-1/2 bg-zinc-200 rounded-full" />
              </div>
              <div className="ml-12 w-8 h-16 border-l-2 border-dashed border-zinc-200 flex items-center px-4">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <Plus size={16} className="text-zinc-400" />
                </div>
              </div>
              <div className="w-full h-32 bg-zinc-50 rounded-2xl border border-zinc-100 p-6 space-y-3">
                <div className="h-3 w-3/4 bg-zinc-200 rounded-full" />
                <div className="h-3 w-1/2 bg-zinc-200 rounded-full opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Inverted */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div className="lg:order-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Unified Inbox</span>
            <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.9] text-black tracking-tighter mb-8 italic">
              One inbox for <br /> every conversation.
            </h2>
            <p className="text-xl text-black/60 font-medium leading-relaxed mb-12 max-w-xl">
              Whether it's WhatsApp, Instagram, or Telegram - managing your sales conversations has never been this seamless.
            </p>
            <div className="space-y-6">
              {['Automated Lead Scoring', 'Smart Quick Replies', 'Team Collaboration'].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Check size={16} className="text-purple-600" />
                  </div>
                  <span className="text-sm font-bold text-black">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:order-1 relative group">
            <div className="absolute -inset-8 bg-zinc-100 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative p-8 bg-black/5 rounded-[3rem] border border-black/5 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-200" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-24 bg-zinc-200 rounded-full" />
                    <div className="h-2 w-16 bg-zinc-100 rounded-full" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-zinc-100 rounded-lg" />
                  <div className="h-4 w-[80%] bg-zinc-100 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;