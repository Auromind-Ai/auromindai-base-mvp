"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Crown,
  CheckCircle2,
  Lock,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

export default function PaymentSummaryModal({
  isOpen,
  onClose,
  itemDetails,
  onProceedToPay,
  isProcessing = false,
}) {
  const branding = useBranding();
  const appLogoUrl = branding?.appLogoUrl || "/logo.png";

  if (!isOpen || !itemDetails) return null;

  const {
    title = "Plan Subscription",
    subtitle = "Workspace Plan Upgrade",
    billingCycle = "monthly",
    baseAmount = 0,
    features = [],
    gstRate = 0,
  } = itemDetails;

  const currentGstRate = Number(gstRate) || 0;
  const halfGstRate = (currentGstRate / 2) / 100;
  const cgstAmount = Number((baseAmount * halfGstRate).toFixed(2));
  const sgstAmount = Number((baseAmount * halfGstRate).toFixed(2));
  const totalGst = Number((cgstAmount + sgstAmount).toFixed(2));
  const totalPayable = Number((baseAmount + totalGst).toFixed(2));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Ambient Dark Backdrop with Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#030305]/85 backdrop-blur-md"
        />

        {/* Modal Window Container - Increased Height & Width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[560px] min-h-[540px] rounded-[26px] border border-white/15 bg-[#0b0c10] p-6 sm:p-8 shadow-[0_35px_100px_rgba(0,0,0,0.95)] text-white z-10 flex flex-col justify-between overflow-hidden"
          style={{
            fontFamily: "var(--font-poppins), Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Glowing Background Light */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Top Header Section */}
            <div className="flex items-start justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                {/* Logo Box */}
                <div className="w-12 h-12 rounded-[14px] bg-[#161224] border border-purple-500/40 flex items-center justify-center shrink-0 p-2.5 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <img
                    src={appLogoUrl}
                    alt="Orbion Logo"
                    className="w-full h-full object-contain filter drop-shadow"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <Sparkles className="w-6 h-6 text-purple-400 hidden" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/50 font-medium mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 border border-white/10 shrink-0 mt-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Card 1: What's Included - Increased Height */}
            <div className="rounded-[18px] border border-white/10 bg-white/[0.02] p-4 sm:p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#1e1530] border border-purple-500/30 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                <Crown className="w-5.5 h-5.5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">
                  What&#39;s included
                </h4>
                <div className="space-y-2">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-white/90 leading-snug">
                      <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                      <span className="font-normal">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Price Breakdown - Increased Padding & Spacing */}
            <div className="rounded-[18px] border border-white/10 bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm text-white/60">
                <span>Base Plan Price</span>
                <span className="font-semibold text-white">₹{baseAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-white/50">
                <span>CGST ({(currentGstRate / 2).toFixed(0)}%)</span>
                <span className="text-white/70">₹{cgstAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-white/50">
                <span>SGST ({(currentGstRate / 2).toFixed(0)}%)</span>
                <span className="text-white/70">₹{sgstAmount.toFixed(2)}</span>
              </div>

              {/* Total Payable Highlight Box */}
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Total Payable</p>
                  <p className="text-[11px] text-white/40">
                    {currentGstRate > 0 ? `Includes ${currentGstRate}% GST` : "GST (0%)"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 tracking-tight">
                    ₹{totalPayable.toFixed(2)}
                  </span>
                  <span className="text-xs text-white/50 ml-1 font-normal">
                    /{billingCycle === "yearly" ? "yr" : "mo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Notice Pill */}
            <div className="rounded-[14px] border border-purple-500/25 bg-[#181226]/80 p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-400 shrink-0">
                <CreditCard size={16} />
              </div>
              <p className="text-xs text-white/80 leading-snug">
                Your subscription will be activated immediately after successful payment.
              </p>
            </div>
          </div>

          {/* High-Impact Full-Width Glowing Pay Button - Taller */}
          <div className="relative z-10 pt-5">
            <button
              onClick={onProceedToPay}
              disabled={isProcessing}
              className="w-full h-13 sm:h-14 rounded-xl bg-gradient-to-r from-[#8b5cf6] via-[#9333ea] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white font-extrabold text-sm sm:text-base shadow-[0_0_35px_rgba(147,51,234,0.5)] hover:shadow-[0_0_50px_rgba(147,51,234,0.75)] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border border-purple-400/30 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Pay ₹{totalPayable.toFixed(2)} Now</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


