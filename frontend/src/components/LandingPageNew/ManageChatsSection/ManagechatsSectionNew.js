"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  MessageCircleMore,
  Check,
} from "lucide-react";

export default function ManageChatsSection() {
  const sectionRef = useRef(null);
  const [mouse, setMouse] = useState({ x: -9999, y: -9999 });
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [hoveredCard, setHoveredCard] = useState(null);


  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);

    const handleMouseMove = (event) => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();

      setMouse({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", updateWidth);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const particles = useMemo(() => {
    const count = viewportWidth < 640 ? 70 : viewportWidth < 1024 ? 110 : 160;

    const colors = [
      "rgba(255,255,255,0.10)",
      "rgba(255,255,255,0.06)",
      "rgba(168,85,247,0.12)",
      "rgba(59,130,246,0.10)",
    ];

    return Array.from({ length: count }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.12 + 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
      floatX: (Math.random() - 0.5) * 28,
      floatY: (Math.random() - 0.5) * 28,
      duration: Math.random() * 5 + 3,
    }));
  }, [viewportWidth]);

  const cardRotateX = sectionRef.current
    ? ((mouse.y - sectionRef.current.offsetHeight / 2) /
        sectionRef.current.offsetHeight) *
      -6
    : 0;

  const cardRotateY = sectionRef.current
    ? ((mouse.x - sectionRef.current.offsetWidth / 2) /
        sectionRef.current.offsetWidth) *
      6
    : 0;

  const rows = [1, 2, 3];

  return (
    <section
    ref={sectionRef}
    className="relative min-h-[980px] overflow-hidden bg-[#050505] px-5 pt-20 pb-8 sm:px-6 sm:pb-24 lg:min-h-[920px] lg:pt-28 lg:pb-24"
    >
      <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-purple-600/20 via-transparent to-blue-500/10" />

      <div className="absolute inset-0 z-0 overflow-hidden">
        {particles.map((particle) => {
          const particleX = (particle.x / 100) * viewportWidth;
          const particleY = (particle.y / 100) *
            (sectionRef.current?.offsetHeight || 900);

          const dx = mouse.x - particleX;
          const dy = mouse.y - particleY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const intensity = Math.max(0, 1 - distance / 120);

          return (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${4 + intensity * 8}px`,
                height: `${4 + intensity * 8}px`,
                opacity: intensity > 0.05 ? intensity : 0,
                scale: 0.6 + intensity * 1.4,
                filter: `drop-shadow(0 0 ${8 + intensity * 18}px rgba(255,255,255,0.9))`,
              }}
              animate={{
                x: [0, particle.floatX, 0],
                y: [0, particle.floatY, 0],
                rotate: [0, 18, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full"
                fill="white"
              >
                <path d="M50 0C56 28 72 44 100 50C72 56 56 72 50 100C44 72 28 56 0 50C28 44 44 28 50 0Z" />
              </svg>
            </motion.div>
          );
        })}
      </div>

              <motion.div
                className="pointer-events-none absolute z-[2] h-72 w-72 rounded-full bg-purple-500/10 blur-3xl"
                animate={{
                  x: mouse.x - 144,
                  y: mouse.y - 144,
                  opacity: mouse.x < 0 ? 0 : 1,
                }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
              />

              <div
                className="absolute inset-0 z-[3] opacity-[0.03] mix-blend-screen"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0.5px, transparent 0.5px)",
                  backgroundSize: "4px 4px",
                }}
              />

              <div className="relative z-20 mx-auto grid min-h-[80vh] max-w-[1400px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-0 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="mx-auto max-w-[620px] text-center lg:mx-0 lg:-translate-y-8 lg:text-left xl:max-w-[650px]">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-3 rounded-full border border-violet-500/25 bg-[#120c1d]/80 px-4 py-2 backdrop-blur-xl"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 shadow-[0_0_18px_rgba(168,85,247,0.5)]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" />
                      </svg>
                    </div>

                    <span className="text-[13px] font-medium tracking-[-0.01em] text-white/90 md:text-[14px]">
                      Every lead matters. Every second counts.
                    </span>
                  </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.85, delay: 0.08 }}
            className="mt-5 max-w-[680px] font-poppins text-[38px] font-semibold leading-[0.88] tracking-[-0.055em] text-white sm:text-[54px] md:text-[64px] lg:text-[72px] xl:text-[78px]"
          >
            Never Lose a Lead
            <br />
            Again
            <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-violet-500 align-middle shadow-[0_0_16px_rgba(168,85,247,0.85)]" />
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.85, delay: 0.16 }}
            className="mx-auto mt-6 max-w-[92%] text-[15px] leading-[1.75] text-white/72 sm:max-w-[520px] sm:text-[16px] lg:mx-0 lg:max-w-[500px] lg:text-[18px]"
          >
            Automatically reply to Instagram, WhatsApp, and Telegram leads in seconds — so every inquiry gets handled, even when you are offline.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.22 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            {[
              "Instant reply",
              "24/7 lead capture",
              "More conversions",
            ].map((item, index) => (
              <div
                key={item}
                className="flex w-full items-center gap-2.5 rounded-[18px] border border-violet-500/25 bg-[#0d0b14]/85 px-3.5 py-2.5 shadow-[0_0_20px_rgba(124,58,237,0.10)] backdrop-blur-xl sm:w-auto"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 shadow-[0_0_14px_rgba(139,92,246,0.4)]">
                  {index === 0 && <span className="text-[16px]">⚡</span>}
                  {index === 1 && <span className="text-[13px] font-semibold">24/7</span>}
                  {index === 2 && <span className="text-[16px]">↗</span>}
                </div>

                <span className="whitespace-nowrap text-[12px] font-medium text-white/95 md:text-[14px]">
                  {item}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.32 }}
            className="mt-6 sm:mt-8 lg:mt-11 flex items-center justify-center gap-2 whitespace-nowrap overflow-x-auto sm:gap-4"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center md:h-16 md:w-16 rounded-full border border-violet-500/30 bg-[#120c1d] shadow-[0_0_30px_rgba(139,92,246,0.38)]">
                <User className="h-7 w-7 text-violet-300" strokeWidth={2.2} />
              </div>
                            <p className="mt-2 text-[12px] text-white md:text-[14px]">Lead arrives</p>
                          </div>

                          <div className="text-sm text-white/50 md:text-xl">→</div>

                          <div className="flex flex-col items-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center md:h-16 md:w-16 rounded-full border border-violet-500/30 bg-[#120c1d] shadow-[0_0_30px_rgba(139,92,246,0.38)]">
                <MessageCircleMore
                  className="h-7 w-7 text-violet-300"
                  strokeWidth={2.2}
                />
              </div>
              <p className="mt-2 text-[12px] text-white md:text-[14px]">AI replies instantly</p>
            </div>

            <div className="text-sm text-white/50 md:text-xl">→</div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center md:h-16 md:w-16 rounded-full border border-emerald-500/30 bg-[#081510] shadow-[0_0_30px_rgba(16,185,129,0.45)]">
              <Check className="h-7 w-7 text-emerald-400" strokeWidth={2.5} />
            </div> 

              <p className="mt-2 text-[12px] text-white md:text-[14px]">
                Lead stays. <span className="text-emerald-400">You close.</span>
              </p>
            </div>
          </motion.div>
        </div>

        <div className="relative flex min-h-[440px] sm:min-h-[520px] lg:min-h-[620px] items-start justify-center lg:justify-end">
          <div className="relative flex h-full w-full items-center justify-center overflow-visible lg:justify-end">
            {/* Curved Glow Line */}
            <div className="pointer-events-none absolute left-[18%] top-[48%] z-[1] h-[270px] w-[270px] rounded-full bg-violet-600/25 blur-[120px]" />

          <div className="pointer-events-none absolute right-[10%] top-[38%] z-[1] h-[270px] w-[270px] rounded-full bg-emerald-500/20 blur-[120px]" />

              <svg
              className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[360px] w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-visible"
                viewBox="0 0 980 420"
                fill="none"
              >
                <defs>
                  <filter id="trailBlur">
                    <feGaussianBlur stdDeviation="10" />
                  </filter>
                </defs>

                <path
                  d="M40 250 C180 320, 340 310, 500 190"
                  stroke="#c084fc"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.75"
                  filter="url(#trailBlur)"
                />

                <path
                  d="M520 180 C700 120, 840 150, 910 230"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.75"
                  filter="url(#trailBlur)"
                />
              </svg>

              {/* Instagram Card */}
              <motion.div
                className="absolute left-6 top-16 z-10 h-[300px] w-[230px] sm:left-8 sm:top-[72px] sm:h-[380px] sm:w-[285px] md:left-4 md:top-[76px] md:h-[450px] md:w-[325px] lg:left-12 lg:top-[68px] lg:h-[500px] lg:w-[350px] xl:left-14 xl:top-[64px] xl:h-[520px] xl:w-[360px]"
              onHoverStart={() => setHoveredCard("instagram")}
              onHoverEnd={() => setHoveredCard(null)}
              animate={{
                scaleX: hoveredCard === "instagram" ? 1.15 : 1,
                scaleY: hoveredCard === "instagram" ? 1.3 : 1,
                x: hoveredCard === "instagram" ? -8 : 0,
                y: hoveredCard === "instagram" ? -10 : 0,
                rotate: hoveredCard === "instagram" ? "0deg" : "-8deg",
                filter:
                  hoveredCard === "whatsapp"
                    ? "blur(5px) brightness(0.7)"
                    : "blur(0px) brightness(1)",
                zIndex: hoveredCard === "instagram" ? 40 : 10,
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                transformStyle: "preserve-3d",
                rotateX: `${cardRotateX * 0.35}deg`,
                rotateY: `${cardRotateY * 0.35}deg`,
              }}
              >
                <div className="absolute inset-0 rounded-[32px] border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/30 via-violet-500/15 to-indigo-500/10 shadow-[0_0_100px_rgba(192,132,252,0.42)] backdrop-blur-xl" />

                <div className="relative h-full overflow-hidden rounded-[32px] border border-white/15 bg-black/45 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-[30px]">
                  <div className="bg-gradient-to-r from-[#d946ef] via-[#8b5cf6] to-[#4f46e5] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </div>

                      <span className="font-poppins bg-gradient-to-r from-white via-pink-100 to-violet-100 bg-clip-text text-[24px] font-semibold tracking-[-0.02em] text-transparent">
                        Instagram
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 px-3.5 py-4 pb-14">
                    <div className="rounded-3xl border border-white/5 bg-black/65 backdrop-blur-xl p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-pink-300/80" />
                        <div>
                          <p className="text-[16px] font-medium text-white">Kate</p>
                          <p className="text-[12px] leading-5 text-white/70">
                            Hello! I have a question about the photo you posted earlier.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto w-fit max-w-[82%] rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-3.5 py-2.5 text-[13px] text-white">
                      Sure! What can I help you with?
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-black/60 backdrop-blur-xl p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-pink-300/80" />
                        <div>
                          <p className="text-[17px] font-medium text-white">Sara</p>
                          <p className="text-[13px] text-white/70">
                            Can you tell me where you took that picture from?
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-3.5 py-2.5 text-[13px] text-white">
                      That was taken from the bridge overlooking the lake.
                    </div>
                    <div className="absolute bottom-6 left-6 flex items-center gap-3 text-emerald-300">
                    <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                    <span className="text-[13px] font-medium">Replied instantly</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* WhatsApp Card */}
              <motion.div
                  className="relative z-20 ml-[86px] h-[300px] w-[230px] sm:ml-[145px] sm:h-[380px] sm:w-[285px] md:ml-[210px] md:h-[450px] md:w-[325px] lg:ml-[245px] lg:h-[500px] lg:w-[350px] xl:ml-[255px] xl:h-[520px] xl:w-[360px]"
                    onHoverStart={() => setHoveredCard("whatsapp")}
                    onHoverEnd={() => setHoveredCard(null)}
                    animate={{
                      scaleX: hoveredCard === "whatsapp" ? 1.15 : 1,
                      scaleY: hoveredCard === "whatsapp" ? 1.3 : 1,
                      x: hoveredCard === "whatsapp" ? 10 : 0,
                      y: hoveredCard === "whatsapp" ? -12 : 0,
                      rotate: hoveredCard === "whatsapp" ? "0deg" : "6deg",
                      filter:
                        hoveredCard === "instagram"
                          ? "blur(5px) brightness(0.7)"
                          : "blur(0px) brightness(1)",
                      zIndex: hoveredCard === "whatsapp" ? 50 : 20,
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      transformStyle: "preserve-3d",
                      rotateX: `${cardRotateX * 0.5}deg`,
                      rotateY: `${cardRotateY * 0.5}deg`,
                    }}
                    >
                      <div className="absolute inset-0 rounded-[32px] border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 via-green-500/10 to-transparent shadow-[0_0_100px_rgba(16,185,129,0.38)] backdrop-blur-xl" />

                      <div className="relative h-full overflow-hidden rounded-[32px] border border-white/15 bg-black/50 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-[30px]">
                        <div className="bg-gradient-to-r from-[#25D366] via-[#1ebe5d] to-[#128C7E] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5 text-white"
                          fill="currentColor"
                        >
                          <path d="M12.04 2C6.56 2 2.1 6.33 2.1 11.68c0 1.88.57 3.63 1.55 5.11L2 22l5.4-1.58a10.1 10.1 0 0 0 4.64 1.12c5.48 0 9.94-4.33 9.94-9.68C21.98 6.33 17.52 2 12.04 2Zm5.77 13.63c-.24.66-1.4 1.24-1.92 1.32-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.19-4.98-4.39-.15-.2-1.19-1.56-1.19-2.98 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36h.55c.18 0 .43-.07.67.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.3.47-.15.16-.31.36-.45.48-.15.13-.31.28-.13.55.18.27.79 1.3 1.69 2.11 1.16 1.03 2.14 1.35 2.44 1.5.3.15.48.13.66-.08.17-.21.74-.84.94-1.13.2-.29.39-.24.66-.14.27.1 1.7.79 1.99.93.29.14.48.21.55.33.07.12.07.72-.17 1.38Z" />
                        </svg>
                      </div>

                      <span className="font-poppins bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-[24px] font-semibold tracking-[-0.02em] text-transparent">
                        WhatsApp
                      </span>
                    </div>
                  </div>

                <div className="space-y-2.5 px-3.5 py-4 pb-14">
                  {[
                    "Does that time work for you?",
                    "Are you coming to the party this Friday?",
                    "Can you help me with a quick question?",
                    "Of course! What's your question?",
                  ].map((text, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-3xl border border-white/5 bg-black/60 backdrop-blur-xl p-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-emerald-200/80" />
                      <div className="flex-1">
                        <div className="mb-1 h-3 w-20 rounded-full bg-white/90" />
                        <p className="text-[12px] leading-4 text-white/75">{text}</p>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-6 left-6 flex items-center gap-3 text-emerald-300">
            <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
            <span className="text-[15px] font-medium">Lead captured 24/7</span>
          </div>
            </motion.div>
              <div className="absolute left-[18%] bottom-[18%] h-1 w-1 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
              <div className="absolute left-[22%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.9)]" />
              <div className="absolute right-[8%] top-[46%] h-1 w-1 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
              <div className="absolute right-[10%] top-[52%] h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.9)]" />
          </div>
        </div>
      </div>
    </section>
  );
}