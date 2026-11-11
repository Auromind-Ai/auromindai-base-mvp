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
import { useToast } from "@/context/ToastContext"

export default function WorkspaceTab({
  setError,
  setSuccess,
  setActionLoading
}) {
  const { showConfirm, showToast } = useToast()
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

  // Target Pool States
  const [creditTarget, setCreditTarget] = useState("purchased")
  const [walletTarget, setWalletTarget] = useState("purchased")

  // Operation Inputs
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")
  
  const [walletAmount, setWalletAmount] = useState("")
  const [walletReason, setWalletReason] = useState("")

  const [overridePlan, setOverridePlan] = useState("")
  const [overrideStatus, setOverrideStatus] = useState("active")
  const [overrideReason, setOverrideReason] = useState("")
  const [availablePlans, setAvailablePlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true)
        const plans = await api.getPlanEntitlementsAdmin()
        if (plans && Array.isArray(plans) && plans.length > 0) {
          setAvailablePlans(plans)
          setOverridePlan(plans[0].plan_name.toLowerCase())
        }
      } catch (err) {
        console.error("Failed to load available plans from database:", err)
      } finally {
        setPlansLoading(false)
      }
    }
    fetchPlans()
  }, [])

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
        reason: creditReason,
        target: creditTarget
      }
      
      const res = await api.adjustCredits(selectedWorkspace.id, payload)
      setSuccess(res.message || `${creditTarget === "included" ? "Included" : "Purchased"} credits adjusted successfully`)
      showToast(res.message || "Credits adjusted successfully", "success")
      setCreditAmount("")
      setCreditReason("")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to adjust credits")
      showToast(err.message || "Failed to adjust credits", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetCredits = async (target = creditTarget) => {
    if (!selectedWorkspace) return
    const targetLabel = target === "all" ? "All (Included + Purchased)" : (target === "included" ? "Included" : "Purchased")
    showConfirm({
      title: `Reset ${targetLabel} Credits`,
      message: `Are you sure you want to reset ${targetLabel.toLowerCase()} credits to 0?`,
      confirmText: `Reset ${targetLabel}`,
      type: "danger",
      onConfirm: async () => {
        try {
          setActionLoading(true)
          setError(null)
          setSuccess(null)
          const res = await api.resetCredits(selectedWorkspace.id, target)
          setSuccess(res.message || `${targetLabel} credits reset successfully`)
          showToast(res.message || `${targetLabel} credits reset successfully`, "success")
          await loadWorkspaceDetails(selectedWorkspace.id)
        } catch (err) {
          setError(err.message || "Failed to reset credits")
          showToast(err.message || "Failed to reset credits", "error")
        } finally {
          setActionLoading(false)
        }
      }
    })
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
    if (!selectedWorkspace) return
    showConfirm({
      title: "Expire Remaining Credits",
      message: "Are you sure you want to expire all remaining credits?",
      confirmText: "Expire Credits",
      type: "danger",
      onConfirm: async () => {
        try {
          setActionLoading(true)
          setError(null)
          setSuccess(null)
          const res = await api.expireCredits(selectedWorkspace.id)
          setSuccess(res.message || "Unused credits expired successfully")
          showToast(res.message || "Unused credits expired successfully", "success")
          await loadWorkspaceDetails(selectedWorkspace.id)
        } catch (err) {
          setError(err.message || "Failed to expire credits")
          showToast(err.message || "Failed to expire credits", "error")
        } finally {
          setActionLoading(false)
        }
      }
    })
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
        reason: walletReason,
        target: walletTarget
      }
      
      const res = await api.adjustWallet(selectedWorkspace.id, payload)
      setSuccess(res.message || `${walletTarget === "included" ? "Included" : "Purchased"} wallet adjusted successfully`)
      showToast(res.message || "Wallet adjusted successfully", "success")
      setWalletAmount("")
      setWalletReason("")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to adjust wallet")
      showToast(err.message || "Failed to adjust wallet", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetWallet = async (target = walletTarget) => {
    if (!selectedWorkspace) return
    const targetLabel = target === "all" ? "All (Included + Purchased)" : (target === "included" ? "Included Promo" : "Purchased")
    showConfirm({
      title: `Reset ${targetLabel} Wallet`,
      message: `Are you sure you want to reset ${targetLabel.toLowerCase()} balance to ₹0.00?`,
      confirmText: `Reset ${targetLabel}`,
      type: "danger",
      onConfirm: async () => {
        try {
          setActionLoading(true)
          setError(null)
          setSuccess(null)
          const res = await api.resetWallet(selectedWorkspace.id, target)
          setSuccess(res.message || `${targetLabel} wallet reset successfully`)
          showToast(res.message || `${targetLabel} wallet reset successfully`, "success")
          await loadWorkspaceDetails(selectedWorkspace.id)
        } catch (err) {
          setError(err.message || "Failed to reset wallet")
          showToast(err.message || "Failed to reset wallet", "error")
        } finally {
          setActionLoading(false)
        }
      }
    })
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

  // Resource Usage Overrides state
  const [aiOverride, setAiOverride] = React.useState("null")
  const [wccOverride, setWccOverride] = React.useState("null")
  const [flowOverride, setFlowOverride] = React.useState("null")

  React.useEffect(() => {
    if (selectedWorkspaceDetails?.workspace) {
      const ws = selectedWorkspaceDetails.workspace
      setAiOverride(ws.override_allow_purchased_ai_usage === true ? "true" : (ws.override_allow_purchased_ai_usage === false ? "false" : "null"))
      setWccOverride(ws.override_allow_purchased_wcc_usage === true ? "true" : (ws.override_allow_purchased_wcc_usage === false ? "false" : "null"))
      setFlowOverride(ws.override_allow_purchased_flow_usage === true ? "true" : (ws.override_allow_purchased_flow_usage === false ? "false" : "null"))
    }
  }, [selectedWorkspaceDetails])

  const handleSaveResourceOverrides = async (e) => {
    e.preventDefault()
    if (!selectedWorkspace) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const payload = {
        override_allow_purchased_ai_usage: aiOverride === "true" ? true : (aiOverride === "false" ? false : null),
        override_allow_purchased_wcc_usage: wccOverride === "true" ? true : (wccOverride === "false" ? false : null),
        override_allow_purchased_flow_usage: flowOverride === "true" ? true : (flowOverride === "false" ? false : null),
      }
      await api.updateWorkspaceResourceOverrides(selectedWorkspace.id, payload)
      setSuccess("Workspace resource usage overrides updated successfully")
      await loadWorkspaceDetails(selectedWorkspace.id)
    } catch (err) {
      setError(err.message || "Failed to update resource overrides")
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

              {/* AI Credits Overview */}
              <div className="p-4 bg-indigo-600/5 border border-indigo-500/15 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-gray-400 text-[10px] uppercase font-bold mb-0.5 tracking-wider">Total AI Credits Available</div>
                    <div className="text-xl font-bold text-indigo-400">
                      {Number(selectedWorkspaceDetails.credits?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credits
                    </div>
                  </div>
                  <Coins className="text-indigo-400 opacity-30 w-7 h-7" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-500/10 text-[11px]">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-gray-400 block text-[10px]">Included Remaining</span>
                    <span className="font-semibold text-white">
                      {Number(selectedWorkspaceDetails.credits?.included_remaining ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-gray-400 block text-[10px]">Purchased Remaining</span>
                    <span className="font-semibold text-emerald-400">
                      {Number(selectedWorkspaceDetails.credits?.purchased_remaining ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 flex justify-between px-1">
                  <span>Used this cycle: <span className="text-white font-medium">{Number(selectedWorkspaceDetails.credits?.cycle_used ?? 0).toFixed(2)}</span></span>
                  <span>Total quota: <span className="text-white font-medium">{Number(selectedWorkspaceDetails.credits?.quota_limit ?? 0).toLocaleString()}</span></span>
                </div>
              </div>

              {/* WCC Wallet Overview */}
              <div className="p-4 bg-purple-600/5 border border-purple-500/15 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-gray-400 text-[10px] uppercase font-bold mb-0.5 tracking-wider">WCC Wallet Total Balance</div>
                    <div className="text-xl font-bold text-purple-400">
                      ₹{Number(selectedWorkspaceDetails.wallet_balance ?? selectedWorkspaceDetails.wallet?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Wallet className="text-purple-400 opacity-30 w-7 h-7" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-500/10 text-[11px]">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-gray-400 block text-[10px]">Included Promo WCC</span>
                    <span className="font-semibold text-white">
                      ₹{Number(selectedWorkspaceDetails.wallet?.included_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-gray-400 block text-[10px]">Purchased WCC</span>
                    <span className="font-semibold text-emerald-400">
                      ₹{Number(selectedWorkspaceDetails.wallet?.purchased_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Coins size={14} /> AI Credit Management
                  </h4>
                  {/* Pool Selector Tabs */}
                  <div className="flex p-0.5 bg-black/50 border border-white/10 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCreditTarget("purchased")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        creditTarget === "purchased"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Purchased
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditTarget("included")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        creditTarget === "included"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Included
                    </button>
                  </div>
                </div>

                {/* Pool Context Banner */}
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] flex items-center justify-between">
                  <span className="text-gray-300">
                    Target: <span className="font-bold text-white capitalize">{creditTarget} Credits</span>
                  </span>
                  <span className="font-mono text-indigo-300 font-bold">
                    Current: {Number(
                      creditTarget === "included"
                        ? (selectedWorkspaceDetails?.credits?.included_remaining ?? 0)
                        : (selectedWorkspaceDetails?.credits?.purchased_remaining ?? 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <form onSubmit={handleAdjustCredits} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder={`Amount to ${creditTarget} (e.g. 50 or -20)`}
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
                      Adjust {creditTarget === "included" ? "Included" : "Purchased"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetCredits(creditTarget)}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                      title={`Reset only ${creditTarget} credits to 0`}
                    >
                      Reset {creditTarget === "included" ? "Included" : "Purchased"}
                    </button>
                  </div>
                </form>
                
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5 text-[10px]">
                  <button
                    onClick={() => handleResetCredits("all")}
                    className="py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg transition-all font-semibold"
                    title="Reset all AI credits (Both Included and Purchased)"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={handleRenewCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Renew Plan
                  </button>
                  <button
                    onClick={handleExpireCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Expire Inc
                  </button>
                  <button
                    onClick={handleRecalculateCredits}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Recalculate
                  </button>
                </div>
              </div>

              {/* Wallet Adjuster */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Wallet size={14} /> WCC Wallet Management
                  </h4>
                  {/* Pool Selector Tabs */}
                  <div className="flex p-0.5 bg-black/50 border border-white/10 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setWalletTarget("purchased")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        walletTarget === "purchased"
                          ? "bg-purple-600 text-white shadow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Purchased
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletTarget("included")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        walletTarget === "included"
                          ? "bg-purple-600 text-white shadow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Included (Promo)
                    </button>
                  </div>
                </div>

                {/* Pool Context Banner */}
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] flex items-center justify-between">
                  <span className="text-gray-300">
                    Target: <span className="font-bold text-white capitalize">{walletTarget === "included" ? "Included Promo WCC" : "Purchased WCC"}</span>
                  </span>
                  <span className="font-mono text-purple-300 font-bold">
                    Current: ₹{Number(
                      walletTarget === "included"
                        ? (selectedWorkspaceDetails?.wallet?.included_balance ?? 0)
                        : (selectedWorkspaceDetails?.wallet?.purchased_balance ?? 0)
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <form onSubmit={handleAdjustWallet} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder={`Amount in INR to ${walletTarget === "included" ? "included promo" : "purchased"} (e.g. 500 or -100)`}
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
                      Adjust {walletTarget === "included" ? "Included" : "Purchased"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetWallet(walletTarget)}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                      title={`Reset only ${walletTarget} balance to ₹0.00`}
                    >
                      Reset {walletTarget === "included" ? "Included" : "Purchased"}
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px]">
                  <button
                    onClick={() => handleResetWallet("all")}
                    className="py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg transition-all font-semibold"
                    title="Reset all WCC balance (Both Included and Purchased)"
                  >
                    Reset All WCC
                  </button>
                  <button
                    onClick={handleRecalculateWallet}
                    className="py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                  >
                    Recalculate WCC
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
                      disabled={plansLoading || availablePlans.length === 0}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none disabled:opacity-50"
                    >
                      {plansLoading ? (
                        <option value="">Loading plans from database...</option>
                      ) : availablePlans && availablePlans.length > 0 ? (
                        availablePlans.map((p) => (
                          <option key={p.plan_id || p.id} value={p.plan_name.toLowerCase()}>
                            {p.plan_name.toUpperCase()} Plan ({Number(p.included_ai_credits).toLocaleString()} Credits, ₹{Number(p.included_wcc_wallet).toFixed(2)} WCC)
                          </option>
                        ))
                      ) : (
                        <option value="">No plans found in database</option>
                      )}
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
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                      <option value="past_due">Past Due</option>
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

              {/* Resource Usage Overrides Form */}
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-4 md:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Shield size={14} /> Purchased Resource Usage Overrides (Workspace-Specific)
                </h4>
                <p className="text-xs text-gray-400">
                  Selectively lock or unlock stored/purchased AI credits, WCC balance, and Flow quota for this workspace without altering plan-level entitlements.
                </p>
                <form onSubmit={handleSaveResourceOverrides} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1.5">Purchased AI Credits</label>
                    <select
                      value={aiOverride}
                      onChange={(e) => setAiOverride(e.target.value)}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="null">Inherit Plan (Default)</option>
                      <option value="true">Allow (Unlocked)</option>
                      <option value="false">Deny (Locked)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1.5">Purchased WCC Balance</label>
                    <select
                      value={wccOverride}
                      onChange={(e) => setWccOverride(e.target.value)}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="null">Inherit Plan (Default)</option>
                      <option value="true">Allow (Unlocked)</option>
                      <option value="false">Deny (Locked)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1.5">Purchased Flow Quota</label>
                    <select
                      value={flowOverride}
                      onChange={(e) => setFlowOverride(e.target.value)}
                      className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="null">Inherit Plan (Default)</option>
                      <option value="true">Allow (Unlocked)</option>
                      <option value="false">Deny (Locked)</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="py-2.5 px-6 bg-amber-600/30 border border-amber-500/40 hover:bg-amber-600/40 text-amber-200 rounded-xl text-xs font-bold transition-all"
                    >
                      Save Workspace Overrides
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
                          <td className="py-2 text-[10px]">{log.entry_type}</td>
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
