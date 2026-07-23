"use client"

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Mail,
  Smartphone,
  Shield,
  CreditCard,
  Gauge,
  GitMerge,
  Users,
  Bot,
  Eye,
  X,
  Code
} from "lucide-react";
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  toggleNotificationTemplate,
  deleteNotificationTemplate,
  testRenderNotificationTemplate,
  seedDefaultNotificationTemplates
} from '@/lib/api/admin';

const CATEGORIES = ["All", "Security", "Billing", "Usage", "Workflow", "CRM", "AI"];
const CHANNELS = ["All", "email", "in_app", "sms"];

const COMMON_PLACEHOLDERS = [
  "{{user_name}}",
  "{{workspace_name}}",
  "{{email}}",
  "{{ip_address}}",
  "{{login_time}}",
  "{{amount}}",
  "{{invoice_id}}",
  "{{action_url}}",
  "{{reset_link}}",
  "{{resource_name}}",
  "{{workflow_name}}",
  "{{lead_name}}",
  "{{customer_name}}"
];

export default function NotificationTemplatesAdminPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedChannel, setSelectedChannel] = useState("All");
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    category: "Security",
    template_key: "",
    name: "",
    channel: "email",
    title: "",
    subject: "",
    message: "",
    is_active: true
  });

  // Delete State
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  // Real-time Preview State
  const [renderedSubjectPreview, setRenderedSubjectPreview] = useState("");
  const [renderedBodyPreview, setRenderedBodyPreview] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await getNotificationTemplates({
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        channel: selectedChannel !== "All" ? selectedChannel : undefined,
        search: search || undefined
      });
      setTemplates(Array.isArray(res.data) ? res.data : (res.data?.templates || []));
    } catch (err) {
      console.error("Failed to fetch notification templates:", err);
      setMessage({ type: "error", text: "Failed to load notification templates." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, selectedChannel]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Compute live test render preview whenever modal inputs change
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setTimeout(async () => {
      try {
        const res = await testRenderNotificationTemplate({
          title: formData.title,
          subject: formData.subject,
          message: formData.message || ""
        });
        const data = res.data || res;
        setRenderedSubjectPreview(data.rendered_subject || data.rendered_title || formData.subject || "Subject Preview");
        setRenderedBodyPreview(data.rendered_message || formData.message || "Body text preview will render here...");
      } catch (err) {
        // Fallback local regex substitution if API fails
        const sample = {
          user_name: "Arun",
          workspace_name: "AuroMind AI",
          ip_address: "192.168.1.100",
          login_time: "2026-07-23 18:45:00 UTC",
          amount: "$49.00",
          action_url: "https://app.auromind.ai"
        };
        const replaceFn = (txt) => txt ? txt.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => sample[k] || `[${k}]`) : "";
        setRenderedSubjectPreview(replaceFn(formData.subject || formData.title) || "Subject Preview");
        setRenderedBodyPreview(replaceFn(formData.message) || "Body text preview will render here...");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [formData.subject, formData.title, formData.message, isModalOpen]);

  // Statistics
  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter(t => t.is_active).length;
    const emailCount = templates.filter(t => t.channel === "email").length;
    const inAppCount = templates.filter(t => t.channel === "in_app").length;
    return { total, active, emailCount, inAppCount };
  }, [templates]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      category: "Security",
      template_key: "",
      name: "",
      channel: "email",
      title: "",
      subject: "",
      message: "",
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({
      category: tpl.category || "Security",
      template_key: tpl.template_key || "",
      name: tpl.name || "",
      channel: tpl.channel || "email",
      title: tpl.title || "",
      subject: tpl.subject || "",
      message: tpl.message || "",
      is_active: tpl.is_active !== undefined ? tpl.is_active : true
    });
    setIsModalOpen(true);
  };

  const handleInsertPlaceholder = (placeholder) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + " " + placeholder
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateNotificationTemplate(editingTemplate.id, formData);
        setMessage({ type: "success", text: `Template '${formData.name}' updated successfully.` });
      } else {
        await createNotificationTemplate(formData);
        setMessage({ type: "success", text: `Template '${formData.name}' created successfully.` });
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error("Save error:", err);
      const detail = err.response?.data?.detail || "Failed to save notification template.";
      setMessage({ type: "error", text: detail });
    }
  };

  const handleToggleActive = async (tpl) => {
    try {
      await toggleNotificationTemplate(tpl.id);
      setTemplates(prev => prev.map(item => item.id === tpl.id ? { ...item, is_active: !item.is_active } : item));
      setMessage({ type: "success", text: `Toggled status for '${tpl.name}'.` });
    } catch (err) {
      console.error("Toggle error:", err);
      setMessage({ type: "error", text: "Failed to toggle template status." });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteNotificationTemplate(deletingTemplate.id);
      setMessage({ type: "success", text: `Template '${deletingTemplate.name}' deleted.` });
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error("Delete error:", err);
      setMessage({ type: "error", text: "Failed to delete template." });
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await seedDefaultNotificationTemplates();
      const text = res.data?.message || "Default templates seeded successfully.";
      setMessage({ type: "success", text });
      fetchTemplates();
    } catch (err) {
      console.error("Seed error:", err);
      setMessage({ type: "error", text: "Failed to seed default notification templates." });
    } finally {
      setSeeding(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toLowerCase()) {
      case "security": return <Shield className="w-4 h-4 text-emerald-400" />;
      case "billing": return <CreditCard className="w-4 h-4 text-purple-400" />;
      case "usage": return <Gauge className="w-4 h-4 text-amber-400" />;
      case "workflow": return <GitMerge className="w-4 h-4 text-blue-400" />;
      case "crm": return <Users className="w-4 h-4 text-pink-400" />;
      case "ai": return <Bot className="w-4 h-4 text-cyan-400" />;
      default: return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#050505] min-h-screen text-white">

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Notification Templates
              </h1>
              <p className="text-sm text-gray-400">
                Manage all system notification messages dynamically without redeploying code.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-all text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
            Seed Default Templates
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          message.type === "error"
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <div className="flex items-center gap-3">
            {message.type === "error" ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Templates</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bell className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Templates</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Channels</p>
            <h3 className="text-2xl font-bold text-purple-400 mt-1">{stats.emailCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">In-App Channels</p>
            <h3 className="text-2xl font-bold text-cyan-400 mt-1">{stats.inAppCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Channel Filter */}
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
        >
          {CHANNELS.map(ch => (
            <option key={ch} value={ch} className="bg-[#0f0f15] text-white">
              Channel: {ch.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-gray-400 uppercase text-[11px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Template Key & Name</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Subject / Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading notification templates...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No notification templates found. Click "Seed Default Templates" or create a new one.
                  </td>
                </tr>
              ) : (
                templates.map(tpl => (
                  <tr key={tpl.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(tpl.category)}
                        <span className="font-semibold text-xs text-white">{tpl.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{tpl.name}</span>
                        <span className="text-[11px] font-mono text-indigo-400">{tpl.template_key}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide uppercase ${
                        tpl.channel === "email"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : tpl.channel === "in_app"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {tpl.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      <span className="text-gray-300 text-xs truncate block">
                        {tpl.subject || tpl.title || "(No subject)"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(tpl)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          tpl.is_active ? "bg-indigo-600" : "bg-gray-700"
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          tpl.is_active ? "translate-x-4.5" : "translate-x-1"
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(tpl)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTemplate(tpl)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL WITH MANDATORY LIVE PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingTemplate ? "Edit Notification Template" : "Create Notification Template"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Configure notification wording and placeholders with mandatory real-time preview.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 2 Columns (Form & Mandatory Live Preview) */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Form Input Column */}
              <form onSubmit={handleSave} id="template-form" className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.filter(c => c !== "All").map(cat => (
                        <option key={cat} value={cat} className="bg-[#0f0f15]">{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Channel</label>
                    <select
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="email" className="bg-[#0f0f15]">Email</option>
                      <option value="in_app" className="bg-[#0f0f15]">In-App</option>
                      <option value="sms" className="bg-[#0f0f15]">SMS</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Template Key</label>
                  <input
                    type="text"
                    placeholder="e.g. welcome_signup, payment_success"
                    value={formData.template_key}
                    disabled={!!editingTemplate}
                    onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Template Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome Signup Email"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    {formData.channel === "email" ? "Email Subject Line" : "In-App Notification Title"}
                  </label>
                  <input
                    type="text"
                    placeholder={formData.channel === "email" ? "e.g. Welcome to {{workspace_name}}, {{user_name}}!" : "e.g. Welcome {{user_name}}!"}
                    value={formData.subject || formData.title}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Message Body Template</label>
                    <span className="text-[10px] text-gray-400">Supports {{placeholders}}</span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Write body text with placeholders like {{user_name}} or {{workspace_name}}..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Click-to-insert placeholder pills */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-indigo-400" /> Insert Placeholders:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_PLACEHOLDERS.map(ph => (
                      <button
                        type="button"
                        key={ph}
                        onClick={() => handleInsertPlaceholder(ph)}
                        className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono hover:bg-indigo-500/20 transition-colors"
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Active Status:</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      formData.is_active ? "bg-indigo-600" : "bg-gray-700"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? "translate-x-4.5" : "translate-x-1"
                    }`} />
                  </button>
                  <span className="text-xs text-gray-400">{formData.is_active ? "Active" : "Disabled"}</span>
                </div>

              </form>

              {/* MANDATORY LIVE PREVIEW COLUMN */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Mandatory Live Preview
                    </h3>
                    <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                      Real-time Render
                    </span>
                  </div>

                  {/* Subject Preview Card */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Subject Preview
                    </span>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-white">
                      {renderedSubjectPreview || "Subject Preview"}
                    </div>
                  </div>

                  {/* Body Preview Card */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Body Preview
                    </span>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[140px] font-sans">
                      {renderedBodyPreview || "Body preview text will render here as you type..."}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-300">
                  💡 Sample values (e.g. <span className="font-mono text-white">user_name = "Arun"</span>, <span className="font-mono text-white">workspace_name = "AuroMind AI"</span>) are rendered live above before saving.
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="template-form"
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all"
              >
                Save Template
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Template</h3>
                <p className="text-xs text-gray-400">Are you sure you want to delete this template?</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5">
              Template: <span className="font-bold text-white">{deletingTemplate.name}</span> ({deletingTemplate.template_key})
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
