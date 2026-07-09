'use client';

import { useState } from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

export default function DeleteAccountModal({ userEmail, onConfirm, onClose, loading }) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);

  const canConfirm = checked1 && checked2 && !loading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#070012] shadow-[0_0_60px_rgba(239,68,68,0.08)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(157,157,157,0.43)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Warning banner */}
          <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300 mb-1">
                This action has a 30-day grace period
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Your account will be scheduled for permanent deletion. You can cancel
                at any time within 30 days by logging back in.
              </p>
            </div>
          </div>

          {/* What gets deleted */}
          <div className="rounded-xl border border-[rgba(157,157,157,0.43)] bg-white/[0.02] divide-y divide-[rgba(157,157,157,0.2)]">
            {[
              'All your conversations and AI chat history',
              'All automation flows and configurations',
              'All connected integrations and data',
              'Your workspace and team access',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-xs text-white/60">{item}</p>
              </div>
            ))}
          </div>

          {/* Confirmation checkboxes */}
          <div className="space-y-3">
            {[
              {
                id: 'check1',
                checked: checked1,
                onChange: () => setChecked1((v) => !v),
                label: `I understand this will delete the account for ${userEmail}`,
              },
              {
                id: 'check2',
                checked: checked2,
                onChange: () => setChecked2((v) => !v),
                label: 'I understand all data will be permanently removed after 30 days',
              },
            ].map(({ id, checked, onChange, label }) => (
              <label
                key={id}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <div
                  onClick={onChange}
                  className={`
                    mt-0.5 w-4 h-4 rounded shrink-0 border transition-colors duration-200
                    flex items-center justify-center
                    ${checked
                      ? 'bg-red-500 border-red-500'
                      : 'bg-white/5 border-[rgba(157,157,157,0.43)] group-hover:border-red-500/50'}
                  `}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-white/60 leading-relaxed">{label}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 h-11 rounded-xl text-sm font-medium text-white/60
                bg-white/5 border border-[rgba(157,157,157,0.43)]
                hover:bg-white/10 transition-all active:scale-95
              "
            >
              Keep Account
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="
                flex-1 h-11 rounded-xl text-sm font-medium text-white
                bg-red-600 hover:bg-red-500
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all active:scale-95
                flex items-center justify-center gap-2
              "
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <><Trash2 size={14} /> Schedule Deletion</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}