"use client"

import { useState, useEffect, useCallback } from "react"
import { CreditCard, Eye, EyeOff, Save, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border transition-all duration-300
            ${t.type === "success"
              ? "bg-[#0f1a0f] border-emerald-700/50 text-emerald-400"
              : "bg-[#1a0f0f] border-red-700/50 text-red-400"
            }`}
        >
          {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, type = "success") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])
  return { toasts, push }
}

function SecretInput({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium tracking-widest uppercase text-gray-500">
        {label}
      </label>
      <div className="relative group">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••••••••••"}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-black/60 border border-white/8 rounded-lg px-4 py-2.5 pr-11
                     text-white text-sm placeholder-gray-700
                     focus:outline-none focus:border-indigo-500/60 focus:bg-black
                     transition-colors duration-150"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function PlainInput({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium tracking-widest uppercase text-gray-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Enter value"}
        spellCheck={false}
        autoComplete="off"
        className="w-full bg-black/60 border border-white/8 rounded-lg px-4 py-2.5
                   text-white text-sm placeholder-gray-700
                   focus:outline-none focus:border-indigo-500/60 focus:bg-black
                   transition-colors duration-150"
      />
    </div>
  )
}

function GatewayCard({ icon: Icon, title, accent, badge, children }) {
  return (
    <div className="relative bg-[#0a0a0a] border border-white/8 rounded-2xl p-6 overflow-hidden">
      <div className={`absolute top-0 left-6 right-6 h-px ${accent}`} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-white/8">
            <Icon size={16} className="text-gray-300" />
          </div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/5 text-gray-500 border border-white/8">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

const EMPTY = { razorpay_key: "", razorpay_secret: "", paypal_client: "", paypal_secret: "" }

export default function PaymentsPage() {
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(EMPTY)
  const [status, setStatus] = useState("idle")
  const { toasts, push } = useToast()

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }))
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  const load = useCallback(async () => {
    setStatus("loading")
    try {
      const res = await fetch(`${API_BASE}/admin/payments`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const normalised = {
        razorpay_key:    data.razorpay_key    ?? "",
        razorpay_secret: data.razorpay_secret ?? "",
        paypal_client:   data.paypal_client   ?? "",
        paypal_secret:   data.paypal_secret   ?? "",
      }
      setForm(normalised)
      setSaved(normalised)
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }, [])

  useEffect(() => { load() }, [load])

 const handleSave = async () => {
  if (!isDirty) return
  setStatus("saving")

  try {
    const payload = {
      razorpay_key: form.razorpay_key,
      paypal_client: form.paypal_client,
    }

    // 🔐 send only if user changed secret
    if (form.razorpay_secret && form.razorpay_secret !== "********") {
      payload.razorpay_secret = form.razorpay_secret
    }

    if (form.paypal_secret && form.paypal_secret !== "********") {
      payload.paypal_secret = form.paypal_secret
    }

    const res = await fetch(`${API_BASE}/admin/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // After save → mask again
    setSaved({
      ...form,
      razorpay_secret: "********",
      paypal_secret: "********",
    })

    setForm({
      ...form,
      razorpay_secret: "********",
      paypal_secret: "********",
    })

    push("Payment settings saved successfully", "success")

  } catch {
    push("Failed to save — please try again", "error")
  } finally {
    setStatus("idle")
  }
}

  const isSaving = status === "saving"

  if (status === "loading") {
    return (
      <div className="h-full w-full flex items-center justify-center gap-3 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Loading payment settings…
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-gray-400">
        <XCircle size={32} className="text-red-500/60" />
        <p className="text-sm">Failed to load payment settings.</p>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <Toast toasts={toasts} />

      <div className="h-full w-full px-8 py-8">
        <div className="w-full max-w-5xl space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-1">
              </p>
              <h1 className="text-2xl font-bold text-white">Payment Gateways</h1>
              <p className="text-sm text-gray-500 mt-1">
                Configure your Razorpay and PayPal credentials.
              </p>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GatewayCard
              icon={CreditCard}
              title="Razorpay"
              accent="bg-gradient-to-r from-indigo-500/40 via-indigo-500/10 to-transparent"
              badge="India"
            >
              <PlainInput
                label="Key ID"
                value={form.razorpay_key}
                onChange={set("razorpay_key")}
                placeholder="rzp_live_••••••••"
              />
              <SecretInput
                label="Secret Key"
                value={form.razorpay_secret}
                onChange={set("razorpay_secret")}
              />
            </GatewayCard>

            <GatewayCard
              icon={CreditCard}
              title="PayPal"
              accent="bg-gradient-to-r from-sky-500/40 via-sky-500/10 to-transparent"
              badge="Global"
            >
              <PlainInput
                label="Client ID"
                value={form.paypal_client}
                onChange={set("paypal_client")}
                placeholder="AY••••••••••••••••"
              />
              <SecretInput
                label="Client Secret"
                value={form.paypal_secret}
                onChange={set("paypal_secret")}
              />
            </GatewayCard>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/6">
            <p className="text-xs text-gray-600">
            </p>
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500
                         disabled:bg-white/8 disabled:text-gray-600 disabled:cursor-not-allowed
                         px-5 py-2.5 rounded-lg text-white text-sm font-semibold
                         transition-all duration-150 active:scale-95"
            >
              {isSaving
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : <><Save size={15} /> Save Changes</>
              }
            </button>
          </div>

        </div>
      </div>
    </>
  )
}