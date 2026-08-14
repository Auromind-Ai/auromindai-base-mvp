import React from "react";
import {
  ShieldCheck,
  Zap,
  Wallet,
  Coins,
  RefreshCw,
  FileText,
  RotateCcw,
  ArrowUpRight,
  Sparkles,
  CreditCard,
  Clock
} from "lucide-react";

export function formatBillingDate(value, includeTime = false) {
  if (!value) return "N/A";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "N/A";

    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
    }

    return date.toLocaleDateString("en-IN", options);
  } catch {
    return "N/A";
  }
}

export function formatRelativeTime(value) {
  if (!value) return "N/A";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "N/A";

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;

    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} wk${diffWeeks > 1 ? "s" : ""} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} mo${diffMonths > 1 ? "s" : ""} ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} yr${diffYears > 1 ? "s" : ""} ago`;
  } catch {
    return "N/A";
  }
}

export function formatBillingAmount(value, currency = "INR") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getActivityMeta(item) {
  const type = String(item?.payment_type || item?.entry_type || item?.type || "").toLowerCase();
  const desc = String(item?.description || "").toLowerCase();
  const status = String(item?.status || "").toUpperCase();

  // Failed payments
  if (status === "FAILED" || status === "PAYMENT_FAILED") {
    return {
      title: "Payment Failed",
      desc: item?.description || "Payment transaction failed",
      icon: <CreditCard size={16} className="text-red-400" />,
      bg: "rgba(239,68,68,0.12)",
      badgeStyle: { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },
      label: "Failed Payment"
    };
  }

  // Pending / Initiated payments
  if (status === "PENDING" || status === "INITIATED") {
    return {
      title: "Recharge Initiated",
      desc: item?.description || "Awaiting payment confirmation",
      icon: <Clock size={16} className="text-amber-400" />,
      bg: "rgba(245,158,11,0.12)",
      badgeStyle: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" },
      label: "Pending Payment"
    };
  }

  if (type === "subscription_renewal" || desc.includes("renew") || desc.includes("renewal")) {
    return {
      title: "Subscription Renewed",
      desc: item?.description || "Subscription renewal payment",
      icon: <ShieldCheck size={16} className="text-emerald-400" />,
      bg: "rgba(34,197,94,0.12)",
      badgeStyle: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
      label: "Subscription"
    };
  }

  if (type === "subscription" || type === "subscription_purchase" || desc.includes("subscription") || desc.includes("pro plan") || desc.includes("solo plan") || desc.includes("enterprise plan")) {
    return {
      title: "Subscription Purchased",
      desc: item?.description || "Pro Plan Subscription payment",
      icon: <ShieldCheck size={16} className="text-emerald-400" />,
      bg: "rgba(34,197,94,0.12)",
      badgeStyle: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
      label: "Subscription"
    };
  }

  if (type === "plan_upgrade" || desc.includes("upgrade")) {
    return {
      title: "Plan Upgraded",
      desc: item?.description || "Subscription plan upgraded",
      icon: <ArrowUpRight size={16} className="text-purple-400" />,
      bg: "rgba(168,85,247,0.12)",
      badgeStyle: { background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" },
      label: "Plan Upgrade"
    };
  }

  if (type === "wallet_recharge" || type === "wcc_recharge" || desc.includes("wcc") || desc.includes("whatsapp") || desc.includes("wallet")) {
    return {
      title: "WCC Wallet Recharged",
      desc: item?.description || "WCC prepaid wallet top-up",
      icon: <Wallet size={16} className="text-emerald-400" />,
      bg: "rgba(16,185,129,0.12)",
      badgeStyle: { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" },
      label: "Wallet Recharge"
    };
  }

  if (type === "ai_credit_recharge" || type === "topup" || type === "purchase" || desc.includes("ai credit") || desc.includes("token")) {
    return {
      title: "AI Credits Purchased",
      desc: item?.description || "AI Workspace Credit Pack",
      icon: <Coins size={16} className="text-purple-400" />,
      bg: "rgba(139,92,246,0.12)",
      badgeStyle: { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" },
      label: "AI Credits"
    };
  }

  if (type === "flow_packs" || type === "flow_purchase" || type === "flow_pack_purchase" || desc.includes("flow")) {
    return {
      title: "Flow Pack Purchased",
      desc: item?.description || "Automation Flow Pack Addon",
      icon: <Zap size={16} className="text-amber-400" />,
      bg: "rgba(245,158,11,0.12)",
      badgeStyle: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" },
      label: "Flow Pack"
    };
  }

  if (type === "invoice_paid" || desc.includes("invoice paid")) {
    return {
      title: "Invoice Paid",
      desc: item?.description || "Invoice payment completed",
      icon: <FileText size={16} className="text-emerald-400" />,
      bg: "rgba(34,197,94,0.12)",
      badgeStyle: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
      label: "Invoice Paid"
    };
  }

  if (type === "refund" || desc.includes("refund")) {
    return {
      title: "Refund",
      desc: item?.description || "Transaction refund credited",
      icon: <RotateCcw size={16} className="text-blue-400" />,
      bg: "rgba(59,130,246,0.12)",
      badgeStyle: { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" },
      label: "Refund"
    };
  }

  if (type === "manual_credit" || desc.includes("manual")) {
    return {
      title: "Manual Credit Addition",
      desc: item?.description || "Admin manual credit adjustment",
      icon: <Sparkles size={16} className="text-cyan-400" />,
      bg: "rgba(6,182,212,0.12)",
      badgeStyle: { background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#22d3ee" },
      label: "Manual Adjustment"
    };
  }

  // Default payment / invoice fallback
  return {
    title: item?.status === "PAID" || item?.status === "captured" || item?.status === "success" ? "Payment Successful" : "Payment Attempt",
    desc: item?.description || "Payment Transaction",
    icon: <CreditCard size={16} className="text-amber-400" />,
    bg: "rgba(245,158,11,0.12)",
    badgeStyle: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" },
    label: "Payment"
  };
}

export function formatPaymentMethod(methodStr, providerStr = "Razorpay") {
  const method = String(methodStr || "").toLowerCase().trim();

  let label = "UPI";
  if (method === "card" || method.includes("credit") || method.includes("debit")) {
    label = "Card";
  } else if (method === "netbanking" || method.includes("bank")) {
    label = "Net Banking";
  } else if (method === "wallet") {
    label = "Wallet";
  } else if (method === "emi") {
    label = "EMI";
  } else if (method === "upi" || method.includes("upi") || method.includes("gpay") || method.includes("phonepe") || method.includes("paytm")) {
    label = "UPI";
  } else {
    label = "UPI";
  }

  return {
    label,
    provider: providerStr || "Razorpay",
    tooltip: `Processed via ${providerStr || "Razorpay"}`
  };
}

