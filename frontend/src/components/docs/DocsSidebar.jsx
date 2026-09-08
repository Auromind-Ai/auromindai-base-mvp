'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  Sparkles,
  Share2,
  Shield,
  CreditCard,
  HelpCircle,
  Search,
  ChevronDown,
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
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCategory = (cat) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  return (
    <aside className="w-full flex flex-col h-full bg-[#08080C] border-r border-white/10 select-none">
      {/* Search trigger button */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-400 hover:text-white transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span>Search docs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {DOCS_NAVIGATION.map((section) => {
          const IconComponent = ICONS_MAP[section.icon] || BookOpen;
          const isCollapsed = !!collapsedCategories[section.category];

          return (
            <div key={section.category} className="space-y-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(section.category)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-violet-400" />
                  <span className="tracking-wide uppercase text-[11px] font-bold text-zinc-300">
                    {section.category}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="pl-4 space-y-0.5 pt-1 border-l border-white/5 ml-3">
                  {section.items.map((item) => {
                    const itemUrl = `/docs/${item.slug}`;
                    const isActive = pathname === itemUrl;

                    return (
                      <Link
                        key={item.slug}
                        href={itemUrl}
                        onClick={onCloseMobile}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-[#814AC8]/25 text-white font-semibold border border-[#814AC8]/50 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.hasVideo && (
                          <span
                            className={`shrink-0 ml-1.5 p-1 rounded ${
                              isActive
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/5 text-violet-400 group-hover:bg-violet-500/20'
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
              )}
            </div>
          );
        })}
      </div>

      {/* Footer link to app */}
      <div className="p-3 border-t border-white/10 bg-white/[0.01]">
        <Link
          href="/user/admin/dashboard"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <span>Open Orbion Platform</span>
          <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
        </Link>
      </div>
    </aside>
  );
}
