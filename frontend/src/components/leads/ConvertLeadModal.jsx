'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  toast.className = 'flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 bg-[#0c1c14]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold';
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

/**
 * ConvertLeadModal — 3-step flow:
 *   Step 1: Confirmation ("Convert to CRM Lead?")
 *   Step 2: Conversion form (amount, product, notes)
 *   Step 3: Success screen with "Open CRM Lead" button
 */
export default function ConvertLeadModal({ isOpen, onClose, conversation, onSuccess }) {
  const router = useRouter();
  const [step, setStep] = useState('confirm'); // 'confirm' | 'form' | 'success'
  const [amount, setAmount] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convertedLeadId, setConvertedLeadId] = useState(null);

  const conversationId = conversation?.id;
  const leadName = conversation?.contact_name || conversation?.phone || 'Unknown';
  const leadPhone = conversation?.phone || '—';

  const handleConfirm = () => {
    setStep('form');
  };

  const handleSubmit = async () => {
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Validate product
    if (!product.trim()) {
      setError('Product/Service name is required');
      return;
    }

    if (!conversationId) {
      setError('Invalid conversation context. Please try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // POST /api/conversations/{id}/convert
      const res = await api.post(
        `/api/conversations/${conversationId}/convert`,
        {
          amount: parsedAmount,
          product: product.trim(),
          notes: notes.trim() || null,
        }
      );

      const leadId = res.lead_id;
      setConvertedLeadId(leadId);
      setStep('success');

      // Trigger success callback (parent handles conversation removal from the active inbox list)
      onSuccess(res);

      // Toast notification
      showToast(`✅ Lead converted! Product: ${product.trim()}, Amount: ₹${parsedAmount.toLocaleString('en-IN')}`);
    } catch (err) {
      setError(err?.message || 'Failed to convert lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCRM = () => {
    const leadId = convertedLeadId;
    if (leadId) {
      onClose();
      router.push(`/user/admin/leads?leadId=${leadId}`);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setAmount('');
    setProduct('');
    setNotes('');
    setError('');
    setConvertedLeadId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111119] border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">

        {/* ─── Step 1: Confirmation ─── */}
        {step === 'confirm' && (
          <>
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Convert to CRM Lead?</h2>
                <p className="text-[13px] text-zinc-400 mt-1.5">This conversation will be moved to CRM and removed from active inbox.</p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-zinc-500">Lead Name</span>
                <span className="text-[13px] text-white font-semibold">{leadName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-zinc-500">Phone</span>
                <span className="text-[13px] text-white font-medium">{leadPhone}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-1">
              <button
                onClick={handleClose}
                className="h-10 px-4 rounded-lg bg-transparent border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                Convert Lead
              </button>
            </div>
          </>
        )}

        {/* ─── Step 2: Conversion Form ─── */}
        {step === 'form' && (
          <>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Conversion Details</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Lead: <span className="text-zinc-200 font-semibold">{leadName}</span>
              </p>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Revenue Amount (₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
                min="0"
                className="w-full h-10 px-3 rounded-lg bg-[#07010F] border border-white/[0.08] text-white text-sm outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Product Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Product / Service *</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Premium Plan"
                className="w-full h-10 px-3 rounded-lg bg-[#07010F] border border-white/[0.08] text-white text-sm outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Notes Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Customer purchased annual subscription"
                rows={3}
                className="w-full p-3 rounded-lg bg-[#07010F] border border-white/[0.08] text-white text-sm outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => { setStep('confirm'); setError(''); }}
                className="h-10 px-4 rounded-lg bg-transparent border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                {loading ? 'Saving...' : 'Save Conversion'}
              </button>
            </div>
          </>
        )}

        {/* ─── Step 3: Success ─── */}
        {step === 'success' && (
          <>
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Lead Converted Successfully</h2>
                <p className="text-[13px] text-zinc-400 mt-1.5">
                  <span className="text-white font-semibold">{leadName}</span> has been moved to CRM.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                onClick={handleOpenCRM}
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open CRM Lead
              </button>
              <button
                onClick={handleClose}
                className="w-full h-10 rounded-lg bg-transparent border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
