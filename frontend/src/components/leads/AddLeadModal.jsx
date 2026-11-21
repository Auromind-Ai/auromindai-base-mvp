'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Supported country list with E.164 dial codes, national lengths, regex rules, and hints.
 */
const COUNTRIES = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳', minLen: 10, maxLen: 10, regex: /^[6-9]\d{9}$/, hint: '10 digits starting with 6-9' },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸', minLen: 10, maxLen: 10, regex: /^[2-9]\d{9}$/, hint: '10 digits starting with 2-9' },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧', minLen: 10, maxLen: 11, regex: /^[1-9]\d{8,10}$/, hint: '10-11 digits' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪', minLen: 9, maxLen: 9, regex: /^5\d{8}$/, hint: '9 digits starting with 5' },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬', minLen: 8, maxLen: 8, regex: /^[3689]\d{7}$/, hint: '8 digits starting with 3, 6, 8, or 9' },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺', minLen: 9, maxLen: 9, regex: /^[2-478]\d{8}$/, hint: '9 digits starting with 4 (mobile) or 2/3/7/8' },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦', minLen: 10, maxLen: 10, regex: /^[2-9]\d{9}$/, hint: '10 digits starting with 2-9' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪', minLen: 10, maxLen: 11, regex: /^1[567]\d{8,9}$/, hint: '10-11 digits' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦', minLen: 9, maxLen: 9, regex: /^5\d{8}$/, hint: '9 digits starting with 5' },
];

/**
 * Creates a floating toast notification using decoupled DOM insertion,
 * utilizing pure CSS transition for smooth animation in and out.
 */
const showToast = (message) => {
  if (typeof window === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'flex items-center gap-2 px-4 py-3 rounded-xl border border-purple-500/30 bg-[#1a1a2e]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.innerHTML = message;

  container.appendChild(toast);

  // Force layout reflow
  toast.offsetHeight;

  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      toast.remove();
      if (container.childNodes.length === 0) {
        container.remove();
      }
    }, 300);
  }, 4000);
};

