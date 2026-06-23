"use client"

import React, { useState, useEffect } from "react"
import {
  Activity,
  Coins,
  Wallet,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Database,
  ArrowRightLeft,
  Shield
} from "lucide-react"

import api from "@/lib/api"

import WorkspaceTab from "@/components/admin/billing/WorkspaceTab"
import DiagnosticsTab from "@/components/admin/billing/DiagnosticsTab"
import PaymentsTab from "@/components/admin/billing/PaymentsTab"
import FeatureRulesTab from "@/components/admin/billing/FeatureRulesTab"
import CreditPacksTab from "@/components/admin/billing/CreditPacksTab"
import PlanEntitlementsTab from "@/components/admin/billing/PlanEntitlementsTab"
import RateCardsTab from "@/components/admin/billing/RateCardsTab"
import AuditLogsTab from "@/components/admin/billing/AuditLogsTab"

export default function BillingOperationsPage() {
  const [activeTab, setActiveTab] = useState("workspace")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Global Tab Data States (synced in parent to show global loaders)
  const [diagnostics, setDiagnostics] = useState(null)
  const [featureRules, setFeatureRules] = useState([])
  const [creditPacks, setCreditPacks] = useState([])
  const [planEntitlements, setPlanEntitlements] = useState([])
  const [rateCards, setRateCards] = useState([])

  useEffect(() => {
    fetchGlobalData()
  }, [activeTab])

  const fetchGlobalData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (activeTab === "diagnostics") {
        const diag = await api.getBillingDiagnostics()
        setDiagnostics(diag)
      } else if (activeTab === "rules") {
        const rules = await api.getFeatureRulesAdmin()
        setFeatureRules(rules)
      } else if (activeTab === "credit-packs") {
        const packs = await api.getCreditPacksAdmin()
        setCreditPacks(packs)
      } else if (activeTab === "plan-entitlements") {
        const entitlements = await api.getPlanEntitlementsAdmin()
        setPlanEntitlements(entitlements)
      } else if (activeTab === "rate-cards") {
        const rates = await api.getWccRateCardsAdmin()
        setRateCards(rates)
      }
    } catch (err) {
      setError(err.message || "Failed to load tab data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/5">
            <Activity className="text-indigo-400 w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Billing Operations Console
            </h1>
            <p className="text-xs text-gray-500">
              Troubleshoot, repair, and operate the platform billing frameworks
            </p>
          </div>
        </div>

        {/* Global Loading Spinner / Action States */}
        <div className="flex items-center gap-3">
          {(loading || actionLoading) && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing with gateway...</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-shake">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1.5 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: "workspace", name: "Workspace Console", icon: Database },
          { id: "diagnostics", name: "Live Diagnostics", icon: AlertTriangle },
          { id: "payments", name: "Payment Operations", icon: ArrowRightLeft },
          { id: "rules", name: "Feature Billing Rules", icon: Settings },
          { id: "credit-packs", name: "Credit Packs", icon: Coins },
          { id: "plan-entitlements", name: "Plan Entitlements", icon: Shield },
          { id: "rate-cards", name: "WCC Rate Cards", icon: Wallet },
          { id: "audit-logs", name: "Admin Audit Logs", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setError(null)
                setSuccess(null)
              }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <Icon size={14} className={isActive ? "text-white" : "text-gray-400 group-hover:text-white"} />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        {activeTab === "workspace" && (
          <WorkspaceTab
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "diagnostics" && (
          <DiagnosticsTab
            diagnostics={diagnostics}
            setDiagnostics={setDiagnostics}
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsTab
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "rules" && (
          <FeatureRulesTab
            featureRules={featureRules}
            setFeatureRules={setFeatureRules}
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "credit-packs" && (
          <CreditPacksTab
            creditPacks={creditPacks}
            setCreditPacks={setCreditPacks}
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "plan-entitlements" && (
          <PlanEntitlementsTab
            planEntitlements={planEntitlements}
            setPlanEntitlements={setPlanEntitlements}
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "rate-cards" && (
          <RateCardsTab
            rateCards={rateCards}
            setRateCards={setRateCards}
            setError={setError}
            setSuccess={setSuccess}
            setActionLoading={setActionLoading}
          />
        )}

        {activeTab === "audit-logs" && (
          <AuditLogsTab
            setError={setError}
            setActionLoading={setActionLoading}
          />
        )}
      </div>

    </div>
  )
}
