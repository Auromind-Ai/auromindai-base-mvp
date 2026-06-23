"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Users, Clock, BarChart3 } from "lucide-react"

import api from "@/lib/api"

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true)
        const data = await api.getPlatformConversations()
          console.log("API Response:", data)
        setConversations(Array.isArray(data) ? data : data.conversations || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setConversations([])
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  const totalConversations = conversations.length
  const activeConversations = conversations.filter(c => c.is_active)?.length || 0
  const avgMessagesPerConv = conversations.length > 0 
    ? Math.round(conversations.reduce((sum, c) => sum + (c.message_count || 0), 0) / conversations.length)
    : 0

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Conversations</h1>
          <p className="text-gray-400">Monitor and manage platform conversations</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading conversations...</p>
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
                icon={MessageSquare}
                label="Total Conversations"
                value={totalConversations}
              />
              <StatCard
                icon={Users}
                label="Active Now"
                value={activeConversations}
              />
              <StatCard
                icon={BarChart3}
                label="Avg Messages/Conv"
                value={avgMessagesPerConv}
              />
            </div>

            {/* Table */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Conversation List</h2>

              {conversations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">User</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Messages</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Started</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Last Activity</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((conv) => (
                        <tr key={conv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-white font-mono text-sm">{conv.id?.slice(0, 8) || "N/A"}...</td>
                          <td className="py-4 px-4 text-gray-300">{conv.user_name || conv.user_email || "N/A"}</td>
                          <td className="py-4 px-4 text-gray-300 text-right">{conv.message_count || 0}</td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {conv.last_activity ? new Date(conv.last_activity).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              conv.is_active
                                ? "bg-green-900/30 text-green-300"
                                : "bg-gray-900/30 text-gray-300"
                            }`}>
                              {conv.status? "OPEN" : "CLOSED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No conversations found</p>
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
