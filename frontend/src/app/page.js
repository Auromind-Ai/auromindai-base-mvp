'use client';

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import NavigationSection from '../components/LandingPage/NavigationSection';
import HeroSectionNew from '../components/LandingPageNew/HeroSection/HeroSectionNew';
import ModernSaaSBackground from '../components/LandingPage/ModernSaaSBackground';
import InteractiveScrollSection from '../components/LandingPage/InteractiveScrollSection';
import BeforeAfterSection from '../components/LandingPage/BeforeAfterSection';
import SeeItInActionSection from '../components/LandingPage/SeeItInActionSection';
import PlatformTabsSection from '../components/LandingPage/PlatformTabsSection';
import ProductDemoSection from '../components/LandingPage/ProductDemoSection';
import PricingSection from '../components/LandingPage/PricingSection';
import IntegrationsSection from '../components/LandingPage/IntegrationsSection';
import FAQSection from '@/components/LandingPageNew/FAQSection/FAQSection';
import CtaSection from '../components/LandingPage/CtaSection';
import FooterSection from '../components/LandingPage/FooterSection';
import SocialProofSection from '../components/LandingPage/SocialProofSection';
import MessageManagementSection from '../components/LandingPageNew/MessageManagementSection/Messagemanagementsection';
import HowItWorks from '@/components/LandingPageNew/HowItWorksSection/HowItWorks';
import PricingSectionNew from '@/components/LandingPageNew/PricingSectionNewSection/PricingSectionNew';
import UICtaSectionTwo from "../components/ui/CtaSectionTwo";
import TestimonialsSection from '@/components/LandingPageNew/TestimonialsSection/TestimonialsSection';
import InteractiveBrainSection from "@/components/LandingPageNew/InteractiveBrainSection/InteractiveBrainSection";
import dynamic from 'next/dynamic';
// import Lanyard from '@/components/LandingPageNew/HowItWorksNewSection/Lanyard';

const ManageChatsSection = dynamic(
  () => import('../components/LandingPageNew/ManageChatsSection/ManagechatsSectionNew'),
  { ssr: false }
);

const GirlViewer = dynamic(() => import('@/components/GirlViewer'), {
  ssr: false,
});

const Lanyard = dynamic(() => import('../components/LandingPageNew/HowItWorksNewSection/Lanyard'), { ssr: false });

const NeuroHero = dynamic(
  () => import('../components/NeuroHero.js'),
  { ssr: false }
);

export default function LandingPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      lerp: 0.1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    const onLock = () => lenis.stop();
  const onUnlock = () => lenis.start();

  window.addEventListener("section-scroll-lock", onLock);
  window.addEventListener("section-scroll-unlock", onUnlock);

  return () => {
    lenis.destroy();
    window.removeEventListener("section-scroll-lock", onLock);
    window.removeEventListener("section-scroll-unlock", onUnlock);
  };
}, []);

  return (
    <main ref={containerRef} className="min-h-screen bg-white relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10">
        <NavigationSection />
        <ModernSaaSBackground />

        <HeroSectionNew />

        <MessageManagementSection />

        <ManageChatsSection />        

        <div className="relative z-10 bg-white">
          
          {/* <InteractiveScrollSection /> */}
          <BeforeAfterSection />
          {/* <SeeItInActionSection /> */}
          {/* <PlatformTabsSection /> */}
          <HowItWorks />

          {/* <Lanyard /> */}

          {/* <GirlViewer /> */}
          
          <PricingSectionNew />
          <TestimonialsSection />
          
          
          {/* <InteractiveBrainSection /> */}

          <NeuroHero />
          
          {/* <IntegrationsSection /> */}
          <FAQSection />
          <ProductDemoSection />
          <SocialProofSection />
          {/* <CtaSection /> */}
          <UICtaSectionTwo />
          <FooterSection />
        </div>
      </div>
    </main>
  );
}