'use client';

import { useState } from 'react';
import api from '@/lib/api';

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('manual');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // 1. Validation: Name (required, min 2 chars)
    if (!name || name.trim().length < 2) {
      setError('Name is required and must be at least 2 characters.');
      return;
    }

    // 2. Validation: Phone (required, Indian mobile format)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      setError('Phone is required and must be a valid Indian mobile number (e.g. +919876543210 or 10 digits starting with 6-9).');
      return;
    }

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
        `/lead-scoring/leads/manual`,
        {
          name: name.trim(),
          phone: cleanPhone,
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
      <div className="w-full max-w-[480px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Add New Lead</h2>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Sharma"
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>

        {/* Phone input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 text-sm font-medium">Phone *</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
          />
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
            className="h-10 px-4 rounded-lg bg-transparent border border-[#2a2a2a] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? 'Adding...' : 'Add Lead →'}
          </button>
        </div>
      </div>
    </div>
  );
}