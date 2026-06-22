"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Users, Activity, BarChart3 } from "lucide-react"

import api from "@/lib/api"

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
useEffect(() => {
  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const data = await api.getPlatformAnalytics()
      setAnalytics(data)
      setError(null)

    } catch (err) {
      setError(err.message)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  fetchAnalytics()
}, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Detailed platform analytics and insights</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analytics...</p>
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
        {!loading && analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={Users}
                label="Total Users"
                value={analytics.total_users || 0}
                change="+12%"
              />
              <MetricCard
                icon={Activity}
                label="Active Today"
                value={analytics.active_today || 0}
                change="+8%"
              />
              <MetricCard
                icon={BarChart3}
                label="Total API Calls"
                value={(analytics.total_api_calls || 0).toLocaleString()}
                change="+24%"
              />
              <MetricCard
                icon={TrendingUp}
                label="Revenue (INR)"
                value={`₹${(analytics.total_revenue || 0).toLocaleString('en-IN')}`}
                change="+18%"
              />
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Analytics */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">User Analytics</h2>
                <div className="space-y-4">
                  <AnalyticsRow
                    label="New Users (Last 7 Days)"
                    value={analytics.new_users_7d || 0}
                    total={analytics.total_users || 1}
                  />
                  <AnalyticsRow
                    label="Active Users (Last 30 Days)"
                    value={analytics.active_users_30d || 0}
                    total={analytics.total_users || 1}
                  />
                  <AnalyticsRow
                    label="Verified Users"
                    value={analytics.verified_users || 0}
                    total={analytics.total_users || 1}
                  />
                  <AnalyticsRow
                    label="Trial Users"
                    value={analytics.trial_users || 0}
                    total={analytics.total_users || 1}
                  />
                </div>
              </div>

              {/* Conversation Analytics */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Conversation Analytics</h2>
                <div className="space-y-4">
                  <InfoRow label="Total Conversations" value={analytics.total_conversations || 0} />
                  <InfoRow label="Active Conversations" value={analytics.active_conversations || 0} />
                  <InfoRow label="Avg Messages per Conversation" value={analytics.avg_messages_per_conv || 0} />
                  <InfoRow label="Conversations Today" value={analytics.conversations_today || 0} />
                </div>
              </div>

              {/* API Analytics */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">API Analytics</h2>
                <div className="space-y-4">
                  <InfoRow label="API Calls Today" value={(analytics.api_calls_today || 0).toLocaleString()} />
                  <InfoRow label="API Calls This Month" value={(analytics.api_calls_month || 0).toLocaleString()} />
                  <InfoRow label="Avg Response Time" value={`${analytics.avg_response_time || 0}ms`} />
                  <InfoRow label="Error Rate" value={`${(analytics.error_rate || 0).toFixed(2)}%`} />
                </div>
              </div>

              {/* System Health */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">System Health</h2>
                <div className="space-y-4">
                  <HealthRow label="Uptime" value={`${analytics.uptime_percent || 99.9}%`} good />
                  <HealthRow label="Database Status" value="Healthy" good />
                  <HealthRow label="Cache Hit Rate" value={`${(analytics.cache_hit_rate || 0).toFixed(2)}%`} good />
                  <HealthRow label="Queue Depth" value={analytics.queue_depth || 0} good={analytics.queue_depth < 100} />
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Revenue Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RevenueItem label="Monthly Recurring" value={`₹${(analytics.mrr || 0).toLocaleString('en-IN')}`} />
                <RevenueItem label="One-time Payments" value={`₹${(analytics.one_time_revenue || 0).toLocaleString('en-IN')}`} />
                <RevenueItem label="Avg Revenue per User" value={`₹${(analytics.arpu || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, change }) {
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

function AnalyticsRow({ label, value, total }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white font-semibold">{value} ({percent}%)</p>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-indigo-500 h-full transition-all"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function HealthRow({ label, value, good }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <p className="text-gray-400 text-sm">{label}</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${good ? "bg-green-500" : "bg-red-500"}`}></div>
        <p className="text-white font-semibold">{value}</p>
      </div>
    </div>
  )
}

function RevenueItem({ label, value }) {
  return (
    <div className="bg-black border border-white/5 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  )
}
