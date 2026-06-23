'use client';

import Link from 'next/link';
import { Poppins } from "next/font/google";
import { Zap, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isAuthenticated } from '@/lib/auth';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const NavigationSection = () => {

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    setIsLogged(isAuthenticated());
  }, []);

  return (
    <nav
      className={`${poppins.className} fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/10 py-3 sm:py-4 px-4 sm:px-6`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center group-hover:scale-105 transition-all">
              <Zap size={18} fill="currentColor" />
            </div>

            <span className="text-[15px] font-bold tracking-normal text-white">
              Auromind
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
          {/* Product Dropdown */}
          <div className="relative group">
            <button className="text-[13px] sm:text-[15px] font-medium text-white/90 hover:text-white transition-colors">
              Product
            </button>

            <div className="absolute left-0 top-[calc(100%+18px)] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 w-[420px] rounded-3xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/product/ai-brain"
                  className="rounded-2xl p-4 hover:bg-white/5 transition"
                >
                  <p className="text-white font-semibold text-sm">AI Brain</p>
                  <p className="text-white/50 text-xs mt-1">
                    Intelligent sales conversations
                  </p>
                </Link>

                <Link
                  href="/product/wires"
                  className="rounded-2xl p-4 hover:bg-white/5 transition"
                >
                  <p className="text-white font-semibold text-sm">Wires</p>
                  <p className="text-white/50 text-xs mt-1">
                    Visual automation builder
                  </p>
                </Link>

                <Link
                  href="/product/inbox"
                  className="rounded-2xl p-4 hover:bg-white/5 transition"
                >
                  <p className="text-white font-semibold text-sm">
                    Omnichannel Inbox
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    AI + Human collaboration
                  </p>
                </Link>

                <Link
                  href="/product/whatsapp"
                  className="rounded-2xl p-4 hover:bg-white/5 transition"
                >
                  <p className="text-white font-semibold text-sm">
                    WhatsApp Automation
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    Lead capture & follow-ups
                  </p>
                </Link>
              </div>
            </div>
          </div>

          {/* Solutions Dropdown */}
          <div className="relative group">
            <button className="text-[15px] font-medium text-white/90 hover:text-white transition-colors">
              Solutions
            </button>

            <div className="absolute left-[-180px] top-[calc(100%+18px)] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 w-[700px] rounded-3xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
                    Use Cases
                  </p>

                  <div className="space-y-2">
                    <Link
                      href="/solutions/lead-qualification"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-medium text-white">
                        Lead Qualification
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        Automatically filter incoming leads
                      </p>
                    </Link>

                    <Link
                      href="/solutions/sales-automation"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-medium text-white">
                        Sales Automation
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        AI follows up and closes deals
                      </p>
                    </Link>

                    <Link
                      href="/solutions/high-ticket"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-medium text-white">
                        High-Ticket Closing
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        AI + human collaboration
                      </p>
                    </Link>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
                    Industries
                  </p>

                  <div className="space-y-2">
                    <Link
                      href="/solutions/real-estate"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition text-sm text-white"
                    >
                      Real Estate
                    </Link>

                    <Link
                      href="/solutions/education"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition text-sm text-white"
                    >
                      Education
                    </Link>

                    <Link
                      href="/solutions/ecommerce"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition text-sm text-white"
                    >
                      Ecommerce
                    </Link>

                    <Link
                      href="/solutions/saas"
                      className="block rounded-2xl p-3 hover:bg-white/5 transition text-sm text-white"
                    >
                      SaaS
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#A970FF] mb-3">
                      Featured
                    </p>

                    <h4 className="text-white text-lg font-semibold leading-snug">
                      Increase conversions by 42% using AI follow-ups
                    </h4>

                    <p className="text-white/50 text-sm mt-3 leading-6">
                      See how Auromind automates objections, nurtures leads and closes
                      sales.
                    </p>
                  </div>

                  <Link
                    href="#case-study"
                    className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#814AC8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#8d58d1] transition"
                  >
                    View Case Study
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <Link
            href="#pricing"
            className="text-[15px] font-medium text-white/90 transition-colors hover:text-white"
          >
            Pricing
          </Link>

          {/* Resources */}
          <div className="relative group">
            <button className="text-[15px] font-medium text-white/90 hover:text-white transition-colors">
              Resources
            </button>

            <div className="absolute left-[-100px] top-[calc(100%+18px)] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 w-[340px] rounded-3xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="space-y-1 text-left">
                <Link href="/resources/case-studies" className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition">
                  <p className="text-sm font-medium text-white">Case Studies</p>
                  <p className="text-xs text-white/50 mt-1">
                    Real business success stories
                  </p>
                </Link>

                <Link href="/resources/demo-videos" className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition">
                  <p className="text-sm font-medium text-white">Demo Videos</p>
                  <p className="text-xs text-white/50 mt-1">
                    Product walkthroughs & tutorials
                  </p>
                </Link>

                <Link href="/resources/blog" className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition">
                  <p className="text-sm font-medium text-white">Blog</p>
                  <p className="text-xs text-white/50 mt-1">
                    AI sales & WhatsApp marketing tips
                  </p>
                </Link>

                <Link href="/resources/docs" className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition">
                  <p className="text-sm font-medium text-white">Documentation</p>
                  <p className="text-xs text-white/50 mt-1">
                    API docs & setup guides
                  </p>
                </Link>

                <Link href="/resources/help" className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition">
                  <p className="text-sm font-medium text-white">Help Center</p>
                  <p className="text-xs text-white/50 mt-1">
                    FAQs & troubleshooting
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          
          {isLogged ? (
            <Link
              href="/user/admin/dashboard"
              className="group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-3 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[15px] font-medium text-white/90 transition-colors hover:text-white"
              >  
                Log In
              </Link>

              <Link href="/signup" className="group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-3 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95">
                <span className="flex items-center justify-center gap-2">
                  
                  {/* Text slide */}
                  <span className="relative overflow-hidden h-[1.2em] flex items-center">
                    <span className="block translate-y-0 group-hover:-translate-y-full transition-transform duration-300 ease-in-out">
                      Get Started Free
                    </span>
                    <span className="absolute inset-0 flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                      Get Started Free
                    </span>
                  </span>

                </span>
              </Link>
            </>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {menuOpen && (
  <div className="lg:hidden absolute right-4 top-[70px] w-[220px] rounded-2xl border border-white/10 bg-[#0B0B0F] shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-5 py-5 space-y-4 z-[99]">
    
    <Link href="#product" className="block text-white text-[16px] font-medium">
      Product
    </Link>

    <Link href="#solutions" className="block text-white text-[16px] font-medium">
      Solutions
    </Link>

    <Link href="#pricing" className="block text-white text-[16px] font-medium">
      Pricing
    </Link>

    <Link href="#resources" className="block text-white text-[16px] font-medium">
      Resources
    </Link>

  </div>
)}
    </nav>
  );
};

export default NavigationSection;