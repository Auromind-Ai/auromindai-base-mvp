'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  Users,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Download,
  Filter,
  X,
  FileText,
  HelpCircle,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import CampaignStatusBadge from './CampaignStatusBadge';
import { getCampaignById, getCampaignRecipients } from '@/lib/api/marketing';
import { classifyMetaError, META_ERROR_CATALOG } from '@/lib/campaignErrorUtils';
import { useToast } from '@/context/ToastContext';

// Authentic WhatsApp SVG Icon Component
function WhatsAppLogo({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.9 11.9 0 0 0 5.86 1.52h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.21-3.52-8.44zm-8.46 17.86h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.92 9.92 0 0 1-1.52-5.23c0-5.48 4.46-9.94 9.94-9.94 2.65 0 5.15 1.03 7.02 2.9 1.88 1.88 2.91 4.37 2.91 7.03 0 5.48-4.46 9.95-9.95 9.95zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.52.07-.79.37-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z" />
    </svg>
  );
}

const ITEMS_PER_PAGE = 25;

export default function CampaignDetailsView({ campaignId }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [campaign, setCampaign] = useState(null);
  const [recipientsData, setRecipientsData] = useState([]);
  const [counts, setCounts] = useState({ total: 0, sent: 0, delivered: 0, failed: 0 });
  const [errorBreakdown, setErrorBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Navigation states
  const [activeTab, setActiveTab] = useState('sent'); // 'sent' | 'delivered' | 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErrorCode, setSelectedErrorCode] = useState('all'); // for Failed tab
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Server-side paginated recipients state
  const [serverItems, setServerItems] = useState([]);
  const [serverTotal, setServerTotal] = useState(null);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Selected recipient for side drawer modal
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  // Copy helper
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // Reset state on campaign switch to ensure 100% data isolation
  useEffect(() => {
    setCampaign(null);
    setRecipientsData([]);
    setServerItems([]);
    setServerTotal(null);
    setCounts({ total: 0, sent: 0, delivered: 0, failed: 0 });
    setErrorBreakdown([]);
    setSelectedErrorCode('all');
    setCurrentPage(1);
    setIsLoading(true);
  }, [campaignId]);

  // Initial data fetch effect
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const camp = await getCampaignById(campaignId);
        if (!isMounted) return;
        if (!camp) {
          showToast('Campaign not found', 'error');
          router.push('/user/admin/marketing');
          return;
        }
        setCampaign(camp);

        if (Array.isArray(camp.recipients) && camp.recipients.length > 0) {
          // Enriched full recipients strictly for this campaign
          const enriched = camp.recipients.map((r) => {
            if (r.error_code || r.status === 'failed' || r.status === 'skipped_marketing_frequency_limit') {
              const cls = classifyMetaError(r.error_code || (r.status === 'skipped_marketing_frequency_limit' ? '131049' : '131026'), r.error_message);
              return {
                ...r,
                error_title: r.error_title || cls.title,
                error_category: r.error_category || cls.category,
                what_this_means: r.what_this_means || cls.whatThisMeans,
                what_you_can_do: r.what_you_can_do || cls.whatYouCanDo,
              };
            }
            return r;
          });
          setRecipientsData(enriched);
        } else {
          setRecipientsData([]);
        }

        if (camp.error_breakdown && camp.error_breakdown.length > 0) {
          setErrorBreakdown(camp.error_breakdown);
        }
      } catch (err) {
        console.error('Failed to load campaign details:', err);
        if (isMounted) showToast('Error loading campaign data', 'error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [campaignId, router, showToast]);

  // Reactive fetch for current active tab, error category filter, search query, and page
  useEffect(() => {
    let isCancelled = false;
    const fetchTabRecipients = async () => {
      setIsTableLoading(true);
      try {
        const resp = await getCampaignRecipients(campaignId, {
          status: activeTab,
          errorCode: selectedErrorCode !== 'all' ? selectedErrorCode : '',
          search: searchQuery,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        if (isCancelled) return;
        if (resp && Array.isArray(resp.items)) {
          const enriched = resp.items.map((r) => {
            const st = (r.status || '').toLowerCase();
            const isFailed = st === 'failed' || st.includes('skipped') || Boolean(r.error_code);
            if (isFailed) {
              const code = r.error_code || (st === 'skipped_marketing_frequency_limit' ? '131049' : '131026');
              const cls = classifyMetaError(code, r.error_message);
              return {
                ...r,
                error_title: r.error_title || cls.title,
                error_category: r.error_category || cls.category,
                what_this_means: r.what_this_means || cls.whatThisMeans,
                what_you_can_do: r.what_you_can_do || cls.whatYouCanDo,
              };
            }
            return r;
          });
          setServerItems(enriched);
          setServerTotal(typeof resp.total === 'number' ? resp.total : resp.items.length);
          if (resp.counts) {
            setCounts(resp.counts);
          }
          if (resp.error_breakdown && resp.error_breakdown.length > 0) {
            setErrorBreakdown(resp.error_breakdown);
          }
        }
      } catch (err) {
        console.warn('fetchTabRecipients notice:', err);
      } finally {
        if (!isCancelled) setIsTableLoading(false);
      }
    };

    fetchTabRecipients();
    return () => {
      isCancelled = true;
    };
  }, [campaignId, activeTab, selectedErrorCode, searchQuery, currentPage]);

  // Dynamic Metrics & Percentages strictly computed for this specific campaign
  const stats = useMemo(() => {
    const totalRecipients = 
      campaign?.recipientsCount !== undefined && campaign?.recipientsCount !== null
        ? Number(campaign.recipientsCount)
        : (campaign?.total_recipients !== undefined && campaign?.total_recipients !== null
            ? Number(campaign.total_recipients)
            : (counts?.total ?? (recipientsData?.length || 0)));

    const sentCount = 
      campaign?.sentCount !== undefined && campaign?.sentCount !== null
        ? Number(campaign.sentCount)
        : (campaign?.sent_count !== undefined && campaign?.sent_count !== null
            ? Number(campaign.sent_count)
            : (counts?.sent ?? 0));

    const deliveredCount = 
      campaign?.deliveredCount !== undefined && campaign?.deliveredCount !== null
        ? Number(campaign.deliveredCount)
        : (campaign?.delivered_count !== undefined && campaign?.delivered_count !== null
            ? Number(campaign.delivered_count)
            : (counts?.delivered ?? 0));

    const failedCount = 
      campaign?.failedCount !== undefined && campaign?.failedCount !== null
        ? Number(campaign.failedCount)
        : (campaign?.failed_count !== undefined && campaign?.failed_count !== null
            ? Number(campaign.failed_count)
            : (counts?.failed ?? 0));

    const sentPct = totalRecipients > 0 ? ((sentCount / totalRecipients) * 100).toFixed(1) : '0.0';
    const deliveredPct = sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : '0.0';
    const failedPct = sentCount > 0 ? ((failedCount / sentCount) * 100).toFixed(1) : '0.0';

    return {
      total: totalRecipients,
      sent: sentCount,
      delivered: deliveredCount,
      failed: failedCount,
      sentPct: sentPct === '100.0' ? '100%' : `${sentPct}%`,
      deliveredPct: `${deliveredPct}%`,
      failedPct: `${failedPct}%`,
    };
  }, [campaign, counts, recipientsData]);

  // Aggregate Error Breakdown for Failed Tab pills
  const computedErrorBreakdown = useMemo(() => {
    if (errorBreakdown && errorBreakdown.length > 0) {
      return errorBreakdown;
    }
    const map = {};
    recipientsData.forEach((r) => {
      const st = (r.status || '').toLowerCase();
      const isFailed = st === 'failed' || st === 'skipped_marketing_frequency_limit' || st === 'skipped_invalid' || st === 'skipped_opted_out' || Boolean(r.error_code);
      if (isFailed) {
        const code = r.error_code || (st === 'skipped_marketing_frequency_limit' ? '131049' : (st === 'skipped_invalid' ? 'SKIPPED_INVALID' : '131026'));
        if (!map[code]) {
          const cls = classifyMetaError(code, r.error_message);
          map[code] = {
            error_code: code,
            error_title: cls.title,
            error_category: cls.category,
            count: 0,
          };
        }
        map[code].count += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [errorBreakdown, recipientsData]);

  // Filter recipients based on active tab, search query, and selected error code
  const filteredRecipients = useMemo(() => {
    return recipientsData.filter((r) => {
      const st = (r.status || '').toLowerCase();
      const isSent = st === 'sent' || st === 'accepted' || st === 'delivered' || st === 'read' || Boolean(r.sent_at || r.wamid);
      const isDelivered = st === 'delivered' || st === 'read' || Boolean(r.delivered_at);
      const isFailed = st === 'failed' || st === 'skipped_marketing_frequency_limit' || st === 'skipped_invalid' || st === 'skipped_opted_out' || Boolean(r.error_code);

      // Tab matching
      if (activeTab === 'sent') {
        if (!isSent) return false;
      } else if (activeTab === 'delivered') {
        if (!isDelivered) return false;
      } else if (activeTab === 'failed') {
        if (!isFailed) return false;
        // Error code sub-filter
        if (selectedErrorCode !== 'all') {
          const code = String(r.error_code || (st === 'skipped_marketing_frequency_limit' ? '131049' : '')).toUpperCase();
          if (code !== selectedErrorCode.toUpperCase()) return false;
        }
      }

      // Search query matching (phone or name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPhone = (r.phone_number || r.phone || r.normalized_phone || '').toLowerCase().includes(q);
        const matchName = (r.recipient_name || r.name || '').toLowerCase().includes(q);
        const matchWamid = (r.wamid || '').toLowerCase().includes(q);
        const matchError = (r.error_title || r.error_code || '').toLowerCase().includes(q);
        if (!matchPhone && !matchName && !matchWamid && !matchError) return false;
      }

      return true;
    });
  }, [recipientsData, activeTab, selectedErrorCode, searchQuery]);

  // Pagination calculations
  const totalDisplayCount = serverTotal !== null ? serverTotal : filteredRecipients.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayCount / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecipients = useMemo(() => {
    if (serverItems.length > 0) {
      return serverItems;
    }
    if (isTableLoading) {
      return [];
    }
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredRecipients.slice(start, start + ITEMS_PER_PAGE);
  }, [serverItems, isTableLoading, filteredRecipients, safePage]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (filteredRecipients.length === 0) {
      showToast('No recipients to export', 'warning');
      return;
    }
    const headers = ['Phone Number', 'Name', 'Status', 'Sent At', 'Delivered At', 'Error Code', 'Error Reason', 'Message ID'];
    const rows = filteredRecipients.map((r) => [
      `"${r.phone_number || r.phone || ''}"`,
      `"${r.recipient_name || r.name || ''}"`,
      `"${r.status || ''}"`,
      `"${r.sent_at || ''}"`,
      `"${r.delivered_at || ''}"`,
      `"${r.error_code || ''}"`,
      `"${r.error_title || r.error_message || ''}"`,
      `"${r.wamid || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaign?.name || 'campaign'}_${activeTab}_recipients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredRecipients.length} recipients to CSV`, 'success');
  };

  // Format date helper
  const formatDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' • ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateVal);
    }
  };

  const formatTimeOnly = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateVal);
    }
  };

  if (isLoading && !campaign) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3">
        <RefreshCw size={26} className="animate-spin text-[#814AC8]" />
        <span className="text-sm font-medium text-white/80">Loading campaign details...</span>
      </div>
    );
  }

  const campaignDateFormatted = formatDateTime(campaign?.created_at || campaign?.createdAt);

  return (
    <div className="w-full min-h-screen bg-[#05080e] text-white flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* 1. Header with Back Button, Campaign Title, Status Badge & Actions */}
      <div className="flex flex-col gap-4">
        {/* Back Link */}
        <Link
          href="/user/admin/marketing"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#814AC8] hover:text-[#9d62eb] transition-colors w-fit group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Campaigns</span>
        </Link>

        {/* Campaign Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-[#25D366] drop-shadow-[0_0_12px_rgba(37,211,102,0.4)] shrink-0">
                <WhatsAppLogo size={28} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {campaign?.name || 'Campaign Details'}
              </h1>
              <CampaignStatusBadge status={campaign?.status || 'completed'} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#7e889b] mt-1.5 font-medium">
              <span className="text-white/80">
                {campaign?.goal || campaign?.subtitle || campaign?.type || 'General Announcements'}
              </span>
              <span>•</span>
              <span>{campaignDateFormatted}</span>
              <span>•</span>
              <span className="text-white/60">
                {campaign?.audienceListName || 'All Contacts'} ({stats.total.toLocaleString()} recipients)
              </span>
            </div>
          </div>

          {/* Action buttons on top right */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#cbd5e1] bg-[#0d0f18] border border-[#1e2436] hover:bg-[#141826] hover:text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download size={13} className="text-white/60" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Cards (4 Cards matching prompt UX specification) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Messages */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b111b] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5E5CE6] shadow-[0_0_20px_rgba(94,92,230,0.4)] flex items-center justify-center text-white shrink-0">
            <Users size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Total Messages
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.total.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Campaign recipient pool
            </div>
          </div>
        </div>

        {/* Card 2: Sent (Meta Accepted) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b111b] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1E4BB8] shadow-[0_0_20px_rgba(30,75,184,0.4)] flex items-center justify-center text-white shrink-0">
            <Send size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60 flex items-center gap-1.5">
              <span>Sent</span>
              <span className="text-[10px] text-[#818cf8] font-normal" title="Meta accepted the message submission">
                (Meta accepted)
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.sent.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#06263b]/80 via-[#031824]/60 to-[#02080c] border border-white/10 text-white text-[11px] font-medium">
                {stats.sentPct}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Dispatched to WhatsApp API
            </div>
          </div>
        </div>

        {/* Card 3: Delivered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b111b] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0E845A] shadow-[0_0_20px_rgba(14,132,90,0.4)] flex items-center justify-center text-white shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Delivered
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.delivered.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-white/10 text-white text-[11px] font-medium">
                {stats.deliveredPct}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Confirmed delivered to phone
            </div>
          </div>
        </div>

        {/* Card 4: Failed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b111b] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#8a1c2a] shadow-[0_0_20px_rgba(138,28,42,0.4)] flex items-center justify-center text-white shrink-0">
            <XCircle size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Failed
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.failed.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] border border-white/10 text-white text-[11px] font-medium">
                {stats.failedPct}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Undelivered / Restricted
            </div>
          </div>
        </div>
      </div>

      {/* 3. Three Clean UX Tabs: Sent | Delivered | Failed */}
      <div className="flex flex-col space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#161a28] pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {[
              { id: 'sent', label: 'Sent', count: stats.sent, color: 'text-blue-400' },
              { id: 'delivered', label: 'Delivered', count: stats.delivered, color: 'text-emerald-400' },
              { id: 'failed', label: 'Failed', count: stats.failed, color: 'text-rose-400' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                    setSelectedErrorCode('all');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 relative cursor-pointer ${
                    isActive
                      ? 'text-white bg-[#15192c] border border-[#262f4d] shadow-sm'
                      : 'text-[#6b768c] hover:text-[#cbd5e1] hover:bg-[#0b0e18]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive ? 'bg-[#222944] text-white' : 'bg-[#121624] text-white/60'
                  }`}>
                    {tab.count.toLocaleString()}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#814AC8] rounded-full shadow-[0_0_8px_#814AC8]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#586174]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search phone number or name..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0b111b] border border-[#161a28] text-xs text-white placeholder-[#586174] outline-none focus:border-[#814AC8] transition-all"
            />
          </div>
        </div>

        {/* 4. Failed Tab Grouping Pills (Human-friendly reasons without raw code numbers) */}
        {activeTab === 'failed' && (
          <div className="space-y-3 p-4 rounded-2xl bg-[#0f0c18] border border-[#2c1d42]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#a78bfa]" />
                <span className="text-xs font-semibold text-white tracking-wide uppercase">
                  Failure Reasons
                </span>
                <span className="text-xs text-white/60">
                  ({stats.failed.toLocaleString()} undelivered messages)
                </span>
              </div>
              <span className="text-[11px] text-[#a78bfa]">
                Click a reason to filter recipients
              </span>
            </div>

            {/* Error Category Pills (User friendly: no raw code numbers like 131026) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedErrorCode('all');
                  setCurrentPage(1);
                  setServerItems([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedErrorCode === 'all'
                    ? 'bg-[#814AC8] text-white shadow-[0_0_12px_rgba(129,74,200,0.4)]'
                    : 'bg-[#151326] border border-[#2a2347] text-white/70 hover:text-white hover:border-[#814AC8]'
                }`}
              >
                <span>All Failed</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                  selectedErrorCode === 'all' ? 'bg-white/20 text-white' : 'bg-[#251f3e] text-white/80'
                }`}>
                  {stats.failed.toLocaleString()}
                </span>
              </button>

              {computedErrorBreakdown.map((item) => {
                const isSelected = selectedErrorCode.toUpperCase() === item.error_code.toUpperCase();
                return (
                  <button
                    key={item.error_code}
                    type="button"
                    onClick={() => {
                      setSelectedErrorCode(isSelected ? 'all' : item.error_code);
                      setCurrentPage(1);
                      setServerItems([]);
                    }}
                    title={`Meta Error Code: ${item.error_code}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#814AC8] text-white shadow-[0_0_12px_rgba(129,74,200,0.4)]'
                        : 'bg-[#151326] border border-[#2a2347] text-white/80 hover:text-white hover:border-[#814AC8]'
                    }`}
                  >
                    <span>{item.error_title}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#251f3e] text-white/80'
                    }`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Main Recipient Data Table */}
      <div className="rounded-2xl border border-[#161a28] bg-[#0b111b] overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0e18] border-b border-[#161a28] text-white text-[13px] font-normal">
              <tr>
                <th className="px-5 py-3.5 font-normal text-white">Phone Number / Contact</th>
                <th className="px-5 py-3.5 font-normal text-white">Status</th>
                {activeTab === 'sent' && (
                  <>
                    <th className="px-5 py-3.5 font-normal text-white">Sent At</th>
                    <th className="px-5 py-3.5 font-normal text-white">Message ID</th>
                  </>
                )}
                {activeTab === 'delivered' && (
                  <>
                    <th className="px-5 py-3.5 font-normal text-white">Delivered At</th>
                    <th className="px-5 py-3.5 font-normal text-white">Message ID</th>
                  </>
                )}
                {activeTab === 'failed' && (
                  <>
                    <th className="px-5 py-3.5 font-normal text-white">Reason & Explanation</th>
                    <th className="px-5 py-3.5 font-normal text-white">Message ID</th>
                    <th className="px-5 py-3.5 font-normal text-white">Failed At</th>
                  </>
                )}
                <th className="px-5 py-3.5 text-right font-normal text-white">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131624]">
              {isTableLoading && paginatedRecipients.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`loading-${idx}`} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 bg-[#1a2035] rounded w-36 mb-1.5" />
                      <div className="h-3 bg-[#13182a] rounded w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-[#1a2035] rounded-full w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-[#1a2035] rounded w-28" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-[#1a2035] rounded w-48 mb-1" />
                      <div className="h-3 bg-[#13182a] rounded w-32" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-6 bg-[#1a2035] rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-sm font-medium text-white">No recipients found</span>
                      <p className="text-xs text-white/50">
                        {searchQuery ? `No results matching "${searchQuery}"` : `No recipients currently in ${activeTab} status`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecipients.map((rec, idx) => {
                  const isDelivered = (rec.status || '').toLowerCase() === 'delivered' || (rec.status || '').toLowerCase() === 'read';
                  const isFailed = (rec.status || '').toLowerCase() === 'failed' || (rec.status || '').toLowerCase().includes('skipped') || Boolean(rec.error_code);
                  const cls = classifyMetaError(rec.error_code || (rec.status === 'skipped_marketing_frequency_limit' ? '131049' : '131026'), rec.error_message);

                  return (
                    <tr
                      key={rec.id || `rec-${idx}`}
                      onClick={() => setSelectedRecipient(rec)}
                      className="hover:bg-[#101424] transition-colors cursor-pointer group"
                    >
                      {/* Phone Number & Contact Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white tracking-tight text-[13px] group-hover:text-[#a78bfa] transition-colors">
                          {rec.phone_number || rec.phone || rec.normalized_phone || '—'}
                        </div>
                        {rec.recipient_name && rec.recipient_name !== rec.phone_number && (
                          <div className="text-[11px] text-white/60 mt-0.5">
                            {rec.recipient_name}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {activeTab === 'sent' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#132240] border border-[#1e3a8a] text-[#60a5fa] text-[11px] font-semibold">
                            <Send size={11} />
                            <span>✓ Sent</span>
                          </span>
                        )}
                        {activeTab === 'delivered' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d281e] border border-[#155e3c] text-[#22c55e] text-[11px] font-semibold">
                            <CheckCircle2 size={11} />
                            <span>✓ Delivered</span>
                          </span>
                        )}
                        {activeTab === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a0e14] border border-[#7f1d1d] text-[#f87171] text-[11px] font-semibold">
                            <XCircle size={11} />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      {/* Sent Tab Specific Columns */}
                      {activeTab === 'sent' && (
                        <>
                          <td className="px-5 py-3.5 text-xs text-[#cbd5e1] whitespace-nowrap">
                            {formatTimeOnly(rec.sent_at || rec.accepted_at || rec.created_at || campaign?.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-white/60">
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <span className="truncate">{rec.wamid || 'wamid...'}</span>
                              {rec.wamid && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(rec.wamid, rec.id);
                                  }}
                                  className="text-white/40 hover:text-white p-1 rounded transition-colors"
                                  title="Copy message ID"
                                >
                                  {copiedId === rec.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Delivered Tab Specific Columns */}
                      {activeTab === 'delivered' && (
                        <>
                          <td className="px-5 py-3.5 text-xs text-[#cbd5e1] whitespace-nowrap">
                            <div className="font-medium text-emerald-400">✓ Delivered</div>
                            <div className="text-[11px] text-white/50 mt-0.5">
                              {formatDateTime(rec.delivered_at || rec.sent_at || campaign?.created_at)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-white/60">
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <span className="truncate">{rec.wamid || 'wamid...'}</span>
                              {rec.wamid && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(rec.wamid, rec.id);
                                  }}
                                  className="text-white/40 hover:text-white p-1 rounded transition-colors"
                                  title="Copy message ID"
                                >
                                  {copiedId === rec.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Failed Tab Specific Columns */}
                      {activeTab === 'failed' && (
                        <>
                          <td className="px-5 py-3.5 max-w-[340px]">
                            <div className="font-medium text-white text-xs tracking-tight line-clamp-1">
                              {rec.error_title || cls.title}
                            </div>
                            <div className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                              {rec.what_this_means || cls.whatThisMeans}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-white/60">
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <span className="truncate">{rec.wamid || 'wamid...'}</span>
                              {rec.wamid && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(rec.wamid, rec.id);
                                  }}
                                  className="text-white/40 hover:text-white p-1 rounded transition-colors"
                                  title="Copy message ID"
                                >
                                  {copiedId === rec.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-[#cbd5e1] whitespace-nowrap">
                            {formatTimeOnly(rec.failed_at || rec.sent_at || campaign?.created_at)}
                          </td>
                        </>
                      )}

                      {/* View Action Button */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecipient(rec);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#a78bfa] bg-[#1a172c] hover:bg-[#814AC8] hover:text-white transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{activeTab === 'failed' ? 'View Reason' : 'View'}</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="px-5 py-3.5 bg-[#0b0e18] border-t border-[#161a28] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <span>
            Showing {totalDisplayCount === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(safePage * ITEMS_PER_PAGE, totalDisplayCount)} of {totalDisplayCount.toLocaleString()} recipients
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && safePage > 3) {
                  pageNum = safePage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      safePage === pageNum
                        ? 'bg-[#814AC8] text-white shadow-sm'
                        : 'bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 6. Recipient Details Side Drawer / Modal (Requirements 6 & 7) */}
      {selectedRecipient && (() => {
        const rec = selectedRecipient;
        const st = (rec.status || '').toLowerCase();
        const isFailed = st === 'failed' || st.includes('skipped') || Boolean(rec.error_code);
        const isDelivered = st === 'delivered' || st === 'read';
        const cls = classifyMetaError(rec.error_code || (st === 'skipped_marketing_frequency_limit' ? '131049' : '131026'), rec.error_message);

        return (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setSelectedRecipient(null)}
          >
            <div
              className="bg-[#0e1220] border border-[#252c48] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#121629] border-b border-[#202740] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isFailed ? (
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-white flex items-center justify-center shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                  ) : isDelivered ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-white flex items-center justify-center shrink-0">
                      <Send size={18} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {isFailed ? 'Message Failed' : (isDelivered ? 'Message Delivered' : 'Message Sent')}
                    </h3>
                    <p className="text-xs text-white/50">
                      Delivery details for this recipient
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-[#1d2238] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Recipient Profile Bar */}
                <div className="p-4 rounded-xl bg-[#090b14] border border-[#1b2138] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {rec.phone_number || rec.phone || rec.normalized_phone}
                    </div>
                    {rec.recipient_name && (
                      <div className="text-xs text-white/60 mt-0.5">
                        {rec.recipient_name}
                      </div>
                    )}
                  </div>
                  <div>
                    {isFailed ? (
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] border border-rose-500/30 text-white text-xs font-semibold">
                        Failed
                      </span>
                    ) : isDelivered ? (
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-emerald-500/30 text-white text-xs font-semibold">
                        ✓ Delivered
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#06263b]/80 via-[#031824]/60 to-[#02080c] border border-blue-500/30 text-white text-xs font-semibold">
                        ✓ Sent
                      </span>
                    )}
                  </div>
                </div>

                {/* If Failed: Structured Meta Error Details (Requirement 6 & 7) */}
                {isFailed && (
                  <div className="space-y-4">
                    {/* Reason */}
                    <div className="p-4 rounded-xl bg-[#191424] border border-[#3d2959]">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a78bfa]">
                        Failure Reason
                      </div>
                      <div className="text-sm font-semibold text-white mt-1">
                        {rec.error_title || cls.title}
                      </div>
                    </div>

                    {/* What this means */}
                    <div className="p-4 rounded-xl bg-[#090b14] border border-[#1b2138] space-y-1.5">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Info size={14} className="text-[#814AC8]" />
                        <span>What this means</span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">
                        {rec.what_this_means || cls.whatThisMeans}
                      </p>
                    </div>

                    {/* What you can do */}
                    <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e3459] space-y-1.5">
                      <div className="text-xs font-semibold text-[#60a5fa] flex items-center gap-1.5">
                        <Zap size={14} className="text-[#60a5fa]" />
                        <span>What you can do</span>
                      </div>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        {rec.what_you_can_do || cls.whatYouCanDo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamps & Message ID */}
                <div className="p-4 rounded-xl bg-[#090b14] border border-[#1b2138] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-white/70">
                    <span>Sent At:</span>
                    <span className="font-medium text-white">
                      {formatDateTime(rec.sent_at || rec.accepted_at || campaign?.created_at)}
                    </span>
                  </div>

                  {rec.delivered_at && (
                    <div className="flex items-center justify-between text-white/70">
                      <span>Delivered At:</span>
                      <span className="font-medium text-emerald-400">
                        {formatDateTime(rec.delivered_at)}
                      </span>
                    </div>
                  )}

                  {rec.failed_at && (
                    <div className="flex items-center justify-between text-white/70">
                      <span>Failed At:</span>
                      <span className="font-medium text-rose-400">
                        {formatDateTime(rec.failed_at)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white/60">Message ID:</span>
                    <div className="flex items-center gap-1 text-[11px] text-[#cbd5e1]">
                      <span className="truncate max-w-[200px]">{rec.wamid || 'wamid...'}</span>
                      {rec.wamid && (
                        <button
                          type="button"
                          onClick={() => handleCopy(rec.wamid, 'modal-wamid')}
                          className="p-1 rounded text-white/40 hover:text-white transition-colors"
                          title="Copy ID"
                        >
                          {copiedId === 'modal-wamid' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message Body Preview */}
                {(campaign?.messageBody || campaign?.message_content) && (
                  <div className="p-4 rounded-xl bg-[#090b14] border border-[#1b2138] space-y-1.5">
                    <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                      Message Content
                    </div>
                    <div className="text-xs text-[#cbd5e1] whitespace-pre-wrap bg-[#05080e] p-3 rounded-lg border border-[#161a28] font-sans">
                      {campaign?.messageBody || campaign?.message_content}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-[#121629] border-t border-[#202740] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#723db5] transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}