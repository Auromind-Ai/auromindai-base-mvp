"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  Target,
  Mail,
  History,
} from "lucide-react";
import api from "@/lib/api";
import { getWorkspaceIdFromToken } from "@/lib/auth";
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

export function CrmReports() {
  return (
    <main className="flex-1 overflow-y-auto p-5 space-y-4">
      <h1 className="text-xl font-semibold">Email Reports</h1>
      <div className="max-w-xl rounded-2xl bg-[#151020] border border-white/10 p-6 space-y-4">
        <h2 className="font-medium">Workspace reports</h2>
        <p className="text-sm text-zinc-400">
          Daily summaries and weekly performance emails continue to use your
          existing notification settings.
        </p>
        <p className="text-sm text-zinc-400">
          Scheduled reports using CRM filters are not available in this version.
          You can export a filtered lead list as CSV or Excel from Leads.
        </p>
        <a className={`${crmControl} inline-block`} href="/user/admin/settings">
          Open notification settings
        </a>
      </div>
    </main>
  );
}
