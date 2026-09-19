"use client";

import { motion } from "framer-motion";
import { AnimatedChat } from "./Animatedchat";

export function IphoneMockup({ rotateX, rotateY }) {
  return (
    <div className="relative flex justify-center items-start w-full max-w-[500px] pt-[10px] pb-[20px]">
      {/* Background Glows */}
      <div className="absolute w-[500px] h-[600px] bg-[radial-gradient(ellipse,rgba(129,74,200,0.2)_0%,rgba(129,74,200,0.07)_45%,transparent_72%)] rounded-full -top-5 left-1/2 -translate-x-1/2 blur-[60px] pointer-events-none z-0" />
      <div className="absolute w-[300px] h-[300px] bg-[radial-gradient(ellipse,rgba(37,211,102,0.12)_0%,transparent_70%)] rounded-full bottom-0 right-[10%] blur-[50px] pointer-events-none z-0" />

      {/* Phone Outer Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          rotateZ: 0,
          transformPerspective: 1600,
        }}
        className="relative w-[340px] rounded-[52px] bg-[#0d0d0e] border border-white/12 p-[10px]"
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          y: {
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        {/* Inner Phone Frame: exact 320px x 640px */}
        <motion.div
          className="relative w-[320px] h-[640px] bg-[#0d0d0e] rounded-[48px] overflow-hidden flex flex-col"
          animate={{
            boxShadow: [
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 52px 110px rgba(0,0,0,0.88), 0 0 70px rgba(129,74,200,0.10)",
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 64px 130px rgba(0,0,0,0.94), 0 0 90px rgba(129,74,200,0.16)",
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 52px 110px rgba(0,0,0,0.88), 0 0 70px rgba(129,74,200,0.10)",
            ],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Dynamic Island Notch */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[88px] h-[24px] bg-black rounded-[16px] z-30" />

          <div className="relative w-full h-full bg-[#efeae2] overflow-hidden flex flex-col">
            {/* WhatsApp Green Top Container (Encompasses Status Bar + Header) */}
            <div className="bg-[#008069] text-white pt-2.5 pb-2.5 px-3 flex flex-col z-20 shrink-0 shadow-sm">
              {/* Status Bar in White */}
              <div className="flex justify-between items-center text-white text-[11px] font-bold tracking-tight px-3 pb-2 pt-0.5 pointer-events-none">
                <div>9:05</div>

                <div className="flex items-center gap-1.5">
                  {/* WiFi in White */}
                  <svg width="14" height="14" viewBox="0 0 15 11" fill="none" className="block">
                    <path d="M7.5 8.5C8.05 8.5 8.5 8.95 8.5 9.5C8.5 10.05 8.05 10.5 7.5 10.5C6.95 10.5 6.5 10.05 6.5 9.5C6.5 8.95 6.95 8.5 7.5 8.5Z" fill="white"/>
                    <path d="M4.2 6.2C5.1 5.4 6.25 5 7.5 5C8.75 5 9.9 5.4 10.8 6.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M1.5 3.8C3.1 2.35 5.2 1.5 7.5 1.5C9.8 1.5 11.9 2.35 13.5 3.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>

                  {/* Battery in White */}
                  <svg width="20" height="10" viewBox="0 0 24 12" fill="none" className="block">
                    <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="white" strokeWidth="1.2"/>
                    <rect x="2" y="2" width="14" height="8" rx="1.5" fill="white"/>
                    <path d="M22 4V8C22.8 7.6 23.5 6.85 23.5 6C23.5 5.15 22.8 4.4 22 4Z" fill="white"/>
                  </svg>
                </div>
              </div>

              {/* WA Header Content */}
              <div className="flex items-center gap-2 pt-1">
                <button className="p-1 -ml-1 flex items-center text-white" aria-label="Back">
                  <svg width="9" height="16" viewBox="0 0 10 17" fill="none">
                    <path
                      d="M9 1L1.5 8.5L9 16"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-xs border border-white/20">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 0-18z" fill="rgba(255,255,255,0.15)"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                    <path d="M12 6v2m0 8v2M6 12h2m8 0h2"/>
                  </svg>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25D366] rounded-full border-2 border-[#008069]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 leading-tight">
                    <span className="font-bold text-[13.5px] text-white truncate">SunGlow</span>
                    <svg className="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.7-5.7 1.4 1.4-7.1 7.1z" />
                    </svg>
                  </div>
                  <div className="text-[10px] text-white/90 font-normal leading-none mt-0.5">Online</div>
                </div>

                <div className="flex items-center gap-2.5 text-white">
                  <button type="button" className="p-1 text-white opacity-90 hover:opacity-100 transition-opacity" aria-label="Video Call">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" fill="currentColor" stroke="none" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                  <button type="button" className="p-1 text-white opacity-90 hover:opacity-100 transition-opacity" aria-label="Voice Call">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.02z" />
                    </svg>
                  </button>
                  <button type="button" className="p-1 text-white opacity-90 hover:opacity-100 transition-opacity" aria-label="More Options">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="12" cy="19" r="1.8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Animated chat body */}
            <AnimatedChat />

            {/* WhatsApp White/Light-Gray Input Bar with Green Microphone Button */}
            <div className="bg-[#efeae2] p-2 flex items-center gap-2 shrink-0 border-t border-slate-200/50 z-20">
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200/70 shadow-2xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#8696a0] shrink-0">
                  <circle cx="12" cy="12" r="9.5" stroke="#8696a0" strokeWidth="1.75" />
                  <circle cx="8.5" cy="9.5" r="1" fill="#8696a0" />
                  <circle cx="15.5" cy="9.5" r="1" fill="#8696a0" />
                  <path d="M8 14.5c1.2 1.5 2.5 2 4 2s2.8-.5 4-2" stroke="#8696a0" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
                <span className="flex-1 text-[11px] text-[#8696a0] font-sans">Message</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-[#8696a0] shrink-0">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#8696a0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-[#8696a0] shrink-0">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#8696a0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.75" stroke="#8696a0" strokeWidth="1.75" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 shadow-xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="white" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}