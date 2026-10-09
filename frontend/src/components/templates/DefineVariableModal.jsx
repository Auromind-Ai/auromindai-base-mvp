'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  Check,
  User,
  Briefcase,
  Sliders,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  VARIABLE_CATEGORIES,
  ALL_KNOWN_VARIABLES,
  sanitizeVariableName,
  formatVariableLabel,
} from '@/lib/variableUtils';

export default function DefineVariableModal({
  isOpen,
  variableNumber, // e.g. "1", "2", "3"
  onClose,
  onDefine, // (number, name) => void
  existingMapping = {},
}) {
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');
  const inputRef = useRef(null);

  // Recommendations based on variable index
  const getSmartRecommendations = (num) => {
    switch (String(num)) {
      case '1':
        return [
          { key: 'customer_name', label: 'customer_name (Customer Name)', desc: 'Primary contact name for personal greeting' },
          { key: 'otp_code', label: 'otp_code (OTP Code)', desc: 'One-time password or verification code for login/auth' },
          { key: 'first_name', label: 'first_name (First Name)', desc: 'Contact first name only' },
          { key: 'phone', label: 'phone (Phone)', desc: 'Contact phone number' },
        ];
      case '2':
        return [
          { key: 'plan_name', label: 'plan_name (Plan Name)', desc: 'Subscription tier or product plan' },
          { key: 'product_name', label: 'product_name (Product Name)', desc: 'Purchased item or service' },
          { key: 'order_id', label: 'order_id (Order ID)', desc: 'Reference or order number' },
        ];
      case '3':
        return [
          { key: 'amount', label: 'amount (Amount)', desc: 'Billing or transaction amount' },
          { key: 'deal_value', label: 'deal_value (Deal Value)', desc: 'CRM deal or contract value' },
          { key: 'appointment_date', label: 'appointment_date (Appointment Date)', desc: 'Scheduled booking timestamp' },
        ];
      default:
        return [
          { key: 'custom_var', label: 'Custom Field', desc: 'Custom business parameter' },
        ];
    }
  };

  useEffect(() => {
    if (isOpen) {
      const recs = getSmartRecommendations(variableNumber);
      const defaultRec = recs[0]?.key || 'customer_name';
      const existing = existingMapping[variableNumber];
      setSelectedName(existing || defaultRec);
      setCustomName('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, variableNumber, existingMapping]);

  if (!isOpen) return null;

  const smartRecs = getSmartRecommendations(variableNumber);

  const handleSubmit = (nameToUse) => {
    const finalName = sanitizeVariableName(nameToUse || customName || selectedName);
    if (!finalName) return;
    onDefine(String(variableNumber), finalName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e071a] border border-[#3D1F6B] rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#814AC8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl border border-[#24113A] text-white/50 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#814AC8]/20 border border-[#814AC8]/40 text-[#c490e8] text-xs font-medium mb-2.5">
            <Sparkles className="w-3 h-3" />
            <span>Dynamic Variable Definition</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Define Variable</span>
            <code className="text-[#c490e8] bg-[#814AC8]/20 px-2 py-0.5 rounded-lg border border-[#814AC8]/40 text-base">
              {`{{${variableNumber}}}`}
            </code>
          </h2>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            Give <code className="text-purple-300">{`{{${variableNumber}}}`}</code> a meaningful name so users and teammates don't have to manually remember variable numbers.
          </p>
        </div>

        {/* Tabs: Recommended vs All Categories */}
        <div className="flex gap-2 p-1 bg-[#07020d] border border-[#24113A] rounded-xl mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'recommended'
                ? 'bg-[#814AC8] text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Recommended for {`{{${variableNumber}}}`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'categories'
                ? 'bg-[#814AC8] text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            All Standard Fields
          </button>
        </div>

        {/* Tab 1: Recommended */}
        {activeTab === 'recommended' && (
          <div className="space-y-2 mb-5">
            {smartRecs.map((rec, i) => (
              <button
                key={rec.key}
                type="button"
                onClick={() => {
                  setSelectedName(rec.key);
                  setCustomName('');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                  selectedName === rec.key && !customName
                    ? 'border-[#814AC8] bg-[#814AC8]/20 shadow-[0_0_20px_rgba(129,74,200,0.25)]'
                    : 'border-[#24113A] bg-[#090312] hover:border-[#814AC8]/40 hover:bg-[#110722]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                      selectedName === rec.key && !customName
                        ? 'bg-[#814AC8] text-white'
                        : 'bg-[#180d2c] text-[#c490e8]'
                    }`}
                  >
                    {`{{${variableNumber}}}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {`{{${rec.key}}}`}
                      </span>
                      {i === 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 mt-0.5">{rec.desc}</p>
                  </div>
                </div>
                {selectedName === rec.key && !customName && (
                  <Check className="w-4 h-4 text-[#c490e8]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Categorized Fields */}
        {activeTab === 'categories' && (
          <div className="max-h-56 overflow-y-auto space-y-3 mb-5 pr-1 template-scroll">
            {VARIABLE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/70 px-1">
                  {cat.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {cat.variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        setSelectedName(v.key);
                        setCustomName('');
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        selectedName === v.key && !customName
                          ? 'border-[#814AC8] bg-[#814AC8]/25'
                          : 'border-[#24113A] bg-[#090312] hover:border-[#814AC8]/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{v.label}</p>
                        <code className="text-[10px] text-[#c490e8]">
                          {`{{${v.key}}}`}
                        </code>
                      </div>
                      {selectedName === v.key && !customName && (
                        <Check className="w-3.5 h-3.5 text-[#c490e8] shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Variable Input Option */}
        <div className="mb-5 pt-3 border-t border-[#24113A]">
          <label className="text-xs font-medium text-white/80 block mb-1.5">
            Or type your own custom variable name:
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. plan_name, amount, order_status"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-[#080310] border border-[#24113A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]"
            />
            {customName && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#c490e8]">
                {`{{${sanitizeVariableName(customName)}}}`}
              </span>
            )}
          </div>
        </div>

        {/* Visual Mapping Preview */}
        <div className="p-3 rounded-2xl bg-[#07020d] border border-[#24113A] flex items-center justify-between text-xs mb-5">
          <div className="flex items-center gap-2">
            <span className="text-white/60">WhatsApp:</span>
            <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-semibold">
              {`{{${variableNumber}}}`}
            </code>
          </div>
          <ArrowRight className="w-4 h-4 text-[#814AC8]" />
          <div className="flex items-center gap-2">
            <span className="text-white/60">Orbion Editor:</span>
            <code className="px-2 py-0.5 rounded bg-[#814AC8]/25 border border-[#814AC8]/50 text-[#c490e8] font-semibold">
              {`{{${sanitizeVariableName(customName || selectedName)}}}`}
            </code>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white rounded-xl transition-colors"
          >
            Keep as {`{{${variableNumber}}}`}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!customName && !selectedName}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#814AC8] hover:bg-[#9355e3] disabled:opacity-40 text-white shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_28px_rgba(129,74,200,0.6)] transition-all"
          >
            <span>Apply &amp; Replace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
