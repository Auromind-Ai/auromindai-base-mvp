"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Building2, Users, TrendingUp } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/context/ToastContext"

export default function WorkspacesPage() {
  const { showToast } = useToast()
  const [workspaces, setWorkspaces] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmWorkspace, setConfirmWorkspace] = useState(null)

  const [togglingId, setTogglingId] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true)
      const [data, plansData] = await Promise.all([
        api.getAdminWorkspaces().catch((err) => {
          console.error("Failed to fetch workspaces", err)
          return []
        }),
        api.getPlansAdmin().catch((err) => {
          console.error("Failed to fetch plans", err)
          return []
        })
      ])
      setWorkspaces(Array.isArray(data) ? data : data.workspaces || [])
      if (Array.isArray(plansData) && plansData.length > 0) {
        setPlans(plansData)
      }
      setError(null)
    } catch (err) {
      setError(err.message)
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const editPlan = async (id, plan) => {
    try {
      await api.editWorkspacePlan(id, plan)
      showToast("Workspace plan updated successfully", "success")
      fetchWorkspaces()
    } catch (err) {
      showToast("Failed to update plan: " + err.message, "error")
    }
  }

  const confirmDeactivate = (workspace) => {
    setConfirmWorkspace(workspace)
  }

  const deactivateWorkspace = async () => {
    if (!confirmWorkspace) return
    try {
      setConfirmLoading(true)
      await api.toggleWorkspaceStatus(confirmWorkspace.id)
      showToast("Workspace deactivated successfully", "success")
      await fetchWorkspaces()
    } catch (err) {
      showToast("Failed to deactivate workspace: " + err.message, "error")
    } finally {
      setConfirmLoading(false)
      setConfirmWorkspace(null)
    }
  }

  const toggleWorkspace = async (workspace) => {
    if (workspace.is_active) {
      confirmDeactivate(workspace)
      return
    }
    try {
      setTogglingId(workspace.id)
      await api.toggleWorkspaceStatus(workspace.id)
      showToast("Workspace activated successfully", "success")
      await fetchWorkspaces()
    } catch (err) {
      showToast("Failed to activate workspace: " + err.message, "error")
    } finally {
      setTogglingId(null)
    }
  }

  const availablePlanOptions = plans.length > 0
    ? plans.map((p) => ({
        value: p.name.toLowerCase(),
        label: p.display_name || p.name
      }))
    : [
        { value: "free", label: "free" },
        { value: "pro", label: "pro" },
        { value: "enterprise", label: "enterprise" }
      ];

  const momGrowth = useMemo(() => {
    if (!workspaces || workspaces.length === 0) {
      return { text: "0%", sub: "vs last month", color: "text-gray-400" }
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1)
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1)

    let thisMonthNew = 0
    let lastMonthNew = 0

    workspaces.forEach((w) => {
      if (!w.created_at) return
      const createdDate = new Date(w.created_at)
      if (isNaN(createdDate.getTime())) return

      if (createdDate >= startOfCurrentMonth) {
        thisMonthNew++
      } else if (createdDate >= startOfLastMonth && createdDate < startOfCurrentMonth) {
        lastMonthNew++
      }
    })

    if (lastMonthNew === 0) {
      if (thisMonthNew === 0) {
        return { text: "0%", sub: "0 new this month", color: "text-gray-400" }
      }
      return {
        text: "+100%",
        sub: `${thisMonthNew} new this mo (0 last mo)`,
        color: "text-emerald-400",
      }
    }

    const diff = thisMonthNew - lastMonthNew
    const rate = (diff / lastMonthNew) * 100
    const formattedRate = rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1)
    const isPositive = rate > 0
    const isNeutral = rate === 0

    return {
      text: `${isPositive ? "+" : ""}${formattedRate}%`,
      sub: `${thisMonthNew} this mo vs ${lastMonthNew} last mo`,
      color: isNeutral ? "text-gray-300" : isPositive ? "text-emerald-400" : "text-rose-400",
    }
  }, [workspaces])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Workspaces
          </h1>
          <p className="text-gray-400">
            Manage all workspaces
          </p>
        </div>

        {loading && (
          <p className="text-gray-400">
            Loading workspaces...
          </p>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-3 gap-6 mb-8">

              <StatCard
                icon={Building2}
                label="Total Workspaces"
                value={workspaces.length}
              />

              <StatCard
                icon={Users}
                label="Active Workspaces"
                value={workspaces.filter(w => w.is_active).length}
              />

              <StatCard
                icon={TrendingUp}
                label="Growth (MoM)"
                value={momGrowth.text}
                sub={momGrowth.sub}
                valueColor={momGrowth.color}
              />
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Workspace List
              </h2>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Name
                    </th>

                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Admin Email
                    </th>

                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Plan
                    </th>

                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Members
                    </th>

                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Status
                    </th>

                    <th className="text-left py-3 px-4 text-gray-400 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {workspaces.map((workspace) => {
                    const currentPlan = (workspace.plan_type || "free").toLowerCase()
                    const itemPlanOptions = [...availablePlanOptions]
                    if (!itemPlanOptions.some((p) => p.value === currentPlan)) {
                      itemPlanOptions.push({ value: currentPlan, label: currentPlan })
                    }

                    const isRowToggling = togglingId === workspace.id

                    return (
                      <tr key={workspace.id} className="border-b border-white/5">

                        <td className="py-4 px-4 text-white">
                          {workspace.name}
                        </td>

                        <td className="py-4 px-4 text-gray-300">
                          {workspace.owner_email}
                        </td>

                        <td className="py-4 px-4 text-gray-300">
                          {workspace.plan_type}
                        </td>

                        <td className="py-4 px-4 text-gray-300">
                          {workspace.member_count}
                        </td>

                        <td className="py-4 px-4">

                          <span className={`px-2 py-1 rounded text-xs ${
                            workspace.is_active
                              ? "bg-green-900/30 text-green-300"
                              : "bg-gray-900/30 text-gray-300"
                          }`}>

                            {workspace.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="py-4 px-4 flex gap-2 items-center">
                          <select
                            value={currentPlan}
                            onChange={(e) =>
                              editPlan(workspace.id, e.target.value)
                            }
                            className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700 capitalize"
                          >
                            {itemPlanOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => toggleWorkspace(workspace)}
                            disabled={isRowToggling}
                            className={`px-3 py-1 rounded text-xs transition disabled:opacity-50 ${
                              workspace.is_active
                                ? "bg-red-600 hover:bg-red-500 text-white"
                                : "bg-green-600 hover:bg-green-500 text-white"
                            }`}
                          >
                            {isRowToggling
                              ? "Updating..."
                              : workspace.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {confirmWorkspace && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-white text-lg font-semibold mb-3">
              Deactivate Workspace
            </h3>

            <p className="text-gray-400 mb-6">
              Are you sure you want to deactivate{" "}
              <b className="text-white">{confirmWorkspace.name}</b>?
            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setConfirmWorkspace(null)}
                disabled={confirmLoading}
                className="px-4 py-2 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={deactivateWorkspace}
                disabled={confirmLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition disabled:opacity-50"
              >
                {confirmLoading ? "Deactivating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, valueColor = "text-white" }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <Icon className="text-indigo-400 mb-3" size={24} />
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}