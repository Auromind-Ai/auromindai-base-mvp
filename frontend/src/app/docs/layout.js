'use client';

import { useState, useEffect } from 'react';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
import DocsSidebar from '@/components/docs/DocsSidebar';
import DocsSearchModal from '@/components/docs/DocsSearchModal';
import { Menu, Search, X } from 'lucide-react';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: false,
});

export default function DocsLayout({ children }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`${poppins.variable} ${poppins.className} docs-section font-poppins min-h-screen bg-[#040407] text-white flex flex-col selection:bg-[#814AC8]/40 selection:text-white relative overflow-x-hidden`}
      style={{ fontFamily: 'var(--font-poppins), "Poppins", sans-serif' }}
    >
      {/* Premium Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top central purple/violet radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#814AC8]/15 via-violet-900/5 to-transparent blur-3xl opacity-80" />
        
        {/* Subtle architectural dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient subtle side glows */}
        <div className="absolute top-1/3 -left-64 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2/3 -right-64 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Mobile-Only Top Bar (< lg) */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-[#08080E]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white"
            aria-label="Open documentation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#814AC8] to-[#a855f7] flex items-center justify-center text-white font-bold text-xs">
              O
            </div>
            <span className="font-bold text-sm text-white">OrbionAgents</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase">
              DOCS
            </span>
          </Link>
        </div>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white"
          aria-label="Search docs"
        >
          <Search className="w-4 h-4 text-violet-400" />
        </button>
      </div>

      {/* Desktop Left Sidebar (Fixed & Docked to Left Edge, from top-0, h-screen) */}
      <div className="hidden lg:block fixed top-0 left-0 w-72 h-screen z-30">
        <DocsSidebar
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 flex w-full relative z-10 lg:pl-72">
        {/* On-Demand Slide-Out Navigation Drawer (Mobile) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar drawer panel */}
            <div className="relative w-84 max-w-[85vw] h-full bg-[#08080E] shadow-2xl flex flex-col z-10 border-r border-white/10 animate-in slide-in-from-left duration-200">
              <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#814AC8] to-[#a855f7] flex items-center justify-center text-white font-bold text-xs shadow-md">
                    O
                  </div>
                  <span className="font-bold text-sm text-white tracking-wide">Documentation Menu</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <DocsSidebar
                  isMobile
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                  onOpenSearch={() => {
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Central Content Area (Full-Width & Expansive) */}
        <main className="flex-1 min-w-0 py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 xl:px-10 w-full">
          {children}
        </main>
      </div>

      {/* Global Interactive Search Modal */}
      <DocsSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

