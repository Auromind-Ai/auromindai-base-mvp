import dynamic from 'next/dynamic';
import NavigationSection from '../components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '../components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
import HeroSectionNew from '../components/LandingPageNew/HeroSection/HeroSectionNew';
import SmoothScroll from '../components/SmoothScroll';
import ManageChatsSection from '../components/LandingPageNew/ManageChatsSection/ManageChatsClient';
import NeuroHero from '../components/NeuroHeroClient';

const MessageManagementSection = dynamic(
  () => import('../components/LandingPageNew/MessageManagementSection/Messagemanagementsection'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const BeforeAfterSection = dynamic(
  () => import('../components/LandingPageNew/BeforeAfterSection/BeforeAfterSection'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const HowItWorks = dynamic(
  () => import('@/components/LandingPageNew/HowItWorksSection/HowItWorks'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const PricingSectionNew = dynamic(
  () => import('@/components/LandingPageNew/PricingSectionNewSection/PricingSectionNew'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const FAQSection = dynamic(
  () => import('@/components/LandingPageNew/FAQSection/FAQSection'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const ProductDemoSection = dynamic(
  () => import('../components/LandingPageNew/ProductDemoSection/ProductDemoSection'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

const CtaSection = dynamic(
  () => import('@/components/LandingPageNew/FinalCTASection/ctasection'),
  { ssr: true }
);

const FooterSection = dynamic(
  () => import('@/components/LandingPageNew/FooterSection/Footer'),
  { ssr: true }
);
export const metadata = {
  title: "Auromind AI",
  description: "Secure AI Business Assistant",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white relative">
      <SmoothScroll>
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
      </SmoothScroll>
    </main>
  );
}