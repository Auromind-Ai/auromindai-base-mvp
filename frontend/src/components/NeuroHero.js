"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { poppins } from "@/lib/fonts";
import { Check, Zap } from "lucide-react";

export default function NeuroHero() {
  const [stage, setStage] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = document.getElementById("neuro-section");
    if (!section) return;

    let rafId = 0;
    let lastStage = 1;
    let lastVisible = false;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        const scrollProgress = Math.min(
          Math.max(-rect.top / (rect.height - vh), 0),
          1
        );

        const nowVisible = rect.top <= 100 && rect.bottom >= vh - 100;
        if (nowVisible !== lastVisible) {
          lastVisible = nowVisible;
          setIsVisible(nowVisible);
        }

        // 2 Stages: 1 for first half, 2 for second half
        const newStage = scrollProgress < 0.5 ? 1 : 2;
        if (newStage !== lastStage) {
          lastStage = newStage;
          setStage(newStage);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      id="neuro-section"
      className={`relative h-[200vh] bg-black text-white ${poppins.className}`}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-3 sm:px-6 lg:px-8">
        {/* MAIN CONTAINER CARD */}
        <div
          className="
            relative overflow-hidden
            rounded-2xl sm:rounded-3xl md:rounded-[36px] lg:rounded-[40px]
            w-[94vw] max-w-[1260px]
            h-[82vh] sm:h-[86vh] lg:h-[88vh] max-h-[600px] sm:max-h-[680px] lg:max-h-[760px] min-h-[520px] sm:min-h-[600px]
            mx-auto
            border-t border-l border-white/15 border-b-0 border-r-0
            shadow-[0_20px_80px_rgba(0,0,0,0.85)]
            transition-all duration-700
          "
          style={{
            background:
              stage === 1
                ? "radial-gradient(ellipse 95% 80% at 72% 25%, rgba(147, 51, 234, 0.78) 0%, rgba(124, 58, 237, 0.45) 45%, transparent 80%), radial-gradient(ellipse 70% 60% at 20% 20%, rgba(139, 92, 246, 0.5) 0%, transparent 65%), linear-gradient(145deg, #7c3aed 0%, #5b1fa6 30%, #290d4f 65%, #0d041c 100%)"
                : "radial-gradient(ellipse 95% 80% at 28% 25%, rgba(147, 51, 234, 0.78) 0%, rgba(124, 58, 237, 0.45) 45%, transparent 80%), radial-gradient(ellipse 70% 60% at 80% 20%, rgba(139, 92, 246, 0.5) 0%, transparent 65%), linear-gradient(145deg, #7c3aed 0%, #5b1fa6 30%, #290d4f 65%, #0d041c 100%)",
          }}
        >
          {/* Stage Indicator Dots on Right Inside Card */}
          <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-3 z-30 pointer-events-none">
            <span
              className={`rounded-full transition-all duration-500 ${
                stage === 1
                  ? "w-3 h-3 bg-purple-200 shadow-[0_0_20px_rgba(192,132,252,0.95)] ring-2 ring-purple-300/60"
                  : "w-1.5 h-1.5 bg-white/40"
              }`}
            />
            <span
              className={`rounded-full transition-all duration-500 ${
                stage === 2
                  ? "w-3 h-3 bg-purple-200 shadow-[0_0_20px_rgba(192,132,252,0.95)] ring-2 ring-purple-300/60"
                  : "w-1.5 h-1.5 bg-white/40"
              }`}
            />
          </div>

          <AnimatePresence mode="wait">
            {stage === 1 ? (
              /* STAGE 1: THE PROBLEM (MALE SILHOUETTE + FLOATING INCOMING MESSAGES)  */
              <motion.div
                key="stage-problem"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="relative w-full h-full flex flex-col lg:flex-row items-center justify-between z-10 overflow-hidden"
              >
                {/* PROBLEM CONTENT (Top-Center on mobile/tablet, Left on desktop) */}
                <div className="relative w-full lg:w-[52%] xl:w-[50%] mx-auto lg:mr-auto lg:ml-0 flex flex-col items-center lg:items-start text-center lg:text-left justify-start lg:justify-center h-full z-20 space-y-2.5 sm:space-y-4 lg:space-y-6 pt-5 sm:pt-8 md:pt-10 lg:pt-0 px-4 sm:px-8 md:px-12 lg:p-10 xl:p-14 lg:pr-8 xl:pr-12">
                  {/* Badge */}
                  <div className="flex justify-center lg:justify-start w-full">
                    <div className="inline-flex items-center px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-medium text-white/95 bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
                      The Problem
                    </div>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] xl:text-[46px] font-semibold tracking-tight text-white leading-[1.14] text-center lg:text-left mx-auto lg:mx-0">
                    Important <br className="hidden sm:inline" />
                    conversations get <br className="hidden sm:inline" />
                    missed everyday
                  </h2>

                  {/* Subtitle / Problem Content */}
                  <p className="text-white/80 text-xs sm:text-sm md:text-[15px] lg:text-[16px] font-normal leading-relaxed max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md text-center lg:text-left mx-auto lg:mx-0">
                    Slow replies, manual followups and disconnected chats leads to lost customers.
                  </p>
                </div>

                {/* MALE SILHOUETTE + FLOATING INCOMING MESSAGES */}
                <div className="
                  absolute bottom-0
                  left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-auto lg:right-0
                  w-full max-w-[100%] sm:max-w-[78%] md:max-w-[65%] lg:max-w-[45%] xl:max-w-[46%] 2xl:max-w-[48%]
                  h-[58%] sm:h-[54%] md:h-[58%] lg:h-[80%] xl:h-[82%] 2xl:h-[84%]
                  flex items-end justify-center lg:justify-end
                  pointer-events-none z-10 pr-0
                ">
                  <div
                    className="relative h-full aspect-[1371/1148] max-w-full flex items-end justify-center lg:justify-end"
                    style={{ aspectRatio: "1371 / 1148" }}
                  >
                    {/* Male Silhouette Image */}
                    <Image
                      src="/images/Male_Shadow.png"
                      alt="Customer Silhouette"
                      width={1371}
                      height={1148}
                      priority
                      className="w-full h-full object-contain object-bottom lg:object-bottom-right pointer-events-none select-none"
                    />

                    {/* 1. Twilio Card (Top Center above head on mobile, desktop: top: -2%, left: 48%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.15 },
                        y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.15 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 -top-[13.5%] lg:-top-[2%] left-1/2 lg:left-[48%] -translate-x-1/2 -translate-y-1/2"
                    >
                      {/* Twilio Red 4-dot Icon */}
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#F22F46] flex items-center justify-center shrink-0 shadow-sm">
                        <div className="grid grid-cols-2 gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        </div>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-semibold text-gray-900 leading-tight whitespace-nowrap">Any Update ?</span>
                        <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">10.05 AM</span>
                      </div>
                    </motion.div>

                    {/* 2. Instagram Card (Left: top-[5%] left-[22%] on mobile, desktop: top: 18%, left: 10%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.25 },
                        y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.4 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 top-[5%] lg:top-[18%] left-[22%] lg:left-[10%] -translate-x-1/2 -translate-y-1/2"
                    >
                      {/* Instagram Icon */}
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shrink-0 p-1 shadow-sm">
                        <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="20" rx="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-semibold text-gray-900 leading-tight whitespace-nowrap">Can I get a demo ?</span>
                        <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">11:10 AM</span>
                      </div>
                    </motion.div>

                    {/* 3. WhatsApp Card (Right: top-[5%] left-[76%] on mobile, desktop: top: 18%, left: 68%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.35 },
                        y: { repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 0.7 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 top-[5%] lg:top-[18%] left-[76%] lg:left-[68%] -translate-x-1/2 -translate-y-1/2"
                    >
                      {/* WhatsApp Icon */}
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0 p-1 shadow-sm">
                        <svg className="w-full h-full fill-white" viewBox="0 0 24 24">
                          <path d="M17.5 14.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 .9-.2.1-.4 0-.7-.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.4z"/>
                        </svg>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-semibold text-gray-900 leading-tight whitespace-nowrap">Is this available ?</span>
                        <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">10.55 AM</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* STAGE 2: THE SOLUTION (GIRL SILHOUETTE + FLOATING AI SOLUTION PILLS) */
              <motion.div
                key="stage-solution"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="relative w-full h-full flex flex-col lg:flex-row items-center justify-between z-10 overflow-hidden"
              >
                {/* GIRL SILHOUETTE + VIDEO + FLOATING SOLUTION PILLS */}
                <div className="
                  absolute bottom-0
                  left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-0
                  w-full max-w-[100%] sm:max-w-[78%] md:max-w-[65%] lg:max-w-[45%] xl:max-w-[46%] 2xl:max-w-[48%]
                  h-[56%] sm:h-[52%] md:h-[56%] lg:h-[80%] xl:h-[82%] 2xl:h-[84%]
                  flex items-end justify-center lg:justify-start
                  pointer-events-none z-10 pl-0
                ">
                  <div
                    className="relative h-full aspect-[1240/1269] max-w-full flex items-end justify-center lg:justify-start"
                    style={{ aspectRatio: "1240 / 1269" }}
                  >
                    {/* Female Profile Image */}
                    <Image
                      src="/images/Girl_Shadow.png"
                      alt="Girl Solution Silhouette"
                      width={1240}
                      height={1269}
                      priority
                      className="w-full h-full object-contain object-bottom lg:object-bottom-left pointer-events-none select-none"
                    />

                    {/* Video playing inside Girl Silhouette Head (Exact Red Circle Marked Position: top 34.3%, left 49.2%) */}
                    <div
                      className="absolute pointer-events-none rounded-full overflow-hidden flex items-center justify-center z-20"
                      style={{
                        top: "34.3%",
                        left: "49.2%",
                        transform: "translate(-50%, -50%)",
                        width: "24%",
                        aspectRatio: "1 / 1",
                      }}
                    >
                      <video
                        src="/animations/stage22.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover rounded-full pointer-events-none"
                      />
                    </div>

                    {/* 1. Top Pill: AI replies instantly (Top Center: -top-[13.5%] left-1/2 on mobile, desktop: -top-[11.5%], left: 49%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.15 },
                        y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.15 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 -top-[13.5%] lg:-top-[11.5%] left-1/2 lg:left-[49%] -translate-x-1/2 -translate-y-1/2"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black text-black stroke-black shrink-0" />
                      <span className="text-xs sm:text-[13px] font-semibold text-gray-900 whitespace-nowrap">AI replies instantly</span>
                      <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0 ml-0.5">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                      </div>
                    </motion.div>

                    {/* 2. Left Pill: Qualifies the lead (Left: top-[5%] left-[22%] on mobile, desktop: top: 1.5%, left: 16%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.25 },
                        y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.4 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 top-[5%] lg:top-[1.5%] left-[22%] lg:left-[16%] -translate-x-1/2 -translate-y-1/2"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black text-black stroke-black shrink-0" />
                      <span className="text-xs sm:text-[13px] font-semibold text-gray-900 whitespace-nowrap">Qualifies the lead</span>
                      <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0 ml-0.5">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                      </div>
                    </motion.div>

                    {/* 3. Right Pill: Sends payment link (Right: top-[5%] left-[76%] on mobile, desktop: top: 0%, left: 89%) */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.35 },
                        y: { repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 0.7 }
                      }}
                      className="absolute z-30 pointer-events-none bg-white text-gray-900 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 border border-white/90 scale-75 sm:scale-85 md:scale-95 lg:scale-100 top-[5%] lg:top-[0%] left-[76%] lg:left-[89%] -translate-x-1/2 -translate-y-1/2"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black text-black stroke-black shrink-0" />
                      <span className="text-xs sm:text-[13px] font-semibold text-gray-900 whitespace-nowrap">Sends payment link</span>
                      <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0 ml-0.5">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* SOLUTION CONTENT (Top-Center on mobile/tablet, Right on desktop) */}
                <div className="relative w-full lg:w-[52%] xl:w-[50%] mx-auto lg:ml-auto lg:mr-0 flex flex-col items-center lg:items-start text-center lg:text-left justify-start lg:justify-center h-full z-20 space-y-2.5 sm:space-y-4 lg:space-y-6 pt-5 sm:pt-7 md:pt-9 lg:pt-0 px-4 sm:px-8 md:px-12 lg:p-10 xl:p-14 lg:pl-8 xl:pl-12">
                  {/* Badge */}
                  <div className="flex justify-center lg:justify-start w-full">
                    <div className="inline-flex items-center px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-medium text-white/95 bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
                      The Solution
                    </div>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] xl:text-[46px] font-semibold tracking-tight text-white leading-[1.14] text-center lg:text-left mx-auto lg:mx-0">
                    One AI <br className="hidden sm:inline" />
                    every conversations <br className="hidden sm:inline" />
                    handled
                  </h2>

                  {/* Subtitle */}
                  <p className="text-white/80 text-xs sm:text-sm md:text-[15px] lg:text-[16px] font-normal leading-relaxed max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md text-center lg:text-left mx-auto lg:mx-0">
                    Orbionagents responds instantly, qualifies leads and automates the next steps — turning conversations into customers.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
