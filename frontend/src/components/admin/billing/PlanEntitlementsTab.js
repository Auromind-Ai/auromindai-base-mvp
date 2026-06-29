"use client"

import React, { useState } from "react"
import { Shield } from "lucide-react"
import api from "@/lib/api"

export default function PlanEntitlementsTab({
  planEntitlements,
  setPlanEntitlements,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [editingEntitlement, setEditingEntitlement] = useState(null)
  const [featureFlagsStr, setFeatureFlagsStr] = useState("{}")

  const handleEditClick = (ent) => {
    setEditingEntitlement(ent)
    setFeatureFlagsStr(JSON.stringify(ent.feature_flags ?? {}, null, 2))
  }

  const handleUpdateEntitlement = async (e) => {
    e.preventDefault()
    if (!editingEntitlement) return
    
    let flags = {}
    try {
      flags = JSON.parse(featureFlagsStr)
    } catch (err) {
      setError("Invalid JSON format for Feature Flags. Must be valid JSON object.")
      return
    }

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
        allow_ai_topup: editingEntitlement.allow_ai_topup,
        allow_wcc_recharge: editingEntitlement.allow_wcc_recharge,
        included_credit_reset_policy: editingEntitlement.included_credit_reset_policy,
        included_wallet_reset_policy: editingEntitlement.included_wallet_reset_policy,
        feature_flags: flags
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
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
        <Shield size={14} /> Plan Entitlements
      </h3>

      {planEntitlements.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500">
                <th className="py-2">Plan</th>
                <th className="py-2 text-right">AI Credits</th>
                <th className="py-2 text-right">WCC Wallet</th>
                <th className="py-2 text-right">Team</th>
                <th className="py-2 text-right">Storage</th>
                <th className="py-2 text-right">KB</th>
                <th className="py-2 text-right">Gmail</th>
                <th className="py-2 text-right">Leads</th>
                <th className="py-2 text-right">Meetings</th>
                <th className="py-2 text-right">Automation</th>
                <th className="py-2 text-right">Flow Quota</th>
                <th className="py-2 text-center">AI Top-up</th>
                <th className="py-2 text-center">WCC Recharge</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {planEntitlements.map((ent) => (
                <tr key={ent.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 font-semibold text-white capitalize">{ent.plan_name}</td>
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
                  <td className="py-3 text-right font-medium">{ent.team_limit}</td>
                  <td className="py-3 text-right font-medium">{ent.storage_limit_mb} MB</td>
                  <td className="py-3 text-right font-medium">{ent.knowledge_base_limit}</td>
                  <td className="py-3 text-right font-medium">{ent.gmail_limit}</td>
                  <td className="py-3 text-right font-medium">{Number(ent.lead_limit ?? 0).toLocaleString()}</td>
                  <td className="py-3 text-right font-medium">{ent.meeting_limit}</td>
                  <td className="py-3 text-right font-medium">{ent.automation_limit}</td>
                  <td className="py-3 text-right font-bold text-indigo-400">{ent.flow}</td>
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
                      className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 rounded-lg transition-all font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">Loading plan entitlements...</div>
      )}

      {/* Entitlement Edit Modal */}
      {editingEntitlement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up no-scrollbar">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white capitalize">
                Edit Entitlements: {editingEntitlement.plan_name} Plan
              </h4>
              <button onClick={() => setEditingEntitlement(null)} className="text-gray-500 hover:text-white text-xs">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleUpdateEntitlement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">AI Credits Included</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.included_ai_credits}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_ai_credits: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">AI Credit Reset Policy</label>
                  <select
                    value={editingEntitlement.included_credit_reset_policy}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_credit_reset_policy: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  >
                    <option value="EXPIRE">EXPIRE</option>
                    <option value="ROLLOVER">ROLLOVER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">WCC Wallet Included (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingEntitlement.included_wcc_wallet}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_wcc_wallet: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">WCC Wallet Reset Policy</label>
                  <select
                    value={editingEntitlement.included_wallet_reset_policy}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, included_wallet_reset_policy: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  >
                    <option value="EXPIRE">EXPIRE</option>
                    <option value="ROLLOVER">ROLLOVER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Storage Limit (MB)</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.storage_limit_mb}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, storage_limit_mb: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Team Size Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.team_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, team_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Knowledge Base Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.knowledge_base_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, knowledge_base_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Gmail Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.gmail_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, gmail_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Lead Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.lead_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, lead_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Meeting Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.meeting_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, meeting_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Automation Limit</label>
                  <input
                    type="number"
                    required
                    value={editingEntitlement.automation_limit}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, automation_limit: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Flow Quota</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingEntitlement.flow}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, flow: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-gray-400">Allow AI Top-ups</span>
                  <input
                    type="checkbox"
                    checked={editingEntitlement.allow_ai_topup}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, allow_ai_topup: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10"
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-gray-400">Allow WCC Recharges</span>
                  <input
                    type="checkbox"
                    checked={editingEntitlement.allow_wcc_recharge}
                    onChange={(e) => setEditingEntitlement({ ...editingEntitlement, allow_wcc_recharge: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">
                  Feature Flags (JSON Object)
                </label>
                <textarea
                  required
                  rows={4}
                  value={featureFlagsStr}
                  onChange={(e) => setFeatureFlagsStr(e.target.value)}
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white font-mono text-[11px] focus:outline-none"
                  placeholder='{\n  "custom_feature": true\n}'
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Save Entitlement Settings
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
