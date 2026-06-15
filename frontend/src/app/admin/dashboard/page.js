"use client"

import { useState, useEffect } from "react"
import { Users, MessageSquare, Zap, Building2, Activity, Clock } from "lucide-react"
import { authHeader } from "@/lib/auth"

const API_BASE = '/api'; // same-origin proxy

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
        const res = await fetch(`${API_BASE}/admin/dashboard`)

        if (!res.ok) throw new Error("Failed to fetch dashboard")

        const data = await res.json()

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-2xl mx-auto mt-12 text-center">
        <h3 className="text-red-400 font-bold mb-2">Dashboard Error</h3>
        <p className="text-red-300/80 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col items-start gap-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase rounded-full mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Owner Command Center
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1 border-l-2 border-indigo-500/30 pl-3">
          Real-time metrics and system health monitoring.
        </p>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Users} label="Total Users" value={users.total} subValue={`${users.active} Active Now`} color="text-blue-400" />
        <MetricCard icon={Building2} label="Network Workspaces" value={workspaces.total} subValue="Active environments" color="text-indigo-400" />
        <MetricCard icon={MessageSquare} label="AI Conversations" value={conversations.total} subValue={`${conversations.active} Open sessions`} color="text-purple-400" />
        <MetricCard icon={Zap} label="API Activity (Today)" value={(analytics?.api_calls_today || 0).toLocaleString()} subValue={`${analytics?.avg_response_time || 0}ms avg response`} color="text-green-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Recent Workspaces */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-indigo-500/10" />
          
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="text-gray-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-wide">Recent Workspaces</h2>
          </div>

          <div className="space-y-1">
            {recentWorkspaces.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No workspaces found.</p>
            ) : (
              recentWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-200">{workspace.name}</span>
                    <span className="text-xs text-gray-500">{workspace.owner_email}</span>
                  </div>
                  <StatusBadge active={workspace.is_active} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-purple-500/10" />

          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-gray-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-wide">Live Conversations</h2>
          </div>

          <div className="space-y-1">
            {recentConversations.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No recent conversations.</p>
            ) : (
              recentConversations.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-200 truncate max-w-[200px]">{conv.user_email}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> Active Session
                    </span>
                  </div>
                  <ConvBadge status={conv.status} />
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, subValue, color }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
        <Icon className={color} size={48} strokeWidth={1.5} />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <p className="text-gray-500 text-xs font-bold tracking-wider uppercase">{label}</p>
        <div>
          <p className="text-4xl font-extrabold text-white tracking-tight mb-1">{value}</p>
          <p className="text-gray-500 text-xs font-medium">{subValue}</p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ active }) {
  if (active) {
    return <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[10px] uppercase font-bold tracking-wider rounded-md border border-green-500/20">Active</span>
  }
  return <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-[10px] uppercase font-bold tracking-wider rounded-md border border-gray-500/20">Inactive</span>
}

function ConvBadge({ status }) {
  if (status === "OPEN") {
    return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded-md border border-blue-500/20">Open</span>
  }
  return <span className="px-2.5 py-1 bg-gray-800 text-gray-400 text-[10px] uppercase font-bold tracking-wider rounded-md border border-white/5">Closed</span>
}