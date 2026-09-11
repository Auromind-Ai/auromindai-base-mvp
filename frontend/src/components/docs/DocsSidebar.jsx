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
    <aside className="w-full flex flex-col h-full bg-[#08080E] border-r border-white/[0.08] select-none">
      {/* Search trigger button */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-violet-500/40 text-xs text-zinc-400 hover:text-white transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="font-medium">Search docs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white/5 border border-white/10 rounded-md text-zinc-400">
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
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="tracking-wider uppercase text-[11px] font-bold text-zinc-300 font-mono">
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
                <div className="pl-3.5 space-y-0.5 pt-1 border-l border-white/[0.06] ml-3.5">
                  {section.items.map((item) => {
                    const itemUrl = `/docs/${item.slug}`;
                    const isActive = pathname === itemUrl;

                    return (
                      <Link
                        key={item.slug}
                        href={itemUrl}
                        onClick={onCloseMobile}
                        className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-500/25 to-purple-500/10 text-white font-semibold border border-violet-500/40 shadow-sm shadow-purple-950/40'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.hasVideo && (
                          <span
                            className={`shrink-0 ml-1.5 p-1 rounded-md ${
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

