"use client";

// HeroSection.jsx — Refactored layout
// • 2-col grid (left 60% / right 40%) on desktop
// • Sphere sits behind LEFT column at low opacity
// • Right column = stacked floating UI cards
// • Fully responsive: lg grid → md stack → mobile single col

import dynamic from "next/dynamic";

const ParticleCanvas = dynamic(() => import("./ParticleCanvas"), { ssr: false });

export default function HeroSection() {
  return (
    <section
      className="
        relative min-h-screen w-full overflow-hidden bg-white text-black
        flex flex-col
      "
    >
      {/* ══════════════════════════════════════════
          SPHERE — absolute, behind left content
      ══════════════════════════════════════════ */}
      <div
  className="
    sphere-wrapper
    pointer-events-none absolute z-0
    left-[18%] top-1/2 -translate-y-1/2
    w-[700px] h-[700px]
    md:w-[560px] md:h-[560px]
    sm:w-[420px] sm:h-[420px]
  "
  style={{
    opacity: 0.16,
    filter: "blur(1.5px)",
  }}
>
  <ParticleCanvas />
</div>

      {/* Radial white overlay — keeps text readable over sphere */}
      {/* <div
        className="
          pointer-events-none absolute z-10
          left-0 top-1/2 -translate-y-1/2
          w-[65%] h-[90%]
        "
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.82) 45%, transparent 100%)",
        }}
      /> */}

      {/* ══════════════════════════════════════════
          MAIN CONTENT GRID
      ══════════════════════════════════════════ */}
      <div
        className="
          relative z-20 flex-1
          grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]
          items-center
          px-6 sm:px-10 lg:px-16
          py-28 lg:py-0
          gap-12 lg:gap-0
          min-h-screen
        "
      >

        {/*  LEFT COLUMN  */}
        <div className="flex flex-col justify-center max-w-[700px]">

          {/* Badge */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#A855F7]/20 bg-[#A855F7]/8 px-3.5 py-1.5 w-fit"
            style={{ opacity: 0, animation: "revealUp .7s cubic-bezier(.22,1,.36,1) .1s forwards" }}
          >
            <span className="text-[#A855F7] text-sm">✦</span>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4F46E5]">
              The Future of Sales is Here
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-[0.92] tracking-[-0.04em]"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 6.5rem)",
              opacity: 0,
              animation: "revealUp .8s cubic-bezier(.22,1,.36,1) .22s forwards",
            }}
          >
            Vanakam dharun<br />
            Out of Every<br />
            Single<br />
            <span className="text-[#A855F7]">Conversation.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-6 max-w-[480px] leading-[1.65] text-black/55 font-medium"
            style={{
              fontSize: "clamp(15px, 1.2vw, 18px)",
              opacity: 0,
              animation: "revealUp .8s cubic-bezier(.22,1,.36,1) .36s forwards",
            }}
          >
            Automate Instagram, WhatsApp, and Telegram with AI that feels human.
            Close more sales while you sleep.
          </p>

          {/* CTA Buttons */}
          <div
            className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
            style={{ opacity: 0, animation: "revealUp .8s cubic-bezier(.22,1,.36,1) .48s forwards" }}
          >
            <button className="
              h-[56px] rounded-full bg-black px-8
              text-[11px] font-black uppercase tracking-[0.18em] text-white
              shadow-[0_14px_30px_rgba(0,0,0,0.14)]
              transition-all duration-300
              hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(0,0,0,0.20)]
              w-full sm:w-auto
            ">
              Get Started Free
            </button>

            <button className="
              h-[56px] rounded-full border border-black/12 bg-white px-8
              text-[11px] font-black uppercase tracking-[0.18em] text-black
              shadow-[0_10px_22px_rgba(0,0,0,0.06)]
              transition-all duration-300
              hover:-translate-y-0.5 hover:border-black/22 hover:shadow-[0_16px_32px_rgba(0,0,0,0.10)]
              w-full sm:w-auto
            ">
              Book a Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div
            className="mt-12 flex flex-wrap items-center gap-6 border-t border-black/6 pt-7 opacity-50"
            style={{ animation: "revealUp .8s cubic-bezier(.22,1,.36,1) .6s forwards", opacity: 0 }}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px]">⚡</span>
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/40">
                Meta Business Partner
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/40 shrink-0">
              G2 Leader 2026
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/40 shrink-0">
              4.9 / 5 Rating
            </span>
          </div>
        </div>

        {/*  RIGHT COLUMN  */}
        <div
          className="
            relative flex flex-col items-center lg:items-end
            gap-5 lg:gap-6
            lg:pr-2
          "
          style={{ opacity: 0, animation: "revealRight .9s cubic-bezier(.22,1,.36,1) .4s forwards" }}
        >
          {/* Purple glow blob behind cards */}
          <div
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rounded-full"
            style={{
              width: 380,
              height: 380,
              background: "radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%)",
              filter: "blur(32px)",
              zIndex: 0,
            }}
          />

          {/* Card 1 — Ebook card */}
          <div
            className="relative z-10 w-full max-w-[320px] lg:max-w-[340px]"
            style={{
              transform: "translateX(0px)",
              animation: "floatA 4s ease-in-out 1s infinite alternate",
            }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white p-6 rounded-2xl shadow-xl">
              <p className="mb-4 text-left text-sm font-semibold leading-6">
                Hey 👋 Here's that ebook you Requested!
              </p>
              <button className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg w-full text-[15px] font-medium">
                Grab Your Guide
              </button>
            </div>
          </div>

          {/* Card 2 — Chat bubble */}
          <div
            className="relative z-10 w-full max-w-[300px] lg:max-w-[320px]"
            style={{
              transform: "translateX(-24px)",
              animation: "floatB 4.5s ease-in-out 1.2s infinite alternate",
            }}
          >
            {/* Girl image */}
            <img
              src="/images/Message_Girl.png"
              alt="Girl"
              className="absolute -left-[64px] bottom-[-10px] h-[88px] w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.12)] z-20"
            />
            <div className="rounded-2xl bg-black px-5 py-4 text-left text-sm font-medium leading-6 text-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                Prospect
              </p>
              <p>Do you have a website where I can see more?</p>
            </div>
          </div>

          {/* Card 3 — Scroll CTA */}
          <div
            className="relative z-10 w-full max-w-[310px] lg:max-w-[330px]"
            style={{
              transform: "translateX(-8px)",
              animation: "floatC 5s ease-in-out 1.4s infinite alternate",
            }}
          >
            <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 px-5 py-4 text-left text-white shadow-[0_18px_36px_rgba(124,58,237,0.28)]">
              <p className="text-sm font-medium">
                Scroll Down to Explore the Experience
                <span className="text-[14px] text-white/90"> ✦</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          KEYFRAME ANIMATIONS
      ══════════════════════════════════════════ */}
      <style jsx>{`
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes revealRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* Subtle floating for cards */
        @keyframes floatA {
          from { transform: translateX(0px) translateY(0px); }
          to   { transform: translateX(0px) translateY(-8px); }
        }
        @keyframes floatB {
          from { transform: translateX(-24px) translateY(0px); }
          to   { transform: translateX(-24px) translateY(-10px); }
        }
        @keyframes floatC {
          from { transform: translateX(-8px) translateY(0px); }
          to   { transform: translateX(-8px) translateY(-6px); }
        }

        /*  RESPONSIVE OVERRIDES  */

        /* Tablet (md–lg): stack vertically, smaller sphere */
        @media (max-width: 1023px) {
          .sphere-wrapper {
            left: 14% !important;
            transform: translateY(-50%) scale(0.55) !important;
            opacity: 0.10 !important;
          }
        }

        /* Mobile (< 640px): near-hide sphere, full-width buttons */
        @media (max-width: 639px) {
          .sphere-wrapper {
            left: 10% !important;
            transform: translateY(-50%) scale(0.4) !important;
            opacity: 0.05 !important;
          }
        }
      `}</style>
    </section>
  );
}