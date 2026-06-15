'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPage/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { Newspaper, BookOpen, Clock, Users, ArrowUpRight, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BlogPage() {
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

  const posts = [
    {
      title: "Revolutionizing Sales with AI Automation",
      category: "AI AUTOMATION",
      author: "Sarah J.",
      readTime: "7 min read",
      description: "How companies leverage conversational models to qualification score inbound client messaging feeds."
    },
    {
      title: "The Future of Cloud Computing & SaaS",
      category: "CLOUD SAAS",
      author: "David L.",
      readTime: "5 min read",
      description: "Exploring RAG database synchronisation and pgvector latency optimization."
    },
    {
      title: "Scaling with Automated Workflows",
      category: "WORKFLOWS",
      author: "Elena R.",
      readTime: "6 min read",
      description: "How Wires node graphs automate onboarding sequences and follow-up drips."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      <title>Auromind Blog - AI Sales & Conversational Marketing Insights</title>
      <meta name="description" content="Read industry tips on AI sales, WhatsApp marketing, CRM integrations, and omnichannel inbox workflows on the Auromind Blog." />

      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold tracking-wider text-indigo-300 uppercase mb-6">
            <Newspaper className="w-3.5 h-3.5" /> Nexus Chronicles
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
              Latest Insights on <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">AI Sales & Growth</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Discover strategic advice and industry research covering conversational sales design, RAG implementations, WhatsApp template strategies, and automated customer journeys.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:-translate-y-0.5"
              >
                Subscribe to Nexus
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Read Trending Topics
              </Link>
            </motion.div>

            {/* Quick Checklist */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <span>Conversational sales guides</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <span>RAG database optimization insights</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <span>WhatsApp Business API marketing strategies</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <span>Outbound re-engagement sweeps guides</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Mockup */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl">
              <Image 
                src="/images/blog.png" 
                alt="Nexus Chronicles Blog Listing UI" 
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
            <h2 className="text-3xl font-bold">Trending Articles</h2>
            <p className="text-white/60 mt-4">Uncover deep analysis of how modern SaaS and AI systems optimize pipeline velocity.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((p, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">{p.category}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 flex items-center justify-between group-hover:text-indigo-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed mb-6">{p.description}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-white/40">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white/70">{p.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{p.readTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final Page CTA */}
        <motion.div 
          variants={itemVariants}
          className="mt-32 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-black to-purple-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Never Miss an Insight</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Subscribe to our newsletter to receive the latest updates, case studies, and RAG setup guides.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Join the Newsletter <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </motion.div>

      <FooterSection />
    </main>
  );
}
