'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPage/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { HelpCircle, Key, CreditCard, Layers, Compass, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HelpCenterPage() {
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

  const faqs = [
    {
      question: "How do I upgrade my subscription plan?",
      answer: "To upgrade, navigate to Settings > Billing and click 'Upgrade Plan'. Select from Free, Pro, or Enterprise."
    },
    {
      question: "Can I integrate Auromind with Slack?",
      answer: "Yes! Connect your Slack workspace inside Settings > Integrations to receive hot lead handover alerts."
    },
    {
      question: "Where can I find my invoices?",
      answer: "Invoices are generated automatically on your renewal date. You can view them in Settings > Billing."
    },
    {
      question: "What is the API rate limit?",
      answer: "Free tier accounts are capped at 60 requests/minute. Pro and Enterprise support customizable limits."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      <title>Auromind Help Center - FAQs & Troubleshooting</title>
      <meta name="description" content="Search the Auromind knowledge base. Find troubleshooting guides, FAQs, billing configurations, and integration setup guides." />

      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      <NavigationSection />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10"
      >
        {/* Tag */}
        <motion.div variants={itemVariants} className="flex justify-center lg:justify-start">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold tracking-wider text-blue-300 uppercase mb-6">
            <HelpCircle className="w-3.5 h-3.5" /> Support Center
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
              How can we <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">help you today?</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Search our comprehensive knowledge base, review frequently asked questions, configure billing preferences, and troubleshoot integration questions.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5"
              >
                Create Support Ticket
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Browse FAQs
              </Link>
            </motion.div>

            {/* Quick Checklist */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 flex-shrink-0" />
                <span>Onboarding & quick setup guides</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 flex-shrink-0" />
                <span>Billing options & renewals</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 flex-shrink-0" />
                <span>Third-party app integration help</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-400 flex-shrink-0" />
                <span>Under 1-hour priority support</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Mockup */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl">
              <Image 
                src="/images/help-center.png" 
                alt="Help Center Screen Visualisation" 
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
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-white/60 mt-4">Find fast answers to common setup and operational questions.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((f, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10"
              >
                <h3 className="text-lg font-semibold mb-2">{f.question}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final Page CTA */}
        <motion.div 
          variants={itemVariants}
          className="mt-32 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-950/20 via-black to-indigo-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Can't find what you're looking for? Reach out to our customer operations agents directly.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Contact Customer Support <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </motion.div>

      <FooterSection />
    </main>
  );
}
