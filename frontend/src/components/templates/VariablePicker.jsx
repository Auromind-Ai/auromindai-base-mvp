'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  User,
  Briefcase,
  Sliders,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import {
  VARIABLE_CATEGORIES,
  sanitizeVariableName,
  formatVariableLabel,
} from '@/lib/variableUtils';

export default function VariablePicker({ onInsertVariable, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customVarName, setCustomVarName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const customInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setCustomInputOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus custom input when opened
  useEffect(() => {
    if (customInputOpen && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customInputOpen]);

  const handleSelectVariable = (varKey) => {
    if (!varKey) return;
    onInsertVariable(varKey);
    setIsOpen(false);
    setCustomInputOpen(false);
    setCustomVarName('');
    setSearchQuery('');
  };

  const handleCustomSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = sanitizeVariableName(customVarName);
    if (!clean) return;
    handleSelectVariable(clean);
  };

  const getCategoryIcon = (categoryId) => {
    switch (categoryId) {
      case 'contact':
        return <User className="w-3.5 h-3.5 text-blue-400" />;
      case 'crm':
        return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
      case 'custom':
        return <Sliders className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  // Filter variables if search is active
  const filteredCategories = VARIABLE_CATEGORIES.map((cat) => {
    if (!searchQuery.trim()) return cat;
    const q = searchQuery.toLowerCase().trim();
    const matchingVars = cat.variables.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        (v.sample && v.sample.toLowerCase().includes(q))
    );
    return { ...cat, variables: matchingVars };
  }).filter((cat) => cat.variables.length > 0 || (cat.hasCustomInput && !searchQuery));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ── Trigger Button: + Insert Variable ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setCustomInputOpen(false);
        }}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200
          border border-[#814AC8]/50 bg-gradient-to-r from-[#814AC8]/20 to-[#632ca6]/20 text-[#c490e8]
          hover:bg-[#814AC8]/30 hover:border-[#814AC8] hover:text-white hover:shadow-[0_0_16px_rgba(129,74,200,0.35)]
          focus:outline-none focus:ring-2 focus:ring-[#814AC8]/40 active:scale-95
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Insert Variable</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Dropdown Menu ── */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0e071a] border border-[#3D1F6B] shadow-[0_12px_40px_rgba(0,0,0,0.7)] z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-[#24113A] bg-[#140b24]/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">
                Variable Picker
              </span>
              <span className="text-[10px] text-[#B7B3C7]/60">Select to insert</span>
            </div>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search variables (name, phone, plan)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080310] border border-[#24113A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]"
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3 template-scroll">
            {filteredCategories.map((category) => (
              <div key={category.id} className="space-y-1">
                {/* Category Header */}
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-white/80">
                  {getCategoryIcon(category.id)}
                  <span>{category.label}</span>
                </div>

                {/* Category Variables List (Tree structure) */}
                <div className="pl-3 border-l border-[#24113A] ml-3.5 space-y-0.5">
                  {category.variables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => handleSelectVariable(variable.key)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group hover:bg-[#814AC8]/20 hover:text-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white/80 group-hover:text-white font-medium truncate">
                          {variable.label}
                        </span>
                        <code className="text-[10px] font-mono text-[#c490e8] bg-[#814AC8]/15 px-1.5 py-0.5 rounded border border-[#814AC8]/30">
                          {`{{${variable.key}}}`}
                        </code>
                      </div>
                      {variable.sample && (
                        <span className="text-[10px] text-white/30 group-hover:text-white/60 truncate max-w-[80px] ml-2">
                          {variable.sample}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* "Custom Field..." item in Custom Fields */}
                  {category.hasCustomInput && (
                    <div className="pt-1">
                      {!customInputOpen ? (
                        <button
                          type="button"
                          onClick={() => setCustomInputOpen(true)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-[#c490e8] hover:bg-[#814AC8]/20 hover:text-white font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Custom Field...</span>
                        </button>
                      ) : (
                        <form
                          onSubmit={handleCustomSubmit}
                          className="mt-1 p-2 rounded-xl bg-[#090312] border border-[#814AC8]/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-white/90">
                              New Custom Field
                            </label>
                            <span className="text-[9px] text-[#B7B3C7]/60">e.g. plan_name, amount</span>
                          </div>
                          <input
                            ref={customInputRef}
                            type="text"
                            placeholder="e.g. plan_name"
                            value={customVarName}
                            onChange={(e) => setCustomVarName(e.target.value)}
                            className="w-full bg-[#140b24] border border-[#3D1F6B] rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomInputOpen(false);
                                setCustomVarName('');
                              }}
                              className="px-2 py-1 text-[11px] text-white/60 hover:text-white rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!customVarName.trim()}
                              className="px-2.5 py-1 text-[11px] font-medium bg-[#814AC8] hover:bg-[#9158db] disabled:opacity-40 text-white rounded-md shadow-sm transition-all"
                            >
                              Insert
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-white/50 mb-2">No matching variables found.</p>
                <button
                  type="button"
                  onClick={() => {
                    const clean = sanitizeVariableName(searchQuery);
                    if (clean) handleSelectVariable(clean);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#c490e8] hover:underline font-medium"
                >
                  <span>Insert "{sanitizeVariableName(searchQuery)}" as custom field</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 border-t border-[#24113A] bg-[#080310] flex items-center justify-between text-[11px] text-white/50">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#c490e8]" />
              Orbion auto-maps to WhatsApp numbers
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
