'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPage/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { MessageSquareCode, Share2, Smartphone, Landmark, Megaphone, CheckCircle2, ArrowRight } from 'lucide-react';

export default function WhatsAppAutomationPage() {
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
      icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
      title: "Official Meta API Integration",
      description: "Secure, reliable, and verified connection through Meta Cloud API. No risk of phone number blocking or shadow-banning."
    },
    {
      icon: <Megaphone className="w-5 h-5 text-teal-400" />,
      title: "Segmented Broadcasts",
      description: "Send personalized WhatsApp templates to thousands of opted-in customers at once, sorted by CRM tag."
    },
    {
      icon: <MessageSquareCode className="w-5 h-5 text-cyan-400" />,
      title: "Interactive Message Templates",
      description: "Utilize WhatsApp buttons, list menus, product catalogs, and multimedia payloads directly in automated flows."
    },
    {
      icon: <Landmark className="w-5 h-5 text-blue-400" />,
      title: "Instant Checkout Links",
      description: "AI bot instantly resolves customer purchase intent by building custom Stripe/NexaPay payment links right in the conversation."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      <title>WhatsApp Automation - Scale Business Conversations & Broadcasts | Auromind</title>
      <meta name="description" content="Automate inbound support, product recommendations, and segmented broadcasts with Meta's official WhatsApp Business Cloud API." />
      
      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[150px] pointer-events-none" />

      <NavigationSection />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10"
      >
        {/* Tag */}
        <motion.div variants={itemVariants} className="flex justify-center lg:justify-start">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold tracking-wider text-emerald-300 uppercase mb-6">
            <Share2 className="w-3.5 h-3.5" /> WhatsApp Business API
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
              Scale Conversations on <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">WhatsApp Business</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Build trust and close deals on the world's most popular messaging app. Automate inbound support, deliver interactive product recommendations, and broadcast notifications with 98% open rates.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:-translate-y-0.5"
              >
                Connect WhatsApp
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Watch Flow Video
              </Link>
            </motion.div>

            {/* Quick Checklist */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                <span>Green badge verification ready</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                <span>Support for interactive menus & catalog list</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                <span>Automatic opt-out management</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                <span>CRM integration & webhook syncing</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Mockup */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-5 relative group flex justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-[40px] blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60 max-w-[420px]" />
            <div className="relative rounded-[36px] border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl max-w-[380px]">
              <Image 
                src="/images/whatsapp-hero.png" 
                alt="WhatsApp Chatbot Mobile Visualisation" 
                width={380} 
                height={760}
                className="rounded-[30px] w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* Feature Highlights Grid */}
        <div id="demo" className="mt-32 pt-16 border-t border-white/5">
          <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold">Comprehensive WhatsApp Solutions</h2>
            <p className="text-white/60 mt-4">Grow conversions, reduce response times, and retain customers using WhatsApp automated workflows.</p>
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
          className="mt-32 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-black to-teal-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrate WhatsApp Today</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Configure templates, link your official phone line, and let your AI Brain handle qualification and follow-ups.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Scale Your Outbound Sales <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </motion.div>

      <FooterSection />
    </main>
  );
}
