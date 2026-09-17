"use client";

import { motion } from "framer-motion";

export const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Analytics & Response Time",
    desc: "Track performance, response speed and conversion rates across all conversations.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 10h8M8 13h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Smart Inbox",
    desc: "View every customer conversation across WhatsApp, Instagram and Telegram from one place.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l1.8 5.4h5.7l-4.6 3.4 1.8 5.4L12 14.4l-4.7 2.8 1.8-5.4L4.5 8.4h5.7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="4" r="1.5" fill="currentColor" />
        <circle cx="5" cy="20" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "Instant AI Replies",
    desc: "Generate accurate replies in seconds using your business knowledge and previous chats.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Auto Lead Assignment",
    desc: "Automatically assign new leads to the correct sales team member based on rules.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M23 4v6h-6M1 20v-6h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Follow-up Automation",
    desc: "Send reminders and follow-ups automatically when leads stop responding to you.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "Priority Lead Detection",
    desc: "Detect high-intent leads instantly and surface them to the top of your inbox.",
  },
];

export function FeatureScroller() {
  const doubled = [...FEATURES, ...FEATURES];

  return (
    <div className="w-[432px] max-w-full bg-[#0e0e14]/90 border border-white/[0.09] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
      {/* Badge row */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#0b0b0f]/50">
        <span className="text-white text-sm font-bold tracking-wide">
          Features
        </span>
        <span className="text-white/90 text-sm font-medium">
          Ready for Review
        </span>
      </div>

      {/* Scroller Mask with bottom gradient fade */}
      <div className="w-full h-[480px] overflow-hidden relative group after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[220px] after:bg-gradient-to-b after:from-transparent after:via-[#0b0b0f]/85 after:to-[#0b0b0f] after:pointer-events-none">
        <div className="flex flex-col gap-0 animate-[scrollUp_28s_linear_infinite] group-hover:[animation-play-state:paused]">
          {doubled.map((f, i) => (
            <motion.div
              key={i}
              className="bg-transparent border-b border-white/[0.06] last:border-b-0 p-4 cursor-pointer transition-colors duration-200 shrink-0 w-full hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center text-white/60">
                  {f.icon}
                </div>
                <div className="text-white text-sm font-bold leading-snug">
                  {f.title}
                </div>
              </div>
              <div className="ml-9 text-slate-400 text-xs leading-relaxed">
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scrollUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
      `}</style>
    </div>
  );
}