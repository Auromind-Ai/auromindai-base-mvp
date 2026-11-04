"use client";

import React, { useState, useEffect, useCallback } from "react";
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

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
      });
      if (selectedService !== "all") params.append("service", selectedService);
      if (selectedYear) params.append("year", selectedYear.toString());

      const res = await fetch(`/api/status/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error("Failed to load historical notices:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedService, selectedYear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Incident & Notice History
          </h1>
          <p className="text-sm text-zinc-400">
            Archived record of all detected disruptions, maintenance windows, and resolution timelines for OrbionAgents services.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter Archives</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Service selector */}
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-black border border-white/10 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 transition"
            >
              {SERVICES.map((s) => (
                <option key={s.key} value={s.key} className="bg-zinc-950 text-white">
                  {s.name}
                </option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-black border border-white/10 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 transition"
            >
              {[2026, 2025, 2024].map((yr) => (
                <option key={yr} value={yr} className="bg-zinc-950 text-white">
                  {yr}
                </option>
              ))}
            </select>
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
          <div className="space-y-6">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    <span
                      className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>

                    {/* Severity Badge (Requirement 4) */}
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${getSeverityBadgeStyle(
                        inc.severity
                      )}`}
                    >
                      {inc.severity || "Minor"}
                    </span>

                    {/* Service Name */}
                    <span className="text-xs text-zinc-300 font-medium">
                      {inc.service_name}
                    </span>

                    {inc.is_maintenance && (
                      <span className="text-[10px] uppercase font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        Maintenance Window
                      </span>
                    )}
                  </div>

                  {/* Timestamp, Resolution Time, and Duration (Requirement 4) */}
                  <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {inc.start_time
                          ? new Date(inc.start_time).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                      </span>
                    </div>

                    {inc.status === "resolved" || inc.resolved_time || ((inc.is_maintenance || inc.severity === "maintenance") && inc.scheduled_end && new Date(inc.scheduled_end) <= new Date()) ? (
                      <>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-emerald-400 font-medium">
                          Resolved:{" "}
                          {new Date(
                            inc.resolved_time ||
                            inc.scheduled_end ||
                            inc.updates?.[0]?.created_at ||
                            inc.start_time
                          ).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </>
                    ) : (inc.is_maintenance || inc.severity === "maintenance") && inc.scheduled_start && new Date(inc.scheduled_start) > new Date() ? (
                      <>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-sky-400 font-medium">Scheduled</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-amber-400 font-medium">Ongoing</span>
                      </>
                    )}

                    {(inc.duration_minutes || (inc.start_time && (inc.resolved_time || inc.scheduled_end || inc.status === "resolved"))) && (
                      <>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-zinc-300">
                          Duration: {inc.duration_minutes || Math.max(1, Math.round((new Date(inc.resolved_time || inc.scheduled_end || Date.now()) - new Date(inc.scheduled_start || inc.start_time)) / 60000))} min
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">
                    {inc.title}
                  </h3>
                  <p className="text-sm text-zinc-300 mt-2 leading-relaxed whitespace-pre-line font-normal">
                    {inc.description}
                  </p>
                </div>

                {/* Timeline */}
                {inc.updates && inc.updates.length > 0 && (
                  <div className="pt-3 space-y-3">
                    <h4 className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                      Incident Progress Timeline
                    </h4>
                    <div className="relative pl-4 space-y-4 border-l border-white/10 ml-2">
                      {inc.updates.map((up) => (
                        <div key={up.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-black" />
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-zinc-300 capitalize">
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
                          <p className="text-xs text-zinc-400 mt-0.5 leading-normal">
                            {up.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
