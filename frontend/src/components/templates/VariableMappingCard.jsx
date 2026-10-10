'use client';

import React from 'react';
import {
  Tag,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatVariableLabel, getSampleValue } from '@/lib/variableUtils';

export default function VariableMappingCard({
  variableList = [], // [ { key, number, whatsappTag, namedTag, label, sample } ]
  unmappedNumberedVars = [], // [ "1", "2" ]
  onOpenDefineModal, // (num) => void
  onRemoveVariable, // (key) => void
}) {
  if (variableList.length === 0 && unmappedNumberedVars.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-2xl bg-[#090312] border border-[#24113A] text-xs text-white/50 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#814AC8]" />
          Use <code className="text-purple-300">+ Insert Variable</code> to add personalized fields.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-[#090312] border border-[#24113A] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="text-sm font-medium text-white">Active Template Variables</span>
        </div>
        <span className="text-[10px] text-white bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 px-2 py-0.5 rounded-full border border-white/20">
          {variableList.length} Active {variableList.length === 1 ? 'Variable' : 'Variables'}
        </span>
      </div>

      {/* Undefined Numbered Variables Warning (e.g. {{1}}, {{2}}) */}
      {unmappedNumberedVars.length > 0 && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#3b2a08]/80 via-[#261b05]/60 to-[#0d0902] border border-white/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[11px] text-amber-200 truncate">
              Numbered variable detected in text. Define meaningful name:
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {unmappedNumberedVars.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onOpenDefineModal(num)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-medium transition-all"
              >
                Define {`{{${num}}}`} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variables Mapping List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {variableList.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#120822] border border-[#2e154f] group hover:border-[#814AC8]/50 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Variable Icon badge */}
              <div
                title={item.label}
                className="w-6 h-6 rounded-lg bg-[#814AC8]/25 border border-[#814AC8]/40 text-[#c490e8] flex items-center justify-center shrink-0"
              >
                <Tag className="w-3 h-3" />
              </div>

              {/* Named Variable */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">
                    {`{{${item.key}}}`}
                  </span>
                </div>
                <div className="text-[10px] text-white/50 truncate">
                  {item.label} • Sample: <span className="text-purple-300 font-medium">{item.sample}</span>
                </div>
              </div>
            </div>

            {/* Edit / Redefine Button */}
            <button
              type="button"
              onClick={() => onOpenDefineModal(item.number)}
              title={`Redefine {{${item.key}}}`}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 opacity-70 group-hover:opacity-100 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Clean Footer Note */}
      <div className="pt-2 border-t border-[#1e0d36] flex items-center justify-between text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Variables will automatically personalize for each customer</span>
        </span>
      </div>
    </div>
  );
}
