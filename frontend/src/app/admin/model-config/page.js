"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  Cpu,
  MessageSquare,
  Mail,
  Zap,
  BookOpen,
  Search,
} from 'lucide-react';
import api from '@/lib/api';

const FEATURES = [
  { key: 'chat', label: 'Chat & Conversations', icon: MessageSquare, modes: ['auto', 'fast', 'smart', 'deep', 'flash'] },
  { key: 'inbox', label: 'Inbox Agent Message', icon: Mail, modes: ['auto'] },
  { key: 'flow', label: 'Flow Generation', icon: Zap, modes: ['auto'] },
  { key: 'template', label: 'Template Draft Email', icon: BookOpen, modes: ['auto'] },
  { key: 'rag', label: 'Agentic RAG Query', icon: Search, modes: ['auto'] },
  { key: 'knowledge', label: 'Knowledge Base Upload', icon: Cpu, modes: ['auto'] }
];

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'groq', label: 'Groq' }
];

const getEmptyConfig = (featureKey, experienceLevel, label) => ({
  name: `${featureKey}:${experienceLevel}`,
  feature_key: featureKey,
  experience_level: experienceLevel,
  display_name: `${label} (${experienceLevel})`,
  provider: 'claude',
  model: '',
  temperature: 0.7,
  max_tokens: 2048,
  is_active: true,
  description: '',
  api_key_env: 'ANTHROPIC_API_KEY',
  fallback_enabled: false,
  fallback_provider: 'gemini',
  fallback_model: ''
});

