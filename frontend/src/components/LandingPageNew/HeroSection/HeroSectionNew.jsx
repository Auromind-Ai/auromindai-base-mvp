"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const HeroBackgroundNew = dynamic(() => import("./HeroBackgroundNew"), {
  ssr: false,
});

import NeatCTAButton from "@/components/ui/NeatCTAButton";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function AnimatedText({ text, delay = 0 }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          initial={{
            opacity: 0,
            y: 28,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.9,
            delay: delay + index * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block will-change-transform text-inherit"
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </>
  );
}

export default function HeroSectionNew() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      className={`${poppins.className} relative min-h-screen overflow-hidden bg-[#050505]`}
    >
      {mounted && <HeroBackgroundNew />}
      <div className="relative z-30 flex min-h-[calc(100vh-76px)] flex-col items-center justify-center px-4 md:px-6 lg:px-8 pb-20 pt-8 text-center translate-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={
            mounted
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 20, scale: 0.96 }
          }
          transition={{
            duration: 0.9,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mb-4 mt-4 md:mt-0 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-[rgba(74,34,120,0.45)] px-2 py-2 pr-5 backdrop-blur-2xl shadow-[0_0_40px_rgba(108,69,255,0.18)]"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={
              mounted
                ? { opacity: 1, scale: 1, rotate: 0 }
                : { opacity: 0, scale: 0.8, rotate: -8 }
            }
            transition={{
              duration: 0.55,
              delay: 0.58,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#4f7cff] px-3 py-1 text-[9px] md:text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_22px_rgba(124,58,237,0.55)]"
          >
            ✦ The Future
          </motion.span>

          <div className="relative overflow-hidden h-[18px] md:h-[20px]">
            <motion.span
              initial={{
                y: "100%",
                opacity: 0,
              }}
              animate={{
                y: "0%",
                opacity: 1,
              }}
              transition={{
                duration: 0.7,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="block text-[12px] md:text-[14px] font-medium text-white/70"
            >
              of Sale is here
            </motion.span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.65 }}
          className="mb-5 md:mb-6 max-w-[980px] text-[32px] sm:text-[40px] md:text-[48px] lg:text-[55px] font-semibold leading-[1.15em] tracking-[-1.5px] md:tracking-[-2.2px] text-[#FFFFFF]"
        >
          <AnimatedText text="Make the Most Out of Every Single" delay={0.85} />
          <br />
          <motion.span
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 1.05,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block text-[#FFFFFF]"
          style={{}}
        >
           Conversation.
        </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.45 }}
          className="mb-10 max-w-[650px] text-[14px] sm:text-[16px] md:text-[17px] lg:text-[19px] font-medium leading-[1.9] text-white/72 px-2 sm:px-0"
        >
          Scalable Al Sales Assistant for Instagram and WhatsApp. Automate every conversation to close more sales while you sleep.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {/* Get Started Free Button */}
          <NeatCTAButton
            href="/signup"
            className="group relative overflow-hidden h-[36px] w-[145px] rounded-[8px] bg-[#814AC8] text-[14px] font-semibold text-white shadow-[0_0_32px_rgba(109,40,255,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(109,40,255,0.65)] md:h-[42px] md:w-[165px]"
          >
            <span className="flex items-center justify-center gap-2 w-full h-full">
              
              {/* Text slide animation */}
              <span className="relative overflow-hidden h-[1.2em] flex items-center">
                {/* Original text - slides down on hover */}
                <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                  Get Started Free
                </span>
                {/* Clone text - slides in from bottom on hover */}
                <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                  Get Started Free
                </span>
              </span>

              {/* Icon swap animation */}
              <span className="relative w-[14px] h-[14px] flex items-center justify-center overflow-hidden">
                {/* Diagonal arrow ↗ - default */}
                <span className="absolute transition-all duration-300 ease-in-out opacity-100 group-hover:opacity-0 group-hover:-translate-y-2 group-hover:translate-x-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {/* Right arrow → - on hover */}
                <span className="absolute transition-all duration-300 ease-in-out opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </span>

            </span>
          </NeatCTAButton>

          {/* Book a Demo Button */}
          <NeatCTAButton
            href="/resources/demo-videos"
            className="group relative overflow-hidden flex items-center justify-center gap-2 h-[36px] w-[145px] rounded-[8px] border border-white/10 bg-white/5 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 md:h-[42px] md:w-[165px]"
          >
            {/* Play icon - static */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="opacity-80 flex-shrink-0"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
              <polygon points="6.5,5 11,8 6.5,11" fill="currentColor"/>
            </svg>

            {/* Text slide animation */}
            <span className="relative overflow-hidden h-[1.2em] flex items-center">
              <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                Book a Demo
              </span>
              <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                Book a Demo
              </span>
            </span>
          </NeatCTAButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 0.35, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-5"
        >
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30"
        >
          <div className="h-14 w-px bg-gradient-to-b from-white to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}