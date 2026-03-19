'use client'

import { useState, useEffect } from 'react'
import { Brain, RefreshCw } from 'lucide-react'

export default function RAGBrainPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/admin/rag')
      if (!response.ok) throw new Error('Failed to fetch RAG data')
      const result = await response.json()
      console.log(result)
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
          <span className="ml-2">Loading RAG Brain...</span>
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
        <Brain className="h-6 w-6" />
        <h1 className="text-2xl font-bold">RAG Brain</h1>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-left">Workspace</th>
              <th className="px-4 py-3 text-left">Entry Title</th>
              <th className="px-4 py-3 text-left">Chunk Count</th>
              <th className="px-4 py-3 text-left">Embedding Status</th>
              <th className="px-4 py-3 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-4 py-3">{item.workspace_id}</td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.chunk_count}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.status?.toLowerCase() === 'completed' ? 'bg-green-600' :
                    item.status?.toLowerCase() === 'processing' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}