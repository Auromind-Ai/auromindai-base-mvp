"use client"

import React, { useState } from "react"
import { Shield, MessageSquare, Bot, Wrench, FileCode, Send, Sparkles } from "lucide-react"
import api from "@/lib/api"

export default function PlanEntitlementsTab({
  planEntitlements,
  setPlanEntitlements,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [editingEntitlement, setEditingEntitlement] = useState(null)
  const [featureFlags, setFeatureFlags] = useState({})
  const [newFlagKey, setNewFlagKey] = useState("")
  const [showAddFlag, setShowAddFlag] = useState(false)

  const handleEditClick = (ent) => {
    setEditingEntitlement(ent)
    const flags = ent.feature_flags && typeof ent.feature_flags === "object" ? { ...ent.feature_flags } : {}
    if (flags.has_rag === undefined) flags.has_rag = false
    if (flags.has_leads === undefined) flags.has_leads = true
    if (flags.has_gmail === undefined) flags.has_gmail = true
    if (flags.ai_gmail_lead_fallback === undefined) flags.ai_gmail_lead_fallback = false
    if (!Array.isArray(flags.allowed_channels)) {
      flags.allowed_channels = ["whatsapp"]
    }
    if (flags.assistant_limit === undefined) flags.assistant_limit = 1
    if (flags.tool_limit === undefined) flags.tool_limit = 5
    if (flags.template_limit === undefined) flags.template_limit = 5
    if (flags.drip_limit === undefined) flags.drip_limit = 0
    if (flags.monthly_conversations === undefined) flags.monthly_conversations = 1000
    if (flags.broadcast_tier === undefined) flags.broadcast_tier = "none"
    setFeatureFlags(flags)
    setShowAddFlag(false)
    setNewFlagKey("")
  }

  const toggleFeatureFlag = (key) => {
    setFeatureFlags((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleChannel = (channelKey) => {
    setFeatureFlags((prev) => {
      const current = Array.isArray(prev.allowed_channels) ? [...prev.allowed_channels] : []
      let updated
      if (current.includes(channelKey)) {
        updated = current.filter((c) => c !== channelKey)
      } else {
        updated = [...current, channelKey]
      }
      return {
        ...prev,
        allowed_channels: updated
      }
    })
  }

  const updateFlagField = (field, value) => {
    setFeatureFlags((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddCustomFlag = (e) => {
    e.preventDefault()
    const trimmed = newFlagKey.trim().toLowerCase().replace(/\s+/g, "_")
    if (!trimmed) return
    setFeatureFlags((prev) => ({
      ...prev,
      [trimmed]: true
    }))
    setNewFlagKey("")
    setShowAddFlag(false)
  }

  const handleRemoveCustomFlag = (key) => {
    setFeatureFlags((prev) => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  const handleUpdateEntitlement = async (e) => {
    e.preventDefault()
    if (!editingEntitlement) return

    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        included_ai_credits: parseInt(editingEntitlement.included_ai_credits),
        included_wcc_wallet: parseFloat(editingEntitlement.included_wcc_wallet),
        storage_limit_mb: parseInt(editingEntitlement.storage_limit_mb),
        team_limit: parseInt(editingEntitlement.team_limit),
        knowledge_base_limit: parseInt(editingEntitlement.knowledge_base_limit),
        gmail_limit: parseInt(editingEntitlement.gmail_limit),
        lead_limit: parseInt(editingEntitlement.lead_limit),
        meeting_limit: parseInt(editingEntitlement.meeting_limit),
        automation_limit: parseInt(editingEntitlement.automation_limit),
        flow: parseInt(editingEntitlement.flow),
        allow_ai_topup: editingEntitlement.allow_ai_topup ?? true,
        allow_purchased_ai_usage: editingEntitlement.allow_purchased_ai_usage ?? true,
        allow_wcc_recharge: editingEntitlement.allow_wcc_recharge ?? true,
        allow_purchased_wcc_usage: editingEntitlement.allow_purchased_wcc_usage ?? true,
        allow_flow_addon: editingEntitlement.allow_flow_addon ?? true,
        allow_purchased_flow_usage: editingEntitlement.allow_purchased_flow_usage ?? true,
        included_credit_reset_policy: editingEntitlement.included_credit_reset_policy,
        included_wallet_reset_policy: editingEntitlement.included_wallet_reset_policy,
        feature_flags: featureFlags
      }

      await api.updatePlanEntitlementAdmin(editingEntitlement.plan_id, payload)
      setSuccess(`Plan entitlement for "${editingEntitlement.plan_name}" updated successfully`)
      setEditingEntitlement(null)
      
      const entitlements = await api.getPlanEntitlementsAdmin()
      setPlanEntitlements(entitlements)
    } catch (err) {
      setError(err.message || "Failed to update plan entitlement")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Shield size={16} className="text-indigo-400" /> Plan Entitlements &amp; Capability Management
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Single authoritative control for quotas, allowed messaging channels, agent limits, and platform feature gates.
          </p>
        </div>
      </div>

      {planEntitlements.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500">
                <th className="py-2.5">Plan &amp; Channels</th>
                <th className="py-2.5 text-right">AI Credits</th>
                <th className="py-2.5 text-right">WCC Wallet</th>
                <th className="py-2.5 text-right">Team Seats</th>
                <th className="py-2.5 text-right">Agents / Tools</th>
                <th className="py-2.5 text-right">Storage</th>
                <th className="py-2.5 text-right">KB Docs</th>
                <th className="py-2.5 text-right">Leads</th>
                <th className="py-2.5 text-right">Monthly Conv.</th>
                <th className="py-2.5 text-right">Flow Quota</th>
                <th className="py-2.5 text-center">AI Top-up</th>
                <th className="py-2.5 text-center">WCC Recharge</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {planEntitlements.map((ent) => {
                const flags = ent.feature_flags || {}
                const channels = Array.isArray(flags.allowed_channels) ? flags.allowed_channels : []
                const hasWA = channels.includes("whatsapp")
                const hasIG = channels.includes("instagram")
                const hasTwilio = channels.includes("twilio")
                const assistants = flags.assistant_limit !== undefined ? (flags.assistant_limit === -1 ? "∞" : flags.assistant_limit) : "-"
                const tools = flags.tool_limit !== undefined ? (flags.tool_limit === -1 ? "∞" : flags.tool_limit) : "-"

                return (
                  <tr key={ent.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 font-semibold text-white capitalize">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{ent.plan_name}</span>
                      </div>
                      
                      {/* Channel badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-1 font-normal">
                        {hasWA && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            WhatsApp
                          </span>
                        )}
                        {hasIG && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 font-medium">
                            Instagram
                          </span>
                        )}
                        {hasTwilio && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                            Twilio
                          </span>
                        )}
                        {flags.has_rag && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/20">
                            RAG
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 text-right">
                      <span className="font-bold text-white">
                        {Number(ent.included_ai_credits ?? 0).toLocaleString()}
                      </span>
                      <span className="block text-[9px] text-gray-500 uppercase mt-0.5">
                        {ent.included_credit_reset_policy}
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <span className="font-bold text-white">
                        ₹{Number(ent.included_wcc_wallet ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[9px] text-gray-500 uppercase mt-0.5">
                        {ent.included_wallet_reset_policy}
                      </span>
                    </td>

                    <td className="py-3 text-right font-medium">
                      {ent.team_limit === -1 ? "Unlimited" : ent.team_limit}
                    </td>

                    <td className="py-3 text-right font-medium">
                      <span className="text-indigo-300 font-semibold">{assistants} Agents</span>
                      <span className="block text-[9px] text-gray-500">{tools} Tools</span>
                    </td>

                    <td className="py-3 text-right font-medium">{ent.storage_limit_mb} MB</td>
                    
                    <td className="py-3 text-right font-medium">
                      {ent.knowledge_base_limit === -1 ? "Unlimited" : ent.knowledge_base_limit}
                    </td>

                    <td className="py-3 text-right font-medium">
                      {ent.lead_limit === -1 ? "Unlimited" : Number(ent.lead_limit ?? 0).toLocaleString()}
                    </td>

                    <td className="py-3 text-right font-medium text-cyan-300">
                      {flags.monthly_conversations === -1
                        ? "Unlimited"
                        : flags.monthly_conversations !== undefined && flags.monthly_conversations !== null
                        ? Number(flags.monthly_conversations).toLocaleString()
                        : "-"}
                    </td>

                    <td className="py-3 text-right font-bold text-indigo-400">
                      {ent.flow === -1 ? "Unlimited" : ent.flow}
                    </td>

                    <td className="py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ent.allow_ai_topup ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                      }`}>
                        {ent.allow_ai_topup ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ent.allow_wcc_recharge ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                      }`}>
                        {ent.allow_wcc_recharge ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleEditClick(ent)}
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 rounded-lg transition-all font-medium border border-white/10 hover:border-white/20"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">Loading plan entitlements...</div>
      )}

      {/* Entitlement Edit Modal */}
      {editingEntitlement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f13] border border-white/15 rounded-3xl p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl animate-scale-up no-scrollbar">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h4 className="text-base font-bold text-white capitalize flex items-center gap-2">
                  <Shield size={16} className="text-indigo-400" />
                  Edit Entitlements: {editingEntitlement.plan_name} Plan
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Configure core resource limits, supported channels, and feature permissions.
                </p>
              </div>
              <button 
                onClick={() => setEditingEntitlement(null)} 
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateEntitlement} className="space-y-4 text-xs">
              
              {/* 1. Allowed Channels Section */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <label className="block text-[10px] text-indigo-300 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} /> Allowed Messaging Channels
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={Array.isArray(featureFlags.allowed_channels) && featureFlags.allowed_channels.includes("whatsapp")}
                      onChange={() => toggleChannel("whatsapp")}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 bg-black border-white/20"
                    />
                    <span className="text-xs text-white font-medium">WhatsApp</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-fuchsia-500/30 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={Array.isArray(featureFlags.allowed_channels) && featureFlags.allowed_channels.includes("instagram")}
                      onChange={() => toggleChannel("instagram")}
                      className="w-4 h-4 rounded text-fuchsia-500 accent-fuchsia-500 bg-black border-white/20"
                    />
                    <span className="text-xs text-white font-medium">Instagram</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-sky-500/30 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={Array.isArray(featureFlags.allowed_channels) && featureFlags.allowed_channels.includes("twilio")}
                      onChange={() => toggleChannel("twilio")}
                      className="w-4 h-4 rounded text-sky-500 accent-sky-500 bg-black border-white/20"
                    />
                    <span className="text-xs text-white font-medium">Twilio SMS/Voice</span>
                  </label>
                </div>
              </div>

              {/* 2. Core Credits & Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">AI Credits Included</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.included_ai_credits}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_ai_credits: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">AI Credit Reset Policy</label>
                  <select
                    value={editingEntitlement.included_credit_reset_policy}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_credit_reset_policy: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EXPIRE">EXPIRE (Monthly Fresh Allocation)</option>
                    <option value="ROLLOVER">ROLLOVER (Accumulate Unused)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">WCC Wallet Included (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingEntitlement.included_wcc_wallet}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_wcc_wallet: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">WCC Wallet Reset Policy</label>
                  <select
                    value={editingEntitlement.included_wallet_reset_policy}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_wallet_reset_policy: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EXPIRE">EXPIRE (Monthly Fresh Allocation)</option>
                    <option value="ROLLOVER">ROLLOVER (Accumulate Unused)</option>
                  </select>
                </div>
              </div>

              {/* 3. AI Agents & Advanced Capability Limits */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <label className="block text-[10px] text-indigo-300 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                  <Bot size={13} /> AI Agents, Tools &amp; Broadcast Quotas
                </label>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Assistants Limit (-1 = ∞)</label>
                    <input
                      type="number"
                      value={featureFlags.assistant_limit ?? 1}
                      onChange={(e) => updateFlagField("assistant_limit", parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Tools Limit (-1 = ∞)</label>
                    <input
                      type="number"
                      value={featureFlags.tool_limit ?? 5}
                      onChange={(e) => updateFlagField("tool_limit", parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Meta Templates (-1 = ∞)</label>
                    <input
                      type="number"
                      value={featureFlags.template_limit ?? 5}
                      onChange={(e) => updateFlagField("template_limit", parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Drip Campaigns Limit</label>
                    <input
                      type="number"
                      value={featureFlags.drip_limit ?? 0}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10)
                        updateFlagField("drip_limit", Number.isNaN(parsed) ? 0 : parsed)
                      }}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Monthly Conv. (-1 = ∞)</label>
                    <input
                      type="number"
                      value={featureFlags.monthly_conversations ?? 1000}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10)
                        updateFlagField("monthly_conversations", Number.isNaN(parsed) ? 0 : parsed)
                      }}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Broadcast Speed / Queue</label>
                    <select
                      value={featureFlags.broadcast_tier || "none"}
                      onChange={(e) => updateFlagField("broadcast_tier", e.target.value)}
                      className="w-full p-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-white focus:border-indigo-500 text-xs"
                    >
                      <option value="none">None (Standard Replies Only)</option>
                      <option value="manual_100_day">Manual 100/day</option>
                      <option value="standard_batch">Standard Batch Queue</option>
                      <option value="high_volume_scheduler">High-Volume Scheduler</option>
                      <option value="priority_queue">Priority Queue Throughput</option>
                      <option value="dedicated_high_tps">Dedicated High-TPS Queue</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Core Resource Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Team Size Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.team_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, team_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Storage Limit (MB)</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.storage_limit_mb}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, storage_limit_mb: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">KB Docs Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.knowledge_base_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, knowledge_base_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Lead Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.lead_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, lead_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Flow Quota (MAC)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingEntitlement.flow}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, flow: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Automation Rules</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.automation_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, automation_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Gmail Account Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.gmail_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, gmail_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Meeting Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.meeting_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, meeting_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 5. Purchase Permissions */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-gray-400 uppercase font-bold">Purchase &amp; Top-up Permissions</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">AI Top-ups</span>
                    <input
                      type="checkbox"
                      checked={editingEntitlement.allow_ai_topup ?? true}
                      onChange={(e) => setEditingEntitlement({ ...editingEntitlement, allow_ai_topup: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">WCC Recharge</span>
                    <input
                      type="checkbox"
                      checked={editingEntitlement.allow_wcc_recharge ?? true}
                      onChange={(e) => setEditingEntitlement({ ...editingEntitlement, allow_wcc_recharge: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">Flow Add-ons</span>
                    <input
                      type="checkbox"
                      checked={editingEntitlement.allow_flow_addon ?? true}
                      onChange={(e) => setEditingEntitlement({ ...editingEntitlement, allow_flow_addon: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* 6. General Feature Flags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-gray-400 uppercase font-bold">
                    Module Access Toggles
                  </label>
                  {!showAddFlag ? (
                    <button
                      type="button"
                      onClick={() => setShowAddFlag(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      + Add Custom Flag
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">RAG Brain</span>
                    <input
                      type="checkbox"
                      checked={Boolean(featureFlags.has_rag)}
                      onChange={() => toggleFeatureFlag("has_rag")}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">Leads Access</span>
                    <input
                      type="checkbox"
                      checked={Boolean(featureFlags.has_leads)}
                      onChange={() => toggleFeatureFlag("has_leads")}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">Gmail Access</span>
                    <input
                      type="checkbox"
                      checked={Boolean(featureFlags.has_gmail)}
                      onChange={() => toggleFeatureFlag("has_gmail")}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <span className="text-gray-300">AI Lead Fallback</span>
                    <input
                      type="checkbox"
                      checked={Boolean(featureFlags.ai_gmail_lead_fallback)}
                      onChange={() => toggleFeatureFlag("ai_gmail_lead_fallback")}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                    />
                  </div>

                  {/* Any custom dynamic feature flags */}
                  {Object.keys(featureFlags)
                    .filter((k) => ![
                      "has_rag",
                      "has_leads",
                      "has_gmail",
                      "ai_gmail_lead_fallback",
                      "allowed_channels",
                      "assistant_limit",
                      "tool_limit",
                      "template_limit",
                      "drip_limit",
                      "broadcast_tier",
                      "lead_scoring",
                      "lead_enrichment",
                      "monthly_conversations",
                      "monthly_automation_triggers",
                      "crm_pipeline_tier",
                      "flow_limit",
                    ].includes(k))
                    .map((k) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]"
                      >
                        <span className="text-gray-300 capitalize truncate pr-1" title={k}>
                          {k.replace(/^has_/, "").replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={Boolean(featureFlags[k])}
                            onChange={() => toggleFeatureFlag(k)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 bg-black border-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomFlag(k)}
                            className="text-gray-500 hover:text-red-400 text-xs px-0.5 leading-none transition-colors"
                            title="Remove flag"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {showAddFlag && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. custom_feature or has_analytics"
                      value={newFlagKey}
                      onChange={(e) => setNewFlagKey(e.target.value)}
                      className="flex-1 p-2 bg-black border border-white/[0.08] rounded-xl text-white text-[11px] focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomFlag}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-semibold transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddFlag(false)
                        setNewFlagKey("")
                      }}
                      className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[11px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 text-xs cursor-pointer"
                >
                  Save Entitlement Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
