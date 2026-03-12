"use client"

import { useState, useEffect } from "react"
import { Users, MessageSquare, Zap, Building2, TrendingUp, AlertCircle } from "lucide-react"

export default function AdminDashboard() {

  const [analytics, setAnalytics] = useState(null)

  const [users, setUsers] = useState({ total: 0, active: 0 })
  const [workspaces, setWorkspaces] = useState({ total: 0 })
  const [conversations, setConversations] = useState({ total: 0, active: 0 })

  const [recentWorkspaces, setRecentWorkspaces] = useState([])
  const [recentConversations, setRecentConversations] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {

    const fetchDashboard = async () => {

      try {

        setLoading(true)

        const res = await fetch("http://localhost:8000/admin/dashboard")

        if (!res.ok) {
          throw new Error("Failed to fetch dashboard")
        }

        const data = await res.json()
        console.log("Raw Dashboard Response:", data)
        console.log("Dashboard Data:", data)

        setUsers(data.users || { total: 0, active: 0 })
        setWorkspaces(data.workspaces || { total: 0 })
        setConversations(data.conversations || { total: 0, active: 0 })

        setRecentWorkspaces(data.recent_workspaces || [])
        setRecentConversations(data.recent_conversations || [])

        setAnalytics(data.analytics)

        setError(null)

      } catch (err) {

        setError(err.message)

      } finally {

        setLoading(false)

      }

    }

    fetchDashboard()

  }, [])



  return (

    <div className="min-h-screen bg-black p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to your admin dashboard</p>
        </div>



        {loading && (
          <p className="text-gray-400">Loading dashboard...</p>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}



        {!loading && !error && (

          <>

            {/* Metrics */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              <MetricCard
                icon={Users}
                label="Total Users"
                value={users.total}
                trend="+12%"
              />

              <MetricCard
                icon={Building2}
                label="Workspaces"
                value={workspaces.total}
                trend="+8%"
              />

              <MetricCard
                icon={MessageSquare}
                label="Active Conversations"
                value={conversations.active}
                trend="+24%"
              />

              <MetricCard
                icon={Zap}
                label="API Calls Today"
                value={(analytics?.api_calls_today || 0).toLocaleString()}
                trend="+18%"
              />

            </div>



            {/* System Overview */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

                <h2 className="text-xl font-semibold text-white mb-6">
                  System Overview
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <OverviewItem label="Uptime" value={`${analytics?.uptime_percent || 99.9}%`} />

                  <OverviewItem label="Avg Response Time" value={`${analytics?.avg_response_time || 120}ms`} />

                  <OverviewItem label="Active Users Now" value={users.active} />

                  <OverviewItem label="Total Conversations" value={conversations.total} />

                  <OverviewItem label="Token Usage" value={(analytics?.total_token_usage || 0).toLocaleString()} />

                </div>

              </div>



              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

                <h2 className="text-xl font-semibold text-white mb-6">
                  Quick Stats
                </h2>

                <div className="space-y-4">

                  <QuickStat
                    label="Revenue (MTD)"
                    value={`$${(analytics?.total_revenue || 0).toLocaleString()}`}
                    icon={TrendingUp}
                  />

                  <QuickStat
                    label="Avg Users/Workspace"
                    value={workspaces.total > 0 ? Math.round(users.total / workspaces.total) : 0}
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

                <h2 className="text-xl font-semibold text-white mb-6">
                  Recent Workspaces
                </h2>

                {recentWorkspaces.map((workspace) => (

                  <div
                    key={workspace.id}
                    className="flex justify-between py-3 border-b border-white/5"
                  >

                    <div>
                      <p className="text-white text-sm">{workspace.name}</p>
                      <p className="text-gray-400 text-xs">{workspace.owner_email}</p>
                    </div>

                    <span
                      className={
                        workspace.is_active
                          ? "text-green-400 text-xs"
                          : "text-gray-400 text-xs"
                      }
                    >
                      {workspace.is_active ? "Active" : "Inactive"}
                    </span>

                  </div>

                ))}

              </div>



              {/* Recent Conversations */}

              <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

                <h2 className="text-xl font-semibold text-white mb-6">
                  Recent Conversations
                </h2>

                <div className="space-y-2">

                  {recentConversations.map((conv) => (

                    <div
                      key={conv.id}
                      className="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-white/5 transition"
                    >

                      <div>
                        <p className="text-white text-sm">{conv.user_email}</p>
                        <p className="text-gray-400 text-xs">
                          {conv.message_count || 0} messages
                        </p>
                      </div>

                      <span
                        className={
                          conv.status === "OPEN"
                            ? "bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs"
                            : "bg-gray-900/30 text-gray-300 px-2 py-1 rounded text-xs"
                        }
                      >
                        {conv.status === "OPEN" ? "Active" : "Closed"}
                      </span>

                    </div>

                  ))}

                </div>

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
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <div className="flex justify-between mb-4">
        <Icon className="text-indigo-400" size={24} />
        <span className="text-green-400 text-sm">{trend}</span>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}

function OverviewItem({ label, value }) {
  return (
    <div className="bg-black border border-white/5 rounded-lg p-4">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function QuickStat({ label, value, icon: Icon }) {
  return (
    <div className="flex justify-between py-3 px-4 bg-black border border-white/5 rounded-lg">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white font-bold text-lg">{value}</p>
      </div>
      <Icon className="text-indigo-400" size={20} />
    </div>
  )
}