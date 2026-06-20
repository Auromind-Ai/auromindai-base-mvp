"use client"

import React, { useState } from "react"
import { Coins, Plus } from "lucide-react"
import api from "@/lib/api"

export default function CreditPacksTab({
  creditPacks,
  setCreditPacks,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [showCreatePack, setShowCreatePack] = useState(false)
  const [editingPack, setEditingPack] = useState(null)
  
  const [newPack, setNewPack] = useState({
    pack_id: "",
    name: "",
    amount: "",
    credits: "",
    currency: "INR",
    is_active: true
  })

  const handleCreateCreditPack = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        pack_id: newPack.pack_id,
        name: newPack.name,
        amount: parseFloat(newPack.amount),
        credits: parseInt(newPack.credits),
        currency: newPack.currency,
        is_active: newPack.is_active
      }
      
      await api.createCreditPackAdmin(payload)
      setSuccess("Credit pack created successfully")
      setNewPack({
        pack_id: "",
        name: "",
        amount: "",
        credits: "",
        currency: "INR",
        is_active: true
      })
      setShowCreatePack(false)
      const packs = await api.getCreditPacksAdmin()
      setCreditPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to create credit pack")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateCreditPack = async (e) => {
    e.preventDefault()
    if (!editingPack) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        name: editingPack.name,
        amount: parseFloat(editingPack.amount),
        credits: parseInt(editingPack.credits),
        is_active: editingPack.is_active
      }
      
      await api.updateCreditPackAdmin(editingPack.id, payload)
      setSuccess("Credit pack updated successfully")
      setEditingPack(null)
      const packs = await api.getCreditPacksAdmin()
      setCreditPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to update credit pack")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCreditPack = async (id) => {
    if (!confirm("Are you sure you want to delete this credit pack?")) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.deleteCreditPackAdmin(id)
      setSuccess("Credit pack deleted successfully")
      const packs = await api.getCreditPacksAdmin()
      setCreditPacks(packs)
    } catch (err) {
      setError(err.message || "Failed to delete credit pack")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Coins size={14} /> AI Credit Packs
        </h3>
        <button
          onClick={() => setShowCreatePack(true)}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all font-semibold"
        >
          <Plus size={14} /> Create New Pack
        </button>
      </div>

      {creditPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditPacks.map((pack) => (
            <div
              key={pack.id}
              className="p-5 bg-white/[0.02] border border-white/[0.05] hover:border-white/10 rounded-2xl space-y-4 transition-all relative overflow-hidden group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-white">{pack.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pack.pack_id}</div>
                </div>
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  pack.is_active ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                }`}>
                  {pack.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Credits Awarded</div>
                  <div className="text-lg font-extrabold text-indigo-400">{Number(pack.credits ?? 0).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Price</div>
                  <div className="text-lg font-extrabold text-white">₹{Number(pack.amount ?? 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingPack(pack)}
                  className="text-[10px] text-indigo-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCreditPack(pack.id)}
                  className="text-[10px] text-red-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-gray-500 border border-dashed border-white/10 rounded-2xl">
          No credit packs seeded. Click "Create New Pack" to create one.
        </div>
      )}

      {/* Create Pack modal */}
      {showCreatePack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Create Credit Pack</h4>
              <button onClick={() => setShowCreatePack(false)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
            </div>
            
            <form onSubmit={handleCreateCreditPack} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Pack ID</label>
                <input
                  type="text"
                  required
                  value={newPack.pack_id}
                  onChange={(e) => setNewPack({ ...newPack, pack_id: e.target.value })}
                  placeholder="e.g. credits_500"
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
                    required
                    value={newPack.amount}
                    onChange={(e) => setNewPack({ ...newPack, amount: e.target.value })}
                    placeholder="e.g. 99"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Credits</label>
                  <input
                    type="number"
                    required
                    value={newPack.credits}
                    onChange={(e) => setNewPack({ ...newPack, credits: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Create Credit Pack
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pack modal */}
      {editingPack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Edit Credit Pack: {editingPack.pack_id}</h4>
              <button onClick={() => setEditingPack(null)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
            </div>
            
            <form onSubmit={handleUpdateCreditPack} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Pack Name</label>
                <input
                  type="text"
                  required
                  value={editingPack.name}
                  onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                  className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={editingPack.amount}
                    onChange={(e) => setEditingPack({ ...editingPack, amount: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Credits</label>
                  <input
                    type="number"
                    required
                    value={editingPack.credits}
                    onChange={(e) => setEditingPack({ ...editingPack, credits: e.target.value })}
                    className="w-full p-2.5 bg-black border border-white/[0.08] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-gray-400">Pack Active (Consumers can buy)</span>
                <input
                  type="checkbox"
                  checked={editingPack.is_active}
                  onChange={(e) => setEditingPack({ ...editingPack, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-black border-white/10"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Save Pack Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
