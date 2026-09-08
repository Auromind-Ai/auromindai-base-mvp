'use client';

import { useState, useEffect } from 'react';
import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import DocsSearchModal from '@/components/docs/DocsSearchModal';
import { X } from 'lucide-react';

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
    <div className="min-h-screen bg-[#050508] text-white flex flex-col font-sans selection:bg-[#814AC8]/30 selection:text-white">
      {/* Top Header */}
      <DocsHeader
        onOpenMobile={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Body Grid */}
      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative">
        {/* On-Demand Slide-Out Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar drawer panel */}
            <div className="relative w-80 max-w-[85vw] h-full bg-[#08080C] shadow-2xl flex flex-col z-10 border-r border-white/10 animate-in slide-in-from-left duration-200">
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <span className="font-bold text-sm text-white">Documentation Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
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

        {/* Central Content Area (Full-Width & Centered) */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 lg:py-12">
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
