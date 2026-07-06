"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  WifiOff,
  LogIn,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Feature & Provider Definitions ──────────────────────────────────────────

const FEATURES = [
  { key: 'chat',      label: 'Chat & Conversations',  icon: MessageSquare, modes: ['auto', 'fast', 'smart', 'deep', 'flash'] },
  { key: 'inbox',     label: 'Inbox Agent Message',   icon: Mail,          modes: ['auto'] },
  { key: 'flow',      label: 'Flow Generation',       icon: Zap,           modes: ['auto'] },
  { key: 'template',  label: 'Template Draft Email',  icon: BookOpen,      modes: ['auto'] },
  { key: 'rag',       label: 'Agentic RAG Query',     icon: Search,        modes: ['auto'] },
  { key: 'knowledge', label: 'Knowledge Base Upload', icon: Cpu,           modes: ['auto'] },
];

const PROVIDERS = [
  { value: 'openai',  label: 'OpenAI'           },
  { value: 'claude',  label: 'Anthropic Claude' },
  { value: 'gemini',  label: 'Google Gemini'    },
  { value: 'groq',    label: 'Groq'             },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  fallback_model: '',
});

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ConfigSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 animate-pulse">
      {/* sidebar skeleton */}
      <aside className="lg:col-span-1 space-y-2">
        <div className="h-3 w-28 rounded bg-slate-800 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-2xl bg-slate-800/60" />
        ))}
      </aside>

      {/* main panel skeleton */}
      <div className="lg:col-span-3 rounded-3xl border border-white/5 bg-slate-900/40 p-6 space-y-6">
        <div className="h-5 w-48 rounded bg-slate-800" />
        <div className="h-3 w-64 rounded bg-slate-800/60" />
        <div className="border-t border-slate-800 pt-6 grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-800" />
              <div className="h-10 rounded-2xl bg-slate-800/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error Panel ──────────────────────────────────────────────────────────────

