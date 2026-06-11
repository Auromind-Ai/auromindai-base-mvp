'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plug, RefreshCw } from 'lucide-react'

export default function IntegrationsPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
  try {
    setLoading(true)
    const response = await fetch('/api/admin/integrations')
    if (!response.ok) throw new Error('Failed to fetch integrations')
    const result = await response.json()
    setData(result)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [])

useEffect(() => {
  fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">Loading Integrations...</span>
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
        <Plug className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Integrations</h1>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-left">Workspace</th>
              <th className="px-4 py-3 text-left">Integration Type</th>
              <th className="px-4 py-3 text-left">Connected Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Token Expiry</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-4 py-3">{item.workspace_name}</td>
                <td className="px-4 py-3">{item.integration_type}</td>
                <td className="px-4 py-3">{item.connected_email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.is_active === true ? 'bg-green-600' :
                    item.is_active === false ? 'bg-red-600' : 'bg-yellow-600'
                  }`}>
                    {item.is_active}
                  </span>
                </td>
                <td className="px-4 py-3">{item.token_expiry ? new Date(item.token_expiry).toLocaleString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}