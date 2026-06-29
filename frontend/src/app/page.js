'use client';

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import dynamic from 'next/dynamic';
import NavigationSection from '../components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '../components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import BeforeAfterSection from '../components/LandingPageNew/BeforeAfterSection/BeforeAfterSection';
import ProductDemoSection from '../components/LandingPageNew/ProductDemoSection/ProductDemoSection';
import HeroSectionNew from '../components/LandingPageNew/HeroSection/HeroSectionNew';
import FAQSection from '@/components/LandingPageNew/FAQSection/FAQSection';
import MessageManagementSection from '../components/LandingPageNew/MessageManagementSection/Messagemanagementsection';
import HowItWorks from '@/components/LandingPageNew/HowItWorksSection/HowItWorks';
import PricingSectionNew from '@/components/LandingPageNew/PricingSectionNewSection/PricingSectionNew';
import CtaSection from '@/components/LandingPageNew/FinalCTASection/ctasection';
import FooterSection from '@/components/LandingPageNew/FooterSection/Footer';

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
    // ─── Mobile check ────────────────────────────────────────────────
    // Mobile browsers have native GPU-accelerated inertia scroll.
    // Lenis replaces it with JS-driven scroll on the main thread → lag.
    // Detect: touch-capable device OR narrow screen → skip Lenis entirely.
    const isMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth <= 1024;

    if (isMobile) {
      // Native scroll — nothing to set up or tear down
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      lerp: 0.1,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);
    const onLock = () => lenis.stop();
    const onUnlock = () => lenis.start();

    window.addEventListener("section-scroll-lock", onLock);
    window.addEventListener("section-scroll-unlock", onUnlock);

    return () => {
      cancelAnimationFrame(rafId);
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