"use client"

import React, { useState } from "react"
import { Wallet } from "lucide-react"
import api from "@/lib/api"

export default function RateCardsTab({
  rateCards,
  setRateCards,
  setError,
  setSuccess,
  setActionLoading
}) {
  const [editingCardId, setEditingCardId] = useState(null)
  const [editMetaCost, setEditMetaCost] = useState("")
  const [editCustomerPrice, setEditCustomerPrice] = useState("")

  const handleUpdateRateCard = async (card, newMeta, newCust, active) => {
    const metaVal = newMeta !== undefined ? parseFloat(newMeta) : parseFloat(card.meta_cost)
    const custVal = newCust !== undefined ? parseFloat(newCust) : parseFloat(card.customer_price)
    
    // UI Validation checks matching database check constraint limits
    if (custVal < metaVal) {
      setError("Customer Price must be greater than or equal to Meta Cost")
      return
    }
    if (custVal <= 0) {
      setError("Customer Price must be strictly positive")
      return
    }
    if (metaVal < 0) {
      setError("Meta Cost must be non-negative")
      return
    }
    if (custVal > 1000 || metaVal > 1000) {
      setError("Pricing values cannot exceed ₹1000.00")
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.updateWccRateCardAdmin(card.id, {
        meta_cost: metaVal,
        customer_price: custVal,
        is_active: active
      })
      setSuccess("WCC Rate card updated successfully")
      const rates = await api.getWccRateCardsAdmin()
      setRateCards(rates)
      setEditingCardId(null)
    } catch (err) {
      setError(err.message || "Failed to update rate card")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
        <Wallet size={14} /> WCC Rate Cards Configuration
      </h3>

      {rateCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rateCards.map((card) => {
            const profit = (card.customer_price - card.meta_cost).toFixed(4)
            const margin = card.customer_price > 0 
              ? (((card.customer_price - card.meta_cost) / card.customer_price) * 100).toFixed(2) 
              : "0.00"
            
            const isEditing = editingCardId === card.id

            return (
              <div
                key={card.id}
                className="p-6 bg-[#070707] border border-white/[0.06] rounded-2xl flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-white capitalize">{card.category} Card</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Region: {card.region}</div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (card.is_active) {
                        handleUpdateRateCard(card, undefined, undefined, false)
                      } else {
                        handleUpdateRateCard(card, undefined, undefined, true)
                      }
                    }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                      card.is_active 
                        ? "bg-green-900/30 text-green-300 hover:bg-green-800/40" 
                        : "bg-red-900/30 text-red-300 hover:bg-red-800/40"
                    }`}
                  >
                    {card.is_active ? "Active" : "Disabled"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Meta Cost</span>
                    {isEditing ? (
                      <div className="flex items-center bg-black border border-white/10 rounded-xl px-2 py-1">
                        <span className="text-xs text-gray-500 mr-1">₹</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={editMetaCost}
                          onChange={(e) => setEditMetaCost(e.target.value)}
                          className="w-full bg-transparent text-xs text-white font-extrabold focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-white">₹{card.meta_cost.toFixed(4)}</div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Customer Price</span>
                    {isEditing ? (
                      <div className="flex items-center bg-black border border-white/10 rounded-xl px-2 py-1">
                        <span className="text-xs text-gray-500 mr-1">₹</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={editCustomerPrice}
                          onChange={(e) => setEditCustomerPrice(e.target.value)}
                          className="w-full bg-transparent text-xs text-white font-extrabold focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-white">₹{card.customer_price.toFixed(4)}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/[0.03] rounded-xl p-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Dynamic Profit</span>
                    <span className="text-xs font-extrabold text-emerald-400">₹{profit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Platform Margin</span>
                    <span className="text-xs font-extrabold text-indigo-400">{margin}%</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingCardId(null)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateRateCard(card, editMetaCost, editCustomerPrice, card.is_active)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md transition-all"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCardId(card.id)
                        setEditMetaCost(card.meta_cost.toString())
                        setEditCustomerPrice(card.customer_price.toString())
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      Edit Pricing
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">Loading rate cards...</div>
      )}
    </div>
  )
}
