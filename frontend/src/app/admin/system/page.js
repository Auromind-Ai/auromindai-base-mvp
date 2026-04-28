'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Heart,
  RefreshCw,
  Zap,
  Clock,
  AlertTriangle,
  ListOrdered,
  Database,
  Cpu
} from 'lucide-react'

const BASE = '/api'; // same-origin proxy

export default function SystemHealthPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const pollingRef = useRef(null)
  const abortRef = useRef(null)

  const fetchData = async (signal) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${BASE}/admin/system-health`, {
        signal,
        credentials: 'include'
      })

      if (!res.ok) {
        const t = await res.text().catch(() => null)
        throw new Error(t || `HTTP ${res.status}`)
      }

      const json = await res.json()
      console.log('Fetched system health:', json)

      setData(json)
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    abortRef.current = new AbortController()
    fetchData(abortRef.current.signal)

    if (autoRefresh) {
      pollingRef.current = setInterval(() => {
        const ac = new AbortController()
        abortRef.current = ac
        fetchData(ac.signal)
      }, 10000)
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [autoRefresh])

  const handleManualRefresh = () => {
    if (abortRef.current) abortRef.current.abort()

    const ac = new AbortController()
    abortRef.current = ac
    fetchData(ac.signal)
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex items-center justify-center">
        <RefreshCw className="animate-spin h-8 w-8 mr-2" />
        Loading System Health...
      </div>
    )
  }

  const cpuColor =
    data.cpu_percent > 80
      ? 'text-red-400'
      : data.cpu_percent > 60
      ? 'text-yellow-400'
      : 'text-green-400'

  const memColor =
    data.memory_percent > 80
      ? 'text-red-400'
      : data.memory_percent > 60
      ? 'text-yellow-400'
      : 'text-green-400'

  const metrics = [
    {
      label: 'API Calls',
      value: data.api_calls ?? 0,
      icon: Zap,
      color: 'text-blue-400'
    },
    {
      label: 'Avg Response Time',
      value: `${data.avg_response_time ?? 0}ms`,
      icon: Clock,
      color: 'text-green-400'
    },
    {
      label: 'Error Rate',
      value: `${data.error_rate ?? 0}%`,
      icon: AlertTriangle,
      color: 'text-red-400'
    },
    {
      label: 'CPU Usage',
      value: `${data.cpu_percent ?? 0}%`,
      icon: Cpu,
      color: cpuColor
    },
    {
      label: 'Memory Usage',
      value: `${data.memory_percent ?? 0}%`,
      icon: Database,
      color: memColor
    },
    {
      label: 'Queue Depth',
      value: data.queue_depth ?? 0,
      icon: ListOrdered,
      color: 'text-yellow-400'
    },
    {
      label: 'Cache Hit Rate',
      value: `${data.cache_hit_rate ?? 0}%`,
      icon: Database,
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold">System Health</h1>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-indigo-500"
            />
            Auto
          </label>
        </div>
      </div>

      {error && (
        <div className="text-red-500 mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <div
              key={metric.label}
              className="bg-[#0f0f0f] rounded-lg p-6 border border-white/10"
            >
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

      <div className="mt-4 text-sm text-gray-400">
        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}
      </div>

      
    </div>
  )
}