'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, ArrowRight, X, ShieldAlert } from 'lucide-react';

export default function UpgradePromptModal({
  isOpen,
  onClose,
  title = "Plan Upgrade Required",
  message = "You have reached your current plan limit. Upgrade to a higher plan to unlock more capacity and features.",
  featureName = null,
  currentPlan = null,
  recommendedPlan = "Growth",
}) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    if (onClose) onClose();
    router.push('/billing/payment');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl bg-[#090b14] border border-purple-500/30 p-6 shadow-2xl shadow-purple-950/60 overflow-hidden text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-64 h-32 bg-purple-600/20 blur-[50px] pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Icon Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600/30 to-violet-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Plan Entitlement
                </span>
                {currentPlan && (
                  <span className="text-[11px] text-zinc-400 capitalize">
                    Current: {currentPlan}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          {/* Message Body */}
          <p className="text-sm text-zinc-300 leading-relaxed mb-6">
            {message}
          </p>

          {/* Benefit reminder pill */}
          <div className="mb-6 rounded-xl bg-white/[0.03] border border-white/10 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <span>Recommended Upgrade:</span>
            </div>
            <span className="font-semibold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
              {recommendedPlan} Plan
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Upgrade Plan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
