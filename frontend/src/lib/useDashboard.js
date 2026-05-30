'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';



const DEFAULT_METRICS = [
  { label: 'Total Revenue',    value: '—', raw_value: 0, change: '—', trend: 'neutral', subtext: 'loading…', gradient: 'from-blue-500 via-cyan-400 to-emerald-400' },
  { label: 'Active Leads',     value: '—', raw_value: 0, change: '—', trend: 'neutral', subtext: 'loading…', gradient: 'from-yellow-400 via-amber-400 to-orange-500' },
  { label: 'Conversion Rate',  value: '—', raw_value: 0, change: '—', trend: 'neutral', subtext: 'loading…', gradient: 'from-purple-500 via-fuchsia-500 to-indigo-500' },
  { label: 'Avg. Response Time', value: '—', raw_value: 0, change: '—', trend: 'neutral', subtext: 'loading…', gradient: 'from-orange-600 via-red-500 to-rose-600' },
];

const DEFAULT_REVENUE = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  current_year: new Date().getFullYear(),
  prior_year: new Date().getFullYear() - 1,
  current_data: [0, 0, 0, 0, 0],
  prior_data:   [0, 0, 0, 0, 0],
};

const DEFAULT_ACTIVITIES = [];
const DEFAULT_INSIGHTS   = [];

// ── Hook ─────────

/**
 * @param {Object} options
 * @param {number} [options.refreshInterval=0]  Auto-refresh interval in ms. 0 = disabled.
 * @param {string} [options.workspaceId]        Override workspace ID (defaults to JWT)
 */
export function useDashboard({ refreshInterval = 0, workspaceId, startDate, endDate } = {}) {
  const [metrics,    setMetrics]    = useState(DEFAULT_METRICS);
  const [revenue,    setRevenue]    = useState(DEFAULT_REVENUE);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [insights,   setInsights]   = useState(DEFAULT_INSIGHTS);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Guard against duplicate concurrent fetches
  const isFetchingRef = useRef(false);
  // Cleanup ref for interval
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;

    const wid = workspaceId || getWorkspaceIdFromToken();
    if (!wid) {
      setError('No workspace found. Please log in again.');
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await api.getDashboardOverview(wid, startDate, endDate);

      // Safely apply data — backend service always returns non-null arrays
      if (data.metrics    && Array.isArray(data.metrics))    setMetrics(data.metrics);
      if (data.revenue)                                       setRevenue(data.revenue);
      if (data.activities && Array.isArray(data.activities)) setActivities(data.activities);
      if (data.insights   && Array.isArray(data.insights))   setInsights(data.insights);

      setLastFetched(new Date());
    } catch (err) {
      const msg = err?.message || 'Failed to load dashboard data';
      console.error('[useDashboard] fetch error:', err);
      setError(msg);
      // Don't clear existing data on error — show stale data with error banner
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [workspaceId, startDate, endDate]);

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, startDate, endDate]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      fetchDashboard(true); // silent = true (don't show loading spinner)
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDashboard, refreshInterval]);

  /**
   * refetch() — call this to manually trigger a fresh fetch.
   * Example: pull-to-refresh button, page visibility change, etc.
   */
  const refetch = useCallback(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  return {
    metrics,
    revenue,
    activities,
    insights,
    loading,
    error,
    lastFetched,
    refetch,
  };
}

export default useDashboard;
