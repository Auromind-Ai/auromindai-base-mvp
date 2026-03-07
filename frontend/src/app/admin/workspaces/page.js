"use client"

import { useState, useEffect } from "react"
import { Building2, Users, Calendar, TrendingUp } from "lucide-react"

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true)
        const response = await fetch("http://localhost:8000/admin/workspaces")
        if (!response.ok) throw new Error("Failed to fetch workspaces")
        const data = await response.json()
        setWorkspaces(Array.isArray(data) ? data : data.workspaces || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setWorkspaces([])
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaces()
  }, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Workspaces</h1>
          <p className="text-gray-400">Manage all workspaces and their settings</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading workspaces...</p>
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
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                icon={Building2}
                label="Total Workspaces"
                value={workspaces.length || 0}
              />
              <StatCard
                icon={Users}
                label="Active Workspaces"
                value={workspaces.filter(w => w.is_active)?.length || 0}
              />
              <StatCard
                icon={TrendingUp}
                label="Growth"
                value="+12%"
              />
            </div>

            {/* Table */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Workspace List</h2>

              {workspaces.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">admin</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">plan</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Members</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Created</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaces.map((workspace) => (
                        <tr key={workspace.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-white">{workspace.name || workspace.workspace_name || "N/A"}</td>
                          <td className="py-4 px-4 text-gray-300">{workspace.owner_name || workspace.owner_email || "N/A"}</td>
                          {console.log("Workspace plan type:", users)}
                          <td className="py-4 px-4 text-gray-300">{workspace.plan_type|| 0}</td>
                          <td className="py-4 px-4 text-gray-300">{workspace.member_count || 0}</td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              workspace.is_active
                                ? "bg-green-900/30 text-green-300"
                                : "bg-gray-900/30 text-gray-300"
                            }`}>
                              {workspace.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No workspaces found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="text-indigo-400" size={24} />
      </div>
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}
