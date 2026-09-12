'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Film, BookOpen, CornerDownLeft } from 'lucide-react';
import { getSearchIndex } from '@/docs-data/articles';

export default function DocsSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchData] = useState(() => getSearchIndex());

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredResults = query.trim() === ''
    ? searchData.slice(0, 6)
    : searchData.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.whatIsIt?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q)) ||
          item.troubleshooting?.some((t) => t.toLowerCase().includes(q))
        );
      }).slice(0, 8);

  const handleSelect = (slug) => {
    onClose();
    router.push(`/docs/${slug}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex].slug);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md transition-opacity docs-section font-poppins"
      style={{ fontFamily: 'var(--font-poppins), "Poppins", sans-serif' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0A0B12] shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-poppins"
        style={{ fontFamily: 'var(--font-poppins), "Poppins", sans-serif' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4.5 py-4 border-b border-white/[0.08] gap-3 bg-white/[0.02]">
          <Search className="w-5 h-5 text-violet-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search documentation, features, steps, or issues..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-zinc-400 bg-white/5 border border-white/10 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              No matching documentation pages found for <span className="text-white font-medium">&quot;{query}&quot;</span>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.slug}
                  onClick={() => handleSelect(item.slug)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#814AC8]/20 border border-[#814AC8]/40 text-white shadow-sm'
                      : 'hover:bg-white/[0.03] text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl mt-0.5 ${
                        isSelected ? 'bg-gradient-to-tr from-[#814AC8] to-[#a855f7] text-white shadow-md' : 'bg-white/5 text-zinc-400'
                      }`}
                    >
                      {item.hasVideo ? <Film className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                        {item.hasVideo && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                            Video
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{item.title}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 leading-relaxed">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center self-center pl-2">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] text-violet-300 font-semibold">
                        Open <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4.5 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-zinc-400">↑</kbd> <kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-zinc-400">↓</kbd> to navigate</span>
            <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-zinc-400">↵</kbd> to select</span>
          </div>
          <span>OrbionAgents Documentation</span>
        </div>
      </div>
    </div>
  );
}

