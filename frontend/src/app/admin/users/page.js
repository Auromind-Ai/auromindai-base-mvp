"use client"

import { useState, useEffect } from "react"
import { Users, Mail, Calendar, CheckCircle } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch("http://localhost:8002/admin/users")
        if (!response.ok) throw new Error("Failed to fetch users")
        const data = await response.json()
        setUsers(Array.isArray(data) ? data : data.users || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const activeUsers = users.filter(u => u.is_active)?.length || 0
  const totalUsers = users.length

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-gray-400">Manage platform users and their permissions</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading users...</p>
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
                icon={Users}
                label="Total Users"
                value={totalUsers}
              />
              <StatCard
                icon={CheckCircle}
                label="Active Users"
                value={activeUsers}
              />
              <StatCard
                icon={Mail}
                label="Verified Users"
                value={users.filter(u => u.is_verified)?.length || 0}
              />
            </div>

            {/* Table */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">User List</h2>

              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Role</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Joined</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-white">{user.full_name || user.first_name || "N/A"}</td>
                          <td className="py-4 px-4 text-gray-300">{user.email}</td>
                          <td className="py-4 px-4 text-gray-300 text-sm">{user.role || "user"}</td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                user.is_active
                                  ? "bg-green-900/30 text-green-300"
                                  : "bg-gray-900/30 text-gray-300"
                              }`}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                              {user.is_verified && (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-900/30 text-blue-300">
                                  Verified
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No users found</p>
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
