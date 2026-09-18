"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Filter, Download, X } from "lucide-react";
import api from "@/lib/api";
import { getUser, getWorkspaceIdFromToken } from "@/lib/auth";

export const crmControl =
  "rounded-xl border border-white/10 bg-[#171322] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40";
export const intentLabel = (key) =>
  ({
    has_pricing: "Price enquiry",
    pricing_intent: "Pricing intent",
    payment_intent: "Payment intent",
    budget_acceptance: "Budget accepted",
    has_urgency: "Urgency",
    shared_contact: "Contact shared",
    callback_request: "Callback requested",
    pincode_shared: "Pincode shared",
    delivery_interest: "Delivery interest",
    is_specific: "Detailed enquiry",
    has_question: "Question asked",
    has_number: "Number mentioned",
    negative_intent: "Negative intent",
    is_vague: "Brief enquiry",
  })[key] || key.replaceAll("_", " ");
export const filterLabel = (key) =>
  ({
    min_score: "Minimum score",
    max_score: "Maximum score",
    created_from: "Created from",
    created_to: "Created before",
    activity_from: "Active from",
    activity_to: "Active before",
    converted_from: "Converted from",
    converted_to: "Converted before",
    min_value: "Minimum deal value",
    max_value: "Maximum deal value",
    min_messages: "Minimum messages",
    max_messages: "Maximum messages",
    assigned_to: "Assigned agent",
    has_phone: "Phone available",
    has_email: "Email available",
    score_changed: "Latest score change",
  })[key] || key.replaceAll("_", " ");
export const cleanFilters = (values) =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, v]) =>
        v !== "" &&
        v !== null &&
        v !== undefined &&
        (!Array.isArray(v) || v.length),
    ),
  );
export function dateRange(days, yesterday = false) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  if (!yesterday) end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return [start.toISOString(), end.toISOString()];
}

