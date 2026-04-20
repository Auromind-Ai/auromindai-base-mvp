"use client";

import { useEffect, useState } from "react";
import StageIndicator from "./StageIndicator";
import dynamic from "next/dynamic";

const BrainCanvas = dynamic(() => import("./BrainCanvas"), {
  ssr: false,
});

export default function NeuroHero() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  const TEXTS = [
    {
        title: "One Inbox for every Conversation.",
        desc: "We seek to illuminate complexities seek to illuminate within you. We seek to illuminate complexities seek to illuminate within you. We seek to illuminate complexities seek to illuminate within you.",
    },
    {
        title: "Build Human-feeling Automations in minutes.",
        desc: "Deep insights into your Deep insights into your cognitive patterns. Deep insights into your Deep insights into your cognitive patterns. Deep insights into your Deep insights into your cognitive patterns.",
    },
    {
        title: "Process Intelligence",
        desc: "Transform thoughts into Transform thoughts into structured clarity. Deep insights thoughts. Thoughts into structured clarity.",
    },
    {
        title: "Generate Outcomes",
        desc: "Turn insights into actionable Turn insights into actionable decisions. Turn insights into actionable Turn insights into actionable decisions. Turn insights into actionable Turn insights into actionable decisions...",
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
    <div id="neuro-section" className="relative h-[400vh]">

        <StageIndicator stage={stage} isVisible={isVisible} />

        <div className="sticky top-0 h-screen">
  
            <div className="sticky top-0 h-screen bg-[#dfeef4] overflow-hidden">
                
                {/* HUMAN IMAGE */}
                <div
                    className="
                        hero-mobile-image
                        absolute bottom-0 right-0 z-10 h-screen

                        md:max-lg:w-[1450px]
                        md:max-lg:translate-x-[300px]
                        md:max-lg:right-0
                        md:max-lg:left-auto
                        md:max-lg:bottom-0
                        md:max-lg:h-full
                        md:max-lg:flex
                        md:max-lg:items-end
                        md:max-lg:translate-x-0

                        max-md:left-1/2
                        max-md:right-auto
                        max-md:bottom-0
                        max-md:h-[600px]
                        max-[375px]:h-[370px]
                        max-md:w-[560px]
                        max-md:-translate-x-1/2
                    "
                    >
                    <div
                    className="
                        relative h-full w-full
                    "
                    >
                        {/* IMAGE */}
                        <img
                        src="/images/Ai-Girltwo.png"
                        className="
                            girl-image
                            h-full object-contain

                            max-md:h-[600px]

                            md:max-lg:w-full
                            md:max-lg:h-[1180px]
                            md:max-lg:object-contain
                            md:max-lg:object-[30%_100%]

                            max-lg:w-full
                            max-lg:h-[500px]                            
                            max-lg:object-top
                            max-lg:object-cover
                        "
                        />

                        {/* BRAIN CANVAS */}
                        <div className="absolute inset-0 pointer-events-none z-20">
                        <BrainCanvas progress={progress} />
                        </div>

                        {/* VIDEO */}
                        <div className="absolute top-[26%] right-[30%] -translate-x-1/2 -translate-y-1/2 head-anim pointer-events-none">

                            {stage === 2 && (
                                <video
                                src="/animations/stage7.webm"
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="none"
                                className="w-full h-full object-cover rounded-full video-tone"
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
                                className="w-full h-full object-cover rounded-full video-tone"
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
                                className="w-full h-full object-cover rounded-full video-tone"
                                />
                            )}

                        </div>
                        <div className="absolute inset-0 bg-gradient-to-l from-black/25 to-transparent pointer-events-none z-20" />

                    </div>
                </div>
         
                {/* TEXT */}
                    <div
  className="
    z-20 overflow-hidden

    absolute left-24 top-[65%] max-w-xl -translate-y-1/2

    md:max-lg:left-10
    md:max-lg:top-1/2
    md:max-lg:max-w-[320px]
    md:max-lg:-translate-y-1/2
    md:max-lg:text-left

    max-md:left-1/2
    max-md:top-[120px]
    max-md:w-[86%]
    max-md:max-w-[320px]
    max-md:-translate-x-1/2
    max-md:translate-y-0
    max-md:text-center
  "
>
                    <div key={stage} className="animate-textIn">
                        <h1
                          className="
                            text-6xl font-[600] leading-[1.05] tracking-tight text-blue-900

                            max-lg:text-4md
                            max-md:text-[30px]
                        "
                        >
                        {current.title}
                        </h1>

                        <p
                          className="
                            mt-4 text-blue-800 opacity-80

                            max-lg:text-base
                            max-lg:leading-7
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