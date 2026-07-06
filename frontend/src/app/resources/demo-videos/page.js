
import { MotionDiv, MotionH1, MotionP, MotionSpan } from '@/components/ui/MotionWrapper';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { PlayCircle, Shield, Sparkles, Video, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';


export const metadata = {
  title: "Auromind Demo Library - Setup Tutorials & Walkthrough Videos",
  description: "Watch product walkthroughs and setup guides. Learn how to configure RAG databases, connect APIs, and automate sales conversations with Auromind."
};

export default function DemoVideosPage() {
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

  const tutorials = [
    {
      title: "Mastering Data Analytics",
      progress: "72%",
      description: "Learn how to build analytics aggregations and inspect outbound conversational events."
    },
    {
      title: "Cloud Architecture Basics",
      progress: "55%",
      description: "How to configure remote PostgreSQL integrations and pgvector RAG data storage."
    },
    {
      title: "AI Implementation Strategy",
      progress: "90%",
      description: "Setting up system prompt guidelines and Model Context Protocol safeguards."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      
      

      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      <NavigationSection />

      <MotionDiv 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10"
      >
        {/* Tag */}
        <MotionDiv variants={itemVariants} className="flex justify-center lg:justify-start">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold tracking-wider text-cyan-300 uppercase mb-6">
            <Video className="w-3.5 h-3.5" /> Video Tutorials
          </span>
        </MotionDiv>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <MotionH1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              Explore Our <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">AI Video Tutorial</span> Library
            </MotionH1>

            <MotionP 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Review step-by-step videos demonstrating setup flows. Learn how to train your AI Brain, build node graph scripts in Wires, and route conversations inside the Omnichannel Inbox.
            </MotionP>

            {/* CTA Buttons */}
            <MotionDiv variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5"
              >
                Start Learning Free
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                See Course Index
              </Link>
            </MotionDiv>

            {/* Quick Checklist */}
            <MotionDiv 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Step-by-step developer guides</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>AI Brain training & RAG uploading</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>WhatsApp Business templates set up</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Human takeover routing configurations</span>
              </div>
            </MotionDiv>
          </div>

          {/* Right Column: Visual Mockup */}
          <MotionDiv 
            variants={itemVariants}
            className="lg:col-span-5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl">
              <Image 
                src="/images/demo-videos.webp" 
                alt="Demo Videos Library UI Mockup" 
                width={800} 
                height={800}
                className="rounded-xl w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
          </MotionDiv>
        </div>

        {/* Feature Highlights Grid */}
        <div id="demo" className="mt-32 pt-16 border-t border-white/5">
          <MotionDiv variants={itemVariants} className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold">Featured Video Courses</h2>
            <p className="text-white/60 mt-4">Develop conversational solutions and configure safeguards policies in minutes.</p>
          </MotionDiv>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tutorials.map((t, i) => (
              <MotionDiv 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <PlayCircle className="w-8 h-8 text-cyan-400" />
                  <span className="text-xs bg-cyan-400/10 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-400/20">{t.progress} done</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4">{t.description}</p>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: t.progress }} />
                </div>
              </MotionDiv>
            ))}
          </div>
        </div>

        {/* Final Page CTA */}
        <MotionDiv 
          variants={itemVariants}
          className="mt-32 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black to-indigo-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrate AI Growth Today</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Equip your product team with dynamic AI training walkthroughs, configure webhook actions, and grow conversions.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Access All Video Tutorials <ArrowRight className="w-4 h-4" />
          </Link>
        </MotionDiv>

      </MotionDiv>

      <FooterSection />
    </main>
  );
}
