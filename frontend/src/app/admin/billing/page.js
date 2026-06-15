"use client"

import { useState, useEffect } from "react"
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react"

export default function BillingPage() {
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/billing")
        if (!response.ok) throw new Error("Failed to fetch billing data")
        const data = await response.json()
        setBilling(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        setBilling(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBilling()
  }, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Billing</h1>
          <p className="text-gray-400">Manage billing, subscriptions, and payments</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading billing data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && billing && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <BillingCard
                icon={DollarSign}
                label="Total Revenue"
                value={`₹${(billing.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change="+18%"
              />
              <BillingCard
                icon={CreditCard}
                label="Active Subscriptions"
                value={billing.active_subscriptions || 0}
                change="+5%"
              />
              <BillingCard
                icon={TrendingUp}
                label="MRR"
                value={`₹${(billing.monthly_recurring_revenue || 0).toLocaleString('en-IN')}`}
                change="+12%"
              />
              <BillingCard
                icon={AlertCircle}
                label="Pending Invoices"
                value={billing.pending_invoices || 0}
                change="-2%"
              />
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Summary */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Revenue Summary</h2>
                <div className="space-y-4">
                  <BillingRow label="Monthly Recurring Revenue" value={`₹${(billing.monthly_recurring_revenue || 0).toLocaleString('en-IN')}`} />
                  <BillingRow label="One-time Payments (This Month)" value={`₹${(billing.onetime_this_month || 0).toLocaleString('en-IN')}`} />
                  <BillingRow label="Total This Month" value={`₹${((billing.monthly_recurring_revenue || 0) + (billing.onetime_this_month || 0)).toLocaleString('en-IN')}`} highlight />
                  <BillingRow label="Average Revenue per User" value={`₹${(billing.arpu || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                </div>
              </div>

              {/* Subscription Status */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Subscription Status</h2>
                <div className="space-y-4">
                  <SubscriptionRow 
                    label="Free Plan" 
                    value={billing.free_subscriptions || 0}
                    color="bg-gray-900/30 text-gray-300"
                  />
                  <SubscriptionRow 
                    label="Pro Plan" 
                    value={billing.pro_subscriptions || 0}
                    color="bg-indigo-900/30 text-indigo-300"
                  />
                  <SubscriptionRow 
                    label="Enterprise Plan" 
                    value={billing.enterprise_subscriptions || 0}
                    color="bg-purple-900/30 text-purple-300"
                  />
                  <SubscriptionRow 
                    label="Cancelled" 
                    value={billing.cancelled_subscriptions || 0}
                    color="bg-red-900/30 text-red-300"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Payment Methods</h2>
                <div className="space-y-4">
                  <PaymentRow label="Credit Cards" value={billing.credit_card_count || 0} />
                  <PaymentRow label="Bank Accounts" value={billing.bank_account_count || 0} />
                  <PaymentRow label="Digital Wallets" value={billing.wallet_count || 0} />
                </div>
              </div>

              {/* Refunds & Disputes */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Refunds & Disputes</h2>
                <div className="space-y-4">
                  <RefundRow label="Pending Refunds" value={`₹${(billing.pending_refunds || 0).toLocaleString('en-IN')}`} count={billing.refund_count || 0} />
                  <RefundRow label="Active Disputes" value={billing.active_disputes || 0} count={0} />
                  <RefundRow label="Chargeback Rate" value={`${(billing.chargeback_rate || 0).toFixed(2)}%`} count={0} />
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Recent Invoices</h2>

              {billing.recent_invoices && billing.recent_invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Invoice ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Customer</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.recent_invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-3 px-4 text-white font-mono text-xs">{invoice.id}</td>
                          <td className="py-3 px-4 text-gray-300">{invoice.customer_email}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">₹{(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4 text-gray-400">{new Date(invoice.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              invoice.status === "paid" ? "bg-green-900/30 text-green-300" :
                              invoice.status === "pending" ? "bg-yellow-900/30 text-yellow-300" :
                              "bg-red-900/30 text-red-300"
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No recent invoices</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BillingCard({ icon: Icon, label, value, change }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 hover:border-white/20 transition">
      <div className="flex items-center justify-between mb-4">
        <Icon className="text-indigo-400" size={24} />
        <span className="text-green-400 text-sm font-medium">{change}</span>
      </div>
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}

function BillingRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between items-center py-3 px-3 rounded-lg ${
      highlight ? "bg-indigo-900/20 border border-indigo-500/20" : "border-b border-white/5"
    } ${highlight ? "" : "last:border-0"}`}>
      <p className={`${highlight ? "text-indigo-300 font-semibold" : "text-gray-400"} text-sm`}>{label}</p>
      <p className={`${highlight ? "text-indigo-300 font-bold" : "text-white font-semibold"}`}>{value}</p>
    </div>
  )
}

function SubscriptionRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <p className="text-gray-400 text-sm">{label}</p>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${color}`}>
        {value}
      </span>
    </div>
  )
}

function PaymentRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function RefundRow({ label, value, count }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <p className="text-gray-400 text-sm">{label}</p>
      <div className="text-right">
        <p className="text-white font-semibold">{value}</p>
        {count > 0 && <p className="text-xs text-gray-500">{count} transaction{count !== 1 ? 's' : ''}</p>}
      </div>
    </div>
  )
}
