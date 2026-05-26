'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LeadCard from './LeadCard';

const TIER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: '🔥 Hot' },
  { id: 'warm', label: '⚡ Warm' },
  { id: 'cold', label: '❄️ Cold' },
];

const SORT_OPTIONS = [
  { id: 'score_desc', label: 'Score ↓' },
  { id: 'score_asc', label: 'Score ↑' },
  { id: 'recent', label: 'Recent' },
];

// ── Skeleton ──
function LeadSkeleton() {
  return (
    <div className="p-3.5 rounded-xl animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="h-3.5 w-28 bg-zinc-800 rounded" />
        </div>
        <div className="h-3.5 w-8 bg-zinc-800 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 bg-zinc-800 rounded-md" />
        <div className="h-3 w-12 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export default function LeadList({
  leads,
  loading,
  selectedLeadId,
  onLeadSelect,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  onAddLeadClick,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSort, setShowSort] = useState(false);

  // Client-side search and tier filter
  const filteredLeads = useMemo(() => {
    let result = leads;
    
    // Tier filter (mapped to statusFilter for backward compatibility in prop names)
    if (statusFilter !== 'all') {
      result = result.filter(l => (l.lead_tier || 'cold') === statusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [leads, searchQuery, statusFilter]);

  return (
    <aside className="w-full lg:w-[320px] xl:w-[340px] border-r border-white/5 bg-[#0f0f14] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 space-y-3 border-b border-white/5 shrink-0">
        {/* Search & Add button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#16161d] border border-white/5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>
          <button
            onClick={onAddLeadClick}
            className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors text-xs font-semibold shrink-0"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">New Lead</span>
          </button>
        </div>

        {/* Tier Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TIER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all
                ${statusFilter === tab.id
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            {filteredLeads.length} leads
          </span>
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <SlidersHorizontal size={11} />
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Sort'}
              <ChevronDown size={10} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a22] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onSortChange(opt.id);
                      setShowSort(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors
                      ${sortBy === opt.id ? 'text-indigo-400 bg-indigo-500/5' : 'text-zinc-400'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5 relative">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <LeadSkeleton key={i} />)
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-3">
              <Search size={20} className="text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500">No leads found</p>
            <p className="text-xs text-zinc-600 mt-1">
              {searchQuery ? 'Try a different search' : 'Leads will appear when customers message you'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredLeads.map((lead) => (
              <motion.div
                key={lead.lead_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <LeadCard
                  lead={lead}
                  isSelected={selectedLeadId === lead.lead_id}
                  onClick={() => onLeadSelect(lead.lead_id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </aside>
  );
}
