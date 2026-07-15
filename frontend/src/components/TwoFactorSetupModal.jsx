'use client';

import { useState } from 'react';
import { Shield, X, Copy, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function TwoFactorSetupModal({ setupData, onSuccess, onClose }) {
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await api.verifySetup2FA(code);
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
      <div className="relative w-full max-w-md rounded-2xl border border-[rgba(157,157,157,0.43)] bg-[#070012] shadow-[0_0_60px_rgba(124,58,237,0.15)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(157,157,157,0.43)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Shield size={16} className="text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-white">
              Set Up Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Step 1 — QR Code */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
              Step 1 — Scan QR Code
            </p>
            <div className="flex justify-center">
              <div className="rounded-xl border border-[rgba(157,157,157,0.43)] bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qr_code}
                  alt="2FA QR Code"
                  width={160}
                  height={160}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-white/50">
              Open <span className="text-white/80">Google Authenticator</span>,
              tap <span className="text-white/80">+</span>, then scan this code.
            </p>
          </div>

          {/* Manual entry */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
              Or enter manually
            </p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-[rgba(157,157,157,0.43)]">
              <code className="flex-1 text-sm text-violet-300 font-mono tracking-widest break-all">
                {setupData.secret}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-white/40 hover:text-white transition-colors"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Step 2 — Enter code */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                Step 2 — Enter 6-digit code
              </p>
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
                  focus:outline-none focus:border-violet-500
                  transition-colors
                "
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

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
                Cancel
              </button>
              <button
                type="submit"
                disabled={code.length !== 6 || loading}
                className="
                  flex-1 h-11 rounded-xl text-sm font-medium text-white
                  bg-violet-600 hover:bg-violet-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all active:scale-95
                  flex items-center justify-center gap-2
                "
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : 'Verify & Enable'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}