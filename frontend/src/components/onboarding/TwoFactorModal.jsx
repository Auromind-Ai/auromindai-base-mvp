'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, ExternalLink, ShieldCheck, RefreshCw, AlertCircle, Info } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function TwoFactorModal({ isOpen, onClose, workspaceId, isCompleted, onStatusUpdated }) {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [metaResult, setMetaResult] = useState(null);

  if (!isOpen) return null;

  const handleCheckMetaStatus = async () => {
    setChecking(true);
    setMetaResult(null);
    try {
      const res = await api.check2FAStatus(workspaceId, false);
      if (res?.two_factor_enabled || res?.meta_verified) {
        showToast('Two-factor authentication verified successfully!', 'success');
        setMetaResult({ success: true, message: 'Verified by Meta Graph API: 2FA is active.' });
        if (onStatusUpdated) onStatusUpdated(res);
      } else {
        const msg = res?.meta_message || '2FA is not yet active or Meta has not propagated the change.';
        setMetaResult({ success: false, message: msg });
        showToast('Meta 2FA is not yet active. Please verify your settings in Business Suite.', 'warning');
      }
    } catch (err) {
      console.error('2FA check error:', err);
      showToast('Could not query Meta API directly. You can confirm manually if enabled.', 'warning');
      setMetaResult({
        success: false,
        message: 'Could not query Meta API directly. If you enabled 2FA in Business Suite, confirm below.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleManualConfirm = async () => {
    setConfirming(true);
    try {
      const res = await api.check2FAStatus(workspaceId, true);
      showToast('Two-factor authentication confirmed for your workspace.', 'success');
      if (onStatusUpdated) onStatusUpdated(res);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Manual 2FA confirm error:', err);
      showToast(err?.message || 'Failed to update 2FA status.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-2xl bg-[#0b0c16] border border-[#814AC8]/30 shadow-[0_0_50px_-10px_rgba(129,74,200,0.3)] overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#814AC8]/20 border border-[#814AC8]/40 flex items-center justify-center text-[#a77bee]">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Enable Two-Factor Authentication</h3>
              <p className="text-xs text-white/50">Step 2: Secure your Meta Business Suite</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#814AC8]/10 border border-[#814AC8]/25 text-xs text-white/80 leading-relaxed flex items-start gap-2.5">
            <Info size={16} className="text-[#a77bee] shrink-0 mt-0.5" />
            <span>
              Meta requires two-factor authentication (2FA) for all Business Accounts connected to WhatsApp Cloud API to safeguard business communications.
            </span>
          </div>

          {/* Stepper instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="text-xs space-y-1.5 flex-1">
                <p className="font-medium text-white">Open Meta Business Suite Security Center</p>
                <p className="text-white/50">Navigate to your Meta Business Manager security settings.</p>
                <a
                  href="https://business.facebook.com/settings/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#814AC8]/20 hover:bg-[#814AC8]/30 border border-[#814AC8]/40 text-[#a77bee] hover:text-white font-medium text-[11px] transition-all"
                >
                  Open Meta Security Center <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="text-xs space-y-1">
                <p className="font-medium text-white">Turn on 2FA Requirement</p>
                <p className="text-white/50">Under &quot;Two-factor authentication&quot;, choose <strong>Everyone</strong> or <strong>Admins only</strong>.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="text-xs space-y-1">
                <p className="font-medium text-white">Verify Status in Orbion Agents</p>
                <p className="text-white/50">Click below to check or confirm that 2FA has been activated.</p>
              </div>
            </div>
          </div>

          {/* Meta Live Result feedback */}
          {metaResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                metaResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {metaResult.success ? (
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{metaResult.success ? 'Meta Status Confirmed' : 'Verification Status'}</p>
                <p className="text-white/70">{metaResult.message}</p>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <Check size={16} className="text-emerald-400 shrink-0" />
              <span>Two-Factor Authentication is completed for this workspace.</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCheckMetaStatus}
            disabled={checking || confirming}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking Meta...' : 'Check Status'}
          </button>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={checking || confirming}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#814AC8] hover:bg-[#703bb5] shadow-lg shadow-[#814AC8]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={13} />
                {confirming ? 'Saving...' : 'I Have Enabled 2FA'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
