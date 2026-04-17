'use client';

import { BarChart3 } from 'lucide-react';
import RevealOnScroll from './RevealOnScroll';

const ProblemSection = () => {
  return (
    <RevealOnScroll>
      <section id="problem" className="py-40 px-6 relative bg-white overflow-hidden">
        {/* Subtle background element to fill "plain" space */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-[120px] -mr-64 -mt-64" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-center">
            <div className="lg:col-span-5">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">The Problem</span>
              <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1] text-black tracking-tighter mb-8">
                Stop losing sales to manual friction.
              </h2>
              <p className="text-xl text-black/60 font-medium leading-relaxed mb-12">
                Traditional WhatsApp communication fails at scale. 80% of customer interest drops after just 5 minutes of silence.
              </p>

              <div className="space-y-8">
                {[
                  { title: 'Response Decay', desc: 'Leads cool down instantly without a reply.' },
                  { title: 'Leaky Funnels', desc: 'High-intent chats get lost in the noise.' },
                  { title: 'Zero Scale', desc: "Humans can't close 24/7. AI can." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-1.5 h-auto bg-black/5 rounded-full" />
                    <div>
                      <h3 className="text-lg font-black text-black tracking-tight mb-2">{item.title}</h3>
                      <p className="text-sm text-black/50 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-center">
              <div className="relative w-full max-w-2xl aspect-[4/3] bg-[#F9F9F9] rounded-[2rem] border border-black/5 overflow-hidden shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-10 bg-black/5 flex items-center px-6 gap-2">
                  <div className="w-2 h-2 rounded-full bg-black/10" />
                  <div className="w-2 h-2 rounded-full bg-black/10" />
                  <div className="w-2 h-2 rounded-full bg-black/10" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 size={80} className="text-black/10" />
                </div>
                {/* Simulated "Gap" Visual */}
                <div className="absolute bottom-12 left-12 right-12 h-24 bg-red-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-red-200">
                  <span className="text-red-400 font-black text-xs uppercase tracking-[0.2em]">Revenue Leak Detected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
};

export default ProblemSection;