"use client"

import React, { useState } from "react"
import { Workflow, Plus } from "lucide-react"
import api from "@/lib/api"

export default function FlowPacksTab({
  flowPacks,
  setFlowPacks,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [showCreatePack, setShowCreatePack] = useState(false)
  const [editingPackId, setEditingPackId] = useState(null)
  
  const [newPack, setNewPack] = useState({
    pack_id: "",
    name: "",
    flows_count: "",
    price: "",
    currency: "INR",
    display_order: "0",
    is_active: true
  })

  const [editFormData, setEditFormData] = useState({
    name: "",
    flows_count: "",
    price: "",
    currency: "",
    display_order: "",
    is_active: true
  })

  const handleCreateFlowPack = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        pack_id: newPack.pack_id,
        name: newPack.name,
        flows_count: parseInt(newPack.flows_count),
        price: parseFloat(newPack.price),
        currency: newPack.currency,
        display_order: parseInt(newPack.display_order),
        is_active: newPack.is_active
      }
      
      await api.createFlowPackAdmin(payload)
      setSuccess("Flow pack created successfully")
      setNewPack({
        pack_id: "",
        name: "",
        flows_count: "",
        price: "",
        currency: "INR",
        display_order: "0",
        is_active: true
      })
      setShowCreatePack(false)
      const packs = await api.getFlowPacksAdmin()
      setFlowPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to create flow pack")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartEdit = (pack) => {
    setEditingPackId(pack.id)
    setEditFormData({
      name: pack.name,
      flows_count: pack.flows_count,
      price: pack.price,
      currency: pack.currency,
      display_order: pack.display_order,
      is_active: pack.is_active
    })
  }

  const handleUpdateFlowPack = async (id) => {
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        name: editFormData.name,
        flows_count: parseInt(editFormData.flows_count),
        price: parseFloat(editFormData.price),
        currency: editFormData.currency,
        display_order: parseInt(editFormData.display_order),
        is_active: editFormData.is_active
      }
      
      await api.updateFlowPackAdmin(id, payload)
      setSuccess("Flow pack updated successfully")
      setEditingPackId(null)
      const packs = await api.getFlowPacksAdmin()
      setFlowPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to update flow pack")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteFlowPack = async (id) => {
    if (!confirm("Are you sure you want to delete this flow pack?")) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.deleteFlowPackAdmin(id)
      setSuccess("Flow pack deleted successfully")
      const packs = await api.getFlowPacksAdmin()
      setFlowPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to delete flow pack")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Workflow size={14} /> Flow Packs
        </h3>
        <button
          onClick={() => setShowCreatePack(true)}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all font-semibold"
        >
          <Plus size={14} /> Create New Pack
        </button>
      </div>

      {flowPacks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500">
                <th className="py-3 px-4">Pack Name</th>
                <th className="py-3 px-4 text-right">Flows Count</th>
                <th className="py-3 px-4 text-right">Price (₹)</th>
                <th className="py-3 px-4 text-center">Currency</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">Display Order</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {flowPacks.map((pack) => {
                const isEditing = editingPackId === pack.id

                return (
                  <tr key={pack.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Pack Name column */}
                    <td className="py-3 px-4 font-semibold text-white">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            className="p-1.5 bg-black border border-white/10 rounded-lg text-white w-full max-w-[180px] focus:outline-none"
                          />
                          <div className="text-[10px] text-gray-500 font-mono">{pack.pack_id}</div>
                        </div>
                      ) : (
                        <div>
                          <div>{pack.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pack.pack_id}</div>
                        </div>
                      )}
                    </td>

                    {/* Flows Count column */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          required
                          value={editFormData.flows_count}
                          onChange={(e) => setEditFormData({ ...editFormData, flows_count: e.target.value })}
                          className="p-1.5 bg-black border border-white/10 rounded-lg text-white text-right w-20 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-indigo-400">
                          {Number(pack.flows_count ?? 0).toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Price column */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          required
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                          className="p-1.5 bg-black border border-white/10 rounded-lg text-white text-right w-24 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-white">
                          ₹{Number(pack.price ?? 0).toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Currency column */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <input
                          type="text"
                          required
                          value={editFormData.currency}
                          onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                          className="p-1.5 bg-black border border-white/10 rounded-lg text-white text-center w-16 focus:outline-none"
                        />
                      ) : (
                        <span className="uppercase text-gray-400 font-medium">
                          {pack.currency}
                        </span>
                      )}
                    </td>

                    {/* Active status column */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={editFormData.is_active}
                          onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10 focus:ring-0"
                        />
                      ) : (
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          pack.is_active ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                        }`}>
                          {pack.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>

                    {/* Display Order column */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          required
                          value={editFormData.display_order}
                          onChange={(e) => setEditFormData({ ...editFormData, display_order: e.target.value })}
                          className="p-1.5 bg-black border border-white/10 rounded-lg text-white text-center w-16 focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-gray-400">
                          {pack.display_order}
                        </span>
                      )}
                    </td>

                    {/* Actions column */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleUpdateFlowPack(pack.id)}
                            className="text-[10px] text-green-400 hover:text-white px-2.5 py-1 bg-green-950/30 hover:bg-green-900/50 border border-green-800/40 rounded-lg transition-all"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPackId(null)}
                            className="text-[10px] text-gray-400 hover:text-white px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleStartEdit(pack)}
                            className="text-[10px] text-indigo-400 hover:text-white px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFlowPack(pack.id)}
                            className="text-[10px] text-red-400 hover:text-white px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-gray-500 border border-dashed border-white/10 rounded-2xl">
          No flow packs seeded. Click "Create New Pack" to create one.
        </div>
      )}

      {/* Create Pack modal */}
      {showCreatePack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Create Flow Pack</h4>
              <button onClick={() => setShowCreatePack(false)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
            </div>
            
            <form onSubmit={handleCreateFlowPack} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Pack ID</label>
                <input
                  type="text"
                  required
                  value={newPack.pack_id}
                  onChange={(e) => setNewPack({ ...newPack, pack_id: e.target.value })}
                  placeholder="e.g. flow_pack_10"
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Pack Name</label>
                <input
                  type="text"
                  required
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  placeholder="e.g. Starter Pack"
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Price (INR)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newPack.price}
                    onChange={(e) => setNewPack({ ...newPack, price: e.target.value })}
                    placeholder="e.g. 199"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Flows Count</label>
                  <input
                    type="number"
                    required
                    value={newPack.flows_count}
                    onChange={(e) => setNewPack({ ...newPack, flows_count: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Currency</label>
                  <input
                    type="text"
                    required
                    value={newPack.currency}
                    onChange={(e) => setNewPack({ ...newPack, currency: e.target.value })}
                    placeholder="INR"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Display Order</label>
                  <input
                    type="number"
                    required
                    value={newPack.display_order}
                    onChange={(e) => setNewPack({ ...newPack, display_order: e.target.value })}
                    placeholder="0"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-400">Pack Active (Consumers can buy)</span>
                <input
                  type="checkbox"
                  checked={newPack.is_active}
                  onChange={(e) => setNewPack({ ...newPack, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Create Flow Pack
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
