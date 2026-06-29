"use client";

import { useEffect, useRef, useState } from "react";
import StageIndicator from "./StageIndicator";
import BrainCanvas from "./BrainCanvas";

// ─── AutoVideo: always mounted, never unmounts ────────────────────────────────
function AutoVideo({ src, active }) {
  const ref = useRef(null);

  // First mount: force play
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.muted = true;
    vid.play().catch(() => {});
  }, []);

  // When stage switches to this video, resume play
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    if (active) {
      vid.play().catch(() => {});
    }
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover video-tone"
    />
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function NeuroHero() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  const TEXTS = [
    {
      title: "Unified Inbox for Everything.",
      desc: "Manage Instagram, WhatsApp, and more from a single dashboard — no switching tabs.",
    },
    {
      title: "Instant Human-Like Replies",
      desc: "AI replies that sound like you, sent in seconds using your business knowledge.",
    },
    {
      title: "Process Intelligence",
      desc: "Automatically assign leads, trigger follow-ups, and route chats to the right team.",
    },
    {
      title: "Generate Outcomes",
      desc: "Turn conversations into closed deals while you focus on growing your business.",
    },
  ];

  const current = TEXTS[stage - 1] || TEXTS[0];

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

        setProgress(scrollProgress);

        const nowVisible = rect.top <= 0 && rect.bottom >= vh;
        if (nowVisible !== lastVisible) {
          lastVisible = nowVisible;
          setIsVisible(nowVisible);
        }

        let newStage;
        if (scrollProgress < 0.25) newStage = 1;
        else if (scrollProgress < 0.5) newStage = 2;
        else if (scrollProgress < 0.75) newStage = 3;
        else newStage = 4;

        if (newStage !== lastStage) {
          lastStage = newStage;
          setStage(newStage);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div id="neuro-section" className="relative h-[400vh] bg-black">

      <StageIndicator stage={stage} isVisible={isVisible} />

      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-4 md:px-8">

        {/* OUTER CARD */}
        <div
          className="
            relative overflow-hidden
            rounded-2xl md:rounded-[32px]
            w-[88vw]
            max-w-[1280px]
            h-[78vh]
            max-h-[760px]
            mx-auto
          "
          style={{
            background:
              "linear-gradient(135deg, #b48ce8 0%, #9b6fe0 20%, #8b5fd0 40%, #7c4fc8 60%, #9333ea 80%, #7e22ce 100%)",
          }}
        >

          {/* GIRL IMAGE */}
          <div
            className="
              absolute bottom-0 left-[4%] z-10
              h-full w-[55%]
              max-md:w-full max-md:h-[75%]
              max-md:bottom-0 max-md:left-0
            "
          >
            <img
              src="/images/Ai-Girltwo.png"
              className="
                h-full w-full
                object-cover object-[60%_top]
                max-md:object-[50%_top]
              "
              style={{
                filter: "brightness(0.55) contrast(1.1)",
                maskImage: "linear-gradient(to right, rgba(0,0,0,1) 72%, rgba(0,0,0,0.95) 82%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 72%, rgba(0,0,0,0.95) 82%, transparent 100%)",
              }}
            />

            {/* CIRCULAR VIDEO */}
            <div
              className="
                absolute z-30
                top-[18%] left-[46%] md:left-[40%]
                -translate-x-1/2
                w-[190px] h-[190px]
                md:w-[220px] md:h-[220px]
                max-md:w-[140px] max-md:h-[140px]
                max-[375px]:w-[110px] max-[375px]:h-[110px]
              "
            >
              <div className="absolute inset-0 rounded-full" />

              {/* Video circle — relative container */}
              <div className="relative w-full h-full rounded-full overflow-hidden">

                {/* Stage 1: BrainCanvas */}
                <div
                  className="absolute inset-0 w-full h-full transition-opacity duration-300"
                  style={{ opacity: stage === 1 ? 1 : 0 }}
                >
                  <BrainCanvas progress={Math.max(progress, 0.05)} />
                </div>

                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ opacity: stage === 2 ? 1 : 0 }}
                >
                  <AutoVideo src="/animations/stage7.mp4" active={stage === 2} />
                </div>

                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ opacity: stage === 3 ? 1 : 0 }}
                >
                  <AutoVideo src="/animations/stage2.mp4" active={stage === 3} />
                </div>

                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ opacity: stage === 4 ? 1 : 0 }}
                >
                  <AutoVideo src="/animations/stage5.mp4" active={stage === 4} />
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT TEXT */}
          <div
            className="
              absolute z-20
              right-0 top-1/2 -translate-y-1/2
              w-[48%] pr-10 pl-4
              max-w-[520px]
              md:max-lg:w-[52%] md:max-lg:pr-8
              max-md:left-0 max-md:right-0
              max-md:top-[4%]
              max-md:translate-y-0
              max-md:w-full
              max-md:px-6
              max-md:text-center
            "
          >
            <div key={stage} className="animate-textIn">
              <h1
                className="
                  font-bold leading-[1.08] tracking-tight text-white
                  text-[26px]
                  sm:text-5xl
                  md:max-lg:text-4xl
                  lg:text-[3.6rem]
                  max-md:text-[2rem]
                "
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.18)" }}
              >
                {current.title}
              </h1>

              <p
                className="
                  mt-5
                  text-[#E3E3E3]
                  text-[18px]
                  leading-[1.2]
                  tracking-normal
                  font-normal
                  max-md:text-[16px]
                  max-md:mt-3
                "
              >
                {current.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}