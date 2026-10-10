'use client';

import { useState } from 'react';
import { MessageSquare, X, Clock, ArrowRight, ChevronDown, Check } from 'lucide-react';

const COUNTRIES = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
];

export default function NewChatModal({ isOpen, onClose, onStartChat }) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default +91 India
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Auto-detect country if pasted with +
    if (val.startsWith('+')) {
      const matched = COUNTRIES.find(c => val.startsWith(c.dial));
      if (matched) {
        setSelectedCountry(matched);
        val = val.slice(matched.dial.length).trim();
      }
    }
    // Only allow numbers, spaces and hyphens
    val = val.replace(/[^\d\s-]/g, '');
    setPhoneNumber(val);
  };

  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const isValid = cleanDigits.length >= 7;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!isValid) return;
    const fullNumber = `${selectedCountry.dial.replace('+', '')}${cleanDigits}`;
    onStartChat(fullNumber);
    setPhoneNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-[490px] bg-[#141423] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-150 relative select-none"
        onClick={(e) => {
          if (isCountryDropdownOpen && !e.target.closest('.country-dropdown-container')) {
            setIsCountryDropdownOpen(false);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-white tracking-tight leading-tight">
                New chat
              </h2>
              <p className="text-[13px] text-zinc-400 mt-1">
                Start a WhatsApp conversation by phone number.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-[13.5px] font-medium text-zinc-300 mb-2 block">
              Phone number
            </label>

            {/* Combined Phone Input */}
            <div className="rounded-xl border border-white/10 bg-[#0e0f19] focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 flex items-center overflow-visible relative transition-all">
              {/* Country Selector */}
              <div className="relative country-dropdown-container shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3.5 py-3 hover:bg-white/5 transition-colors text-zinc-200 cursor-pointer rounded-l-xl"
                >
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                    {selectedCountry.code}
                  </span>
                  <span className="text-[14px] font-medium text-white tabular-nums">
                    {selectedCountry.dial}
                  </span>
                  <ChevronDown size={13} className={`text-zinc-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Country Dropdown Menu */}
                {isCountryDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[260px] max-h-[240px] overflow-y-auto rounded-xl bg-[#1b1c2e] border border-white/10 shadow-2xl z-[1000] p-1.5 space-y-0.5 custom-scrollbar">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          selectedCountry.code === c.code
                            ? 'bg-purple-600/30 text-white font-medium'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{c.flag}</span>
                          <span className="font-medium text-[13px]">{c.name}</span>
                        </div>
                        <span className="text-zinc-400 font-mono text-[12px]">{c.dial}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-white/10 shrink-0" />

              {/* Input field */}
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="Phone number"
                autoFocus
                className="flex-1 bg-transparent px-3.5 py-3 text-[15px] text-white placeholder:text-zinc-500 outline-none font-normal"
              />
            </div>

            <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed">
              Paste a full number with + and the country is detected automatically.
            </p>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-xl bg-[#0e0f19]/90 border border-white/[0.08] flex items-start gap-3 text-[12.5px] text-zinc-300 leading-relaxed">
            <Clock size={16} className="text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Only approved templates can start a conversation (WhatsApp 24-hour rule). If the contact wrote to you recently, the existing chat opens instead.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2.5 rounded-xl text-[14px] font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isValid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-semibold transition-all shadow-lg shadow-purple-900/30 cursor-pointer active:scale-95"
            >
              <ArrowRight size={15} strokeWidth={2.5} />
              <span>Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
