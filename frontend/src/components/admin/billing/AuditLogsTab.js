"use client"

import React, { useState, useEffect, useCallback } from "react"
import { FileText } from "lucide-react"
import api from "@/lib/api"

export default function AuditLogsTab({
  setError,
  setActionLoading
}) {
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLogsPage, setAuditLogsPage] = useState(1)
  const [auditLogsTotal, setAuditLogsTotal] = useState(0)

  const fetchAuditLogs = useCallback(async () => {
    try {
      setActionLoading(true)
      setError(null)
      const logsRes = await api.getAdminAuditLogs(auditLogsPage, 20)
      setAuditLogs(logsRes.logs || [])
      setAuditLogsTotal(logsRes.total || 0)
    } catch (err) {
      setError(err.message || "Failed to load audit logs")
    } finally {
      setActionLoading(false)
    }
  }, [auditLogsPage, setActionLoading, setError])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
        <FileText size={14} /> Billing Operations Audit Logs
      </h3>

      {auditLogs.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Admin User</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Workspace ID</th>
                  <th className="py-2">Ip</th>
                  <th className="py-2 pl-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 font-semibold text-white">{log.admin_user_id}</td>
                    <td className="py-3 font-mono text-[10px]">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[10px] text-gray-500">{log.workspace_id || "Global"}</td>
                    <td className="py-3 text-gray-500">{log.ip_address}</td>
                    <td className="py-3 pl-4 text-gray-400 max-w-xs truncate" title={log.reason}>{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditLogsTotal > 20 && (
            <div className="flex justify-between items-center pt-2">
              <button
                disabled={auditLogsPage <= 1}
                onClick={() => setAuditLogsPage(auditLogsPage - 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="text-[10px] text-gray-500">Page {auditLogsPage} of {Math.ceil(auditLogsTotal / 20)}</span>
              <button
                disabled={auditLogsPage * 20 >= auditLogsTotal}
                onClick={() => setAuditLogsPage(auditLogsPage + 1)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">No audit logs logged yet</div>
      )}
    </div>
  )
}
