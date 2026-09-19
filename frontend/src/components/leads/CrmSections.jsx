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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="flex-1 overflow-y-auto p-5 space-y-5">
      <h1 className="text-xl font-semibold">Lead Scoring</h1>
      <p className="text-sm text-zinc-400">
        Lead scores combine buying intent, activity, engagement, and labels.
        These tiers come from your existing scoring configuration.
      </p>
      <div className="flex flex-wrap gap-3">
        {options?.tier_ranges?.map((range) => (
          <div
            className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 capitalize"
            key={range.tier}
          >
            {range.tier}: {range.min}–{range.max}
          </div>
        ))}
      </div>
      {lead ? (
        <>
          <h2 className="font-medium">{lead.name}</h2>
          <button
            className={crmControl}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api.post(
                  `/lead-scoring/leads/${lead.id}/recalculate?workspace_id=${getWorkspaceIdFromToken()}`,
                );
                await onRecalculate(lead.id);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Updating…" : "Recalculate lead score"}
          </button>
          {error && <p role="alert">{error}</p>}
          <ScoreBreakdown breakdown={lead.breakdown} score={lead.score} />
        </>
      ) : (
        <p className="text-zinc-400">
          Select a lead in the Leads section to inspect its score.
        </p>
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
