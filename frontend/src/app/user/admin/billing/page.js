"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CreditCard,
  Receipt,
  Sparkles,
  RefreshCw,
  Calendar,
  IndianRupee,
  Wallet,
  ShieldCheck,
  Mail,
  FileText,
  Download,
  ArrowRight,
  Zap,
  BarChart3,
  Infinity,
} from "lucide-react"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export default function BillingHistoryPage() {
  const { workspaceId } = useAuth()
  const [billing, setBilling] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
      setError("Workspace not found. Please sign in again.")
      setLoading(false)
      return
    }

    const loadBillingHistory = async () => {
      try {
        setLoading(true)
        setError("")

        const [billingData, pricingData] = await Promise.all([
          api.getBillingStatus(workspaceId),
          api.getPricing(),
        ])

        setBilling(billingData)
        setPricing(pricingData)
      } catch (fetchError) {
        console.error("[BILLING HISTORY] Unable to load billing data:", fetchError)
        setError(fetchError.message || "Unable to load billing history")
        setBilling(null)
      } finally {
        setLoading(false)
      }
    }

    loadBillingHistory()

    const interval = setInterval(() => {
      api.getPricing().then(setPricing).catch(console.error)
    }, 10000)

    return () => clearInterval(interval)
  }, [workspaceId])

  const usage = useMemo(() => {
    const used = Number(billing?.credits_used ?? 0)
    const total = Number(billing?.total_limit ?? 0)
    const remaining = Number(
      billing?.credits_remaining ?? Math.max(total - used, 0)
    )
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0

    console.log("[BILLING HISTORY] Calculated usage:", { used, total, remaining, percent })

    return {
      used: Number(used.toFixed(2)),
      total: Number(total.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      percent,
    }
  }, [billing])

  const payments = useMemo(() => {
    if (Array.isArray(billing?.payments) && billing.payments.length) {
      return billing.payments
    }

    if (billing?.latest_payment?.id) {
      return [
        {
          id: billing.latest_payment.id,
          date: billing.latest_payment.created_at || billing.subscription?.current_period_start,
          amount: billing.latest_payment.amount,
          status: billing.latest_payment.status,
          payment_id: billing.latest_payment.payment_id,
        },
      ]
    }

    return []
  }, [billing])

  const currentPlanLabel = billing?.plan_label || titleCase(billing?.current_plan || "free")

  const currentPlanPrice = useMemo(() => {
    if (!pricing || !billing) return 0
    const plan = billing?.current_plan || "free"
    if (plan === "free") return pricing.free_plan_price
    if (plan === "pro") return pricing.pro_plan_price
    if (plan === "enterprise") return pricing.enterprise_plan_price
    return 0
  }, [pricing, billing])

  const activePlanFeatures = useMemo(() => {
    if (!pricing || !billing) return []
    const planKey = String(billing.current_plan || "free").toLowerCase()
    
    let rawFeatures = []
    if (planKey === "free") {
      rawFeatures = pricing.free_plan_features
    } else if (planKey === "pro") {
      rawFeatures = pricing.pro_plan_features
    } else if (planKey === "enterprise" || planKey === "business") {
      rawFeatures = pricing.enterprise_plan_features || pricing.business_plan_features
    } else {
      rawFeatures = pricing[`${planKey}_plan_features`] || pricing[`${planKey}_features`]
    }

    if (!rawFeatures) return []
    if (typeof rawFeatures === "string") {
      try {
        rawFeatures = JSON.parse(rawFeatures)
      } catch {
        return [rawFeatures]
      }
    }
    return Array.isArray(rawFeatures) ? rawFeatures : []
  }, [pricing, billing])

  return (
    <section className="min-h-screen bg-[#0d0d0f] text-white p-4 sm:p-6 md:p-8" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>Billing</h1>
        <p style={{ fontSize: 13, color: "#cdd1da", marginTop: 6 }}>
          Create, manage and submit WhatsApp Business templates for approval.
        </p>
      </div>

      {error && (
        <div style={{ borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", padding: "14px 18px", fontSize: 13, color: "#fca5a5", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Top Row: Current Plan + Plan Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Current Plan Card */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, fontWeight: 500 }}>Your current plan</p>
              {loading ? (
                <div style={skeletonStyle(120, 40)} />
              ) : (
                <>
                  <h2 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-1px", color: "#fff" }}>
                    {currentPlanLabel}
                  </h2>
                  <p style={{ fontSize: 15, color: "#9ca3af", marginTop: 6 }}>
                    {currentPlanPrice} / month
                  </p>
                </>
              )}
            </div>
            {!loading && (
              <span style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#f5faf7", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600 }}>
                Active
              </span>
            )}
          </div>

          {/* Feature Pills */}
          {!loading && activePlanFeatures.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20, marginBottom: 24 }}>
              {activePlanFeatures.map((feat, idx) => (
                <span key={`${feat}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", color: "#f1eff7", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 500 }}>
                  {getFeatureIcon(feat)} {feat}
                </span>
              ))}
            </div>
          )}


          {loading ? (
            <div style={skeletonStyle(140, 42)} />
          ) : (
            <a
              href="/user/admin/billing/payment"
              style={{ display: "inline-block", background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "opacity 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Upgrade plan
            </a>
          )}
        </div>

        {/* Plan Details Card */}
        <div style={cardStyle}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Plan Details</p>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4].map(i => <div key={i} style={skeletonStyle("100%", 44)} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                {
                  icon: <RefreshCw size={16} color="#9ca3af" />,
                  label: "Billing Cycle",
                  value: billing?.subscription?.billing_cycle || billing?.billing_cycle || "Monthly",
                },
                {
                  icon: <Calendar size={16} color="#9ca3af" />,
                  label: "Next Billing Date",
                  value: formatDate(billing?.subscription?.current_period_end || billing?.next_billing_date),
                },
                {
                  icon: <IndianRupee size={16} color="#9ca3af" />,
                  label: "Amount",
                  value: currentPlanPrice || "—",
                },
                {
                  icon: <CreditCard size={16} color="#9ca3af" />,
                  label: "Payment Method",
                  value: billing?.payment_method
                    ? `.... ${String(billing.payment_method).slice(-4)}`
                    : billing?.latest_payment?.payment_id
                    ? `.... ${String(billing.latest_payment.payment_id).slice(-4)}`
                    : "—",
                },
              ].map((row, idx, arr) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {row.icon}
                    </span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Usage Summary + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Usage Summary */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Usage Summary</p>
              <p style={{ fontSize: 12, color: "#cfd5df", marginTop: 4 }}>Current billing cycle usage</p>
            </div>
            <span style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.2)", color: "#f0edf8", borderRadius: 16, padding: "4px 12px", fontSize: 11, fontWeight: 500 }}>
              This month
            </span>
          </div>

          {loading ? (
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
              {[1, 2, 3].map(i => <div key={i} style={skeletonStyle("100%", 44)} />)}
            </div>
          ) : (
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 20 }}>
              <UsageBar
                label="Credits Used"
                value={`${usage.used} / ${usage.total}`}
                percent={usage.percent}
                barColor="linear-gradient(90deg, #22d3ee, #06b6d4)"
              />
              <UsageBar
                label="Remaining Credits"
                value={usage.remaining}
                percent={usage.total > 0 ? (usage.remaining / usage.total) * 100 : 0}
                barColor="linear-gradient(90deg, #818cf8, #6366f1)"
              />
              <UsageBar
                label="Percentage Used"
                value={`${usage.percent.toFixed(1)}%`}
                percent={usage.percent}
                barColor="linear-gradient(90deg, #f59e0b, #f97316)"
              />
            </div>
          )}
        </div>

        {/* Recent Account Activity */}
        <div style={cardStyle}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Recent Account Activity</p>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map(i => <div key={i} style={skeletonStyle("100%", 56)} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {buildActivityItems(billing).length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "24px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
                  No recent activity.
                </div>
              ) : (
                buildActivityItems(billing).map((item, idx, arr) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(241, 242, 245, 0.94)", margin: 0 }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: "#b9c1cf", margin: 0, marginTop: 2 }}>{item.desc}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", marginLeft: 12 }}>{item.date}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div style={cardStyle}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Payment History</p>

        {loading ? (
          <div style={skeletonStyle("100%", 200)} />
        ) : payments.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "48px 24px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
            No payment history available yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#070012]">
              <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    {["Date", "Description", "Amount", "Status", "Payment ID", "Invoice"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr
                      key={payment.id || payment.payment_id || `${payment.amount}-${payment.date || "na"}`}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px", color: "#d1d5db" }}>{formatDate(payment.date)}</td>
                      <td style={{ padding: "16px", color: "#d1d5db" }}>{payment.description || `${currentPlanLabel} Plan Monthly`}</td>
                      <td style={{ padding: "16px", color: "#fff", fontWeight: 600 }}>{formatAmount(payment.amount)}</td>
                      <td style={{ padding: "16px" }}>
                        <StatusPill status={payment.status} />
                      </td>
                      <td style={{ padding: "16px", color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>
                        {payment.payment_id || "N/A"}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <button style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                        >
                          <Download size={14} color="#9ca3af" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8b5cf6", textDecoration: "none", fontWeight: 500 }}>
                View all invoices <ArrowRight size={14} />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ─ Sub-components ─ */

function UsageBar({ label, value, percent, barColor }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#d1d5db", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${Math.max(percent, 0)}%`, background: barColor, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const normalized = String(status || "pending").toUpperCase()
  const style =
    normalized === "PAID" || normalized === "ACTIVE"
      ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }
      : normalized === "FAILED"
      ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }
      : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }

  return (
    <span style={{ ...style, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "inline-block" }}>
      {normalized === "PAID" ? "Paid" : normalized === "ACTIVE" ? "Active" : normalized}
    </span>
  )
}

/* ─ Helpers ─ */
const cardStyle = {
  background: "#070012",
  border: "0.43px solid rgba(157, 157, 157, 0.3)",
  borderRadius: 20, 
  padding: "24px",
}

const skeletonStyle = (w, h) => ({
  width: w,
  height: h,
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  animation: "pulse 1.5s ease-in-out infinite",
})

function buildActivityItems(billing) {
  const items = []

  if (billing?.subscription?.current_period_start) {
    items.push({
      icon: <ShieldCheck size={16} color="#4ade80" />,
      bg: "rgba(34,197,94,0.12)",
      title: "Plan Activated",
      desc: `${titleCase(billing?.current_plan || "Pro")} plan subscription started`,
      date: formatDate(billing?.subscription?.current_period_start),
    })
  }

  if (Array.isArray(billing?.payments)) {
    billing.payments.forEach(p => {
      items.push({
        icon: <FileText size={16} color="#f59e0b" />,
        bg: "rgba(245,158,11,0.12)",
        title: p.status === "PAID" || p.status === "captured" ? "Payment Received" : "Payment Attempt",
        desc: p.description || `${titleCase(billing?.current_plan || "Pro")} Plan Payment`,
        date: formatDate(p.date),
      })
    })
  }

  return items
}

function formatDate(value) {
  if (!value) return "N/A"
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "N/A"
  }
}

function formatAmount(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function titleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getFeatureIcon(feature) {
  const text = String(feature || "").toLowerCase()
  if (text.includes("reply") || text.includes("replies") || text.includes("unlimited")) {
    return <Infinity size={11} />
  }
  if (text.includes("workflow") || text.includes("automation") || text.includes("api")) {
    return <Zap size={11} />
  }
  if (text.includes("analytics") || text.includes("chart") || text.includes("reporting")) {
    return <BarChart3 size={11} />
  }
  return <Sparkles size={11} />
}
