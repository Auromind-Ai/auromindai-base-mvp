'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, Check, ExternalLink, ShieldCheck, RefreshCw, AlertCircle, Clock, Info } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function BusinessVerificationModal({
  isOpen,
  onClose,
  workspaceId,
  currentStatus = 'not_verified',
  onStatusUpdated,
}) {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [metaResult, setMetaResult] = useState(null);

  if (!isOpen) return null;

  const handleCheckMetaStatus = async () => {
    setChecking(true);
    setMetaResult(null);
    try {
      const res = await api.checkBusinessVerificationStatus(workspaceId, null);
      const newStatus = res?.business_verification_status || 'not_verified';

      if (newStatus === 'verified') {
        showToast('Business verification is confirmed by Meta!', 'success');
        setMetaResult({ success: true, message: 'Meta confirmed business verification status: Verified.' });
      } else if (newStatus === 'pending') {
        showToast('Verification is under review by Meta.', 'info');
        setMetaResult({ success: true, message: 'Meta status: Documents submitted and under review.' });
      } else {
        const msg = res?.meta_message || 'Verification is not yet submitted or approved on Meta.';
        setMetaResult({ success: false, message: msg });
        showToast('Business verification is pending or action required.', 'warning');
      }

      if (onStatusUpdated) onStatusUpdated(res);
    } catch (err) {
      console.error('Business verification check error:', err);
      showToast('Could not query Meta API directly. You can update status manually below.', 'warning');
      setMetaResult({
        success: false,
        message: 'Could not query Meta API directly. You can track your submission status below.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSetManualStatus = async (statusValue) => {
    setUpdating(true);
    try {
      const res = await api.checkBusinessVerificationStatus(workspaceId, statusValue);
      const label = statusValue === 'verified' ? 'Verified' : statusValue === 'pending' ? 'Under Review' : 'Updated';
      showToast(`Verification status set to: ${label}`, 'success');
      if (onStatusUpdated) onStatusUpdated(res);
      if (statusValue === 'verified') {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Manual status update error:', err);
      showToast(err?.message || 'Failed to update verification status.', 'error');
    } finally {
      setUpdating(false);
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
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Complete Business Verification</h3>
              <p className="text-xs text-white/50">Step 3: Verify your business with Meta</p>
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-xs text-white/60">Current Status:</span>
            {currentStatus === 'verified' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Check size={12} /> Verified by Meta
              </span>
            )}
            {currentStatus === 'pending' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Clock size={12} /> Pending Meta Review
              </span>
            )}
            {currentStatus === 'failed' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertCircle size={12} /> Verification Failed
              </span>
            )}
            {currentStatus === 'not_verified' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/70">
                Action Required
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#814AC8]/10 border border-[#814AC8]/25 text-xs text-white/80 leading-relaxed flex items-start gap-2.5">
            <Info size={16} className="text-[#a77bee] shrink-0 mt-0.5" />
            <span>
              Meta requires business verification to lift WhatsApp messaging limits, access official green checkmark badges, and ensure enterprise compliance.
            </span>
          </div>

          {/* Stepper instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="text-xs space-y-1.5 flex-1">
                <p className="font-medium text-white">Go to Meta Business Security Center</p>
                <p className="text-white/50">Navigate to Business Verification in your Meta settings.</p>
                <a
                  href="https://business.facebook.com/settings/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#814AC8]/20 hover:bg-[#814AC8]/30 border border-[#814AC8]/40 text-[#a77bee] hover:text-white font-medium text-[11px] transition-all"
                >
                  Open Meta Business Verification <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="text-xs space-y-1">
                <p className="font-medium text-white">Provide Legal Business Documents</p>
                <p className="text-white/50">
                  Upload proof of legal business registration (e.g., GST Certificate, Incorporation Certificate, or business bank statement).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="text-xs space-y-1">
                <p className="font-medium text-white">Confirm Verification Code</p>
                <p className="text-white/50">Meta will verify via business email or SMS. Once submitted, Meta typically approves within 24–48 hours.</p>
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
                <p className="font-semibold">{metaResult.success ? 'Meta Status' : 'Verification Update'}</p>
                <p className="text-white/70">{metaResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCheckMetaStatus}
            disabled={checking || updating}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking Meta...' : 'Check Status'}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus !== 'pending' && currentStatus !== 'verified' && (
              <button
                type="button"
                onClick={() => handleSetManualStatus('pending')}
                disabled={checking || updating}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'I Submitted Documents'}
              </button>
            )}

            {currentStatus !== 'verified' && (
              <button
                type="button"
                onClick={() => handleSetManualStatus('verified')}
                disabled={checking || updating}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#814AC8] hover:bg-[#703bb5] shadow-lg shadow-[#814AC8]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={13} />
                {updating ? 'Saving...' : 'Mark Verified'}
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
