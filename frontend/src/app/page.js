'use client';

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import NavigationSection from '../components/LandingPage/NavigationSection';
import HeroSection from '../components/LandingPage/HeroSection';
import ModernSaaSBackground from '../components/LandingPage/ModernSaaSBackground';
import InteractiveScrollSection from '../components/LandingPage/InteractiveScrollSection';
import BeforeAfterSection from '../components/LandingPage/BeforeAfterSection';
import SeeItInActionSection from '../components/LandingPage/SeeItInActionSection';
import PlatformTabsSection from '../components/LandingPage/PlatformTabsSection';
import HowItWorksSection from '../components/LandingPage/HowItWorksSection';
import ProductDemoSection from '../components/LandingPage/ProductDemoSection';
import PricingSection from '../components/LandingPage/PricingSection';
import TestimonialsSection from '../components/LandingPage/TestimonialsSection';
import IntegrationsSection from '../components/LandingPage/IntegrationsSection';
import FaqSection from '../components/LandingPage/FaqSection';
import CtaSection from '../components/LandingPage/CtaSection';
import FooterSection from '../components/LandingPage/FooterSection';
import SocialProofSection from '../components/LandingPage/SocialProofSection';

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
    return () => lenis.destroy();
  }, []);

  return (
    <main ref={containerRef} className="min-h-screen bg-white relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10">
        <NavigationSection />
        <ModernSaaSBackground />

        <HeroSection />

        <div className="relative z-10 bg-white">
          <SocialProofSection />
          <InteractiveScrollSection />
          <BeforeAfterSection />
          <SeeItInActionSection />
          <PlatformTabsSection />
          <HowItWorksSection />
          <ProductDemoSection />
          <PricingSection />
          <TestimonialsSection />
          <IntegrationsSection />
          <FaqSection />
          <CtaSection />
          <FooterSection />
        </div>
      </div>
    </main>
  );
}
