import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import SignupHeroSection from './Signupherosection';
import SignupFormCard from './Signupformcard';

const jakarta = Plus_Jakarta_Sans({ 
    subsets: ['latin'], 
    weight: ['400', '500', '600', '700', '800'] 
});

export const metadata = {
  title: "Create Your Free Account | Orbion Agents",
  description: "Get started with Orbion Agents. Create a free account to deploy RAG business assistants, automate WhatsApp marketing, and launch shared inboxes.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create Your Free Account | Orbion Agents",
    description: "Get started with Orbion Agents. Create a free account to deploy RAG business assistants, automate WhatsApp marketing, and launch shared inboxes.",
    url: "https://orbionagents.com/signup",
    type: "website",
  },
  twitter: {
    title: "Create Your Free Account | Orbion Agents",
    description: "Get started with Orbion Agents. Create a free account to deploy RAG business assistants, automate WhatsApp marketing, and launch shared inboxes.",
  },
};

export default function SignupPage() {
  const appName = "Orbion Agents";

  return (
    <div className="min-h-screen bg-[#06050C] text-white flex overflow-hidden font-sans">
      {/* Left Pane - Feature showcase in dark theme (Free WhatsApp API, AI Automation, Bulk Messaging) */}
      <SignupHeroSection />

      {/* Right Pane - Signup Form Card */}
      <div className="w-full flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10 bg-[#06050C] min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
        {/* Subtle ambient glows matching login page */}
        <div className="absolute top-[-5%] right-[-5%] w-[420px] h-[420px] bg-purple-600/[0.07] rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[420px] h-[420px] bg-indigo-600/[0.05] rounded-full blur-[140px] pointer-events-none" />

        {/* Mobile / Tablet Header (Hidden on Desktop since Left Pane handles it) */}
        <div className="relative z-10 mb-3 sm:mb-4 shrink-0 flex items-center justify-center lg:hidden w-full max-w-[430px] mx-auto pt-1 sm:pt-2">
          <Link href="/" className="inline-flex items-center group">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt={appName} 
                className="h-7 sm:h-8 w-auto object-contain group-hover:rotate-6 transition-all duration-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]" 
              />
              <div className="flex items-center">
                <span className={`${jakarta.className} text-[17px] sm:text-[18px] font-extrabold tracking-[0.05em] text-white`}>
                  ORBION
                </span>
                <span className={`${jakarta.className} ml-2 text-[17px] sm:text-[18px] font-extrabold tracking-[0.08em] bg-gradient-to-r from-[#c084fc] via-[#a855f7] to-[#818cf8] bg-clip-text text-transparent`}>
                  AGENTS
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Signup Form Card matching login page */}
        <div className="my-auto mx-auto w-full max-w-[430px] shrink-0 z-10 flex justify-center">
          <SignupFormCard />
        </div>

        {/* Bottom Trust & Security Badge */}
        <div className="relative z-10 shrink-0 text-center py-2.5">
          <p className="text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 tracking-wide">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-bold text-zinc-200">Enterprise-grade security • End-to-end encrypted</span>
          </p>
        </div>
      </div>
    </div>
  );
}