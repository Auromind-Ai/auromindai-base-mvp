'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  Sparkles,
  Share2,
  Shield,
  CreditCard,
  HelpCircle,
  Search,
  ChevronRight,
  Film,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { DOCS_NAVIGATION } from '@/docs-data/docs-navigation';

const ICONS_MAP = {
  Rocket: Rocket,
  Sparkles: Sparkles,
  Share2: Share2,
  Shield: Shield,
  CreditCard: CreditCard,
  HelpCircle: HelpCircle,
};

export default function DocsSidebar({ onOpenSearch, isMobile = false, onCloseMobile }) {
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = useState(() => {
    const initial = {};
    if (pathname && pathname !== '/docs') {
      DOCS_NAVIGATION.forEach((section) => {
        if (section.items.some((item) => pathname === `/docs/${item.slug}`)) {
          initial[section.category] = true;
        }
      });
    }
    return initial;
  });

  const toggleCategory = (cat) => {
    setOpenCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <aside className="w-full flex flex-col h-full bg-[#08080E] border-r border-white/[0.08] select-none font-poppins">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-95 transition-opacity">
          <Image
            src="/logo.png"
            alt="OrbionAgents"
            width={28}
            height={28}
            className="w-7 h-7 object-contain group-hover:scale-105 transition-transform duration-200"
            priority
          />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white group-hover:text-violet-300 transition-colors">
              OrbionAgents
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase">
              DOCS
            </span>
          </div>
        </Link>
      </div>

      {/* Search trigger button */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-violet-500/40 text-xs text-zinc-300 hover:text-white transition-all duration-200 shadow-inner group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="font-medium">Search docs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/5 border border-white/10 rounded-md text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
        {DOCS_NAVIGATION.map((section) => {
          const IconComponent = ICONS_MAP[section.icon] || BookOpen;
          const isOpen = !!openCategories[section.category];

          return (
            <div key={section.category} className="space-y-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(section.category)}
                className="group w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-200 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 group-hover:border-violet-500/35 group-hover:text-violet-300 transition-all duration-200 shadow-sm">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[13px] font-medium text-zinc-200 group-hover:text-white tracking-normal transition-colors duration-200">
                    {section.category}
                  </span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'rotate-90 text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
              </button>

              {/* Collapsible Items with Smooth CSS Grid Transition */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="pl-3.5 space-y-1 pt-1 pb-1 border-l border-white/10 ml-4 my-1">
                    {section.items.map((item) => {
                      const itemUrl = `/docs/${item.slug}`;
                      const isActive = pathname === itemUrl;

                      return (
                        <Link
                          key={item.slug}
                          href={itemUrl}
                          onClick={onCloseMobile}
                          className={`group/item flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ease-out ${
                            isActive
                              ? 'bg-gradient-to-r from-violet-500/25 via-purple-500/15 to-violet-500/5 text-white font-semibold border border-violet-500/50 shadow-sm shadow-purple-950/40'
                              : 'text-zinc-200 hover:text-white hover:bg-white/[0.08] hover:translate-x-0.5'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.hasVideo && (
                            <span
                              className={`shrink-0 ml-1.5 p-1 rounded-md transition-colors duration-200 ${
                                isActive
                                  ? 'bg-violet-500 text-white'
                                  : 'bg-white/5 text-violet-400 group-hover/item:bg-violet-500/20 group-hover/item:text-violet-300'
                              }`}
                              title="Video walkthrough available"
                            >
                              <Film className="w-3 h-3" />
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer link to app */}
      <div className="p-3 border-t border-white/[0.06] bg-white/[0.01]">
        <Link
          href="/user/admin/dashboard"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all hover:border-violet-500/40"
        >
          <span>Open Orbion Platform</span>
          <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
        </Link>
      </div>
    </aside>
  );
}

