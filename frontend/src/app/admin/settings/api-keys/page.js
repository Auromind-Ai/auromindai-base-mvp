"use client"

import { useState, useEffect } from "react"
import { 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  Cpu, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Info,
  Activity,
  Shield
} from "lucide-react"
import api from "@/lib/api"

export default function ApiKeysPage() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showKeys, setShowKeys] = useState({})

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await api.getPlatformSettings()
      setSettings(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleUpdate = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      await api.updatePlatformSettings(settings)

      setSuccess("Configuration updated successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleShow = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const sections = [
    {
      title: "AI Providers",
      icon: Cpu,
      description: "Manage your master LLM credentials used across the platform.",
      keys: [
        { id: "openai_api_key", label: "OpenAI API Key", placeholder: "sk-..." },
        { id: "anthropic_api_key", label: "Anthropic API Key", placeholder: "sk-ant-..." },
        { id: "gemini_api_key", label: "Google Gemini Key", placeholder: "AIza..." },
        { id: "groq_api_key", label: "Groq API Key", placeholder: "gsk_..." },
      ]
    },
    {
      title: "Payment Gateways",
      icon: CreditCard,
      description: "Configure keys for processing customer subscriptions.",
      keys: [
        { id: "razorpay_key", label: "Razorpay Key ID", placeholder: "rzp_test_..." },
        { id: "razorpay_secret", label: "Razorpay Secret", placeholder: "••••••••••••" },
        { id: "paypal_client_id", label: "PayPal Client ID", placeholder: "Client ID..." },
        { id: "paypal_secret", label: "PayPal Secret", placeholder: "••••••••••••" },
      ]
    },
    {
      title: "Infrastructure",
      icon: Activity,
      description: "Communications and messaging credentials.",
      keys: [
        { id: "twilio_account_sid", label: "Twilio Account SID", placeholder: "AC..." },
        { id: "twilio_auth_token", label: "Twilio Auth Token", placeholder: "••••••••••••" },
        { id: "twilio_from_number", label: "Twilio From Number", placeholder: "+1..." },
      ]
    }
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-gray-500 text-sm animate-pulse">Retrieving vault configurations...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold tracking-widest uppercase rounded-full mb-3">
            <Shield size={12} />
            Secure Configuration
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            API Keys & Vault
          </h1>
          <p className="text-gray-500 text-sm mt-1 max-w-lg">
            Master credentials for AI models, payment processors, and system infrastructure.
          </p>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap shadow-xl shadow-white/5"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? "SAVING..." : "SAVE CONFIGURATION"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 mx-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in zoom-in-95">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 mx-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400 text-sm animate-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Warning Info */}
      <div className="mb-10 mx-2 p-4 rounded-2xl bg-indigo-500/5 border border-white/5 flex gap-4 text-gray-400 text-xs leading-relaxed">
        <Info size={20} className="text-indigo-400 shrink-0" strokeWidth={2.5} />
        <p>
          These keys are applied globally across the entire Auromind platform. Ensure you are using production-ready API keys for live environments. 
          Keys are stored encrypted in the database and masked in this view for your security.
        </p>
      </div>

      {/* Content Grid */}
      <div className="space-y-12 pb-20">
        {sections.map((section, sIdx) => {
          const Icon = section.icon
          return (
            <div key={sIdx} className="group">
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">{section.title}</h2>
                  <p className="text-gray-500 text-xs">{section.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.keys.map((k) => (
                  <div key={k.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-3xl hover:border-white/10 transition-colors">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block ml-1">
                      {k.label}
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-600 group-focus-within/input:text-indigo-500 transition-colors">
                        <Key size={16} />
                      </div>
                      <input
                        type={showKeys[k.id] ? "text" : "password"}
                        value={settings[k.id] || ""}
                        onChange={(e) => handleUpdate(k.id, e.target.value)}
                        placeholder={k.placeholder}
                        className="w-full pl-11 pr-12 py-3.5 bg-[#020202] border border-white/10 rounded-2xl text-white text-sm placeholder:text-gray-800 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-mono"
                      />
                      <button
                        onClick={() => toggleShow(k.id)}
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-white transition-colors"
                      >
                        {showKeys[k.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
