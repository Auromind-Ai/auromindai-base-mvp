'use client';

import Link from 'next/link';
import { poppins, jakarta } from '@/lib/fonts';
import { Zap, Menu, X, ChevronDown, Inbox, MessageCircle, Users, Bot, CheckCircle2, Filter, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { getAppUrl } from '@/lib/auth';

const NavigationSection = () => {
  const { appName, appLogoUrl } = useBranding();

  const [menuOpen, setMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const { user, loading } = useAuth();
  const isLogged = !loading && !!user;

  const handleToggleMenu = () => {
    if (menuOpen) {
      setProductOpen(false);
      setSolutionsOpen(false);
      setResourcesOpen(false);
    }
    setMenuOpen(!menuOpen);
  };

  return (
    <nav
      className={`${poppins.className} fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/10 py-3 sm:py-4 px-4 sm:px-6`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-90 transition-opacity">
          <img 
            src={appLogoUrl || "/logo.png"} 
            alt={appName} 
            className="h-10 w-auto object-contain" 
          />
          <span className={`${jakarta.className} text-[16px] sm:text-[18px] font-bold tracking-[0.1em] text-white flex items-center`}>
            ORBION
            <span className="bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#818CF8] bg-clip-text text-transparent ml-1.5 font-bold tracking-[0.13em]">
              AGENTS
            </span>
          </span>
        </Link>

          <div className="hidden lg:flex items-center gap-8">
          {/* Product Dropdown */}
          <div className="relative group">
            <button className="text-[13px] sm:text-[15px] font-medium text-white/90 hover:text-white transition-colors">
              Product
            </button>

            <div className="absolute left-0 top-[calc(100%+18px)] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 w-[600px] rounded-3xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              {/* Top row: 3 compact product cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Link
                  href="/product/ai-brain"
                  className="rounded-2xl p-3.5 hover:bg-white/5 transition group/card border border-transparent hover:border-white/8"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#A970FF]/15 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-[#A970FF]" />
                    </div>
                    <p className="text-white font-semibold text-sm">AI Brain</p>
                  </div>
                  <p className="text-white/45 text-[11.5px] leading-relaxed">
                    Trains on your docs & closes sales conversations
                  </p>
                </Link>

                <Link
                  href="/product/wires"
                  className="rounded-2xl p-3.5 hover:bg-white/5 transition group/card border border-transparent hover:border-white/8"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#60A5FA]/15 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-[#60A5FA]" />
                    </div>
                    <p className="text-white font-semibold text-sm">Wires</p>
                  </div>
                  <p className="text-white/45 text-[11.5px] leading-relaxed">
                    No-code visual automation flow builder
                  </p>
                </Link>

                <Link
                  href="/product/whatsapp"
                  className="rounded-2xl p-3.5 hover:bg-white/5 transition group/card border border-transparent hover:border-white/8"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-[#22C55E]/15 flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-[#22C55E]" />
                    </div>
                    <p className="text-white font-semibold text-sm">WhatsApp</p>
                  </div>
                  <p className="text-white/45 text-[11.5px] leading-relaxed">
                    Lead capture, broadcast & follow-ups
                  </p>
                </Link>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.07] mb-3" />

              {/* Inbox — Full-width Featured Card */}
              <Link
                href="/inbox"
                target="_blank"
                rel="noopener noreferrer"
                className="group/inbox block rounded-2xl border border-[#A970FF]/20 bg-gradient-to-br from-[#A970FF]/8 via-[#7C3AED]/5 to-transparent hover:from-[#A970FF]/14 hover:border-[#A970FF]/35 transition-all duration-300 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Icon + title + description */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 w-9 h-9 rounded-xl bg-[#A970FF]/20 border border-[#A970FF]/30 flex items-center justify-center shrink-0">
                      <Inbox className="w-4.5 h-4.5 text-[#A970FF]" style={{width:'18px',height:'18px'}} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold text-[14px]">Inbox</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#A970FF] bg-[#A970FF]/12 border border-[#A970FF]/25 rounded-full px-2 py-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI + Human
                        </span>
                      </div>
                      <p className="text-white/50 text-[12px] leading-relaxed">
                        Unified omnichannel conversation hub — manage every customer chat across WhatsApp, email & more.
                      </p>
                    </div>
                  </div>

                  {/* Right: Open arrow */}
                  <div className="shrink-0 mt-1 w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center group-hover/inbox:border-[#A970FF]/40 group-hover/inbox:bg-[#A970FF]/10 transition-all">
                    <svg className="w-3 h-3 text-white/40 group-hover/inbox:text-[#A970FF] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                  </div>
                </div>

                {/* Feature pills row — real features from the inbox UI */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    Open
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    Pending
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                    Resolved
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <Users className="w-3 h-3 text-white/50" />
                    Team Assign
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <Filter className="w-3 h-3 text-white/50" />
                    Smart Filters
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <Bot className="w-3 h-3 text-white/50" />
                    Guide AI
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <MessageCircle className="w-3 h-3 text-[#22C55E]" />
                    WhatsApp
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <CheckCircle2 className="w-3 h-3 text-white/50" />
                    Templates
                  </span>
                </div>
              </Link>
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
                    <p className="text-xs uppercase tracking-[0.1em] text-[#A970FF] mb-3">
                      Featured
                    </p>

                    <h4 className="text-white text-base font-semibold leading-snug">
                      Increase conversions by 42% using AI follow-ups
                    </h4>

                    <p className="text-white/50 text-sm mt-3 leading-6">
                      See how Orbionagents automates objections, nurtures leads and closes
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

          {/* Docs */}
          <Link
            href="/docs"
            className="text-[15px] font-medium text-white/90 transition-colors hover:text-white flex items-center gap-1.5"
          >
            <span>Docs</span>
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
              href={getAppUrl('/dashboard')}
              className="hidden lg:inline-flex group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={getAppUrl('/login')}
                className="hidden lg:inline-block text-[15px] font-medium text-white/90 transition-colors hover:text-white"
              >  
                Log In
              </Link>

              <Link href={getAppUrl('/signup')} className="hidden lg:inline-flex group relative overflow-hidden rounded-[8px] bg-[#814AC8] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-[#8d58d1] active:scale-95">
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
            onClick={handleToggleMenu}
            className="lg:hidden text-white"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
          {menuOpen && (
        <div className="lg:hidden absolute left-4 right-4 top-[65px] rounded-xl border border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-5 py-5 space-y-4 z-[99] flex flex-col">
          
          {/* Product Accordion */}
          <div>
            <button
              onClick={() => setProductOpen(!productOpen)}
              className="flex items-center justify-between w-full text-white text-[14px] font-medium tracking-wide hover:text-white/80 transition-colors"
            >
              <span>Product</span>
              <ChevronDown size={14} className={`transform transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} />
            </button>
            {productOpen && (
              <div className="pl-4 mt-2 space-y-2 border-l border-white/10">
                <Link href="/product/ai-brain" className="flex items-center gap-2 text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  <div className="w-5 h-5 rounded-md bg-[#A970FF]/15 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-[#A970FF]" />
                  </div>
                  AI Brain
                </Link>
                <Link href="/product/wires" className="flex items-center gap-2 text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  <div className="w-5 h-5 rounded-md bg-[#60A5FA]/15 flex items-center justify-center shrink-0">
                    <Zap className="w-3 h-3 text-[#60A5FA]" />
                  </div>
                  Wires
                </Link>
                {/* Inbox — Featured mobile card */}
                <Link
                  href="/inbox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[#A970FF]/25 bg-[#A970FF]/8 p-3 hover:bg-[#A970FF]/12 transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Inbox className="w-3.5 h-3.5 text-[#A970FF] shrink-0" />
                    <span className="text-white font-semibold text-[13px]">Inbox</span>
                    <span className="text-[10px] text-[#A970FF] bg-[#A970FF]/15 rounded-full px-1.5 py-0.5 font-medium">AI + Human</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"><span className="w-1 h-1 rounded-full bg-emerald-400"></span>Open</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"><span className="w-1 h-1 rounded-full bg-amber-400"></span>Pending</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"><Users className="w-2.5 h-2.5 text-white/50" />Teams</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"><Bot className="w-2.5 h-2.5 text-white/50" />Guide AI</span>
                  </div>
                </Link>
                <Link href="/product/whatsapp" className="flex items-center gap-2 text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  <div className="w-5 h-5 rounded-md bg-[#22C55E]/15 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3 h-3 text-[#22C55E]" />
                  </div>
                  WhatsApp Automation
                </Link>
              </div>
            )}


          </div>

          {/* Solutions Accordion */}
          <div>
            <button
              onClick={() => setSolutionsOpen(!solutionsOpen)}
              className="flex items-center justify-between w-full text-white text-[14px] font-medium tracking-wide hover:text-white/80 transition-colors"
            >
              <span>Solutions</span>
              <ChevronDown size={14} className={`transform transition-transform duration-200 ${solutionsOpen ? 'rotate-180' : ''}`} />
            </button>
            {solutionsOpen && (
              <div className="pl-4 mt-2 space-y-3 border-l border-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Use Cases</p>
                  <div className="space-y-1.5">
                    <Link href="/solutions/lead-qualification" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      Lead Qualification
                    </Link>
                    <Link href="/solutions/sales-automation" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      Sales Automation
                    </Link>
                    <Link href="/solutions/high-ticket" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      High-Ticket Closing
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Industries</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href="/solutions/real-estate" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      Real Estate
                    </Link>
                    <Link href="/solutions/education" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      Education
                    </Link>
                    <Link href="/solutions/ecommerce" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      Ecommerce
                    </Link>
                    <Link href="/solutions/saas" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                      SaaS
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="#pricing" className="block text-white text-[14px] font-medium tracking-wide hover:text-white/80 transition-colors" onClick={() => setMenuOpen(false)}>
            Pricing
          </Link>

          <Link href="/docs" className="block text-white text-[14px] font-medium tracking-wide hover:text-white/80 transition-colors" onClick={() => setMenuOpen(false)}>
            Docs
          </Link>

          {/* Resources Accordion */}
          <div>
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center justify-between w-full text-white text-[14px] font-medium tracking-wide hover:text-white/80 transition-colors"
            >
              <span>Resources</span>
              <ChevronDown size={14} className={`transform transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            {resourcesOpen && (
              <div className="pl-4 mt-2 space-y-2 border-l border-white/10">
                <Link href="/resources/case-studies" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Case Studies
                </Link>
                <Link href="/resources/demo-videos" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Demo Videos
                </Link>
                <Link href="/resources/blog" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Blog
                </Link>
                <Link href="/resources/docs" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Documentation
                </Link>
                <Link href="/resources/help" className="block text-white/70 text-[13px] hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Help Center
                </Link>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10 my-1" />

          {isLogged ? (
            <Link
              href={getAppUrl('/dashboard')}
              className="w-full text-center rounded-lg bg-[#814AC8] py-2.5 text-[14px] font-semibold text-white hover:bg-[#8d58d1] transition-all shadow-lg shadow-[#814AC8]/25"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href={getAppUrl('/login')}
                className="w-full text-center text-[14px] font-medium text-white border border-white/10 rounded-lg py-2.5 hover:bg-white/5 transition-all"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href={getAppUrl('/signup')}
                className="w-full text-center rounded-lg bg-[#814AC8] py-2.5 text-[14px] font-semibold text-white hover:bg-[#8d58d1] transition-all shadow-lg shadow-[#814AC8]/25"
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