function ErrorPanel({ error, onRetry, onLogin, isSessionExpired, isTimeout }) {
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-10 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        {isSessionExpired ? (
          <ShieldAlert className="h-7 w-7 text-rose-400" />
        ) : isTimeout ? (
          <WifiOff className="h-7 w-7 text-amber-400" />
        ) : (
          <AlertCircle className="h-7 w-7 text-rose-400" />
        )}
      </div>

      <h3 className="text-base font-bold text-white mb-1">
        {isSessionExpired
          ? 'Session Expired'
          : isTimeout
          ? 'Connection Timed Out'
          : 'Failed to Load Configurations'}
      </h3>
      <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto">{error}</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isSessionExpired ? (
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow hover:brightness-110 transition"
          >
            <LogIn className="h-3.5 w-3.5" />
            Back to Login
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow hover:brightness-110 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Toast Notification ────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors =
    type === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl transition-all ${colors}`}
      style={{ animation: 'slide-up 0.25s ease' }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModelConfigAdmin() {
  const router = useRouter();

  const [activeFeature, setActiveFeature] = useState(FEATURES[0]);
  const [activeMode,    setActiveMode]    = useState('auto');

  // Config store keyed as "feature_key:experience_level"
  const [configs, setConfigs] = useState({});

  // Loading & error state
  const [loading,     setLoading]     = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [fetchError,  setFetchError]  = useState(null);   // { message, isSessionExpired, isTimeout }

  // Toast state
  const [toast, setToast] = useState(null); // { message, type }

  // Form state
  const [formData,            setFormData]            = useState({});
  const [customModel,         setCustomModel]         = useState(false);
  const [customFallbackModel, setCustomFallbackModel] = useState(false);

  // Provider model list dropdown cache
  const [providerModels, setProviderModels] = useState({});
  const [fetchingModels, setFetchingModels] = useState(false);

  // Abort controller ref for cleanup on unmount
  const abortRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Fetch all configs ──────────────────────────────────────────────────────
  const fetchConfigs = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(null);

    try {
      const res = await api.getModelConfigs({ signal: controller.signal });

      if (controller.signal.aborted) return;

      if (res && res.success && Array.isArray(res.data)) {
        const configMap = {};
        res.data.forEach((item) => {
          configMap[`${item.feature_key}:${item.experience_level}`] = item;
        });
        setConfigs(configMap);
      } else {
        setFetchError({
          message: 'Server returned an unexpected response. Please try again.',
          isSessionExpired: false,
          isTimeout: false,
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      const isSessionExpired = err.status === 401 || err.status === 403;
      const isTimeout        = err.isTimeout === true || err.status === 408;

      console.error('[ModelConfig] fetchConfigs error:', err);

      setFetchError({
        message: isSessionExpired
          ? 'Your admin session has expired. Please log back in.'
          : isTimeout
          ? 'The API took too long to respond. The server may be restarting — please retry in a moment.'
          : err.message || 'Could not load AI configurations from the backend.',
        isSessionExpired,
        isTimeout,
      });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConfigs();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchConfigs]);

  // Sync form data when active feature/mode changes
  useEffect(() => {
    if (!activeFeature) return;
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
  }, [activeFeature, activeMode, configs]);

  // ── Fetch provider model lists ─────────────────────────────────────────────
  const fetchProviderModels = useCallback(async (provider) => {
    if (!provider || providerModels[provider]) return;
    try {
      setFetchingModels(true);
      const res = await api.getProviderModels(provider);
      if (res?.success) {
        setProviderModels((prev) => ({ ...prev, [provider]: res.models }));
      }
    } catch (err) {
      console.warn('[ModelConfig] getProviderModels error:', err);
    } finally {
      setFetchingModels(false);
    }
  }, [providerModels]);

  useEffect(() => { if (formData.provider)          fetchProviderModels(formData.provider);          }, [formData.provider,          fetchProviderModels]);
  useEffect(() => { if (formData.fallback_provider)  fetchProviderModels(formData.fallback_provider);  }, [formData.fallback_provider,  fetchProviderModels]);

  const handleRefreshModels = async () => {
    const provider = formData.provider;
    if (!provider) return;
    try {
      setFetchingModels(true);
      const res = await api.getProviderModels(provider);
      if (res?.success) {
        setProviderModels((prev) => ({ ...prev, [provider]: res.models }));
        showToast(`Refreshed ${provider} models list.`);
      }
    } catch (err) {
      showToast(`Failed to fetch models from ${provider}.`, 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  // ── Save config ────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.model?.trim()) {
      showToast('Please specify a model.', 'error');
      return;
    }
    if (formData.fallback_enabled) {
      if (!formData.fallback_provider || !formData.fallback_model?.trim()) {
        showToast('Specify both fallback provider and model.', 'error');
        return;
      }
      if (
        formData.provider === formData.fallback_provider &&
        formData.model.trim() === formData.fallback_model.trim()
      ) {
        showToast('Fallback cannot be identical to primary.', 'error');
        return;
      }
    }

    try {
      setSaveLoading(true);
      const payload = {
        ...formData,
        model: formData.model.trim(),
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens),
        fallback_model: formData.fallback_model ? formData.fallback_model.trim() : null,
      };

      const res = payload.id
        ? await api.updateModelConfig(payload.id, payload)
        : await api.createModelConfig(payload);

      if (res?.success) {
        showToast('Configuration saved successfully.');
        await fetchConfigs();
      } else {
        showToast(res?.detail || 'Failed to save configuration.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error saving configuration.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Seed defaults ──────────────────────────────────────────────────────────
  const handleSeedDefaults = async () => {
    if (!window.confirm('Seed default AI routes? Missing configurations will be created.')) return;
    try {
      setLoading(true);
      const res = await api.seedModelConfigs();
      if (res?.success) {
        showToast('Default configurations seeded.');
        await fetchConfigs();
      } else {
        showToast('Failed to seed configurations.', 'error');
        setLoading(false);
      }
    } catch (err) {
      showToast(err.message || 'Error seeding configurations.', 'error');
      setLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentModels = providerModels[formData.provider] || [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ── */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                System Governance
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                AI Configuration Orchestrator
              </h1>
              <p className="max-w-xl text-xs text-slate-400">
                Manage AI provider settings, model routing, and temperature parameters for every product feature.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSeedDefaults}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Seed Default Routes
              </button>
            </div>
          </div>
        </section>

        {/* ── Body ── */}
        {loading ? (
          <ConfigSkeleton />
        ) : fetchError ? (
          <ErrorPanel
            error={fetchError.message}
            isSessionExpired={fetchError.isSessionExpired}
            isTimeout={fetchError.isTimeout}
            onRetry={fetchConfigs}
            onLogin={() => router.push('/admin')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

            {/* ── Feature Sidebar ── */}
            <aside className="lg:col-span-1 space-y-2.5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3">
                Product Features
              </p>
              <div className="space-y-1">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature.key === feature.key;
                  const key = `${feature.key}:${feature.modes[0]}`;
                  const isConfigured = !!configs[key];
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
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{feature.label}</span>
                      {isConfigured && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="px-3 pt-2 flex items-center gap-2 text-[10px] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Configured
              </div>
            </aside>

            {/* ── Central Routing Panel ── */}
            <main className="lg:col-span-3 space-y-6">
              <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-xl backdrop-blur-xl">

                {/* Feature Header */}
                <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeFeature.label}</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure model parameters and execution targets.</p>
                  </div>

                  {/* Mode selector */}
                  {activeFeature.modes.length > 1 && (
                    <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                      {activeFeature.modes.map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setActiveMode(mode)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition ${
                            activeMode === mode
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'text-slate-500 hover:text-slate-300'
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

                    {/* Primary AI */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-sky-400">
                        Primary AI Settings
                      </h3>
                      <div className="mt-4 grid gap-6 sm:grid-cols-2">

                        {/* Provider */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">AI Provider</label>
                          <select
                            value={formData.provider || 'claude'}
                            onChange={(e) => setFormData({
                              ...formData,
                              provider: e.target.value,
                              model: '',
                              api_key_env:
                                e.target.value === 'openai'  ? 'OPENAI_API_KEY'    :
                                e.target.value === 'groq'    ? 'GROQ_API_KEY'      :
                                e.target.value === 'gemini'  ? 'GOOGLE_API_KEY'    : 'ANTHROPIC_API_KEY',
                            })}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                          >
                            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>

                        {/* Model */}
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
                              Refresh
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
                              {currentModels.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          )}

                          <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={customModel}
                              onChange={(e) => setCustomModel(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                            />
                            <span className="text-[10px] font-medium text-slate-400">Enter custom model string</span>
                          </label>
                        </div>

                        {/* Temperature */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-bold">Temperature</span>
                            <span className="font-semibold text-slate-200">{formData.temperature ?? 0.7}</span>
                          </div>
                          <input
                            type="range" min="0" max="2" step="0.05"
                            value={formData.temperature ?? 0.7}
                            onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                            className="w-full accent-sky-500 bg-slate-950 h-2 rounded-lg cursor-pointer border border-slate-800"
                          />
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">Max Tokens</label>
                          <input
                            type="number" min="1" max="100000"
                            value={formData.max_tokens ?? 2048}
                            onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-slate-800" />

                    {/* Fallback AI */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
                        Fallback AI Settings
                      </h3>

                      <label className="mt-4 flex items-center gap-3 bg-slate-950/60 p-4 border border-slate-800 rounded-2xl cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.fallback_enabled ?? false}
                          onChange={(e) => setFormData({ ...formData, fallback_enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-xs font-medium text-slate-350">
                          Enable Fallback AI Route (triggers on primary retryable errors)
                        </span>
                      </label>

                      {formData.fallback_enabled && (
                        <div className="mt-4 grid gap-6 sm:grid-cols-2">
                          {/* Fallback Provider */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">Fallback Provider</label>
                            <select
                              value={formData.fallback_provider || 'gemini'}
                              onChange={(e) => setFormData({ ...formData, fallback_provider: e.target.value, fallback_model: '' })}
                              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100"
                            >
                              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          </div>

                          {/* Fallback Model */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">Fallback Target Model</label>
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

                            <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={customFallbackModel}
                                onChange={(e) => setCustomFallbackModel(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                              />
                              <span className="text-[10px] font-medium text-slate-400">Enter custom fallback model string</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <hr className="border-slate-800" />

                    {/* Status Card */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4 space-y-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Configuration Status
                      </h4>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-400">Primary:</span>
                          {formData.provider && formData.model ? (
                            <span className="font-semibold text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {formData.provider} — {formData.model}
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-400">⚠ Incomplete</span>
                          )}
                        </div>

                        {formData.fallback_enabled && (
                          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                            <span className="font-bold text-slate-400">Fallback:</span>
                            {formData.fallback_provider && formData.fallback_model ? (
                              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {formData.fallback_provider} — {formData.fallback_model}
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

                  {/* Footer */}
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-xs font-medium text-slate-350">Enable this experience route</span>
                    </label>

                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/10 hover:brightness-105 transition disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saveLoading ? 'Saving…' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </article>
            </main>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
