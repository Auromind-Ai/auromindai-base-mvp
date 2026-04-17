'use client';

import SplashCursor from '@/components/ui/SplashCursor';

export default function UICtaSectionTwo() {
  return (
    <section className="relative overflow-hidden bg-white py-32">
      {/* Splash cursor only inside this section */}
      <div className="absolute inset-0 z-0">
        <SplashCursor />
      </div>

      {/* Optional light gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_60%)]" />

      {/* CTA Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <div className="inline-flex items-center rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-600 backdrop-blur-md">
          Limited Access Available
        </div>

        <h2 className="mt-8 text-4xl md:text-6xl font-bold leading-[1.05] tracking-[-0.04em] font-[family:var(--font-space)] text-black">
          Build Faster with
          <span className="ml-3 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
            Sales Today
          </span>
        </h2>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-8 py-4 text-lg font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.35)] transition duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(217,70,239,0.45)]">
            Start Free Trial
          </button>

          <button className="rounded-2xl border border-black/10 bg-black/5 px-8 py-4 text-lg font-semibold text-black backdrop-blur-md transition hover:scale-105 hover:bg-black/10">
            Book a Demo
          </button>
        </div>
      </div>
    </section>
  );
}