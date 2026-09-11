'use client';

import Link from 'next/link';
import { Menu, Search, ArrowRight, Sparkles } from 'lucide-react';

export default function DocsHeader({ onOpenMobile, onOpenMenu, onOpenSearch, breadcrumb }) {
  const handleOpenMenu = onOpenMenu || onOpenMobile;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050508]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="w-full max-w-[1680px] mx-auto h-16 px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleOpenMenu}
            className="p-2 rounded-xl hover:bg-white/[0.08] bg-white/[0.03] border border-white/5 text-zinc-300 hover:text-white transition-all focus:outline-none"
            aria-label="Open documentation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link href="/docs" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#814AC8] via-[#9333ea] to-[#a855f7] flex items-center justify-center p-1.5 shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/50 transition-all group-hover:scale-105">
                <span className="font-extrabold text-white text-sm tracking-tighter">O</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#050508]" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-violet-300 transition-colors">
                  OrbionAgents
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase">
                  DOCS
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium leading-none hidden sm:block">
                Product Architecture &amp; API
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Breadcrumbs (Desktop) */}
        {breadcrumb && (
          <nav className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-medium px-3 py-1 rounded-full bg-white/[0.02] border border-white/5">
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">{breadcrumb.category}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-violet-300 font-semibold truncate max-w-[220px]">
              {breadcrumb.title}
            </span>
          </nav>
        )}

        {/* Right: Search & Direct Platform Access */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 text-xs text-zinc-300 hover:text-white transition-all shadow-inner group"
          >
            <Search className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="hidden sm:inline font-medium">Search docs...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white/5 border border-white/10 rounded-md text-zinc-400">
              ⌘K
            </kbd>
          </button>

          <Link
            href="/user/admin/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#814AC8] to-[#9333ea] hover:from-[#8e52dc] hover:to-[#9f3ff2] text-xs font-semibold text-white shadow-lg shadow-purple-950/40 transition-all hover:shadow-purple-900/60 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Go to App</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

