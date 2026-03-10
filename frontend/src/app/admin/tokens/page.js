"use client"

import { useState, useEffect } from "react"
import { Coins, TrendingUp, Calendar, AlertCircle } from "lucide-react"

export default function TokenUsagePage() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true)
        const response = await fetch("http://localhost:8000/admin/tokens")
        if (!response.ok) throw new Error("Failed to fetch token usage")
        const data = await response.json()
        setTokens(Array.isArray(data) ? data : data.tokens || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [])

  const totalTokensUsed = tokens.reduce((sum, t) => sum + (t.tokens_used || 0), 0)
  const averageTokensPerUser = tokens.length > 0 ? Math.round(totalTokensUsed / tokens.length) : 0

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Token Usage</h1>
          <p className="text-gray-400">Monitor API token consumption across the platform</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading token usage...</p>
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
                icon={Coins}
                label="Total Tokens Used"
                value={totalTokensUsed.toLocaleString()}
              />
              <StatCard
                icon={TrendingUp}
                label="Avg per User"
                value={averageTokensPerUser.toLocaleString()}
              />
              <StatCard
                icon={Calendar}
                label="Active Accounts"
                value={tokens.length}
              />
            </div>

            {/* Table */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Token Usage by User</h2>

              {tokens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">User</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Workspace</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Tokens Used</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Limit</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Usage %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => {
                        const usagePercent = token.token_limit > 0 
                          ? Math.round((token.tokens_used / token.token_limit) * 100) 
                          : 0
                        return (
                          <tr key={token.id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="py-4 px-4 text-white">{token.user_email || token.user_name || "N/A"}</td>
                            <td className="py-4 px-4 text-gray-300">{token.workspace_name || "N/A"}</td>
                            <td className="py-4 px-4 text-gray-300 text-right font-mono">
                              {(token.tokens_used || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-gray-300 text-right font-mono">
                              {(token.token_limit || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-4">
                              <div className="w-32">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full transition ${
                                        usagePercent > 80 ? "bg-red-500" :
                                        usagePercent > 50 ? "bg-yellow-500" :
                                        "bg-green-500"
                                      }`}
                                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-400 w-8 text-right">{usagePercent}%</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No token usage data available</p>
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
