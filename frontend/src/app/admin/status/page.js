"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  Clock,
  Sliders,
  Users,
  ShieldCheck,
  Wrench,
  Search,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";

const SERVICES = [
  { key: "dashboard", name: "OrbionAgents Dashboard" },
  { key: "meta_api", name: "Meta API" },
  { key: "backend", name: "API Backend Services" },
  { key: "ai_services", name: "AI Services" },
];

export default function AdminStatusManagementPage() {
  const [overview, setOverview] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, incidents, subscribers, settings

  // Incident Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Create Incident Form
  const [createForm, setCreateForm] = useState({
    service_key: "dashboard",
    title: "",
    severity: "major",
    status: "investigating",
    description: "",
    is_maintenance: false,
    scheduled_start: "",
    scheduled_end: "",
    initial_message: "",
  });

  // Update Incident Form
  const [updateForm, setUpdateForm] = useState({
    title: "",
    severity: "major",
    status: "investigating",
    description: "",
    update_message: "",
    is_maintenance: false,
    scheduled_start: "",
    scheduled_end: "",
  });

  // Config Form
  const [configForm, setConfigForm] = useState({
    failure_threshold: 3,
    recovery_threshold: 2,
    timeout_seconds: 10,
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [overRes, incRes, subRes] = await Promise.all([
        api.get("/admin/status/overview"),
        api.get("/admin/status/incidents?status_filter=all&limit=50"),
        api.get("/admin/status/subscribers?limit=50"),
      ]);

      setOverview(overRes);
      setIncidents(incRes.incidents || []);
      setSubscribers(subRes.subscribers || []);

      if (overRes.config) {
        setConfigForm({
          failure_threshold: overRes.config.failure_threshold || 3,
          recovery_threshold: overRes.config.recovery_threshold || 2,
          timeout_seconds: overRes.config.timeout_seconds || 10,
        });
      }
    } catch (err) {
      console.error("Failed to load admin status data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();
  }, [loadAllData]);

  const handleRunHealthCheck = async () => {
    setRunningCheck(true);
    try {
      await api.post("/admin/status/run-check", {});
      await loadAllData();
    } catch (err) {
      alert("Failed to run health check: " + (err.message || "Unknown error"));
    } finally {
      setRunningCheck(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        ...createForm,
        scheduled_start: createForm.scheduled_start ? new Date(createForm.scheduled_start).toISOString() : null,
        scheduled_end: createForm.scheduled_end ? new Date(createForm.scheduled_end).toISOString() : null,
      };
      await api.post("/admin/status/incidents", payload);
      setIsCreateModalOpen(false);
      setCreateForm({
        service_key: "dashboard",
        title: "",
        severity: "major",
        status: "investigating",
        description: "",
        is_maintenance: false,
        scheduled_start: "",
        scheduled_end: "",
        initial_message: "",
      });
      await loadAllData();
    } catch (err) {
      alert("Failed to create incident: " + (err.message || "Unknown error"));
    } finally {
      setFormSubmitting(false);
    }
  };

  const openUpdateModal = (inc) => {
    setSelectedIncident(inc);
    const formatForInput = (isoStr) => {
      if (!isoStr) return "";
      try {
        const d = new Date(isoStr);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return "";
      }
    };
    setUpdateForm({
      title: inc.title,
      severity: inc.severity,
      status: inc.status,
      description: inc.description,
      update_message: "",
      is_maintenance: inc.is_maintenance || false,
      scheduled_start: formatForInput(inc.scheduled_start),
      scheduled_end: formatForInput(inc.scheduled_end),
    });
    setIsUpdateModalOpen(true);
  };

  const handleUpdateIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setFormSubmitting(true);
    try {
      const payload = {
        ...updateForm,
        scheduled_start: updateForm.scheduled_start ? new Date(updateForm.scheduled_start).toISOString() : null,
        scheduled_end: updateForm.scheduled_end ? new Date(updateForm.scheduled_end).toISOString() : null,
      };
      await api.put(`/admin/status/incidents/${selectedIncident.id}`, payload);
      setIsUpdateModalOpen(false);
      setSelectedIncident(null);
      await loadAllData();
    } catch (err) {
      alert("Failed to update incident: " + (err.message || "Unknown error"));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickResolve = async (inc) => {
    const note = prompt("Enter optional resolution note for this incident:", "Incident resolved. Systems fully restored.");
    if (note === null) return;
    try {
      await api.post(`/admin/status/incidents/${inc.id}/resolve`, { resolution_note: note });
      await loadAllData();
    } catch (err) {
      alert("Failed to resolve incident: " + (err.message || "Unknown error"));
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMessage("");
    try {
      await api.put("/admin/status/config", configForm);
      setConfigMessage("Configuration saved successfully.");
      setTimeout(() => setConfigMessage(""), 3000);
    } catch (err) {
      alert("Failed to save config: " + (err.message || "Unknown error"));
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Status & Incident Management
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Monitor
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Automated health monitoring, incident lifecycle tracking, and public status page controls for OrbionAgents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/status"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition"
          >
            <span>Public Status Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <button
            onClick={handleRunHealthCheck}
            disabled={runningCheck}
            className="flex items-center gap-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningCheck ? "animate-spin" : ""}`} />
            <span>{runningCheck ? "Probing Services..." : "Run Health Check Now"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        {[
          { key: "overview", label: "Overview & Monitors", icon: Activity },
          { key: "incidents", label: "Incidents & Maintenance", icon: AlertTriangle, badge: overview?.active_incidents_count },
          { key: "subscribers", label: "Subscribers", icon: Users, badge: overview?.subscribers_count },
          { key: "settings", label: "Threshold Settings", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition relative ${
                isActive
                  ? "text-emerald-400 bg-white/[0.04] border-b-2 border-emerald-400 font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & MONITORS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Overall System Banner Summary */}
          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {overview?.summary?.overall_title || "All systems operational"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {overview?.summary?.overall_description || "All 4 OrbionAgents services are operational."}
                </p>
              </div>
            </div>

            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Last evaluated: {overview?.summary?.updated_at ? new Date(overview.summary.updated_at).toLocaleTimeString() : "Just now"}</span>
            </div>
          </div>

          {/* Four Services Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(overview?.summary?.services || []).map((srv) => (
              <div
                key={srv.key}
                className="bg-[#050505] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                      Service
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                      {srv.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                      srv.status === "operational"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {srv.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-1">{srv.subtitle}</p>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-medium">
                      Response Time
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {srv.response_time_ms ? `~${Math.round(srv.response_time_ms)} ms` : "N/A"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px] uppercase font-medium">
                      90d Uptime
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {srv.uptime_percentage}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Raw Checks Log */}
          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">
              Recent Automated Health Checks (1-Minute Intervals)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-zinc-400">
                    <th className="py-2.5 font-medium">Service</th>
                    <th className="py-2.5 font-medium">Result</th>
                    <th className="py-2.5 font-medium">HTTP Code</th>
                    <th className="py-2.5 font-medium">Response Time</th>
                    <th className="py-2.5 font-medium">Timestamp</th>
                    <th className="py-2.5 font-medium">Diagnostic Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(overview?.recent_checks || []).slice(0, 10).map((chk) => (
                    <tr key={chk.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-semibold text-white">{chk.service_name}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            chk.is_healthy
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {chk.is_healthy ? "HEALTHY" : "FAILED"}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-400">{chk.status_code || "—"}</td>
                      <td className="py-2.5 text-zinc-200 font-medium">
                        {chk.response_time_ms ? `${chk.response_time_ms} ms` : "0 ms"}
                      </td>
                      <td className="py-2.5 text-zinc-400">
                        {chk.checked_at ? new Date(chk.checked_at).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-2.5 text-zinc-400 truncate max-w-xs">
                        {chk.error_message || "All probes succeeded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENTS & MAINTENANCE */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white tracking-tight">
                Incident Management
              </h2>
              <p className="text-xs text-zinc-400">
                Create incidents manually, publish maintenance announcements, or manage timelines.
              </p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Incident</span>
            </button>
          </div>

          {/* Incidents Table */}
          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400">
                    <th className="py-3 px-4 font-semibold">Title & Service</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Severity</th>
                    <th className="py-3 px-4 font-semibold">Origin</th>
                    <th className="py-3 px-4 font-semibold">Start Time</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        No incidents recorded yet.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{inc.title}</div>
                          <div className="text-[11px] text-zinc-400">{inc.service_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              inc.status === "resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : inc.status === "monitoring"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                              inc.severity === "critical"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : inc.severity === "maintenance"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {inc.is_auto_detected ? "Automated" : "Manual Admin"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                          {inc.start_time ? new Date(inc.start_time).toLocaleString() : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 font-medium">
                          {inc.duration_minutes
                            ? `${inc.duration_minutes} min`
                            : inc.status === "resolved"
                            ? `${Math.max(1, Math.round(((inc.resolved_time ? new Date(inc.resolved_time) : inc.scheduled_end ? new Date(inc.scheduled_end) : new Date()) - new Date(inc.scheduled_start || inc.start_time || Date.now())) / 60000))} min`
                            : (inc.is_maintenance || inc.severity === "maintenance") && inc.scheduled_end && new Date(inc.scheduled_end) <= new Date()
                            ? "Completed"
                            : (inc.is_maintenance || inc.severity === "maintenance") && inc.scheduled_start && new Date(inc.scheduled_start) > new Date()
                            ? "Scheduled"
                            : "Ongoing"}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openUpdateModal(inc)}
                            className="text-xs px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition"
                          >
                            Edit
                          </button>
                          {inc.status !== "resolved" && (
                            <button
                              onClick={() => handleQuickResolve(inc)}
                              className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium transition"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIBERS */}
      {activeTab === "subscribers" && (
        <div className="space-y-6">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white tracking-tight">
              Incident Notification Subscribers
            </h2>
            <p className="text-xs text-zinc-400">
              Users registered through the public status page to receive alert updates.
            </p>
          </div>

          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Subscriber Email</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Subscribed On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-zinc-500">
                      No subscribers registered yet.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-medium text-white">{sub.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {sub.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: THRESHOLD SETTINGS */}
      {activeTab === "settings" && (
        <div className="max-w-2xl bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              Automated Monitoring Settings
            </h2>
            <p className="text-xs text-zinc-400">
              Configure failure sensitivity and auto-recovery parameters to prevent false alerts.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Failure Threshold (Consecutive Fails before Alert)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={configForm.failure_threshold}
                onChange={(e) => setConfigForm({ ...configForm, failure_threshold: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Standard: 3 checks (avoids false alerts on transient single-request network spikes).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Recovery Threshold (Consecutive Passes to Auto-Resolve)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={configForm.recovery_threshold}
                onChange={(e) => setConfigForm({ ...configForm, recovery_threshold: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Standard: 2 consecutive healthy checks before marking incident automatically resolved.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                HTTP Probe Timeout (Seconds)
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={configForm.timeout_seconds}
                onChange={(e) => setConfigForm({ ...configForm, timeout_seconds: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={configSaving}
                className="text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-5 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {configSaving ? "Saving..." : "Save Configuration"}
              </button>
              {configMessage && (
                <span className="text-xs text-emerald-400 font-medium">
                  {configMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* CREATE INCIDENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Incident / Maintenance</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Impacted Service</label>
                <select
                  value={createForm.service_key}
                  onChange={(e) => setCreateForm({ ...createForm, service_key: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">All Services (Global Outage / Maintenance)</option>
                  {SERVICES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meta Graph API Latency Spike"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Severity</label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Initial Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Public Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue, impacted customers, and immediate steps taken..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Initial Timeline Update Note</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering is currently investigating upstream gateway timeouts."
                  value={createForm.initial_message}
                  onChange={(e) => setCreateForm({ ...createForm, initial_message: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_maint"
                  checked={createForm.is_maintenance}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCreateForm({
                      ...createForm,
                      is_maintenance: checked,
                      severity: checked ? "maintenance" : createForm.severity === "maintenance" ? "major" : createForm.severity,
                    });
                  }}
                  className="rounded border-zinc-700 bg-black text-emerald-400 focus:ring-0"
                />
                <label htmlFor="is_maint" className="text-zinc-300 font-medium">
                  Mark as Scheduled Maintenance Announcement
                </label>
              </div>

              {createForm.is_maintenance && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Maintenance Start
                    </label>
                    <input
                      type="datetime-local"
                      value={createForm.scheduled_start}
                      onChange={(e) => setCreateForm({ ...createForm, scheduled_start: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Maintenance End
                    </label>
                    <input
                      type="datetime-local"
                      value={createForm.scheduled_end}
                      onChange={(e) => setCreateForm({ ...createForm, scheduled_end: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? "Publishing..." : "Publish Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE INCIDENT MODAL */}
      {isUpdateModalOpen && selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Update Incident Progress</h3>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={updateForm.title}
                  onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Severity</label>
                  <select
                    value={updateForm.severity}
                    onChange={(e) => setUpdateForm({ ...updateForm, severity: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Status</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="update_is_maint"
                  checked={updateForm.is_maintenance}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUpdateForm({
                      ...updateForm,
                      is_maintenance: checked,
                      severity: checked ? "maintenance" : updateForm.severity === "maintenance" ? "major" : updateForm.severity,
                    });
                  }}
                  className="rounded border-zinc-700 bg-black text-emerald-400 focus:ring-0"
                />
                <label htmlFor="update_is_maint" className="text-zinc-300 font-medium">
                  Mark as Scheduled Maintenance Announcement
                </label>
              </div>

              {updateForm.is_maintenance && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Maintenance Start
                    </label>
                    <input
                      type="datetime-local"
                      value={updateForm.scheduled_start}
                      onChange={(e) => setUpdateForm({ ...updateForm, scheduled_start: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Maintenance End
                    </label>
                    <input
                      type="datetime-local"
                      value={updateForm.scheduled_end}
                      onChange={(e) => setUpdateForm({ ...updateForm, scheduled_end: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 space-y-1.5">
                <label className="block text-emerald-400 font-semibold">
                  Post Timeline Progress Update
                </label>
                <input
                  type="text"
                  placeholder="e.g. Root cause identified. Fix deployed, monitoring latency recovery."
                  value={updateForm.update_message}
                  onChange={(e) => setUpdateForm({ ...updateForm, update_message: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[10px] text-zinc-500 block">
                  This note will appear publicly on the status page timeline.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
