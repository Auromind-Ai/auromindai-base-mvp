"use client"

import { useState, useEffect } from "react"
import { Users, BarChart3, MessageSquare, Zap, Building2, TrendingUp, AlertCircle } from "lucide-react"

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        
        const [analyticsRes, workspacesRes, usersRes, conversationsRes] = await Promise.all([
          fetch("http://localhost:8000/admin/analytics"),
          fetch("http://localhost:8000/admin/workspaces"),
          fetch("http://localhost:8000/admin/users"),
          fetch("http://localhost:8000/admin/conversations")
        ])

        if (!analyticsRes.ok || !workspacesRes.ok || !usersRes.ok || !conversationsRes.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

        const [analyticsData, workspacesData, usersData, conversationsData] = await Promise.all([
          analyticsRes.json(),
          workspacesRes.json(),
          usersRes.json(),
          conversationsRes.json()
        ])

        setAnalytics(analyticsData)
        setWorkspaces(Array.isArray(workspacesData) ? workspacesData : workspacesData.workspaces || [])
        setUsers(Array.isArray(usersData) ? usersData : usersData.users || [])
        setConversations(Array.isArray(conversationsData) ? conversationsData : conversationsData.conversations || [])
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to your admin dashboard</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading dashboard...</p>
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
        {!loading && !error && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={Users}
                label="Total Users"
                value={users.length}
                trend="+12%"
              />
              <MetricCard
                icon={Building2}
                label="Workspaces"
                value={workspaces.length}
                trend="+8%"
              />
              <MetricCard
                icon={MessageSquare}
                label="Active Conversations"
                value={conversations.filter(c => c.is_active)?.length || 0}
                trend="+24%"
              />
              <MetricCard
                icon={Zap}
                label="API Calls Today"
                value={(analytics?.api_calls_today || 0).toLocaleString()}
                trend="+18%"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* System Overview */}
              <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">System Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <OverviewItem label="Uptime" value={`${analytics?.uptime_percent || 99.9}%`} />
                  <OverviewItem label="Avg Response Time" value={`${analytics?.avg_response_time || 120}ms`} />
                  <OverviewItem label="Active Users Now" value={users.filter(u => u.is_active)?.length || 0} />
                  <OverviewItem label="Verified Users" value={users.filter(u => u.is_verified)?.length || 0} />
                  <OverviewItem label="Total Conversations" value={conversations.length} />
                  <OverviewItem label="Token Usage" value={`${(analytics?.total_token_usage || 0).toLocaleString()}`} />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Quick Stats</h2>
                <div className="space-y-4">
                  <QuickStat 
                    label="Revenue (MTD)" 
                    value={`$${(analytics?.total_revenue || 0).toLocaleString()}`}
                    icon={TrendingUp}
                  />
                  <QuickStat 
                    label="Avg Users/Workspace" 
                    value={workspaces.length > 0 ? Math.round(users.length / workspaces.length) : 0}
                    icon={Users}
                  />
                  <QuickStat 
                    label="Error Rate" 
                    value={`${(analytics?.error_rate || 0).toFixed(2)}%`}
                    icon={AlertCircle}
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Workspaces */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Recent Workspaces</h2>
                {workspaces.length > 0 ? (
                  <div className="space-y-3">
                    {workspaces.slice(0, 5).map((workspace) => (
                      <div key={workspace.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition">
                        <div>
                          <p className="text-white font-semibold text-sm">{workspace.name || workspace.workspace_name}</p>
                          <p className="text-gray-400 text-xs">{workspace.owner_email || workspace.owner}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          workspace.is_active
                            ? "bg-green-900/30 text-green-300"
                            : "bg-gray-900/30 text-gray-300"
                        }`}>
                          {workspace.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No workspaces found</p>
                )}
              </div>

              {/* Recent Conversations */}
              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Recent Conversations</h2>
                {conversations.length > 0 ? (
                  <div className="space-y-3">
                    {conversations.slice(0, 5).map((conv) => (
                      <div key={conv.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition">
                        <div>
                          <p className="text-white font-semibold text-sm">{conv.user_email || conv.user_name}</p>
                          <p className="text-gray-400 text-xs">{conv.message_count || 0} messages</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          conv.is_active
                            ? "bg-blue-900/30 text-blue-300"
                            : "bg-gray-900/30 text-gray-300"
                        }`}>
                          {conv.is_active ? "Active" : "Closed"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No conversations found</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, trend }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 hover:border-white/20 transition">
      <div className="flex items-center justify-between mb-4">
        <Icon className="text-indigo-400" size={24} />
        <span className="text-green-400 text-sm font-medium">{trend}</span>
      </div>
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}

function OverviewItem({ label, value }) {
  return (
    <div className="bg-black border border-white/5 rounded-lg p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function QuickStat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-black border border-white/5">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white font-bold text-lg">{value}</p>
      </div>
      <Icon className="text-indigo-400" size={20} />
    </div>
  )
}