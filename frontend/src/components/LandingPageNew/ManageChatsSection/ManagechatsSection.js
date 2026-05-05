"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function ManageChatsSection() {
  const sectionRef = useRef(null);
  const [mouse, setMouse] = useState({ x: -9999, y: -9999 });
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      setViewportWidth(window.innerWidth);
      setIsMobile(window.innerWidth <= 640);
    };

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
    const count = viewportWidth < 640 ? 30 : viewportWidth < 1024 ? 110 : 160;
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

  const cardRotateX = !isMobile && sectionRef.current
    ? ((mouse.y - sectionRef.current.offsetHeight / 2) / sectionRef.current.offsetHeight) * -6
    : 0;
  const cardRotateY = !isMobile && sectionRef.current
    ? ((mouse.x - sectionRef.current.offsetWidth / 2) / sectionRef.current.offsetWidth) * 6
    : 0;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-12 md:px-6 md:py-16 lg:px-6 lg:py-20"
    >
      <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-purple-600/20 via-transparent to-blue-500/10" />

      <div className="absolute inset-0 z-0 overflow-hidden">
        {particles.map((particle) => {
          const particleX = (particle.x / 100) * viewportWidth;
          const particleY = (particle.y / 100) * (sectionRef.current?.offsetHeight || 900);
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
              animate={{ x: [0, particle.floatX, 0], y: [0, particle.floatY, 0], rotate: [0, 18, 0] }}
              transition={{ duration: particle.duration, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full" fill="white">
                <path d="M50 0C56 28 72 44 100 50C72 56 56 72 50 100C44 72 28 56 0 50C28 44 44 28 50 0Z" />
              </svg>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="pointer-events-none absolute z-[2] h-72 w-72 rounded-full bg-purple-500/10 blur-3xl hidden sm:block"
        animate={{ x: mouse.x - 144, y: mouse.y - 144, opacity: mouse.x < 0 ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
      />

      <div
        className="absolute inset-0 z-[3] opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0.5px, transparent 0.5px)",
          backgroundSize: "4px 4px",
        }}
      />

      <div className="relative z-20 mx-auto max-w-7xl min-h-[80vh] flex flex-col items-center justify-center gap-12 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8">

        <div className="w-full max-w-xl text-center lg:text-left lg:mx-0">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-poppins max-w-[620px] mx-auto lg:mx-0
              text-[30px] sm:text-[36px] md:text-[40px] lg:text-[45px]
              font-medium leading-[1.2] tracking-[0em]"
            style={{
              background: "linear-gradient(180deg, #A855F7 0%, #FFFFFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "100% 1.2em",
              backgroundRepeat: "repeat-y",
              textShadow: "0 0 40px rgba(168,85,247,0.3)",
            }}
          >
            Manage chats with <br /> AI that replies <br /> instantly.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="font-poppins mx-auto mt-4 max-w-md text-sm md:text-base lg:text-lg leading-6 text-white/85 lg:mx-0"
          >
            Manage conversations effortlessly with AI that organizes,
            prioritizes, and replies in real time.
          </motion.p>
        </div>

        {/* Right - Cards */}
        <div className="relative flex items-center justify-center w-full lg:justify-end">

          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 overflow-visible hidden md:block h-[380px] w-[920px]"
            viewBox="0 0 920 380"
            fill="none"
          >
            <defs>
              <linearGradient id="curveGlow" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#86efac" stopOpacity="0.9" />
              </linearGradient>
              <filter id="blurGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
              </filter>
            </defs>
            <path
              d="M20 270 C 220 360, 640 20, 900 190"
              stroke="url(#curveGlow)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#blurGlow)"
              opacity="0.95"
            />
          </svg>

          <div className="
            flex flex-col items-center gap-6 w-full max-w-[320px]
            sm:max-w-[360px]
            lg:relative lg:flex lg:flex-row lg:items-center lg:justify-end lg:max-w-none lg:w-auto lg:gap-0
          ">

            {/* ── Instagram Card ── */}
            <motion.div
              className="
                relative w-full max-w-[300px] z-10
                lg:absolute lg:-left-16 lg:top-12
                lg:w-[340px] lg:h-auto
              "
              
              onHoverStart={() => !isMobile && setHoveredCard("instagram")}
              onHoverEnd={() => !isMobile && setHoveredCard(null)}
              animate={!isMobile ? {
                scaleX: hoveredCard === "instagram" ? 1.15 : 1,
                scaleY: hoveredCard === "instagram" ? 1.3 : 1,
                x: hoveredCard === "instagram" ? -8 : 0,
                y: hoveredCard === "instagram" ? -10 : 0,
                rotate: hoveredCard === "instagram" ? "0deg" : "-8deg",
                filter: hoveredCard === "whatsapp"
                  ? "blur(5px) brightness(0.7)"
                  : "blur(0px) brightness(1)",
                zIndex: hoveredCard === "instagram" ? 40 : 10,
              } : {}}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={!isMobile ? {
                transformStyle: "preserve-3d",
                rotateX: `${cardRotateX * 0.35}deg`,
                rotateY: `${cardRotateY * 0.35}deg`,
              } : {}}
            >
              {/* ✅ Fix — removed h-full from inner divs, now height = content only */}
              {/* <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-black" /> */}
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black">
                <div className="flex flex-col items-center justify-center pt-5 pb-3 px-4">
                  <div className="mb-2 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 md:h-8 md:w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">Instagram</h3>
                </div>
                <div className="flex flex-col gap-2 md:gap-3 px-3 md:px-4 pb-4">
                  {[
                    "Hi 🙂 Which product are you looking for?",
                    "Sure! 👍 This product is available.",
                    "Order now or need details? 😊🧡",
                  ].map((msg, i) => (
                    <div key={i} className="flex items-center gap-2 md:gap-3 rounded-2xl px-3 py-2.5 md:px-4 md:py-3"
                      style={{ background: "rgba(30,30,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] md:text-xs font-semibold text-white/90 leading-tight">Auromind</span>
                        <span className="text-[11px] md:text-[13px] text-white/60 leading-snug truncate">{msg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── WhatsApp Card ── */}
            <motion.div
              className="
                relative w-full max-w-[300px] z-20
                lg:relative lg:ml-[220px]
                lg:w-[340px] lg:h-[auto]
              "

              onHoverStart={() => !isMobile && setHoveredCard("whatsapp")}
              onHoverEnd={() => !isMobile && setHoveredCard(null)}
              animate={!isMobile ? {
                scaleX: hoveredCard === "whatsapp" ? 1.15 : 1,
                scaleY: hoveredCard === "whatsapp" ? 1.3 : 1,
                x: hoveredCard === "whatsapp" ? 10 : 0,
                y: hoveredCard === "whatsapp" ? -12 : 0,
                rotate: hoveredCard === "whatsapp" ? "0deg" : "6deg",
                filter: hoveredCard === "instagram"
                  ? "blur(5px) brightness(0.7)"
                  : "blur(0px) brightness(1)",
                zIndex: hoveredCard === "whatsapp" ? 50 : 20,
              } : {}}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={!isMobile ? {
                transformStyle: "preserve-3d",
                rotateX: `${cardRotateX * 0.5}deg`,
                rotateY: `${cardRotateY * 0.5}deg`,
              } : {}}
            >
          
              <div className="absolute inset-0 rounded-[32px] border border-white/40 bg-black" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-black/50 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-[30px]">
                <div className="flex flex-col items-center justify-center pt-5 pb-3 px-4">
                  <div className="mb-2 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-[#25D366]">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 md:h-8 md:w-8 text-white" fill="currentColor">
                      <path d="M12.04 2C6.56 2 2.1 6.33 2.1 11.68c0 1.88.57 3.63 1.55 5.11L2 22l5.4-1.58a10.1 10.1 0 0 0 4.64 1.12c5.48 0 9.94-4.33 9.94-9.68C21.98 6.33 17.52 2 12.04 2Zm5.77 13.63c-.24.66-1.4 1.24-1.92 1.32-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.19-4.98-4.39-.15-.2-1.19-1.56-1.19-2.98 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36h.55c.18 0 .43-.07.67.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.3.47-.15.16-.31.36-.45.48-.15.13-.31.28-.13.55.18.27.79 1.3 1.69 2.11 1.16 1.03 2.14 1.35 2.44 1.5.3.15.48.13.66-.08.17-.21.74-.84.94-1.13.2-.29.39-.24.66-.14.27.1 1.7.79 1.99.93.29.14.48.21.55.33.07.12.07.72-.17 1.38Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">Whatsapp</h3>
                </div>
                <div className="flex flex-col gap-2 md:gap-3 px-3 md:px-4 pb-4">
                  {[
                    "Your order has been successfully placed ✅🛍️",
                    "Your order is being processed ⚙️🧡",
                    "Your order is on the way 🚚",
                  ].map((msg, i) => (
                    <div key={i} className="flex items-center gap-2 md:gap-3 rounded-2xl px-3 py-2.5 md:px-4 md:py-3"
                      style={{ background: "rgba(30,30,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5 text-white" fill="currentColor">
                          <path d="M12.04 2C6.56 2 2.1 6.33 2.1 11.68c0 1.88.57 3.63 1.55 5.11L2 22l5.4-1.58a10.1 10.1 0 0 0 4.64 1.12c5.48 0 9.94-4.33 9.94-9.68C21.98 6.33 17.52 2 12.04 2Zm5.77 13.63c-.24.66-1.4 1.24-1.92 1.32-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.19-4.98-4.39-.15-.2-1.19-1.56-1.19-2.98 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36h.55c.18 0 .43-.07.67.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.3.47-.15.16-.31.36-.45.48-.15.13-.31.28-.13.55.18.27.79 1.3 1.69 2.11 1.16 1.03 2.14 1.35 2.44 1.5.3.15.48.13.66-.08.17-.21.74-.84.94-1.13.2-.29.39-.24.66-.14.27.1 1.7.79 1.99.93.29.14.48.21.55.33.07.12.07.72-.17 1.38Z" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] md:text-xs font-semibold text-white/90 leading-tight">Auromind</span>
                        <span className="text-[11px] md:text-[13px] text-white/60 leading-snug truncate">{msg}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}