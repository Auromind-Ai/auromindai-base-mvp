'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, ArrowRight, ExternalLink } from 'lucide-react';

export default function DocsHeader({ onOpenMobile, onOpenMenu, onOpenSearch, breadcrumb }) {
  const handleOpenMenu = onOpenMenu || onOpenMobile;

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-[#07070A]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleOpenMenu}
          className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          aria-label="Open documentation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/docs" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#814AC8] to-[#a855f7] flex items-center justify-center p-1.5 shadow-md shadow-purple-900/30">
            <span className="font-bold text-white text-base">O</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-violet-300 transition-colors">
                OrbionAgents
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                DOCS
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 leading-none">Product Knowledge & API Reference</span>
          </div>
        </Link>
      </div>

      {/* Center: Breadcrumbs (Desktop) */}
      {breadcrumb && (
        <nav className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-medium">
          <Link href="/docs" className="hover:text-white transition-colors">
            Docs
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{breadcrumb.category}</span>
          <span>/</span>
          <span className="text-violet-300 font-semibold truncate max-w-[200px]">
            {breadcrumb.title}
          </span>
        </nav>
      )}

      {/* Right: Search & Direct Platform Access */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/5 rounded text-zinc-400">
            ⌘K
          </kbd>
        </button>

        <Link
          href="/user/admin/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#814AC8] hover:bg-[#9255dd] text-xs font-semibold text-white shadow-md shadow-violet-950/40 transition-all hover:-translate-y-0.5"
        >
          <span>Go to App</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
