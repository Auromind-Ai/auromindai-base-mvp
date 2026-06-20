"use client"

import React from "react"
import { Wallet } from "lucide-react"
import api from "@/lib/api"

export default function RateCardsTab({
  rateCards,
  setRateCards,
  setError,
  setSuccess,
  setActionLoading
}) {
  const handleUpdateRateCard = async (id, rate, active) => {
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      await api.updateWccRateCardAdmin(id, {
        rate_per_message: parseFloat(rate),
        is_active: active
      })
      setSuccess("Rate card updated successfully")
      const rates = await api.getWccRateCardsAdmin()
      setRateCards(rates)
    } catch (err) {
      setError(err.message || "Failed to update rate card")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6 animate-fade-in">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
        <Wallet size={14} /> WCC Rate Cards (INR Per Message)
      </h3>

      {rateCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rateCards.map((card) => (
            <div
              key={card.id}
              className="p-6 bg-[#070707] border border-white/[0.06] rounded-2xl flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-sm font-bold text-white capitalize">{card.category} Card</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Region: {card.region}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-black border border-white/10 rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-gray-500 mr-1.5">₹</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue={card.rate_per_message}
                    onBlur={(e) => handleUpdateRateCard(card.id, e.target.value, card.is_active)}
                    className="w-16 bg-transparent text-xs text-white font-extrabold focus:outline-none text-right"
                  />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  card.is_active ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                }`}>
                  {card.is_active ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">Loading rate cards...</div>
      )}
    </div>
  )
}
