'use client';

import { useState } from 'react';
import {
  FileText,
  Search,
  Database,
  Sparkles,
  Layers,
  CheckCircle2,
  Cpu,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const SAMPLE_SOURCES = [
  {
    name: 'Orbion_Master_Refund_Policy_2026.pdf',
    type: 'PDF Document',
    chunkId: 'chunk-842',
    cosineScore: '0.942',
    snippet:
      'Section 3.1: Customers are entitled to a full refund within 14 calendar days of initial subscription activation. Pro-rata credits apply thereafter.',
  },
  {
    name: 'Enterprise_Service_Level_Agreement.pdf',
    type: 'PDF Document',
    chunkId: 'chunk-119',
    cosineScore: '0.887',
    snippet:
      'Section 7.4: Billing disputes must be lodged in writing to billing@orbion.ai within 30 days of the invoice date.',
  },
];

export default function BrainDetailVisual() {
  const [query, setQuery] = useState('What is our customer refund policy?');
  const [selectedSource, setSelectedSource] = useState(SAMPLE_SOURCES[0]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090E] shadow-2xl overflow-hidden text-xs select-none">
      {/* Visual Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-white text-sm">AI Brain — Grounded RAG Query Simulator</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>pgvector HNSW Vector Store Active</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Step 1: User Query Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Search className="w-3 h-3 text-violet-400" />
            <span>Simulate User Query Ingestion</span>
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs">
            <span className="text-violet-400">&gt;</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white text-xs font-mono"
            />
            <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-400 text-[10px]">
              Cosine Search
            </span>
          </div>
        </div>

        {/* Step 2: Vector Retrieval Match Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Retrieved Knowledge Chunks (Top Similarity Matches)</span>
            <span className="text-violet-300">Metric: Inner Product Cosine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_SOURCES.map((src, i) => (
              <div
                key={i}
                onClick={() => setSelectedSource(src)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedSource.chunkId === src.chunkId
                    ? 'bg-violet-950/30 border-violet-500/50 shadow-md'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {src.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/20">
                    {src.cosineScore}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed font-sans">
                  {src.snippet}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-white/5">
                  <span>{src.type}</span>
                  <span className="text-violet-400">{src.chunkId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Synthesized Grounded Response with Source Citation */}
        <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Strict Grounded AI Generation
            </span>
            <span className="font-mono text-emerald-400">Zero Hallucination Guard: Active</span>
          </div>

          <p className="text-zinc-200 text-xs leading-relaxed font-sans">
            Under the official company policy, customers can request a complete refund within 14 calendar days of initial subscription activation. After 14 days, prorated credits will be added to your workspace wallet balance for future usage.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 border border-violet-500/30 text-[10px] font-mono text-violet-200">
              <FileText className="w-3 h-3 text-violet-400" />
              <span>Verified Citation: Orbion_Master_Refund_Policy_2026.pdf [Section 3.1]</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
