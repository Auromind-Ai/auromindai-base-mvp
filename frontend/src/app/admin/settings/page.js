"use client"

import { useState, useEffect } from "react"
import { 
  Settings, 
  Cpu, 
  CreditCard, 
  Globe, 
  Bell, 
  ShieldAlert, 
  Zap, 
  Save, 
  RefreshCw,
  Phone,
  Key,
  Database,
  Layers,
  Plus,
  Trash2,
  Mail
} from "lucide-react"
import { useParams } from "next/navigation"
export default function SettingsPage() {
  const [settings, setSettings] = useState({

    // ---------------- Pricing ----------------
    free_plan_price: 0.0,
    pro_plan_price: 1000.0,
    enterprise_plan_price: 10000.0,

    free_plan_name: "Free",
    pro_plan_name: "Pro",
    enterprise_plan_name: "Business",


    free_plan_desc: "Try Auromind for free and see the ROI yourself.",
    pro_plan_desc: "Everything you need to automate and scale.",
    enterprise_plan_desc: "Enterprise-grade scale for large teams.",

    free_plan_features: [
      "100 AI Replies",
      "Basic Workflows",
      "Meta API Included"
    ],

    pro_plan_features: [
      "Unlimited AI Replies",
      "Advanced Workflows",
      "Priority Support",
      "Full Analytics"
    ],

    enterprise_plan_features: [
      "Dedicated Manager",
      "Custom API Access",
      "On-premise Options",
      "Global SLA"
    ],

    token_limit_per_plan: { 
      free: 0, 
      pro: 100000, 
      enterprise: 1000000 
    },

    // ---------------- AI Controls ----------------
    temperature: 0.8,
    max_tokens: 4096,
    rpm_limit: 60,
    context_window: 8192,

    // ---------------- Rate Limits ----------------
    api_rpm_limit: 60,
    api_tpm_limit: 100000,
    workspace_token_limit: 1000000,

    // ---------------- AI Model ----------------
    model_name: "gpt-4o",

    // ---------------- Announcement ----------------
    announcement_enabled: false,
    announcement_message: "",

    // ---------------- AI Kill Switch ----------------
    ai_enabled: true,

    // ---------------- Feature Toggles ----------------
    enable_gmail_integration: true,
    enable_calendar_integration: true,
    enable_rag: true,
    enable_ai_learning: true,

    // ---------------- Platform Limits ----------------
    max_workspaces: 10,
    max_users_per_workspace: 50,
    max_conversations: 1000,

    // ---------------- Credentials ----------------
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from_number: "",
    openai_api_key: "",
    gemini_api_key: "",
    anthropic_api_key: "",
    groq_api_key: "",

    // ---------------- Email (SMTP) ----------------
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",

    // ---------------- Payments ----------------
    razorpay_key: "",
    razorpay_secret: "",
    payu_merchant_key: "",
    payu_salt: "",
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  const params = useParams()
  const adminPath = params?.admin_path || 'x7k2-admin-9pqm'
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/${adminPath}/settings`, {
        credentials: "include"
      })
      if (!response.ok) throw new Error("Failed to fetch settings")
      const data = await response.json()
      setSettings(prev => ({ ...prev, ...data }))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`${API_BASE}/${adminPath}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings)
      })
      if (!response.ok) throw new Error("Failed to save settings")
      
      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTokenLimitChange = (plan, value) => {
    setSettings(prev => ({
      ...prev,
      token_limit_per_plan: {
        ...prev.token_limit_per_plan,
        [plan]: parseInt(value) || 0
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 rounded-full border-t-2 border-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading environment...</p>
      </div>
    )
  }

  const tabs = [
    { id: "general", name: "General", icon: Settings },
    { id: "ai", name: "AI Intelligence", icon: Cpu },
    { id: "pricing", name: "Pricing & Plans", icon: CreditCard },
    { id: "payments", name: "Payments", icon: Layers },
    { id: "infra", name: "Infrastructure", icon: Globe },
    { id: "features", name: "Feature Toggles", icon: Zap },
  ]

  const AI_PROVIDERS = [
    { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4-turbo"], key: "openai_api_key", color: "bg-emerald-500" },
    { id: "google", name: "Google Gemini", models: ["gemini-1.5-pro", "gemini-1.5-flash"], key: "gemini_api_key", color: "bg-blue-500" },
    { id: "anthropic", name: "Anthropic", models: ["claude-3-5-sonnet"], key: "anthropic_api_key", color: "bg-orange-500" },
    { id: "groq", name: "Groq (Llama)", models: ["llama-3.1-70b"], key: "groq_api_key", color: "bg-red-500" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.05]">
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50 tracking-tight mb-2">
            System Settings
          </h1>
          <p className="text-gray-500 font-medium">Manage platform architecture and global credentials</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
        >
          {saving ? <RefreshCw className="animate-spin w-4 h-4 text-black" /> : <Save className="w-4 h-4 text-black" />}
          {saving ? "Deploying..." : "Save Changes"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3">
          <Zap className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Settings synchronized successfully!</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Tabs */}
        <div className="lg:col-span-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all relative overflow-hidden group ${
                  isActive 
                    ? "text-white bg-white/5 shadow-xl" 
                    : "text-gray-500 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-500" : "group-hover:text-white"}`} />
                {tab.name}
              </button>
            )
          })}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-9">
          <div className="bg-[#0c0c0c] border border-white/[0.03] rounded-[32px] p-8 min-h-[500px] shadow-2xl overflow-hidden relative group/pane">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Tab: General */}
            {activeTab === "general" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Bell className="text-orange-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Platform Announcements</h3>
                      <p className="text-xs text-gray-500">Global banner visibility</p>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.04] transition-all">
                      <div>
                        <p className="text-sm font-bold">Display Banner</p>
                        <p className="text-xs text-gray-500">Toggle public announcement visibility</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.announcement_enabled}
                        onChange={(e) => handleInputChange("announcement_enabled", e.target.checked)}
                        className="w-5 h-5 accent-indigo-500 rounded-lg" 
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-gray-500 uppercase px-2">Message Content</p>
                       <input 
                        type="text"
                        value={settings.announcement_message}
                        onChange={(e) => handleInputChange("announcement_message", e.target.value)}
                        placeholder="Type system alert here..."
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none"
                      />
                    </div>
                  </div>
                </section>

                <section>
                   <div className="flex items-center gap-3 mb-6 pt-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Database className="text-purple-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Platform Constraints</h3>
                      <p className="text-xs text-gray-500">Global resource limits</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: "Max Workspaces", key: "max_workspaces" },
                      { label: "Users/Workspace", key: "max_users_per_workspace" },
                      { label: "Max Conversations", key: "max_conversations" }
                    ].map(item => (
                      <div key={item.key} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase px-2">{item.label}</p>
                        <input 
                          type="number"
                          value={settings[item.key]}
                          onChange={(e) => handleInputChange(item.key, parseInt(e.target.value) || 0)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab: AI Intelligence */}
            {activeTab === "ai" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Cpu className="text-indigo-500 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">AI Provider Hub</h3>
                        <p className="text-xs text-gray-500">Select model and configure keys</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                        <span className="text-xs font-bold text-gray-500">AI ENABLED</span>
                        <input 
                          type="checkbox"
                          checked={settings.ai_enabled}
                          onChange={(e) => handleInputChange("ai_enabled", e.target.checked)}
                          className="w-5 h-5 accent-red-500 rounded-lg" 
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AI_PROVIDERS.map(provider => {
                      const isConfigured = settings[provider.key]?.length > 0;
                      const isActive = provider.models.includes(settings.model_name);

                      return (
                        <div key={provider.id} className={`p-6 rounded-3xl border transition-all ${isActive ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03]'}`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${provider.color} opacity-20`} />
                              <h4 className="font-bold">{provider.name}</h4>
                            </div>
                            {isConfigured ? (
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-tighter">CONFIGURED</span>
                            ) : (
                              <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded-full uppercase tracking-tighter">API KEY MISSING</span>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                             <input 
                              type="password"
                              value={settings[provider.key]}
                              onChange={(e) => handleInputChange(provider.key, e.target.value)}
                              placeholder={`Enter ${provider.name} API Key`}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                            />
                            <select
                              value={isActive ? settings.model_name : ""}
                              onChange={(e) => handleInputChange("model_name", e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none appearance-none"
                            >
                              <option value="" disabled>Select Model...</option>
                              {provider.models.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section>
                   <div className="flex items-center gap-3 mb-6 pt-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Layers className="text-blue-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Response Tuning</h3>
                      <p className="text-xs text-gray-500">Fine-tune AI output behavior</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: "Temp", key: "temperature", step: 0.1 },
                      { label: "Max Output", key: "max_tokens" },
                      { label: "RPM Limit", key: "rpm_limit" },
                      { label: "Ctx Window", key: "context_window" }
                    ].map(item => (
                      <div key={item.key} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase px-2">{item.label}</p>
                        <input 
                          type="number"
                          step={item.step || 1}
                          value={settings[item.key]}
                          onChange={(e) => handleInputChange(item.key, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Pricing & Plans */}
             {activeTab === "pricing" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
 
                {/*  Prices  */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CreditCard className="text-green-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Monetization</h3>
                      <p className="text-xs text-gray-500">Plan structures and pricing (₹)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: "Free Plan Price",  key: "free_plan_price"       },
                      { label: "Pro Plan Price",   key: "pro_plan_price"        },
                      { label: "Enterprise Price", key: "enterprise_plan_price" }
                    ].map(item => (
                      <div key={item.key} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase px-2">{item.label}</p>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            value={settings[item.key]}
                            onChange={(e) => handleInputChange(item.key, parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm focus:border-indigo-500 outline-none font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
 
                {/*  Token Quotas  */}
                <section>
                  <div className="flex items-center gap-3 mb-6 pt-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Quota Management</h3>
                      <p className="text-xs text-gray-500">Monthly token allocations</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {["free", "pro", "enterprise"].map(plan => (
                      <div key={plan} className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase px-2">{plan} limit</p>
                        <input
                          type="number"
                          value={settings.token_limit_per_plan[plan]}
                          onChange={(e) => handleTokenLimitChange(plan, e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </section>
 
                {/*  Plan Content (Name · Description · Features)  */}
                <section>
                  <div className="flex items-center gap-3 mb-6 pt-4 border-t border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Layers className="text-indigo-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Plan Content</h3>
                      <p className="text-xs text-gray-500">Names, descriptions &amp; features shown on landing page</p>
                    </div>
                  </div>
 
                  <div className="space-y-6">
                    {[
                      { id: "free",       label: "Free Plan",      accent: "green"  },
                      { id: "pro",        label: "Pro Plan",        accent: "indigo" },
                      { id: "enterprise", label: "Enterprise Plan", accent: "purple" },
                    ].map(({ id, label, accent }) => {
                      const ring  = { green: "ring-green-500/20",  indigo: "ring-indigo-500/20",  purple: "ring-purple-500/20"  }[accent]
                      const badge = { green: "bg-green-500/10 text-green-400", indigo: "bg-indigo-500/10 text-indigo-400", purple: "bg-purple-500/10 text-purple-400" }[accent]
                      const addBtn= { green: "border-green-500/20 text-green-400 hover:bg-green-500/10", indigo: "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10", purple: "border-purple-500/20 text-purple-400 hover:bg-purple-500/10" }[accent]
                      const features = settings[`${id}_plan_features`] || []
 
                      return (
                        <div key={id} className={`p-6 rounded-3xl bg-white/[0.01] border border-white/[0.05] ring-1 ${ring} space-y-5`}>
                          
                          {/* Badge */}
                          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${badge}`}>
                            {label}
                          </span>
 
                          {/* Name + Description */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Plan Name</p>
                              <input
                                type="text"
                                value={settings[`${id}_plan_name`] || ""}
                                onChange={(e) => handleInputChange(`${id}_plan_name`, e.target.value)}
                                placeholder="e.g. Free"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none font-semibold"
                              />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Description</p>
                              <input
                                type="text"
                                value={settings[`${id}_plan_desc`] || ""}
                                onChange={(e) => handleInputChange(`${id}_plan_desc`, e.target.value)}
                                placeholder="Short tagline for this plan"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                          </div>
 
                          {/* Features list */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Features</p>
                            <div className="space-y-2">
                              {features.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                                  <input
                                    type="text"
                                    value={feat}
                                    onChange={(e) => {
                                      const updated = [...features]
                                      updated[idx] = e.target.value
                                      handleInputChange(`${id}_plan_features`, updated)
                                    }}
                                    placeholder={`Feature ${idx + 1}`}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const updated = features.filter((_, i) => i !== idx)
                                      handleInputChange(`${id}_plan_features`, updated)
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => handleInputChange(`${id}_plan_features`, [...features, ""])}
                              className={`mt-1 flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${addBtn}`}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Add Feature
                            </button>
                          </div>
 
                        </div>
                      )
                    })}
                  </div>
                </section>
 
              </div>
            )}

            {/* Tab: Payments */}
            {activeTab === "payments" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Layers className="text-indigo-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Payment Gateways</h3>
                      <p className="text-xs text-gray-500">Configure global transaction providers</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Razorpay Section */}
                    <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/[0.05] space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-[10px] font-black italic">RP</div>
                        <h4 className="font-bold">Razorpay (India)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Key ID</p>
                           <input 
                            type="text"
                            value={settings.razorpay_key}
                            onChange={(e) => handleInputChange("razorpay_key", e.target.value)}
                            placeholder="rzp_live_..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Secret Key</p>
                           <input 
                            type="password"
                            value={settings.razorpay_secret}
                            onChange={(e) => handleInputChange("razorpay_secret", e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PayU Section */}
                    <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/[0.05] space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-[10px] font-black italic">PU</div>
                        <h4 className="font-bold">PayU (India)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Merchant Key</p>
                           <input 
                            type="text"
                            value={settings.payu_merchant_key}
                            onChange={(e) => handleInputChange("payu_merchant_key", e.target.value)}
                            placeholder="merchant_key"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Salt</p>
                           <input 
                            type="password"
                            value={settings.payu_salt}
                            onChange={(e) => handleInputChange("payu_salt", e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Infrastructure */}
            {activeTab === "infra" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Phone className="text-red-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Twilio Integration</h3>
                      <p className="text-xs text-gray-500">WhatsApp and SMS provider</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Account SID</p>
                       <input 
                        type="text"
                        value={settings.twilio_account_sid}
                        onChange={(e) => handleInputChange("twilio_account_sid", e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxx..."
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Auth Token</p>
                       <input 
                        type="password"
                        value={settings.twilio_auth_token}
                        onChange={(e) => handleInputChange("twilio_auth_token", e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">From Number</p>
                       <input 
                        type="text"
                        value={settings.twilio_from_number}
                        onChange={(e) => handleInputChange("twilio_from_number", e.target.value)}
                        placeholder="+1234567890"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6 pt-4 border-t border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Mail className="text-orange-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Email (SMTP) Integration</h3>
                      <p className="text-xs text-gray-500">Configure outbound email delivery</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Host</p>
                       <input 
                        type="text"
                        value={settings.smtp_host || ""}
                        onChange={(e) => handleInputChange("smtp_host", e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Port</p>
                       <input 
                        type="text"
                        value={settings.smtp_port || ""}
                        onChange={(e) => handleInputChange("smtp_port", e.target.value)}
                        placeholder="587"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Username</p>
                       <input 
                        type="text"
                        value={settings.smtp_user || ""}
                        onChange={(e) => handleInputChange("smtp_user", e.target.value)}
                        placeholder="hello@auromind.ai"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Password</p>
                       <input 
                        type="password"
                        value={settings.smtp_password || ""}
                        onChange={(e) => handleInputChange("smtp_password", e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Features */}
            {activeTab === "features" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Zap className="text-yellow-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Capability Toggles</h3>
                      <p className="text-xs text-gray-500">Enable/disable core modules</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Gmail Integration", desc: "Allow mailbox connections", key: "enable_gmail_integration" },
                      { label: "Calendar Sync", desc: "Enable meeting schedulers", key: "enable_calendar_integration" },
                      { label: "RAG Brain", desc: "Enable vector knowledge base", key: "enable_rag" },
                      { label: "AI Learning", desc: "Enable feedback loops", key: "enable_ai_learning" }
                    ].map(feat => (
                      <div key={feat.key} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.04] transition-all">
                        <div>
                          <p className="text-sm font-bold">{feat.label}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-tight">{feat.desc}</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={settings[feat.key]}
                          onChange={(e) => handleInputChange(feat.key, e.target.checked)}
                          className="w-5 h-5 accent-indigo-500 rounded-lg" 
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-right-4 {
          from { transform: translateX(1rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-in {
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  )
}