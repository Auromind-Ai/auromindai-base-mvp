'use client';

import Link from 'next/link';
import { Poppins, Plus_Jakarta_Sans } from "next/font/google";
import { Zap, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const NavigationSection = () => {
  const { appName } = useBranding();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);

  const toggleAccordion = (name) => {
    setOpenAccordion(openAccordion === name ? null : name);
  };

  const { user, loading } = useAuth();
  const isLogged = !loading && !!user;

  return (
    <nav
      className={`${poppins.className} fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/10 py-3 sm:py-4 px-4 sm:px-6`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt={appName} 
              className="h-[54px] w-auto object-contain group-hover:rotate-6 transition-all duration-300" 
            />
            <span className={`${jakarta.className} text-[19px] font-extrabold tracking-[0.1em] text-white flex items-center`}>
              ORBION
              <span className="bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#818CF8] bg-clip-text text-transparent ml-2 font-semibold tracking-[0.15em]">
                AGENTS
              </span>
            </span>
          </div>
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
            href="/pricing"
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

        <div className="flex items-center gap-3 sm:gap-6">
          
          {isLogged ? (
            <Link
              href="/user/admin/dashboard"
              className="hidden lg:inline-flex group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden lg:inline-block text-[15px] font-medium text-white/90 transition-colors hover:text-white"
              >  
                Log In
              </Link>

              <Link href="/signup" className="hidden lg:inline-flex group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95">
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
        <div className="lg:hidden absolute left-4 right-4 top-[70px] rounded-2xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-6 py-8 space-y-6 z-[99] flex flex-col max-h-[80vh] overflow-y-auto">
          
          <div className="space-y-6 w-full">
            {/* Product */}
            <div className="w-full">
              <button 
                onClick={() => toggleAccordion('product')}
                className="flex items-center justify-between w-full text-left text-white text-[17px] font-semibold tracking-wide hover:text-white/80 transition-colors"
              >
                <span>Product</span>
                <ChevronDown size={18} className={`transition-transform duration-300 ${openAccordion === 'product' ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion === 'product' && (
                <div className="flex flex-col gap-4 mt-4 pl-4 border-l border-white/10">
                  <Link href="/product/ai-brain" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">AI Brain</Link>
                  <Link href="/product/wires" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Wires (Visual Builder)</Link>
                  <Link href="/product/inbox" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Omnichannel Inbox</Link>
                  <Link href="/product/whatsapp" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">WhatsApp Automation</Link>
                </div>
              )}
            </div>

            {/* Solutions */}
            <div className="w-full">
              <button 
                onClick={() => toggleAccordion('solutions')}
                className="flex items-center justify-between w-full text-left text-white text-[17px] font-semibold tracking-wide hover:text-white/80 transition-colors"
              >
                <span>Solutions</span>
                <ChevronDown size={18} className={`transition-transform duration-300 ${openAccordion === 'solutions' ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion === 'solutions' && (
                <div className="flex flex-col gap-4 mt-4 pl-4 border-l border-white/10">
                  <Link href="/solutions/lead-qualification" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Lead Qualification</Link>
                  <Link href="/solutions/sales-automation" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Sales Automation</Link>
                  <Link href="/solutions/high-ticket" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">High-Ticket Closing</Link>
                  <Link href="/solutions/real-estate" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Real Estate</Link>
                  <Link href="/solutions/ecommerce" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Ecommerce</Link>
                  <Link href="/solutions/saas" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">SaaS</Link>
                </div>
              )}
            </div>

            {/* Pricing */}
            <Link href="/pricing" className="block text-white text-[17px] font-semibold tracking-wide hover:text-white/80 transition-colors" onClick={() => setMenuOpen(false)}>
              Pricing
            </Link>

            {/* Resources */}
            <div className="w-full">
              <button 
                onClick={() => toggleAccordion('resources')}
                className="flex items-center justify-between w-full text-left text-white text-[17px] font-semibold tracking-wide hover:text-white/80 transition-colors"
              >
                <span>Resources</span>
                <ChevronDown size={18} className={`transition-transform duration-300 ${openAccordion === 'resources' ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion === 'resources' && (
                <div className="flex flex-col gap-4 mt-4 pl-4 border-l border-white/10">
                  <Link href="/resources/case-studies" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Case Studies</Link>
                  <Link href="/resources/demo-videos" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Demo Videos</Link>
                  <Link href="/resources/blog" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Blog</Link>
                  <Link href="/resources/docs" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Documentation</Link>
                  <Link href="/resources/help" onClick={() => setMenuOpen(false)} className="text-[15px] text-white/70 hover:text-white">Help Center</Link>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-white/10 my-4" />

          {isLogged ? (
            <Link
              href="/user/admin/dashboard"
              className="w-full text-center rounded-xl bg-[#814AC8] py-3.5 text-[16px] font-bold text-white hover:bg-[#8d58d1] transition-all shadow-lg shadow-[#814AC8]/25"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex flex-col gap-4">
              <Link
                href="/login"
                className="w-full text-center text-[16px] font-semibold text-white border border-white/10 rounded-xl py-3.5 hover:bg-white/5 transition-all"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="w-full text-center rounded-xl bg-[#814AC8] py-3.5 text-[16px] font-bold text-white hover:bg-[#8d58d1] transition-all shadow-lg shadow-[#814AC8]/25"
                onClick={() => setMenuOpen(false)}
              >
                Get Started Free
              </Link>
            </div>
          )}

        </div>
      )}
    </nav>
  );
};

export default NavigationSection;