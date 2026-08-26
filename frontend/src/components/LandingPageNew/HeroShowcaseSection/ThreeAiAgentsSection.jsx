"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  ShoppingCart,
  Headphones,
  ClipboardList,
  CalendarCheck,
  Calendar,
  ShieldCheck,
  UserCheck,
  Package,
  Tag,
  Link as LinkIcon,
  TrendingUp,
  HelpCircle,
  Ticket,
  CheckCircle2,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Send,
} from "lucide-react";

export const AGENTS_DATA = {
  lead: {
    id: "lead",
    name: "Lead Agent",
    tagline: "Qualify & Capture Leads",
    themeColor: "#A855F7",
    activeCardBg: "bg-gradient-to-br from-[#6730e6]/35 via-[#3d1c8c]/20 to-[#1c0d38]/15 border-white/[0.12] shadow-[0_4px_20px_rgba(103,48,230,0.18)]",
    iconBg: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    pillBadgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
    ringColor: "rgba(168, 85, 247, 0.35)",
    glowGradient: "from-purple-600/30 via-indigo-600/10 to-transparent",
    icon: Crosshair,
    avatar: "/images/Ai_Agent_image.png",
    badgeText: "✦ Lead Agent",
    roleTitle: "Your AI-powered lead generation specialist",
    featuresHeader: "LEAD AGENT FEATURES",
    metricBadge: "High Accuracy",
    features: [
      {
        id: "feat-1",
        title: "Collect All Details",
        description:
          "Collects name, email, phone, company, requirements, budget and more step-by-step.",
        icon: ClipboardList,
      },
      {
        id: "feat-2",
        title: "Demo Booked",
        description:
          "Automatically books a demo or meeting using Google Meet integration.",
        icon: CalendarCheck,
      },
      {
        id: "feat-3",
        title: "Data Validation",
        description:
          "Validates email, phone and other details to ensure accurate information.",
        icon: ShieldCheck,
      },
      {
        id: "feat-4",
        title: "Lead Qualification",
        description:
          "Qualifies leads based on your business rules and assigns a lead score.",
        icon: UserCheck,
      },
      {
        id: "feat-5",
        title: "Lead Handoff",
        description:
          "Sends qualified leads to your CRM or sales team with all collected details and context.",
        icon: Send,
      },
    ],
  },
  sales: {
    id: "sales",
    name: "Sales Agent",
    tagline: "Convert & Close Deals",
    themeColor: "#3B82F6",
    activeCardBg: "bg-gradient-to-br from-[#6730e6]/35 via-[#3d1c8c]/20 to-[#1c0d38]/15 border-white/[0.12] shadow-[0_4px_20px_rgba(103,48,230,0.18)]",
    iconBg: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    pillBadgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.25)]",
    ringColor: "rgba(59, 130, 246, 0.35)",
    glowGradient: "from-blue-600/30 via-cyan-600/10 to-transparent",
    icon: ShoppingCart,
    avatar: "/images/Ai_Agent_image.png",
    badgeText: "🛒 Sales Agent",
    roleTitle: "Your AI-powered sales consultant",
    featuresHeader: "SALES AGENT FEATURES",
    metricBadge: "High Conversion",
    features: [
      {
        id: "feat-1",
        title: "Product Knowledge",
        description:
          "Provides accurate information about products, features, pricing and availability.",
        icon: Package,
      },
      {
        id: "feat-2",
        title: "Objection Handling",
        description:
          "Handles customer objections on price, features, timing, and competitors with confidence.",
        icon: Tag,
      },
      {
        id: "feat-3",
        title: "Payment Link",
        description:
          "Sends secure payment links and helps complete the purchase seamlessly.",
        icon: LinkIcon,
      },
      {
        id: "feat-4",
        title: "Demo / Meeting Booking",
        description:
          "Books demos or meetings using Google Meet integration automatically.",
        icon: Calendar,
      },
      {
        id: "feat-5",
        title: "Deal Tracking",
        description:
          "Tracks deal stages and updates lead score to maximize conversions.",
        icon: TrendingUp,
      },
    ],
  },
  support: {
    id: "support",
    name: "Support Agent",
    tagline: "Resolve & Delight Customers",
    themeColor: "#10B981",
    activeCardBg: "bg-gradient-to-br from-[#6730e6]/35 via-[#3d1c8c]/20 to-[#1c0d38]/15 border-white/[0.12] shadow-[0_4px_20px_rgba(103,48,230,0.18)]",
    iconBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    pillBadgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
    ringColor: "rgba(16, 185, 129, 0.35)",
    glowGradient: "from-emerald-600/30 via-teal-600/10 to-transparent",
    icon: Headphones,
    avatar: "/images/Ai_Agent_image.png",
    badgeText: "🎧 Support Agent",
    roleTitle: "Your AI-powered support specialist",
    featuresHeader: "SUPPORT AGENT FEATURES",
    metricBadge: "99.9% Uptime",
    features: [
      {
        id: "feat-1",
        title: "Instant Issue Resolution",
        description:
          "Searches knowledge base and provides instant answers to common issues.",
        icon: HelpCircle,
      },
      {
        id: "feat-2",
        title: "Ticket Creation",
        description:
          "Automatically creates a support ticket when the issue requires human attention.",
        icon: Ticket,
      },
      {
        id: "feat-3",
        title: "Customer Details Collection",
        description:
          "Collects customer name, contact details, and issue description step-by-step.",
        icon: UserCheck,
      },
      {
        id: "feat-4",
        title: "Solution Verification",
        description:
          "Confirms if the solution worked. If not, escalates to support team.",
        icon: CheckCircle2,
      },
      {
        id: "feat-5",
        title: "Escalation & Handoff",
        description:
          "Seamlessly escalates complex issues to human agents with full context.",
        icon: TrendingUp,
      },
    ],
  },
};

