"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StageIndicator from "./StageIndicator";
import { stages } from "./Data";

export default function InteractiveBrainSection() {
  const [currentStage, setCurrentStage] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const isAnimatingRef = useRef(false);
  const touchStartY = useRef(0);
  const videoRef = useRef(null);
  const sectionRef = useRef(null);
  const lastScrollTime = useRef(0);

  // Tracks whether the user has already landed on Stage 1 via upward scroll
  // and needs ONE MORE upward scroll to actually unlock and go to previous section.
  const atStage1AwaitingUnlockRef = useRef(false);

  const DEBOUNCE_MS = 700;

  const stageData = stages[currentStage - 1];

  // Intersection Observer — lock section when it enters viewport, reset to Stage 1
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && !unlocking) {
          // Reset to Stage 1 and lock whenever section enters viewport fresh
          setCurrentStage(1);
          atStage1AwaitingUnlockRef.current = false;
          setIsLocked(true);
          window.dispatchEvent(new Event("section-scroll-lock"));
        }

        if (!visible) {
          setIsLocked(false);
          window.dispatchEvent(new Event("section-scroll-unlock"));
        }

        // Unlock going down (after Stage 4):
        setIsLocked(false);
        window.dispatchEvent(new Event("section-scroll-unlock"));   // ← add

        // Unlock going up (after Stage 1):
        setIsLocked(false);
        window.dispatchEvent(new Event("section-scroll-unlock"));   // ← add
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [unlocking]);

  const handleStageChange = useCallback(
    (direction) => {
      if (!isLocked || isAnimatingRef.current) return false;

      // ── DOWN ──────────────────────────────────────────────────────────────
      if (direction === "down") {
        // Reset the "awaiting unlock on up" flag whenever user scrolls down
        atStage1AwaitingUnlockRef.current = false;

        if (currentStage < 4) {
          isAnimatingRef.current = true;
          setCurrentStage((prev) => prev + 1);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, DEBOUNCE_MS);
          return true; // consumed — page stays locked
        }

        // Already at Stage 4 — unlock and let page scroll to next section
        isAnimatingRef.current = true;
        setUnlocking(true);
        setIsLocked(false);
        setTimeout(() => {
          setUnlocking(false);
          isAnimatingRef.current = false;
        }, 300);
        return false; // not consumed — page scrolls
      }

      // ── UP ────────────────────────────────────────────────────────────────
      if (direction === "up") {
        if (currentStage > 1) {
          // Still have stages above — move up one stage
          isAnimatingRef.current = true;
          atStage1AwaitingUnlockRef.current = false;
          setCurrentStage((prev) => prev - 1);
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, DEBOUNCE_MS);
          return true; // consumed — stay locked
        }

        // currentStage === 1
        if (!atStage1AwaitingUnlockRef.current) {
          // First upward scroll at Stage 1: mark that we need one MORE upward scroll.
          // Do NOT unlock yet. Consume this scroll so page doesn't jump.
          atStage1AwaitingUnlockRef.current = true;
          isAnimatingRef.current = true;
          setTimeout(() => {
            isAnimatingRef.current = false;
          }, DEBOUNCE_MS);
          return true; // consumed — stay locked
        }

        // Second upward scroll at Stage 1: now unlock and allow going to previous section
        isAnimatingRef.current = true;
        atStage1AwaitingUnlockRef.current = false;
        setUnlocking(true);
        setIsLocked(false);
        setTimeout(() => {
          setUnlocking(false);
          isAnimatingRef.current = false;
        }, 300);
        return false; // not consumed — page scrolls up
      }

      isAnimatingRef.current = false;
      return false;
    },
    [currentStage, isLocked]
  );

  // Wheel event
  useEffect(() => {
    const onWheel = (e) => {
      if (!isLocked) return;

      const now = Date.now();
      if (now - lastScrollTime.current < DEBOUNCE_MS) {
        e.preventDefault();
        return;
      }
      lastScrollTime.current = now;

      const direction = e.deltaY > 0 ? "down" : "up";
      const consumed = handleStageChange(direction);

      if (consumed) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isLocked, handleStageChange]);

  // Touch events
  useEffect(() => {
    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (!isLocked) return;

      const now = Date.now();
      if (now - lastScrollTime.current < DEBOUNCE_MS) {
        e.preventDefault();
        return;
      }
      lastScrollTime.current = now;

      const currentY = e.touches[0].clientY;
      const diff = touchStartY.current - currentY;

      if (Math.abs(diff) < 40) return;

      const direction = diff > 0 ? "down" : "up";
      const consumed = handleStageChange(direction);

      if (consumed) {
        e.preventDefault();
        touchStartY.current = currentY;
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isLocked, handleStageChange]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (!isLocked) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        const consumed = handleStageChange("down");
        if (consumed) e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        const consumed = handleStageChange("up");
        if (consumed) e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLocked, handleStageChange]);

  // Video management — persistent element, only swap src when needed
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

    const onCanPlay = () => {
      video.play().catch(() => {});
    };
    video.addEventListener("canplay", onCanPlay, { once: true });
  }, [currentStage, stageData.video]);

  return (
    <>
      <section ref={sectionRef} className="relative h-[300vh] w-full bg-black">
        <div className="sticky top-0 h-screen flex items-center justify-center px-4 md:px-10">
          <div
            className="relative w-[62vw] h-[78vh] min-h-[620px] max-w-[1180px] rounded-[40px] overflow-hidden flex items-center"
            style={{
              background:
                "linear-gradient(180deg, #d8c3f2 0%, #c8a7f3 38%, #b07af0 72%, #9c4df4 100%)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }}
          >
            {/* Left side */}
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

            {/* Right side */}
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
                isVisible={isVisible && isLocked}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}