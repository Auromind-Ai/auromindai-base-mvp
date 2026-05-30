'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';

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

export default function ConvertLeadModal({ isOpen, onClose, lead, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');

    try {
      const workspaceId = getWorkspaceIdFromToken();
      if (!workspaceId) {
        throw new Error('Workspace session expired. Please log in again.');
      }

      const leadId = lead?.lead_id || lead?.id;
      if (!leadId) {
        throw new Error('Invalid lead reference. Please try again.');
      }

      // POST /lead-scoring/leads/{id}/convert
      const res = await api.post(
        `/lead-scoring/leads/${leadId}/convert?workspace_id=${workspaceId}`,
        {
          amount: parsedAmount,
          product: product.trim(),
          notes: notes.trim() || null,
        }
      );

      // Trigger success callback
      onSuccess(res);
      onClose();

      // Toast notification
      showToast(`✅ Lead converted! Product: ${product.trim()}, Amount: ₹${parsedAmount.toLocaleString('en-IN')}`);
    } catch (err) {
      setError(err?.message || 'Failed to convert lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111119] border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Mark as Converted</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Lead: <span className="text-zinc-200 font-semibold">{lead?.name || lead?.phone || 'Unknown'}</span>
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
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-transparent border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            {loading ? 'Saving...' : 'Save Conversion'}
          </button>
        </div>
      </div>
    </div>
  );
}
