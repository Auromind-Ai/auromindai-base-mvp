"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Calendar,
  CreditCard,
  Clock,
  Mail,
  ArrowRight,
} from "lucide-react";

export default function PaymentSuccessModal({
  isOpen,
  onClose,
  paymentDetails,
  onGoToDashboard,
}) {
  if (!isOpen || !paymentDetails) return null;

  const {
    planTitle = "Pro Plan Subscription",
    amountPaid = "234.82",
    billingCycle = "Monthly",
    nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  } = paymentDetails;

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

        {/* Modal Window Container matching exact mockup design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[460px] max-h-[92dvh] overflow-y-auto rounded-[22px] sm:rounded-[24px] border border-white/10 bg-[#0d0d12] p-5 sm:p-7 shadow-[0_35px_100px_rgba(0,0,0,0.95)] text-white z-10 flex flex-col items-center my-auto"
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

          {/* Animated Success Icon Container */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Floating Sparkles & Particles Background */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="absolute w-32 h-32 rounded-full bg-purple-600/20 blur-2xl pointer-events-none"
            />
            
            {/* Decorative Floating Dots matching screenshot */}
            <div className="absolute -top-2 -left-4 w-2 h-2 rounded-full bg-purple-400 opacity-60 animate-pulse" />
            <div className="absolute top-1 -right-5 w-2.5 h-2.5 rounded-full bg-indigo-400 opacity-70 animate-ping" />
            <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-emerald-400 opacity-70" />
            <div className="absolute bottom-2 -right-4 w-1.5 h-1.5 rounded-full bg-purple-300 opacity-60" />

            {/* Main Green Check Outer Ring */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full border-2 border-purple-500/50 bg-[#161224] p-1.5 flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.35)]"
            >
              <div className="w-full h-full rounded-full bg-[#121820] border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                >
                  <Check size={28} className="text-white stroke-[3]" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mt-3 mb-5 space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Payment Successful!
            </h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-[320px] mx-auto leading-relaxed">
              Your {planTitle} has been activated successfully.
            </p>
          </div>

          {/* Itemized Payment Details Container */}
          <div className="w-full rounded-[18px] border border-white/10 bg-[#13131c]/60 p-4 space-y-3.5 mb-4">
            {/* Row 1: Plan */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10.5px] text-white/40 font-medium">Plan</p>
                  <p className="font-semibold text-white">{planTitle}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Active
              </span>
            </div>

            <div className="w-full border-t border-white/5" />

            {/* Row 2: Amount Paid */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <CreditCard size={16} />
                </div>
                <div>
                  <p className="text-[10.5px] text-white/40 font-medium">Amount Paid</p>
                  <p className="font-semibold text-white">₹{amountPaid}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-300">
                {billingCycle}
              </span>
            </div>

            <div className="w-full border-t border-white/5" />

            {/* Row 3: Next Billing Date */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10.5px] text-white/40 font-medium">Next Billing Date</p>
                  <p className="font-semibold text-white">{nextBillingDate}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-300">
                {billingCycle}
              </span>
            </div>
          </div>

          {/* Receipt Email Notice Pill */}
          <div className="w-full rounded-[14px] border border-white/10 bg-[#161622]/60 p-3.5 flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Mail size={16} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-white">Receipt sent to you</p>
              <p className="text-[10.5px] text-white/50 truncate">
                We&#39;ve sent the payment receipt to your registered email.
              </p>
            </div>
          </div>

          {/* Go to Dashboard CTA Button */}
          <button
            onClick={onGoToDashboard || onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white font-extrabold text-sm sm:text-base shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:shadow-[0_0_45px_rgba(139,92,246,0.75)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-purple-400/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
