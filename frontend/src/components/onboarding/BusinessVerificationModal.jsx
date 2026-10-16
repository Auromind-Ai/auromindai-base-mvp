'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, ExternalLink, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function BusinessVerificationModal({
  isOpen,
  onClose,
  workspaceId,
  businessId,
  metaUrl,
  currentStatus = 'not_verified',
  onStatusUpdated,
}) {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [metaResult, setMetaResult] = useState(null);

  const effectiveBusinessId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('whatsapp_business_id') : '');

  const cleanBusinessId =
    effectiveBusinessId && effectiveBusinessId !== 'undefined' && effectiveBusinessId !== 'null'
      ? String(effectiveBusinessId).trim()
      : '';

  let verificationUrl = metaUrl || '';
  if (!verificationUrl || verificationUrl.endsWith('?business_id=') || verificationUrl.endsWith('?business_id')) {
    verificationUrl = cleanBusinessId
      ? `https://business.facebook.com/latest/settings/security_center?business_id=${encodeURIComponent(cleanBusinessId)}`
      : 'https://business.facebook.com/latest/settings/security_center';
  }

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
      showToast('Could not query Meta API directly. Please try again later.', 'warning');
      setMetaResult({
        success: false,
        message: 'Could not query Meta API directly. Please try again later.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl rounded-2xl bg-[#0b0c16] border border-[#814AC8]/30 shadow-[0_0_50px_-10px_rgba(129,74,200,0.3)] overflow-hidden text-white"
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
        <div className="p-6 space-y-4">
          <div
            className={`border rounded-2xl p-6 ${
              currentStatus === 'verified'
                ? 'bg-gradient-to-b from-[#071d13]/90 via-[#04130c]/95 to-[#020b07] border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.18)]'
                : currentStatus === 'pending'
                ? 'bg-gradient-to-b from-[#221603]/90 via-[#160e02]/95 to-[#0d0801] border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.18)]'
                : 'bg-gradient-to-b from-[#1c0508]/90 via-[#120305]/95 to-[#0b0203] border-red-600/50 shadow-[0_0_35px_rgba(220,38,38,0.18)]'
            }`}
          >
            {/* Top row: Icon box + Title & Status Badge */}
            <div className="flex items-start gap-4">
              {currentStatus === 'verified' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : currentStatus === 'pending' ? (
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#2a0a0e] border border-red-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2.5a2 2 0 0 0-1.73 1L1.4 18.2A2 2 0 0 0 3.13 21h17.74a2 2 0 0 0 1.73-2.8L13.73 3.5a2 2 0 0 0-1.73-1z"
                      fill="#f59e0b"
                    />
                    <path d="M12 8.5v5" stroke="#1c0507" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16.5" r="1" fill="#1c0507" />
                  </svg>
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  {currentStatus === 'verified'
                    ? 'Business Verified'
                    : currentStatus === 'pending'
                    ? 'Business Verification Pending Review'
                    : 'Business Verification Required'}
                </h4>
                <div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase border ${
                      currentStatus === 'verified'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : currentStatus === 'pending'
                        ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                        : 'bg-[#2b0c10]/80 text-red-400 border-red-500/40'
                    }`}
                  >
                    STATUS:{' '}
                    {currentStatus === 'verified'
                      ? 'VERIFIED'
                      : currentStatus === 'pending'
                      ? 'PENDING REVIEW'
                      : currentStatus
                      ? currentStatus.replace(/_/g, ' ')
                      : 'NOT VERIFIED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Paragraph */}
            <p className="mt-5 text-xs sm:text-sm text-white/80 leading-relaxed">
              {currentStatus === 'verified'
                ? 'Your business is officially verified with Meta. All WhatsApp messaging limits and template capabilities are active.'
                : currentStatus === 'pending'
                ? 'Your business documents are submitted and under review by Meta. Meta typically approves within 24–48 hours.'
                : 'Please verify business with Meta. Meta requires official business verification to approve templates and lift WhatsApp messaging limits.'}
            </p>

            {/* Bottom Row Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleCheckMetaStatus}
                disabled={checking}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#1c131d]/80 hover:bg-white/10 text-white border border-white/15 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                Refresh
              </button>
              {currentStatus !== 'verified' && (
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#dc2626] hover:bg-[#ef4444] text-white shadow-lg shadow-red-950/50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Verify Business
                  <ExternalLink size={14} />
                </a>
              )}
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
      </motion.div>
    </div>
  );
}
