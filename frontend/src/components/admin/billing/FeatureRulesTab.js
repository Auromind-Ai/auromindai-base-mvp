"use client"

import React, { useState } from "react"
import { Settings } from "lucide-react"
import api from "@/lib/api"

export default function FeatureRulesTab({
  featureRules,
  setFeatureRules,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [editingRule, setEditingRule] = useState(null)

  const handleUpdateRule = async (e) => {
    e.preventDefault()
    if (!editingRule) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        credit_cost: parseFloat(editingRule.credit_cost),
        billing_type: editingRule.billing_type,
        unit_value: parseInt(editingRule.unit_value),
        is_active: editingRule.is_active
      }
      
      await api.updateFeatureRuleAdmin(editingRule.id, payload)
      setSuccess("Feature billing rule updated successfully")
      setEditingRule(null)
      const rules = await api.getFeatureRulesAdmin()
      setFeatureRules(rules)
    } catch (err) {
      setError(err.message || "Failed to update feature rule")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
        <Settings size={14} /> Feature Billing Rules
      </h3>

      {featureRules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500">
                <th className="py-2">Feature Name</th>
                <th className="py-2">Key</th>
                <th className="py-2">Billing Type</th>
                <th className="py-2 text-right">Unit Value</th>
                <th className="py-2 text-right">Cost (Credits)</th>
                <th className="py-2 pl-4">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {featureRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 font-semibold text-white">{rule.feature_name}</td>
                  <td className="py-3 font-mono text-[10px] text-gray-500">{rule.feature_key}</td>
                  <td className="py-3 uppercase font-medium">{rule.billing_type}</td>
                  <td className="py-3 text-right">{rule.unit_value}</td>
                  <td className="py-3 text-right font-bold text-white">{Number(rule.credit_cost ?? 0).toFixed(4)}</td>
                  <td className="py-3 pl-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      rule.is_active ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                    }`}>
                      {rule.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 rounded-lg transition-all"
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
        <div className="text-center py-6 text-xs text-gray-500">No feature billing rules found</div>
      )}

      {/* Rule Edit Modal/Drawer */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Edit Feature Rule: {editingRule.feature_name}</h4>
              <button onClick={() => setEditingRule(null)} className="text-gray-500 hover:text-white text-xs">Close</button>
            </div>
            
            <form onSubmit={handleUpdateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Credit Cost</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={editingRule.credit_cost}
                  onChange={(e) => setEditingRule({ ...editingRule, credit_cost: e.target.value })}
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Billing Type</label>
                <select
                  value={editingRule.billing_type}
                  onChange={(e) => setEditingRule({ ...editingRule, billing_type: e.target.value })}
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                >
                  <option value="FLAT">FLAT</option>
                  <option value="TOKEN">TOKEN</option>
                  <option value="PER_MB">PER_MB</option>
                  <option value="PER_MINUTE">PER_MINUTE</option>
                  <option value="PER_REQUEST">PER_REQUEST</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Unit Value</label>
                <input
                  type="number"
                  required
                  value={editingRule.unit_value}
                  onChange={(e) => setEditingRule({ ...editingRule, unit_value: e.target.value })}
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-400">Rule Enabled</span>
                <input
                  type="checkbox"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Save Rule Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
