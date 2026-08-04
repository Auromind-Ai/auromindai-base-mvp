export function formatBillingDate(dateVal, showTime = false) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    
    if (showTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
    }
    
    return d.toLocaleString("en-US", options);
  } catch (err) {
    return dateVal;
  }
}

export function formatBillingAmount(amount, currency = "INR") {
  const val = typeof amount === "number" ? amount : parseFloat(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2
  }).format(val);
}

export function formatPaymentMethod(method, provider) {
  const m = (method || "").toLowerCase();
  const p = (provider || "").toLowerCase();
  let label = "Other";
  let tooltip = "Payment processed via Gateway";

  if (m === "card") {
    label = "Card";
    tooltip = "Credit or Debit Card";
  } else if (m === "upi") {
    label = "UPI";
    tooltip = "Unified Payments Interface";
  } else if (m === "netbanking" || m === "nb") {
    label = "Net Banking";
    tooltip = "Net Banking Transfer";
  } else if (m === "wallet") {
    label = "Wallet";
    tooltip = "Mobile Wallet";
  } else if (m) {
    // Capitalize first letter of method if it's custom
    label = m.charAt(0).toUpperCase() + m.slice(1);
    tooltip = `${label} Payment`;
  }

  if (p) {
    const providerName = p === "razorpay" ? "Razorpay" : (p.charAt(0).toUpperCase() + p.slice(1));
    tooltip += ` (${providerName})`;
  }

  return { label, tooltip };
}

export function getActivityMeta(item) {
  const type = (item?.product_type || item?.type || "").toLowerCase();
  const desc = item?.description || "";
  
  let color = "#a855f7"; // default purple
  let defaultDesc = "Transaction";

  if (type === "subscription") {
    color = "#8b5cf6"; // violet
    defaultDesc = "Subscription Plan";
  } else if (type === "ai_credits") {
    color = "#3b82f6"; // blue
    defaultDesc = "AI Credits Recharge";
  } else if (type === "flow_packs") {
    color = "#ec4899"; // pink
    defaultDesc = "Flow Pack Purchase";
  } else if (type === "wcc_recharge") {
    color = "#10b981"; // emerald green
    defaultDesc = "WhatsApp Credits Recharge";
  }

  return {
    badgeStyle: { color },
    desc: desc || defaultDesc
  };
}