export default function ModelConfigAdmin() {
  const [activeFeature, setActiveFeature] = useState(FEATURES[0]);
  const [activeMode, setActiveMode] = useState('auto');
  
  // Database configs state
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Provider model list dropdown cache
  const [providerModels, setProviderModels] = useState({});
  const [fetchingModels, setFetchingModels] = useState(false);

  // Active form configuration state
  const [formData, setFormData] = useState({});
  const [customModel, setCustomModel] = useState(false);
  const [customFallbackModel, setCustomFallbackModel] = useState(false);

  // Fetch all model configurations from backend
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getModelConfigs();
      if (res.success) {
        // Map configs array to lookup dictionary key: "feature_key:experience_level"
        const configMap = {};
        res.data.forEach(item => {
          const key = `${item.feature_key}:${item.experience_level}`;
          configMap[key] = item;
        });
        setConfigs(configMap);
      } else {
        setError('Failed to load configurations.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading configurations from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Sync form data whenever active feature or active mode changes
  useEffect(() => {
    if (activeFeature) {
      const mode = activeFeature.modes.includes(activeMode) ? activeMode : activeFeature.modes[0];
      if (mode !== activeMode) {
        setActiveMode(mode);
        return;
      }
      
      const key = `${activeFeature.key}:${mode}`;
      const existing = configs[key];
      
      if (existing) {
        setFormData({ ...existing });
        setCustomModel(false);
        setCustomFallbackModel(false);
      } else {
        setFormData(getEmptyConfig(activeFeature.key, mode, activeFeature.label));
        setCustomModel(true);
        setCustomFallbackModel(true);
      }
    }
  }, [activeFeature, activeMode, configs]);

  // Load models dynamically when provider changes
  const fetchProviderModels = async (provider) => {
    if (!provider) return;
    if (providerModels[provider]) return; // Use cache if present

    try {
      setFetchingModels(true);
      const res = await api.getProviderModels(provider);
      if (res.success) {
        setProviderModels(prev => ({ ...prev, [provider]: res.models }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingModels(false);
    }
  };

  useEffect(() => {
    if (formData.provider) {
      fetchProviderModels(formData.provider);
    }
  }, [formData.provider]);

  useEffect(() => {
    if (formData.fallback_provider) {
      fetchProviderModels(formData.fallback_provider);
    }
  }, [formData.fallback_provider]);

  const handleRefreshModels = async () => {
    const provider = formData.provider;
    if (!provider) return;

    try {
      setFetchingModels(true);
      setError('');
      // Force reload by clearing cache key first
      const res = await api.getProviderModels(provider);
      if (res.success) {
        setProviderModels(prev => ({ ...prev, [provider]: res.models }));
        setSuccess(`Refreshed ${provider} models list.`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch models from ${provider} endpoint.`);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.model?.trim()) {
      setError('Please specify a model.');
      return;
    }

    if (formData.fallback_enabled) {
      if (!formData.fallback_provider || !formData.fallback_model?.trim()) {
        setError('Please specify both fallback provider and fallback model.');
        return;
      }
      if (formData.provider === formData.fallback_provider && formData.model.trim() === formData.fallback_model.trim()) {
        setError('Fallback provider and model cannot be identical to the primary provider and model.');
        return;
      }
    }

    try {
      setSaveLoading(true);
      setError('');
      setSuccess('');
      
      const payload = {
        ...formData,
        model: formData.model.trim(),
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens),
        fallback_model: formData.fallback_model ? formData.fallback_model.trim() : null
      };

      let res;
      if (payload.id) {
        res = await api.updateModelConfig(payload.id, payload);
      } else {
        res = await api.createModelConfig(payload);
      }

      if (res.success) {
        setSuccess('Configuration saved successfully.');
        // Refresh local maps
        await fetchConfigs();
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(res.detail || 'Failed to save configuration.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred while saving settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Are you sure you want to seed default routes? This will overwrite missing configurations.')) {
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.seedModelConfigs();
      if (res.success) {
        setSuccess('Default configurations seeded successfully.');
        await fetchConfigs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to seed configurations.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error seeding configurations.');
    } finally {
      setLoading(false);
    }
  };

  const currentModels = providerModels[formData.provider] || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Dashboard section */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                System Governance</div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                AI Configuration Orchestrator
              </h1>
              <p className="max-w-xl text-xs text-slate-400">
                Manage AI provider settings, models routing, and temperature parameters for every product feature.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSeedDefaults}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Seed Default Routes
              </button>
            </div>
          </div>
        </section>

        {success && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 shadow-md">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 shadow-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-20 text-center shadow-lg">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"></div>
            <p className="text-slate-400 text-xs">Loading orchestrator settings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            
            {/* Sidebar list of AI Features */}
            <aside className="lg:col-span-1 space-y-2.5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3">Product Features</p>
              <div className="space-y-1">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature.key === feature.key;
                  return (
                    <button
                      key={feature.key}
                      onClick={() => {
                        setActiveFeature(feature);
                        setActiveMode(feature.modes[0]);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {feature.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Central Routing Panel */}
            <main className="lg:col-span-3 space-y-6">
              <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-xl backdrop-blur-xl">
                
                {/* Feature Header */}
                <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeFeature.label}</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure model parameters and execution targets.</p>
                  </div>
                  
                  {/* Experience Mode selector (if feature has multiple modes, like Chat) */}
                  {activeFeature.modes.length > 1 && (
                    <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-850">
                      {activeFeature.modes.map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setActiveMode(mode)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition ${
                            activeMode === mode
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'text-slate-500 hover:text-slate-350'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSave} className="mt-6 space-y-6">
                  <div className="space-y-6">
                    {/* Primary AI Header */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Primary AI Settings</h3>
                      <div className="mt-4 grid gap-6 sm:grid-cols-2">
                        {/* Provider Select */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">AI Provider</label>
                          <select
                            value={formData.provider || 'claude'}
                            onChange={(e) => {
                              setFormData({ 
                                ...formData, 
                                provider: e.target.value,
                                model: '', // Clear model on provider swap
                                api_key_env: e.target.value === 'openai' ? 'OPENAI_API_KEY' : 
                                             e.target.value === 'groq' ? 'GROQ_API_KEY' : 
                                             e.target.value === 'gemini' ? 'GOOGLE_API_KEY' : 'ANTHROPIC_API_KEY'
                              });
                            }}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                          >
                            {PROVIDERS.map((prov) => (
                              <option key={prov.value} value={prov.value}>{prov.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Model Selector (Hybrid Mode) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-400">Target Model</label>
                            <button
                              type="button"
                              onClick={handleRefreshModels}
                              disabled={fetchingModels}
                              className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCw className={`h-3 w-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                              Refresh List
                            </button>
                          </div>

                          {customModel ? (
                            <input
                              type="text"
                              value={formData.model || ''}
                              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                              placeholder="e.g. claude-3-5-sonnet-20241022"
                              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                            />
                          ) : (
                            <select
                              value={formData.model || ''}
                              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                            >
                              <option value="">-- Select Model --</option>
                              {currentModels.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            <input
                              id="custom_model_toggle"
                              type="checkbox"
                              checked={customModel}
                              onChange={(e) => setCustomModel(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                            />
                            <label htmlFor="custom_model_toggle" className="text-[10px] font-medium text-slate-400 cursor-pointer">
                              Enter custom model string manually
                            </label>
                          </div>
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-bold">Temperature</span>
                            <span className="font-semibold text-slate-200">{formData.temperature ?? 0.7}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={formData.temperature ?? 0.7}
                            onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                            className="w-full accent-sky-500 bg-slate-950 h-2 rounded-lg cursor-pointer border border-slate-800"
                          />
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">Max Tokens</label>
                          <input
                            type="number"
                            min="1"
                            max="100000"
                            value={formData.max_tokens ?? 2048}
                            onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-800" />

                    {/* Fallback AI Section */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                        Fallback AI Settings
                      </h3>
                      
                      <div className="mt-4 flex items-center gap-2 bg-slate-950/60 p-4 border border-slate-800 rounded-2xl">
                        <input
                          id="fallback_enabled_toggle"
                          type="checkbox"
                          checked={formData.fallback_enabled ?? false}
                          onChange={(e) => setFormData({ ...formData, fallback_enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                        />
                        <label htmlFor="fallback_enabled_toggle" className="text-xs font-medium text-slate-350 cursor-pointer">
                          Enable Fallback AI Route (executed if primary AI encounters retryable errors)
                        </label>
                      </div>

                      {formData.fallback_enabled && (
                        <div className="mt-4 grid gap-6 sm:grid-cols-2 animate-fade-in">
                          {/* Fallback Provider Select */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">Fallback AI Provider</label>
                            <select
                              value={formData.fallback_provider || 'gemini'}
                              onChange={(e) => {
                                setFormData({ 
                                  ...formData, 
                                  fallback_provider: e.target.value,
                                  fallback_model: '' // Clear fallback model on provider swap
                                });
                              }}
                              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                            >
                              {PROVIDERS.map((prov) => (
                                <option key={prov.value} value={prov.value}>{prov.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Fallback Model Selector (Hybrid Mode) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-400">Fallback Target Model</label>
                            </div>

                            {customFallbackModel ? (
                              <input
                                type="text"
                                value={formData.fallback_model || ''}
                                onChange={(e) => setFormData({ ...formData, fallback_model: e.target.value })}
                                placeholder="e.g. gemini-1.5-flash"
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                              />
                            ) : (
                              <select
                                value={formData.fallback_model || ''}
                                onChange={(e) => setFormData({ ...formData, fallback_model: e.target.value })}
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                              >
                                <option value="">-- Select Fallback Model --</option>
                                {(providerModels[formData.fallback_provider] || []).map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <input
                                id="custom_fallback_model_toggle"
                                type="checkbox"
                                checked={customFallbackModel}
                                onChange={(e) => setCustomFallbackModel(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                              />
                              <label htmlFor="custom_fallback_model_toggle" className="text-[10px] font-medium text-slate-400 cursor-pointer">
                                Enter custom fallback model string manually
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <hr className="border-slate-800" />
                    
                    {/* Configuration Status Card */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4 space-y-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Configuration Status</h4>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-400">Primary Status:</span>
                          {formData.provider && formData.model ? (
                            <span className="font-semibold text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Configured ({formData.provider} - {formData.model})
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-400">⚠️ Incomplete</span>
                          )}
                        </div>
                        
                        {formData.fallback_enabled && (
                          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                            <span className="font-bold text-slate-400">Fallback Status:</span>
                            {formData.fallback_provider && formData.fallback_model ? (
                              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Configured ({formData.fallback_provider} - {formData.fallback_model})
                              </span>
                            ) : (
                              <span className="font-semibold text-rose-400 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" /> Missing fields
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle switches & Save */}
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        id="is_active_toggle"
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <label htmlFor="is_active_toggle" className="text-xs font-medium text-slate-350 cursor-pointer">
                        Enable this experience route
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/10 hover:brightness-105 transition disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saveLoading ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </article>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
