import React from 'react';
import { CreditCard, Wallet, Zap, Sparkles, ArrowRight, FileText } from 'lucide-react';

export function formatBillingDate(dateVal, showTime = false) {
  if (!dateVal) return "—";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "—";
  
  const options = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  
  if (showTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = true;
  }
  
  return date.toLocaleDateString("en-US", options);
}

export function formatBillingAmount(amount) {
  if (amount === undefined || amount === null) return "₹0.00";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatPaymentMethod(method, provider) {
  const m = (method || "").toLowerCase();
  const p = (provider || "").toLowerCase();

  let label = "Unknown Method";
  let tooltip = "Payment processed via Gateway";

  if (m === "card") {
    label = "Credit/Debit Card";
    tooltip = "Processed via secure card payment";
  } else if (m === "upi") {
    label = "UPI";
    tooltip = "Processed via UPI instant payment";
  } else if (m === "netbanking" || m === "net_banking") {
    label = "Net Banking";
    tooltip = "Processed via direct bank login";
  } else if (m === "wallet") {
    label = "Wallet";
    tooltip = "Processed via digital wallet";
  } else if (m === "bank_transfer") {
    label = "Bank Transfer";
    tooltip = "Processed via bank transfer / IMPS / NEFT";
  } else if (m === "credit_note") {
    label = "Credit Note";
    tooltip = "Adjusted via system credit note";
  } else if (m) {
    label = m.charAt(0).toUpperCase() + m.slice(1);
    tooltip = `Processed via ${label}`;
  }

  if (p) {
    const provName = p.charAt(0).toUpperCase() + p.slice(1);
    tooltip += ` (${provName})`;
  }

  return { label, tooltip };
}

export function getActivityMeta(activity) {
  const type = (activity.payment_type || activity.product_type || "").toLowerCase();
  
  let icon = <CreditCard size={16} className="text-indigo-400" />;
  let bg = "rgba(99, 102, 241, 0.1)";
  let title = "Payment Transaction";
  let desc = "Purchase transaction completed";
  let color = "#818cf8"; // Default indigo-400 hex color

  if (type === "subscription") {
    icon = <Sparkles size={16} className="text-amber-400" />;
    bg = "rgba(245, 158, 11, 0.1)";
    title = "SaaS Subscription";
    desc = "Auromind SaaS Platform Subscription";
    color = "#fbbf24"; // Amber-400 hex color
  } else if (type === "ai_credits" || type === "ai_credit_recharge") {
    icon = <Zap size={16} className="text-purple-400" />;
    bg = "rgba(168, 85, 247, 0.1)";
    title = "AI Token Credits";
    desc = "AI Token Credit Pack Recharge";
    color = "#c084fc"; // Purple-400 hex color
  } else if (type === "flow_packs") {
    icon = <ArrowRight size={16} className="text-sky-400" />;
    bg = "rgba(14, 165, 233, 0.1)";
    title = "Flow Pack Upgrade";
    desc = "AI Automation Flow Pack upgrade";
    color = "#38bdf8"; // Sky-400 hex color
  } else if (type === "wcc_recharge" || type === "wallet_recharge") {
    icon = <Wallet size={16} className="text-emerald-400" />;
    bg = "rgba(16, 185, 129, 0.1)";
    title = "WCC Wallet Deposit";
    desc = "WhatsApp Conversation Cloud Wallet Recharge";
    color = "#34d399"; // Emerald-400 hex color
  } else if (type === "credit_note") {
    icon = <FileText size={16} className="text-rose-400" />;
    bg = "rgba(244, 63, 94, 0.1)";
    title = "Refund Credit Note";
    desc = "Credit note issued for account adjustment";
    color = "#f87171"; // Rose-400 hex color
  }

  return { icon, bg, title, desc, color, badgeStyle: { color } };
}
