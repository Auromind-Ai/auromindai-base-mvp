"use client"

import { useState, useEffect, useCallback } from 'react'
import { Building2, Users, TrendingUp } from "lucide-react"
import api from "@/lib/api"

export default function WorkspacesPage() {

  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmWorkspace, setConfirmWorkspace] = useState(null)

  const fetchWorkspaces = useCallback(async () => {
  try {
    setLoading(true)
    const data = await api.getAdminWorkspaces()
    setWorkspaces(Array.isArray(data) ? data : data.workspaces || [])
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
    await api.editWorkspacePlan(id, plan)
    fetchWorkspaces()
  }

  const resetLimits = async (id) => {
    await api.resetWorkspaceLimits(id)
    fetchWorkspaces()
  }

  const confirmDeactivate = (workspace) => {
    setConfirmWorkspace(workspace)
  }

const toggleWorkspace = async (id) => {
  await api.toggleWorkspaceStatus(id)
  fetchWorkspaces()

}

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
                label="Growth"
                value="+12%"
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
                  {workspaces.map((workspace) => (
                    console.log(workspace),
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
                          defaultValue={workspace.plan_type}
                          onChange={(e) =>
                            editPlan(workspace.id, e.target.value)
                          }
                          className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700"
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="enterprise">enterprise</option>
                        </select>
                        <button
                          onClick={() => resetLimits(workspace.id)}
                          className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                        >
                          Reset
                        </button>

                        <button
                          onClick={() => toggleWorkspace(workspace.id)}
                          className={`px-3 py-1 rounded text-xs ${
                            workspace.is_active
                              ? "bg-red-600 hover:bg-red-500 text-white"
                              : "bg-green-600 hover:bg-green-500 text-white"
                          }`}
                        >
                          {workspace.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {confirmWorkspace && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 w-96">
            <h3 className="text-white text-lg font-semibold mb-3">
              Deactivate Workspace
            </h3>

            <p className="text-gray-400 mb-6">
              Are you sure you want to deactivate{" "}
              <b>{confirmWorkspace.name}</b>?
            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setConfirmWorkspace(null)}
                className="px-4 py-2 text-gray-300 bg-gray-800 rounded"
              >
                Cancel
              </button>

              <button
                onClick={deactivateWorkspace}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <Icon className="text-indigo-400 mb-3" size={24} />
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}