"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock,
  ChevronRight,
  Mail,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Wrench,
  Check,
} from "lucide-react";
import { jakarta } from "@/lib/fonts";

const SERVICE_ORDER = ["dashboard", "meta_api", "backend", "ai_services"];

export default function PublicStatusPage() {
  const [summary, setSummary] = useState(null);
  const [history90d, setHistory90d] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null); // { serviceKey, dayIndex, clientX, clientY, dayData }
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState({ state: "idle", message: "" });

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, histRes, notRes] = await Promise.all([
        fetch("/api/status/summary", { cache: "no-store" }),
        fetch("/api/status/uptime-90d", { cache: "no-store" }),
        fetch("/api/status/notices?days=7", { cache: "no-store" }),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory90d(histData);
      }
      if (notRes.ok) {
        const notData = await notRes.json();
        setNotices(notData.notices || []);
      }
    } catch (err) {
      console.error("Failed to load status data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setSubscribeStatus({ state: "error", message: "Please enter a valid email address." });
      return;
    }
    setSubscribeStatus({ state: "loading", message: "" });
    try {
      const res = await fetch("/api/status/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribeStatus({ state: "success", message: data.message || "Subscribed successfully!" });
        setEmail("");
      } else {
        setSubscribeStatus({ state: "error", message: data.detail || "Subscription failed." });
      }
    } catch (err) {
      setSubscribeStatus({ state: "error", message: "Network error. Please try again." });
    }
  };

  // Reorder services strictly according to specification
  const orderedServices = useMemo(() => {
    if (!summary || !summary.services) return [];
    const map = new Map(summary.services.map((s) => [s.key, s]));
    return SERVICE_ORDER.map((key) => map.get(key)).filter(Boolean);
  }, [summary]);

  const getStatusIcon = (status, size = "w-5 h-5") => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className={`${size} text-emerald-400`} />;
      case "degraded":
      case "degraded_performance":
        return <AlertTriangle className={`${size} text-amber-400`} />;
      case "partial_outage":
      case "outage":
      case "major_outage":
        return <XCircle className={`${size} text-rose-500`} />;
      case "maintenance":
        return <Wrench className={`${size} text-sky-400`} />;
      default:
        return <CheckCircle2 className={`${size} text-emerald-400`} />;
    }
  };

  const getOverallBannerStyle = (status) => {
    switch (status) {
      case "major_outage":
        return "bg-gradient-to-r from-rose-950/50 via-rose-900/30 to-black border-rose-500/30 text-rose-400";
      case "partial_outage":
      case "degraded_performance":
        return "bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-black border-amber-500/30 text-amber-400";
      case "maintenance":
        return "bg-gradient-to-r from-sky-950/50 via-sky-900/30 to-black border-sky-500/30 text-sky-400";
      case "operational":
      default:
        return "bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black border-emerald-500/30 text-emerald-400";
    }
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-zinc-100 ${jakarta.className} antialiased selection:bg-emerald-500/30 selection:text-emerald-300 relative`}>
      {/* Background radial gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-emerald-500/[0.04] blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-white/[0.06] bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center p-0.5 shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-black stroke-[2.2]" />
            </div>
            <div className="flex items-center tracking-[0.12em] font-extrabold text-sm sm:text-base text-white">
              ORBION
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent ml-1.5 font-semibold tracking-[0.16em]">
                AGENTS
              </span>
            </div>
            <span className="text-zinc-600 font-light mx-1">/</span>
            <span className="text-xs uppercase tracking-widest text-emerald-400/90 font-medium">
              Status
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh status"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/status/history"
              className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-white/5 transition"
            >
              Notice History
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-10">
        {/* 1. Overall Status Banner */}
        <div
          className={`rounded-2xl p-6 sm:p-7 border transition-all duration-300 shadow-2xl ${getOverallBannerStyle(
            summary?.overall_status || "operational"
          )}`}
        >
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="p-3 sm:p-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 shrink-0">
              {getStatusIcon(summary?.overall_status || "operational", "w-7 h-7 sm:w-8 sm:h-8")}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {summary?.overall_title || "All systems operational"}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 font-normal">
                {summary?.overall_description || "All OrbionAgents services are running normally."}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Four Services Monitoring Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
              System Services (4 Monitored)
            </h2>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Automated Monitoring (1m checks)
            </span>
          </div>

          <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-5 sm:p-7 divide-y divide-white/[0.06] shadow-xl">
            {loading && !summary ? (
              <div className="py-16 text-center text-zinc-500 text-sm animate-pulse">
                Loading real-time service metrics...
              </div>
            ) : (
              orderedServices.map((service) => {
                const sKey = service.key;
                const histData = history90d?.services?.[sKey];
                const days = histData?.days || [];
                const uptime90d = histData?.uptime_percentage_90d || service.uptime_percentage;

                return (
                  <div key={sKey} className="py-6 first:pt-1 last:pb-1 space-y-3.5">
                    {/* Header Row: Icon, Service Name, Description, and Uptime % / Latency */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{getStatusIcon(service.status, "w-5 h-5")}</div>
                        <div>
                          <h3 className="text-base font-semibold text-white tracking-tight">
                            {service.name}
                          </h3>
                          <p className="text-xs text-zinc-400 font-normal">
                            {service.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Right metrics: Response time (ms) & 90-day Uptime % */}
                      <div className="flex items-center gap-3 sm:gap-4 text-sm font-semibold self-end sm:self-auto pl-8 sm:pl-0">
                        {/* Real Response Time (ms) */}
                        {service.response_time_ms && service.response_time_ms > 0 ? (
                          <div className="flex items-center gap-1.5 text-zinc-300 font-medium text-xs sm:text-sm bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/5">
                            <span>~{Math.round(service.response_time_ms)} ms</span>
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                          </div>
                        ) : null}

                        {/* Uptime % in emerald text */}
                        <span className="text-emerald-400 font-semibold tracking-tight text-xs sm:text-sm">
                          {uptime90d} uptime
                        </span>
                      </div>
                    </div>

                    {/* 90-Day Tick Bar Chart */}
                    <div className="relative pt-1">
                      <div className="flex items-center gap-[2px] sm:gap-[3px] w-full h-8 sm:h-9">
                        {days.map((day, idx) => {
                          const isOperational = day.status === "operational";
                          const isDegraded = day.status === "degraded";
                          const isOutage = day.status === "outage";

                          let barColor = "bg-emerald-400 hover:bg-emerald-300";
                          if (isDegraded) {
                            barColor = "bg-amber-400 hover:bg-amber-300";
                          } else if (isOutage || day.has_incident) {
                            barColor = "bg-rose-500 hover:bg-rose-400";
                          }

                          return (
                            <div
                              key={day.date || idx}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveTooltip({
                                  serviceKey: sKey,
                                  serviceName: service.name,
                                  dayData: day,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => setActiveTooltip(null)}
                              className={`flex-1 h-full rounded-[2px] transition-colors cursor-pointer ${barColor}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Bottom 90-day axis labels */}
            <div className="pt-4 flex items-center justify-between text-[11px] font-medium text-zinc-500 tracking-wider">
              <span>&lt; 90 DAYS AGO</span>
              <span>TODAY</span>
            </div>
          </div>
        </section>

        {/* Floating Tooltip for 90-Day Ticks */}
        {activeTooltip && (
          <div
            style={{
              position: "fixed",
              left: `${activeTooltip.x}px`,
              top: `${activeTooltip.y - 10}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="z-50 pointer-events-none bg-zinc-900 border border-white/15 text-white text-xs rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap space-y-0.5 backdrop-blur-md"
          >
            <div className="font-semibold text-zinc-200">
              {activeTooltip.dayData.display_date}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTooltip.dayData.status === "operational"
                    ? "bg-emerald-400"
                    : activeTooltip.dayData.status === "degraded"
                    ? "bg-amber-400"
                    : "bg-rose-500"
                }`}
              />
              <span>{activeTooltip.dayData.uptime_percentage}% Uptime</span>
              {activeTooltip.dayData.avg_response_time_ms > 0 && (
                <span>&bull; {Math.round(activeTooltip.dayData.avg_response_time_ms)} ms</span>
              )}
            </div>
            {activeTooltip.dayData.has_incident && (
              <div className="text-[10px] text-rose-300 font-medium pt-0.5">
                Service incident logged on this date
              </div>
            )}
          </div>
        )}

        {/* 3. Recent Notices Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
              Recent Notices
            </h2>
            <Link
              href="/status/history"
              className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1 transition"
            >
              SHOW HISTORY
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {notices.length === 0 ? (
            /* Reference Design Empty State: "No notices reported for the past 7 days" */
            <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex items-center gap-4 shadow-xl">
              <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base text-zinc-300 font-medium">
                No notices reported for the past 7 days
              </span>
            </div>
          ) : (
            /* Incident Notices Cards with Timeline Updates */
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${
                          notice.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : notice.status === "monitoring"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {notice.status}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {notice.service_name}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {notice.start_time
                          ? new Date(notice.start_time).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                      </span>
                      {notice.duration_minutes && (
                        <span>&bull; Resolved in {notice.duration_minutes} min</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {notice.title}
                    </h3>
                    <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed font-normal whitespace-pre-line">
                      {notice.description}
                    </p>
                  </div>

                  {/* Incident Timeline */}
                  {notice.updates && notice.updates.length > 0 && (
                    <div className="pt-3 space-y-3">
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                        Updates Timeline
                      </h4>
                      <div className="relative pl-4 space-y-4 border-l border-white/10 ml-2">
                        {notice.updates.map((up) => (
                          <div key={up.id} className="relative group">
                            {/* Dot on line */}
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
        </section>

        {/* 4. Get Status Updates (Subscribe Box) */}
        <section className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300 shadow-inner">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Get status updates
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Subscribe to receive notifications about OrbionAgents service incidents.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full sm:w-72 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/80 transition"
              />
              <button
                type="submit"
                disabled={subscribeStatus.state === "loading"}
                className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 shrink-0 disabled:opacity-50"
              >
                {subscribeStatus.state === "loading" ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
          </div>

          {subscribeStatus.message && (
            <div
              className={`mt-4 text-xs font-medium px-3 py-2 rounded-lg ${
                subscribeStatus.state === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {subscribeStatus.message}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} OrbionAgents. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300 transition">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-zinc-300 transition">
              OrbionAgents Home
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
