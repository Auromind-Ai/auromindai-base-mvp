"use client";

import NeatCTAButton from "@/components/ui/NeatCTAButton";

export default function CTASection() {
  return (
    <section className="w-full bg-black py-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-3xl relative">
        {/* Outer glow effect */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 80%, #512091 20%, transparent 65%)",
          }}
        />

        {/* Card */}
        <div
          className="relative rounded-3xl overflow-hidden px-10 py-16 sm:px-16 sm:py-20 text-center flex flex-col items-center gap-6"
          style={{
            background:"#0D0D0D",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >          

          {/* Top-left radial glow */}
            <div
            className="absolute top-0 left-0 w-72 h-72 pointer-events-none"
            style={{
                background:
                "radial-gradient(circle at 20% 20%, #814AC8 0%, transparent 65%)",
                opacity: 0.35,
                filter: "blur(32px)",
            }}
            />

          {/* Inner radial glow */}
          <div
            className="absolute bottom-0 right-0 w-72 h-72 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 80% 90%, #814AC8 0%, transparent 65%)",
              opacity: 0.35,
              filter: "blur(32px)",
            }}
          />

          {/* Heading */}
          <h2
            className="relative text-[28px] sm:text-[38px] md:text-[50px] font-medium text-white leading-[1.1] tracking-[-0.04em] text-center"
            style={{ fontFamily: "'Poppins', sans-serif" }}
            >
            Start closing more sales today
            </h2>

          {/* Subtext */}
          <p
            className="relative text-base sm:text-lg font-normal"
            style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
          >
            Book a Demo Today and Start Automating
          </p>

          {/* Buttons */}
          <div className="relative flex flex-col sm:flex-row items-center gap-3 mt-2">

            {/* Get Started Button */}
            <NeatCTAButton
              href="/signup"
              className="group relative overflow-hidden h-[44px] w-[180px] rounded-[12px] bg-[#814AC8] text-[16px] font-semibold text-white shadow-[0_0_25px_rgba(129,74,200,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(129,74,200,0.65)]"
            >
              <span className="flex items-center justify-center gap-2 w-full h-full">

                {/* Text slide */}
                <span className="relative overflow-hidden h-[1.2em] flex items-center">
                  <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                    Get started Free
                  </span>
                  <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                    Get started Free
                  </span>
                </span>

                {/* Icon animation */}
                <span className="relative w-[14px] h-[14px] flex items-center justify-center overflow-hidden">
                  <span className="absolute transition-all duration-300 ease-in-out opacity-100 group-hover:opacity-0 group-hover:-translate-y-2 group-hover:translate-x-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span className="absolute transition-all duration-300 ease-in-out opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                </span>

              </span>
            </NeatCTAButton>

            {/* Book a Demo */}
            <NeatCTAButton
              href="/resources/demo-videos"
              className="group relative overflow-hidden flex items-center justify-center gap-2 h-[44px] w-[180px] rounded-[12px] border border-white/10 bg-white/5 text-[16px] font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10"
            >
              {/* Play icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                <polygon points="6.5,5 11,8 6.5,11" fill="currentColor"/>
              </svg>

              {/* Text slide */}
              <span className="relative overflow-hidden h-[1.2em] flex items-center">
                <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                  Book a Demo
                </span>
                <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                  Book a Demo
                </span>
              </span>
            </NeatCTAButton>
          </div>
        </div>
      </div>
    </section>
  );
}