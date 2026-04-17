'use client';

import { ParticleCanvas } from "@/components/ui/particle-canvas-1";

const CtaSection = () => {
  return (
    <section className="py-48 px-6 bg-violet-50 relative overflow-hidden">
      <ParticleCanvas
        maxParticles={1800}
        particleSizeMin={1}
        particleSizeMax={4}
        speedScale={1.4}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent pointer-events-none z-[1]" />
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <h2 className="text-[clamp(3rem,8vw,7rem)] font-black text-black tracking-tighter leading-[0.9] mb-16">
          Start closing more <br /> sales today.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <button className="px-12 py-6 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl">
            Get Started For Free
          </button>
          <button className="px-12 py-6 bg-black border border-white/20 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
            Book a Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;