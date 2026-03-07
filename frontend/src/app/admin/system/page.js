'use client'

import { useState, useEffect } from 'react'
import { Heart, RefreshCw, Zap, Clock, AlertTriangle, ListOrdered, Database } from 'lucide-react'

export default function SystemHealthPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/admin/system-health')
      if (!response.ok) throw new Error('Failed to fetch system health data')
      const result = await response.json()
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
          <span className="ml-2">Loading System Health...</span>
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

  const metrics = [
    { label: 'API Calls', value: data.api_calls, icon: Zap, color: 'text-blue-400' },
    { label: 'Avg Response Time', value: `${data.avg_response_time}ms`, icon: Clock, color: 'text-green-400' },
    { label: 'Error Rate', value: `${data.error_rate}%`, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Queue Depth', value: data.queue_depth, icon: ListOrdered, color: 'text-yellow-400' },
    { label: 'Cache Hit Rate', value: `${data.cache_hit_rate}%`, icon: Database, color: 'text-purple-400' }
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="h-6 w-6" />
        <h1 className="text-2xl font-bold">System Health</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-[#0f0f0f] rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}