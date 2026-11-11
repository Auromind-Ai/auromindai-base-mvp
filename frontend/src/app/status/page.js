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
  ExternalLink,
  Wrench,
  Check,
  Calendar,
} from "lucide-react";
import { jakarta } from "@/lib/fonts";

const SERVICE_ORDER = ["dashboard", "meta_api", "backend", "ai_services"];

export default function PublicStatusPage() {
  const [summary, setSummary] = useState(null);
  const [history90d, setHistory90d] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null); // { serviceKey, serviceName, dayData, x, y }
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
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Dismiss tooltip when clicking or tapping outside on mobile/desktop
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest?.(".status-tick-bar")) {
        setActiveTooltip(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("touchstart", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

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
        setSubscribeStatus({ state: "error", message: data.detail || data.message || "Subscription failed." });
      }
    } catch (err) {
      setSubscribeStatus({ state: "error", message: "Network error. Please try again." });
    }
  };

  // Reorder services strictly according to specification (exactly 4 services)
  const orderedServices = useMemo(() => {
    if (!summary || !summary.services) return [];
    const map = new Map(summary.services.map((s) => [s.key, s]));
    return SERVICE_ORDER.map((key) => map.get(key)).filter(Boolean);
  }, [summary]);

  // Extract any scheduled maintenance notices (only future or actively running, never expired)
  const upcomingMaintenance = useMemo(() => {
    const now = new Date();
    return notices.filter((n) => {
      const isMaint = n.is_maintenance || n.severity === "maintenance";
      if (!isMaint || n.status === "resolved") return false;
      if (n.scheduled_end && new Date(n.scheduled_end) <= now) return false;
      return true;
    });
  }, [notices]);

  // Extract only active / ongoing notices (resolved ones are archived to history)
  const activeNotices = useMemo(() => {
    const now = new Date();
    return notices.filter((n) => {
      if (n.status === "resolved") return false;
      if (
        (n.is_maintenance || n.severity === "maintenance") &&
        n.scheduled_end &&
        new Date(n.scheduled_end) <= now
      ) {
        return false;
      }
      return true;
    });
  }, [notices]);

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
    <div className={`min-h-screen bg-[#000000] text-zinc-100 ${jakarta.className} antialiased selection:bg-emerald-500/30 selection:text-emerald-300 relative`}>
      {/* Background radial gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-emerald-500/[0.04] blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-20 space-y-10">
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

        {/* 1.1 Upcoming Scheduled Maintenance Banner (if active) */}
        {upcomingMaintenance.length > 0 && (
          <div className="rounded-2xl p-6 sm:p-7 border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-sky-900/20 to-black space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <Wrench className="w-4 h-4" />
              <span>Upcoming Scheduled Maintenance</span>
            </div>
            {upcomingMaintenance.map((maint) => (
              <div key={maint.id} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {maint.title}
                  </h3>
                  <div className="text-xs text-sky-300/90 flex items-center gap-1.5 font-medium bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {maint.scheduled_start
                        ? `Window: ${new Date(maint.scheduled_start).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })} ${
                            maint.scheduled_end
                              ? `- ${new Date(maint.scheduled_end).toLocaleString(undefined, {
                                  timeStyle: "short",
                                })}`
                              : ""
                          }`
                        : `Started: ${new Date(maint.start_time).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}`}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                  {maint.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 2. Four Services Monitoring Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
              System Services (4 Monitored)
            </h2>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Automated Monitoring
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

                          const getTooltipData = (targetEl) => {
                            if (!targetEl || typeof targetEl.getBoundingClientRect !== "function") return null;
                            const rect = targetEl.getBoundingClientRect();
                            const x = rect.left + rect.width / 2;
                            const clampedX = typeof window !== "undefined"
                              ? Math.max(140, Math.min(window.innerWidth - 140, x))
                              : x;
                            return {
                              serviceKey: sKey,
                              serviceName: service.name,
                              dayData: day,
                              x: clampedX,
                              y: rect.top,
                            };
                          };

                          return (
                            <div
                              key={day.date || idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const tooltipData = getTooltipData(e.currentTarget);
                                setActiveTooltip((prev) =>
                                  prev && prev.serviceKey === sKey && prev.dayData?.date === day.date
                                    ? null
                                    : tooltipData
                                );
                              }}
                              onMouseEnter={(e) => {
                                const tooltipData = getTooltipData(e.currentTarget);
                                if (tooltipData) setActiveTooltip(tooltipData);
                              }}
                              onMouseLeave={() => {
                                if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
                                  setActiveTooltip(null);
                                }
                              }}
                              className={`status-tick-bar flex-1 h-full rounded-[2px] transition-colors cursor-pointer ${barColor}`}
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
        {activeTooltip && activeTooltip.dayData && (
          <div
            style={{
              position: "fixed",
              left: `${activeTooltip.x}px`,
              top: `${activeTooltip.y - 10}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="z-50 pointer-events-none bg-zinc-900 border border-white/15 text-white text-xs rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap space-y-0.5 backdrop-blur-md max-w-[90vw]"
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

        {/* 3. Active Notices & Ongoing Disruptions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
                Active Notices
              </h2>
              {activeNotices.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeNotices.length} Active
                </span>
              )}
            </div>
            <Link
              href="/status/history"
              className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1 transition"
            >
              <span>NOTICE HISTORY</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeNotices.length === 0 ? (
            /* Reference Design Empty State: No active disruptions or ongoing notices */
            <div className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm sm:text-base text-white font-semibold">
                    No active notices or disruptions
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    All OrbionAgents services are running normally. Resolved incidents and past notices are archived in Notice History.
                  </div>
                </div>
              </div>
              <Link
                href="/status/history"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>View Notice History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            /* Active Incident Notices Cards with Timeline Updates, Severity, and Timestamps */
            <div className="space-y-4">
              {activeNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-[#050505] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                          notice.status
                        )}`}
                      >
                        {notice.status}
                      </span>

                      {/* Severity Badge (Requirement 4) */}
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${getSeverityBadgeStyle(
                          notice.severity
                        )}`}
                      >
                        {notice.severity || "Minor"}
                      </span>

                      {/* Service Name */}
                      <span className="text-xs text-zinc-300 font-medium">
                        {notice.service_name}
                      </span>
                    </div>

                    {/* Timestamp, Resolution Time, and Duration (Requirement 4) */}
                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {notice.start_time
                            ? new Date(notice.start_time).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : ""}
                        </span>
                      </div>

                      {notice.status === "resolved" || notice.resolved_time || ((notice.is_maintenance || notice.severity === "maintenance") && notice.scheduled_end && new Date(notice.scheduled_end) <= new Date()) ? (
                        <>
                          <span className="text-zinc-600">&bull;</span>
                          <span className="text-emerald-400 font-medium">
                            Resolved:{" "}
                            {new Date(
                              notice.resolved_time ||
                              notice.scheduled_end ||
                              notice.updates?.[0]?.created_at ||
                              notice.start_time
                            ).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </>
                      ) : (notice.is_maintenance || notice.severity === "maintenance") && notice.scheduled_start && new Date(notice.scheduled_start) > new Date() ? (
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

                      {(notice.duration_minutes || (notice.start_time && (notice.resolved_time || notice.scheduled_end || notice.status === "resolved"))) && (
                        <>
                          <span className="text-zinc-600">&bull;</span>
                          <span className="text-zinc-300">
                            Duration: {notice.duration_minutes || Math.max(1, Math.round((new Date(notice.resolved_time || notice.scheduled_end || Date.now()) - new Date(notice.scheduled_start || notice.start_time)) / 60000))} min
                          </span>
                        </>
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
