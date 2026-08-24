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
    title = "Pro Plan Subscription",
    subtitle = "Workspace Plan Upgrade • Monthly Billing",
    billingCycle = "monthly",
    baseAmount = 199,
    features = [
      "250,000 AI Credits / month",
      "500 WhatsApp WCC Wallet Credits",
      "Unlimited Agent Automation Flows",
      "5 Team Member Seats",
      "24/7 Priority Support",
    ],
  } = itemDetails;

  const cgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const sgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const totalGst = Number((cgstAmount + sgstAmount).toFixed(2));
  const totalPayable = Number((baseAmount + totalGst).toFixed(2));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
        {/* Ambient Dark Backdrop with Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#030305]/85 backdrop-blur-md"
        />

        {/* Modal Window Container - Wide & Low Height Landscape Design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[650px] rounded-[22px] border border-white/15 bg-[#0b0c10] p-5 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.95)] text-white z-10 flex flex-col justify-between overflow-hidden"
          style={{
            fontFamily: "var(--font-poppins), Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Glowing Background Light */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-purple-600/20 blur-[90px] pointer-events-none" />

          {/* Top Header Section */}
          <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              {/* Logo Box */}
              <div className="w-10 h-10 rounded-[12px] bg-[#161224] border border-purple-500/40 flex items-center justify-center shrink-0 p-2 overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <img
                  src={appLogoUrl}
                  alt="Orbion Logo"
                  className="w-full h-full object-contain filter drop-shadow"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <Sparkles className="w-5 h-5 text-purple-400 hidden" />
              </div>

              <div>
                <h3 className="text-lg font-bold tracking-tight text-white leading-tight">
                  {title}
                </h3>
                <p className="text-[11px] text-white/50 font-medium">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 border border-white/10 shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Side-by-Side 2-Column Grid for Compact Height */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left Column: What's Included & Notice */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="rounded-[16px] border border-white/10 bg-white/[0.02] p-3.5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#1e1530] border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Crown className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
                    What&#39;s included
                  </h4>
                </div>

                <div className="space-y-1.5 flex-1">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11.5px] text-white/90 leading-snug">
                      <CheckCircle2 size={13} className="text-purple-400 shrink-0" />
                      <span className="font-normal">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice Pill */}
              <div className="rounded-[12px] border border-purple-500/25 bg-[#181226]/80 p-2.5 flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-900/40 flex items-center justify-center text-purple-400 shrink-0">
                  <CreditCard size={13} />
                </div>
                <p className="text-[10.5px] text-white/75 leading-tight">
                  Instant activation post-payment.
                </p>
              </div>
            </div>

            {/* Right Column: Price Breakdown & Pay Button */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="rounded-[16px] border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Base Plan Price</span>
                  <span className="font-semibold text-white text-xs">₹{baseAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-white/50">
                  <span>CGST (9%)</span>
                  <span className="text-white/70">₹{cgstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-white/50">
                  <span>SGST (9%)</span>
                  <span className="text-white/70">₹{sgstAmount.toFixed(2)}</span>
                </div>

                {/* Total Payable Highlight Box */}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">Total Payable</p>
                    <p className="text-[9.5px] text-white/40">Includes 18% GST</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 tracking-tight">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-white/50 ml-1 font-normal">
                      /{billingCycle === "yearly" ? "yr" : "mo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Glowing Pay Button */}
              <button
                onClick={onProceedToPay}
                disabled={isProcessing}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#8b5cf6] via-[#9333ea] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(147,51,234,0.45)] hover:shadow-[0_0_35px_rgba(147,51,234,0.65)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-purple-400/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay ₹{totalPayable.toFixed(2)} Now</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

