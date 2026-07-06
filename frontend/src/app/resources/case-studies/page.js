
import { MotionDiv, MotionH1, MotionP, MotionSpan } from '@/components/ui/MotionWrapper';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { Award, Target, TrendingUp, Users, CheckCircle2, ArrowRight } from 'lucide-react';


export const metadata = {
  title: "Auromind Customer Success - AI Case Studies & Metrics",
  description: "Read real business success stories. See how startups and enterprises leverage Auromind's conversational AI agents to scale conversion rates."
};

export default function CaseStudiesPage() {
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

  const studies = [
    {
      metric: "+185%",
      label: "Conversion Boost",
      client: "Acme Corp",
      description: "Automated Instagram DM sales sequences increased conversion metrics by qualified lead filtering."
    },
    {
      metric: "-50%",
      label: "Response Latency",
      client: "Growth Maven",
      description: "Connected WhatsApp Business API cloud triggers to resolve developer setup inquiries under 3 seconds."
    },
    {
      metric: "42%",
      label: "Cart Recoveries",
      client: "Aurora Fashion",
      description: "Triggered cart abandonment discount template codes resulted in substantial recovery of sales."
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
            <Award className="w-3.5 h-3.5" /> Customer Success
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
              Driving <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Real Conversion Growth</span> for Companies
            </MotionH1>

            <MotionP 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Explore detailed case studies showing how startups, e-commerce storefronts, and enterprises automate sales scripts, qualify lead streams, and save thousands of operations hours using Auromind.
            </MotionP>

            {/* CTA Buttons */}
            <MotionDiv variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:-translate-y-0.5"
              >
                Start Scaling Free
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Browse Metrics
              </Link>
            </MotionDiv>

            {/* Quick Checklist */}
            <MotionDiv 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>+185% average conversion boost</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Under 3-second average response time</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Up to 42% cart abandonment recovery</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-violet-400 flex-shrink-0" />
                <span>Thousands of support hours saved</span>
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
                src="/images/case-studies.webp" 
                alt="Case Studies Dashboard Success Metrics" 
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
            <h2 className="text-3xl font-bold">Proven Enterprise Growth Metrics</h2>
            <p className="text-white/60 mt-4">Review how brands optimize funnel activities using custom integrations.</p>
          </MotionDiv>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {studies.map((s, i) => (
              <MotionDiv 
                key={i} 
                variants={itemVariants}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-all hover:border-white/10 text-center"
              >
                <div className="text-4xl md:text-5xl font-extrabold text-violet-400 mb-2">{s.metric}</div>
                <div className="text-xs uppercase tracking-widest text-white/40 mb-4 font-semibold">{s.label}</div>
                <h3 className="text-lg font-semibold mb-2">{s.client}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.description}</p>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Write Your Success Story?</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Configure screening rules, connect messaging lines, and scale conversions automatically today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Launch Your Success Campaign <ArrowRight className="w-4 h-4" />
          </Link>
        </MotionDiv>

      </MotionDiv>

      <FooterSection />
    </main>
  );
}
