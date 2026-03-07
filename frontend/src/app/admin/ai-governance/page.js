'use client'

import { useState, useEffect } from 'react'
import { Shield, RefreshCw } from 'lucide-react'

export default function AIGovernancePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/admin/ai-governance')
      if (!response.ok) throw new Error('Failed to fetch AI governance data')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOverride = async (actionId) => {
    // Placeholder for override functionality
    alert(`Override action ${actionId}`)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">Loading AI Governance...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="text-red-500">Error: {error}</div>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-indigo-600 rounded">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI Governance</h1>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Rule Triggered</th>
              <th className="px-4 py-3 text-left">Workspace</th>
              <th className="px-4 py-3 text-left">Decision</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-4 py-3">{item.action}</td>
                <td className="px-4 py-3">{item.rule_triggered}</td>
                <td className="px-4 py-3">{item.workspace}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.decision === 'Blocked' ? 'bg-red-600' : 'bg-yellow-600'
                  }`}>
                    {item.decision}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleOverride(item.id)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}