"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wallet,
  CheckCircle2,
  Lock,
  CreditCard,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Receipt,
  Percent,
} from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

export default function WccRechargeSummaryModal({
  isOpen,
  onClose,
  amount = 1000,
  gstData = null,
  approxConversations = 0,
  onProceedToPay,
  isProcessing = false,
}) {
  const branding = useBranding();
  const appLogoUrl = branding?.appLogoUrl || "/logo.png";

  if (!isOpen) return null;

  const baseAmount = Number(amount) || 0;
  const currentGstRate = Number(gstData?.gst_rate ?? 18.0);
  const gstEnabled = gstData?.gst_enabled !== false;
  const isInterState = Boolean(gstData?.is_inter_state);
  const customerState = gstData?.customer_state || "Tamil Nadu";
  const customerGstin = gstData?.customer_gstin || null;

  // Real GST breakdown computation
  const gstAmount = gstData?.gst_amount !== undefined
    ? Number(gstData.gst_amount)
    : Number((baseAmount * (currentGstRate / 100)).toFixed(2));

  const cgstAmount = gstData?.cgst !== undefined
    ? Number(gstData.cgst)
    : (isInterState ? 0 : Number((gstAmount / 2).toFixed(2)));

  const sgstAmount = gstData?.sgst !== undefined
    ? Number(gstData.sgst)
    : (isInterState ? 0 : Number((gstAmount - (gstData?.cgst ?? Number((gstAmount / 2).toFixed(2)))).toFixed(2)));

  const igstAmount = gstData?.igst !== undefined
    ? Number(gstData.igst)
    : (isInterState ? gstAmount : 0);

  const totalPayable = gstData?.total_amount !== undefined
    ? Number(gstData.total_amount)
    : Number((baseAmount + gstAmount).toFixed(2));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Ambient Dark Backdrop with Glass Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#030305]/85 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[540px] max-h-[92dvh] sm:max-h-[88vh] rounded-[22px] sm:rounded-[26px] border border-white/15 bg-[#0b0c10] p-4 sm:p-6 shadow-[0_35px_100px_rgba(0,0,0,0.95)] text-white z-10 flex flex-col overflow-hidden my-auto"
          style={{
            fontFamily: "var(--font-poppins), Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Glowing Background Light */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-black blur-[100px] pointer-events-none" />

          {/* Top Header Section */}
          <div className="relative z-10 flex items-start justify-between pb-3.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              {/* WhatsApp / WCC Icon Box */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  Confirm Wallet Recharge
                </h3>
                <p className="text-xs sm:text-sm text-white/50 font-medium mt-0.5">
                  WhatsApp Conversation Cloud (WCC)
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 border border-white/10 shrink-0"
              title="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Scrollable Middle Body */}
          <div
            className="relative z-10 flex-1 overflow-y-auto my-3 pr-1 sm:pr-1.5 space-y-3 sm:space-y-3.5"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.2) transparent",
            }}
          >
            {/* Card 1: What is Credited to Wallet */}
            <div className="rounded-[16px] sm:rounded-[18px] border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-white/[0.02] p-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Wallet Credit Added
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] text-white border border-white/20">
                    100% Usable
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                  ₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Approximately <span className="font-semibold text-white">{approxConversations.toLocaleString("en-IN")}</span> Marketing conversations or <span className="font-semibold text-white">{(baseAmount / 0.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span> Service/Utility messages.
                </p>
              </div>
            </div>

            {/* Card 2: Price & Real GST Breakdown */}
            <div className="rounded-[16px] sm:rounded-[18px] border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 uppercase tracking-wider pb-1 border-b border-white/5">
                <Receipt size={13} className="text-purple-400" />
                <span>Price &amp; Tax Breakdown</span>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between items-center text-xs sm:text-sm text-white/70">
                <span>Wallet Recharge Amount (Taxable Value)</span>
                <span className="font-semibold text-white">₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* GST Section */}
              {gstEnabled && currentGstRate > 0 ? (
                <>
                  {!isInterState ? (
                    <>
                      <div className="flex justify-between items-center text-xs text-white/50 pl-2 border-l-2 border-purple-500/30">
                        <span>CGST ({(currentGstRate / 2).toFixed(1)}%)</span>
                        <span className="text-white/80">₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-white/50 pl-2 border-l-2 border-purple-500/30">
                        <span>SGST ({(currentGstRate / 2).toFixed(1)}%)</span>
                        <span className="text-white/80">₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-xs text-white/50 pl-2 border-l-2 border-purple-500/30">
                      <span>IGST ({currentGstRate.toFixed(1)}%)</span>
                      <span className="text-white/80">₹{igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-purple-300/80 font-medium">
                    <span>Total GST ({currentGstRate.toFixed(0)}%)</span>
                    <span>+ ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs text-white/50">
                  <span>GST (0%)</span>
                  <span className="text-white/70">₹0.00</span>
                </div>
              )}

              {/* Place of supply / GSTIN note */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-white/40">
                <span>Place of Supply: <strong className="text-white/60 font-medium">{customerState}</strong></span>
                {customerGstin && (
                  <span className="text-purple-400/90 font-mono">GSTIN: {customerGstin}</span>
                )}
              </div>

              {/* Total Payable Highlight Box */}
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white">Total Amount Payable</p>
                  <p className="text-[10px] sm:text-[11px] text-white/40">
                    {gstEnabled && currentGstRate > 0 ? `Inclusive of ${currentGstRate}% GST` : "Tax Inclusive"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight">
                    ₹{totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Security & Instant Fulfillment Note */}
            <div className="rounded-[12px] sm:rounded-[14px] border border-emerald-500/20 bg-[#0e1612]/80 p-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] flex items-center justify-center text-white shrink-0">
                <ShieldCheck size={16} />
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 leading-snug">
                Secured by Razorpay. Your WhatsApp prepaid balance will update automatically upon payment completion.
              </p>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="relative z-10 pt-3 shrink-0 border-t border-white/10 flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-1/3 h-11 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer border border-white/10 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onProceedToPay}
              disabled={isProcessing}
              className="group relative flex-1 h-11 sm:h-12 rounded-xl 
                bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08]
                hover:from-[#0a5a3b] hover:via-[#06402b] hover:to-[#02140d]
                text-white font-semibold text-xs sm:text-sm
                transition-all duration-300 ease-out
                flex items-center justify-center gap-2
                cursor-pointer
                disabled:opacity-60 disabled:cursor-not-allowed
                border border-white/20
                hover:border-emerald-400/50
                hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]
                hover:-translate-y-0.5
                active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing Checkout...</span>
                </>
              ) : (
                <>
                  <Lock
                    size={15}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />

                  <span>
                    Proceed to Pay ₹
                    {totalPayable.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>

                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
