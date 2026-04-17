"use client";
import HeroContent from "./HeroContent";
import HeroCard from "./HeroCard";
import ParticleWave from "./ParticleWave";
import FloatingOrb from "./FloatingOrb";

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-[#f8f7ff] flex items-center">
      {/* Background layers */}
      <FloatingOrb />
      <div className="absolute inset-0 z-[1]">
        <ParticleWave />
      </div>

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-24 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-14 lg:gap-8">
          {/* Left */}
          <div className="w-full lg:w-[52%]">
            <HeroContent />
          </div>

          {/* Right */}
          <div className="w-full lg:w-[44%] flex justify-center lg:justify-end">
            <HeroCard />
          </div>
        </div>
      </div>
    </section>
  );
}
