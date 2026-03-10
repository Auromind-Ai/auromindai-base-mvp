"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Pricing
    free_plan_price: 0.0,
    pro_plan_price: 1000.0,
    enterprise_plan_price: 10000.0,
    token_limit_per_plan: { free: 1, pro: 100000, enterprise: 1000000 },

    // AI Controls
    temperature: 0.8,
    max_tokens: 4096,
    rpm_limit: 60,
    context_window: 8192,

    // Rate-limits (new global controls)
    api_rpm_limit: 60,
    api_tpm_limit: 100000,
    workspace_token_limit: 1000000,

    // AI Model selection
    model_name: "gpt-4o",

    // Announcement banner
    announcement_enabled: false,
    announcement_message: "",

    // AI kill switch
    ai_enabled: true,

    // Feature Toggles
    enable_gmail_integration: true,
    enable_calendar_integration: true,
    enable_rag: true,
    enable_ai_learning: true,

    // Platform Limits
    max_workspaces: 10,
    max_users_per_workspace: 50,
    max_conversations: 1000,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/admin/settings")
      if (!response.ok) {
        throw new Error("Failed to fetch settings")
      }
      const data = await response.json()
      // merge with defaults so missing keys don't become undefined
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
      const response = await fetch("http://localhost:8000/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

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
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
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
      <div className="min-h-screen bg-[#050505] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Settings</h1>
          <p className="text-gray-400">Control center for your SaaS platform</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400">Settings saved successfully!</p>
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Pricing Settings */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Pricing Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Configure pricing for your plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Free Plan Price 
                  </label>
                  <Input
                    type="number"
                    step="1"
                    value={settings.free_plan_price}
                    onChange={(e) => handleInputChange("free_plan_price", parseFloat(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pro Plan Price
                  </label>
                  <Input
                    type="number"
                    step="1"
                    value={settings.pro_plan_price}
                    onChange={(e) => handleInputChange("pro_plan_price", parseFloat(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Enterprise Plan Price 
                  </label>
                  <Input
                    type="number"
                    step="1"
                    value={settings.enterprise_plan_price}
                    onChange={(e) => handleInputChange("enterprise_plan_price", parseFloat(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Token Limits Per Plan
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Free</label>
                    <Input
                      type="number"
                      value={settings.token_limit_per_plan.free}
                      onChange={(e) => handleTokenLimitChange("free", e.target.value)}
                      className="bg-[#0c0c0c] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Pro</label>
                    <Input
                      type="number"
                      value={settings.token_limit_per_plan.pro}
                      onChange={(e) => handleTokenLimitChange("pro", e.target.value)}
                      className="bg-[#0c0c0c] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Enterprise</label>
                    <Input
                      type="number"
                      value={settings.token_limit_per_plan.enterprise}
                      onChange={(e) => handleTokenLimitChange("enterprise", e.target.value)}
                      className="bg-[#0c0c0c] border border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">AI Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Configure AI model parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Temperature
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={settings.temperature}
                    onChange={(e) => handleInputChange("temperature", parseFloat(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    value={settings.max_tokens}
                    onChange={(e) => handleInputChange("max_tokens", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    RPM Limit
                  </label>
                  <Input
                    type="number"
                    value={settings.rpm_limit}
                    onChange={(e) => handleInputChange("rpm_limit", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Context Window
                  </label>
                  <Input
                    type="number"
                    value={settings.context_window}
                    onChange={(e) => handleInputChange("context_window", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limit Controls */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Rate Limit Controls</CardTitle>
              <CardDescription className="text-gray-400">
                Global throttling settings for the API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    API Requests Per Minute
                  </label>
                  <Input
                    type="number"
                    value={settings.api_rpm_limit}
                    onChange={(e) => handleInputChange("api_rpm_limit", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    API Tokens Per Minute
                  </label>
                  <Input
                    type="number"
                    value={settings.api_tpm_limit}
                    onChange={(e) => handleInputChange("api_tpm_limit", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Workspace Token Limit
                  </label>
                  <Input
                    type="number"
                    value={settings.workspace_token_limit}
                    onChange={(e) => handleInputChange("workspace_token_limit", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Configuration */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">AI Model Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Select which model the platform should use by default
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Model Name
                </label>
                <select
                  value={settings.model_name}
                  onChange={(e) => handleInputChange("model_name", e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-white/10 text-white rounded-lg p-2"
                >
                  <option value="gpt-4o">OpenAI GPT-4o</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="grok">xAI Grok</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Global Announcement */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Global Announcement</CardTitle>
              <CardDescription className="text-gray-400">
                Configure a banner message that shows across the frontend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Enabled</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcement_enabled}
                    onChange={(e) => handleInputChange("announcement_enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Message
                </label>
                <Input
                  type="text"
                  value={settings.announcement_message}
                  onChange={(e) => handleInputChange("announcement_message", e.target.value)}
                  className="bg-[#0c0c0c] border border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI System Control */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">AI System Control</CardTitle>
              <CardDescription className="text-gray-400">
                Disable all AI responses platform-wide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">AI Enabled</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ai_enabled}
                    onChange={(e) => handleInputChange("ai_enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Feature Toggles</CardTitle>
              <CardDescription className="text-gray-400">
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Gmail Integration</label>
                    <p className="text-xs text-gray-400">Allow users to connect Gmail accounts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_gmail_integration}
                      onChange={(e) => handleInputChange("enable_gmail_integration", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Calendar Integration</label>
                    <p className="text-xs text-gray-400">Allow users to connect calendar services</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_calendar_integration}
                      onChange={(e) => handleInputChange("enable_calendar_integration", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">RAG Brain</label>
                    <p className="text-xs text-gray-400">Enable RAG knowledge base features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_rag}
                      onChange={(e) => handleInputChange("enable_rag", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">AI Learning</label>
                    <p className="text-xs text-gray-400">Enable AI learning and feedback systems</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_ai_learning}
                      onChange={(e) => handleInputChange("enable_ai_learning", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Limits */}
          <Card className="bg-white/[0.02] border border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Platform Limits</CardTitle>
              <CardDescription className="text-gray-400">
                Set limits for platform usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Workspaces
                  </label>
                  <Input
                    type="number"
                    value={settings.max_workspaces}
                    onChange={(e) => handleInputChange("max_workspaces", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Users Per Workspace
                  </label>
                  <Input
                    type="number"
                    value={settings.max_users_per_workspace}
                    onChange={(e) => handleInputChange("max_users_per_workspace", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Max Conversations
                  </label>
                  <Input
                    type="number"
                    value={settings.max_conversations}
                    onChange={(e) => handleInputChange("max_conversations", parseInt(e.target.value) || 0)}
                    className="bg-[#0c0c0c] border border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}