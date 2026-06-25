'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { GitBranch, GitMerge, Sliders, Play, Settings, CheckCircle2, ArrowRight } from 'lucide-react';

export default function WiresPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const features = [
    {
      icon: <GitBranch className="w-5 h-5 text-cyan-400" />,
      title: "Visual Node Graph",
      description: "Build custom customer journeys by dragging, dropping, and connecting nodes representing messages, delays, or actions."
    },
    {
      icon: <GitMerge className="w-5 h-5 text-purple-400" />,
      title: "Conditional Branching",
      description: "Send leads down different paths based on user answers, sentiment tags, qualification state, or time of day."
    },
    {
      icon: <Sliders className="w-5 h-5 text-emerald-400" />,
      title: "Variable Mapping",
      description: "Capture user response variables (e.g. email, budget, phone) and feed them directly into your CRM or Google Sheets."
    },
    {
      icon: <Play className="w-5 h-5 text-amber-400" />,
      title: "API Webhook Actions",
      description: "Trigger outbound webhooks to third-party services, process payments, or check database state inside the flow."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      <title>Visual Automation Wires - Drag & Drop Journey Builder | Auromind</title>
      <meta name="description" content="Orchestrate customer journeys visually. Build sales scripts, follow-up chains, and CRM integrations using Auromind's Automation Wires." />
      
      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <NavigationSection />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10"
      >
        {/* Tag */}
        <motion.div variants={itemVariants} className="flex justify-center lg:justify-start">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold tracking-wider text-cyan-300 uppercase mb-6">
            <GitBranch className="w-3.5 h-3.5" /> Workflow Canvas
          </span>
        </motion.div>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              Visual <span className="bg-gradient-to-r from-cyan-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">Automation Wires</span> for Customer Journeys
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Orchestrate conversational structures visually. Build, simulate, and deploy powerful sales scripts, follow-up chains, and CRM integrations without writing a single line of backend code.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5"
              >
                Launch Builder
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Watch Demo
              </Link>
            </motion.div>

            {/* Quick Benefits Checklist */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Drag & drop conversational canvas</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Zapier & Webhook ready</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Real-time visual debugger</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Multi-platform templates</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Mockup */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl">
              <Image 
                src="/images/wires-hero.png" 
                alt="Visual Wires Automation Builder Interface" 
                width={800} 
                height={800}
                className="rounded-xl w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* Feature Highlights Grid */}
        <div id="demo" className="mt-32 pt-16 border-t border-white/5">
          <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold">Unify Logic with Flows</h2>
            <p className="text-white/60 mt-4">Create robust processes that react in real-time to user behavior and platform metrics.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final Page CTA */}
        <motion.div 
          variants={itemVariants}
          className="mt-32 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black to-blue-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Build Your First Wire Automation</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Configure branching scripts and integrate them with your AI Brain in under 5 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Open Workflow Canvas <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </motion.div>

      <FooterSection />
    </main>
  );
}
