"use client"

import React, { useState } from "react"
import { ArrowRightLeft, Activity } from "lucide-react"
import api from "@/lib/api"

export default function PaymentsTab({
  setError,
  setSuccess,
  setActionLoading
}) {
  const [verifyPaymentId, setVerifyPaymentId] = useState("")
  const [verifyPaymentReason, setVerifyPaymentReason] = useState("")
  const [retryRechargeId, setRetryRechargeId] = useState("")
  const [retryRechargeReason, setRetryRechargeReason] = useState("")
  const [retryCreditPurchaseId, setRetryCreditPurchaseId] = useState("")
  const [retryCreditPurchaseReason, setRetryCreditPurchaseReason] = useState("")
  const [replayWebhookId, setReplayWebhookId] = useState("")
  const [replayWebhookReason, setReplayWebhookReason] = useState("")
  const [retryPaymentId, setRetryPaymentId] = useState("")
  const [retryPaymentReason, setRetryPaymentReason] = useState("")

  const handleManualVerification = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.verifyPaymentManually(verifyPaymentId, verifyPaymentReason)
      setSuccess(res.message || "Payment verified manually")
      setVerifyPaymentId("")
      setVerifyPaymentReason("")
    } catch (err) {
      setError(err.message || "Failed manual payment verification")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryRecharge = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.retryRecharge(retryRechargeId, retryRechargeReason)
      setSuccess(res.message || "Recharge retried and succeeded")
      setRetryRechargeId("")
      setRetryRechargeReason("")
    } catch (err) {
      setError(err.message || "Failed retry recharge")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryCreditPurchase = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.retryCreditPurchase(retryCreditPurchaseId, retryCreditPurchaseReason)
      setSuccess(res.message || "Credit purchase succeeded")
      setRetryCreditPurchaseId("")
      setRetryCreditPurchaseReason("")
    } catch (err) {
      setError(err.message || "Failed credit purchase retry")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReplayWebhook = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.runBillingManualOperation("replay-webhook", {
        target_id: replayWebhookId,
        reason: replayWebhookReason
      })
      setSuccess(res.message || "Webhook replayed successfully")
      setReplayWebhookId("")
      setReplayWebhookReason("")
    } catch (err) {
      setError(err.message || "Failed replay webhook")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryPayment = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const res = await api.runBillingManualOperation("retry-payment", {
        target_id: retryPaymentId,
        reason: retryPaymentReason
      })
      setSuccess(res.message || "Payment retry triggered")
      setRetryPaymentId("")
      setRetryPaymentReason("")
    } catch (err) {
      setError(err.message || "Failed retry payment")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      
      {/* Verify Payment / Webhook operations */}
      <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <ArrowRightLeft size={14} /> Manual Payment Verification
        </h3>
        
        <form onSubmit={handleManualVerification} className="space-y-3">
          <div>
            <input
              type="text"
              required
              value={verifyPaymentId}
              onChange={(e) => setVerifyPaymentId(e.target.value)}
              placeholder="Payment ID / gateway payment reference..."
              className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
            />
          </div>
          <div>
            <input
              type="text"
              required
              value={verifyPaymentReason}
              onChange={(e) => setVerifyPaymentReason(e.target.value)}
              placeholder="Reason for manual verification..."
              className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Verify Payment manually
          </button>
        </form>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <h4 className="text-xs font-bold uppercase text-gray-400">Replay Webhook Event</h4>
          <form onSubmit={handleReplayWebhook} className="space-y-3">
            <div>
              <input
                type="text"
                required
                value={replayWebhookId}
                onChange={(e) => setReplayWebhookId(e.target.value)}
                placeholder="Webhook Event ID (UUID)..."
                className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <input
                type="text"
                required
                value={replayWebhookReason}
                onChange={(e) => setReplayWebhookReason(e.target.value)}
                placeholder="Reason for replaying webhook..."
                className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all"
            >
              Trigger Webhook Replay
            </button>
          </form>
        </div>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <h4 className="text-xs font-bold uppercase text-gray-400">Retry Gateway Payment Status Check</h4>
          <form onSubmit={handleRetryPayment} className="space-y-3">
            <div>
              <input
                type="text"
                required
                value={retryPaymentId}
                onChange={(e) => setRetryPaymentId(e.target.value)}
                placeholder="Payment record ID (UUID)..."
                className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <input
                type="text"
                required
                value={retryPaymentReason}
                onChange={(e) => setRetryPaymentReason(e.target.value)}
                placeholder="Reason for manual verification check retry..."
                className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all"
            >
              Retry Verification
            </button>
          </form>
        </div>
      </div>

      {/* Force Recharge / Force Credit Pack verification */}
      <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Activity size={14} /> Troubleshoot Operations
        </h3>

        <div className="space-y-6">
          {/* Retry Recharge */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-gray-400">Force Succeeded Wallet Recharge</h4>
            <form onSubmit={handleRetryRecharge} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={retryRechargeId}
                  onChange={(e) => setRetryRechargeId(e.target.value)}
                  placeholder="Recharge Log ID (UUID)..."
                  className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={retryRechargeReason}
                  onChange={(e) => setRetryRechargeReason(e.target.value)}
                  placeholder="Reason for overriding recharge status..."
                  className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Retry & Credit Wallet
              </button>
            </form>
          </div>

          {/* Retry Credit Purchase */}
          <div className="pt-6 border-t border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase text-gray-400">Force Succeeded Credit Pack Purchase</h4>
            <form onSubmit={handleRetryCreditPurchase} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={retryCreditPurchaseId}
                  onChange={(e) => setRetryCreditPurchaseId(e.target.value)}
                  placeholder="Payment record ID (UUID)..."
                  className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={retryCreditPurchaseReason}
                  onChange={(e) => setRetryCreditPurchaseReason(e.target.value)}
                  placeholder="Reason for overriding credit pack payment..."
                  className="w-full p-2.5 bg-black/45 border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Retry & Grant Credits
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  )
}
