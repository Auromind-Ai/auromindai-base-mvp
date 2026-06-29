"use client"

import React, { useState } from "react"
import {
  Search,
  Coins,
  Wallet,
  Shield,
  Database,
  ArrowRightLeft
} from "lucide-react"
import api from "@/lib/api"

export default function WorkspaceTab({
  setError,
  setSuccess,
  setActionLoading
}) {
  // Workspace Selector State
  const [workspaceQuery, setWorkspaceQuery] = useState("")
  const [workspaceSearchResults, setWorkspaceSearchResults] = useState([])
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [selectedWorkspaceDetails, setSelectedWorkspaceDetails] = useState(null)

  // Sub-data for Selected Workspace
  const [creditLogs, setCreditLogs] = useState([])
  const [creditLogsPage, setCreditLogsPage] = useState(1)
  const [creditLogsTotal, setCreditLogsTotal] = useState(0)
  const [wccRecharges, setWccRecharges] = useState([])
  const [wccTransactions, setWccTransactions] = useState([])

  // Operation Inputs
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")
  
  const [walletAmount, setWalletAmount] = useState("")
  const [walletReason, setWalletReason] = useState("")

  const [overridePlan, setOverridePlan] = useState("pro")
  const [overrideStatus, setOverrideStatus] = useState("active")
  const [overrideReason, setOverrideReason] = useState("")

  const handleWorkspaceSearch = async (e) => {
    const q = e.target.value
    setWorkspaceQuery(q)
    if (!q.trim()) {
      setWorkspaceSearchResults([])
      return
    }
    try {
      const results = await api.searchWorkspaces(q)
      setWorkspaceSearchResults(results || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectWorkspace = async (ws) => {
    setSelectedWorkspace(ws)
    setWorkspaceSearchResults([])
    setWorkspaceQuery(ws.name)
    await loadWorkspaceDetails(ws.id)
  }

  const loadWorkspaceDetails = async (wsId) => {
    try {
      setActionLoading(true)
      setError(null)
      const details = await api.getWorkspaceBillingDetail(wsId)
      setSelectedWorkspaceDetails(details)
      
      // Load Sub Tables
      await loadCreditLedger(wsId, 1)
      
      const recharges = await api.getWccRechargeLogs(wsId)
      setWccRecharges(recharges || [])
      
      const txs = await api.getWccTransactions(wsId)
      setWccTransactions(txs || [])
    } catch (err) {
      setError(err.message || "Failed to load workspace details")
    } finally {
      setActionLoading(false)
    }
  }

  const loadCreditLedger = async (wsId, page) => {
    try {
      const ledger = await api.getWorkspaceLedger(wsId, page, 10)
      setCreditLogs(ledger.entries || [])
      setCreditLogsTotal(ledger.total || 0)
      setCreditLogsPage(page)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAdjustCredits = async (e) => {
    e.preventDefault()
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        credits: parseFloat(creditAmount),
        reason: creditReason
      }
      
      const res = await api.adjustCredits(selectedWorkspace.id, payload)
      setSuccess(res.message || "Credits adjusted successfully")
      setCreditAmount("")
      setCreditReason("")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to adjust credits")
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetCredits = async () => {
    if (!selectedWorkspace || !confirm("Are you sure you want to reset credits to 0?")) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.resetCredits(selectedWorkspace.id)
      setSuccess("Credits reset successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to reset credits")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRenewCredits = async () => {
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.renewPlanCredits(selectedWorkspace.id)
      setSuccess(res.message || "Plan credits renewed successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to renew plan credits")
    } finally {
      setActionLoading(false)
    }
  }

  const handleExpireCredits = async () => {
    if (!selectedWorkspace || !confirm("Are you sure you want to expire all remaining credits?")) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.expireCredits(selectedWorkspace.id)
      setSuccess(res.message || "Unused credits expired successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to expire credits")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecalculateCredits = async () => {
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.recalculateCredits(selectedWorkspace.id)
      setSuccess(`${res.message} (Released reservations: ${res.released_reservations})`)
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to recalculate credits")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdjustWallet = async (e) => {
    e.preventDefault()
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        amount: parseFloat(walletAmount),
        reason: walletReason
      }
      
      const res = await api.adjustWallet(selectedWorkspace.id, payload)
      setSuccess(res.message || "Wallet balance adjusted successfully")
      setWalletAmount("")
      setWalletReason("")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to adjust wallet")
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetWallet = async () => {
    if (!selectedWorkspace || !confirm("Are you sure you want to reset WCC wallet balance to 0?")) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.resetWallet(selectedWorkspace.id)
      setSuccess("Wallet reset successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to reset wallet")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecalculateWallet = async () => {
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.recalculateWallet(selectedWorkspace.id)
      setSuccess(res.message || "Wallet balance recalculated successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to recalculate wallet")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOverrideSubscription = async (e) => {
    e.preventDefault()
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        plan_name: overridePlan,
        status: overrideStatus,
        reason: overrideReason
      }
      
      const res = await api.overrideSubscription(selectedWorkspace.id, payload)
      setSuccess(res.message || "Subscription overridden successfully")
      setOverrideReason("")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to override subscription")
    } finally {
      setActionLoading(false)
    }
  }

  const handleProvisionAction = async (action) => {
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.runManualProvisioning(selectedWorkspace.id, action)
      setSuccess(`Provisioning completed successfully: ${action}`)
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || `Provisioning failed: ${action}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Lookup & Overview Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Search size={14} /> Workspace Search
          </h3>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={workspaceQuery}
              onChange={handleWorkspaceSearch}
              placeholder="Search by workspace, owner name or email..."
              className="w-full pl-10 pr-4 py-3 bg-black/45 border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
            
            {workspaceSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-[#080808] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 max-h-60 overflow-y-auto">
                {workspaceSearchResults.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws)}
                    className="p-3.5 text-xs text-left cursor-pointer hover:bg-indigo-600/10 transition-colors"
                  >
                    <div className="font-semibold text-white">{ws.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                      <span>Plan: <span className="text-indigo-400 font-bold uppercase">{ws.plan_type}</span></span>
                      <span>{ws.subscription_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Workspace Card */}
          {selectedWorkspaceDetails ? (
            <div className="space-y-4 pt-4 border-t border-white/5 animate-fade-in">
              <div>
                <div className="text-lg font-bold text-white tracking-tight">{selectedWorkspaceDetails.workspace.name}</div>
                <div className="text-[10px] text-gray-500 mt-1">ID: {selectedWorkspaceDetails.workspace.id}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="text-gray-500 mb-0.5">Plan Type</div>
                  <div className="font-bold text-white uppercase text-xs">{selectedWorkspaceDetails.plan}</div>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="text-gray-500 mb-0.5">Status</div>
                  <div className="font-bold text-white text-xs">{selectedWorkspaceDetails.subscription_status}</div>
                </div>
              </div>

              <div className="p-4 bg-indigo-600/5 border border-indigo-500/15 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="text-gray-400 text-[10px] uppercase font-bold mb-0.5 tracking-wider">AI Credit Balance</div>
                  <div className="text-xl font-bold text-indigo-400">
                    {Number(selectedWorkspaceDetails.credits.balance ?? 0).toLocaleString()} credits
                  </div>
                </div>
                <Coins className="text-indigo-400 opacity-30 w-7 h-7" />
              </div>

              <div className="p-4 bg-purple-600/5 border border-purple-500/15 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="text-gray-400 text-[10px] uppercase font-bold mb-0.5 tracking-wider">WCC Wallet Balance</div>
                  <div className="text-xl font-bold text-purple-400">
                    ₹{Number(selectedWorkspaceDetails.wallet_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <Wallet className="text-purple-400 opacity-30 w-7 h-7" />
              </div>

              <div className="text-xs space-y-2.5 p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl text-gray-400">
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="text-white font-medium">{selectedWorkspaceDetails.workspace.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-white font-medium">{selectedWorkspaceDetails.workspace.owner_email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Cycle:</span>
                  <span className="text-white font-medium uppercase">{selectedWorkspaceDetails.billing_cycle}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-gray-600">
              Search and select a workspace to operate
            </div>
          )}
        </div>

        {/* Provisioning Actions Card */}
        {selectedWorkspaceDetails && (
          <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Database size={14} /> Provisioning Operations
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleProvisionAction("run-orchestrator")}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-all text-center"
              >
                Run Orchestrator
              </button>
              <button
                onClick={() => handleProvisionAction("recreate-credits")}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-all text-center"
              >
                Recreate AI Credits
              </button>
              <button
                onClick={() => handleProvisionAction("recreate-wallet")}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-all text-center"
              >
                Recreate Wallet
              </button>
              <button
                onClick={() => handleProvisionAction("reapply-plan-entitlements")}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-all text-center"
              >
                Reapply Plan
              </button>
              <button
                onClick={() => handleProvisionAction("sync-subscription")}
                className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-all text-center"
              >
                Sync Subscription
              </button>
              <button
                onClick={() => handleProvisionAction("repair-workspace-billing")}
                className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 rounded-xl font-bold transition-all text-center col-span-2"
              >
                Repair Workspace Billing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjustments & Ledger Panels */}
      <div className="lg:col-span-2 space-y-6">
        {selectedWorkspaceDetails ? (
          <>
            {/* Forms Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              
              {/* Credits Adjuster */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Coins size={14} /> AI Credit adjustment
                </h4>
                <form onSubmit={handleAdjustCredits} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Amount (e.g. 50 or -20)"
                      className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="Reason for adjustment..."
                      className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Adjust Balance
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCredits}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </form>
                
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5 text-[10px]">
                  <button
                    onClick={handleRenewCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Trigger Renewal
                  </button>
                  <button
                    onClick={handleExpireCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Expire Credits
                  </button>
                  <button
                    onClick={handleRecalculateCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Recalculate Bal
                  </button>
                </div>
              </div>

              {/* Wallet Adjuster */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Wallet size={14} /> WCC Wallet adjustment
                </h4>
                <form onSubmit={handleAdjustWallet} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="Amount in INR (e.g. 500 or -100)"
                      className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={walletReason}
                      onChange={(e) => setWalletReason(e.target.value)}
                      placeholder="Reason for adjustment..."
                      className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Adjust Balance
                    </button>
                    <button
                      type="button"
                      onClick={handleResetWallet}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </form>

                <div className="pt-2 border-t border-white/5 text-[10px]">
                  <button
                    onClick={handleRecalculateWallet}
                    className="w-full py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Recalculate Wallet Balance
                  </button>
                </div>
              </div>

              {/* Subscription Override Form */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4 md:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Shield size={14} /> Subscription & Entitlement Overrides
                </h4>
                <form onSubmit={handleOverrideSubscription} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Override Plan</label>
                    <select
                      value={overridePlan}
                      onChange={(e) => setOverridePlan(e.target.value)}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="free">Free Plan</option>
                      <option value="pro">Pro Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Override Status</label>
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Reason</label>
                    <input
                      type="text"
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason for manual override..."
                      className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="py-2.5 px-6 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Override Plan Config
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Token Ledger Table */}
            <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Coins size={14} /> AI Token Ledger (Latest)
              </h3>
              
              {creditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-500">
                        <th className="py-2">Date</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Source</th>
                        <th className="py-2 text-right">Delta Credits</th>
                        <th className="py-2 pl-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {creditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2 font-mono text-[10px]">{log.entry_type}</td>
                          <td className="py-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              log.balance_source === "INCLUDED" ? "bg-indigo-900/30 text-indigo-300" : "bg-purple-900/30 text-purple-300"
                            }`}>
                              {log.balance_source}
                            </span>
                          </td>
                          <td className={`py-2 text-right font-bold ${Number(log.credits_delta) < 0 ? "text-red-400" : "text-green-400"}`}>
                            {(() => {
                              const value = Number(log.credits_delta ?? 0);
                              const isDeduction = value < 0;
                              const isZero = Math.abs(value) < 0.0000001;
                              const formatted = value.toLocaleString(undefined, {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4
                              });
                              return `${isDeduction || isZero ? "" : "+"}${formatted}`;
                            })()}
                          </td>
                          <td className="py-2 pl-4 text-gray-400 max-w-xs truncate" title={log.description}>{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">No token ledger logs found</div>
              )}

              {creditLogsTotal > 10 && (
                <div className="flex justify-between items-center pt-2">
                  <button
                    disabled={creditLogsPage <= 1}
                    onClick={() => loadCreditLedger(selectedWorkspace.id, creditLogsPage - 1)}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] disabled:opacity-30 transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] text-gray-500">Page {creditLogsPage} of {Math.ceil(creditLogsTotal / 10)}</span>
                  <button
                    disabled={creditLogsPage * 10 >= creditLogsTotal}
                    onClick={() => loadCreditLedger(selectedWorkspace.id, creditLogsPage + 1)}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] disabled:opacity-30 transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* WCC recharge logs & transactions tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              
              {/* WCC Recharges */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Wallet size={14} /> WCC Recharge Logs
                </h4>
                {wccRecharges.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-500">
                          <th className="py-2">Date</th>
                          <th className="py-2 text-right">Amount</th>
                          <th className="py-2 pl-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {wccRecharges.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-2 text-gray-500" title={new Date(r.created_at).toLocaleString()}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 text-right font-bold text-white">₹{Number(r.amount ?? 0).toFixed(2)}</td>
                            <td className="py-2 pl-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                r.status === "success" ? "bg-green-900/30 text-green-300" : "bg-yellow-900/30 text-yellow-300"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-500">No recharge logs found</div>
                )}
              </div>

              {/* WCC Transactions */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <ArrowRightLeft size={14} /> WCC Transactions
                </h4>
                {wccTransactions.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-500">
                          <th className="py-2">Date</th>
                          <th className="py-2">Cat</th>
                          <th className="py-2 text-right">Debit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {wccTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-2 text-gray-500" title={new Date(tx.created_at).toLocaleString()}>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 font-medium text-white">{tx.category}</td>
                            <td className="py-2 text-right font-bold text-red-400">-₹{Number(tx.debit_amount ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-500">No WCC transactions found</div>
                )}
              </div>

            </div>
          </>
        ) : (
          <div className="p-12 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center text-xs text-gray-500 py-24">
            <Database className="w-12 h-12 text-indigo-500 opacity-20 mb-4 animate-bounce" />
            <div className="font-bold text-white mb-1">No Workspace Selected</div>
            <div>Search for a workspace in the left panel to execute operations, adjust balances, and view transaction records.</div>
          </div>
        )}
      </div>
    </div>
  )
}
