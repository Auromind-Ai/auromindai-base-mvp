"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Power,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const API_KEY_OPTIONS = ['GROQ_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY'];
const PROVIDER_OPTIONS = ['claude', 'groq', 'gemini', 'openai'];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getEmptyForm = () => ({
  name: '',
  display_name: '',
  provider: 'claude',
  model: '',
  temperature: 0.7,
  max_tokens: 800,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  is_active: true,
  description: '',
  api_key_env: 'GROQ_API_KEY',
});

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const ModelConfigAdmin = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState(getEmptyForm());

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/admin/model-configs/`);
      const data = await response.json();

      if (data.success) {
        setConfigs(data.data);
        setError('');
      } else {
        setError('Failed to fetch configurations.');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const resetForm = () => {
    setFormErrors({});
    setFormData(getEmptyForm());
    setEditingConfig(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (config) => {
    setFormErrors({});
    setEditingConfig(config);
    setFormData({
      name: config.name,
      display_name: config.display_name,
      provider: config.provider,
      model: config.model,
      temperature: normalizeNumber(config.temperature, 0.7),
      max_tokens: normalizeNumber(config.max_tokens, 800),
      top_p: normalizeNumber(config.top_p, 1.0),
      frequency_penalty: normalizeNumber(config.frequency_penalty, 0.0),
      presence_penalty: normalizeNumber(config.presence_penalty, 0.0),
      is_active: config.is_active,
      description: config.description || '',
      api_key_env: config.api_key_env || 'GROQ_API_KEY',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'A unique configuration key is required.';
    }

    if (!formData.display_name.trim()) {
      errors.display_name = 'Display name cannot be empty.';
    }

    if (!formData.provider.trim()) {
      errors.provider = 'Select a provider.';
    }

    if (!formData.model.trim()) {
      errors.model = 'Model name is required.';
    }

    if (!formData.api_key_env.trim()) {
      errors.api_key_env = 'Choose an API key environment variable.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    display_name: formData.display_name.trim(),
    provider: formData.provider,
    model: formData.model.trim(),
    temperature: normalizeNumber(formData.temperature, 0.7),
    max_tokens: normalizeNumber(formData.max_tokens, 800),
    top_p: normalizeNumber(formData.top_p, 1.0),
    frequency_penalty: normalizeNumber(formData.frequency_penalty, 0.0),
    presence_penalty: normalizeNumber(formData.presence_penalty, 0.0),
    is_active: Boolean(formData.is_active),
    description: formData.description.trim(),
    api_key_env: formData.api_key_env,
  });

  const handleSave = async () => {
    if (!validateForm()) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setSaveLoading(true);
    setError('');

    try {
      const url = editingConfig
  ? `${API}/admin/model-configs/${editingConfig.id}`
  : `${API}/admin/model-configs/`;
      const method = editingConfig ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Configuration saved successfully.');
        fetchConfigs();
        closeForm();
        window.setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setError(data.detail || 'Failed to save configuration.');
      }
    } catch (err) {
      console.error(err);
      setError('Error saving configuration.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/admin/model-configs/${id}`, {
  method: 'DELETE',
});
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Configuration deleted.');
        fetchConfigs();
        window.setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setError(data.detail || 'Failed to delete configuration.');
      }
    } catch (err) {
      console.error(err);
      setError('Error deleting configuration.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await fetch(`${API}/admin/model-configs/${id}/toggle`, {
  method: 'PATCH',
});
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Configuration status updated.');
        fetchConfigs();
        window.setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setError(data.detail || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      setError('Error toggling status.');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const response = await fetch(`${API}/admin/model-configs/seed`, {
  method: 'POST',
});
      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Default configurations seeded.');
        fetchConfigs();
        window.setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setError(data.detail || 'Failed to seed configurations.');
      }
    } catch (err) {
      console.error(err);
      setError('Error seeding configurations.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">
                AI Configuration</div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                Model Configuration Center
              </h1>
              <p className="max-w-2xl text-sm text-slate-400">
                Manage provider settings, model behavior, and environment API keys in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-start lg:justify-end">
              <button
                onClick={handleSeedDefaults}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Seed Defaults
              </button>
              <button
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Add Configuration
              </button>
            </div>
          </div>
        </section>

        {successMessage && (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100 shadow-lg shadow-rose-500/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl transition-all duration-500 ease-out">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Configuration Form</p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {editingConfig ? 'Edit existing model configuration' : 'Create a new configuration'}
                </h2>
              </div>
              <button
                onClick={closeForm}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Close Form
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
              className="mt-6 space-y-6"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Configuration Key *</label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled={Boolean(editingConfig)}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      formErrors.name ? 'border-rose-400' : ''
                    }`}
                    placeholder="e.g. sonnet"
                  />
                  {formErrors.name && <p className="text-sm text-rose-400">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Display Name *</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className={`w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      formErrors.display_name ? 'border-rose-400' : ''
                    }`}
                    placeholder="e.g. Claude 3 Sonnet"
                  />
                  {formErrors.display_name && <p className="text-sm text-rose-400">{formErrors.display_name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className={`w-full rounded-3xl border px-4 py-3 text-slate-100 bg-slate-950/70 border-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      formErrors.provider ? 'border-rose-400' : ''
                    }`}
                  >
                    {PROVIDER_OPTIONS.map((provider) => (
                      <option key={provider} value={provider} className="bg-slate-950 text-slate-100">
                        {provider}
                      </option>
                    ))}
                  </select>
                  {formErrors.provider && <p className="text-sm text-rose-400">{formErrors.provider}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={`w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      formErrors.model ? 'border-rose-400' : ''
                    }`}
                    placeholder="e.g. claude-3-sonnet-20240229"
                  />
                  {formErrors.model && <p className="text-sm text-rose-400">{formErrors.model}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">API Key Env *</label>
                  <select
                    value={formData.api_key_env}
                    onChange={(e) => setFormData({ ...formData, api_key_env: e.target.value })}
                    className={`w-full rounded-3xl border px-4 py-3 text-slate-100 bg-slate-950/70 border-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      formErrors.api_key_env ? 'border-rose-400' : ''
                    }`}
                  >
                    {API_KEY_OPTIONS.map((keyOption) => (
                      <option key={keyOption} value={keyOption} className="bg-slate-950 text-slate-100">
                        {keyOption}
                      </option>
                    ))}
                  </select>
                  {formErrors.api_key_env && <p className="text-sm text-rose-400">{formErrors.api_key_env}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: normalizeNumber(e.target.value, 0.7) })}
                    className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Max Tokens</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: normalizeNumber(e.target.value, 800) })}
                    className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Top P</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.top_p}
                    onChange={(e) => setFormData({ ...formData, top_p: normalizeNumber(e.target.value, 1.0) })}
                    className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Frequency Penalty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="2"
                    value={formData.frequency_penalty}
                    onChange={(e) => setFormData({ ...formData, frequency_penalty: normalizeNumber(e.target.value, 0.0) })}
                    className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Presence Penalty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="2"
                    value={formData.presence_penalty}
                    onChange={(e) => setFormData({ ...formData, presence_penalty: normalizeNumber(e.target.value, 0.0) })}
                    className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-3xl border px-4 py-3 text-slate-100 outline-none bg-slate-950/70 border-slate-800 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Add a short description for this configuration"
                />
              </div>

              <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-300">
                    Active
                  </label>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className={`h-4 w-4 ${saveLoading ? 'animate-spin' : ''}`} />
                    {saveLoading ? 'Saving...' : editingConfig ? 'Save Changes' : 'Create Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
              <p className="text-slate-400">Loading configurations...</p>
            </div>
          ) : configs.length > 0 ? (
            configs.map((config) => (
              <article
                key={config.id}
                className={`group rounded-[1.75rem] border border-white/5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-slate-950/40 transition hover:-translate-y-1 hover:border-sky-500/30`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">{config.provider}</p>
                    <h3 className="mt-3 text-xl font-bold text-white">{config.display_name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{config.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      config.is_active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    {config.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-sm text-slate-400">
                  <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/5 px-4 py-3">
                    <span>Model</span>
                    <span className="font-medium text-slate-100 truncate">{config.model}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl bg-white/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Temp</p>
                      <p className="mt-2 font-semibold text-slate-100">{config.temperature}</p>
                    </div>
                    <div className="rounded-3xl bg-white/5 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Max Tokens</p>
                      <p className="mt-2 font-semibold text-slate-100">{config.max_tokens}</p>
                    </div>
                  </div>
                </div>

                {config.description && (
                  <p className="mt-6 line-clamp-3 text-sm leading-6 text-slate-400">
                    {config.description}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleToggleStatus(config.id)}
                    className={`inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                      config.is_active
                        ? 'border-slate-800 bg-white/5 text-slate-100 hover:bg-white/10'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {config.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEditForm(config)}
                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-3xl bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/15"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-3xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-slate-900/80 p-12 text-center shadow-2xl shadow-slate-950/40">
              <p className="text-slate-400">No model configurations exist yet.</p>
              <button
                onClick={handleSeedDefaults}
                className="mt-6 inline-flex items-center justify-center rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
              >
                Seed Default Configurations
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ModelConfigAdmin;
