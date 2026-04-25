"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const HeroBackgroundNew = dynamic(() => import("./HeroBackgroundNew"), {
  ssr: false,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function Navbar() {
  return (
    <nav className="relative z-50 flex items-center justify-between px-4 md:px-6 lg:px-8 py-5 md:px-12 xl:px-16">
      <div className="flex items-center gap-3 select-none">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 via-blue-500 to-fuchsia-500 shadow-[0_0_18px_rgba(147,51,234,0.75)]" />
        <span className="text-lg font-semibold tracking-tight text-white">
          Astralis
        </span>
      </div>

      <ul className="hidden items-center gap-8 text-sm font-medium text-white/50 lg:flex">
        {["Product", "Solutions", "Pricing", "Docs", "Blog"].map((item) => (
          <li key={item}>
            <a
              href="#"
              className="transition-colors duration-300 hover:text-white"
            >
              {item}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button className="hidden text-sm text-white/60 transition-colors hover:text-white md:block">
          Sign in
        </button>

        <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10">
          Get started
        </button>
      </div>
    </nav>
  );
}

function AnimatedText({ text, delay = 0 }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          initial={{
            opacity: 0,
            y: 28,
            filter: "blur(14px)",
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
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
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setMounted(true);

    const timer = setTimeout(() => {
      setShowContent(true);
    }, 800); 

    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className={`${poppins.className} relative min-h-screen overflow-hidden bg-[#050505]`}
    >
      {mounted && <HeroBackgroundNew />}

      {showContent && (
        <>

      <Navbar />

      <div className="relative z-30 flex min-h-[calc(100vh-76px)] flex-col items-center justify-center px-4 md:px-6 lg:px-8 pb-20 pt-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={
            showContent
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
              showContent
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

          <div className="relative overflow-hidden h-[16px] md:h-[18px]">
            <motion.span
              initial={{
                y: 18,
                opacity: 0,
                filter: "blur(10px)",
              }}
              animate={{
                y: 0,
                opacity: 1,
                filter: "blur(0px)",
              }}
              transition={{
                duration: 0.55,
                delay: 0.52,
                ease: [0.16, 1, 0.3, 1],
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
          className="mb-5 md:mb-6 max-w-[980px] text-[45px] md:text-[48px] lg:text-[55px] font-semibold leading-[1.1em] tracking-[-2.2px] text-[#FFFFFF]"
        >
          <AnimatedText text="Make the Most Out of Every Single" delay={0.85} />
          <br />
          <motion.span
          initial={{ opacity: 0, y: 28, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 1.45 }}
          className="mb-10 max-w-[650px] text-[16px] md:text-[17px] lg:text-[19px] font-medium leading-[1.9] text-white/72 "
        >
          Scalable Al Sales Assistant for Instagram and WhatsApp. Automate every conversation to close more sales while you sleep.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <button className="h-[36px] w-[129px] rounded-[8px] bg-[#814AC8] text-[13px] font-semibold text-white shadow-[0_0_32px_rgba(109,40,255,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(109,40,255,0.65)] md:h-[42px] md:w-[150px]">
            Get Started Free
          </button>

          <button className="flex items-center justify-center gap-2 h-[36px] w-[129px] rounded-[8px] border border-white/10 bg-white/5 text-[13px] font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 md:h-[42px] md:w-[150px]">

            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="opacity-80"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <polygon points="6.5,5 11,8 6.5,11" fill="currentColor" />
            </svg>
            Book a Demo
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 0.35, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-5"
        >
          {/* <p className="text-[11px] uppercase tracking-[0.3em] text-white/30">
            Trusted by teams at
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10">
            {["Vercel", "Stripe", "Linear", "Notion", "Figma"].map((item) => (
              <span
                key={item}
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/20"
              >
                {item}
              </span>
            ))}
          </div> */}
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30"
        >
          <div className="h-14 w-px bg-gradient-to-b from-white to-transparent" />
        </motion.div>
      </div>
       </>
      )}
    </section>
  );
}