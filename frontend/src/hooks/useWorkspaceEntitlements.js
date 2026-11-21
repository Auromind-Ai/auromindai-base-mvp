'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function useWorkspaceEntitlements(overrideWorkspaceId = null) {
  const { workspaceId: authWsId } = useAuth();
  const effectiveWsId = overrideWorkspaceId || authWsId || (typeof window !== 'undefined' ? localStorage.getItem('workspace_id') : null);

  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntitlements = useCallback(async () => {
    if (!effectiveWsId || effectiveWsId === 'null' || effectiveWsId === 'undefined') {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getWorkspaceEntitlements(effectiveWsId);
      setEntitlements(data);
      setError(null);
    } catch (err) {
      console.warn('Failed to load workspace entitlements:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  // Listen for billing / plan / channel updates across the app
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      fetchEntitlements();
    };

    window.addEventListener('entitlements-changed', handleUpdate);
    window.addEventListener('channel-status-changed', handleUpdate);
    window.addEventListener('subscription-updated', handleUpdate);

    return () => {
      window.removeEventListener('entitlements-changed', handleUpdate);
      window.removeEventListener('channel-status-changed', handleUpdate);
      window.removeEventListener('subscription-updated', handleUpdate);
    };
  }, [fetchEntitlements]);

  const planName = useMemo(() => {
    const raw = entitlements?.plan_name || 'free';
    return String(raw).toLowerCase().trim();
  }, [entitlements]);

  const allowedChannels = useMemo(() => {
    const raw = entitlements?.feature_flags?.allowed_channels;
    if (Array.isArray(raw)) {
      return raw.map((c) => String(c).toLowerCase().trim());
    }
    // Default fallback based on planName
    if (planName === 'creator') return ['instagram'];
    if (planName === 'starter') return ['whatsapp'];
    if (planName === 'growth') return ['whatsapp', 'instagram'];
    if (planName === 'business' || planName === 'enterprise') return ['whatsapp', 'instagram', 'twilio'];
    return ['whatsapp'];
  }, [entitlements, planName]);

  const isChannelAllowed = useCallback(
    (channelId) => {
      if (!allowedChannels || allowedChannels.length === 0) return false;
      const target = String(channelId || '').toLowerCase().trim();
      if (allowedChannels.includes('all')) return true;
      return allowedChannels.includes(target);
    },
    [allowedChannels]
  );

  const assistantLimit = useMemo(() => {
    const lim = entitlements?.feature_flags?.assistant_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'creator' || planName === 'starter') return 2;
    if (planName === 'growth') return 3;
    if (planName === 'business') return 6;
    if (planName === 'enterprise') return -1;
    return 1; // free default
  }, [entitlements, planName]);

  const templateLimit = useMemo(() => {
    const lim = entitlements?.feature_flags?.template_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'creator') return 10;
    if (planName === 'starter') return 15;
    if (planName === 'growth') return 50;
    if (planName === 'business' || planName === 'enterprise') return -1;
    return 5; // free default
  }, [entitlements, planName]);

  const leadLimit = useMemo(() => {
    const lim = entitlements?.lead_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'creator') return 1000;
    if (planName === 'starter') return 2500;
    if (planName === 'growth') return 10000;
    if (planName === 'business') return 35000;
    if (planName === 'enterprise') return -1;
    return 50; // free default
  }, [entitlements, planName]);

  const knowledgeBaseLimit = useMemo(() => {
    const lim = entitlements?.knowledge_base_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'growth') return 10;
    if (planName === 'business' || planName === 'enterprise') return -1;
    return 5; // free / creator / starter default
  }, [entitlements, planName]);

  const automationLimit = useMemo(() => {
    const lim = entitlements?.automation_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'creator' || planName === 'starter') return 2;
    if (planName === 'growth') return 5;
    if (planName === 'business') return 10;
    if (planName === 'enterprise') return -1;
    return 2;
  }, [entitlements, planName]);

  const dripLimit = useMemo(() => {
    const lim = entitlements?.feature_flags?.drip_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'growth') return 2;
    if (planName === 'business') return 10;
    if (planName === 'enterprise') return -1;
    return 0;
  }, [entitlements, planName]);

  const broadcastTier = useMemo(() => {
    return entitlements?.feature_flags?.broadcast_tier || (planName === 'free' ? 'none' : 'standard_batch');
  }, [entitlements, planName]);

  const teamLimit = useMemo(() => {
    const lim = entitlements?.team_limit;
    if (lim !== undefined && lim !== null) return Number(lim);
    if (planName === 'creator') return 2;
    if (planName === 'starter') return 3;
    if (planName === 'growth') return 5;
    if (planName === 'business') return 15;
    if (planName === 'enterprise') return -1;
    return 1;
  }, [entitlements, planName]);

  const hasLeadEnrichment = useMemo(() => {
    const raw = entitlements?.feature_flags?.lead_enrichment;
    if (raw !== undefined && raw !== null) return Boolean(raw);
    return ['creator', 'growth', 'business', 'enterprise'].includes(planName);
  }, [entitlements, planName]);

  const hasLeadScoring = useMemo(() => {
    const raw = entitlements?.feature_flags?.lead_scoring;
    if (raw !== undefined && raw !== null) return Boolean(raw);
    return ['business', 'enterprise'].includes(planName);
  }, [entitlements, planName]);

  const monthlyConversations = useMemo(() => {
    const raw = entitlements?.feature_flags?.monthly_conversations;
    if (raw !== undefined && raw !== null) return Number(raw);
    if (planName === 'creator' || planName === 'starter') return 10000;
    if (planName === 'growth') return 100000;
    if (planName === 'business') return 1000000;
    if (planName === 'enterprise') return -1;
    return 1000; // free default
  }, [entitlements, planName]);

  const includedAiCredits = useMemo(() => {
    const raw = entitlements?.included_ai_credits;
    if (raw !== undefined && raw !== null) return Number(raw);
    if (planName === 'creator') return 15000;
    if (planName === 'starter') return 25000;
    if (planName === 'growth') return 100000;
    if (planName === 'business') return 250000;
    if (planName === 'enterprise') return 500000;
    return 50;
  }, [entitlements, planName]);

  const includedWccWallet = useMemo(() => {
    const raw = entitlements?.included_wcc_wallet;
    if (raw !== undefined && raw !== null) return Number(raw);
    if (planName === 'growth') return 500;
    if (planName === 'business') return 1500;
    if (planName === 'enterprise') return 2500;
    return 0;
  }, [entitlements, planName]);

  const monthlyAutomationTriggers = useMemo(() => {
    const raw = entitlements?.automation_limit;
    if (raw !== undefined && raw !== null) return Number(raw);
    if (planName === 'creator' || planName === 'starter') return 1000;
    if (planName === 'growth') return 5000;
    if (planName === 'business') return 10000;
    if (planName === 'enterprise') return -1;
    return 20;
  }, [entitlements, planName]);

  const crmPipelineTier = useMemo(() => {
    const raw = entitlements?.feature_flags?.crm_pipeline_tier;
    if (raw) return String(raw);
    if (planName === 'creator') return 'contact_list';
    if (planName === 'starter') return 'single_stage_board';
    if (planName === 'growth') return 'advance_filtration';
    if (planName === 'business') return 'lead_scoring';
    if (planName === 'enterprise') return 'custom_stages';
    return 'basic_viewer';
  }, [entitlements, planName]);

  const hasCrmBoard = useMemo(() => {
    return ['starter', 'growth', 'business', 'enterprise'].includes(planName);
  }, [planName]);

  const hasAdvanceCrm = useMemo(() => {
    return ['growth', 'business', 'enterprise'].includes(planName);
  }, [planName]);

  const flowLimit = useMemo(() => {
    const raw = entitlements?.flow;
    if (raw !== undefined && raw !== null) return Number(raw);
    if (planName === 'creator') return 100;
    if (planName === 'starter') return 500;
    if (planName === 'growth') return 2000;
    if (planName === 'business') return 10000;
    if (planName === 'enterprise') return -1;
    return 2;
  }, [entitlements, planName]);

  return {
    entitlements,
    planName,
    allowedChannels,
    isChannelAllowed,
    assistantLimit,
    templateLimit,
    leadLimit,
    hasLeadEnrichment,
    hasLeadScoring,
    monthlyConversations,
    includedAiCredits,
    includedWccWallet,
    monthlyAutomationTriggers,
    crmPipelineTier,
    hasCrmBoard,
    hasAdvanceCrm,
    flowLimit,
    knowledgeBaseLimit,
    automationLimit,
    dripLimit,
    broadcastTier,
    teamLimit,
    loading,
    error,
    refetch: fetchEntitlements,
  };
}
