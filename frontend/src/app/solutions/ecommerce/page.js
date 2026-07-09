
import { MotionDiv, MotionH1, MotionP, MotionSpan } from '@/components/ui/MotionWrapper';
import Image from 'next/image';
import Link from 'next/link';
import NavigationSection from '@/components/LandingPageNew/NavigationSection/NavigationSection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { ShoppingBag, ShoppingCart, Percent, Share2, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';


export const metadata = {
  title: "E-commerce AI Chatbot & Cart Recovery",
  description: "Boost store sales. Connect Auromind AI to automate cart recovery follow-ups, sync product catalogs, and send Stripe payment links directly in chat.",
  alternates: {
    canonical: "/solutions/ecommerce",
  },
  openGraph: {
    title: "E-commerce AI Chatbot & Cart Recovery | Auromind AI",
    description: "Boost store sales. Connect Auromind AI to automate cart recovery follow-ups, sync product catalogs, and send Stripe payment links directly in chat.",
    url: "https://orbionagents.com/solutions/ecommerce",
    type: "website",
  },
  twitter: {
    title: "E-commerce AI Chatbot & Cart Recovery | Auromind AI",
    description: "Boost store sales. Connect Auromind AI to automate cart recovery follow-ups, sync product catalogs, and send Stripe payment links directly in chat.",
  },
};

export default function EcommercePage() {
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
      icon: <ShoppingCart className="w-5 h-5 text-cyan-400" />,
      title: "Cart Abandonment Recovery",
      description: "Automatically identify cart abandonment cases and fire personalized follow-ups containing dynamic recovery discount links."
    },
    {
      icon: <Percent className="w-5 h-5 text-blue-400" />,
      title: "Dynamic Promo Campaigns",
      description: "Deliver active promotional coupons, limited-time seasonal pricing, or subscriber discounts directly in chat."
    },
    {
      icon: <Share2 className="w-5 h-5 text-indigo-400" />,
      title: "Product Catalog Syncing",
      description: "Sync your store catalog directly to chat variables. Recommend matching sizes, stock availability, and checkouts on the fly."
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-purple-400" />,
      title: "Conversational FAQ Assist",
      description: "Resolve support FAQs regarding shipping statuses, delivery return policies, and payments instantly with the AI Brain."
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
            <ShoppingBag className="w-3.5 h-3.5" /> Industry Solutions
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
              Scale E-commerce <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Cart Recoveries & Sales</span>
            </MotionH1>

            <MotionP 
              variants={itemVariants}
              className="text-lg text-white/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Convert passive browsers into paying customers. Connect Auromind to Shopify or custom platforms to deliver interactive product catalogs, recover abandoned shopping carts, and generate stripe checkout cards instantly inside chat.
            </MotionP>

            {/* CTA Buttons */}
            <MotionDiv variants={itemVariants} className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5"
              >
                Connect Store Catalog
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-white transition-all hover:-translate-y-0.5"
              >
                Watch Flow Video
              </Link>
            </MotionDiv>

            {/* Quick Checklist */}
            <MotionDiv 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5 text-left max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Recover up to 68% of abandoned carts automatically</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Synchronised product catalog listings in chat</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Build Stripe checkout links dynamically</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
                <span>Synchronise order updates & tracking codes</span>
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
                src="/images/ecommerce.webp" 
                alt="AI E-commerce Recovery Overview Dashboard Visualisation" 
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
            <h2 className="text-3xl font-bold">Comprehensive Storefront Automation</h2>
            <p className="text-white/60 mt-4">Recover abandoned revenue, automate catalog recommendations, and delight shoppers.</p>
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
          className="mt-32 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black to-indigo-950/20 p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrate Storefront AI Today</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8 text-base">
            Equip your ecommerce brand with automatic product recommendation flows, cart abandonment sweeps, and dynamic stripe checkout links.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#814AC8] hover:bg-[#8d58d1] font-semibold text-white shadow-lg transition-all"
          >
            Scale Your E-commerce Store <ArrowRight className="w-4 h-4" />
          </Link>
        </MotionDiv>

      </MotionDiv>

      <FooterSection />
    </main>
  );
}
