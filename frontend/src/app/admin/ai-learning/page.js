'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, RefreshCw } from 'lucide-react'

export default function AILearningPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/learning-events')
      if (!response.ok) throw new Error('Failed to fetch learning events')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/learning-events')
      if (!response.ok) throw new Error('Failed to fetch learning events')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteToRule = async (eventId) => {
    alert(`Promote event ${eventId} to rule`)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">Loading AI Learning...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6">
        <div className="text-red-500">Error: {error}</div>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-indigo-600 rounded">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI Learning</h1>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-left">User Message</th>
              <th className="px-4 py-3 text-left">AI Response</th>
              <th className="px-4 py-3 text-left">Feedback Type</th>
              <th className="px-4 py-3 text-left">Satisfaction Score</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
           {data.map((item, index) => (
           <tr key={item.id || index} className="border-t border-white/10">
                <td className="px-4 py-3 max-w-xs truncate">{item.user_message}</td>
                <td className="px-4 py-3 max-w-xs truncate">{item.ai_response}</td>
                <td className="px-4 py-3">{item.feedback_type}</td>
                <td className="px-4 py-3">{item.user_satisfaction_score}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handlePromoteToRule(item.id)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
                  >
                    Promote to Rule
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