export default function ThreeAiAgentsSection() {
  const [selectedAgentKey, setSelectedAgentKey] = useState("lead");
  const currentAgent = AGENTS_DATA[selectedAgentKey] || AGENTS_DATA.lead;

  const agentKeys = ["lead", "sales", "support"];

  return (
    <div className="w-full text-white select-none pt-1 sm:pt-2 pb-1">
      {/* ========================================================================= */}
      {/* MAIN 3-COLUMN INTERACTIVE SHOWCASE                                        */}
      {/* ========================================================================= */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center w-full">
        
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: SELECT AGENT CARDS (4 cols)                                */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 z-20">
          <div className="text-[11px] uppercase tracking-widest text-[#7f869e] font-semibold pl-1">
            SELECT AGENT
          </div>

          <div className="flex flex-col gap-2.5">
            {agentKeys.map((key) => {
              const agent = AGENTS_DATA[key];
              const isSelected = selectedAgentKey === key;
              const IconComp = agent.icon;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedAgentKey(key)}
                  className={`group relative text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 overflow-hidden ${
                    isSelected
                      ? `${agent.activeCardBg}`
                      : "bg-[#0b0d14]/70 border-white/[0.06] hover:bg-[#121522] hover:border-white/[0.12]"
                  }`}
                >
                  {/* Active Left Indicator Accent Bar (matching Top Tabs style) */}
                  {isSelected && (
                    <motion.div
                      layoutId="activeAgentAccent"
                      className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#9c75ff] to-[#6730e6]"
                    />
                  )}

                  <div className="flex items-center gap-3 pl-1">
                    {/* Icon Container */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                        isSelected
                          ? `${agent.iconBg}`
                          : "bg-white/[0.04] text-white/50 border-white/[0.08]"
                      }`}
                    >
                      <IconComp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
                    </div>

                    {/* Agent Name & Tagline */}
                    <div>
                      <div
                        className={`text-sm sm:text-[14.5px] font-semibold tracking-tight transition-colors ${
                          isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                        }`}
                      >
                        {agent.name}
                      </div>
                      <div
                        className={`text-[10.5px] sm:text-[11px] leading-snug mt-0.5 transition-colors ${
                          isSelected ? "text-[#c8c0db]" : "text-[#8e95ab]"
                        }`}
                      >
                        {agent.tagline}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <ChevronRight
                    className={`w-4 h-4 transition-all duration-300 ${
                      isSelected
                        ? "text-[#9c75ff] translate-x-0.5 opacity-100"
                        : "text-white/30 group-hover:text-white/70 opacity-60"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CENTER COLUMN: INCREASED SIZE GIRL IMAGE + BOTTOM FADE + DYNAMIC BADGE  */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center relative py-1 lg:py-0 z-10">
          {/* Atmospheric Ambient Glow Backdrop */}
          <div
            className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-radial from-purple-600/30 via-indigo-600/12 to-transparent blur-3xl pointer-events-none -z-10"
          />

          {/* Larger Girl Image with Smooth Bottom Opacity Gradient Fade (No Surrounding Rings) */}
          <div className="relative w-56 sm:w-64 md:w-72 h-60 sm:h-68 md:h-72 flex items-end justify-center overflow-visible">
            <div
              className="relative w-full h-full flex items-end justify-center"
              style={{
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 100%)",
              }}
            >
              <Image
                src="/images/Ai_Agent_image.png"
                alt="AI Agent"
                fill
                sizes="(max-width: 768px) 240px, 300px"
                className="object-contain object-bottom scale-105"
                priority
              />
            </div>
          </div>

          {/* Dynamic Badge per selected agent (Sitting right below faded bottom) */}
          <div className="-mt-3 sm:-mt-4 relative z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={`badge-${currentAgent.id}`}
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border shadow-md backdrop-blur-md ${currentAgent.pillBadgeBg}`}
              >
                <span>{currentAgent.badgeText}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: DYNAMIC AGENT FEATURES LIST (4 cols)                      */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 z-20">
          <div className="text-[11px] uppercase tracking-widest text-[#7f869e] font-semibold pl-1">
            {currentAgent.featuresHeader}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`features-${currentAgent.id}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, staggerChildren: 0.04 }}
              className="flex flex-col gap-2"
            >
              {currentAgent.features.map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={feat.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-[#0b0d14]/70 border border-white/[0.07] hover:border-white/[0.14] transition-all duration-200 flex items-start gap-2.5"
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${currentAgent.iconBg}`}
                    >
                      <FeatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-[12.5px] font-semibold text-white/95 leading-tight">
                        {feat.title}
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] text-[#8e95ab] leading-snug mt-0.5">
                        {feat.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM TRUST & RELIABILITY BAR                                            */}
      {/* ========================================================================= */}
      <div className="mt-5 sm:mt-6 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#090b12] border border-white/[0.08] text-[10.5px] sm:text-[11.5px] text-white/75 shadow-inner">
          {/* Badge 1 */}
          <div className="flex items-center justify-center sm:justify-start gap-2 px-1.5 py-1">
            <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="font-medium text-white/90 truncate">Enterprise-Grade Security</span>
          </div>

          {/* Badge 2 */}
          <div className="flex items-center justify-center sm:justify-start gap-2 px-1.5 py-1">
            <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-medium text-white/90 truncate">24/7 Availability</span>
          </div>

          {/* Badge 3 */}
          <div className="flex items-center justify-center sm:justify-start gap-2 px-1.5 py-1">
            <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="font-medium text-white/90 truncate">Multi-language Support</span>
          </div>

          {/* Badge 4 (Dynamic per agent) */}
          <div className="flex items-center justify-center sm:justify-start gap-2 px-1.5 py-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-white/90 truncate">{currentAgent.metricBadge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
