'use client'

import { useState, useEffect } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import api from "@/lib/api"

export default function AIActivityPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.getAIActivity()
      const result = response
      console.log('Fetched AI actions:', result)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">Loading AI Activity...</span>
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
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI Activity</h1>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-left">Action ID</th>
              <th className="px-4 py-3 text-left">Workspace</th>
              <th className="px-4 py-3 text-left">Intent</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">MCP Decision</th>
              <th className="px-4 py-3 text-left">Execution Status</th>
              <th className="px-4 py-3 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-4 py-3">{item.id}</td>
                <td className="px-4 py-3">{item.workspace}</td>
                <td className="px-4 py-3">{item.intent}</td>
                <td className="px-4 py-3">{item.confidence}%</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.mcp_decision?.toLowerCase() === 'allow' ? 'bg-green-600' :
                    item.mcp_decision?.toLowerCase() === 'block' ? 'bg-red-600' : 'bg-yellow-600'
                  }`}>
                    {item.mcp_decision}
                  </span>
                </td>
                <td className="px-4 py-3">{item.execution_status}</td>
                <td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}