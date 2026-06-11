"use client"

import { useState, useEffect, useCallback } from 'react'
import { Coins, TrendingUp, Calendar } from "lucide-react"
import api from "@/lib/api"



export default function TokenUsagePage() {
  const [pricing, setPricing] = useState({})
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Remove number input arrows
  useEffect(() => {
      fetchTokens()
      fetchPricing()
    const style = document.createElement("style")

    style.innerHTML = `
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    input[type=number] {
      -moz-appearance: textfield;
    }
    `

    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }

  }, [])


  const fetchPricing = async () => {
  try {
    const data = await api.get("/public/pricing")
    setPricing(data)
  } catch (err) {
    console.error("Failed to fetch pricing", err)
  }
}
  const fetchTokens = async () => {
    try {
      setLoading(true)
      const data = await api.getAdminTokens()
      setTokens(Array.isArray(data) ? data : data.tokens || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }

  const updateLimit = async (workspaceId, value) => {
    try {
      await api.updateTokenLimit(workspaceId, Number(value))
      fetchTokens()
      fetchPricing()
    } catch (err) {
      console.error("Limit update failed", err)
    }
  }

  const handleLimitChange = (index, value) => {

    const updated = [...tokens]

    updated[index].custom_token_limit = value

    setTokens(updated)

  }

  const totalTokensUsed = tokens.reduce(
    (sum, t) => sum + (t.tokens_used || 0),
    0
  )

  const averageTokensPerUser =
    tokens.length > 0
      ? Math.round(totalTokensUsed / tokens.length)
      : 0

  return (

    <div className="min-h-screen bg-black p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Token Usage
          </h1>
          <p className="text-gray-400">
            Monitor API token consumption across the platform
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

              <h2 className="text-xl font-semibold text-white mb-6">
                Token Usage by User
              </h2>

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

                      <th className="text-right py-3 px-4 text-gray-400 text-sm">
                        Tokens Used
                      </th>

                      <th className="text-right py-3 px-4 text-gray-400 text-sm">
                        Token Limit
                      </th>

                      <th className="text-left py-3 px-4 text-gray-400 text-sm">
                        Usage %
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {tokens.map((token, index) => {

                      const defaultLimit = pricing.token_limit_per_plan?.[token.plan_type] || 100000

                      const limit =
                        token.custom_token_limit ?? defaultLimit

                      const usagePercent =
                        limit > 0
                          ? Math.round((token.tokens_used / limit) * 100)
                          : 0

                      return (

                        <tr
                          key={token.id}
                          className="border-b border-white/5"
                        >

                          <td className="py-4 px-4 text-white">
                            {token.user_email || "N/A"}
                          </td>

                          <td className="py-4 px-4 text-gray-300">
                            {token.workspace_name || "N/A"}
                          </td>

                          <td className="py-4 px-4 text-gray-300">
                            {token.plan_type}
                          </td>

                          <td className="py-4 px-4 text-right font-mono text-gray-300">
                            {(token.tokens_used || 0).toLocaleString()}
                          </td>

                          <td className="py-4 px-4 text-right">

                          <input
                              type="number"
                              value={limit}
                              onChange={(e) =>
                                handleLimitChange(index, e.target.value)
                              }
                              onBlur={(e) =>
                                updateLimit(token.workspace_id, e.target.value)
                              }
                              onWheel={(e) => e.target.blur()}
                              className="bg-black border border-gray-700 rounded px-2 py-1 text-right w-28 text-white"
                            />

                          </td>

                          <td className="py-4 px-4">

                            <div className="w-32">

                              <div className="flex items-center gap-2">

                                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">

                                  <div
                                    className={`h-full ${
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

                                <span className="text-xs text-gray-400 w-8 text-right">
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

function StatCard({ icon: Icon, label, value }) {

  return (

    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

      <div className="flex items-center gap-3 mb-4">
        <Icon className="text-indigo-400" size={24} />
      </div>

      <p className="text-gray-400 text-sm mb-2">
        {label}
      </p>

      <p className="text-white text-2xl font-bold">
        {value}
      </p>

    </div>

  )

}