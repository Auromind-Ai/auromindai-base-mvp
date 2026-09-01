"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertOctagon,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function PaymentFailedModal({
  isOpen,
  onClose,
  failureDetails,
  onRetryPayment,
}) {
  if (!isOpen) return null;

  const {
    errorMessage = "Transaction could not be completed. Your account was not charged.",
    reason = "Payment declined or cancelled by user",
  } = failureDetails || {};

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Ambient Dark Backdrop with Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#030305]/90 backdrop-blur-md"
        />

        {/* Modal Window Container matching dark glass design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[460px] max-h-[92dvh] overflow-y-auto rounded-[22px] sm:rounded-[24px] border border-red-500/20 bg-[#0d0d12] p-5 sm:p-7 shadow-[0_35px_100px_rgba(239,68,68,0.2)] text-white z-10 flex flex-col items-center my-auto"
          style={{
            fontFamily: "var(--font-poppins), Inter, system-ui, -apple-system, sans-serif",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.2) transparent",
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center cursor-pointer border border-white/10 shrink-0 z-20"
          >
            <X size={16} />
          </button>

          {/* Animated Failure Icon Container */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Floating Red/Rose Glow Background */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="absolute w-32 h-32 rounded-full bg-red-600/20 blur-2xl pointer-events-none"
            />
            
            {/* Decorative Floating Dots */}
            <div className="absolute -top-2 -left-4 w-2 h-2 rounded-full bg-red-400 opacity-60 animate-pulse" />
            <div className="absolute top-1 -right-5 w-2.5 h-2.5 rounded-full bg-rose-400 opacity-70 animate-ping" />
            <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-orange-400 opacity-70" />

            {/* Main Red Warning Outer Ring */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full border-2 border-red-500/50 bg-[#241216] p-1.5 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.35)]"
            >
              <div className="w-full h-full rounded-full bg-[#201214] border border-red-500/40 flex items-center justify-center shadow-inner">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  <X size={28} className="text-white stroke-[3]" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mt-3 mb-5 space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Payment Failed
            </h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-[320px] mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          {/* Failure Reason Card */}
          <div className="w-full rounded-[18px] border border-red-500/20 bg-red-950/20 p-4 space-y-2 mb-4">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldAlert size={15} />
              <span>Failure Reason</span>
            </div>
            <p className="text-xs text-white/80 leading-snug">
              {reason}
            </p>
          </div>

          {/* Help Notice Pill */}
          <div className="w-full rounded-[14px] border border-white/10 bg-[#161622]/60 p-3.5 flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <HelpCircle size={16} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-white">Need help with payment?</p>
              <p className="text-[10.5px] text-white/50 truncate">
                Try a different card/UPI method or contact support.
              </p>
            </div>
          </div>

          {/* Action Buttons: Retry & Dismiss */}
          <div className="w-full space-y-2.5">
            <button
              onClick={onRetryPayment || onClose}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-extrabold text-sm sm:text-base shadow-[0_0_30px_rgba(225,29,72,0.45)] hover:shadow-[0_0_45px_rgba(225,29,72,0.65)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30 hover:scale-[1.01] active:scale-[0.99]"
            >
              <RefreshCw size={17} />
              <span>Try Payment Again</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium text-xs transition-all flex items-center justify-center cursor-pointer border border-white/10"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
