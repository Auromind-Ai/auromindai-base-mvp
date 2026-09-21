"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  Target,
  Mail,
  History,
  Clock,
  Check,
  X,
  Send,
  FileSpreadsheet,
  Eye,
  Loader2,
  Sparkles,
  Plus,
  AlertCircle,
  Pencil,
  RotateCcw,
  Flame,
  Zap,
  Droplets,
  Sliders,
  MoreVertical,
  Trash2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Phone,
  Frown,
  Brain,
} from "lucide-react";
import api from "@/lib/api";
import { getWorkspaceIdFromToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { crmControl, dateRange, intentLabel } from "./CrmControls";
import ScoreBreakdown from "./ScoreBreakdown";

const sections = [
  ["overview", "Overview", LayoutDashboard],
  ["leads", "Leads", Users],
  ["analytics", "Analytics", ChartNoAxesCombined],
  ["scoring", "Scoring", Target],
  ["reports", "Email Reports", Mail],
  ["history", "History", History],
];
export function CrmNavigation({ section, onChange }) {
  return (
    <nav
      aria-label="CRM sections"
      className="shrink-0 bg-[#100b1a] border-b lg:border-b-0 lg:border-r border-white/10 lg:w-44 p-2 lg:p-3 flex lg:flex-col gap-1 overflow-x-auto"
    >
      <p className="hidden lg:block uppercase text-xs tracking-widest text-zinc-500 px-3 pt-4 pb-5">
        CRM
      </p>
      {sections.map(([id, name, Icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-current={section === id ? "page" : undefined}
          className={`flex items-center gap-2 text-xs whitespace-nowrap px-3 py-3 rounded-xl transition-colors ${section === id ? "bg-violet-500/20 text-violet-200" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
        >
          <Icon size={16} />
          {name}
        </button>
      ))}
    </nav>
  );
}

function Bars({ items, label }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label || item.key}>
          <div className="flex justify-between text-sm mb-1">
            <span>{label ? label(item.key) : item.label}</span>
            <span className="text-zinc-400">{item.count.toLocaleString()}</span>
          </div>
          <div className="bg-white/5 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-violet-500"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CrmAnalytics({ overview = false, onBrowse }) {
  const [period, setPeriod] = useState("30");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (
      period === "custom" &&
      (!custom.start || !custom.end || custom.start > custom.end)
    )
      return;
    let active = true;
    let [from, to] = dateRange(Number(period) || 30);
    if (period === "custom") {
      from = new Date(`${custom.start}T00:00:00`).toISOString();
      const end = new Date(`${custom.end}T00:00:00`);
      end.setDate(end.getDate() + 1);
      to = end.toISOString();
    }
    // Loading and stale-data reset track the external analytics request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setData(null);
    api
      .get(
        `/lead-scoring/analytics?workspace_id=${getWorkspaceIdFromToken()}&filters=${encodeURIComponent(JSON.stringify({ created_from: from, created_to: to }))}`,
      )
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, custom.start, custom.end, reload]);
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-7 space-y-6">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">
            {overview ? "CRM Overview" : "Lead Analytics"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Current results for leads created in the selected period.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            aria-label="Analytics date range"
            className={crmControl}
            value={period}
            onChange={(e) => {
              setData(null);
              setPeriod(e.target.value);
            }}
          >
            <option value="1">Today</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="custom">Custom</option>
          </select>
          {period === "custom" && (
            <>
              <input
                aria-label="Analytics start date"
                type="date"
                className={crmControl}
                value={custom.start}
                onChange={(e) =>
                  setCustom((v) => ({ ...v, start: e.target.value }))
                }
              />
              <input
                aria-label="Analytics end date"
                type="date"
                className={crmControl}
                value={custom.end}
                min={custom.start}
                onChange={(e) =>
                  setCustom((v) => ({ ...v, end: e.target.value }))
                }
              />
            </>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-rose-300">
          {error} <button onClick={() => setReload((v) => v + 1)}>Retry</button>
        </p>
      )}
      {loading && (
        <p role="status" className="text-zinc-400">
          Loading analytics…
        </p>
      )}
      {period === "custom" &&
        (!custom.start || !custom.end || custom.start > custom.end) && (
          <p className="text-zinc-400">Choose a valid start and end date.</p>
        )}
      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
            {[
              ["Total Leads", data.total],
              ["Qualified Leads", data.qualified],
              ["Hot Leads", data.hot],
              ["Converted Leads", data.converted],
              ["Conversion Rate", `${data.conversion_rate}%`],
              [
                "Total Revenue",
                data.revenue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl bg-[#151020] border border-white/10 p-5"
              >
                <p className="text-xs text-zinc-400">{label}</p>
                <p className="text-2xl font-semibold mt-3">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {data.qualified_definition} Revenue uses the values recorded on
            converted leads.
          </p>
          {overview ? (
            <button
              className={`${crmControl} bg-violet-600`}
              onClick={onBrowse}
            >
              Find and follow up with leads
            </button>
          ) : (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#151020] p-5 overflow-x-auto">
                <h2 className="font-semibold mb-4">Lead Source Analysis</h2>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-zinc-400">
                      {[
                        "Source",
                        "Total Leads",
                        "Qualified",
                        "Converted",
                        "Revenue",
                      ].map((t) => (
                        <th className="pb-3 pr-4 font-medium" key={t}>
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((row) => (
                      <tr key={row.source} className="border-t border-white/5">
                        <td className="py-3 capitalize">{row.source}</td>
                        {["total", "qualified", "converted", "revenue"].map(
                          (key) => (
                            <td key={key}>{row[key].toLocaleString()}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.total && (
                  <p className="text-zinc-500 py-5">
                    No leads were created in this period.
                  </p>
                )}
              </section>
              <div className="grid xl:grid-cols-2 gap-5">
                <section className="rounded-2xl border border-white/10 bg-[#151020] p-5">
                  <h2 className="font-semibold mb-5">Score Distribution</h2>
                  <Bars items={data.distribution} />
                </section>
                <section className="rounded-2xl border border-white/10 bg-[#151020] p-5">
                  <h2 className="font-semibold mb-5">Conversion Overview</h2>
                  <Bars
                    items={[
                      { label: "Total leads", count: data.total },
                      { label: "Qualified", count: data.qualified },
                      { label: "Hot", count: data.hot },
                      { label: "Converted", count: data.converted },
                    ]}
                  />
                  <p className="text-xs text-zinc-500 mt-4">
                    Current groups can overlap; conversion does not require a
                    Hot tier.
                  </p>
                </section>
              </div>
              <section className="rounded-2xl border border-white/10 bg-[#151020] p-5">
                <h2 className="font-semibold mb-5">Buying Intent Analysis</h2>
                <Bars
                  items={[...data.intents].sort((a, b) => b.count - a.count)}
                  label={intentLabel}
                />
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

export function CrmHistory({ onSelect }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  // Reset the previous page while the next server page is loading.
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError("");
    api
      .get(
        `/lead-scoring/history?workspace_id=${getWorkspaceIdFromToken()}&limit=50&offset=${page * 50}`,
      )
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page, retry]);
  return (
    <main className="flex-1 overflow-y-auto p-5 space-y-4">
      <h1 className="text-xl font-semibold">Lead History</h1>
      <p className="text-sm text-zinc-400">
        Events recorded by the existing lead scoring and audit system.
      </p>
      {error && (
        <p role="alert">
          {error} <button onClick={() => setRetry((v) => v + 1)}>Retry</button>
        </p>
      )}
      {!data && !error && <p role="status">Loading history…</p>}
      {data && (
        <>
          <p className="text-xs text-zinc-500">
            {data.total.toLocaleString()} events
          </p>
          {data.items.map((event) => (
            <button
              key={event.id}
              className="block w-full text-left rounded-xl border border-white/10 bg-[#151020] p-4"
              onClick={() => onSelect(event.lead_id)}
            >
              <span className="font-medium">{event.name || "Lead"}</span>
              <span className="text-violet-300 text-sm ml-3">
                {event.score_before} → {event.score_after}
              </span>
              <p className="text-sm text-zinc-400 mt-1">
                {event.reason.replaceAll("_", " ").replaceAll(":", ": ")}
              </p>
              <time className="text-xs text-zinc-500">
                {new Date(event.created_at).toLocaleString()}
              </time>
            </button>
          ))}
          {!data.items.length && (
            <p className="text-zinc-400">No recorded lead events.</p>
          )}
          <div className="flex justify-between">
            <button
              className={crmControl}
              disabled={!page}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>
            <button
              className={crmControl}
              disabled={(page + 1) * 50 >= data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export function CrmScoring({ options, lead, onRecalculate }) {
  const { showToast } = useToast?.() || { showToast: () => {} };
  const [activeSubtab, setActiveSubtab] = useState("rules"); // "rules" | "preview"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Scoring rules state
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [thresholds, setThresholds] = useState({ hot: 50, warm: 30, cold: 0 });
  const [signals, setSignals] = useState([]);

  // Modals & UI controls
  const [showResetModal, setShowResetModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [tempThresholds, setTempThresholds] = useState({ hot: 50, warm: 30 });
  const [showAddSignalModal, setShowAddSignalModal] = useState(false);
  const [newSignal, setNewSignal] = useState({ name: "", example_message: "", points: 15 });
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const data = await api.get(`/lead-scoring/rules?workspace_id=${getWorkspaceIdFromToken()}`);
      if (data) {
        setAiEnabled(data.ai_qualification_enabled ?? true);
        if (data.thresholds) setThresholds(data.thresholds);
        if (data.signals) setSignals(data.signals);
      }
    } catch (e) {
      console.error("Failed to fetch scoring rules:", e);
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSaveRules = async (customSignals = signals, customThresholds = thresholds, customAi = aiEnabled) => {
    setRulesSaving(true);
    try {
      const payload = {
        ai_qualification_enabled: customAi,
        thresholds: customThresholds,
        signals: customSignals,
      };
      await api.post(`/lead-scoring/rules?workspace_id=${getWorkspaceIdFromToken()}`, payload);
      showToast("Scoring rules saved successfully!", "success");
    } catch (e) {
      showToast(e.message || "Failed to save scoring rules", "error");
    } finally {
      setRulesSaving(false);
    }
  };

  const handleResetRules = async () => {
    setShowResetModal(false);
    setRulesSaving(true);
    try {
      const data = await api.post(`/lead-scoring/rules/reset?workspace_id=${getWorkspaceIdFromToken()}`);
      if (data) {
        setAiEnabled(data.ai_qualification_enabled ?? true);
        setThresholds(data.thresholds || { hot: 50, warm: 30, cold: 0 });
        setSignals(data.signals || []);
      }
      showToast("Scoring rules reset to defaults", "success");
    } catch (e) {
      showToast(e.message || "Failed to reset rules", "error");
    } finally {
      setRulesSaving(false);
    }
  };

  const handleToggleSignal = (id) => {
    const updated = signals.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSignals(updated);
  };

  const handlePointsChange = (id, delta) => {
    const updated = signals.map((s) => (s.id === id ? { ...s, points: (s.points || 0) + delta } : s));
    setSignals(updated);
  };

  const handleDeleteSignal = (id) => {
    const updated = signals.filter((s) => s.id !== id);
    setSignals(updated);
    setActiveMenuId(null);
  };

  const handleAddCustomSignal = () => {
    if (!newSignal.name.trim()) {
      showToast("Signal name is required", "error");
      return;
    }
    const id = "custom_" + Date.now();
    const created = {
      id,
      name: newSignal.name.trim(),
      example_message: newSignal.example_message.trim(),
      examples: newSignal.example_message
        .split(/[,"]/)
        .map((x) => x.trim())
        .filter(Boolean),
      points: Number(newSignal.points) || 10,
      enabled: true,
      icon: "zap",
      is_custom: true,
    };
    const updated = [...signals, created];
    setSignals(updated);
    setNewSignal({ name: "", example_message: "", points: 15 });
    setShowAddSignalModal(false);
    showToast("Custom signal added. Click 'Save Changes' to persist.", "info");
  };

  const renderSignalIcon = (icon, id) => {
    switch (icon || id) {
      case "pricing":
      case "currency":
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
            ₹
          </div>
        );
      case "quotation":
      case "file":
        return (
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <FileText size={16} />
          </div>
        );
      case "demo":
      case "calendar":
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Calendar size={16} />
          </div>
        );
      case "implementation":
      case "clock":
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Clock size={16} />
          </div>
        );
      case "contact_details":
      case "phone":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Phone size={16} />
          </div>
        );
      case "strong_intent":
      case "check":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        );
      case "not_interested":
      case "x":
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <XCircle size={16} />
          </div>
        );
      case "too_expensive":
      case "frown":
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Frown size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
        );
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Top Header & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
          <span>CRM</span>
          <span>&gt;</span>
          <span className="text-zinc-300">Lead Scoring</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Lead Scoring
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Set scoring rules and qualify leads using AI.
        </p>
      </div>

      {/* Subtabs Navigation */}
      <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-[#13101E] border border-white/[0.08]">
        {[
          ["rules", "Scoring Rules", Sliders],
          ["preview", "Preview", Sparkles],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveSubtab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubtab === id
                ? "bg-[#7C4DFF] text-white shadow-lg shadow-[#7C4DFF]/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: SCORING RULES (Image 2) */}
      {activeSubtab === "rules" && (
        <div className="space-y-6">
          {rulesLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading scoring rules...
            </div>
          ) : (
            <>
              {/* Card 1: AI Lead Qualification & Thresholds */}
              <div className="rounded-2xl bg-[#121218] border border-white/5 p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">
                        AI Lead Qualification
                      </h3>
                      <p className="text-xs text-zinc-400">
                        AI will analyze conversations and detect buying signals automatically.
                      </p>
                    </div>
                  </div>
                  {/* ON/OFF Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {aiEnabled ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiEnabled(!aiEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        aiEnabled ? "bg-[#7C4DFF]" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          aiEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Threshold Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Hot Lead */}
                  <div className="rounded-xl bg-rose-950/20 border border-rose-500/20 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <Flame size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                        Hot Lead
                      </div>
                      <div className="text-lg font-bold text-white">
                        &ge; {thresholds.hot}%
                      </div>
                      <div className="text-[11px] text-zinc-400">High buying intent</div>
                    </div>
                  </div>

                  {/* Warm Lead */}
                  <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Warm Lead
                      </div>
                      <div className="text-lg font-bold text-white">
                        {thresholds.warm}% – {Math.max(thresholds.warm, thresholds.hot - 1)}%
                      </div>
                      <div className="text-[11px] text-zinc-400">Some interest</div>
                    </div>
                  </div>

                  {/* Cold Lead */}
                  <div className="rounded-xl bg-sky-950/20 border border-sky-500/20 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <Droplets size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                        Cold Lead
                      </div>
                      <div className="text-lg font-bold text-white">
                        0% – {Math.max(0, thresholds.warm - 1)}%
                      </div>
                      <div className="text-[11px] text-zinc-400">Low intent</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setTempThresholds({ hot: thresholds.hot, warm: thresholds.warm });
                      setShowThresholdModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors"
                  >
                    Configure Thresholds
                  </button>
                </div>
              </div>

              {/* Card 2: Conversation Signals Table */}
              <div className="rounded-2xl bg-[#121218] border border-white/5 p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">
                        Custom Conversation Signals
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Default scoring rules from system config are active. Define custom rules here to detect specific keywords or intents.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddSignalModal(true)}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-colors"
                  >
                    <Plus size={14} /> Add Custom Signal
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300 border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="py-3 px-3">Signal</th>
                        <th className="py-3 px-3">Example Customer Message</th>
                        <th className="py-3 px-3 text-center">Points</th>
                        <th className="py-3 px-3 text-right">Status</th>
                        <th className="py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {signals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Sparkles size={24} className="text-zinc-600" />
                              <p className="text-sm font-medium text-zinc-300">No custom rules</p>
                              <p className="text-xs text-zinc-500 max-w-sm">
                                Default signals from system scoring config are active. Click &quot;+ Add Custom Signal&quot; to define custom scoring rules.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        signals.map((sig) => (
                          <tr key={sig.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Signal Icon & Name */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {renderSignalIcon(sig.icon, sig.id)}
                                <div>
                                  <div className="font-medium text-white text-xs sm:text-sm">
                                    {sig.name}
                                  </div>
                                  <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">
                                    Custom
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Example Customer Message */}
                            <td className="py-3 px-3 text-zinc-400 text-xs max-w-xs font-mono">
                              {sig.example_message || (sig.examples && sig.examples.join(", ")) || "—"}
                            </td>

                            {/* Points Controls */}
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handlePointsChange(sig.id, -5)}
                                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 transition-colors"
                                  title="Decrease 5 points"
                                >
                                  -
                                </button>
                                <span
                                  className={`w-10 text-center font-bold text-xs sm:text-sm ${
                                    sig.points > 0 ? "text-emerald-400" : sig.points < 0 ? "text-rose-400" : "text-zinc-400"
                                  }`}
                                >
                                  {sig.points > 0 ? `+${sig.points}` : sig.points}
                                </span>
                                <button
                                  onClick={() => handlePointsChange(sig.id, 5)}
                                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 transition-colors"
                                  title="Increase 5 points"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Status Toggle */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleSignal(sig.id)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  sig.enabled ? "bg-[#7C4DFF]" : "bg-zinc-700"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    sig.enabled ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </td>

                            {/* Action Menu (for custom signals) */}
                            <td className="py-3 px-2 text-right relative">
                              <button
                                onClick={() => handleDeleteSignal(sig.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                                title="Delete signal"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: AI Scoring Tips */}
              <div className="rounded-2xl bg-[#121218] border border-white/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                    <Lightbulb size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-xs sm:text-sm">
                      AI Scoring Tips
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      The AI understands context, not just keywords. It looks at the full conversation to detect intent, budget, timeline and decision maker signals.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTipsModal(true)}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors whitespace-nowrap"
                >
                  Learn More
                </button>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setShowResetModal(true)}
                  disabled={rulesSaving}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RotateCcw size={13} /> Reset to Defaults
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveRules()}
                    disabled={rulesSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C4DFF] hover:bg-[#6C3AE8] text-white font-medium text-xs sm:text-sm transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {rulesSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Saving…
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: PREVIEW */}
      {activeSubtab === "preview" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C4DFF]/20 to-[#6A3DE8]/30 border border-[#7C4DFF]/30 text-[#9E7BFF] flex items-center justify-center shrink-0 shadow-lg shadow-[#7C4DFF]/10">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Lead Score Preview</h2>
                <p className="text-xs text-zinc-400">
                  Realtime qualification combining buying intent, activity, engagement, and custom signals.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                <span>Hot: &ge; {thresholds.hot}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <span>Warm: {thresholds.warm}–{thresholds.hot - 1}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/25 px-3 py-1.5 text-xs font-semibold text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                <span>Cold: 0–{thresholds.warm - 1}</span>
              </div>
            </div>
          </div>

          {lead ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-[#161226] to-[#100D1D] border border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#6A3DE8] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-[#7C4DFF]/25 shrink-0">
                    {lead.name && lead.name.trim() !== "."
                      ? lead.name.slice(0, 2).toUpperCase()
                      : <Users size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base">
                        {lead.name && lead.name.trim() !== "."
                          ? lead.name
                          : lead.phone || lead.email || `Lead #${lead.id?.slice(0, 8) || ""}`}
                      </h3>
                      {lead.source && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#9E7BFF]">
                          {lead.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lead.phone || lead.email || "No contact info available"}
                    </p>
                  </div>
                </div>
                <button
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B162C] hover:bg-[#251E3D] border border-[#7C4DFF]/30 hover:border-[#7C4DFF]/60 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#7C4DFF]/10 transition-all disabled:opacity-50"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api.post(
                        `/lead-scoring/leads/${lead.id}/recalculate?workspace_id=${getWorkspaceIdFromToken()}`,
                      );
                      if (onRecalculate) await onRecalculate(lead.id);
                      showToast("Lead score recalculated with current rules", "success");
                    } catch (e) {
                      setError(e.message);
                      showToast(e.message, "error");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RotateCcw size={14} className={busy ? "animate-spin text-[#9E7BFF]" : "text-[#9E7BFF]"} />
                  <span>{busy ? "Recalculating…" : "Recalculate lead score"}</span>
                </button>
              </div>
              {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
              <ScoreBreakdown breakdown={lead.breakdown} score={lead.score} thresholds={thresholds} />
            </div>
          ) : (
            <div className="rounded-3xl bg-gradient-to-b from-[#151124] to-[#0E0B18] border border-white/[0.08] p-10 text-center text-zinc-400 space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#9E7BFF] flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>
              <p className="text-sm font-semibold text-white">Select a lead in the Leads section to inspect its score.</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Or configure rules in the Scoring Rules tab to automatically qualify incoming chats.
              </p>
            </div>
          )}
        </div>
      )}


      {/* MODAL: RESET CONFIRMATION */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Scoring Rules?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Are you sure you want to reset scoring rules to defaults?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs text-zinc-400 space-y-1.5">
              <p>• Custom conversation signals will be removed.</p>
              <p>• Default signals and points will be restored.</p>
              <p>• Hot/Warm/Cold thresholds will be reset to 50% / 30% / 0%.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={rulesSaving}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetRules}
                disabled={rulesSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {rulesSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Resetting…
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} /> Reset to Defaults
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE THRESHOLDS */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Configure Lead Thresholds</h3>
            <p className="text-xs text-zinc-400">
              Customize score thresholds to automatically categorize leads into Hot, Warm, and Cold tiers.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Hot Lead Threshold (&ge; %)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempThresholds.hot}
                  onChange={(e) =>
                    setTempThresholds({ ...tempThresholds, hot: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Warm Lead Minimum Threshold (&ge; %)
                </label>
                <input
                  type="number"
                  min="0"
                  max={tempThresholds.hot - 1}
                  value={tempThresholds.warm}
                  onChange={(e) =>
                    setTempThresholds({ ...tempThresholds, warm: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C4DFF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowThresholdModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (tempThresholds.warm >= tempThresholds.hot) {
                    showToast("Warm threshold must be less than Hot threshold", "error");
                    return;
                  }
                  const updated = { ...thresholds, hot: tempThresholds.hot, warm: tempThresholds.warm };
                  setThresholds(updated);
                  setShowThresholdModal(false);
                  handleSaveRules(signals, updated, aiEnabled);
                }}
                className="px-4 py-2 rounded-xl bg-[#7C4DFF] hover:bg-[#6C3AE8] text-white text-xs font-medium"
              >
                Apply &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM SIGNAL */}
      {showAddSignalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add Custom Conversation Signal</h3>
            <p className="text-xs text-zinc-400">
              Define a keyword or intent signal. When detected in customer chats, the AI will award or deduct points.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Signal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asks about Enterprise Plan"
                  value={newSignal.name}
                  onChange={(e) => setNewSignal({ ...newSignal, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Example Messages / Keywords
                </label>
                <input
                  type="text"
                  placeholder='e.g. "enterprise license", "bulk discount", "custom contract"'
                  value={newSignal.example_message}
                  onChange={(e) => setNewSignal({ ...newSignal, example_message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C4DFF]"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Separate multiple phrases with commas or quotes. The AI matches exact keywords and semantic similarity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Points (+ or -)
                </label>
                <input
                  type="number"
                  placeholder="15"
                  value={newSignal.points}
                  onChange={(e) => setNewSignal({ ...newSignal, points: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C4DFF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddSignalModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomSignal}
                className="px-4 py-2 rounded-xl bg-[#7C4DFF] hover:bg-[#6C3AE8] text-white text-xs font-medium"
              >
                Add Signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI TIPS LEARN MORE */}
      {showTipsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb size={18} className="text-violet-400" /> AI Scoring Intelligence
            </h3>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Our lead scoring engine combines two complementary layers:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                <li>
                  <strong className="text-white">Deterministic &amp; Keyword Matching:</strong> High-precision regex checks for phone numbers, pricing questions, emails, and custom phrases.
                </li>
                <li>
                  <strong className="text-white">Semantic AI Embeddings:</strong> Cosine similarity against prototype vectors, detecting intent even if customers use slang, different languages (Tanglish, Hinglish), or indirect phrasing.
                </li>
                <li>
                  <strong className="text-white">Behavioral Scoring:</strong> Tracks response recency, inactivity decay, and flow progression.
                </li>
              </ul>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTipsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#7C4DFF] hover:bg-[#6C3AE8] text-white text-xs font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const DEFAULT_SUBJ = "{frequency} Qualified Leads Report ({date})";
const DEFAULT_BODY = `Hi Team,

Please find attached the {frequency_lower} qualified leads report.

• Total Qualified Leads: {total_leads}
• Date: {date}
• File: {filename}

The leads in this report have a lead score of {min_score} or higher.

Regards,
{workspace_name}`;

const TEMPLATE_VARS = [
  { key: "total_leads", label: "{total_leads}", desc: "Count of qualified leads" },
  { key: "date", label: "{date}", desc: "Current date (e.g. Sep 19, 2026)" },
  { key: "filename", label: "{filename}", desc: "CSV file name" },
  { key: "min_score", label: "{min_score}", desc: "Score threshold" },
  { key: "frequency", label: "{frequency}", desc: "Daily / Weekly / Monthly" },
  { key: "workspace_name", label: "{workspace_name}", desc: "Workspace name" },
];

export function CrmReports({ workspaceId: propWorkspaceId }) {
  const { workspaceId: authWsId } = useAuth?.() || {};
  const effectiveWorkspaceId = propWorkspaceId || authWsId || getWorkspaceIdFromToken();

  const { showToast } = useToast?.() || { showToast: () => {} };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [minScore, setMinScore] = useState(() => {
    if (typeof window !== "undefined") {
      const wsId = propWorkspaceId || getWorkspaceIdFromToken();
      const saved = localStorage.getItem(`crm_email_report_${wsId || "default"}_min_score`);
      if (saved !== null && !isNaN(Number(saved))) {
        return Number(saved);
      }
    }
    return 50;
  });
  const [frequency, setFrequency] = useState(() => {
    if (typeof window !== "undefined") {
      const wsId = propWorkspaceId || getWorkspaceIdFromToken();
      const saved = localStorage.getItem(`crm_email_report_${wsId || "default"}_frequency`);
      if (saved) return saved;
    }
    return "daily";
  });
  const [sendTime, setSendTime] = useState("09:00 AM");
  const [recipientEmails, setRecipientEmails] = useState(["sales@orbionagents.com"]);
  const [emailInput, setEmailInput] = useState("");
  const [attachCsv, setAttachCsv] = useState(true);
  const [qualifyingCount, setQualifyingCount] = useState(0);

  // Template editing states
  const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_SUBJ);
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY);
  const [defaultSubject, setDefaultSubject] = useState(DEFAULT_SUBJ);
  const [defaultBody, setDefaultBody] = useState(DEFAULT_BODY);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  // Sample modal
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleLeads, setSampleLeads] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Load existing settings
  useEffect(() => {
    if (!effectiveWorkspaceId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get(`/lead-scoring/email-report/settings?workspace_id=${effectiveWorkspaceId}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      .then((res) => {
        const data = res?.data || res;
        if (data?.settings) {
          const s = data.settings;
          setIsActive(s.is_active ?? true);
          if (s.min_score !== undefined && s.min_score !== null) {
            const scoreNum = Number(s.min_score);
            setMinScore(scoreNum);
            if (typeof window !== "undefined") {
              localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_min_score`, String(scoreNum));
            }
          }
          if (s.frequency) {
            setFrequency(s.frequency);
            if (typeof window !== "undefined") {
              localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_frequency`, s.frequency);
            }
          }
          if (s.send_time) {
            // Convert HH:MM to 12h format if needed
            const parts = s.send_time.split(":");
            if (parts.length === 2) {
              const h = parseInt(parts[0], 10);
              const m = parts[1];
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              setSendTime(`${String(h12).padStart(2, "0")}:${m} ${ampm}`);
            } else {
              setSendTime(s.send_time);
            }
          }
          if (Array.isArray(s.recipient_emails) && s.recipient_emails.length > 0) {
            setRecipientEmails(s.recipient_emails);
          }
          if (s.attach_csv !== undefined) {
            setAttachCsv(Boolean(s.attach_csv));
          }
          if (s.subject_template) {
            setSubjectTemplate(s.subject_template);
          }
          if (s.body_template) {
            setBodyTemplate(s.body_template);
          }
          if (s.default_subject) {
            setDefaultSubject(s.default_subject);
          }
          if (s.default_body) {
            setDefaultBody(s.default_body);
          }
        }
        if (data?.lead_count !== undefined) {
          setQualifyingCount(data.lead_count);
        }
      })
      .catch((err) => {
        console.error("Failed to load email report settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveWorkspaceId]);

  // Update qualifying count when minScore changes
  useEffect(() => {
    if (!effectiveWorkspaceId) return;

    api
      .get(`/lead-scoring/email-report/sample-preview?workspace_id=${effectiveWorkspaceId}&min_score=${minScore}&frequency=${frequency}`)
      .then((res) => {
        const data = res?.data || res;
        if (data?.total_count !== undefined) {
          setQualifyingCount(data.total_count);
        }
      })
      .catch(() => {});
  }, [effectiveWorkspaceId, minScore, frequency]);

  const addEmail = (raw) => {
    const clean = raw.trim().toLowerCase().replace(/[,;]/g, "");
    if (!clean) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setFeedback({ type: "error", message: `"${clean}" is not a valid email address.` });
      return;
    }
    if (!recipientEmails.includes(clean)) {
      setRecipientEmails((prev) => [...prev, clean]);
    }
    setEmailInput("");
    setFeedback(null);
  };

  const removeEmail = (emailToRemove) => {
    setRecipientEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleResetToDefault = () => {
    setSubjectTemplate(defaultSubject || DEFAULT_SUBJ);
    setBodyTemplate(defaultBody || DEFAULT_BODY);
    showToast("Reset to default message format", "info");
  };

  const handleSaveSettings = async () => {
    if (!effectiveWorkspaceId) return;

    if (recipientEmails.length === 0) {
      setFeedback({ type: "error", message: "Please add at least one recipient email address." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post(`/lead-scoring/email-report/settings?workspace_id=${effectiveWorkspaceId}`, {
        is_active: isActive,
        min_score: minScore,
        frequency,
        send_time: sendTime,
        recipient_emails: recipientEmails,
        attach_csv: attachCsv,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
      });

      const data = res?.data || res;
      if (data?.settings) {
        const s = data.settings;
        if (s.min_score !== undefined && s.min_score !== null) {
          const scoreNum = Number(s.min_score);
          setMinScore(scoreNum);
          if (typeof window !== "undefined") {
            localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_min_score`, String(scoreNum));
          }
        }
        if (s.frequency) {
          setFrequency(s.frequency);
          if (typeof window !== "undefined") {
            localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_frequency`, s.frequency);
          }
        }
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_min_score`, String(minScore));
          localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_frequency`, frequency);
        }
      }
      if (data?.lead_count !== undefined) {
        setQualifyingCount(data.lead_count);
      }
      setFeedback({ type: "success", message: "Email report settings and message format saved successfully!" });
      showToast("Email report settings and message format saved successfully!", "success");
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to save email report settings.";
      setFeedback({ type: "error", message: errMsg });
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!effectiveWorkspaceId) return;

    if (recipientEmails.length === 0) {
      setFeedback({ type: "error", message: "Please add at least one recipient email address before sending a test." });
      return;
    }

    setSendingTest(true);
    setFeedback(null);

    try {
      const res = await api.post(`/lead-scoring/email-report/send-test?workspace_id=${effectiveWorkspaceId}`, {
        recipient_emails: recipientEmails,
      });
      const data = res?.data || res;
      const isSim = data?.delivery_result?.simulated;
      const msg = isSim
        ? `Test report simulated! (${data.lead_count} lead(s) exported. Check backend logs for preview)`
        : `Test report email sent successfully to ${recipientEmails.join(", ")}!`;
      setFeedback({ type: "success", message: msg });
      showToast(msg, "success");
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to send test email.";
      setFeedback({ type: "error", message: errMsg });
      showToast(errMsg, "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleOpenSample = async () => {
    if (!effectiveWorkspaceId) return;
    setSampleModalOpen(true);
    setSampleLoading(true);
    try {
      const res = await api.get(`/lead-scoring/email-report/sample-preview?workspace_id=${effectiveWorkspaceId}&min_score=${minScore}&frequency=${frequency}`);
      const data = res?.data || res;
      setSampleLeads(data?.sample_leads || []);
    } catch (err) {
      console.error("Failed to load sample leads:", err);
    } finally {
      setSampleLoading(false);
    }
  };

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dateSlug = new Date().toISOString().slice(0, 10);
  const freqTitle = frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly";
  const filenameStr = `qualified_leads_${dateSlug}.csv`;

  // Render client template variables
  const renderClientTemplate = (templateStr) => {
    if (!templateStr) return "";
    const vars = {
      total_leads: qualifyingCount,
      date: currentDateStr,
      filename: filenameStr,
      min_score: `${minScore}%`,
      frequency: freqTitle,
      frequency_lower: frequency.toLowerCase(),
      workspace_name: "OrbionAgents",
    };
    let res = templateStr;
    for (const [k, v] of Object.entries(vars)) {
      res = res.replaceAll(`{${k}}`, v ?? "");
    }
    return res;
  };

  const renderedSubject = renderClientTemplate(subjectTemplate || defaultSubject || DEFAULT_SUBJ);
  const renderedBody = renderClientTemplate(bodyTemplate || defaultBody || DEFAULT_BODY);

  const isCustomized =
    subjectTemplate !== (defaultSubject || DEFAULT_SUBJ) ||
    bodyTemplate !== (defaultBody || DEFAULT_BODY);

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-4xl text-white">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Email Reports</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Automate scheduled exports of qualified CRM leads to your sales and executive team.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto text-zinc-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Card 1: Qualified Lead Email Report */}
      <div className="rounded-2xl bg-[#120c1f] border border-white/10 p-6 space-y-5 shadow-xl">
        {/* Card Header with Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Qualified Lead Email Report</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Only leads that meet your qualification criteria will be sent.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2.5 shrink-0 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-violet-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 w-7">
              {isActive ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* Row: Score Dropdown & Frequency Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Send leads with score</label>
            <div className="relative">
              <select
                value={minScore}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMinScore(val);
                  if (typeof window !== "undefined" && effectiveWorkspaceId) {
                    localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_min_score`, String(val));
                  }
                }}
                className="w-full appearance-none bg-[#191328] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors pr-10"
              >
                <option value={70}>≥ 70% (Hot Leads)</option>
                <option value={50}>≥ 50% (Warm Leads)</option>
                <option value={30}>≥ 30% (Warm & Hot Leads)</option>
                <option value={0}>All Leads (≥ 0%)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Send report</label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => {
                  const val = e.target.value;
                  setFrequency(val);
                  if (typeof window !== "undefined" && effectiveWorkspaceId) {
                    localStorage.setItem(`crm_email_report_${effectiveWorkspaceId}_frequency`, val);
                  }
                }}
                className="w-full appearance-none bg-[#191328] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors pr-10"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row: Time Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Time</label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
              <Clock size={16} />
            </div>
            <input
              type="text"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              placeholder="09:00 AM"
              className="w-full bg-[#191328] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Row: Send to (multiple emails) Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Send to (multiple emails)</label>
          <div className="min-h-[46px] bg-[#191328] border border-white/10 rounded-xl p-2 flex flex-wrap items-center gap-2 focus-within:border-violet-500 transition-colors">
            {recipientEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 bg-[#2a2140] border border-white/15 text-violet-200 text-xs px-2.5 py-1 rounded-lg"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                  e.preventDefault();
                  addEmail(emailInput);
                }
              }}
              onBlur={() => {
                if (emailInput.trim()) {
                  addEmail(emailInput);
                }
              }}
              placeholder="Add another email..."
              className="bg-transparent border-none text-xs text-white placeholder-zinc-500 focus:outline-none flex-1 min-w-[150px] py-1 px-1"
            />
          </div>
        </div>

        {/* Checkbox: Attach CSV file */}
        <div className="pt-1">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attachCsv}
              onChange={(e) => setAttachCsv(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-violet-600 bg-[#191328] border-white/20 focus:ring-violet-500 focus:ring-offset-0 focus:ring-1"
            />
            <div>
              <p className="text-sm font-medium text-white">Attach CSV file</p>
              <p className="text-xs text-zinc-400">Include qualified leads as CSV</p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest || recipientEmails.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{sendingTest ? "Sending Test..." : "Send Test Email"}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
            <span>{saving ? "Saving..." : "Save Email Settings"}</span>
          </button>
        </div>
      </div>

      {/* Card 2: Email Preview & Customization */}
      <div className="rounded-2xl bg-[#120c1f] border border-white/10 p-6 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 p-[1.5px] flex items-center justify-center">
              <div className="w-full h-full bg-[#120c1f] rounded-full flex items-center justify-center text-rose-400">
                <Mail size={15} />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Email Preview</h2>
              <p className="text-[11px] text-zinc-400">
                {isEditingTemplate ? "Customize message text & subject template" : "Live preview of the outgoing email"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit / Preview Toggle Button */}
            <button
              type="button"
              onClick={() => setIsEditingTemplate(!isEditingTemplate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isEditingTemplate
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              }`}
            >
              {isEditingTemplate ? <Eye size={13} /> : <Pencil size={13} />}
              <span>{isEditingTemplate ? "Preview Email" : "Customize Message"}</span>
            </button>

            {/* Reset to Default Button */}
            {isCustomized && (
              <button
                type="button"
                onClick={handleResetToDefault}
                title="Reset message format to default"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reset to Default</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors"
            >
              <Eye size={13} />
              <span>View Sample</span>
            </button>
          </div>
        </div>

        {/* Template Editing Panel */}
        {isEditingTemplate ? (
          <div className="rounded-xl bg-[#0b0714] border border-violet-500/30 p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Email Subject Template</label>
                <span className="text-[10px] text-zinc-500">Supports variables</span>
              </div>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="{frequency} Qualified Leads Report ({date})"
                className="w-full bg-[#191328] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Message Body Template</label>
                <span className="text-[10px] text-zinc-500">Edit text & placeholders</span>
              </div>
              <textarea
                rows={9}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full bg-[#191328] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* Variable Tags Bar */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-zinc-400 font-medium">Click a variable to insert into body:</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setBodyTemplate((prev) => `${prev} {${v.key}}`)}
                    title={v.desc}
                    className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-[11px] font-mono transition-colors"
                  >
                    +{v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-zinc-400 hover:text-white text-xs underline transition-colors"
              >
                Reset template to default
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTemplate(false)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
              >
                Done Editing (Preview)
              </button>
            </div>
          </div>
        ) : (
          /* Rendered Preview Container */
          <div className="rounded-xl bg-[#0b0714] border border-white/10 p-5 space-y-4 text-xs font-sans">
            {/* Metadata Row & Attachment Badge */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1 text-zinc-400">
                <p>
                  <span className="text-zinc-500">From:</span>{" "}
                  <span className="text-zinc-300">OrbionAgents &lt;noreply@orbionagents.com&gt;</span>
                </p>
                <p>
                  <span className="text-zinc-500">To:</span>{" "}
                  <span className="text-zinc-200">
                    {recipientEmails.length > 0 ? recipientEmails.join(", ") : "sales@orbionagents.com"}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500">Subject:</span>{" "}
                  <span className="text-white font-medium">{renderedSubject}</span>
                </p>
              </div>

              {attachCsv && (
                <div className="shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <p className="font-mono text-zinc-200 text-xs font-medium">{filenameStr}</p>
                    <p className="text-[10px] text-zinc-500">~2.4 KB</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {renderedBody}
            </div>
          </div>
        )}
      </div>

      {/* View Sample Modal */}
      {sampleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#151022] border border-white/15 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">Sample Qualified Leads</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Showing leads matching score ≥ {minScore}% that will be exported in the CSV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSampleModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {sampleLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                  <span className="text-xs">Loading sample leads...</span>
                </div>
              ) : sampleLeads.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No leads currently match score ≥ {minScore}%. Leads captured through chat or added manually with qualifying score will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400">
                        <th className="pb-2.5 font-medium">Name</th>
                        <th className="pb-2.5 font-medium">Phone / Email</th>
                        <th className="pb-2.5 font-medium">Source</th>
                        <th className="pb-2.5 font-medium">Score</th>
                        <th className="pb-2.5 font-medium">Tier</th>
                        <th className="pb-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sampleLeads.map((l) => (
                        <tr key={l.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-medium text-white">{l.name}</td>
                          <td className="py-2.5 text-zinc-300">{l.phone || l.email || "N/A"}</td>
                          <td className="py-2.5 capitalize text-zinc-400">{l.source || "N/A"}</td>
                          <td className="py-2.5 font-semibold text-violet-400">{l.score}%</td>
                          <td className="py-2.5 capitalize">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                l.lead_tier === "hot"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : l.lead_tier === "warm"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-zinc-500/20 text-zinc-300"
                              }`}
                            >
                              {l.lead_tier}
                            </span>
                          </td>
                          <td className="py-2.5 capitalize text-zinc-400">{l.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-zinc-400">
              <span>Total Qualifying: <strong className="text-white">{qualifyingCount}</strong></span>
              <button
                type="button"
                onClick={() => setSampleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
