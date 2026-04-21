"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StageIndicator from "./StageIndicator";
import { stages } from "./Data";

export default function InteractiveBrainSection() {
  const [currentStage, setCurrentStage] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  const videoRef = useRef(null);
  const sectionRef = useRef(null);

  const stageData = stages[currentStage - 1];

  // ── SCROLL → STAGE (only change from original) ──────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const scrolled = -top;
      const scrollable = height - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, scrolled / scrollable));
      setCurrentStage(Math.min(4, Math.floor(progress * 4) + 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── VISIBILITY for StageIndicator ───────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // ── VIDEO (unchanged) ────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const nextSrc = currentStage >= 2 ? stageData.video : null;
    if (!video) return;
    if (!nextSrc) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }
    if (video.dataset.currentSrc === nextSrc) return;
    video.dataset.currentSrc = nextSrc;
    video.pause();
    video.src = nextSrc;
    video.load();
    const onCanPlay = () => video.play().catch(() => {});
    video.addEventListener("canplay", onCanPlay, { once: true });
  }, [currentStage, stageData.video]);

  return (
    // ── ONLY JSX CHANGE: wrapper div replaces <> ──────────────────────────
    <div
      id="interactive-brain-section"
      ref={sectionRef}
      className="relative h-[400vh]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <section className="relative h-full w-full bg-black">
          <div className="sticky top-0 h-screen flex items-center justify-center px-4 md:px-10">
            <div
              className="relative w-[62vw] h-[78vh] min-h-[620px] max-w-[1180px] rounded-[40px] overflow-hidden flex items-center"
              style={{
                background:
                  "linear-gradient(180deg, #d8c3f2 0%, #c8a7f3 38%, #b07af0 72%, #9c4df4 100%)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              }}
            >
              {/* Left side — UNCHANGED */}
              <div className="relative w-[58%] h-full flex items-end justify-start overflow-hidden">
                <img
                  src="/images/Ai-Girltwo.png"
                  alt="AI Girl"
                  className="absolute bottom-[-12%] left-[-58%] h-[118%] w-auto max-w-none object-contain"
                  style={{
                    filter:
                      "brightness(0.42) saturate(0.75) contrast(1.05) hue-rotate(-8deg) drop-shadow(0 18px 40px rgba(24,10,40,0.45))",
                  }}
                />

                <motion.div
                  initial={false}
                  animate={{
                    opacity: currentStage >= 2 ? 1 : 0,
                    scale: currentStage >= 2 ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.25 }}
                  className="absolute rounded-full overflow-hidden"
                  style={{
                    top: "18%",
                    left: "38%",
                    width: "230px",
                    height: "230px",
                    transform: "translate(-50%, -50%)",
                    boxShadow: "inset 0 0 24px rgba(0,0,0,0.28)",
                    background: "#141018",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover will-change-transform"
                    style={{ filter: "brightness(1) saturate(1) contrast(1)" }}
                  />
                </motion.div>

                {currentStage === 1 && (
                  <motion.div
                    animate={{
                      opacity: [0.25, 0.65, 0.25],
                      scale: [0.95, 1.05, 0.95],
                    }}
                    transition={{ duration: 2.8, repeat: Infinity }}
                    className="absolute rounded-full"
                    style={{
                      top: "18%",
                      left: "38%",
                      width: "230px",
                      height: "230px",
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(circle, rgba(93,176,255,0.65) 0%, rgba(93,176,255,0.12) 55%, transparent 78%)",
                      filter: "blur(10px)",
                    }}
                  />
                )}
              </div>

              {/* Right side — UNCHANGED */}
              <div className="relative w-[42%] h-full flex items-center pl-[3vw] pr-[5.5vw]">
                <AnimatePresence initial={false} mode="sync">
                  <motion.div
                    key={`text-${currentStage}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.45 }}
                    className="max-w-[420px]"
                  >
                    <div className="mb-5 inline-flex items-center gap-3 text-white/80 uppercase tracking-[0.32em] text-[11px] font-medium">
                      <span className="w-8 h-px bg-white/45" />
                      {stageData.badge}
                    </div>

                    <div className="mb-4 text-sm tracking-[0.28em] text-white/55 font-medium">
                      {String(currentStage).padStart(2, "0")} / 04
                    </div>

                    <h2 className="text-white font-semibold leading-[1.05] text-[clamp(2.5rem,4vw,4.5rem)] max-w-[460px] mb-6">
                      {stageData.title}
                    </h2>

                    <p className="text-white/78 text-[18px] leading-[1.6] max-w-[420px]">
                      {stageData.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <StageIndicator
                  stage={currentStage}
                  isVisible={isVisible}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}