'use client';

import { useState } from 'react';
import { ShieldOff, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function TwoFactorDisableModal({ onSuccess, onClose }) {
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisable = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await api.disable2FA(code);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-[rgba(157,157,157,0.43)] bg-[#070012] shadow-[0_0_60px_rgba(124,58,237,0.1)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(157,157,157,0.43)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ShieldOff size={16} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-white">
              Disable Two-Step Verification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleDisable} className="px-6 py-5 space-y-5">
          <p className="text-sm text-white/65 leading-relaxed">
            Are you sure you want to disable Two-Step Verification?
            Your account will be protected by email OTP only.
          </p>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
              Enter your current authenticator code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="
                w-full h-12 rounded-xl px-4 text-center
                bg-white/5 border border-[rgba(157,157,157,0.43)]
                text-white text-2xl font-mono tracking-[0.4em]
                placeholder:text-white/20 placeholder:tracking-[0.2em]
                focus:outline-none focus:border-red-500/60
                transition-colors
              "
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 h-11 rounded-xl text-sm font-medium text-white/60
                bg-white/5 border border-[rgba(157,157,157,0.43)]
                hover:bg-white/10 transition-all active:scale-95
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="
                flex-1 h-11 rounded-xl text-sm font-medium text-white
                bg-red-600 hover:bg-red-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all active:scale-95
                flex items-center justify-center gap-2
              "
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}