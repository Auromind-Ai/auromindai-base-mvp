"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area
} from "recharts";

// ─── CONFIG─────────────────
const API = '/api'; // same-origin proxy

const TOOL_COLORS = {
  vector_db:     "#6366f1",
  web_search:    "#22d3ee",
  calculator:    "#f59e0b",
  direct_answer: "#10b981",
  direct_storage:"#f97316",
  reasoning:     "#ec4899",
  unknown:       "#64748b",
};

const TOOL_ICONS = {
  vector_db:     "🗄️",
  web_search:    "🌐",
  calculator:    "🧮",
  direct_answer: "💬",
  direct_storage:"📧",
  reasoning:     "🧠",
  unknown:       "❓",
};

const CHART_THEME = {
  grid:    "#1e2a3a",
  text:    "#94a3b8",
  tooltip: { bg: "#0f172a", border: "#1e2a3a", text: "#e2e8f0" },
};

// ─── CUSTOM TOOLTIP─────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e2a3a",
      borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#e2e8f0"
    }}>
      <p style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#6366f1" }}>
          {p.name}: <b>{p.value}</b>
        </p>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT─────────
export default function AdminDashboard() {
  const [data,         setData]         = useState(null);
  const [stats,        setStats]        = useState(null);
  const [failures,     setFailures]     = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [range,        setRange]        = useState("7d");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeTab,    setActiveTab]    = useState("overview");
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Fetch────────────────
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(`${API}/admin/rag_analytics?range=${range}`),
        fetch(`${API}/admin/stats`),
      ]);

      if (!analyticsRes.ok || !statsRes.ok) throw new Error("API error");

      const [analyticsData, statsData] = await Promise.all([
        analyticsRes.json(),
        statsRes.json(),
      ]);

      setData(analyticsData);
      setStats(statsData);
    } catch (e) {
      setError("Failed to load dashboard data. Check API connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  const fetchFailures = async (tool) => {
    try {
      const res  = await fetch(`${API}/admin/failures/${tool}`);
      const json = await res.json();
      setFailures(json);
      setSelectedTool(tool);
      setActiveTab("failures");
    } catch {
      setFailures(null);
    }
  };

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── Derived data─────────

  // Tool performance — merge tool_usage + tool_performance from analytics
  const toolPerformance = (() => {
    if (!data) return [];
    const perf = data.tool_performance || {};   // {tool: {total,positive,negative,accuracy}}
    const usage = data.tool_usage || [];        // [{tool, count}]

    const usageMap = {};
    usage.forEach(u => { usageMap[u.tool] = u.count; });

    if (Object.keys(perf).length > 0) {
      return Object.entries(perf).map(([tool, s]) => ({
        tool,
        total:    s.total    ?? 0,
        positive: s.positive ?? 0,
        negative: s.negative ?? 0,
        accuracy: s.accuracy ?? 0,
        count:    usageMap[tool] ?? s.total ?? 0,
      }));
    }
    // fallback: only usage data
    return usage.map(u => ({
      tool:     u.tool,
      total:    u.count,
      positive: 0,
      negative: 0,
      accuracy: 0,
      count:    u.count,
    }));
  })();

  // Radar data for tool comparison
  const radarData = toolPerformance.map(t => ({
    tool:     (TOOL_ICONS[t.tool] || "") + " " + t.tool,
    accuracy: t.accuracy,
    usage:    t.count,
    positive: t.positive,
  }));

  // Model confidence data
  const modelData = (data?.models || []).map(m => ({
    model:    m.model || "unknown",
    accuracy: m.accuracy ?? 0,
  }));

  // Confidence score buckets from feedback_logs
  const confidenceBuckets = (() => {
    const logs = data?.feedback_logs || [];
    const buckets = { "0-0.3": 0, "0.3-0.5": 0, "0.5-0.7": 0, "0.7-0.9": 0, "0.9-1.0": 0 };
    logs.forEach(f => {
      const c = f.confidence_score ?? 0;
      if      (c < 0.3) buckets["0-0.3"]++;
      else if (c < 0.5) buckets["0.3-0.5"]++;
      else if (c < 0.7) buckets["0.5-0.7"]++;
      else if (c < 0.9) buckets["0.7-0.9"]++;
      else              buckets["0.9-1.0"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  })();

  // Latency data from feedback_logs
  const latencyData = (() => {
    const logs = data?.feedback_logs || [];
    return logs
      .filter(f => f.latency_ms && f.latency_ms > 0)
      .slice(0, 20)
      .map((f, i) => ({
        index:   i + 1,
        latency: f.latency_ms ?? 0,
        tool:    f.tool || "unknown",
        fb:      f.feedback,
      }));
  })();

  // Avg latency per tool
  const latencyByTool = (() => {
    const logs   = data?.feedback_logs || [];
    const totals = {};
    const counts = {};
    logs.forEach(f => {
      if (!f.latency_ms || f.latency_ms <= 0) return;
      const t = f.tool || "unknown";
      totals[t] = (totals[t] || 0) + f.latency_ms;
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(totals).map(([tool, total]) => ({
      tool,
      avg_latency: Math.round(total / counts[tool]),
    }));
  })();

  // Rewrite effectiveness
  const rewriteData = data?.rewrite_effectiveness
    ? [
        { name: "Improved",        value: data.rewrite_effectiveness.improved_cases     ?? 0 },
        { name: "Same Query",      value: data.rewrite_effectiveness.same_query_cases   ?? 0 },
        { name: "Missing Rewrite", value: data.rewrite_effectiveness.missing_rewrites   ?? 0 },
      ]
    : [];

  // Per-user query count
  const userData = (data?.users || [])
    .map(u => ({ user: u.user_id ? u.user_id.slice(0, 8) + "…" : "anon", queries: u.queries }))
    .sort((a, b) => b.queries - a.queries)
    .slice(0, 10);

  // Session data
  const sessionData = (data?.sessions || [])
    .map(s => ({ session: s.session_id ? s.session_id.slice(0, 8) + "…" : "anon", queries: s.queries }))
    .sort((a, b) => b.queries - a.queries)
    .slice(0, 10);

  // ── Render───────────────
  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen msg={error} onRetry={fetchAllData} />;

  const sr = stats?.success_rate ?? 0;

  return (
    <div style={S.root}>
      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logo}>
            <span style={S.logoDot} />
            <span style={S.logoText}>Auromind</span>
            <span style={S.logoBadge}>Analytics</span>
          </div>
          <p style={S.headerSub}>RAG Intelligence Dashboard</p>
        </div>
        <div style={S.headerRight}>
          <div style={S.rangePills}>
            {["7d","30d"].map(r => (
              <button key={r} style={range === r ? S.pillActive : S.pill}
                onClick={() => setRange(r)}>
                {r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
          <button style={S.refreshBtn} onClick={() => fetchAllData(true)}>
            {refreshing ? "⟳" : "↻"} Refresh
          </button>
        </div>
      </header>

      {/* ── NAV TABS ── */}
      <nav style={S.nav}>
        {[
          { id: "overview",     label: "Overview",     icon: "📊" },
          { id: "tools",        label: "Tools",        icon: "🛠️" },
          { id: "performance",  label: "Performance",  icon: "⚡" },
          { id: "users",        label: "Users",        icon: "👥" },
          { id: "failures",     label: "Failures",     icon: "🔍" },
          { id: "feedback",     label: "Feedback Log", icon: "📋" },
        ].map(tab => (
          <button key={tab.id}
            style={activeTab === tab.id ? S.tabActive : S.tab}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>

        {/* ══════════════════════ OVERVIEW ══════════════════════ */}
        {activeTab === "overview" && (
          <div>
            {/* KPI Row */}
            <div style={S.kpiRow}>
              <KPI label="Total Queries"    value={stats?.total ?? 0}      icon="📨" color="#6366f1" />
              <KPI label="Success Rate"     value={`${sr}%`}               icon="" color={sr >= 70 ? "#10b981" : sr >= 50 ? "#f59e0b" : "#ef4444"} />
              <KPI label="Positive"         value={stats?.positive ?? 0}   icon="👍" color="#10b981" />
              <KPI label="Negative"         value={stats?.negative ?? 0}   icon="👎" color="#ef4444" />
              <KPI label="Best Tool"        value={data?.best_tool?.[0] ?? "—"}  icon="🏆" color="#f59e0b" />
              <KPI label="Worst Tool"       value={data?.worst_tool?.[0] ?? "—"} icon="⚠️"  color="#94a3b8" />
            </div>

            {/* Trend + Pie */}
            <div style={S.row2}>
              <ChartCard title="Query Volume Trend" flex={2}>
                <AreaChart data={data?.trends || []}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1"
                    fill="url(#trendGrad)" strokeWidth={2} name="Queries" />
                </AreaChart>
              </ChartCard>

              <ChartCard title="Success vs Failure" flex={1}>
                <PieChart>
                  <Pie data={[
                    { name: "Success", value: stats?.positive ?? 0 },
                    { name: "Failure", value: stats?.negative ?? 0 },
                  ]}
                    dataKey="value" outerRadius={90} innerRadius={50}
                    paddingAngle={3}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                </PieChart>
              </ChartCard>
            </div>

            {/* Top failed queries */}
            <SectionCard title="🔴 Top Failed Queries">
              {(data?.top_failed_queries || []).length === 0
                ? <EmptyState msg="No failed queries — great!" />
                : (data.top_failed_queries).map((q, i) => (
                  <div key={i} style={S.failRow}>
                    <span style={S.failIdx}>#{i + 1}</span>
                    <span style={S.failQuery}>{q.query}</span>
                    <span style={S.failBadge}>{q.count}x</span>
                  </div>
                ))
              }
            </SectionCard>
          </div>
        )}

        {/* ══════════════════════ TOOLS ══════════════════════ */}
        {activeTab === "tools" && (
          <div>
            {/* Tool cards */}
            <div style={S.toolGrid}>
              {toolPerformance.map((t, i) => (
                <ToolCard key={i} tool={t} onClick={() => fetchFailures(t.tool)} />
              ))}
            </div>

            <div style={S.row2}>
              {/* Bar chart */}
              <ChartCard title="Tool Usage" flex={1}>
                <BarChart data={toolPerformance}
                  onClick={e => e?.activePayload?.length && fetchFailures(e.activePayload[0].payload.tool)}>
                  <XAxis dataKey="tool" tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4,4,0,0]}
                    fill="#6366f1" name="Usage">
                    {toolPerformance.map((t, i) => (
                      <Cell key={i} fill={TOOL_COLORS[t.tool] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              {/* Radar */}
              <ChartCard title="Tool Accuracy Radar" flex={1}>
                <RadarChart data={radarData} outerRadius={90}>
                  <PolarGrid stroke={CHART_THEME.grid} />
                  <PolarAngleAxis dataKey="tool" tick={{ fill: CHART_THEME.text, fontSize: 9 }} />
                  <PolarRadiusAxis tick={{ fill: CHART_THEME.text, fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="Accuracy" dataKey="accuracy"
                    stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ChartCard>
            </div>

            {/* Pos vs Neg stacked bar */}
            <ChartCard title="Positive vs Negative per Tool" flex={1}>
              <BarChart data={toolPerformance}>
                <XAxis dataKey="tool" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" radius={[0,0,0,0]} />
                <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" radius={[4,4,0,0]} />
              </BarChart>
            </ChartCard>

            {/* Model confidence */}
            {modelData.length > 0 && (
              <ChartCard title="Model Confidence Scores" flex={1}>
                <BarChart data={modelData}>
                  <XAxis dataKey="model" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="accuracy" fill="#22d3ee" name="Avg Confidence" radius={[4,4,0,0]} />
                </BarChart>
              </ChartCard>
            )}
          </div>
        )}

        {/* ══════════════════════ PERFORMANCE ══════════════════════ */}
        {activeTab === "performance" && (
          <div>
            {/* Latency chart */}
            {latencyData.length > 0 ? (
              <ChartCard title="⚡ Response Latency (ms) — Last 20 queries">
                <LineChart data={latencyData}>
                  <XAxis dataKey="index" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="latency" stroke="#f59e0b"
                    strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} name="Latency (ms)" />
                </LineChart>
              </ChartCard>
            ) : (
              <SectionCard title="⚡ Latency">
                <EmptyState msg="No latency data yet. Make sure frontend sends latency_ms in feedback." />
              </SectionCard>
            )}

            {/* Avg latency per tool */}
            {latencyByTool.length > 0 && (
              <ChartCard title="Avg Latency per Tool (ms)">
                <BarChart data={latencyByTool}>
                  <XAxis dataKey="tool" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_latency" name="Avg ms" radius={[4,4,0,0]}>
                    {latencyByTool.map((t, i) => (
                      <Cell key={i} fill={TOOL_COLORS[t.tool] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            )}

            {/* Confidence distribution */}
            <div style={S.row2}>
              <ChartCard title="Confidence Score Distribution" flex={1}>
                <BarChart data={confidenceBuckets}>
                  <XAxis dataKey="range" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#6366f1" name="Count" radius={[4,4,0,0]} />
                </BarChart>
              </ChartCard>

              {/* Rewrite effectiveness pie */}
              {rewriteData.length > 0 && (
                <ChartCard title="Query Rewrite Effectiveness" flex={1}>
                  <PieChart>
                    <Pie data={rewriteData} dataKey="value"
                      outerRadius={90} innerRadius={40} paddingAngle={3}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  </PieChart>
                </ChartCard>
              )}
            </div>

            {/* Rewrite stats */}
            {data?.rewrite_effectiveness && (
              <SectionCard title="📝 Rewrite Effectiveness Stats">
                <div style={S.statsGrid}>
                  <StatBox label="Total Samples"    value={data.rewrite_effectiveness.total_samples}    />
                  <StatBox label="Improved Cases"   value={data.rewrite_effectiveness.improved_cases}   color="#10b981" />
                  <StatBox label="Same Query"        value={data.rewrite_effectiveness.same_query_cases} color="#f59e0b" />
                  <StatBox label="Missing Rewrites"  value={data.rewrite_effectiveness.missing_rewrites} color="#ef4444" />
                  <StatBox label="Effectiveness %"   value={`${data.rewrite_effectiveness.rewrite_effectiveness ?? 0}%`} color="#6366f1" />
                  <StatBox label="Avg Orig Length"   value={data.rewrite_effectiveness.avg_original_length} />
                  <StatBox label="Avg Rewrite Length" value={data.rewrite_effectiveness.avg_rewrite_length} />
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ══════════════════════ USERS ══════════════════════ */}
        {activeTab === "users" && (
          <div>
            <div style={S.row2}>
              <ChartCard title="Top Users by Query Count" flex={1}>
                <BarChart data={userData} layout="vertical">
                  <XAxis type="number" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis dataKey="user" type="category"
                    tick={{ fill: CHART_THEME.text, fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="queries" fill="#6366f1" name="Queries" radius={[0,4,4,0]} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Top Sessions by Query Count" flex={1}>
                <BarChart data={sessionData} layout="vertical">
                  <XAxis type="number" tick={{ fill: CHART_THEME.text, fontSize: 11 }} />
                  <YAxis dataKey="session" type="category"
                    tick={{ fill: CHART_THEME.text, fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="queries" fill="#22d3ee" name="Queries" radius={[0,4,4,0]} />
                </BarChart>
              </ChartCard>
            </div>

            {/* Users table */}
            <SectionCard title="👥 All Users">
              <table style={S.table}>
                <thead>
                  <tr>
                    {["User ID","Queries"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.users || []).map((u, i) => (
                    <tr key={i} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                      <td style={S.td}>{u.user_id || "anonymous"}</td>
                      <td style={S.td}>{u.queries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        )}

        {/* ══════════════════════ FAILURES ══════════════════════ */}
        {activeTab === "failures" && (
          <div>
            {/* Tool selector */}
            <SectionCard title="🔍 Select Tool to Inspect Failures">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {toolPerformance.map((t, i) => (
                  <button key={i}
                    style={selectedTool === t.tool ? S.toolBtnActive : S.toolBtn}
                    onClick={() => fetchFailures(t.tool)}>
                    {TOOL_ICONS[t.tool] || "🔧"} {t.tool}
                    <span style={S.toolBtnBadge}>{t.negative} fails</span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {failures && (
              <>
                {/* Failure stats */}
                <div style={S.kpiRow}>
                  <KPI label="Total Failures"   value={failures.total_failures}             icon="❌" color="#ef4444" />
                  <KPI label="Short Answers"    value={failures.insights?.short_answers}    icon="📏" color="#f59e0b" />
                  <KPI label="Missing Rewrites" value={failures.insights?.missing_rewrites} icon="✏️"  color="#94a3b8" />
                </div>

                {/* Cases */}
                <SectionCard title={`Failure Cases — ${selectedTool}`}>
                  {(failures?.cases || []).length === 0
                    ? <EmptyState msg="No failure cases found." />
                    : (failures.cases).map((c, i) => (
                      <div key={i} style={S.caseCard}>
                        <div style={S.caseHeader}>
                          <span style={S.caseNum}>#{i + 1}</span>
                          <span style={S.caseTool}>{TOOL_ICONS[selectedTool]} {selectedTool}</span>
                        </div>
                        <div style={S.caseField}>
                          <span style={S.caseLabel}>Query</span>
                          <span style={S.caseVal}>{c.query || "—"}</span>
                        </div>
                        {c.rewritten_query && c.rewritten_query !== c.query && (
                          <div style={S.caseField}>
                            <span style={S.caseLabel}>Rewritten</span>
                            <span style={{ ...S.caseVal, color: "#f59e0b" }}>{c.rewritten_query}</span>
                          </div>
                        )}
                        <div style={S.caseField}>
                          <span style={S.caseLabel}>Answer</span>
                          <span style={{ ...S.caseVal, color: "#94a3b8" }}>{c.answer || "—"}</span>
                        </div>
                      </div>
                    ))
                  }
                </SectionCard>
              </>
            )}

            {!failures && (
              <SectionCard title="">
                <EmptyState msg="Click a tool above to see its failure cases." />
              </SectionCard>
            )}
          </div>
        )}

        {/* ══════════════════════ FEEDBACK LOG ══════════════════════ */}
        {activeTab === "feedback" && (
          <div>
            <SectionCard title="📋 Recent Feedback Log">
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Query","Tool","Feedback","Model","Confidence","Latency (ms)"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.feedback_logs || []).map((f, i) => (
                    <tr key={i} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                      <td style={{ ...S.td, maxWidth: 300, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.query || "—"}
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.toolTag,
                          background: (TOOL_COLORS[f.tool] || "#6366f1") + "22",
                          color: TOOL_COLORS[f.tool] || "#6366f1" }}>
                          {TOOL_ICONS[f.tool] || "🔧"} {f.tool || "unknown"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          color: f.feedback === "up" ? "#10b981" : "#ef4444",
                          fontWeight: 600,
                        }}>
                          {f.feedback === "up" ? "👍 up" : "👎 down"}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#94a3b8" }}>{f.model || "—"}</td>
                      <td style={S.td}>
                        {f.confidence_score != null
                          ? <ConfidenceBar value={f.confidence_score} />
                          : <span style={{ color: "#64748b" }}>—</span>
                        }
                      </td>
                      <td style={{ ...S.td, color: f.latency_ms > 3000 ? "#ef4444" : "#94a3b8" }}>
                        {f.latency_ms ? `${f.latency_ms} ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── SUB-COMPONENTS─────────

function LoadingScreen() {
  return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={S.spinner} />
        <p style={{ color: "#6366f1", marginTop: 16, fontFamily: "'DM Mono', monospace" }}>
          Loading Analytics…
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{ fontSize: 48 }}>⚠️</p>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{msg}</p>
        <button style={S.pillActive} onClick={onRetry}>Try Again</button>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, color }) {
  return (
    <div style={{ ...S.kpiCard, borderTop: `3px solid ${color}` }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <p style={{ color: "#64748b", fontSize: 11, marginTop: 8, textTransform: "uppercase",
        letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace" }}>{label}</p>
      <h2 style={{ color: color, fontSize: 28, margin: "4px 0 0",
        fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{value ?? "—"}</h2>
    </div>
  );
}

function ChartCard({ title, children, flex }) {
  return (
    <div style={{ ...S.chartCard, flex: flex ?? 1 }}>
      <p style={S.chartTitle}>{title}</p>
      <ResponsiveContainer width="100%" height={260}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={S.sectionCard}>
      {title && <h3 style={S.sectionTitle}>{title}</h3>}
      {children}
    </div>
  );
}

function ToolCard({ tool: t, onClick }) {
  const color = TOOL_COLORS[t.tool] || "#6366f1";
  const acc   = t.accuracy ?? 0;
  return (
    <div style={{ ...S.toolCardBox, borderLeft: `4px solid ${color}` }}
      onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 24 }}>{TOOL_ICONS[t.tool] || "🔧"}</span>
        <span style={{ ...S.accBadge,
          background: acc >= 70 ? "#10b98122" : acc >= 50 ? "#f59e0b22" : "#ef444422",
          color:      acc >= 70 ? "#10b981"   : acc >= 50 ? "#f59e0b"   : "#ef4444"
        }}>{acc}%</span>
      </div>
      <p style={{ color: "#e2e8f0", fontWeight: 600, marginTop: 10, fontSize: 13 }}>{t.tool}</p>
      <div style={S.toolStatRow}>
        <span style={{ color: "#10b981" }}>{t.positive}</span>
        <span style={{ color: "#ef4444" }}>❌ {t.negative}</span>
        <span style={{ color: "#94a3b8" }}>📊 {t.total}</span>
      </div>
      <p style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>Click to inspect failures →</p>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={S.statBox}>
      <p style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase",
        letterSpacing: "0.07em", fontFamily: "'DM Mono', monospace" }}>{label}</p>
      <p style={{ color: color || "#e2e8f0", fontSize: 22, fontWeight: 700,
        fontFamily: "'Syne', sans-serif", marginTop: 4 }}>{value ?? "—"}</p>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const col = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 6, background: "#1e2a3a", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 4 }} />
      </div>
      <span style={{ color: col, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{pct}%</span>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
      <p style={{ fontSize: 32 }}>🌑</p>
      <p style={{ marginTop: 8, fontSize: 13 }}>{msg}</p>
    </div>
  );
}

// ─── STYLES─────────────────
const S = {
  root: {
    minHeight: "100vh",
    background: "#080d13",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },

  // Header
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px",
    borderBottom: "1px solid #0f1923",
    background: "#0a1018",
  },
  headerLeft:  { display: "flex", flexDirection: "column", gap: 4 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  logo:        { display: "flex", alignItems: "center", gap: 8 },
  logoDot:     { width: 10, height: 10, borderRadius: "50%", background: "#6366f1",
                 boxShadow: "0 0 8px #6366f1" },
  logoText:    { fontSize: 18, fontWeight: 700, color: "#e2e8f0",
                 fontFamily: "'Syne', sans-serif" },
  logoBadge:   { fontSize: 10, padding: "2px 8px", background: "#6366f122",
                 color: "#6366f1", borderRadius: 20, fontFamily: "'DM Mono', monospace",
                 letterSpacing: "0.08em" },
  headerSub:   { color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace" },

  // Nav
  nav: {
    display: "flex", gap: 2, padding: "0 24px",
    borderBottom: "1px solid #0f1923",
    background: "#0a1018",
    overflowX: "auto",
  },
  tab: {
    padding: "14px 18px", fontSize: 13, background: "transparent",
    color: "#64748b", border: "none", cursor: "pointer",
    borderBottom: "2px solid transparent", whiteSpace: "nowrap",
  },
  tabActive: {
    padding: "14px 18px", fontSize: 13, background: "transparent",
    color: "#6366f1", border: "none", cursor: "pointer",
    borderBottom: "2px solid #6366f1", whiteSpace: "nowrap", fontWeight: 600,
  },

  // Main
  main: { padding: "28px 32px", maxWidth: 1400, margin: "0 auto" },

  // KPI
  kpiRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 },
  kpiCard: {
    flex: "1 1 140px", background: "#0d1520",
    border: "1px solid #0f1923", borderRadius: 12,
    padding: "18px 20px", minWidth: 120,
  },

  // Charts
  row2:      { display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  chartCard: {
    background: "#0d1520", border: "1px solid #0f1923",
    borderRadius: 12, padding: "18px 20px", marginBottom: 24, minWidth: 260,
  },
  chartTitle: {
    color: "#94a3b8", fontSize: 12, marginBottom: 16,
    textTransform: "uppercase", letterSpacing: "0.08em",
    fontFamily: "'DM Mono', monospace",
  },

  // Section
  sectionCard: {
    background: "#0d1520", border: "1px solid #0f1923",
    borderRadius: 12, padding: "20px 24px", marginBottom: 24,
  },
  sectionTitle: {
    color: "#e2e8f0", fontSize: 14, marginBottom: 16,
    fontFamily: "'Syne', sans-serif", fontWeight: 600,
  },

  // Table
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", padding: "10px 14px",
    color: "#64748b", fontWeight: 500, fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.07em",
    background: "#0a1018", borderBottom: "1px solid #0f1923",
    fontFamily: "'DM Mono', monospace",
  },
  td:    { padding: "10px 14px", color: "#cbd5e1", verticalAlign: "middle" },
  trEven: { background: "transparent" },
  trOdd:  { background: "#0a101833" },

  // Tool cards
  toolGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16, marginBottom: 28,
  },
  toolCardBox: {
    background: "#0d1520", border: "1px solid #0f1923",
    borderRadius: 12, padding: "16px 18px", cursor: "pointer",
    transition: "border-color 0.2s",
  },
  toolStatRow: { display: "flex", gap: 12, marginTop: 8, fontSize: 12 },
  accBadge:    { fontSize: 11, padding: "2px 8px", borderRadius: 20,
                 fontFamily: "'DM Mono', monospace", fontWeight: 700 },
  toolTag:     { padding: "2px 8px", borderRadius: 20, fontSize: 11,
                 fontFamily: "'DM Mono', monospace" },

  // Tool buttons (failure tab)
  toolBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #1e2a3a",
    background: "#0d1520", color: "#94a3b8", cursor: "pointer", fontSize: 13,
    display: "flex", alignItems: "center", gap: 8,
  },
  toolBtnActive: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #6366f1",
    background: "#6366f122", color: "#6366f1", cursor: "pointer", fontSize: 13,
    display: "flex", alignItems: "center", gap: 8,
  },
  toolBtnBadge: {
    fontSize: 10, background: "#ef444422", color: "#ef4444",
    padding: "1px 6px", borderRadius: 20,
  },

  // Case card
  caseCard: {
    background: "#0a1018", border: "1px solid #0f1923",
    borderRadius: 10, padding: "14px 18px", marginBottom: 12,
  },
  caseHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  caseNum:    { background: "#6366f122", color: "#6366f1", borderRadius: 20,
                padding: "1px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace" },
  caseTool:   { color: "#94a3b8", fontSize: 12 },
  caseField:  { display: "flex", gap: 10, marginTop: 6, alignItems: "flex-start" },
  caseLabel:  { color: "#475569", fontSize: 11, minWidth: 70,
                fontFamily: "'DM Mono', monospace", paddingTop: 2 },
  caseVal:    { color: "#cbd5e1", fontSize: 13, flex: 1 },

  // Failed queries
  failRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0", borderBottom: "1px solid #0f1923",
  },
  failIdx:   { color: "#475569", fontSize: 11, fontFamily: "'DM Mono', monospace",
               minWidth: 28 },
  failQuery: { flex: 1, color: "#cbd5e1", fontSize: 13 },
  failBadge: { background: "#ef444422", color: "#ef4444", padding: "2px 10px",
               borderRadius: 20, fontSize: 11, fontFamily: "'DM Mono', monospace" },

  // Stats grid
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12,
  },
  statBox: {
    background: "#0a1018", border: "1px solid #0f1923",
    borderRadius: 10, padding: "14px 16px",
  },

  // Range pills
  rangePills: { display: "flex", gap: 6 },
  pill: {
    padding: "6px 14px", borderRadius: 20, border: "1px solid #1e2a3a",
    background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12,
  },
  pillActive: {
    padding: "6px 14px", borderRadius: 20, border: "1px solid #6366f1",
    background: "#6366f1", color: "white", cursor: "pointer", fontSize: 12,
  },

  // Refresh
  refreshBtn: {
    padding: "6px 14px", borderRadius: 8, border: "1px solid #1e2a3a",
    background: "#0d1520", color: "#94a3b8", cursor: "pointer", fontSize: 12,
  },

  // Spinner
  spinner: {
    width: 36, height: 36, margin: "0 auto",
    border: "3px solid #0f1923",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
