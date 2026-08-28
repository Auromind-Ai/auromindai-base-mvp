"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { Poppins } from "next/font/google";
import Link from "next/link";
import NeatCTAButton from "@/components/ui/NeatCTAButton";
import {
  MessageSquare,
  Bot,
  Zap,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock,
  Send,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  Play,
  Share2,
  Workflow,
  Cpu,
  Layers,
  ChevronRight,
  ShoppingCart,
  HeartPulse,
  GraduationCap,
  Building2,
  DollarSign,
  LayoutGrid,
  Filter,
  Rocket,
  Timer,
  GitFork,
  Split,
} from "lucide-react";
import ThreeAiAgentsSection from "./ThreeAiAgentsSection";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins-hero",
});

function AnimatedHeadline({ text }) {
  const words = text.split(" ");
  return (
    <span className="inline">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: 0.15 + i * 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block mr-[0.26em] will-change-transform"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// Channel Icon Helpers
function WhatsAppChannelIcon({ size = 16, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.41C16.31 14.29 15.1 13.69 14.88 13.61C14.65 13.53 14.49 13.49 14.32 13.73C14.16 13.98 13.69 14.53 13.55 14.69C13.41 14.86 13.26 14.88 13.01 14.76C12.77 14.64 11.98 14.38 11.05 13.55C10.32 12.9 9.83 12.1 9.69 11.85C9.55 11.61 9.67 11.47 9.8 11.35C9.91 11.24 10.05 11.06 10.17 10.92C10.3 10.78 10.34 10.67 10.42 10.51C10.5 10.35 10.46 10.21 10.4 10.09C10.34 9.97 9.85 8.76 9.64 8.27C9.44 7.79 9.24 7.85 9.09 7.84C8.95 7.83 8.78 7.83 8.62 7.83C8.46 7.83 8.19 7.89 7.96 8.14C7.74 8.38 7.12 8.96 7.12 10.15C7.12 11.33 7.98 12.47 8.1 12.63C8.22 12.79 9.79 15.21 12.21 16.25C12.78 16.5 13.23 16.65 13.58 16.76C14.16 16.94 14.68 16.92 15.1 16.85C15.57 16.78 16.54 16.26 16.75 15.68C16.95 15.09 16.95 14.59 16.89 14.49C16.83 14.39 16.72 14.33 16.56 14.41Z"/>
    </svg>
  );
}

function InstagramChannelIcon({ size = 16, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function TwilioChannelIcon({ size = 16, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <circle cx="8" cy="8" r="2.2"/>
      <circle cx="16" cy="8" r="2.2"/>
      <circle cx="8" cy="16" r="2.2"/>
      <circle cx="16" cy="16" r="2.2"/>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

const INBOX_CONVERSATIONS_DATA = [
  {
    id: 1,
    channel: "whatsapp",
    name: "Sarah Johnson",
    time: "11:30 AM",
    message: "Hi, I need help with my order.",
    unread: 2,
    avatar: "/images/inbox/sarah.png",
  },
  {
    id: 2,
    channel: "instagram",
    name: "Mark Thompson",
    time: "11:28 AM",
    message: "Can you share the pricing?",
    unread: 1,
    avatar: "/images/inbox/mark.png",
  },
  {
    id: 3,
    channel: "twilio",
    name: "Emma Williams",
    time: "11:15 AM",
    message: "Do you have this in blue?",
    unread: 0,
    avatar: "/images/inbox/emma.png",
  },
  {
    id: 4,
    channel: "whatsapp",
    name: "David Brown",
    time: "10:45 AM",
    message: "My payment failed, please help.",
    unread: 3,
    avatar: "/images/inbox/david.png",
  },
  {
    id: 5,
    channel: "instagram",
    name: "Lisa Anderson",
    time: "10:30 AM",
    message: "When will it be delivered?",
    unread: 1,
    avatar: "/images/inbox/lisa.png",
  },
];

// Business Categories for Automation Builder
const BUSINESS_CATEGORIES = [
  { id: "ecom", label: "E-Commerce", icon: ShoppingCart },
  { id: "healthcare", label: "Healthcare", icon: HeartPulse },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "realestate", label: "Real Estate", icon: Building2 },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "other", label: "Other", icon: LayoutGrid },
];

export default function HeroShowcaseSection() {
  const [activeTab, setActiveTab] = useState("omni");
  const [selectedCategory, setSelectedCategory] = useState("ecom");
  const showcaseRef = useRef(null);

  // Track scroll position of the showcase card relative to viewport
  const { scrollYProgress } = useScroll({
    target: showcaseRef,
    offset: ["start end", "end start"],
  });

  // Dynamic scroll-driven glow intensity curve:
  // 0.0 (Entering viewport from below) -> 0.28 (dim, subtle ambient glow)
  // 0.25 (Approaching center)          -> 0.65 (growing radiant aura)
  // 0.50 (Centered in viewport)        -> 1.00 (maximum vibrant atmospheric glow)
  // 0.75 (Moving past toward top)     -> 0.65 (dimming down)
  // 1.00 (Exiting viewport)            -> 0.28 (returns to dim dormant state)
  const rawGlowOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [0.28, 0.65, 1.0, 0.65, 0.28]
  );

  const rawGlowScale = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [0.94, 0.98, 1.03, 0.98, 0.94]
  );

  // Smooth spring physics for natural, buttery transitions without jitter
  const smoothGlowOpacity = useSpring(rawGlowOpacity, {
    stiffness: 90,
    damping: 24,
    mass: 0.2,
  });

  const smoothGlowScale = useSpring(rawGlowScale, {
    stiffness: 90,
    damping: 24,
    mass: 0.2,
  });

  return (
    <section
      id="hero-showcase-redesign"
      className={`${poppins.className} relative w-full bg-[#000000] text-white py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden`}
    >
      {/* Container matching standard 1280px desktop grid */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================================= */}
        {/* TOP HERO HEADER CONTENT                                                   */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-[920px] mx-auto">
          
          {/* Top Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 sm:mb-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-[rgba(74,34,120,0.45)] px-2.5 py-1.5 pr-4 backdrop-blur-2xl shadow-[0_0_40px_rgba(108,69,255,0.18)]">
              <span className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#4f7cff] px-2.5 py-0.5 text-[9px] md:text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_22px_rgba(124,58,237,0.55)]">
                ✦ 24/7 AI
              </span>
              <span className="text-[12px] md:text-[14px] font-medium text-white/80">
                Sales Agents are here
              </span>
            </div>
          </motion.div>

          {/* Main Hero Headline */}
          <h2 className="text-[26px] sm:text-[36px] md:text-[44px] lg:text-[50px] font-semibold leading-[1.12] sm:leading-[1.1] tracking-[-0.03em] text-white mb-4 sm:mb-5">
            <AnimatedHeadline text="Turn WhatsApp & Instagram DMs Into Sales on Autopilot." />
          </h2>

          {/* Supporting Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-[14px] sm:text-[16px] md:text-[18px] font-normal leading-relaxed text-[#cccccc] max-w-[660px] mb-8 sm:mb-10"
          >
            Scalable AI Sales Assistant for Instagram, WhatsApp. Automate every
            conversation to close more sales while you sleep.
          </motion.p>

          {/* CTA Buttons Row */}
          <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 1 }}
                    className="flex flex-wrap items-center justify-center gap-4"
                  >
                    {/* Get Started Free Button */}
                    <NeatCTAButton
                      href="/signup"
                      className="group relative overflow-hidden h-[36px] w-[145px] rounded-[8px] bg-[#814AC8] text-[14px] font-semibold text-white shadow-[0_0_32px_rgba(109,40,255,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(109,40,255,0.65)] md:h-[42px] md:w-[165px] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-2 w-full h-full">
                        
                        {/* Text slide animation */}
                        <span className="relative overflow-hidden h-[1.2em] flex items-center">
                          {/* Original text - slides down on hover */}
                          <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                            Get Started Free
                          </span>
                          {/* Clone text - slides in from bottom on hover */}
                          <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                            Get Started Free
                          </span>
                        </span>
          
                        {/* Icon swap animation */}
                        <span className="relative w-[14px] h-[14px] flex items-center justify-center overflow-hidden">
                          {/* Diagonal arrow ↗ - default */}
                          <span className="absolute transition-all duration-300 ease-in-out opacity-100 group-hover:opacity-0 group-hover:-translate-y-2 group-hover:translate-x-2">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          {/* Right arrow → - on hover */}
                          <span className="absolute transition-all duration-300 ease-in-out opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        </span>
          
                      </span>
                    </NeatCTAButton>
          
                    {/* Book a Demo Button */}
                    <NeatCTAButton
                      href="/resources/demo-videos"
                      className="group relative overflow-hidden flex items-center justify-center gap-2 h-[36px] w-[145px] rounded-[8px] border border-white/10 bg-white/5 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 md:h-[42px] md:w-[165px] cursor-pointer"
                    >
                      {/* Play icon - static */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="opacity-80 flex-shrink-0"
                      >
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                        <polygon points="6.5,5 11,8 6.5,11" fill="currentColor"/>
                      </svg>
          
                      {/* Text slide animation */}
                      <span className="relative overflow-hidden h-[1.2em] flex items-center">
                        <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                          Book a Demo
                        </span>
                        <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                          Book a Demo
                        </span>
                      </span>
                    </NeatCTAButton>
                  </motion.div>
        </div>

        {/* PRODUCT SHOWCASE CARD WITH RADIANT GRADIENT GLOWS*/}
        <div ref={showcaseRef} className="relative w-full max-w-[1200px] mx-auto mt-10 sm:mt-14">
          
          {/* SCROLL-REACTIVE RADIANT AMBIENT GLOW BACKDROP (#814AC8 Purple -> Royal Blue -> White/Lavender) */}
          <motion.div
            style={{
              opacity: smoothGlowOpacity,
              scale: smoothGlowScale,
            }}
            className="absolute inset-0 pointer-events-none -z-10 will-change-transform origin-center"
          >
            {/* Top Rim Glow - Spans full width of the card */}
            <div className="absolute -top-4 sm:-top-6 -inset-x-4 sm:-inset-x-8 h-[60px] sm:h-[80px]">
              {/* Layer 1: Diffuse Ambient Glow */}
              <div
                className="absolute inset-0 rounded-full opacity-80 blur-[28px] sm:blur-[38px] will-change-transform"
                style={{
                  background:
                    "linear-gradient(90deg, #814AC8 0%, #5d22e0 32%, rgb(41, 52, 255) 65%, rgba(255, 255, 255, 0.95) 90%, rgba(255, 255, 255, 0.8) 100%)",
                }}
              />
              {/* Layer 2: Focused Sharp Rim Glow */}
              <div
                className="absolute inset-x-4 top-1 h-[28px] sm:h-[38px] rounded-full opacity-90 blur-[12px] sm:blur-[16px] will-change-transform"
                style={{
                  background:
                    "linear-gradient(90deg, #814AC8 0%, #6830d6 35%, rgb(41, 52, 255) 68%, rgb(252, 252, 252) 90%)",
                }}
              />
            </div>

            {/* Left Side Glow Strip (#814AC8 Purple glow along left edge) */}
            <div
              className="absolute -left-4 sm:-left-6 top-2 sm:top-4 w-[32px] sm:w-[44px] h-[80%] rounded-full opacity-75 blur-[20px] sm:blur-[28px] will-change-transform"
              style={{
                background:
                  "linear-gradient(180deg, #814AC8 0%, rgba(129, 74, 200, 0.55) 50%, transparent 100%)",
              }}
            />

            {/* Right Side Glow Strip (Lavender/White to Blue glow along right edge) */}
            <div
              className="absolute -right-4 sm:-right-6 top-2 sm:top-4 w-[32px] sm:w-[44px] h-[65%] rounded-full opacity-70 blur-[20px] sm:blur-[28px] will-change-transform"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(65, 80, 255, 0.45) 50%, transparent 100%)",
              }}
            />
          </motion.div>

          {/* MAIN PRODUCT SHOWCASE CONTAINER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 25 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-[#08090d] border border-white/[0.09] rounded-[14px] sm:rounded-[18px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
          >

            {/* 3 PRODUCT TABS (Omni Inbox, AI Agents, Automations)*/}
            <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#191a1e]">
              
              {/* Tab 01: Omni Inbox */}
              <button
                onClick={() => setActiveTab("omni")}
                className={`relative text-left p-4 sm:p-5 transition-all duration-300 md:border-r border-b md:border-b-0 border-[#191a1e] flex flex-col justify-center ${
                  activeTab === "omni"
                    ? "bg-gradient-to-br from-[#6730e6]/35 to-[#221253]/15 border-r-white/[0.1]"
                    : "bg-transparent hover:bg-white/[0.02]"
                }`}
              >
                {/* Active Indicator Top Accent Bar */}
                {activeTab === "omni" && (
                  <motion.div
                    layoutId="activeTabAccent"
                    className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#9c75ff] to-[#6730e6]"
                  />
                )}
                <div className="flex items-start gap-3 sm:gap-3.5 cursor-pointer">
                  <div className="mt-0.5 flex-shrink-0 text-white">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <span
                      className={`block text-[11px] font-medium transition-colors ${
                        activeTab === "omni" ? "text-[#9c75ff]" : "text-[#6f6881]"
                      }`}
                    >
                      01
                    </span>
                    <span className="block text-[15px] sm:text-[17px] font-semibold text-white tracking-tight mt-0.5">
                      Omni Inbox
                    </span>
                    <span
                      className={`block text-[11.5px] sm:text-[12.5px] mt-0.5 transition-colors ${
                        activeTab === "omni" ? "text-[#c8c0db]" : "text-[#a8a3b2]"
                      }`}
                    >
                      All conversations. One intelligent inbox.
                    </span>
                  </div>
                </div>
              </button>

              {/* Tab 02: AI Agents */}
              <button
                onClick={() => setActiveTab("agents")}
                className={`relative text-left p-4 sm:p-5 transition-all duration-300 md:border-r border-b md:border-b-0 border-[#191a1e] flex flex-col justify-center cursor-pointer ${
                  activeTab === "agents"
                    ? "bg-gradient-to-br from-[#6730e6]/35 to-[#221253]/15 border-r-white/[0.1]"
                    : "bg-transparent hover:bg-white/[0.02]"
                }`}
              >
                {activeTab === "agents" && (
                  <motion.div
                    layoutId="activeTabAccent"
                    className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#9c75ff] to-[#6730e6]"
                  />
                )}
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <div className="mt-0.5 flex-shrink-0 text-white">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <span
                      className={`block text-[11px] font-medium transition-colors ${
                        activeTab === "agents" ? "text-[#9c75ff]" : "text-[#6f6881]"
                      }`}
                    >
                      02
                    </span>
                    <span className="block text-[15px] sm:text-[17px] font-semibold text-white tracking-tight mt-0.5">
                      AI Agents
                    </span>
                    <span
                      className={`block text-[11.5px] sm:text-[12.5px] mt-0.5 transition-colors ${
                        activeTab === "agents" ? "text-[#c8c0db]" : "text-[#a8a3b2]"
                      }`}
                    >
                      AI that understands and takes action.
                    </span>
                  </div>
                </div>
              </button>

              {/* Tab 03: Automations */}
              <button
                onClick={() => setActiveTab("automations")}
                className={`relative text-left p-4 sm:p-5 transition-all duration-300 flex flex-col justify-center cursor-pointer ${
                  activeTab === "automations"
                    ? "bg-gradient-to-br from-[#6730e6]/35 to-[#221253]/15"
                    : "bg-transparent hover:bg-white/[0.02]"
                }`}
              >
                {activeTab === "automations" && (
                  <motion.div
                    layoutId="activeTabAccent"
                    className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#9c75ff] to-[#6730e6]"
                  />
                )}
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <div className="mt-0.5 flex-shrink-0 text-white">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.6]" />
                  </div>
                  <div>
                    <span
                      className={`block text-[11px] font-medium transition-colors ${
                        activeTab === "automations"
                          ? "text-[#9c75ff]"
                          : "text-[#6f6881]"
                      }`}
                    >
                      03
                    </span>
                    <span className="block text-[15px] sm:text-[17px] font-semibold text-white tracking-tight mt-0.5">
                      Automations
                    </span>
                    <span
                      className={`block text-[11.5px] sm:text-[12.5px] mt-0.5 transition-colors ${
                        activeTab === "automations"
                          ? "text-[#c8c0db]"
                          : "text-[#a8a3b2]"
                      }`}
                    >
                      Turn repetitive work into workflows.
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* TAB CONTENT AREA*/}

            <div className={`min-h-[380px] sm:min-h-[420px] flex items-center transition-all duration-300 ${
              activeTab === "agents"
                ? "p-3 sm:p-5 lg:p-6 pt-2 sm:pt-3"
                : activeTab === "automations"
                ? "p-4 sm:p-5 md:p-6 lg:p-7"
                : "p-5 sm:p-7 md:p-8 lg:p-10"
            }`}>
              <AnimatePresence mode="wait">
                
                {/* VARIANT 1: OMNI INBOX*/}

                {activeTab === "omni" && (
                  <motion.div
                    key="tab-omni"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center w-full"
                  >
                    {/* Left Column: Interactive Omni Inbox Chat List Showcase */}
                    <div className="lg:col-span-5 flex flex-col gap-3 w-full">
                      {/* The Main Inbox Chat List Card */}
                      <div className="bg-[#0b0d14]/90 border border-white/[0.08] rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-md">
                        {/* Card Header: Filter & Count */}
                        <div className="flex items-center justify-between pb-2.5 mb-1.5 border-b border-white/[0.06] px-1">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                            <span className="text-[11px] sm:text-xs font-medium text-white/90">All Conversations</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#7c3aed] text-white text-[9.5px] font-bold">12</span>
                            <ChevronDown className="w-3 h-3 text-white/50" />
                          </div>

                          <button className="text-white/50 hover:text-white transition-colors p-1">
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Conversations List */}
                        <div className="flex flex-col gap-1">
                          {INBOX_CONVERSATIONS_DATA.map((conv) => {
                            return (
                              <div
                                key={conv.id}
                                className="group flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200"
                              >
                                {/* Left side: Channel App Icon + Avatar with Mini Badge */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Channel Rounded Box */}
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      conv.channel === "whatsapp"
                                        ? "bg-[#25D366] text-white shadow-[0_2px_8px_rgba(37,211,102,0.35)]"
                                        : conv.channel === "instagram"
                                        ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-[0_2px_8px_rgba(220,39,67,0.35)]"
                                        : "bg-[#F22F46] text-white shadow-[0_2px_8px_rgba(242,47,70,0.35)]"
                                    }`}
                                  >
                                    {conv.channel === "whatsapp" && <WhatsAppChannelIcon size={14} />}
                                    {conv.channel === "instagram" && <InstagramChannelIcon size={14} />}
                                    {conv.channel === "twilio" && <TwilioChannelIcon size={14} />}
                                  </div>

                                  {/* User Avatar with Mini Badge */}
                                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-visible flex-shrink-0">
                                    <div className="w-full h-full rounded-full overflow-hidden border border-white/10 bg-[#161822]">
                                      <Image
                                        src={conv.avatar}
                                        alt={conv.name}
                                        width={36}
                                        height={36}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    {/* Mini Channel Badge on bottom-right of avatar */}
                                    <div
                                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center ring-1 ring-[#0b0d14] ${
                                        conv.channel === "whatsapp"
                                          ? "bg-[#25D366] text-white"
                                          : conv.channel === "instagram"
                                          ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white"
                                          : "bg-[#F22F46] text-white"
                                      }`}
                                    >
                                      {conv.channel === "whatsapp" && <WhatsAppChannelIcon size={7} />}
                                      {conv.channel === "instagram" && <InstagramChannelIcon size={7} />}
                                      {conv.channel === "twilio" && <TwilioChannelIcon size={7} />}
                                    </div>
                                  </div>

                                  {/* User Name & Message Preview */}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs sm:text-[12.5px] font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                      {conv.name}
                                    </div>
                                    <div className="text-[10px] sm:text-[11px] text-[#9ca3af] truncate mt-0.5 max-w-[140px] sm:max-w-[170px] md:max-w-[190px]">
                                      {conv.message}
                                    </div>
                                  </div>
                                </div>

                                {/* Right side: Time & Unread Counter */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0 pl-1">
                                  <span className="text-[9.5px] sm:text-[10px] text-[#8e95ab] font-medium whitespace-nowrap">
                                    {conv.time}
                                  </span>
                                  {conv.unread > 0 ? (
                                    <span className="w-4 h-4 rounded-full bg-[#7c3aed] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                                      {conv.unread}
                                    </span>
                                  ) : (
                                    <div className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom Bar: Connect your channels */}
                      <div className="pt-1 pl-1">
                        <div className="text-[11px] sm:text-xs text-[#8e95ab] font-medium mb-2">
                          Connect your channels
                        </div>
                        <div className="flex items-center gap-2.5">
                          {/* WhatsApp Button */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(37,211,102,0.35)] hover:scale-105 transition-transform cursor-pointer">
                            <WhatsAppChannelIcon size={16} />
                          </div>
                          {/* Instagram Button */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(220,39,67,0.35)] hover:scale-105 transition-transform cursor-pointer">
                            <InstagramChannelIcon size={16} />
                          </div>
                          {/* Twilio Button */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F22F46] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(242,47,70,0.35)] hover:scale-105 transition-transform cursor-pointer">
                            <TwilioChannelIcon size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: WhatsApp Automation Showcase Image */}
                    <div className="lg:col-span-7 w-full flex items-center justify-center">
                      <div className="relative w-full h-[320px] sm:h-[370px] md:h-[400px] flex items-center justify-center">
                        <Image
                          src="/images/Whatsapp_Automation_Image.png"
                          alt="Powerful WhatsApp Automation for Smarter Business"
                          fill
                          className="object-contain"
                          priority
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 650px"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* VARIANT 2: AI AGENTS (Lead, Sales, Support)*/}
                {activeTab === "agents" && (
                  <motion.div
                    key="tab-agents"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                  >
                    <ThreeAiAgentsSection />
                  </motion.div>
                )}

                {/* VARIANT 3: AUTOMATIONS*/}
                {activeTab === "automations" && (
                  <motion.div
                    key="tab-automations"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-6 items-center w-full"
                  >
                    {/* Left Column: Automation Info & Interactive Business Selector */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3.5 sm:gap-4 w-full max-w-[360px]">
                      {/* Headline */}
                      <div>
                        <h3 className="text-2xl sm:text-3xl md:text-[34px] lg:text-[36px] font-regular text-white leading-[1.1] tracking-tight">
                          Build. Connect.{" "}
                          <span className="bg-gradient-to-r from-[#b379ff] via-[#9150f8] to-[#7c3aed] bg-clip-text text-transparent">
                            Automate.
                          </span>
                        </h3>
                        <p className="text-[13px] sm:text-[14px] font-normal leading-relaxed text-[#9ca3af] mt-2 max-w-[330px]">
                          Visually create smart workflows in minutes. No code. Just logic that works.
                        </p>
                      </div>

                      {/* WORKS FOR EVERY BUSINESS Category Grid - Compact Width */}
                      <div>
                        <span className="block text-[11px] sm:text-[12px] font-medium tracking-[0.14em] text-[#9353d3] mb-2">
                          Works for Every Business
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[290px] sm:max-w-[310px]">
                          {BUSINESS_CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            const IconComponent = cat.icon;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 sm:py-2.5 sm:px-1.5 rounded-xl border transition-all duration-200 text-center ${
                                  isSelected
                                    ? "bg-gradient-to-b from-[#6730e6]/45 to-[#221253]/35 border-[#8b5cf6]/60 shadow-[0_0_18px_rgba(139,92,246,0.35)] text-white"
                                    : "bg-[#0d0e17] border-white/[0.07] hover:border-white/20 text-[#8e95ab] hover:text-white"
                                }`}
                              >
                                <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? "text-purple-300" : "text-white/60"}`} />
                                <span className="text-[9.5px] sm:text-[10.5px] font-medium truncate w-full">
                                  {cat.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3 Feature Highlights */}
                      <div className="space-y-1.5 sm:space-y-2 pt-0.5 max-w-[340px]">
                        {/* Feature 1: Visual Flow Builder */}
                        <div className="group flex items-center gap-3 p-1 rounded-2xl transition-all duration-200 hover:bg-white/[0.04]">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 via-[#6d28d9]/20 to-[#241242] border border-[#a855f7]/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] group-hover:border-[#c084fc]/70 transition-all duration-300">
                            <GitFork className="w-4.5 h-4.5 text-[#e9d5ff] drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-[13px] font-semibold text-white group-hover:text-purple-200 transition-colors">Visual Flow Builder</h4>
                            <p className="text-[10.5px] sm:text-[11.5px] text-[#9ca3af] mt-0.5">Drag, drop and connect steps easily</p>
                          </div>
                        </div>

                        {/* Feature 2: Smart Conditions */}
                        <div className="group flex items-center gap-3 p-1 rounded-2xl transition-all duration-200 hover:bg-white/[0.04]">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#10b981]/30 via-[#059669]/20 to-[#06291c] border border-[#34d399]/50 shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(52,211,153,0.5)] group-hover:border-[#6ee7b7]/70 transition-all duration-300">
                            <Split className="w-4.5 h-4.5 text-[#a7f3d0] drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-[13px] font-semibold text-white group-hover:text-emerald-200 transition-colors">Smart Conditions</h4>
                            <p className="text-[10.5px] sm:text-[11.5px] text-[#9ca3af] mt-0.5">If / Else logic for smarter decisions</p>
                          </div>
                        </div>

                        {/* Feature 3: Go Live in Minutes */}
                        <div className="group flex items-center gap-3 p-1 rounded-2xl transition-all duration-200 hover:bg-white/[0.04]">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#f59e0b]/30 via-[#d97706]/20 to-[#2d1b06] border border-[#fbbf24]/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] group-hover:border-[#fde047]/70 transition-all duration-300">
                            <Rocket className="w-4.5 h-4.5 text-[#fef08a] drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-[13px] font-semibold text-white group-hover:text-amber-200 transition-colors">Go Live in Minutes</h4>
                            <p className="text-[10.5px] sm:text-[11.5px] text-[#9ca3af] mt-0.5">Test instantly and automate your work</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: HeroSection_Automation_Image.png Expanded in the red mark area */}
                    <div className="lg:col-span-7 xl:col-span-8 w-full flex items-center justify-center lg:justify-end">
                      <div className="relative w-full h-[360px] sm:h-[430px] md:h-[480px] lg:h-[520px] xl:h-[560px] flex items-center justify-center">
                        <Image
                          src="/images/HeroSection_Automation_Image.png" 
                          alt="Visual Automation Builder Flow"
                          fill
                          className="object-contain object-center lg:object-right"
                          priority
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 850px"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
