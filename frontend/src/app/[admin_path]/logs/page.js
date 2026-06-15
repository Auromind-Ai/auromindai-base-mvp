"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LogsPage() {

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState("all")
  const [sortBy, setSortBy] = useState("latest")


  useEffect(() => {

    const fetchLogs = async () => {

      try {

        setLoading(true)

        const response = await fetch(`${API_BASE}/admin/logs`)

        if (!response.ok) throw new Error("Failed to fetch logs")

        const data = await response.json()

        setLogs(Array.isArray(data) ? data : data.logs || [])

        setError(null)

      } catch (err) {

        setError(err.message)
        setLogs([])

      } finally {

        setLoading(false)

      }

    }

    fetchLogs()

  }, [])



  const getStatusNumber = (status) => {

    if (!status) return 0

    const num = parseInt(status)

    return isNaN(num) ? 0 : num
  }


  const getDurationNumber = (duration) => {

    if (!duration) return 0

    return parseFloat(duration.replace("s", ""))
  }



  const filteredLogs = logs.filter(log => {

    const status = getStatusNumber(log.status)

    if (filter === "error") return status >= 500

    if (filter === "warning") return status >= 400 && status < 500

    if (filter === "info") return status >= 200 && status < 400

    return true

  })



  const sortedLogs = [...filteredLogs].sort((a, b) => {

    if (sortBy === "slowest") {
      return getDurationNumber(b.duration) - getDurationNumber(a.duration)
    }

    return new Date(b.timestamp) - new Date(a.timestamp)

  })



  const errorCount = logs.filter(l => getStatusNumber(l.status) >= 500).length

  const warningCount = logs.filter(
    l => getStatusNumber(l.status) >= 400 && getStatusNumber(l.status) < 500
  ).length

  const infoCount = logs.filter(
    l => getStatusNumber(l.status) >= 200 && getStatusNumber(l.status) < 400
  ).length



  const getLevelColor = (level) => {

    switch (level?.toUpperCase()) {

      case "ERROR":
        return "bg-red-900/30 text-red-300"

      case "WARNING":
        return "bg-yellow-900/30 text-yellow-300"

      case "INFO":
        return "bg-blue-900/30 text-blue-300"

      default:
        return "bg-gray-900/30 text-gray-300"
    }

  }



  const getStatusColor = (status) => {

    const code = getStatusNumber(status)

    if (code >= 500) return "bg-red-900/40 text-red-300"

    if (code >= 400) return "bg-yellow-900/40 text-yellow-300"

    if (code >= 200) return "bg-green-900/40 text-green-300"

    return "bg-gray-800 text-gray-300"

  }



  return (

    <div className="min-h-screen bg-black p-8">

      <div className="max-w-7xl mx-auto">


        {/* Header */}

        <div className="mb-8">

          <h1 className="text-3xl font-bold text-white mb-2">
            System Logs
          </h1>

          <p className="text-gray-400">
            View system events, errors, and warnings
          </p>

        </div>



        {/* Loading */}

        {loading && (

          <div className="flex items-center justify-center py-12">

            <div className="text-center">

              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>

              <p className="text-gray-400">
                Loading logs...
              </p>

            </div>

          </div>

        )}



        {/* Error */}

        {error && (

          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">

            <p className="text-red-300">
              Error: {error}
            </p>

          </div>

        )}



        {!loading && !error && (

          <>

            {/* Stats */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

              <StatCard
                icon={AlertCircle}
                label="Errors"
                value={errorCount}
                color="text-red-400"
              />

              <StatCard
                icon={Clock}
                label="Warnings"
                value={warningCount}
                color="text-yellow-400"
              />

              <StatCard
                icon={CheckCircle}
                label="Info"
                value={infoCount}
                color="text-blue-400"
              />

            </div>



            {/* Filter */}

            <div className="mb-4 flex gap-2 flex-wrap">

              {["all", "error", "warning", "info"].map(type => (

                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                  ${filter === type
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}

                </button>

              ))}

            </div>



            {/* Sorting */}

            <div className="mb-6 flex gap-2">

              <button
                onClick={() => setSortBy("latest")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  sortBy === "latest"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Latest
              </button>

              <button
                onClick={() => setSortBy("slowest")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  sortBy === "slowest"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                Slowest Requests
              </button>

            </div>



            {/* Logs Table */}

            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

              <h2 className="text-xl font-semibold text-white mb-6">
                Recent Logs
              </h2>


              {sortedLogs.length > 0 ? (

                <div className="space-y-3 max-h-[600px] overflow-y-auto">

                  {sortedLogs.map((log, index) => (

                    <div
                     key={`${log.timestamp}-${index}`}
                      className="bg-black border border-white/5 rounded-lg p-4 hover:border-white/10 transition"
                    >

                      <div className="flex items-start gap-4">


                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${getLevelColor(log.level)}`}
                        >
                          {log.level || "INFO"}
                        </span>



                        <div className="flex-1 min-w-0">

                          <p className="text-white font-mono text-sm break-words">
                            {log.message}
                          </p>


                          <div className="flex items-center gap-3 mt-2 text-xs">

                            {log.status && (

                              <span className={`px-2 py-1 rounded font-semibold ${getStatusColor(log.status)}`}>
                                {log.status}
                              </span>

                            )}

                            {log.duration && (

                              <span className="text-gray-500 font-mono">
                                {log.duration}
                              </span>

                            )}

                          </div>


                        </div>


                        <span className="text-gray-500 text-xs whitespace-nowrap">

                          {log.timestamp
                            ? new Date(log.timestamp.replace(",", ".")).toLocaleString()
                            : "N/A"}

                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="text-center py-12">

                  <p className="text-gray-400">
                    No logs found
                  </p>

                </div>

              )}

            </div>

          </>

        )}

      </div>

    </div>

  )

}



function StatCard({ icon: Icon, label, value, color }) {

  return (

    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">

      <div className="flex items-center gap-3 mb-4">

        <Icon className={color} size={24} />

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
