"use client";
import { motion } from "framer-motion";
import CTAButtons from "./CTAButtons";

const TRUST_BADGES = [
  { icon: "🤝", label: "Meta Business Partner" },
  { icon: "🏆", label: "G2 Leader 2026" },
  { icon: "⭐", label: "4.8 / 5 Rating" },
];

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
  },
  item: {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
  },
};

export default function HeroContent() {
  return (
    <motion.div
      className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl mx-auto lg:mx-0"
      variants={stagger.container}
      initial="hidden"
      animate="show"
    >
      {/* Badge */}
      <motion.div variants={stagger.item}>
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-violet-300 text-violet-600 bg-violet-50 mb-6 shadow-sm">
          <span className="text-violet-400">✦</span>
          The Future of Sales is Here
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h1
        className="text-4xl sm:text-5xl lg:text-6xl xl:text-[68px] font-black leading-[1.08] tracking-tight text-zinc-900 mb-5"
        variants={stagger.item}
      >
        Vanakam dharun
        <br />
        Out of Every
        <br />
        Single
        <br />
        <span
          className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Conversation.
        </span>
      </motion.h1>

      {/* Paragraph */}
      <motion.p
        className="text-base sm:text-lg text-zinc-500 leading-relaxed mb-8 max-w-md"
        variants={stagger.item}
      >
        Scalable AI Sales Assistant for Instagram, WhatsApp, and Telegram.
        Automate every conversation to close more sales while you sleep.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div className="w-full" variants={stagger.item}>
        <CTAButtons />
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-8"
        variants={stagger.item}
      >
        {TRUST_BADGES.map((b) => (
          <span
            key={b.label}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 tracking-wider uppercase"
          >
            <span>{b.icon}</span>
            {b.label}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}