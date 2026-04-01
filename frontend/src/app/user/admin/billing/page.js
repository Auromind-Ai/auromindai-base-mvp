"use client"

import { useEffect, useMemo, useState } from "react"
import { CreditCard, Receipt, Sparkles } from "lucide-react"

import api from "@/lib/api"
import { getWorkspaceIdFromToken } from "@/lib/auth"

export default function BillingHistoryPage() {
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const id = getWorkspaceIdFromToken() || sessionStorage.getItem("workspace_id")

    if (!id) {
      setError("Workspace not found. Please sign in again.")
      setLoading(false)
      return
    }

    const loadBillingHistory = async () => {
      try {
        setLoading(true)
        setError("")

        const data = await api.getBillingStatus(id)
        console.log("[BILLING HISTORY] Fetched billing data:", data)
        setBilling(data)
      } catch (fetchError) {
        console.error("[BILLING HISTORY] Unable to load billing data:", fetchError)
        setError(fetchError.message || "Unable to load billing history")
        setBilling(null)
      } finally {
        setLoading(false)
      }
    }

    loadBillingHistory()
  }, [])

  const usage = useMemo(() => {
    const used = Number(billing?.credits_used ?? 0) 
    const total = Number(billing?.total_limit ?? 0) 
    const remaining = Number(
      billing?.credits_remaining ?? Math.max(total - used, 0)
    )
    
    // Calculate percentage based on credits
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

  return (
    <section className="min-h-screen bg-[#09090b] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_24%),linear-gradient(180deg,rgba(24,24,27,0.94),rgba(9,9,11,0.98))] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_28%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.3em] text-zinc-400">
              <Sparkles size={14} />
              Billing History
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Usage and payments
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Review your current plan, credit consumption, and recent billing activity in one place.
            </p>
          </div>
        </header>

        {error ? (
          <section className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">
            {error}
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-8">
            <div className="flex items-center gap-3 text-zinc-200">
              <CreditCard size={18} className="text-cyan-300" />
              <h2 className="text-lg font-semibold">Current Plan Summary</h2>
            </div>

            {loading ? (
              <div className="mt-6 h-36 animate-pulse rounded-[1.5rem] bg-white/[0.05]" />
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Plan</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{currentPlanLabel}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                      {usage.used} / {usage.total} credits used
                    </div>
                    <a
                      href="/user/admin/billing/payment"
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                    >
                      Upgrade Plan
                    </a>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
                    <span>Usage progress</span>
                    <span>{usage.percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 transition-all duration-500"
                      style={{ width: `${usage.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <UsageCard usage={usage} loading={loading} />
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="flex items-center gap-3 text-zinc-200">
            <Receipt size={18} className="text-cyan-300" />
            <h2 className="text-lg font-semibold">Payment History</h2>
          </div>
          <PaymentTable payments={payments} loading={loading} />
        </section>
      </div>
    </section>
  )
}

function UsageCard({ usage, loading }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)] sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-100">Usage</h2>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[1.25rem] bg-white/[0.05]" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          <UsageStat label="Credits used" value={usage.used} tone="text-white" />
          <UsageStat label="Remaining credits" value={usage.remaining} tone="text-emerald-300" />
          <UsageStat label="Percentage used" value={`${usage.percent.toFixed(1)}%`} tone="text-cyan-300" />
        </div>
      )}
    </section>
  )
}

function UsageStat({ label, value, tone }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function PaymentTable({ payments, loading }) {
  if (loading) {
    return <div className="mt-6 h-64 animate-pulse rounded-[1.5rem] bg-white/[0.05]" />
  }

  if (!payments.length) {
    return (
      <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-zinc-400">
        No payment history available yet.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/[0.03] text-left text-zinc-400">
            <tr>
              <th className="px-4 py-4 font-medium">Date</th>
              <th className="px-4 py-4 font-medium">Amount</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[rgba(9,9,11,0.7)]">
            {payments.map((payment) => (
              <tr key={payment.id || payment.payment_id || `${payment.amount}-${payment.date || "na"}`}>
                <td className="px-4 py-4 text-zinc-300">{formatDate(payment.date)}</td>
                <td className="px-4 py-4 font-medium text-white">{formatAmount(payment.amount)}</td>
                <td className="px-4 py-4">
                  <StatusPill status={payment.status} />
                </td>
                <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                  {payment.payment_id || "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const normalized = String(status || "pending").toUpperCase()
  const tone =
    normalized === "PAID" || normalized === "ACTIVE"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : normalized === "FAILED"
        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
        : "border-amber-400/20 bg-amber-500/10 text-amber-200"

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {normalized}
    </span>
  )
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
