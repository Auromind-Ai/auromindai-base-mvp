"use client"

import React, { useState } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import api from "@/lib/api"

export default function DiagnosticsTab({
  diagnostics,
  setDiagnostics,
  setError,
  setSuccess,
  setActionLoading
}) {
  const handleRefreshChecks = async () => {
    try {
      setActionLoading(true)
      setError(null)
      const diag = await api.getBillingDiagnostics()
      setDiagnostics(diag)
    } catch (err) {
      setError(err.message || "Failed to refresh diagnostics")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRepairIssue = async (issueType, wsId = null, meta = {}) => {
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.runBillingRepair(issueType, wsId, meta)
      setSuccess(`Repair completed: ${issueType}. Details: ${JSON.stringify(res.repaired_details)}`)
      // Refresh Diagnostics
      const diag = await api.getBillingDiagnostics()
      setDiagnostics(diag)
    } catch (err) {
      setError(err.message || "Repair action failed")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <AlertTriangle size={14} /> Live Billing Diagnostics
        </h3>
        <button
          onClick={handleRefreshChecks}
          className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={10} /> Refresh Checks
        </button>
      </div>

      {diagnostics ? (
        <div className="space-y-4">
          {/* Pending Recharges check */}
          <CollapsibleDiagnosticCard
            title="Pending WCC Recharges (> 1hr)"
            items={diagnostics.pending_recharges}
            renderItem={(item) => (
              <div key={item.id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Log ID:</span> <span className="font-mono text-white mr-4">{item.id}</span>
                  <span className="text-gray-500">Workspace:</span> <span className="text-indigo-400 font-medium mr-4">{item.workspace_id}</span>
                  <span className="text-gray-500">Amount:</span> <span className="text-white font-bold">₹{Number(item.amount ?? 0).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("retry_recharge", null, { recharge_log_id: item.id })}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Force Success
                </button>
              </div>
            )}
          />

          {/* Pending Credit Purchases check */}
          <CollapsibleDiagnosticCard
            title="Pending Credit Purchases"
            items={diagnostics.pending_credit_purchases}
            renderItem={(item) => (
              <div key={item.id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Payment ID:</span> <span className="font-mono text-white mr-4">{item.id}</span>
                  <span className="text-gray-500">Workspace:</span> <span className="text-indigo-400 font-medium mr-4">{item.workspace_id}</span>
                  <span className="text-gray-500">Amount:</span> <span className="text-white font-bold">₹{Number(item.amount ?? 0).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("retry_credit_purchase", null, { payment_id: item.id })}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Force Succeeded Pack
                </button>
              </div>
            )}
          />

          {/* Failed Payment Verifications check */}
          <CollapsibleDiagnosticCard
            title="Failed Payment Verifications"
            items={diagnostics.failed_payments}
            renderItem={(item) => (
              <div key={item.id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Payment ID:</span> <span className="font-mono text-white mr-4">{item.id}</span>
                  <span className="text-gray-500">Workspace:</span> <span className="text-indigo-400 font-medium mr-4">{item.workspace_id}</span>
                  <span className="text-gray-500">Amount:</span> <span className="text-white font-bold">₹{Number(item.amount ?? 0).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("failed_payment", null, { payment_id: item.id })}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Retry Verification
                </button>
              </div>
            )}
          />

          {/* Failed Webhooks check */}
          <CollapsibleDiagnosticCard
            title="Failed Webhooks (Unprocessed Events)"
            items={diagnostics.failed_webhooks}
            renderItem={(item) => (
              <div key={item.id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Event ID:</span> <span className="font-mono text-white mr-4">{item.id}</span>
                  <span className="text-gray-500">Provider:</span> <span className="text-white mr-4 font-bold uppercase">{item.provider}</span>
                  <span className="text-gray-500">Event:</span> <span className="text-indigo-400 font-medium">{item.event_type}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("failed_webhook", null, { event_id: item.id })}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Replay Webhook
                </button>
              </div>
            )}
          />

          {/* Duplicate Ledger entries check */}
          <CollapsibleDiagnosticCard
            title="Duplicate Token Ledger entries"
            items={diagnostics.duplicate_ledgers}
            renderItem={(item) => (
              <div key={item.reference_key} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">Ref Key:</span> <span className="font-mono text-white mr-4">{item.reference_key}</span>
                  <span className="text-gray-500">Copies:</span> <span className="text-red-400 font-bold mr-4">{item.count}</span>
                  <span className="text-gray-500">Desc:</span> <span className="text-gray-400">{item.description}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("duplicate_ledger", null, { reference_key: item.reference_key })}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Prune Duplicates
                </button>
              </div>
            )}
          />

          {/* Wallet / Ledger mismatch check */}
          <CollapsibleDiagnosticCard
            title="Wallet / Ledger balance mismatch"
            items={diagnostics.wallet_ledger_mismatch}
            renderItem={(item) => (
              <div key={item.workspace_id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-indigo-400 font-semibold mr-4">{item.workspace_name}</span>
                  <span className="text-gray-500">Wallet:</span> <span className="text-red-400 font-medium mr-4">₹{Number(item.wallet_balance ?? 0).toFixed(2)}</span>
                  <span className="text-gray-500">Expected:</span> <span className="text-green-400 font-bold">₹{Number(item.expected_balance ?? 0).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("wallet_ledger_mismatch", item.workspace_id)}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Recalculate Wallet
                </button>
              </div>
            )}
          />

          {/* Missing Subscription check */}
          <CollapsibleDiagnosticCard
            title="Workspaces with Missing Active Subscription"
            items={diagnostics.missing_subscription}
            renderItem={(item) => (
              <div key={item.workspace_id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-white font-medium mr-4">{item.workspace_name}</span>
                  <span className="text-gray-500">ID:</span> <span className="font-mono text-gray-500">{item.workspace_id}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("missing_subscription", item.workspace_id)}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Create Free Sub
                </button>
              </div>
            )}
          />

          {/* Missing Entitlement check */}
          <CollapsibleDiagnosticCard
            title="Subscriptions with Missing Plan Entitlements config"
            items={diagnostics.missing_entitlement}
            renderItem={(item) => (
              <div key={item.workspace_id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-white font-medium mr-4">{item.workspace_name}</span>
                  <span className="text-gray-500">Sub ID:</span> <span className="font-mono text-gray-500">{item.subscription_id}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("missing_entitlement", item.workspace_id)}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Provision Entitlement
                </button>
              </div>
            )}
          />

          {/* Missing Wallet check */}
          <CollapsibleDiagnosticCard
            title="Workspaces with Missing WCC Wallet record"
            items={diagnostics.missing_wallet}
            renderItem={(item) => (
              <div key={item.workspace_id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-white font-medium mr-4">{item.workspace_name}</span>
                  <span className="text-gray-500">ID:</span> <span className="font-mono text-gray-500">{item.workspace_id}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("missing_wallet", item.workspace_id)}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Create Wallet
                </button>
              </div>
            )}
          />

          {/* Missing Token Ledger check */}
          <CollapsibleDiagnosticCard
            title="Workspaces with Missing Token Ledger records"
            items={diagnostics.missing_token_ledger}
            renderItem={(item) => (
              <div key={item.workspace_id} className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl text-xs">
                <div>
                  <span className="text-white font-medium mr-4">{item.workspace_name}</span>
                  <span className="text-gray-500">ID:</span> <span className="font-mono text-gray-500">{item.workspace_id}</span>
                </div>
                <button
                  onClick={() => handleRepairIssue("missing_token_ledger", item.workspace_id)}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold"
                >
                  Grant Initial Credits
                </button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-gray-600">
          Loading live checks...
        </div>
      )}
    </div>
  )
}

function CollapsibleDiagnosticCard({ title, items, renderItem }) {
  const [open, setOpen] = useState(false)
  const count = items ? items.length : 0
  
  return (
    <div className={`p-4 bg-white/[0.01] border rounded-2xl transition-all ${
      count > 0 ? "border-amber-500/25 bg-amber-500/[0.02]" : "border-white/[0.04]"
    }`}>
      <div
        onClick={() => count > 0 && setOpen(!open)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${
            count > 0 ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
          }`} />
          <span className="text-xs font-bold text-white tracking-wide">{title}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            count > 0 ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
          }`}>
            {count > 0 ? `${count} Issues Detected` : "Healthy"}
          </span>
          {count > 0 && (
            <span className="text-[10px] text-gray-500 hover:text-white transition-colors">
              {open ? "Hide Details" : "Show Details"}
            </span>
          )}
        </div>
      </div>

      {open && count > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-2 animate-fade-in">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  )
}
