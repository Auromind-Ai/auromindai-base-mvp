"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Zap,
  Wallet,
  Workflow,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"

import api from "@/lib/api"

export default function BillingDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true)
        const res = await api.getPlatformBilling()
        setData(res)
        setError(null)
      } catch (err) {
        setError(err.message || "Failed to load billing metrics")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBilling()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 border-r-2 border-indigo-500/20 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm font-medium">Connecting to billing engine...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8">
        <div className="max-w-7xl mx-auto bg-red-950/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-red-400 font-semibold mb-2">
            <AlertTriangle size={20} />
            <h2>Billing Dashboard Error</h2>
          </div>
          <p className="text-sm text-gray-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold hover:bg-red-600/30 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  const rev = data?.revenue_overview || {}
  const subs = data?.subscriptions_summary || {}
  const ai = data?.ai_credits || {}
  const wcc = data?.wcc || {}
  const flows = data?.flow_packs || {}
  const diag = data?.diagnostics_summary || {}
  const gateways = data?.gateways || {}
  const recentTx = data?.recent_transactions || []

  return (
    <div className="min-h-screen bg-[#070709] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Platform Billing Command
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Unified real-time telemetry across Subscriptions, AI Credits, WCC Wallets, Flow Packs & Gateway Health
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/billing-operations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <Activity size={15} />
              <span>Billing Console & Operations</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* System Diagnostics Warning Banner if anomalies detected */}
        {diag.has_warnings && (
          <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-400 w-5 h-5 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-white">Attention Required: </span>
                {diag.failed_webhooks > 0 && `${diag.failed_webhooks} unprocessed webhooks. `}
                {diag.pending_recharges > 0 && `${diag.pending_recharges} pending recharges stuck >1hr.`}
              </div>
            </div>
            <Link
              href="/admin/billing-operations?tab=diagnostics"
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold tracking-wide transition"
            >
              Run Diagnostic Repair
            </Link>
          </div>
        )}

        {/* 1. Revenue Overview (4 Primary KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            title="Total Platform Revenue"
            value={formatCurrency(rev.total_revenue)}
            subtext={`Subs: ${formatCurrency(rev.subscription_revenue)} | AI Packs: ${formatCurrency(rev.ai_credit_pack_revenue)} | WCC: ${formatCurrency(rev.wcc_recharge_revenue)} | Flow: ${formatCurrency(rev.flow_pack_revenue)}`}
            icon={DollarSign}
            accentColor="from-emerald-500/20 to-teal-500/5"
            borderColor="border-emerald-500/30"
            iconColor="text-emerald-400"
          />

          <KpiCard
            title="Monthly Recurring Revenue (MRR)"
            value={formatCurrency(rev.monthly_recurring_revenue)}
            subtext="Normalized monthly subscription run rate"
            icon={TrendingUp}
            accentColor="from-indigo-500/20 to-purple-500/5"
            borderColor="border-indigo-500/30"
            iconColor="text-indigo-400"
          />

          <KpiCard
            title="Annual Recurring Revenue (ARR)"
            value={formatCurrency(rev.annual_recurring_revenue)}
            subtext="Annualized recurring subscription velocity"
            icon={Activity}
            accentColor="from-purple-500/20 to-pink-500/5"
            borderColor="border-purple-500/30"
            iconColor="text-purple-400"
          />

          <KpiCard
            title="Today's Total Collection"
            value={formatCurrency(rev.todays_revenue)}
            subtext="Gross billing captured in last 24 hours"
            icon={Zap}
            accentColor="from-amber-500/20 to-orange-500/5"
            borderColor="border-amber-500/30"
            iconColor="text-amber-400"
          />
        </div>

        {/* 2. Multi-Product Revenue & Usage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Subscriptions Card */}
          <SectionCard title="Subscription Matrix" icon={CreditCard}>
            <div className="space-y-3 mt-4">
              <StatRow label="Active Accounts" value={subs.active} badge="bg-emerald-500/20 text-emerald-300" />
              <StatRow label="Pending Checkouts" value={subs.pending || 0} badge="bg-amber-500/20 text-amber-300" />
              <StatRow label="Expired Accounts" value={subs.expired} badge="bg-red-500/20 text-red-300" />
              <StatRow label="Cancelled Accounts" value={subs.cancelled} badge="bg-gray-500/20 text-gray-400" />

              <div className="pt-3 border-t border-white/5">
                <p className="text-[11px] font-semibold text-gray-400 mb-2">Plan Distribution</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(subs.plan_breakdown || {}).map(([planName, cnt]) => (
                    <span key={planName} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 font-mono">
                      {planName.toUpperCase()}: {cnt}
                    </span>
                  ))}
                  {Object.keys(subs.plan_breakdown || {}).length === 0 && (
                    <span className="text-[11px] text-gray-500">No active plan records</span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* AI Credit Ledger Card */}
          <SectionCard title="AI Credit Engine" icon={Zap}>
            <div className="space-y-3 mt-4">
              <StatRow label="Credits Purchased" value={formatNumber(ai.credits_purchased)} />
              <StatRow label="Credits Issued (Plan)" value={formatNumber(ai.credits_issued)} />
              <StatRow label="Credits Consumed" value={formatNumber(ai.credits_consumed)} highlight />
              <StatRow label="Net Active Balance" value={formatNumber(ai.net_credit_balance)} badge="bg-indigo-500/20 text-indigo-300" />
            </div>
          </SectionCard>

          {/* WhatsApp Credits (WCC) Card */}
          <SectionCard title="WhatsApp Credits (WCC)" icon={Wallet}>
            <div className="space-y-3 mt-4">
              <StatRow label="Wallet Funds Balance" value={formatCurrency(wcc.wallet_balance)} badge="bg-teal-500/20 text-teal-300" />
              <StatRow label="Gross Recharge Revenue" value={formatCurrency(wcc.recharge_revenue)} />
              <StatRow label="Session Usage Debits" value={formatCurrency(wcc.session_debits)} />
              <div className="pt-3 border-t border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Margin & Rates Config</span>
                <Link href="/admin/billing-operations?tab=rate-cards" className="text-indigo-400 hover:underline">
                  Rate Cards &rarr;
                </Link>
              </div>
            </div>
          </SectionCard>

          {/* Flow Packs Card */}
          <SectionCard title="Workflow Flow Packs" icon={Workflow}>
            <div className="space-y-3 mt-4">
              <StatRow label="Total Pack Sales" value={flows.sales_count} />
              <StatRow label="Flow Pack Revenue" value={formatCurrency(flows.revenue)} badge="bg-purple-500/20 text-purple-300" />

              <div className="pt-3 border-t border-white/5">
                <p className="text-[11px] font-semibold text-gray-400 mb-2">Top Packs Sold</p>
                {flows.top_packs && flows.top_packs.length > 0 ? (
                  <div className="space-y-1.5">
                    {flows.top_packs.map((p) => (
                      <div key={p.name} className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-300 truncate max-w-[120px]">{p.name}</span>
                        <span className="text-gray-400 font-mono">{p.sales} sales ({formatCurrency(p.revenue)})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-500">No flow pack purchases yet</span>
                )}
              </div>
            </div>
          </SectionCard>

        </div>

        {/* 3. Gateway Health & Transaction Risk */}
        <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" size={18} />
              <span>Payment Gateway Engine Telemetry</span>
            </h2>
            <span className="text-xs text-gray-500">Razorpay & PayU Dual-Gateway System</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["razorpay", "payu"].map((provKey) => {
              const g = gateways[provKey] || { success_count: 0, failed_count: 0, pending_count: 0, success_amount: 0 }
              const totalAttempts = g.success_count + g.failed_count + g.pending_count
              const successRate = totalAttempts > 0 ? ((g.success_count / totalAttempts) * 100).toFixed(1) : "100.0"

              return (
                <div key={provKey} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white uppercase">{provKey}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {successRate}% Success Rate
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Volume: <span className="text-white font-semibold">{formatCurrency(g.success_amount)}</span> ({g.success_count} paid transactions)
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div className="text-center">
                      <span className="text-emerald-400 font-bold block">{g.success_count}</span>
                      <span className="text-[10px] text-gray-500">Paid</span>
                    </div>
                    <div className="text-center">
                      <span className="text-amber-400 font-bold block">{g.pending_count}</span>
                      <span className="text-[10px] text-gray-500">Pending</span>
                    </div>
                    <div className="text-center">
                      <span className="text-red-400 font-bold block">{g.failed_count}</span>
                      <span className="text-[10px] text-gray-500">Failed</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. Live Unified Transaction Stream */}
        <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="text-indigo-400" size={18} />
                <span>Recent Platform Payment Stream</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time payments processed across subscriptions and top-ups</p>
            </div>
            <Link
              href="/admin/billing-operations?tab=payments"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>Payment Console</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentTx.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">Workspace</th>
                    <th className="py-3 px-4 font-semibold">Payment ID</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Provider</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-semibold text-white">{tx.workspace_name}</td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{tx.payment_id}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">{formatCurrency(tx.amount)}</td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {tx.provider || "razorpay"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="py-3.5 px-4 text-gray-400">
                        {tx.date ? new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-gray-500 text-xs">
              No recent payment transactions recorded.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* Helper Components */

function KpiCard({ title, value, subtext, icon: Icon, accentColor, borderColor, iconColor }) {
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${accentColor} border ${borderColor} backdrop-blur-xl relative overflow-hidden transition-all hover:scale-[1.01]`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-gray-300">{title}</span>
        <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center ${iconColor}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-gray-400 mt-2 truncate">{subtext}</p>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/[0.06] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Icon size={16} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatRow({ label, value, badge, highlight }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className={`${highlight ? "text-indigo-300 font-semibold" : "text-gray-400"}`}>{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${badge}`}>
          {value}
        </span>
      ) : (
        <span className="font-semibold text-white font-mono">{value}</span>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const norm = String(status || "PENDING").toUpperCase()
  if (norm === "PAID" || norm === "SUCCESS" || norm === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={10} /> Paid
      </span>
    )
  }
  if (norm === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle size={10} /> Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={10} /> Pending
    </span>
  )
}

function formatCurrency(val) {
  const num = Number(val || 0)
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(val) {
  const num = Number(val || 0)
  return num.toLocaleString("en-IN")
}
