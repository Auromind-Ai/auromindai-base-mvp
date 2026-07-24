"use client";

import { useEffect, useRef, useState } from "react";
import StageIndicator from "./StageIndicator";
import BrainCanvas from "./BrainCanvas";
import Image from "next/image";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

function AutoVideo({ src, active }) {
  const ref = useRef(null);

  // Play only when active, pause when inactive to save system resources
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.muted = true;
    if (active) {
      vid.dataset.stageActive = "true";
      vid.play().catch(() => {});
    } else {
      vid.dataset.stageActive = "false";
      vid.pause();
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

  // ─── iOS Video Unlock ──────────────────────────────────────────────
  useEffect(() => {
    const unlockiOS = () => {
      document.querySelectorAll("video").forEach((vid) => {
        vid.muted = true;
        vid.play()
          .then(() => {
            if (vid.dataset.stageActive !== "true") {
              vid.pause();
            }
          })
          .catch(() => {});
      });
      document.removeEventListener("touchstart", unlockiOS);
    };

    document.addEventListener("touchstart", unlockiOS, {
      once: true,
      passive: true,
    });

    return () => document.removeEventListener("touchstart", unlockiOS);
  }, []);


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
    <div id="neuro-section" className={`relative h-[400vh] bg-black ${poppins.className}`}>

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
              absolute bottom-0 left-0 z-10
              w-full h-[72%] max-md:h-[75%]
              lg:left-0 lg:w-[56%] xl:left-[4%] xl:w-[55%] lg:h-full
            "
          >
            <Image
              src="/images/Ai-Girltwo.webp"
              alt="AI Girl Hero Illustration"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="
                h-full w-full
                object-cover object-[50%_top]
                lg:object-[50%_top]
                xl:object-[60%_top]
              "
              style={{
                filter: "brightness(0.55) contrast(1.1)",
              }}
            />

            {/* CIRCULAR VIDEO */}
            <div
              className="
                absolute z-30
                top-[18%] left-[46%] lg:max-xl:left-[43%] xl:left-[40%]
                -translate-x-1/2
                w-[140px] h-[140px]
                max-[375px]:w-[110px] max-[375px]:h-[110px]
                md:max-lg:w-[180px] md:max-lg:h-[180px]
                lg:max-xl:w-[180px] lg:max-xl:h-[180px] lg:max-xl:top-[20%]
                xl:w-[220px] xl:h-[220px]
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
                  <AutoVideo src="/animations/stage77.mp4" active={stage === 2} />
                </div>

                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ opacity: stage === 3 ? 1 : 0 }}
                >
                  <AutoVideo src="/animations/stage22.mp4" active={stage === 3} />
                </div>

                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ opacity: stage === 4 ? 1 : 0 }}
                >
                  <AutoVideo src="/animations/stage55.mp4" active={stage === 4} />
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT / TOP TEXT */}
          <div
            className="
              absolute z-20
              left-0 right-0 top-[4%] translate-y-0 w-full px-6 text-center mx-auto
              md:max-lg:px-10 md:max-lg:max-w-[700px]
              lg:left-auto lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-[44%] xl:w-[48%] lg:max-w-[440px] xl:max-w-[520px] lg:pr-6 xl:pr-10 lg:pl-0 xl:pl-4 lg:px-0 lg:text-left
            "
          >
            <div key={stage} className="animate-textIn">
              <h1
                className="
                  font-bold tracking-tight text-white
                  text-[26px]
                  max-md:text-[2rem] max-md:leading-[1.08]
                  md:max-lg:text-4xl md:max-lg:leading-[1.08]
                  lg:text-[2.25rem] lg:leading-[1.12]
                  xl:text-[3.6rem] xl:leading-[1.08]
                "
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.18)" }}
              >
                {current.title}
              </h1>

              <p
                className="
                  text-[#E3E3E3]
                  font-normal
                  tracking-normal
                  max-md:text-[16px] max-md:mt-3 max-md:leading-[1.2]
                  md:max-lg:text-[17px] md:max-lg:mt-3 md:max-lg:leading-[1.2] md:max-lg:max-w-[580px] md:max-lg:mx-auto
                  lg:text-[15px] lg:mt-3 lg:leading-[1.3]
                  xl:text-[18px] xl:mt-5 xl:leading-[1.2]
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