function Modal({ title, open, onClose, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/65 z-[100]" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#100d19] text-white shadow-2xl z-[101] flex flex-col p-5 gap-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className={crmControl}>
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-zinc-400">
            Choose what matters to your team.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Choices({
  title,
  values = [],
  selected = [],
  onChange,
  label = (v) => v,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-zinc-300 mb-2">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <label
            key={v}
            className={`${crmControl} flex items-center gap-2 cursor-pointer ${selected.includes(v) ? "border-violet-500 bg-violet-500/15" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(v)}
              onChange={() =>
                onChange(
                  selected.includes(v)
                    ? selected.filter((x) => x !== v)
                    : [...selected, v],
                )
              }
            />
            {label(v)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function CrmControls({
  filters,
  onApply,
  options,
  selectedIds,
  search,
  quickFilter,
  onClear,
  onRestore,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [exportOpen, setExportOpen] = useState(false);
  const [scope, setScope] = useState("filtered");
  const [format, setFormat] = useState("csv");
  const [columns, setColumns] = useState([
    "name",
    "phone",
    "email",
    "source",
    "score",
    "lead_tier",
    "status",
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [views, setViews] = useState([]);
  const [viewName, setViewName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const storageKey = `crm-views:${getWorkspaceIdFromToken()}:${getUser()?.id || "current"}`;
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setViews(Array.isArray(stored) ? stored : []);
    } catch {
      setViews([]);
    }
  }, [storageKey]);
  const persistViews = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setViews(next);
    } catch {
      setError("Saved views could not be stored in this browser.");
    }
  };
  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const select = (key, label, items) => (
    <label className="flex flex-col gap-1 text-sm text-zinc-400">
      {label}
      <select
        className={crmControl}
        value={draft[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">Any</option>
        {items.map(([v, name]) => (
          <option key={v} value={v}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const number = (key, label, max) => (
    <label className="flex flex-col gap-1 text-sm text-zinc-400">
      {label}
      <input
        type="number"
        min="0"
        max={max}
        className={crmControl}
        value={draft[key] ?? ""}
        onChange={(e) =>
          set(key, e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    </label>
  );
  const effective = cleanFilters({ ...filters, ...(search ? { search } : {}) });
  if (quickFilter === "favorites") effective.favorite = true;
  else if (quickFilter !== "all") effective.sources = [quickFilter];
  const exportLeads = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await api.requestRaw(
        `/lead-scoring/export?workspace_id=${getWorkspaceIdFromToken()}`,
        {
          method: "POST",
          body: JSON.stringify({
            scope,
            format,
            filters: effective,
            selected_ids: selectedIds,
            columns,
          }),
          timeout: 120000,
        },
      );
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportOpen(false);
    } catch (err) {
      setError(err.message || "Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const apply = (e) => {
    e.preventDefault();
    for (const [a, b] of [
      ["min_score", "max_score"],
      ["min_value", "max_value"],
      ["min_messages", "max_messages"],
      ["created_from", "created_to"],
      ["activity_from", "activity_to"],
      ["converted_from", "converted_to"],
    ]) {
      if (
        draft[a] !== undefined &&
        draft[a] !== "" &&
        draft[b] !== undefined &&
        draft[b] !== "" &&
        draft[a] > draft[b]
      ) {
        setError("The start or minimum must not exceed the end or maximum.");
        return;
      }
    }
    onApply(cleanFilters(draft));
    setOpen(false);
    setError("");
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0D0D17]">
        <button
          className={crmControl}
          onClick={() => {
            const current = { ...effective };
            delete current.search;
            setDraft(current);
            setError("");
            setOpen(true);
          }}
        >
          <Filter size={14} className="inline mr-2" />
          Advanced Filters
          {Object.keys(effective).length
            ? ` (${Object.keys(effective).length})`
            : ""}
        </button>
        <button
          className={crmControl}
          disabled={!options}
          onClick={() => {
            setError("");
            setExportOpen(true);
          }}
        >
          <Download size={14} className="inline mr-2" />
          Export
        </button>
        <button className={crmControl} onClick={() => setSaveOpen(true)}>
          Save view
        </button>
        {!!views.length && (
          <select
            aria-label="Open saved view"
            className={crmControl}
            value=""
            onChange={(e) => {
              const v = views[Number(e.target.value)];
              if (v) onRestore(v.filters);
            }}
          >
            <option value="">Saved views</option>
            {views.map((v, i) => (
              <option value={i} key={i}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        {selectedIds.length > 0 && (
          <span className="text-xs text-violet-300">
            {selectedIds.length} selected
          </span>
        )}
        {Object.keys(effective).length > 0 && (
          <button className="text-xs text-violet-300 ml-auto" onClick={onClear}>
            Clear all filters
          </button>
        )}
        <div className="flex gap-2 flex-wrap w-full empty:hidden">
          {Object.entries(effective).map(([key, value]) => (
            <button
              key={key}
              className="text-xs rounded-full px-3 py-1 bg-violet-500/15 text-violet-200 border border-violet-500/25"
              onClick={() => {
                const next = { ...effective };
                delete next[key];
                onRestore(next);
              }}
            >
              {filterLabel(key)}:{" "}
              {key === "assigned_to"
                ? options?.agents?.find((a) => a.id === value)?.name || "Agent"
                : Array.isArray(value)
                  ? value
                      .map((v) => (key === "intents" ? intentLabel(v) : v))
                      .join(", ")
                  : String(value)}{" "}
              <X size={12} className="inline" />
            </button>
          ))}
        </div>
      </div>
      <Modal
        title="Advanced Filters"
        open={open}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={apply} className="flex flex-col min-h-0 flex-1 gap-4">
          <div className="overflow-y-auto flex-1 space-y-6 pr-2">
            <section className="space-y-3">
              <h3 className="font-semibold">Date</h3>
              {[
                ["created", "Created date"],
                ["activity", "Last activity"],
                ["converted", "Converted date"],
              ].map(([key, label]) => (
                <fieldset key={key} className="space-y-2">
                  <legend className="text-sm text-zinc-400">{label}</legend>
                  <select
                    aria-label={`${label} preset`}
                    className={`${crmControl} w-full`}
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      const range = value
                        ? dateRange(
                            value === "yesterday" ? 1 : Number(value),
                            value === "yesterday",
                          )
                        : ["", ""];
                      setDraft((prev) => ({
                        ...prev,
                        [`${key}_from`]: range[0],
                        [`${key}_to`]: range[1],
                      }));
                    }}
                  >
                    <option value="">Custom range / Any time</option>
                    <option value="1">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="3">Last 3 days</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    {["from", "to"].map((suffix) => (
                      <label key={suffix} className="text-xs text-zinc-400">
                        {suffix === "from" ? "From" : "Through"}
                        <input
                          type="date"
                          aria-label={`${label} ${suffix}`}
                          className={`${crmControl} w-full`}
                          value={
                            draft[`${key}_${suffix}`]
                              ? (() => {
                                  const d = new Date(draft[`${key}_${suffix}`]);
                                  if (suffix === "to")
                                    d.setDate(d.getDate() - 1);
                                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                                })()
                              : ""
                          }
                          onChange={(e) => {
                            let value = "";
                            if (e.target.value) {
                              const date = new Date(
                                `${e.target.value}T00:00:00`,
                              );
                              if (suffix === "to")
                                date.setDate(date.getDate() + 1);
                              value = date.toISOString();
                            }
                            set(`${key}_${suffix}`, value);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Scoring</h3>
              <select
                aria-label="Score preset"
                className={`${crmControl} w-full`}
                defaultValue=""
                onChange={(e) => {
                  const [min, max] = e.target.value.split(":");
                  setDraft((prev) => ({
                    ...prev,
                    min_score: min ? Number(min) : "",
                    max_score: max ? Number(max) : "",
                  }));
                }}
              >
                <option value="">Custom score / Any score</option>
                {["0:29", "30:49", "50:69", "70:89", "90:100"].map((v) => (
                  <option key={v} value={v}>
                    {v.replace(":", "–")}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {number("min_score", "Minimum score", 100)}
                {number("max_score", "Maximum score", 100)}
              </div>
              <Choices
                title="Tier"
                values={options?.tiers}
                selected={draft.tiers}
                onChange={(v) => set("tiers", v)}
              />
              {select("score_changed", "Latest score change", [
                ["increased", "Increased"],
                ["decreased", "Decreased"],
                ["unchanged", "No change"],
              ])}
            </section>
            <Choices
              title="Source / Channel"
              values={options?.sources}
              selected={draft.sources}
              onChange={(v) => set("sources", v)}
            />
            <Choices
              title="Buying intent"
              values={options?.intents}
              selected={draft.intents}
              onChange={(v) => set("intents", v)}
              label={intentLabel}
            />
            <section className="space-y-3">
              <h3 className="font-semibold">Engagement</h3>
              {select("waiting", "Waiting for a reply", [
                ["customer", "Customer waiting for reply"],
                ["agent", "Agent waiting for customer"],
              ])}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.unread === true}
                  onChange={(e) => set("unread", e.target.checked ? true : "")}
                />
                Unread customer messages
              </label>
              <div className="grid grid-cols-2 gap-2">
                {number("min_messages", "Minimum messages")}
                {number("max_messages", "Maximum messages")}
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Assignment</h3>
              {select("assignment", "Assigned to", [
                ["mine", "My leads"],
                ["unassigned", "Unassigned"],
                ["assigned", "Assigned"],
              ])}
              {select(
                "assigned_to",
                "Specific agent",
                options?.agents?.map((a) => [a.id, a.name]) || [],
              )}
            </section>
            <Choices
              title="Labels (any selected)"
              values={options?.labels}
              selected={draft.labels}
              onChange={(v) => set("labels", v)}
            />
            <Choices
              title="Status"
              values={options?.statuses}
              selected={draft.statuses}
              onChange={(v) => set("statuses", v)}
            />
            <section className="space-y-3">
              <h3 className="font-semibold">Deal / Revenue</h3>
              <label className="flex flex-col gap-1 text-sm">
                Conversion
                <select
                  className={crmControl}
                  value={draft.converted ?? ""}
                  onChange={(e) =>
                    set(
                      "converted",
                      e.target.value === "" ? "" : e.target.value === "true",
                    )
                  }
                >
                  <option value="">Any</option>
                  <option value="true">Converted</option>
                  <option value="false">Not converted</option>
                </select>
              </label>
              <select
                aria-label="Deal value preset"
                className={`${crmControl} w-full`}
                defaultValue=""
                onChange={(e) => {
                  const [min, max] = e.target.value.split(":");
                  setDraft((prev) => ({
                    ...prev,
                    min_value: min ? Number(min) : "",
                    max_value: max ? Number(max) : "",
                  }));
                }}
              >
                <option value="">Custom value / Any value</option>
                <option value="0:1000">0–1,000</option>
                <option value="1000:10000">1,000–10,000</option>
                <option value="10000:">10,000+</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                {number("min_value", "Minimum value")}
                {number("max_value", "Maximum value")}
              </div>
              <label className="flex flex-col gap-1 text-sm">
                Product / Service
                <input
                  className={crmControl}
                  value={draft.product || ""}
                  onChange={(e) => set("product", e.target.value)}
                />
              </label>
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold">Customer data</h3>
              {["has_phone", "has_email"].map((key) => (
                <label key={key} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft[key] === true}
                    onChange={(e) => set(key, e.target.checked ? true : "")}
                  />
                  {filterLabel(key)}
                </label>
              ))}
            </section>
          </div>
          {error && (
            <p role="alert" className="text-rose-300 text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-between border-t border-white/10 pt-3">
            <button
              type="button"
              className={crmControl}
              onClick={() => setDraft({})}
            >
              Clear all
            </button>
            <button className={`${crmControl} bg-violet-600`}>
              Apply filters
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        title="Export Leads"
        open={exportOpen}
        onClose={() => !busy && setExportOpen(false)}
      >
        <div className="overflow-y-auto flex-1 space-y-5">
          <label className="flex flex-col gap-2">
            Leads to export
            <select
              className={crmControl}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="all">Export all leads</option>
              <option value="filtered">Export filtered leads</option>
              <option value="selected" disabled={!selectedIds.length}>
                Export selected leads ({selectedIds.length})
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Format
            <select
              className={crmControl}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
          </label>
          <Choices
            title="Fields"
            values={Object.keys(options?.columns || {})}
            selected={columns}
            onChange={setColumns}
            label={(key) => options.columns[key]}
          />
        </div>
        {error && (
          <p role="alert" className="text-rose-300 text-sm">
            {error}
          </p>
        )}
        <button
          className={`${crmControl} bg-violet-600`}
          disabled={
            busy ||
            !columns.length ||
            (scope === "selected" && !selectedIds.length)
          }
          onClick={exportLeads}
        >
          {busy ? "Preparing export…" : "Export"}
        </button>
      </Modal>
      <Modal
        title="Saved Views"
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
      >
        <p className="text-sm text-zinc-400">
          Views are saved in this browser for your account and workspace.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (viewName.trim()) {
              persistViews([
                ...views,
                { name: viewName.trim(), filters: effective },
              ]);
              setViewName("");
            }
          }}
          className="flex gap-2"
        >
          <input
            required
            maxLength={80}
            aria-label="View name"
            placeholder="View name"
            className={`${crmControl} min-w-0 flex-1`}
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <button className={crmControl}>Save</button>
        </form>
        <div className="overflow-y-auto">
          {views.map((v, i) => (
            <div
              className="flex justify-between py-3 border-b border-white/10"
              key={i}
            >
              <button
                onClick={() => {
                  onRestore(v.filters);
                  setSaveOpen(false);
                }}
              >
                {v.name}
              </button>
              <button
                aria-label={`Delete ${v.name}`}
                onClick={() => persistViews(views.filter((_, j) => i !== j))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </Modal>
    </>
  );
}
