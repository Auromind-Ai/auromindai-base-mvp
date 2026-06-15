"use client"

import { useState, useEffect } from "react"
import { BrainCircuit, Settings, Toggle2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AISettingsPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/admin/ai-config`)
        if (!response.ok) throw new Error("Failed to fetch AI configuration")
        const data = await response.json()
        setConfig(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        setConfig(null)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleToggle = (key) => {
    setConfig({
      ...config,
      [key]: !config[key]
    })
  }

  const handleValueChange = (key, value) => {
    setConfig({
      ...config,
      [key]: value
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`${API_BASE}/admin/ai-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })
      if (!response.ok) throw new Error("Failed to save configuration")
      setError(null)
      // Show success message
      setTimeout(() => {
        alert("Configuration saved successfully!")
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Settings</h1>
          <p className="text-gray-400">Configure AI model parameters and behavior</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading AI configuration...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && config && (
          <>
            {/* Configuration Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Model Settings */}
              <ConfigCard title="Model Settings">
                <div className="space-y-4">
                  <ConfigItem label="Model Name">
                    <input
                      type="text"
                      value={config.model_name || ""}
                      onChange={(e) => handleValueChange("model_name", e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., gpt-4"
                    />
                  </ConfigItem>
                  <ConfigItem label="Temperature">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={config.temperature || 0.7}
                        onChange={(e) => handleValueChange("temperature", parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-white font-mono w-12">{(config.temperature || 0.7).toFixed(1)}</span>
                    </div>
                  </ConfigItem>
                  <ConfigItem label="Max Tokens">
                    <input
                      type="number"
                      value={config.max_tokens || 2000}
                      onChange={(e) => handleValueChange("max_tokens", parseInt(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </ConfigItem>
                </div>
              </ConfigCard>

              {/* Features */}
              <ConfigCard title="Features">
                <div className="space-y-4">
                  <ToggleItem 
                    label="Enable Context Learning"
                    value={config.context_learning_enabled || false}
                    onChange={() => handleToggle("context_learning_enabled")}
                  />
                  <ToggleItem 
                    label="Enable Streaming"
                    value={config.streaming_enabled || false}
                    onChange={() => handleToggle("streaming_enabled")}
                  />
                  <ToggleItem 
                    label="Enable Caching"
                    value={config.caching_enabled || false}
                    onChange={() => handleToggle("caching_enabled")}
                  />
                </div>
              </ConfigCard>

              {/* Rate Limiting */}
              <ConfigCard title="Rate Limiting">
                <div className="space-y-4">
                  <ConfigItem label="Requests per Minute">
                    <input
                      type="number"
                      value={config.rpm_limit || 60}
                      onChange={(e) => handleValueChange("rpm_limit", parseInt(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </ConfigItem>
                  <ConfigItem label="Tokens per Hour">
                    <input
                      type="number"
                      value={config.tph_limit || 90000}
                      onChange={(e) => handleValueChange("tph_limit", parseInt(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </ConfigItem>
                </div>
              </ConfigCard>

              {/* Advanced Options */}
              <ConfigCard title="Advanced Options">
                <div className="space-y-4">
                  <ToggleItem 
                    label="Enable Fine-tuning"
                    value={config.fine_tuning_enabled || false}
                    onChange={() => handleToggle("fine_tuning_enabled")}
                  />
                  <ToggleItem 
                    label="Enable Embeddings"
                    value={config.embeddings_enabled || false}
                    onChange={() => handleToggle("embeddings_enabled")}
                  />
                  <ConfigItem label="Timeout (seconds)">
                    <input
                      type="number"
                      value={config.timeout_seconds || 30}
                      onChange={(e) => handleValueChange("timeout_seconds", parseInt(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </ConfigItem>
                </div>
              </ConfigCard>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ConfigCard({ title, children }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Settings size={20} className="text-indigo-400" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function ConfigItem({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      {children}
    </div>
  )
}

function ToggleItem({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-400">{label}</label>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-indigo-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}
