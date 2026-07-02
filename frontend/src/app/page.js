'use client';

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import dynamic from 'next/dynamic';
import NavigationSection from '../components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '../components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import BeforeAfterSection from '../components/LandingPageNew/BeforeAfterSection/BeforeAfterSection';
import ProductDemoSection from '../components/LandingPageNew/ProductDemoSection/ProductDemoSection';
// import SocialProofSection from '../components/LandingPageNew/SocialProofSection/SocialProofSection';
import HeroSectionNew from '../components/LandingPageNew/HeroSection/HeroSectionNew';
import FAQSection from '@/components/LandingPageNew/FAQSection/FAQSection';
import MessageManagementSection from '../components/LandingPageNew/MessageManagementSection/Messagemanagementsection';
import HowItWorks from '@/components/LandingPageNew/HowItWorksSection/HowItWorks';
import PricingSectionNew from '@/components/LandingPageNew/PricingSectionNewSection/PricingSectionNew';
// import TestimonialsSection from '@/components/LandingPageNew/TestimonialsSection/TestimonialsSection';
import CtaSection from '@/components/LandingPageNew/FinalCTASection/Ctasection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ManageChatsSection = dynamic(
  () => import('../components/LandingPageNew/ManageChatsSection/ManagechatsSection'),
  { ssr: false }
);

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
        <ErrorBoundary fallback={(err) => <div className="p-10 text-red-500 bg-black z-50 relative">Nav Error: {err?.message}</div>}>
          <NavigationSection />
        </ErrorBoundary>
        <ErrorBoundary fallback={(err) => <div className="p-10 text-red-500 bg-black z-50 relative">Bg Error: {err?.message}</div>}>
          <ModernSaaSBackground />
        </ErrorBoundary>

        <ErrorBoundary fallback={(err) => <div className="p-10 text-red-500 bg-black z-50 relative">Hero Error: {err?.message}</div>}>
          <HeroSectionNew />
        </ErrorBoundary>

        <ErrorBoundary fallback={(err) => <div className="p-10 text-red-500 bg-black z-50 relative">MessageManagement Error: {err?.message}</div>}>
          <MessageManagementSection />
        </ErrorBoundary>

        <ErrorBoundary fallback={(err) => <div className="p-10 text-red-500 bg-black z-50 relative">ManageChats Error: {err?.message}</div>}>
          <ManageChatsSection />        
        </ErrorBoundary>

        <div className="relative z-10 bg-white">
          
          <BeforeAfterSection />

          <NeuroHero />

          <HowItWorks />
          
          <PricingSectionNew />
          {/* <TestimonialsSection /> */}
   
          <FAQSection />
          <ProductDemoSection />
          {/* <SocialProofSection /> */}

          <CtaSection />
          <FooterSection />
        </div>
      </div>
    </main>
  );
}