export default function AddLeadModal({ isOpen, onClose, onSuccess }) {
  const { workspaceId, loading: workspaceLoading } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default +91 India
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [source, setSource] = useState('manual');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  const handlePhoneChange = (e) => {
    let val = e.target.value;

    // Auto-detect country if pasted with + or starts with known country dial code
    if (val.startsWith('+')) {
      const matched = COUNTRIES.find((c) => val.startsWith(c.dial));
      if (matched) {
        setSelectedCountry(matched);
        val = val.slice(matched.dial.length).trim();
      }
    }

    // Only allow digits
    val = val.replace(/\D/g, '');

    // Enforce maxLength constraint on input directly
    if (val.length > selectedCountry.maxLen) {
      val = val.slice(0, selectedCountry.maxLen);
    }

    setPhone(val);
    if (error) setError('');
  };

  const handleCountrySelect = (c) => {
    setSelectedCountry(c);
    setIsCountryDropdownOpen(false);
    // Truncate existing phone if it exceeds the new country's maxLen
    if (phone.length > c.maxLen) {
      setPhone(phone.slice(0, c.maxLen));
    }
    if (error) setError('');
  };

  const handleSubmit = async () => {
    if (workspaceLoading || !workspaceId) {
      setError('Please select a workspace before adding a lead.');
      return;
    }

    // 1. Validation: Name (required, min 2 chars)
    if (!name || name.trim().length < 2) {
      setError('Name is required and must be at least 2 characters.');
      return;
    }

    // 2. Validation: Country-code-based Phone validation
    const cleanDigits = phone.replace(/\D/g, '').replace(/^0+/, '');
    const dialDigits = selectedCountry.dial.replace('+', '');
    let nationalDigits = cleanDigits;

    // If user typed the country code explicitly inside the input box (e.g. 919876543210 while +91 was selected)
    if (nationalDigits.startsWith(dialDigits) && nationalDigits.length >= dialDigits.length + selectedCountry.minLen) {
      nationalDigits = nationalDigits.slice(dialDigits.length);
    }

    if (!nationalDigits) {
      setError(`Phone number is required for ${selectedCountry.name}.`);
      return;
    }

    if (nationalDigits.length < selectedCountry.minLen) {
      setError(
        `Phone number is too short. ${selectedCountry.name} requires ${
          selectedCountry.minLen === selectedCountry.maxLen
            ? `${selectedCountry.minLen} digits`
            : `at least ${selectedCountry.minLen} digits`
        } (${selectedCountry.hint}).`
      );
      return;
    }

    if (nationalDigits.length > selectedCountry.maxLen) {
      setError(
        `Phone number exceeds allowed length of ${selectedCountry.maxLen} digits for ${selectedCountry.name}.`
      );
      return;
    }

    if (selectedCountry.regex && !selectedCountry.regex.test(nationalDigits)) {
      setError(
        `Invalid phone number format for ${selectedCountry.name}. Expected ${selectedCountry.hint}.`
      );
      return;
    }

    const fullPhone = `${selectedCountry.dial}${nationalDigits}`;

    // 3. Validation: Budget (numbers only, max > min)
    let minBudget = budgetMin === '' ? null : parseFloat(budgetMin);
    let maxBudget = budgetMax === '' ? null : parseFloat(budgetMax);

    if (budgetMin !== '' && (isNaN(minBudget) || minBudget < 0)) {
      setError('Min budget must be a valid positive number.');
      return;
    }
    if (budgetMax !== '' && (isNaN(maxBudget) || maxBudget < 0)) {
      setError('Max budget must be a valid positive number.');
      return;
    }
    if (minBudget !== null && maxBudget !== null && maxBudget <= minBudget) {
      setError('Max budget must be greater than min budget.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post(
        `/lead-scoring/leads/manual?workspace_id=${encodeURIComponent(workspaceId)}`,
        {
          name: name.trim(),
          phone: fullPhone,
          source: source,
          status: 'new',
          budget_min: minBudget,
          budget_max: maxBudget,
          note: note.trim() || null,
        }
      );

      // Trigger custom window event for Dashboard page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lead-added'));
      }

      // Close modal
      onClose();

      // Trigger success callback
      if (onSuccess) {
        onSuccess(res);
      }

      // Show toast
      showToast(`✅ Lead added! ${name.trim()}`);

      // Reset form fields
      setName('');
      setPhone('');
      setSelectedCountry(COUNTRIES[0]);
      setSource('manual');
      setBudgetMin('');
      setBudgetMax('');
      setNote('');
    } catch (err) {
      setError(err?.message || 'Failed to add lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[490px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Add New Lead</h2>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Rahul Sharma"
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>

        {/* Country-Code-Based Phone input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-zinc-400 text-sm font-medium">Phone Number *</label>
            <span className="text-[11px] text-zinc-500 font-medium">
              Max {selectedCountry.maxLen} digits
            </span>
          </div>

          <div className="relative flex items-center rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] focus-within:border-purple-500/50 transition-colors">
            {/* Country Dropdown trigger button */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 h-10 border-r border-[#2a2a2a] hover:bg-white/[0.04] text-white text-xs font-medium transition-colors cursor-pointer rounded-l-lg"
                title={`${selectedCountry.name} (${selectedCountry.dial})`}
              >
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                <span className="text-zinc-200 tabular-nums">{selectedCountry.dial}</span>
                <ChevronDown
                  size={13}
                  className={`text-zinc-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Country Selection Menu */}
              {isCountryDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-[260px] max-h-[220px] overflow-y-auto rounded-xl bg-[#141414] border border-[#2a2a2a] shadow-2xl z-50 p-1 space-y-0.5">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        selectedCountry.code === c.code
                          ? 'bg-purple-600/30 text-white font-medium'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-zinc-400 tabular-nums text-[11px]">{c.dial}</span>
                        {selectedCountry.code === c.code && <Check size={12} className="text-purple-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* National Phone Input */}
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={selectedCountry.maxLen}
              placeholder={selectedCountry.code === 'IN' ? '98765 43210' : 'Phone number'}
              className="w-full h-10 px-3 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600 tabular-nums"
            />
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center justify-between px-0.5">
            <span>{selectedCountry.flag} {selectedCountry.name}: {selectedCountry.hint}</span>
            <span className="tabular-nums">{phone.length}/{selectedCountry.maxLen}</span>
          </div>
        </div>

        {/* Source selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="twilio">Twilio</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Budget min / max */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Budget (optional)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="Min"
              min="0"
              className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="Max"
              min="0"
              className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Note input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note..."
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-transparent border border-[#2a2a2a] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || workspaceLoading || !workspaceId}
            className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Adding...' : 'Add Lead →'}
          </button>
        </div>
      </div>
    </div>
  );
}
