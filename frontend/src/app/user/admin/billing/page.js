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
  X,
} from "lucide-react"

import { Poppins } from "next/font/google"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import HistoryModal from "@/components/common/HistoryModal"
import { TABLE_PREVIEW_LIMIT, TRANSACTION_TYPES } from "@/lib/constants/billingConstants"
import {
  getActivityMeta,
  formatBillingDate,
  formatBillingAmount,
  formatPaymentMethod,
} from "@/lib/utils/activityMapper"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
})

export default function BillingHistoryPage() {
  const { workspaceId } = useAuth()
  const [billing, setBilling] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  // Billing Profile States
  const [profile, setProfile] = useState({
    billing_name: "",
    billing_contact_name: "",
    billing_email: "",
    billing_phone: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_country: "IN",
    billing_postal_code: "",
    has_gst_registration: false,
    billing_gstin: "",
    legal_business_name: "",
    business_type: ""
  })
  const [editProfile, setEditProfile] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

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

        const [billingData, pricingData, profileData] = await Promise.all([
          api.getBillingStatus(workspaceId),
          api.getPricing(),
          api.getWorkspaceBillingProfile(workspaceId).catch(() => ({
            billing_name: "",
            billing_contact_name: "",
            billing_email: "",
            billing_phone: "",
            billing_address: "",
            billing_city: "",
            billing_state: "",
            billing_country: "IN",
            billing_postal_code: "",
            has_gst_registration: false,
            billing_gstin: "",
            legal_business_name: "",
            business_type: ""
          }))
        ])

        setBilling(billingData)
        setPricing(pricingData)
        setProfile(profileData)
      } catch (fetchError) {
        console.error("[BILLING HISTORY] Unable to load billing data:", fetchError)
        setError(fetchError.message || "Unable to load billing history")
        setBilling(null)
      } finally {
        setLoading(false)
      }
    }

    loadBillingHistory()
  }, [workspaceId])

  const usage = useMemo(() => {
    const used = Number(billing?.credits_used ?? 0)
    const total = Number(billing?.total_limit ?? 0)
    const remaining = Number(
      billing?.credits_remaining ?? Math.max(total - used, 0)
    )
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0

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
          payment_type: "subscription",
          description: "Pro Plan Subscription",
          invoice_available: false,
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

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleDownloadInvoice = async (payment) => {
    if (!payment.invoice_available) {
      triggerToast("ℹ️ Invoice document is pending or unavailable for this payment.")
      return
    }
    const targetId = payment.invoice_id || payment.id
    setDownloadingId(payment.id)
    triggerToast("📄 Downloading invoice...")
    try {
      const response = await fetch(`/api/billing/invoices/${targetId}/download`)
      if (!response.ok) throw new Error("Download failed")
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/pdf")) {
        throw new Error("Invalid PDF response")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const safeFileName = (payment.invoice_number || payment.id).replace(/[/\\]/g, "-")
      link.download = `${safeFileName}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      triggerToast("✅ Invoice downloaded successfully!")
    } catch (err) {
      triggerToast("❌ Failed to download invoice. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  const [formProfile, setFormProfile] = useState(null)
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const handleOpenEditModal = () => {
    setFormProfile({ ...profile })
    setIsEditProfileModalOpen(true)
    setShowUnsavedConfirm(false)
  }

  const isFormDirty = () => {
    if (!formProfile || !profile) return false
    return JSON.stringify(formProfile) !== JSON.stringify(profile)
  }

  const handleAttemptCloseModal = () => {
    if (isFormDirty()) {
      setShowUnsavedConfirm(true)
    } else {
      setIsEditProfileModalOpen(false)
      setShowUnsavedConfirm(false)
    }
  }

  const handleConfirmDiscard = () => {
    setShowUnsavedConfirm(false)
    setIsEditProfileModalOpen(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setProfileLoading(true)
      const res = await api.updateWorkspaceBillingProfile(workspaceId, formProfile)
      setProfile(res)
      setIsEditProfileModalOpen(false)
      setShowUnsavedConfirm(false)
      triggerToast("✅ Billing profile updated successfully!")
    } catch (err) {
      triggerToast(`❌ Error: ${err.message || "Failed to update profile"}`)
    } finally {
      setProfileLoading(false)
    }
  }

  const activityItems = useMemo(() => {
    const items = []

    if (billing?.subscription?.current_period_start) {
      const subDate = new Date(billing.subscription.current_period_start)
      items.push({
        icon: <ShieldCheck size={16} color="#4ade80" />,
        bg: "rgba(34,197,94,0.12)",
        title: "Plan Activated",
        desc: `${titleCase(billing?.current_plan || "Pro")} plan subscription started`,
        date: formatBillingDate(billing?.subscription?.current_period_start, true),
        rawTime: !isNaN(subDate.getTime()) ? subDate.getTime() : 0,
      })
    }

    if (Array.isArray(billing?.payments)) {
      billing.payments.forEach(p => {
        const meta = getActivityMeta(p)
        const dVal = p.date || p.created_at
        const pDate = dVal ? new Date(dVal) : null
        const rawTime = pDate && !isNaN(pDate.getTime()) ? pDate.getTime() : 0
        items.push({
          icon: meta.icon,
          bg: meta.bg,
          title: meta.title,
          desc: p.description || meta.desc,
          date: formatBillingDate(dVal, true),
          rawTime,
        })
      })
    }

    // Sort all activity records in descending order by full timestamp (latest first)
    items.sort((a, b) => b.rawTime - a.rawTime)

    return items
  }, [billing])

  return (
    <section className="min-h-screen bg-[#0d0d0f] text-white p-4 sm:p-6 md:p-8" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>Billing & Invoices</h1>
        <p style={{ fontSize: 13, color: "#cdd1da", marginTop: 6 }}>
          Manage your subscription plans, track monthly usage, view invoices, and monitor account activity.
        </p>
      </div>

      {error && (
        <div style={{ borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", padding: "14px 18px", fontSize: 13, color: "#fca5a5", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Top Row: Current Plan + Plan Details + Billing Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Current Plan Card */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, fontWeight: 500 }}>Your current plan</p>
              {loading ? (
                <div style={skeletonStyle(120, 32)} />
              ) : (
                <>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px 0", letterSpacing: "-0.5px", color: "#fff" }}>
                    {currentPlanLabel}
                  </h2>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                    {currentPlanPrice} / month
                  </p>
                </>
              )}
            </div>
            {!loading && (
              <span style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#f5faf7", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                Active
              </span>
            )}
          </div>

          {/* Feature Pills */}
          {!loading && activePlanFeatures.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, marginBottom: 14 }}>
              {activePlanFeatures.map((feat, idx) => (
                <span key={`${feat}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", color: "#f1eff7", borderRadius: 16, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
                  {getFeatureIcon(feat)} {feat}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 26 }}>
            {loading ? (
              <div style={skeletonStyle(120, 34)} />
            ) : (
              <a
                href="/user/admin/billing/payment"
                style={{
                  display: "inline-block",
                  background: "#814AC8",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Upgrade plan
              </a>
            )}
          </div>
        </div>

        {/* Plan Details Card */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Plan Details</p>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4].map(i => <div key={i} style={skeletonStyle("100%", 34)} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                {
                  icon: <RefreshCw size={14} color="#9ca3af" />,
                  label: "Billing Cycle",
                  value: billing?.subscription?.billing_cycle || billing?.billing_cycle || "Monthly",
                },
                {
                  icon: <Calendar size={14} color="#9ca3af" />,
                  label: "Next Billing Date",
                  value: formatBillingDate(billing?.subscription?.current_period_end || billing?.next_billing_date),
                },
                {
                  icon: <IndianRupee size={14} color="#9ca3af" />,
                  label: "Amount",
                  value: currentPlanPrice || "—",
                },
                {
                  icon: <CreditCard size={14} color="#9ca3af" />,
                  label: "Payment Method",
                  value: billing?.payments && billing.payments.length > 0 && billing.payments[0].payment_method
                    ? formatPaymentMethod(billing.payments[0].payment_method, billing.payments[0].provider).label
                    : "—",
                },
              ].map((row, idx, arr) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

        {/* Billing Profile Card - Default Compact Summary View */}
        <div style={cardStyle} className="relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Billing Profile</p>
                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, lineHeight: "1.4" }}>
                  Invoicing & Tax Details
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Business Name:</span>
                <span className="text-white font-semibold text-right truncate max-w-[180px]">{profile.billing_name || "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Contact:</span>
                <span className="text-white font-medium text-right truncate max-w-[180px]">{profile.billing_contact_name || "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Email:</span>
                <span className="text-white font-medium text-right truncate max-w-[180px]">{profile.billing_email || "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">GST:</span>
                {profile.has_gst_registration && profile.billing_gstin ? (
                  <span className="text-emerald-400 font-semibold font-mono text-[11px] text-right">
                    Registered ✓
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium text-right">Not Registered</span>
                )}
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">State:</span>
                <span className="text-white font-medium text-right">{profile.billing_state || "—"}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-zinc-400 font-medium">Country:</span>
                <span className="text-white font-semibold uppercase text-right">{profile.billing_country || "India"}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/[0.06] flex justify-end">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="text-xs px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold rounded-lg transition cursor-pointer"
            >
              Edit Profile
            </button>
          </div>
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
                barColor="linear-gradient(90deg, #cfcbcb, #bdbdbd)"
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
              {activityItems.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "24px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
                  No recent activity recorded yet.
                </div>
              ) : (
                activityItems.slice(0, TABLE_PREVIEW_LIMIT).map((item, idx, arr) => (
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

      {/* Payment History Card (Preview top 4 records) */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Payment History</p>
        </div>

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
                    {["Invoice No", "Date", "Description", "GST", "Total", "Status", "Download"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, TABLE_PREVIEW_LIMIT).map((payment) => {
                    const meta = getActivityMeta(payment)
                    return (
                      <tr
                        key={payment.id || payment.payment_id || `${payment.amount}-${payment.date || "na"}`}
                        onClick={(e) => {
                          if (e.target.closest("button")) return
                          setSelectedInvoice(payment)
                        }}
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px", color: "#fff", fontWeight: 600, fontFamily: "monospace" }}>
                          {payment.invoice_number || "—"}
                        </td>
                        <td style={{ padding: "16px", color: "#d1d5db" }}>{formatBillingDate(payment.date, true)}</td>
                        <td style={{ padding: "16px", color: "#d1d5db", fontWeight: 500 }}>
                          {payment.description || meta.desc}
                        </td>
                        <td style={{ padding: "16px", color: "#d1d5db" }}>
                          {formatBillingAmount(payment.gst_amount || 0)}
                        </td>
                        <td style={{ padding: "16px", color: "#fff", fontWeight: 600 }}>{formatBillingAmount(payment.amount)}</td>
                        <td style={{ padding: "16px" }}>
                          <StatusPill status={payment.status} />
                        </td>
                        <td style={{ padding: "16px" }}>
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={!payment.invoice_available}
                            title={payment.invoice_available ? "Download Invoice" : "Invoice Not Available"}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: payment.invoice_available ? "pointer" : "not-allowed",
                              opacity: payment.invoice_available ? 1 : 0.4,
                              transition: "background 0.15s"
                            }}
                          >
                            {downloadingId === payment.id ? <RefreshCw size={14} color="#9ca3af" className="animate-spin" /> : <Download size={14} color="#9ca3af" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* View All Invoices Button -> Opens HistoryModal */}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8b5cf6", background: "transparent", border: "none", fontWeight: 600, cursor: "pointer" }}
              >
                View all invoices <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Universal Paginated History Modal */}
      <HistoryModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="All Invoices & Payments"
        subtitle="Search, filter, and download invoices across your complete billing history."
        filterOptions={Object.values(TRANSACTION_TYPES).filter(t => t.key !== "all")}
        emptyStateText="No invoices found"
        emptyStateSubtext="You don't have any billing invoice transactions matching your query."
        onRowClick={(row) => setSelectedInvoice(row)}
        fetchDataFn={({ page, limit, search, type, sort }) =>
          api.getInvoices(workspaceId, { page, limit, search, type, sort })
        }
        columns={[
          {
            key: "invoice_number",
            label: "Invoice No",
            render: (r) => <span className="font-mono text-white font-semibold">{r.invoice_number || "—"}</span>
          },
          {
            key: "date",
            label: "Date",
            render: (r) => <span className="text-zinc-300">{formatBillingDate(r.date, true)}</span>
          },
          {
            key: "description",
            label: "Description",
            render: (r) => {
              const meta = getActivityMeta(r)
              return (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.badgeStyle.color }} />
                  <span className="font-medium text-white">{r.description || meta.desc}</span>
                </div>
              )
            }
          },
          {
            key: "gst",
            label: "GST",
            render: (r) => <span className="text-zinc-400 font-medium">{formatBillingAmount(r.gst_amount || 0)}</span>
          },
          {
            key: "amount",
            label: "Total",
            render: (r) => <span className="font-bold text-white">{formatBillingAmount(r.amount)}</span>
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusPill status={r.status} />
          },
          {
            key: "invoice",
            label: "Download",
            render: (r) => (
              <button
                type="button"
                disabled={!r.invoice_available}
                onClick={() => handleDownloadInvoice(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
                title={r.invoice_available ? "Download Invoice PDF" : "Invoice Not Available"}
              >
                <Download size={13} />
                <span>{r.invoice_available ? "Download" : "Pending"}</span>
              </button>
            )
          }
        ]}
      />

      {/* Selected Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b031a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Invoice Details</h3>
                <p className="text-lg font-bold text-white mt-1 font-mono">{selectedInvoice.invoice_number || "Draft / Pending"}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500 block mb-0.5 font-semibold">Date & Time</span>
                  <span className="text-zinc-200 font-medium">{formatBillingDate(selectedInvoice.date, true)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5 font-semibold">Status</span>
                  <span className="inline-block mt-0.5"><StatusPill status={selectedInvoice.status} /></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-zinc-500 block mb-0.5 font-semibold">Payment / Ref ID</span>
                  <span className="text-zinc-300 font-mono font-medium">{selectedInvoice.payment_id || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5 font-semibold">Product Type</span>
                  <span className="text-zinc-300 font-medium capitalize">{selectedInvoice.payment_type?.replace(/_/g, " ")}</span>
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <span className="text-zinc-500 block font-semibold">Transaction Description</span>
                <span className="text-white text-[13px] font-semibold block">{selectedInvoice.description}</span>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2.5">
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>Subtotal (Taxable Value):</span>
                  <span className="font-mono font-medium">{formatBillingAmount(selectedInvoice.taxable_amount || (selectedInvoice.amount - (selectedInvoice.gst_amount || 0)))}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>GST (18%):</span>
                  <span className="font-mono font-medium">{formatBillingAmount(selectedInvoice.gst_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-white text-sm font-bold border-t border-white/10 pt-2.5">
                  <span>Grand Total:</span>
                  <span className="font-mono font-bold text-emerald-400">{formatBillingAmount(selectedInvoice.total_amount || selectedInvoice.amount)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-5 bg-white/[0.02] border-t border-white/5 gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="w-1/2 py-2.5 text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedInvoice.invoice_available}
                onClick={() => {
                  handleDownloadInvoice(selectedInvoice)
                  setSelectedInvoice(null)
                }}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition flex justify-center items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Billing Profile Modal */}
      {isEditProfileModalOpen && formProfile && (
        <div
          onClick={handleAttemptCloseModal}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b031a] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Edit Billing Profile</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Configure invoicing and optional GST registration details.</p>
              </div>
              <button
                type="button"
                onClick={handleAttemptCloseModal}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formProfile.billing_name || ""}
                  onChange={(e) => setFormProfile({ ...formProfile, billing_name: e.target.value })}
                  placeholder="e.g. ABC Technologies"
                  className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formProfile.billing_contact_name || ""}
                    onChange={(e) => setFormProfile({ ...formProfile, billing_contact_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formProfile.billing_email || ""}
                    onChange={(e) => setFormProfile({ ...formProfile, billing_email: e.target.value })}
                    placeholder="billing@abctech.com"
                    className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={formProfile.billing_phone || ""}
                  onChange={(e) => setFormProfile({ ...formProfile, billing_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formProfile.billing_address || ""}
                  onChange={(e) => setFormProfile({ ...formProfile, billing_address: e.target.value })}
                  placeholder="Street address..."
                  className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-300 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formProfile.billing_city || ""}
                    onChange={(e) => setFormProfile({ ...formProfile, billing_city: e.target.value })}
                    placeholder="Chennai"
                    className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-300 font-semibold mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formProfile.billing_state || ""}
                    onChange={(e) => setFormProfile({ ...formProfile, billing_state: e.target.value })}
                    placeholder="Tamil Nadu"
                    className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={formProfile.billing_country || "IN"}
                    onChange={(e) => setFormProfile({ ...formProfile, billing_country: e.target.value })}
                    className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-300 font-semibold mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formProfile.billing_postal_code || ""}
                  onChange={(e) => setFormProfile({ ...formProfile, billing_postal_code: e.target.value })}
                  placeholder="600001"
                  className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Optional Section: GST Registration Toggle */}
              <div className="pt-3 border-t border-white/10 mt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={formProfile.has_gst_registration || false}
                    onChange={(e) => setFormProfile({
                      ...formProfile,
                      has_gst_registration: e.target.checked,
                      billing_gstin: e.target.checked ? formProfile.billing_gstin : ""
                    })}
                    className="w-4 h-4 rounded border-white/20 bg-[#070012] text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-indigo-300">I have a GST Registration</span>
                </label>

                {formProfile.has_gst_registration && (
                  <div className="mt-3 p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] text-zinc-300 font-semibold mb-1">GSTIN *</label>
                      <input
                        type="text"
                        required={formProfile.has_gst_registration}
                        value={formProfile.billing_gstin || ""}
                        onChange={(e) => setFormProfile({ ...formProfile, billing_gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 33ABCDE1234F1Z5"
                        className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Legal Business Name (optional if different)</label>
                      <input
                        type="text"
                        value={formProfile.legal_business_name || ""}
                        onChange={(e) => setFormProfile({ ...formProfile, legal_business_name: e.target.value })}
                        placeholder="e.g. ABC Technologies Pvt Ltd"
                        className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Business Type (optional)</label>
                      <select
                        value={formProfile.business_type || ""}
                        onChange={(e) => setFormProfile({ ...formProfile, business_type: e.target.value })}
                        className="w-full bg-[#070012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="">Select type (optional)...</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="LLP">LLP</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Individual">Individual</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleAttemptCloseModal}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl disabled:opacity-50 transition shadow-lg cursor-pointer"
                >
                  {profileLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0f0720] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Unsaved Changes</h4>
              <p className="text-xs text-zinc-400">You have unsaved changes in your Billing Profile. Do you want to continue editing or discard your changes?</p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="text-xs px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-zinc-300 font-semibold cursor-pointer"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="text-xs px-3.5 py-2 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold cursor-pointer transition"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
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
    normalized === "PAID" || normalized === "ACTIVE" || normalized === "SUCCESS"
      ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }
      : normalized === "FAILED"
      ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }
      : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }

  return (
    <span style={{ ...style, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, display: "inline-block" }}>
      {normalized === "PAID" || normalized === "SUCCESS" ? "Paid" : normalized === "ACTIVE" ? "Active" : normalized}
    </span>
  )
}

/* ─ Helpers ─ */
const cardStyle = {
  background: "#070012",
  border: "0.43px solid rgba(157, 157, 157, 0.3)",
  borderRadius: 16, 
  padding: "16px 20px",
}

const skeletonStyle = (w, h) => ({
  width: w,
  height: h,
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  animation: "pulse 1.5s ease-in-out infinite",
})

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
