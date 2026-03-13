"use client"

import { useState, useEffect } from "react"
import { CreditCard, Save, Shield } from "lucide-react"

export default function PaymentsPage() {
  const [razorpayKey, setRazorpayKey] = useState("")
  const [razorpaySecret, setRazorpaySecret] = useState("")
  const [paypalClient, setPaypalClient] = useState("")
  const [paypalSecret, setPaypalSecret] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load existing payment settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("http://localhost:8000/admin/payments")
        if (!res.ok) return

        const data = await res.json()

        setRazorpayKey(data.razorpay_key || "")
        setRazorpaySecret(data.razorpay_secret || "")
        setPaypalClient(data.paypal_client || "")
        setPaypalSecret(data.paypal_secret || "")
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true)

      const res = await fetch("http://localhost:8000/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          razorpay_key: razorpayKey,
          razorpay_secret: razorpaySecret,
          paypal_client: paypalClient,
          paypal_secret: paypalSecret
        })
      })

      if (!res.ok) throw new Error("Save failed")

      alert("Payment settings saved")
    } catch (err) {
      console.error(err)
      alert("Error saving payment settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading payment settings...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payment Gateways</h1>
          <p className="text-gray-400">
            Configure Razorpay and PayPal payment providers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Razorpay */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Razorpay</h2>
            </div>

            <div className="space-y-4">
              <Input
                label="Razorpay Key ID"
                value={razorpayKey}
                setValue={setRazorpayKey}
              />

              <Input
                label="Razorpay Secret"
                value={razorpaySecret}
                setValue={setRazorpaySecret}
                password
              />
            </div>
          </div>

          {/* PayPal */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">PayPal</h2>
            </div>

            <div className="space-y-4">
              <Input
                label="PayPal Client ID"
                value={paypalClient}
                setValue={setPaypalClient}
              />

              <Input
                label="PayPal Secret"
                value={paypalSecret}
                setValue={setPaypalSecret}
                password
              />
            </div>
          </div>

        </div>

        {/* Save Button */}
        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg text-white font-semibold transition disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Payment Settings"}
          </button>
        </div>

      </div>
    </div>
  )
}

function Input({ label, value, setValue, password }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>

      <input
        type={password ? "password" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}