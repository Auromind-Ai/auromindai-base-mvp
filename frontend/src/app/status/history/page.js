"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
} from "lucide-react";
import { jakarta } from "@/lib/fonts";

const SERVICES = [
  { key: "all", name: "All Services" },
  { key: "dashboard", name: "OrbionAgents Dashboard" },
  { key: "meta_api", name: "Meta API" },
  { key: "backend", name: "API Backend Services" },
  { key: "ai_services", name: "AI Services" },
];

export default function StatusHistoryPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (selectedService !== "all") params.append("service", selectedService);
      if (selectedYear) params.append("year", selectedYear.toString());

      const res = await fetch(`/api/status/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load historical notices:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedService, selectedYear]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
    setPage(1);
  };

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
    setPage(1);
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIds.size === incidents.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(incidents.map((i) => i.id)));
    }
  };

  const getSeverityBadgeStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "major":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "minor":
        return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
      case "maintenance":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "monitoring":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "identified":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "investigating":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-zinc-100 ${jakarta.className} antialiased relative`}>
      {/* Background radial accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-emerald-500/[0.03] blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/[0.06] bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/status" className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span>Current System Status</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center p-0.5">
              <ShieldCheck className="w-4 h-4 text-black stroke-[2.2]" />
            </div>
            <span className="font-extrabold text-sm tracking-wider text-white">
              ORBION <span className="text-emerald-400 font-semibold">AGENTS</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-8" id="history-container">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Incident & Notice History
          </h1>
          <p className="text-sm text-zinc-400">
            Archived record of all detected disruptions, maintenance windows, and resolution timelines for OrbionAgents services.
          </p>
        </div>

        {/* Filters & Controls */}
        <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter Archives</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Service selector */}
            <select
              value={selectedService}
              onChange={handleServiceChange}
              className="bg-black border border-white/10 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 transition"
            >
              {SERVICES.map((srv) => (
                <option key={srv.key} value={srv.key} className="bg-zinc-950 text-white">
                  {srv.name}
                </option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="bg-black border border-white/10 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 transition"
            >
              {[2026, 2025, 2024].map((yr) => (
                <option key={yr} value={yr} className="bg-zinc-950 text-white">
                  {yr}
                </option>
              ))}
            </select>

            {incidents.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition flex items-center gap-1.5"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>{expandedIds.size === incidents.length ? "Collapse All" : "Expand All"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm animate-pulse">
            Loading incident history...
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No incidents logged</h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
              No historical disruptions matching the selected filters were recorded. All services maintained continuous uptime.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => {
              const isExpanded = expandedIds.has(inc.id);
              const isResolved =
                inc.status === "resolved" ||
                Boolean(inc.resolved_time) ||
                (Boolean(inc.is_maintenance || inc.severity === "maintenance") &&
                  Boolean(inc.scheduled_end) &&
                  new Date(inc.scheduled_end) <= new Date());

              return (
                <div
                  key={inc.id}
                  className={`bg-[#050505] border transition-all duration-200 rounded-2xl overflow-hidden shadow-xl ${
                    isExpanded
                      ? "border-emerald-500/40 shadow-emerald-950/10"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {/* Clickable Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(inc.id)}
                    className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-1 rounded-lg bg-white/[0.04] text-zinc-400 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(
                            inc.status
                          )}`}
                        >
                          {inc.status}
                        </span>

                        {/* Severity Badge */}
                        <span
                          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${getSeverityBadgeStyle(
                            inc.severity
                          )}`}
                        >
                          {inc.severity || "Minor"}
                        </span>

                        {inc.is_maintenance && (
                          <span className="text-[10px] uppercase font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            Maintenance
                          </span>
                        )}
                      </div>

                      {/* Title & Service */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                          {inc.title}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {inc.service_name}
                        </div>
                      </div>
                    </div>

                    {/* Right timestamp & duration */}
                    <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-zinc-400 shrink-0 self-start sm:self-auto pl-7 sm:pl-0">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>
                          {new Date(inc.resolved_time || inc.start_time).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {isResolved ? (
                        <span className="text-emerald-400 text-[11px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {inc.duration_minutes ? `${inc.duration_minutes} min` : "Resolved"}
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Ongoing
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-6 pt-3 border-t border-white/[0.06] space-y-4 bg-black/40">
                      {/* Meta Information Bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            Started:{" "}
                            <span className="text-zinc-200">
                              {inc.start_time
                                ? new Date(inc.start_time).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "N/A"}
                            </span>
                          </span>
                        </div>

                        {inc.resolved_time && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-600">&bull;</span>
                            <span>
                              Resolved:{" "}
                              <span className="text-emerald-400 font-medium">
                                {new Date(inc.resolved_time).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </span>
                          </div>
                        )}

                        {inc.duration_minutes && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-600">&bull;</span>
                            <span>
                              Total Outage Duration:{" "}
                              <span className="text-zinc-200 font-medium">
                                {inc.duration_minutes} min
                              </span>
                            </span>
                          </div>
                        )}

                        {inc.scheduled_start && inc.scheduled_end && (
                          <div className="flex items-center gap-1.5 w-full text-[11px] text-sky-400 pt-1 border-t border-white/5">
                            <span>
                              Scheduled Window: {new Date(inc.scheduled_start).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })} &mdash; {new Date(inc.scheduled_end).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <h4 className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                          Incident Details
                        </h4>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line font-normal">
                          {inc.description}
                        </p>
                      </div>

                      {/* Incident Timeline */}
                      {inc.updates && inc.updates.length > 0 && (
                        <div className="pt-2 space-y-3">
                          <h4 className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                            Incident Progress Timeline
                          </h4>
                          <div className="relative pl-4 space-y-4 border-l border-white/10 ml-2">
                            {inc.updates.map((up) => (
                              <div key={up.id} className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-black" />
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-white capitalize">
                                    {up.status}
                                  </span>
                                  <span className="text-zinc-500">
                                    &mdash;{" "}
                                    {new Date(up.created_at).toLocaleString(undefined, {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                  {up.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Scrolling Controls */}
        {!loading && incidents.length > 0 && totalPages > 1 && (
          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="text-xs text-zinc-400">
              Showing{" "}
              <span className="text-white font-semibold">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="text-white font-semibold">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="text-white font-semibold">{total}</span>{" "}
              historical notices
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => {
                  if (page > 1) {
                    setPage((p) => p - 1);
                    document.getElementById("history-container")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => {
                    setPage(pNum);
                    document.getElementById("history-container")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-8 h-8 text-xs font-semibold rounded-xl border transition ${
                    page === pNum
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {pNum}
                </button>
              ))}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => {
                  if (page < totalPages) {
                    setPage((p) => p + 1);
                    document.getElementById("history-container")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
