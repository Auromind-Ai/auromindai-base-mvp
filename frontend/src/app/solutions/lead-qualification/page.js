
import { MotionDiv, MotionH1, MotionP, MotionSpan } from '@/components/ui/MotionWrapper';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { Filter, Users, Shield, Target, Award, CheckCircle2, ArrowRight } from 'lucide-react';


export const metadata = {
  title: "AI Lead Qualification & Automated Scoring",
  description: "Automate your inbound sales funnel. Score leads, capture critical customer details, and book qualified meetings on autopilot using Auromind AI.",
  alternates: {
    canonical: "/solutions/lead-qualification",
  },
  openGraph: {
    title: "AI Lead Qualification & Automated Scoring | Auromind AI",
    description: "Automate your inbound sales funnel. Score leads, capture critical customer details, and book qualified meetings on autopilot using Auromind AI.",
    url: "https://orbionagents.com/solutions/lead-qualification",
    type: "website",
  },
  twitter: {
    title: "AI Lead Qualification & Automated Scoring | Auromind AI",
    description: "Automate your inbound sales funnel. Score leads, capture critical customer details, and book qualified meetings on autopilot using Auromind AI.",
  },
};

export default function LeadQualificationPage() {
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
      icon: <Target className="w-5 h-5 text-violet-400" />,
      title: "Interactive Scoring",
      description: "AI evaluates user answers, budget brackets, timeline urgency, and brand fit to instantly rank every lead."
    },
    {
      icon: <Filter className="w-5 h-5 text-indigo-400" />,
      title: "Automated Filtering",
      description: "Filter out spam, window shoppers, and out-of-scope inquiries before they ever reach your human sales reps."
    },
    {
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      title: "Governed Verification",
      description: "Ensures contact info, email addresses, and phone formats are active and verified in real-time."
    },
    {
      icon: <Award className="w-5 h-5 text-purple-400" />,
      title: "CRM Auto-Sync",
      description: "Qualified leads are pushed instantly to your HubSpot, Salesforce, or custom DB pipeline with detailed notes."
    }
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      
      

      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-semibold tracking-wider text-violet-300 uppercase mb-6">
            <Filter className="w-3.5 h-3.5" /> Sales Funnel Solution
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
              Qualify & Score <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Leads Automatically</span> in Minutes
            </MotionH1>

            <MotionP 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Don't waste manual hours filtering low-intent leads. Let Auromind qualifying agents hold automated chats, rank client intent, and hand over only the hottest pipeline opportunities to your reps.
            </MotionP>

            {/* CTA Buttons */}
            <MotionDiv variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:-translate-y-0.5"
              >
                Start Qualifying Free
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                See Funnel Mechanics
              </Link>
            </MotionDiv>

            {/* Quick Checklist */}
            <MotionDiv 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Pre-qualify leads 24/7 on WhatsApp/IG</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Custom qualifying criteria & questionnaires</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Redirect unqualified leads to self-serve docs</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Book hot leads straight onto Calendly</span>
              </div>
            </MotionDiv>
          </div>

          {/* Right Column: Visual Mockup */}
          <MotionDiv 
            variants={itemVariants}
            className="lg:col-span-5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 opacity-60" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0B0B0F]/85 p-2 overflow-hidden shadow-2xl backdrop-blur-xl">
              <Image 
                src="/images/lead-qualification.webp" 
                alt="Lead Qualification Dashboard Visualisation" 
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
            <h2 className="text-3xl font-bold">Double Your Sales Velocity</h2>
            <p className="text-white/60 mt-4">Automate screening and save your sales team hundreds of hours weekly.</p>
          </MotionDiv>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <MotionDiv 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>

        {/* Final Page CTA */}
        <MotionDiv 
          variants={itemVariants}
          className="mt-32 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/20 via-black to-indigo-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Unclog Your Sales Pipeline Today</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Configure screening rules, upload your scripts, and watch your calendar fill with high-ticket appointments.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Deploy AI Qualification <ArrowRight className="w-4 h-4" />
          </Link>
        </MotionDiv>

      </MotionDiv>

      <FooterSection />
    </main>
  );
}
