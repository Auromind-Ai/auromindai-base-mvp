import dynamic from 'next/dynamic';
import NavigationSection from '../components/LandingPageNew/NavigationSection/NavigationSection';
import ModernSaaSBackground from '../components/LandingPageNew/ModernSaaSBackground/ModernSaaSBackground';
// import ProductDemoSection from '../components/LandingPageNew/ProductDemoSection/ProductDemoSection';
// import SocialProofSection from '../components/LandingPageNew/SocialProofSection/SocialProofSection';
import HeroSectionNew from '../components/LandingPageNew/HeroSection/HeroSectionNew';
// import TestimonialsSection from '@/components/LandingPageNew/TestimonialsSection/TestimonialsSection';
import IntegrationsSection from '@/components/LandingPageNew/IntegrationsSection/IntegrationsSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';


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

const ManageChatsSection = dynamic(
  () => import('../components/LandingPageNew/ManageChatsSection/ManagechatsSection'),
  { ssr: true }
);

const NeuroHero = dynamic(
  () => import('../components/NeuroHero'),
  { ssr: true }
);

const WhatsAppShowcase = dynamic(
  () => import('../components/LandingPageNew/WhatsAppShowcase/WhatsAppShowcase'),
  { ssr: true, loading: () => <div className="min-h-[300px]" /> }
);

export const metadata = {
  title: "AI Business Assistant for Sales Automation",
  description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Business Assistant for Sales Automation | Auromind AI",
    description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
    url: "https://orbionagents.com/",
    type: "website",
  },
  twitter: {
    title: "AI Business Assistant for Sales Automation | Auromind AI",
    description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] relative">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10">
        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">Nav Error</div>}>
          <NavigationSection />
        </ErrorBoundary>
        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">Bg Error</div>}>
          <ModernSaaSBackground />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">Hero Error</div>}>
          <HeroSectionNew />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">MessageManagement Error</div>}>
          <MessageManagementSection />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">ManageChats Error</div>}>
          <ManageChatsSection />        
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">WhatsAppShowcase Error</div>}>
          <WhatsAppShowcase />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-10 text-red-500 bg-black z-50 relative">Integrations Error</div>}>
          <IntegrationsSection />
        </ErrorBoundary>

        <div className="relative z-10">
          
          <BeforeAfterSection />

          <NeuroHero />

          <HowItWorks />
          
          <PricingSectionNew />
   
          <FAQSection />

          <CtaSection />
          <FooterSection />
        </div>
      </div>
    </main>
  );
}// Clean rollback trigger
