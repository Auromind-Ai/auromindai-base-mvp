"use client"

import { useState, useEffect, useCallback } from "react"
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
  Mail,
  Info,
  Chrome,
  Facebook,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HardDrive
} from "lucide-react"
import api from "@/lib/api"
import { useBranding } from "@/context/BrandingContext"

function Toast({ toasts, onClose }) {
  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold border pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-5
            ${t.type === "success"
              ? "bg-[#0c160c] border-emerald-500/20 text-emerald-400"
              : "bg-[#180c0c] border-red-500/20 text-red-400"
            }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            t.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            {t.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <span>{t.message}</span>
          <button 
            onClick={() => onClose(t.id)} 
            className="ml-2 text-white/40 hover:text-white transition-colors text-base leading-none font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function SecretInput({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">{label}</p>
      <div className="relative">
        <input 
          type={visible ? "text" : "password"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "••••••••••••••••"}
          spellCheck={false}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full bg-[#050505] border border-white/10 rounded-xl pl-4 pr-11 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { refreshBranding } = useBranding()
  const [settings, setSettings] = useState({
    // ---------------- Brand ----------------
    app_name: "Auromind",
    app_logo_url: "/logo.png",

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

    // ---------------- Rate Limits ----------------
    api_rpm_limit: 60,
    api_tpm_limit: 100000,
    workspace_token_limit: 1000000,

    // ---------------- Announcement ----------------
    announcement_enabled: false,
    announcement_message: "",

    // ---------------- Feature Toggles ----------------
    enable_gmail_integration: true,
    enable_calendar_integration: true,
    enable_rag: true,
    enable_ai_learning: true,

    // ---------------- Platform Limits ----------------
    max_workspaces: 10,
    max_users_per_workspace: 50,
    max_conversations: 1000,

    // ---------------- About Section ----------------
    platform_version: "v2.4.1",
    release_date: "June 05, 2026",
    copyright: "@2026 Auromind",
    last_updated: "June 05, 2026, 10:30 AM",

    // ---------------- AI Credentials ----------------
    openai_api_key: "",
    google_api_key: "",      // Gemini / Google AI
    gemini_api_key: "",      // alias kept for UI provider card
    anthropic_api_key: "",
    groq_api_key: "",

    // ---------------- Email (SMTP) ----------------
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    from_email: "",

    // ---------------- Google OAuth ----------------
    google_client_id: "",
    google_client_secret: "",
    oauth_redirect_uri: "",
    google_integration_redirect_uri: "",

    // ---------------- Meta & Instagram ----------------
    meta_verify_token: "",
    meta_app_id: "",
    meta_app_secret: "",
    meta_system_user_token: "",
    meta_redirect_uri: "",
    ig_app_id: "",
    ig_app_secret: "",
    ig_redirect_uri: "",

    // ---------------- Twilio ----------------
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    twilio_status_callback_url: "",

    // ---------------- Storage ----------------
    storage_provider: "SUPABASE",
    supabase_url: "",
    supabase_service_role_key: "",
    supabase_anon_key: "",
    supabase_bucket: "",
    aws_access_key_id: "",
    aws_secret_access_key: "",
    aws_region: "",
    aws_s3_bucket: "",
    aws_s3_endpoint_url: "",
    aws_s3_public_base_url: "",

    // ---------------- AI/Model ----------------
    hf_token: "",
    hf_home: "",
    transformers_cache: "",

    // ---------------- Payments ----------------
    razorpay_key: "",
    razorpay_secret: "",
    razorpay_webhook_secret: "",
    razorpay_pro_plan_id: "",
    razorpay_enterprise_plan_id: "",
    payu_merchant_key: "",
    payu_salt: "",
    payu_webhook_secret: "",
    payu_pro_plan_id: "",
    payu_enterprise_plan_id: "",
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [toasts, setToasts] = useState([])
  const [testing, setTesting] = useState({})

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleTest = async (service) => {
    const targetService = service === "storage"
      ? (settings.storage_provider === "S3" ? "s3" : "supabase")
      : service;

    try {
      setTesting((prev) => ({ ...prev, [service]: true }))
      const response = await api.testConnection(targetService, settings)
      if (response.success) {
        showToast(`${service.toUpperCase()} connection successful! ⚡ (${response.latency_ms}ms)`, "success")
      } else {
        showToast(`${service.toUpperCase()} connection failed: ${response.message}`, "error")
      }
    } catch (err) {
      showToast(`${service.toUpperCase()} connection error: ${err.message || err}`, "error")
    } finally {
      setTesting((prev) => ({ ...prev, [service]: false }))
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await api.getPlatformSettings()
      setSettings(prev => ({ ...prev, ...data }))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Client-side validations
    const provider = settings.storage_provider || "SUPABASE"
    if (provider === "SUPABASE") {
      if (!settings.supabase_url || !settings.supabase_service_role_key || !settings.supabase_bucket) {
        const errorMsg = "Supabase URL, Service Role Key, and Supabase Bucket are required when SUPABASE is the selected Storage Provider."
        setError(errorMsg)
        showToast(errorMsg, "error")
        return
      }
    } else if (provider === "S3") {
      if (!settings.aws_access_key_id || !settings.aws_secret_access_key || !settings.aws_region || !settings.aws_s3_bucket) {
        const errorMsg = "AWS Access Key ID, Secret Access Key, Region, and Bucket are required when S3 is the selected Storage Provider."
        setError(errorMsg)
        showToast(errorMsg, "error")
        return
      }
    }

    try {
      setSaving(true)
      const updatedSettings = await api.updatePlatformSettings(settings)
      setSettings(updatedSettings)
      await refreshBranding()
      showToast("Configuration saved and synchronized! 🚀", "success")
      setError(null)
    } catch (err) {
      setError(err.message)
      showToast(err.message || "Failed to save configuration", "error")
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
      <div className="space-y-8 animate-pulse p-2">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b border-white/[0.05]">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-white/10 rounded-lg" />
            <div className="h-4 w-72 bg-white/5 rounded-lg" />
          </div>
          <div className="h-12 w-36 bg-white/10 rounded-2xl" />
        </div>
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tabs Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-12 bg-white/5 rounded-2xl" />
            ))}
          </div>
          {/* Main Panel */}
          <div className="lg:col-span-9 bg-[#0c0c0c] border border-white/[0.03] rounded-[32px] p-8 space-y-8 min-h-[500px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-white/10 rounded" />
                <div className="h-3 w-48 bg-white/5 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-white/5 rounded ml-2" />
                  <div className="h-11 bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "general", name: "General", icon: Settings },
    { id: "ai", name: "AI Providers", icon: Cpu },
    { id: "pricing", name: "Pricing & Plans", icon: CreditCard },
    { id: "payments", name: "Payments", icon: Layers },
    { id: "infra", name: "Infrastructure", icon: Globe },
    { id: "features", name: "Feature Toggles", icon: Zap },
    { id: "about", name: "About Info", icon: Info },
  ]

  const AI_PROVIDERS = [
    { id: "openai", name: "OpenAI", key: "openai_api_key", color: "bg-emerald-500" },
    { id: "google", name: "Google Gemini", key: "gemini_api_key", color: "bg-blue-500" },
    { id: "anthropic", name: "Anthropic", key: "anthropic_api_key", color: "bg-orange-500" },
    { id: "groq", name: "Groq (Llama)", key: "groq_api_key", color: "bg-red-500" },
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
            
            {saving && (
              <div className="absolute inset-0 bg-[#0c0c0c]/60 backdrop-blur-[1px] z-40 flex flex-col items-center justify-center transition-all duration-300">
                <div className="flex items-center gap-3 px-5 py-3.5 bg-black/85 border border-white/10 rounded-2xl shadow-2xl text-sm font-bold text-gray-200">
                  <RefreshCw className="animate-spin w-4 h-4 text-indigo-500" />
                  Saving and synchronizing...
                </div>
              </div>
            )}
            
            {/* Tab: General */}
            {activeTab === "general" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Globe className="text-indigo-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Branding Configuration</h3>
                      <p className="text-xs text-gray-500">Customize platform title and logo</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-gray-500 uppercase px-2">Application Name</p>
                       <input 
                        type="text"
                        value={settings.app_name || ""}
                        onChange={(e) => handleInputChange("app_name", e.target.value)}
                        placeholder="Auromind"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-gray-500 uppercase px-2">Logo URL / Image Source</p>
                       <input 
                        type="text"
                        value={settings.app_logo_url || ""}
                        onChange={(e) => handleInputChange("app_logo_url", e.target.value)}
                        placeholder="/logo.png"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none"
                      />
                    </div>
                  </div>
                </section>

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
                        checked={settings.announcement_enabled || false}
                        onChange={(e) => handleInputChange("announcement_enabled", e.target.checked)}
                        className="w-5 h-5 accent-indigo-500 rounded-lg" 
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-gray-500 uppercase px-2">Message Content</p>
                       <input 
                        type="text"
                        value={settings.announcement_message || ""}
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
                          value={settings[item.key] ?? ""}
                          onChange={(e) => handleInputChange(item.key, parseInt(e.target.value) || 0)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab: AI Providers */}
            {activeTab === "ai" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Cpu className="text-indigo-500 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">AI Providers</h3>
                        <p className="text-xs text-gray-500">Manage provider credentials used by the AI platform.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AI_PROVIDERS.map(provider => {
                      const isConfigured = settings[provider.key]?.length > 0;

                      return (
                        <div key={provider.id} className="p-6 rounded-3xl border transition-all bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03]">
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
                              value={settings[provider.key] ?? ""}
                              onChange={(e) => handleInputChange(provider.key, e.target.value)}
                              placeholder={`Enter ${provider.name} API Key`}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                            />
                          </div>
                        </div>
                      )
                    })}
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
                            value={settings[item.key] ?? ""}
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
                          value={settings.token_limit_per_plan?.[plan] ?? ""}
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
                                    value={feat || ""}
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
                            value={settings.razorpay_key || ""}
                            onChange={(e) => handleInputChange("razorpay_key", e.target.value)}
                            placeholder="rzp_live_..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <SecretInput
                          label="Secret Key"
                          value={settings.razorpay_secret}
                          onChange={(val) => handleInputChange("razorpay_secret", val)}
                          placeholder="••••••••••••••••"
                        />
                        <SecretInput
                          label="Webhook Secret (HMAC)"
                          value={settings.razorpay_webhook_secret}
                          onChange={(val) => handleInputChange("razorpay_webhook_secret", val)}
                          placeholder="••••••••••••••••"
                        />
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Pro Plan ID</p>
                          <input
                            type="text"
                            value={settings.razorpay_pro_plan_id || ""}
                            onChange={(e) => handleInputChange("razorpay_pro_plan_id", e.target.value)}
                            placeholder="plan_xxxxxx"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Enterprise Plan ID</p>
                          <input
                            type="text"
                            value={settings.razorpay_enterprise_plan_id || ""}
                            onChange={(e) => handleInputChange("razorpay_enterprise_plan_id", e.target.value)}
                            placeholder="plan_xxxxxx"
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
                            value={settings.payu_merchant_key || ""}
                            onChange={(e) => handleInputChange("payu_merchant_key", e.target.value)}
                            placeholder="merchant_key"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <SecretInput
                          label="Salt"
                          value={settings.payu_salt}
                          onChange={(val) => handleInputChange("payu_salt", val)}
                          placeholder="••••••••••••••••"
                        />
                        <SecretInput
                          label="Webhook Secret"
                          value={settings.payu_webhook_secret}
                          onChange={(val) => handleInputChange("payu_webhook_secret", val)}
                          placeholder="••••••••••••••••"
                        />
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Pro Plan ID</p>
                          <input
                            type="text"
                            value={settings.payu_pro_plan_id || ""}
                            onChange={(e) => handleInputChange("payu_pro_plan_id", e.target.value)}
                            placeholder="plan_xxxxxx"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Enterprise Plan ID</p>
                          <input
                            type="text"
                            value={settings.payu_enterprise_plan_id || ""}
                            onChange={(e) => handleInputChange("payu_enterprise_plan_id", e.target.value)}
                            placeholder="plan_xxxxxx"
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
                {/* Email (SMTP) card */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
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
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Port</p>
                       <input 
                        type="text"
                        value={settings.smtp_port || ""}
                        onChange={(e) => handleInputChange("smtp_port", e.target.value)}
                        placeholder="587"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">SMTP Username</p>
                       <input 
                        type="text"
                        value={settings.smtp_user || ""}
                        onChange={(e) => handleInputChange("smtp_user", e.target.value)}
                        placeholder="hello@auromind.ai"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <SecretInput 
                      label="SMTP Password"
                      value={settings.smtp_password}
                      onChange={(val) => handleInputChange("smtp_password", val)}
                      placeholder="••••••••••••••••"
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      disabled={testing.smtp}
                      onClick={() => handleTest("smtp")}
                      className="px-4 py-2 border border-white/10 hover:border-orange-500/30 hover:bg-orange-500/5 text-orange-400 disabled:text-orange-400/50 disabled:border-white/5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      {testing.smtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test SMTP Connection"
                      )}
                    </button>
                  </div>
                </section>

                {/* Google OAuth card */}
                <section className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Chrome className="text-blue-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Google OAuth</h3>
                      <p className="text-xs text-gray-500">Configure single sign-on and integration permissions</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Google Client ID</p>
                       <input 
                        type="text"
                        value={settings.google_client_id || ""}
                        onChange={(e) => handleInputChange("google_client_id", e.target.value)}
                        placeholder="123456-xxxx.apps.googleusercontent.com"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <SecretInput 
                      label="Google Client Secret"
                      value={settings.google_client_secret}
                      onChange={(val) => handleInputChange("google_client_secret", val)}
                      placeholder="••••••••••••••••"
                    />
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">OAuth Redirect URI</p>
                       <input 
                        type="text"
                        value={settings.oauth_redirect_uri || ""}
                        onChange={(e) => handleInputChange("oauth_redirect_uri", e.target.value)}
                        placeholder="https://app.auromind.ai/api/auth/callback/google"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Google Integration Redirect URI</p>
                       <input 
                        type="text"
                        value={settings.google_integration_redirect_uri || ""}
                        onChange={(e) => handleInputChange("google_integration_redirect_uri", e.target.value)}
                        placeholder="https://app.auromind.ai/api/integrations/google/callback"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      disabled={testing.google}
                      onClick={() => handleTest("google")}
                      className="px-4 py-2 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-indigo-400 disabled:text-indigo-400/50 disabled:border-white/5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      {testing.google ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Google OAuth"
                      )}
                    </button>
                  </div>
                </section>

                {/* Meta & Instagram card */}
                <section className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                      <Facebook className="text-pink-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Meta & Instagram</h3>
                      <p className="text-xs text-gray-500">Configure Webhooks and Messenger integrations</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Meta Verify Token</p>
                       <input 
                        type="text"
                        value={settings.meta_verify_token || ""}
                        onChange={(e) => handleInputChange("meta_verify_token", e.target.value)}
                        placeholder="verify_token_value"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Meta App ID</p>
                       <input 
                        type="text"
                        value={settings.meta_app_id || ""}
                        onChange={(e) => handleInputChange("meta_app_id", e.target.value)}
                        placeholder="1234567890"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <SecretInput 
                      label="Meta App Secret"
                      value={settings.meta_app_secret}
                      onChange={(val) => handleInputChange("meta_app_secret", val)}
                      placeholder="••••••••••••••••"
                    />
                    <SecretInput 
                      label="Meta System User Token"
                      value={settings.meta_system_user_token}
                      onChange={(val) => handleInputChange("meta_system_user_token", val)}
                      placeholder="••••••••••••••••"
                    />
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Meta Redirect URI</p>
                       <input
                        type="text"
                        value={settings.meta_redirect_uri || ""}
                        onChange={(e) => handleInputChange("meta_redirect_uri", e.target.value)}
                        placeholder="https://app.auromind.ai/meta/callback"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Instagram App ID</p>
                       <input 
                        type="text"
                        value={settings.ig_app_id || ""}
                        onChange={(e) => handleInputChange("ig_app_id", e.target.value)}
                        placeholder="1234567890"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <SecretInput 
                      label="Instagram App Secret"
                      value={settings.ig_app_secret}
                      onChange={(val) => handleInputChange("ig_app_secret", val)}
                      placeholder="••••••••••••••••"
                    />
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Instagram Redirect URI</p>
                       <input
                        type="text"
                        value={settings.ig_redirect_uri || ""}
                        onChange={(e) => handleInputChange("ig_redirect_uri", e.target.value)}
                        placeholder="https://app.auromind.ai/instagram/callback"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      disabled={testing.meta}
                      onClick={() => handleTest("meta")}
                      className="px-4 py-2 border border-white/10 hover:border-pink-500/30 hover:bg-pink-500/5 text-pink-400 disabled:text-pink-400/50 disabled:border-white/5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      {testing.meta ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Meta Integration"
                      )}
                    </button>
                  </div>
                </section>

                {/* Twilio card */}
                <section className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Phone className="text-red-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Twilio (SMS / Voice)</h3>
                      <p className="text-xs text-gray-500">WhatsApp & SMS delivery configuration</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Account SID</p>
                      <input
                        type="text"
                        value={settings.twilio_account_sid || ""}
                        onChange={(e) => handleInputChange("twilio_account_sid", e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <SecretInput
                      label="Auth Token"
                      value={settings.twilio_auth_token}
                      onChange={(val) => handleInputChange("twilio_auth_token", val)}
                      placeholder="••••••••••••••••"
                    />
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Phone Number</p>
                      <input
                        type="text"
                        value={settings.twilio_phone_number || ""}
                        onChange={(e) => handleInputChange("twilio_phone_number", e.target.value)}
                        placeholder="+1234567890"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Status Callback URL</p>
                      <input
                        type="text"
                        value={settings.twilio_status_callback_url || ""}
                        onChange={(e) => handleInputChange("twilio_status_callback_url", e.target.value)}
                        placeholder="https://app.auromind.ai/twilio/status-callback"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                  </div>
                </section>

                {/* Storage Configuration card */}
                <section className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <HardDrive className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Storage Configuration</h3>
                      <p className="text-xs text-gray-500">Manage global object storage for file uploads</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Storage Provider</p>
                      <div className="relative">
                        <select
                          value={settings.storage_provider || "SUPABASE"}
                          onChange={(e) => handleInputChange("storage_provider", e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none text-white font-mono"
                        >
                          {(settings._supported_storage_providers || ["SUPABASE", "S3"]).map((prov) => (
                            <option key={prov} value={prov} className="bg-[#050505] text-white">
                              {prov === "S3" ? "AWS S3" : prov}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Supabase fields (Only rendered if storage_provider is SUPABASE) */}
                    {(settings.storage_provider === "SUPABASE" || !settings.storage_provider) && (
                      <>
                        <div className="space-y-2 md:col-span-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Supabase URL</p>
                           <input
                            type="text"
                            value={settings.supabase_url || ""}
                            onChange={(e) => handleInputChange("supabase_url", e.target.value)}
                            placeholder="https://xxxx.supabase.co"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <SecretInput
                            label="Supabase Service Role Key"
                            value={settings.supabase_service_role_key}
                            onChange={(val) => handleInputChange("supabase_service_role_key", val)}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <SecretInput
                            label="Supabase Anon Key"
                            value={settings.supabase_anon_key}
                            onChange={(val) => handleInputChange("supabase_anon_key", val)}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Supabase Bucket</p>
                           <input
                            type="text"
                            value={settings.supabase_bucket || ""}
                            onChange={(e) => handleInputChange("supabase_bucket", e.target.value)}
                            placeholder="media"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                      </>
                    )}

                    {/* AWS S3 fields (Only rendered if storage_provider is S3) */}
                    {settings.storage_provider === "S3" && (
                      <>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">AWS Access Key ID</p>
                           <input 
                            type="text"
                            value={settings.aws_access_key_id || ""}
                            onChange={(e) => handleInputChange("aws_access_key_id", e.target.value)}
                            placeholder="AKIA..."
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                        <SecretInput 
                          label="AWS Secret Access Key"
                          value={settings.aws_secret_access_key}
                          onChange={(val) => handleInputChange("aws_secret_access_key", val)}
                          placeholder="••••••••••••••••"
                        />
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">AWS Region</p>
                           <input 
                            type="text"
                            value={settings.aws_region || ""}
                            onChange={(e) => handleInputChange("aws_region", e.target.value)}
                            placeholder="us-east-1"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">AWS Bucket</p>
                           <input 
                            type="text"
                            value={settings.aws_s3_bucket || ""}
                            onChange={(e) => handleInputChange("aws_s3_bucket", e.target.value)}
                            placeholder="my-bucket"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">AWS Endpoint URL</p>
                           <input 
                            type="text"
                            value={settings.aws_s3_endpoint_url || ""}
                            onChange={(e) => handleInputChange("aws_s3_endpoint_url", e.target.value)}
                            placeholder="https://s3.amazonaws.com"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-gray-500 uppercase px-2">AWS Public Base URL</p>
                           <input 
                            type="text"
                            value={settings.aws_s3_public_base_url || ""}
                            onChange={(e) => handleInputChange("aws_s3_public_base_url", e.target.value)}
                            placeholder="https://my-bucket.s3.amazonaws.com"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700 animate-in fade-in duration-300"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      disabled={testing.storage}
                      onClick={() => handleTest("storage")}
                      className="px-4 py-2 border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-400 disabled:text-emerald-400/50 disabled:border-white/5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      {testing.storage ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        `Test ${settings.storage_provider === "S3" ? "S3" : "Supabase"} Connection`
                      )}
                    </button>
                  </div>
                </section>

                {/* HuggingFace AI Model card */}
                <section className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Sparkles className="text-yellow-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">AI / Model Configuration</h3>
                      <p className="text-xs text-gray-500">Configure global model platform tokens</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SecretInput
                      label="HuggingFace Token (HF_TOKEN)"
                      value={settings.hf_token}
                      onChange={(val) => handleInputChange("hf_token", val)}
                      placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">HF Home / Cache Dir</p>
                      <input
                        type="text"
                        value={settings.hf_home || ""}
                        onChange={(e) => handleInputChange("hf_home", e.target.value)}
                        placeholder="/models/huggingface"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase px-2">Transformers Cache Dir</p>
                      <input
                        type="text"
                        value={settings.transformers_cache || ""}
                        onChange={(e) => handleInputChange("transformers_cache", e.target.value)}
                        placeholder="/models/huggingface"
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-mono text-white placeholder-gray-700"
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
                          checked={settings[feat.key] || false}
                          onChange={(e) => handleInputChange(feat.key, e.target.checked)}
                          className="w-5 h-5 accent-indigo-500 rounded-lg" 
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab: About Info */}
            {activeTab === "about" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Info className="text-purple-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">About Section Details</h3>
                      <p className="text-xs text-gray-500">Manage user-facing platform details</p>
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Platform Version</label>
                      <input 
                        type="text"
                        value={settings.platform_version || ""}
                        onChange={(e) => handleInputChange("platform_version", e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Release Date</label>
                      <input 
                        type="text"
                        value={settings.release_date || ""}
                        onChange={(e) => handleInputChange("release_date", e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Copyright</label>
                      <input 
                        type="text"
                        value={settings.copyright || ""}
                        onChange={(e) => handleInputChange("copyright", e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Last Updated</label>
                      <input 
                        type="text"
                        value={settings.last_updated || ""}
                        onChange={(e) => handleInputChange("last_updated", e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
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
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  )
}