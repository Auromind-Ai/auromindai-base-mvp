"use client";

import { useEffect, useState } from "react";
import StageIndicator from "./StageIndicator";
import BrainCanvas from "./BrainCanvas";

export default function NeuroHero() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  const TEXTS = [
    {
        title: "Unified Inbox for Everything.",
        desc: "We seek to illuminate complexities seek to illuminate within you.",
    },
    {
        title: "Human-like Replies. Instantly.",
        desc: "Deep insights into your Deep insights into your cognitive patterns.",
    },
    {
        title: "Process Intelligence",
        desc: "Transform thoughts into Transform thoughts into structured clarity.",
    },
    {
        title: "Generate Outcomes",
        desc: "Turn insights into actionable Turn insights into actionable decisions.",
    },
    ];

    const current = TEXTS[stage - 1] || TEXTS[0];

  useEffect(() => {
    const section = document.getElementById("neuro-section");

    const handleScroll = () => {
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        const scrollProgress = Math.min(
           Math.max(-rect.top / (rect.height - vh), 0),
           1
        );

        setProgress(scrollProgress);

        if (rect.top <= 0 && rect.bottom >= vh) {
            setIsVisible(true);
            } else {
            setIsVisible(false);
        }

        if (scrollProgress < 0.25) setStage(1);
        else if (scrollProgress < 0.5) setStage(2);
        else if (scrollProgress < 0.75) setStage(3);
        else setStage(4);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    }, []);

  return (
    <div id="neuro-section" className="relative h-[400vh] bg-black">

        <StageIndicator stage={stage} isVisible={isVisible} />

        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-4 md:px-8">

          {/* OUTER CARD — rounded purple gradient container */}
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

            {/* GIRL IMAGE — left side, large */}
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

              {/* CIRCULAR VIDEO — positioned near girl's brain/head area */}
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
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  
                />

                {/* Video circle */}
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  {/* BrainCanvas sphere (stage 1 - no video) */}
                  {stage === 1 && (
                    <div className="w-full h-full">
                      <BrainCanvas progress={Math.max(progress, 0.05)} />
                    </div>
                  )}

                  {stage === 2 && (
                    <video
                      src="/animations/stage7.webm"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="none"
                      className="w-full h-full object-cover video-tone"
                    />
                  )}

                  {stage === 3 && (
                    <video
                      src="/animations/stage2.webm"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="none"
                      className="w-full h-full object-cover video-tone"
                    />
                  )}

                  {stage === 4 && (
                    <video
                      src="/animations/stage5.webm"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="none"
                      className="w-full h-full object-cover video-tone"
                    />
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT TEXT — vertically centered */}
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
                    mt-5 leading-relaxed
                    text-white/75
                    text-lg
                    max-md:text-base
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