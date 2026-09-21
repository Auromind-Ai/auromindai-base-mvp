"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import CrmLeadsTable from "./CrmLeadsTable";

export default function CrmFollowUps({ workspaceId, onSelect }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const limit = 50;

  const removeFollowUp = async (lead) => {
    if (removingId || !window.confirm(`Remove ${lead.name || 'this lead'} from follow up? The lead will remain in CRM.`)) return;
    setRemovingId(lead.id);
    setRemoveError('');
    try {
      await api.delete(`/lead-scoring/follow-ups/${lead.id}?workspace_id=${workspaceId}`);
      setData(null);
      if (data?.items.length === 1 && page > 0) setPage(value => value - 1);
      else setRetry(value => value + 1);
    } catch (err) {
      setRemoveError(err.message || 'Unable to remove this follow-up lead. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    // Reset stale results while synchronizing with the server query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError("");
    const timer = setTimeout(() => {
      const filters = encodeURIComponent(
        JSON.stringify({ follow_up: true, search: search.trim() || undefined }),
      );
      api
        .get(
          `/lead-scoring/leads?workspace_id=${workspaceId}&filters=${filters}&limit=${limit}&offset=${page * limit}&sort_by=recent`,
        )
        .then((result) => {
          if (active) setData({
            ...result,
            // The scoring API returns lead_id; table keys and actions use id.
            items: (result.items || []).map(lead => ({ ...lead, id: lead.lead_id || lead.id })),
          });
        })
        .catch((err) => {
          if (active)
            setError(err.message || "Unable to load follow-up leads.");
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [workspaceId, search, page, retry]);

  return (
    <section aria-label="Follow-up leads" className="space-y-3">
      <p className="text-sm text-zinc-400">
        Leads you added to follow up, across all dates.
      </p>
      {error && (
        <p role="alert" className="text-rose-300">
          {error}{" "}
          <button onClick={() => setRetry((value) => value + 1)}>Retry</button>
        </p>
      )}
      <div className="flex flex-col border border-white/10 rounded-2xl overflow-hidden">
        {removeError && <p role="alert" className="p-4 text-sm text-rose-300">{removeError}</p>}
        <CrmLeadsTable
          onRemoveFollowUp={removeFollowUp}
          removingId={removingId}
          title="Follow-up Leads"
          leads={data?.items || []}
          loading={!data && !error}
          totalCount={data?.total || 0}
          offset={page * limit}
          pageSize={limit}
          onPageChange={(offset) => setPage(offset / limit)}
          showSelection={false}
          searchTerm={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          onSelect={onSelect}
        />
      </div>
      {data?.total === 0 && !search && (
        <p className="text-sm text-zinc-400">
          Select leads using “Find and follow up with leads”, then click “Add to
          follow up”.
        </p>
      )}
    </section>
  );
}
