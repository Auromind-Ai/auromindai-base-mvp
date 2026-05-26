'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWorkspaceIdFromToken } from '@/lib/auth';
import api from '@/lib/api';
import { useRealtime } from '@/context/RealtimeContext';

import LeadList from '@/components/leads/LeadList';
import LeadDetail from '@/components/leads/LeadDetail';
import ScoreBreakdown from '@/components/leads/ScoreBreakdown';
import AgentIntelligence from '@/components/leads/AgentIntelligence';
import AddLeadModal from '@/components/leads/AddLeadModal';

export default function LeadsPage() {
  // ── State ──
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');
  const [mobileView, setMobileView] = useState('list'); // list | detail
  const [isMounted, setIsMounted] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const { subscribe } = useRealtime();

  // Refs for race-condition guards
  const fetchStartTimeRef = useRef(0);
  const wsUpdatesRef = useRef(new Map());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Realtime Subscription ──
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.event_type === 'lead.score.updated') {
        const payload = event.payload;
        wsUpdatesRef.current.set(payload.lead_id, Date.now());
        setLeads((currentLeads) => {
          let updated = false;
          const newLeads = currentLeads.map((l) => {
            if (l.lead_id === payload.lead_id) {
              updated = true;
              return { 
                ...l, 
                score: payload.score, 
                behavioral_score: payload.behavioral_score,
                semantic_intent_score: payload.semantic_intent_score,
                lead_tier: payload.lead_tier,
                breakdown: payload.breakdown
              };
            }
            return l;
          });
          
          if (!updated) return currentLeads;
          
          // Re-sort based on current sortBy
          if (sortBy === 'score_desc') {
             return newLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
          } else if (sortBy === 'score_asc') {
             return newLeads.sort((a, b) => (a.score || 0) - (b.score || 0));
          } else if (sortBy === 'recent') {
             return newLeads.sort((a, b) => new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0));
          }
          return newLeads;
        });

        // Also update leadDetail if it's the selected lead
        setLeadDetail((currentDetail) => {
          if (currentDetail && currentDetail.lead_id === payload.lead_id) {
             return {
                ...currentDetail,
                score: payload.score,
                behavioral_score: payload.behavioral_score,
                semantic_intent_score: payload.semantic_intent_score,
                lead_tier: payload.lead_tier,
                breakdown: payload.breakdown
             };
          }
          return currentDetail;
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, sortBy]);

  // ── Fetch lead list ──
  const fetchLeads = useCallback(async () => {
    try {
      const fetchTime = Date.now();
      fetchStartTimeRef.current = fetchTime;
      const workspaceId = getWorkspaceIdFromToken();
      if (!workspaceId) return;

      const params = new URLSearchParams({
        workspace_id: workspaceId,
        sort_by: sortBy,
        limit: '50',
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await api.get(`/lead-scoring/leads?${params}`);
      
      setLeads((currentLeads) => {
        const fetchedItems = data.items || [];
        return fetchedItems.map(fetchedLead => {
          const wsTime = wsUpdatesRef.current.get(fetchedLead.lead_id);
          // If we received a websocket update AFTER this fetch was initiated,
          // preserve the current state (websocket state) to prevent overwriting with stale API data
          if (wsTime && wsTime > fetchTime) {
            const existing = currentLeads.find(l => l.lead_id === fetchedLead.lead_id);
            return existing || fetchedLead;
          }
          return fetchedLead;
        });
      });

      // Sync leadDetail if the selected lead is in the freshly fetched list
      if (selectedLeadId) {
        const freshItem = (data.items || []).find(l => l.lead_id === selectedLeadId);
        if (freshItem) {
          setLeadDetail((prev) =>
            prev
              ? {
                  ...prev,
                  score: freshItem.score,
                  behavioral_score: freshItem.behavioral_score,
                  semantic_intent_score: freshItem.semantic_intent_score,
                  lead_tier: freshItem.lead_tier,
                  breakdown: freshItem.breakdown,
                }
              : prev
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, selectedLeadId]);

  // ── Fetch lead detail ──
  const fetchLeadDetail = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      setDetailLoading(true);
      const workspaceId = getWorkspaceIdFromToken();
      if (!workspaceId) return;

      const data = await api.get(
        `/lead-scoring/leads/${leadId}/detail?workspace_id=${workspaceId}`
      );
      setLeadDetail(data);

      // Sync the leads array with detail data to prevent score divergence
      setLeads((currentLeads) =>
        currentLeads.map((l) =>
          l.lead_id === leadId
            ? {
                ...l,
                score: data.score,
                behavioral_score: data.behavioral_score,
                semantic_intent_score: data.semantic_intent_score,
                lead_tier: data.lead_tier,
                breakdown: data.breakdown,
              }
            : l
        )
      );
    } catch (err) {
      console.error('Failed to fetch lead detail:', err);
      setLeadDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Lead selection ──
  const handleLeadSelect = useCallback(
    (leadId) => {
      setSelectedLeadId(leadId);
      fetchLeadDetail(leadId);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileView('detail');
      }
    },
    [fetchLeadDetail]
  );

  // ── Auto-fetch on mount + filter/sort change ──
  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  // ── Silent Reconciliation every 2 minutes ──
  // Acts as a safety net in case of missed WebSocket events
  useEffect(() => {
    const interval = setInterval(fetchLeads, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // ── Listen to lead conversion event to refresh list immediately ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleConvert = () => {
      fetchLeads();
    };
    window.addEventListener('lead-converted', handleConvert);
    return () => window.removeEventListener('lead-converted', handleConvert);
  }, [fetchLeads]);

  // ── Auto-select first lead when list loads ──
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      handleLeadSelect(leads[0].lead_id);
    }
  }, [leads, selectedLeadId, handleLeadSelect]);

  if (!isMounted) return null;

  // For the right panel — use detail data's breakdown, or fall back to list item's breakdown
  const activeBreakdown =
    leadDetail?.breakdown ||
    leads.find((l) => l.lead_id === selectedLeadId)?.breakdown ||
    null;
  const activeScore =
    leadDetail?.score ??
    leads.find((l) => l.lead_id === selectedLeadId)?.score ??
    0;
  const activeTier =
    leadDetail?.lead_tier ??
    leads.find((l) => l.lead_id === selectedLeadId)?.lead_tier ??
    'cold';

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col bg-[#0a0a0f] text-zinc-200 overflow-hidden">
      {/* ── MAIN 3-PANEL LAYOUT ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL: Lead List ── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} w-full lg:w-auto`}>
          <LeadList
            leads={leads}
            loading={loading}
            selectedLeadId={selectedLeadId}
            onLeadSelect={handleLeadSelect}
            statusFilter={statusFilter}
            onStatusChange={(s) => {
              setStatusFilter(s);
              setSelectedLeadId(null);
              setLeadDetail(null);
            }}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onAddLeadClick={() => setShowAddLead(true)}
          />
        </div>

        {/* ── MIDDLE PANEL: Lead Detail + Chat ── */}
        <div
          className={`flex flex-col flex-1 h-full border-r border-white/5 bg-[#0b0b10]
            ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}
        >
          <LeadDetail
            lead={leadDetail}
            loading={detailLoading}
            onMobileBack={() => setMobileView('list')}
          />
        </div>

        {/* ── RIGHT PANEL: Score Breakdown + Agent Intelligence ── */}
        <aside className="hidden xl:flex w-[320px] flex-col shrink-0 overflow-y-auto custom-scrollbar bg-[#0a0a0f] p-4 gap-4">
          {selectedLeadId ? (
            <>
              <ScoreBreakdown
                breakdown={activeBreakdown}
                score={activeScore}
              />
              <AgentIntelligence score={activeScore} lead_tier={activeTier} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-600 text-center">
                Select a lead to view<br />score breakdown
              </p>
            </div>
          )}
        </aside>
      </main>

      <AddLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSuccess={(newLead) => {
          fetchLeads();
          if (newLead && newLead.lead_id) {
            handleLeadSelect(newLead.lead_id);
          }
        }}
      />
    </div>
  );
}
