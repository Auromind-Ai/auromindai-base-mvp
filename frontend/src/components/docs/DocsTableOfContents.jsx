'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlignLeft, ChevronRight } from 'lucide-react';

export default function DocsTableOfContents({ hasVideo = false, hasScreenshots = false }) {
  const [activeId, setActiveId] = useState('what-is-it');

  const tocItems = useMemo(
    () => [
      { id: 'what-is-it', title: 'What is it?' },
      { id: 'why-use-it', title: 'Why use it?' },
      ...(hasVideo ? [{ id: 'video-tutorial', title: 'Video Tutorial' }] : []),
      { id: 'before-you-start', title: 'Before You Start' },
      { id: 'step-by-step', title: 'Step-by-Step Guide' },
      ...(hasScreenshots ? [{ id: 'screenshots-and-visuals', title: 'Screenshots & Visuals' }] : []),
      { id: 'expected-result', title: 'Expected Result' },
      { id: 'tips-and-best-practices', title: 'Tips & Best Practices' },
      { id: 'troubleshooting', title: 'Troubleshooting' },
    ],
    [hasVideo, hasScreenshots]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;

      for (let i = tocItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(tocItems[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(tocItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  return (
    <nav className="sticky top-28 space-y-3.5 pl-4 border-l border-white/[0.08] hidden xl:block select-none">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400 font-mono">
        <AlignLeft className="w-3.5 h-3.5" />
        <span>On this page</span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {tocItems.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={`text-left text-xs transition-all duration-150 flex items-center gap-1.5 py-1 ${
                  isActive
                    ? 'text-white font-bold -ml-4 pl-3.5 border-l-2 border-[#814AC8] bg-violet-500/10 rounded-r-lg'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && <ChevronRight className="w-3 h-3 text-[#a855f7] shrink-0" />}
                <span className="truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

