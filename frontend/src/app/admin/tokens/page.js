"use client"

import { useState, useEffect, useCallback } from 'react'
import { Poppins } from 'next/font/google'
import { Coins, TrendingUp, Calendar, Zap, Layers } from "lucide-react"
import api from "@/lib/api"

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
})

export default function TokenUsagePage() {

  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get("/admin/tokens")
      setTokens(Array.isArray(data) ? data : data.tokens || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const totalTokensUsed = tokens.reduce(
    (sum, t) => sum + (t.tokens_used || 0),
    0
  )

  const totalTokensAllocated = tokens.reduce(
    (sum, t) => sum + (t.token_limit || 0),
    0
  )

  const totalCreditsAllocated = tokens.reduce(
    (sum, t) => sum + (t.total_credits ?? ((t.included_credits || 0) + (t.purchased_credits || 0))),
    0
  )

  return (
    <div className={`${poppins.className} min-h-screen bg-black p-8 font-['Poppins',sans-serif]`} style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Token Usage
          </h1>
          <p className="text-gray-400 text-sm">
            Monitor API token consumption and calculated allocations across workspaces
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-12 text-gray-400">
            Loading token usage...
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={Coins}
                label="Total Tokens Spent"
                value={totalTokensUsed.toLocaleString()}
                sub="Actual usage"
              />

              <StatCard
                icon={TrendingUp}
                label="Total Token Allocation"
                value={totalTokensAllocated.toLocaleString()}
                sub="From plan + top-ups"
              />

              <StatCard
                icon={Layers}
                label="Total Credits"
                value={totalCreditsAllocated.toLocaleString()}
                sub="Combined credit pool"
              />

              <StatCard
                icon={Calendar}
                label="Active Workspaces"
                value={tokens.length}
                sub="Total workspaces"
              />
            </div>

            {/* Table */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Workspace Token Consumption
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time token usage and allocated token limits per workspace
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 text-sm">
                        User
                      </th>

                      <th className="text-left py-3 px-4 text-gray-400 text-sm">
                        Workspace
                      </th>

                      <th className="text-left py-3 px-4 text-gray-400 text-sm">
                        Plan
                      </th>

                      <th className="text-left py-3 px-4 text-gray-400 text-sm">
                        Credits (Plan + Top-up)
                      </th>

                      <th className="text-right py-3 px-4 text-gray-400 text-sm">
                        Tokens Spent
                      </th>

                      <th className="text-right py-3 px-4 text-gray-400 text-sm">
                        Token Limit
                      </th>

                      <th className="text-left py-3 px-4 text-gray-400 text-sm pl-8">
                        Usage %
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {tokens.map((token) => {
                      const limit = token.token_limit || 0
                      const tokensUsed = token.tokens_used || 0
                      const usagePercent =
                        token.usage_percent ?? (limit > 0 ? Math.round((tokensUsed / limit) * 100) : 0)

                      const incCr = token.included_credits || 0
                      const purCr = token.purchased_credits || 0
                      const totalCr = token.total_credits ?? (incCr + purCr)
                      const creditsUsed = token.credits_used || 0

                      return (
                        <tr
                          key={token.id || token.workspace_id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition"
                        >
                          <td className="py-4 px-4 text-white">
                            {token.user_email || "N/A"}
                          </td>

                          <td className="py-4 px-4 text-gray-300 font-medium">
                            {token.workspace_name || "N/A"}
                          </td>

                          <td className="py-4 px-4">
                            <span className="capitalize text-xs font-medium px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-300">
                              {token.plan_type || "free"}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-xs text-gray-300">
                            <div className="font-mono">
                              <span className="text-indigo-400 font-semibold">{totalCr.toLocaleString()}</span> credits
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {incCr.toLocaleString()} inc {purCr > 0 ? `+ ${purCr.toLocaleString()} top-up` : ''}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="font-mono text-white font-semibold">
                              {tokensUsed.toLocaleString()}
                            </div>
                            {creditsUsed > 0 && (
                              <div className="text-[10px] text-gray-500 font-mono">
                                {creditsUsed.toLocaleString()} Cr spent
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="font-mono text-gray-200 font-semibold">
                              {limit.toLocaleString()}
                            </div>
                          </td>

                          <td className="py-4 px-4 pl-8">
                            <div className="w-36">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      usagePercent > 80
                                        ? "bg-red-500"
                                        : usagePercent > 50
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(usagePercent, 100)}%`
                                    }}
                                  />
                                </div>

                                <span className="text-xs font-mono text-gray-400 w-12 text-right">
                                  {usagePercent}%
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

  )

}

function StatCard({ icon: Icon, label, value, sub }) {

  return (

    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5">

      <div className="flex items-center gap-3 mb-3">
        <Icon className="text-indigo-400" size={22} />
      </div>

      <p className="text-gray-400 text-xs mb-1">
        {label}
      </p>

      <p className="text-white text-xl font-bold font-mono">
        {value}
      </p>

      {sub && (
        <p className="text-gray-500 text-[11px] mt-1">
          {sub}
        </p>
      )}

    </div>

  )

}