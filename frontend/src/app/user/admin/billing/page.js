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
  ChevronDown,
  ChevronUp,
} from "lucide-react"

import { Poppins } from "next/font/google"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import HistoryModal from "@/components/common/HistoryModal"
import UsageSummaryCard from "@/components/common/UsageSummaryCard"
import { TABLE_PREVIEW_LIMIT, TRANSACTION_TYPES } from "@/lib/constants/billingConstants"
import {
  getActivityMeta,
  formatBillingDate,
  formatRelativeTime,
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
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false)

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
      const timer = setTimeout(() => {
        setError("Workspace not found. Please sign in again.")
        setLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }

    const loadBillingHistory = async () => {
      try {
        setLoading(true)
        setError("")

        const [billingData, pricingData, profileData, wccRes, flowQuotaRes] = await Promise.all([
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
          })),
          api.getWccBalance(workspaceId).catch(() => null),
          api.getFlowQuota(workspaceId).catch(() => null)
        ])

        if (billingData) {
          if (wccRes) {
            billingData.wcc_wallet_balance = parseFloat(wccRes.balance ?? wccRes.data?.balance ?? 0)
            billingData.wcc_fill_percentage = parseFloat(wccRes.fill_percentage ?? wccRes.data?.fill_percentage ?? 0)
            billingData.wcc_status = wccRes.status ?? wccRes.data?.status ?? null
          }
          if (flowQuotaRes) {
            billingData.flow_quota = flowQuotaRes
          }
        }

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

  const summaryData = useMemo(() => {
    const aiUsed = Number(billing?.cycle_used ?? billing?.credits_used ?? billing?.aiCredits?.used ?? 0)
    const aiTotal = Number(billing?.quota_limit ?? billing?.total_limit ?? billing?.aiCredits?.total ?? 0)
    const aiRemaining = Number(billing?.credits_balance ?? billing?.credits_remaining ?? billing?.aiCredits?.remaining ?? Math.max(0, aiTotal - aiUsed))
    const aiIncludedRemaining = Number(billing?.included_remaining ?? 0)
    const aiPurchasedRemaining = Number(billing?.purchased_remaining ?? 0)
    const aiLocked = Boolean(billing?.purchased_credits_locked)
    const aiStatusMessage = billing?.status_message || null

    const wccBalance = Number(billing?.wcc_wallet_balance ?? billing?.wccWallet?.balance ?? billing?.wcc_balance ?? 0)
    const wccCurrency = billing?.wccWallet?.currency || "₹"
    const wccFillPercentage = billing?.wcc_fill_percentage ?? billing?.wccWallet?.fillPercentage ?? null
    const wccStatus = billing?.wcc_status ?? billing?.wccWallet?.status ?? null

    const fq = billing?.flow_quota || billing?.flowQuota || {}
    const flowUsed = Number(fq?.used_quota ?? fq?.used ?? billing?.flows_used ?? 0)
    const flowTotal = Number(fq?.total_quota ?? fq?.total ?? billing?.flows_total ?? 0)
    const flowPlanQuota = Number(fq?.plan_quota ?? fq?.plan_base ?? 0)
    const flowPurchasedQuota = Number(fq?.purchased_quota ?? fq?.purchased ?? 0)
    const flowRemainingQuota = Number(fq?.remaining_quota ?? fq?.remaining ?? Math.max(0, flowTotal - flowUsed))

    return {
      aiCredits: {
        used: aiUsed,
        total: aiTotal,
        remaining: aiRemaining,
        credits_balance: aiRemaining,
        included_remaining: aiIncludedRemaining,
        purchased_remaining: aiPurchasedRemaining,
        locked: aiLocked,
        status_message: aiStatusMessage,
      },
      wccWallet: { balance: wccBalance, currency: wccCurrency, fillPercentage: wccFillPercentage, status: wccStatus },
      flowQuota: {
        used: flowUsed,
        total: flowTotal,
        plan_quota: flowPlanQuota,
        purchased_quota: flowPurchasedQuota,
        total_quota: flowTotal,
        used_quota: flowUsed,
        remaining_quota: flowRemainingQuota
      }
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
  const rawCycle = (billing?.subscription?.billing_cycle || billing?.billing_cycle || "").toLowerCase()
  const isFreePlan = (billing?.current_plan || "free").toLowerCase() === "free"
  const resolvedCycle = isFreePlan ? "—" : (rawCycle === "yearly" ? "Yearly" : "Monthly")

  const currentPlanPrice = useMemo(() => {
    if (!billing) return "—"
    const planKey = String(billing?.current_plan || "free").toLowerCase()
    if (planKey === "free") return "—"

    const cycle = rawCycle || "monthly"

    const dynamicPlans = billing?.plans || pricing?.plans || []
    if (Array.isArray(dynamicPlans) && dynamicPlans.length > 0) {
      const match = dynamicPlans.find(
        p => (p.name || p.key || p.id || "").toLowerCase() === planKey
      )
      if (match) {
        const rawPrice = cycle === "yearly" ? (match.yearly_price ?? match.yearlyPrice) : (match.monthly_price ?? match.monthlyPrice)
        if (rawPrice !== undefined && rawPrice !== null) {
          const num = Number(rawPrice)
          return isNaN(num) || num === 0 ? "—" : `₹${num.toLocaleString('en-IN')}`
        }
      }
    }

    if (pricing) {
      const legacyPrice = cycle === "yearly"
        ? pricing[`${planKey}_plan_yearly_price`] || pricing[`${planKey}_yearly_price`] || pricing.pro_plan_yearly_price
        : pricing[`${planKey}_plan_price`] || pricing[`${planKey}_price`] || pricing.pro_plan_price
      if (legacyPrice) return `₹${Number(legacyPrice).toLocaleString('en-IN')}`
    }

    return "—"
  }, [pricing, billing, rawCycle])

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
      const response = await api.requestRaw(`/billing/invoices/${targetId}/download`)
      if (!response.ok) throw new Error("Download failed")
      const contentType = response.headers.get("content-type")
      if (contentType && !contentType.includes("application/pdf") && !contentType.includes("octet-stream")) {
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
        icon: <ShieldCheck size={16} className="text-emerald-400" />,
        bg: "bg-emerald-500/15",
        title: "Plan Activated",
        desc: `${titleCase(billing?.current_plan || "Pro")} plan subscription started`,
        date: formatBillingDate(billing?.subscription?.current_period_start, true),
        relativeDate: formatRelativeTime(billing?.subscription?.current_period_start),
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
          bg: meta.bg || "bg-indigo-500/15",
          title: meta.title,
          desc: p.description || meta.desc,
          date: formatBillingDate(dVal, true),
          relativeDate: formatRelativeTime(dVal),
          rawTime,
        })
      })
    }

    items.sort((a, b) => b.rawTime - a.rawTime)
    return items
  }, [billing])

  return (
    <section className="min-h-screen bg-[#0d0d0f] text-white p-4 sm:p-6 md:p-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-bottom-5 duration-300">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Billing & Invoices</h1>
        <p className="text-xs sm:text-[13px] text-zinc-400 mt-1.5 leading-relaxed">
          Manage your subscription plans, track monthly usage, view invoices, and monitor account activity.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 sm:p-4 text-xs sm:text-[13px] text-red-300 mb-5">
          {error}
        </div>
      )}

      {/* Top Row: Current Plan + Plan Details + Billing Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Current Plan Card */}
        <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-400 mb-1.5 font-medium">Your current plan</p>
                {loading ? (
                  <div className="w-28 h-8 rounded-lg bg-white/10 animate-pulse my-1" />
                ) : (
                  <>
                    <h2 className="text-2xl font-bold tracking-tight text-white m-0">
                      {currentPlanLabel}
                    </h2>
                    <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
                      {isFreePlan ? "Free" : `${currentPlanPrice} / ${rawCycle === "yearly" ? "year" : "month"}`}
                    </p>
                  </>
                )}
              </div>
              {!loading && (
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                  Active
                </span>
              )}
            </div>

            {/* Feature Pills */}
            {!loading && activePlanFeatures.length > 0 && (
              <div className="my-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {(isFeaturesExpanded ? activePlanFeatures : activePlanFeatures.slice(0, 6)).map((feat, idx) => (
                    <span
                      key={`${feat}-${idx}`}
                      className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/25 text-purple-100 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    >
                      {getFeatureIcon(feat)} {feat}
                    </span>
                  ))}
                </div>

                {activePlanFeatures.length > 6 && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                      className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors bg-transparent border-none cursor-pointer p-0 select-none"
                    >
                      {isFeaturesExpanded ? (
                        <>
                          <span>Show less</span>
                          <ChevronUp size={13} />
                        </>
                      ) : (
                        <>
                          <span>+{activePlanFeatures.length - 6} more</span>
                          <ChevronDown size={13} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="w-28 h-9 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <a
                href="/user/admin/billing/payment"
                className="inline-block bg-[#814AC8] hover:bg-[#814AC8]/85 text-white rounded-lg px-5 py-2 text-[13px] font-semibold no-underline transition-opacity shadow-sm"
              >
                Upgrade plan
              </a>
            )}
          </div>
        </div>

        {/* Plan Details Card */}
        <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold text-white mb-2.5">Plan Details</p>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-8 rounded-lg bg-white/10 animate-pulse" />)}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {[
                  {
                    icon: <RefreshCw size={14} className="text-zinc-400" />,
                    label: "Billing Cycle",
                    value: resolvedCycle,
                  },
                  {
                    icon: <Calendar size={14} className="text-zinc-400" />,
                    label: "Next Billing Date",
                    value: formatBillingDate(billing?.subscription?.current_period_end || billing?.next_billing_date),
                  },
                  {
                    icon: <IndianRupee size={14} className="text-zinc-400" />,
                    label: "Amount",
                    value: currentPlanPrice || "—",
                  },
                  {
                    icon: <CreditCard size={14} className="text-zinc-400" />,
                    label: "Payment Method",
                    value: (() => {
                      const subMethod = billing?.subscription?.payment_method;
                      if (subMethod) {
                        return formatPaymentMethod(subMethod, billing?.subscription?.provider).label;
                      }
                      const subPayment = billing?.payments?.find(p => p.payment_type === 'subscription' && (p.status?.toUpperCase() === 'PAID' || p.status?.toUpperCase() === 'SUCCESS'));
                      if (subPayment?.payment_method) {
                        return formatPaymentMethod(subPayment.payment_method, subPayment.provider).label;
                      }
                      return "—";
                    })(),
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                        {row.icon}
                      </span>
                      <span className="text-zinc-400">{row.label}</span>
                    </div>
                    <span className="text-zinc-200 font-medium text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Billing Profile Card */}
        <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[15px] font-bold text-white m-0">Billing Profile</p>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Invoicing & Tax Details
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Business Name:</span>
                <span className="text-white font-semibold text-right truncate max-w-[170px]">{profile.billing_name || "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Contact:</span>
                <span className="text-white font-medium text-right truncate max-w-[170px]">{profile.billing_contact_name || "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 font-medium">Email:</span>
                <span className="text-white font-medium text-right truncate max-w-[170px]">{profile.billing_email || "—"}</span>
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
              className="text-xs px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Usage Summary + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Usage Summary */}
        {loading ? (
          <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-[15px] font-bold text-white m-0">Usage Summary</p>
                <p className="text-xs text-zinc-400 mt-1">Current billing cycle usage</p>
              </div>
              <span className="bg-purple-500/15 border border-purple-500/20 text-purple-200 rounded-full px-3 py-1 text-[11px] font-medium">
                This month
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              {[1, 2, 3].map(i => <div key={i} className="w-full h-11 rounded-lg bg-white/10 animate-pulse" />)}
            </div>
          </div>
        ) : (
          <UsageSummaryCard data={summaryData} />
        )}

        {/* Recent Account Activity */}
        <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <p className="text-[15px] font-bold text-white mb-4">Recent Account Activity</p>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-12 rounded-lg bg-white/10 animate-pulse" />)}
            </div>
          ) : (
            <div className="flex-1 max-h-[285px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10 custom-scrollbar">
              {activityItems.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-[13px] text-zinc-500">
                  No recent activity recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {activityItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-100 truncate m-0">{item.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate m-0 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span
                        title={item.date}
                        className="text-[11px] text-zinc-500 whitespace-nowrap ml-2 cursor-help flex-shrink-0"
                      >
                        {item.relativeDate || item.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment History Card */}
      <div className="bg-[#070012] border border-zinc-700/40 rounded-2xl p-4 sm:p-5">
        <div className="flex justify-between items-center mb-5">
          <p className="text-[15px] font-bold text-white m-0">Payment History</p>
        </div>

        {loading ? (
          <div className="w-full h-48 rounded-xl bg-white/10 animate-pulse" />
        ) : payments.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl py-12 px-6 text-center text-[13px] text-zinc-500">
            No payment history available yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#070012] scrollbar-thin scrollbar-thumb-white/10">
              <table className="w-full min-w-[700px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-white/[0.04]">
                    {["Invoice No", "Date", "Description", "GST", "Total", "Status", "Download"].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-zinc-400 font-semibold text-xs tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.slice(0, TABLE_PREVIEW_LIMIT).map((payment) => {
                    const meta = getActivityMeta(payment)
                    return (
                      <tr
                        key={payment.id || payment.payment_id || `${payment.amount}-${payment.date || "na"}`}
                        onClick={(e) => {
                          if (e.target.closest("button")) return
                          setSelectedInvoice(payment)
                        }}
                        className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                      >
                        <td className="p-4 text-white font-semibold font-mono">
                          {payment.invoice_number || "—"}
                        </td>
                        <td className="p-4 text-zinc-300">{formatBillingDate(payment.date, true)}</td>
                        <td className="p-4 text-zinc-300 font-medium">
                          {payment.description || meta.desc}
                        </td>
                        <td className="p-4 text-zinc-300">
                          {formatBillingAmount(payment.gst_amount || 0)}
                        </td>
                        <td className="p-4 text-white font-semibold">{formatBillingAmount(payment.amount)}</td>
                        <td className="p-4">
                          <StatusPill status={payment.status} />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={!payment.invoice_available}
                            title={payment.invoice_available ? "Download Invoice" : "Invoice Not Available"}
                            className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {downloadingId === payment.id ? <RefreshCw size={14} className="text-zinc-400 animate-spin" /> : <Download size={14} className="text-zinc-400" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* View All Invoices Button */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[13px] text-purple-400 hover:text-purple-300 bg-transparent border-none font-semibold cursor-pointer transition-colors"
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
              const meta = getActivityMeta(r) || {}
              return (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.badgeStyle?.color || meta.color || "#818cf8" }} />
                  <span className="font-medium text-white">{r.description || meta.desc || "Payment Transaction"}</span>
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

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <span className="text-zinc-500 block font-semibold text-[11px]">Transaction Description</span>
                <span className="text-white text-xs font-semibold block">{selectedInvoice.description}</span>
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

              {/* GST Toggle */}
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

function StatusPill({ status }) {
  const normalized = String(status || "pending").toUpperCase()
  const isSuccess = normalized === "PAID" || normalized === "ACTIVE" || normalized === "SUCCESS"
  const isFailed = normalized === "FAILED"

  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold inline-block border ${
        isSuccess
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          : isFailed
          ? "bg-red-500/15 border-red-500/30 text-red-400"
          : "bg-amber-500/15 border-amber-500/30 text-amber-400"
      }`}
    >
      {normalized === "PAID" || normalized === "SUCCESS" ? "Paid" : normalized === "ACTIVE" ? "Active" : normalized}
    </span>
  )
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