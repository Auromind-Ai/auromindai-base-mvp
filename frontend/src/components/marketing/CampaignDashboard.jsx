'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  MoreHorizontal,
  Send,
  CheckCircle2,
  MessageSquare,
  Users,
  FileText,
  Trash2,
  Copy,
  Pause,
  Play,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  Check,
  Minus,
  Clock
} from 'lucide-react';
import CampaignStatusBadge from './CampaignStatusBadge';
import CreateCampaignModal from './CreateCampaignModal';
import { getCampaigns, deleteCampaign, updateCampaign, pauseCampaign, resumeCampaign, duplicateCampaign } from '@/lib/api/marketing';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

// Premium Custom Checkbox Component
function PremiumCheckbox({ checked, indeterminate = false, onChange, ariaLabel = 'Select' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all duration-150 cursor-pointer select-none shrink-0 ${
        checked || indeterminate
          ? 'bg-[#814AC8] border border-[#a78bfa] shadow-[0_0_10px_rgba(129,74,200,0.55)] scale-100'
          : 'bg-[#0d101c] border border-[#22293e] hover:border-[#814AC8] hover:bg-[#141829]'
      } active:scale-90`}
    >
      {checked && !indeterminate && (
        <Check size={12} strokeWidth={3} className="text-white drop-shadow-sm" />
      )}
      {indeterminate && (
        <Minus size={12} strokeWidth={3} className="text-white drop-shadow-sm" />
      )}
    </button>
  );
}

// Authentic WhatsApp SVG Icon Component
function WhatsAppLogo({ className = 'w-6 h-6', size = 24 }) {
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

const TABS = [
  { id: 'all', label: 'All Campaigns' },
  { id: 'draft', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'sending', label: 'Sending' },
  { id: 'completed', label: 'Completed' },
  { id: 'paused', label: 'Paused' },
  { id: 'failed', label: 'Failed' },
];

const ITEMS_PER_PAGE = 7;

export default function CampaignDashboard({ activeSubmenu = 'Bulk Messages', workspaceId: propWorkspaceId }) {
  const { workspaceId: authWsId } = useAuth();
  const workspaceId = propWorkspaceId || authWsId;

  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [dateFilter, setDateFilter] = useState('All time');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();

  const dateDropdownRef = useRef(null);

  // Close dropdowns & action menus on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setIsDateDropdownOpen(false);
      }
      if (!event.target.closest('[data-action-menu-cell]')) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCampaigns(workspaceId);
      if (data && Array.isArray(data)) {
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getCampaigns(workspaceId);
        if (isMounted && data && Array.isArray(data)) {
          setCampaigns(data);
        }
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  // Tab counts dynamically computed from DB campaigns
  const tabCounts = useMemo(() => {
    const counts = {
      all: campaigns.length,
      draft: 0,
      scheduled: 0,
      sending: 0,
      completed: 0,
      paused: 0,
      failed: 0,
    };
    campaigns.forEach((c) => {
      const st = (c.status || '').toLowerCase();
      if (st === 'draft' || st === 'pending') counts.draft++;
      else if (st === 'scheduled') counts.scheduled++;
      else if (st === 'sending' || st === 'in_progress') counts.sending++;
      else if (st === 'completed') counts.completed++;
      else if (st === 'paused') counts.paused++;
      else if (st === 'failed' || st === 'cancelled') counts.failed++;
    });
    return counts;
  }, [campaigns]);

  // Dynamic aggregate stats from real DB campaigns
  const stats = useMemo(() => {
    const total = campaigns.length;
    const totalSent = campaigns.reduce((acc, c) => acc + (Number(c.sentCount) || 0), 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + (Number(c.deliveredCount) || 0), 0);
    const totalReplies = campaigns.reduce((acc, c) => acc + (Number(c.repliesCount) || 0), 0);
    const deliveredRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '0.0%';
    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) + '%' : '0.0%';

    return {
      totalCampaigns: total.toLocaleString(),
      messagesSent: totalSent.toLocaleString(),
      deliveredCount: totalDelivered.toLocaleString(),
      deliveredRate,
      deliveryRate: deliveredRate,
      replies: totalReplies.toLocaleString(),
      replyRate,
    };
  }, [campaigns]);

  // Helper to extract a valid Date object from campaign data
  const getCampaignDate = (c) => {
    if (!c) return null;
    if (c.created_at) {
      const d = new Date(c.created_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (c.createdAt) {
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (c.scheduledAt) {
      const d = new Date(c.scheduledAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (c.date) {
      const lower = String(c.date).toLowerCase();
      if (lower === 'today') return new Date();
      if (lower === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
      }
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Filter campaigns by active tab, search query, and date filter
  const filteredCampaigns = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);

    return campaigns.filter((c) => {
      // Tab filter
      if (activeTab !== 'all') {
        const st = (c.status || '').toLowerCase();
        if (activeTab === 'sending') {
          if (st !== 'sending' && st !== 'in_progress') return false;
        } else if (activeTab === 'draft') {
          if (st !== 'draft' && st !== 'pending') return false;
        } else if (activeTab === 'failed') {
          if (st !== 'failed' && st !== 'cancelled') return false;
        } else if (st !== activeTab.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchGoal = c.goal?.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q);
        const matchAudience = c.audienceListName?.toLowerCase().includes(q) || c.audienceType?.toLowerCase().includes(q);
        const matchStatus = c.status?.toLowerCase().includes(q);
        if (!matchName && !matchGoal && !matchAudience && !matchStatus) return false;
      }

      // Date Filter
      if (dateFilter && dateFilter !== 'All time') {
        const campDate = getCampaignDate(c);
        if (!campDate) return false;

        if (dateFilter === 'Today') {
          if (campDate < startOfToday || campDate > endOfToday) return false;
        } else if (dateFilter === 'Last 7 days') {
          if (campDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'Last 30 days') {
          if (campDate < thirtyDaysAgo) return false;
        } else if (dateFilter === 'This Month') {
          if (campDate.getMonth() !== now.getMonth() || campDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [campaigns, activeTab, searchQuery, dateFilter]);

  // Paginated campaigns with safe page boundary
  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCampaigns = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCampaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCampaigns, safeCurrentPage]);

  const toggleSelectAll = () => {
    if (selectedCampaignIds.length === paginatedCampaigns.length && paginatedCampaigns.length > 0) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(paginatedCampaigns.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedCampaignIds.includes(id)) {
      setSelectedCampaignIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedCampaignIds((prev) => [...prev, id]);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCampaign(id);
      showToast('Campaign deleted successfully', 'success');
      loadData();
    } catch (e) {
      showToast('Failed to delete campaign', 'error');
    }
    setActiveMenuId(null);
  };

  const handleTogglePause = async (campaign) => {
    try {
      const st = (campaign.status || '').toLowerCase();
      if (st === 'paused') {
        await resumeCampaign(campaign.id);
        showToast('Campaign resumed successfully', 'success');
      } else {
        await pauseCampaign(campaign.id);
        showToast('Campaign paused successfully', 'success');
      }
      loadData();
    } catch (e) {
      showToast('Failed to update campaign status', 'error');
    }
    setActiveMenuId(null);
  };

  const handleDuplicate = async (campaignOrId) => {
    try {
      const id = typeof campaignOrId === 'object' && campaignOrId !== null ? campaignOrId.id : campaignOrId;
      await duplicateCampaign(id);
      showToast('Campaign duplicated as draft', 'success');
      loadData();
    } catch (e) {
      showToast('Failed to duplicate campaign', 'error');
    }
    setActiveMenuId(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#07080d] text-white flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* 1. Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#8c94a6] mb-2 font-medium">
            <span>Marketing</span>
          </div>

          {/* Title with Glowing WhatsApp Logo */}
          <div className="flex items-center gap-3">
            <div className="text-[#25D366] drop-shadow-[0_0_14px_rgba(37,211,102,0.45)] shrink-0">
              <WhatsAppLogo size={32} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Bulk WhatsApp Messages
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#7e889b] mt-1">
            Send personalized WhatsApp messages to your customers at scale. Create, schedule and track your campaigns.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/user/admin/templates"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#cbd5e1] bg-[#0d0f18] border border-[#1e2436] hover:bg-[#141826] hover:text-white transition-all flex items-center gap-2 shadow-sm"
          >
            <FileText size={15} className="text-white/60" />
            <span>View Templates</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#814AC8] hover:bg-[#723db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_28px_rgba(129,74,200,0.65)] flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics Cards (4 Dynamic Cards with Premium Backgrounds & White Icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Campaigns */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0c14] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5E5CE6] shadow-[0_0_20px_rgba(94,92,230,0.4)] flex items-center justify-center text-white shrink-0">
            <Send size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Total Campaigns
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.totalCampaigns}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Active in workspace
            </div>
          </div>
        </div>

        {/* Card 2: Messages Sent */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0c14] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1E4BB8] shadow-[0_0_20px_rgba(30,75,184,0.4)] flex items-center justify-center text-white shrink-0">
            <Users size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Messages Sent
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.messagesSent}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Total dispatched
            </div>
          </div>
        </div>

        {/* Card 3: Delivered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0c14] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0E845A] shadow-[0_0_20px_rgba(14,132,90,0.4)] flex items-center justify-center text-white shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Delivered
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.deliveredCount}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#0d281e] border border-[#155e3c] text-[#22c55e] text-[11px] font-medium">
                {stats.deliveredRate}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Delivery rate
            </div>
          </div>
        </div>

        {/* Card 4: Replies */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0c14] border border-[#161a28] hover:border-[#283049] transition-all shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#9A5328] shadow-[0_0_20px_rgba(154,83,40,0.4)] flex items-center justify-center text-white shrink-0">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/60">
              Replies
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {stats.replies}
              </span>
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {stats.replyRate} response rate
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Heading & Search Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        {/* Left Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] ?? 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 relative ${
                  isActive
                    ? 'text-white bg-[#15192c] border border-[#262f4d]'
                    : 'text-[#6b768c] hover:text-[#a1a1aa]'
                }`}
              >
                <span>{tab.label}</span>
                <span>({count})</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#814AC8] rounded-full shadow-[0_0_8px_#814AC8]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filters on Right */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-auto">
          {/* Search campaigns */}
          <div className="relative w-48 sm:w-56">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#586174]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#0a0c14] border border-[#161a28] text-xs text-white placeholder-[#586174] outline-none focus:border-[#814AC8] transition-all"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-colors cursor-pointer select-none ${
                dateFilter !== 'All time'
                  ? 'bg-[#814AC8]/20 border-[#814AC8] text-white font-medium shadow-[0_0_15px_rgba(129,74,200,0.25)]'
                  : 'bg-[#0a0c14] border-[#161a28] hover:border-[#283049] text-[#cbd5e1] hover:text-white'
              }`}
            >
              <Calendar size={13} className={dateFilter !== 'All time' ? 'text-[#a78bfa]' : 'text-white/60'} />
              <span>{dateFilter}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180 text-white' : 'text-white/60'}`} />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#101320] border border-[#22283d] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                {['All time', 'Today', 'Last 7 days', 'Last 30 days', 'This Month'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDateFilter(d);
                      setCurrentPage(1);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      dateFilter === d
                        ? 'bg-[#814AC8]/30 text-white font-medium'
                        : 'text-[#a1a1aa] hover:bg-[#181d2e] hover:text-white'
                    }`}
                  >
                    <span>{d}</span>
                    {dateFilter === d && <Check size={12} className="text-[#a78bfa]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Campaign Data Table */}
      <div className="rounded-2xl border border-[#161a28] bg-[#0a0c14] overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0e18] border-b border-[#161a28] text-white text-[13px] font-normal">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center font-normal">
                  <div className="flex items-center justify-center">
                    <PremiumCheckbox
                      checked={
                        paginatedCampaigns.length > 0 &&
                        paginatedCampaigns.every((c) => selectedCampaignIds.includes(c.id))
                      }
                      indeterminate={
                        paginatedCampaigns.some((c) => selectedCampaignIds.includes(c.id)) &&
                        !paginatedCampaigns.every((c) => selectedCampaignIds.includes(c.id))
                      }
                      onChange={toggleSelectAll}
                      ariaLabel="Select all campaigns"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 font-normal text-white">Campaign Name</th>
                <th className="px-4 py-3.5 font-normal text-white">Audience</th>
                <th className="px-4 py-3.5 font-normal text-white">Messages</th>
                <th className="px-4 py-3.5 font-normal text-white">Sent</th>
                <th className="px-4 py-3.5 font-normal text-white">Delivered</th>
                <th className="px-4 py-3.5 font-normal text-white">Failed</th>
                <th className="px-4 py-3.5 font-normal text-white">
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowDown size={11} className="text-white" />
                  </div>
                </th>
                <th className="px-4 py-3.5 font-normal text-white">Status</th>
                <th className="w-12 px-4 py-3.5 text-right font-normal text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131624]">
              {isLoading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-white/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-[#814AC8]" />
                      <span className="text-sm font-medium text-white">Loading campaigns...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-white/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-sm font-medium text-white">No campaigns found</span>
                      <p className="text-xs text-white/50">
                        Try changing the tab filter or search query, or create a new campaign.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((camp) => {
                  const isChecked = selectedCampaignIds.includes(camp.id);
                  const sentCount = Number(camp.sentCount) || 0;
                  const deliveredCount = Number(camp.deliveredCount) || 0;
                  const failedCount = Number(camp.failedCount) || 0;
                  const recipientsCount = Number(camp.recipientsCount) || 0;
                  const validRecipients = Number(camp.validRecipients) || recipientsCount;

                  const deliveredPct = sentCount > 0 ? `${((deliveredCount / sentCount) * 100).toFixed(1)}%` : '0.0%';
                  const failedPct = sentCount > 0 ? `${((failedCount / sentCount) * 100).toFixed(1)}%` : '0.0%';

                  return (
                    <tr
                      key={camp.id}
                      className={`transition-colors duration-150 ${
                        isChecked ? 'bg-[#814AC8]/10' : 'hover:bg-[#0f121e]/70'
                      }`}
                    >
                      {/* Premium Custom Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <PremiumCheckbox
                            checked={isChecked}
                            onChange={() => toggleSelectOne(camp.id)}
                            ariaLabel={`Select ${camp.name}`}
                          />
                        </div>
                      </td>

                      {/* Campaign Name & Subtitle */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white tracking-tight text-[13px]">
                          {camp.name}
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5">
                          {camp.goal || camp.subtitle || `${camp.type || 'Promotional'} Campaign`}
                        </div>
                      </td>

                      {/* Audience */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white tracking-tight text-[13px]">
                          {camp.audienceListName || camp.audienceType || 'All Contacts'}
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5">
                          {validRecipients.toLocaleString()} contacts
                        </div>
                      </td>

                      {/* Messages */}
                      <td className="px-4 py-3.5 text-xs text-[#cbd5e1] font-medium">
                        {recipientsCount.toLocaleString()}
                      </td>

                      {/* Sent */}
                      <td className="px-4 py-3.5 text-xs text-[#cbd5e1] font-medium">
                        {sentCount.toLocaleString()}
                      </td>

                      {/* Delivered */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-[#cbd5e1] font-medium">
                          {deliveredCount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5">
                          {deliveredPct}
                        </div>
                      </td>

                      {/* Failed */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-[#cbd5e1] font-medium">
                          {failedCount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5">
                          {failedPct}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(() => {
                          const isScheduled = (camp.status || '').toLowerCase() === 'scheduled';
                          const targetDateRaw = (isScheduled && camp.scheduledAt)
                            ? camp.scheduledAt
                            : (camp.created_at || camp.createdAt || null);
                          const dateObj = targetDateRaw ? new Date(targetDateRaw) : null;
                          const isValidDate = dateObj && !isNaN(dateObj.getTime());

                          const dateFormatted = isValidDate
                            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : (camp.date || 'Today');

                          const timeFormatted = isValidDate
                            ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : (camp.time || '10:00 AM');

                          return (
                            <>
                              <div className="text-xs text-[#cbd5e1]">
                                {dateFormatted}
                              </div>
                              <div className="text-[11px] text-white/60 mt-0.5">
                                {timeFormatted}
                              </div>
                            </>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <CampaignStatusBadge status={camp.status} />
                          {((camp.status || '').toLowerCase() === 'paused' && (camp.paused_reason === 'PORTFOLIO_TIER_LIMIT_REACHED' || camp.pausedReason === 'PORTFOLIO_TIER_LIMIT_REACHED')) && (
                            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                              <Clock size={10} className="shrink-0" />
                              <span>24h limit reached · Resumes tomorrow</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right relative" data-action-menu-cell>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId((prev) => (prev === camp.id ? null : camp.id));
                          }}
                          className="p-1.5 rounded-lg text-[#6b768c] hover:text-white hover:bg-[#181d2e] transition-colors cursor-pointer"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {/* Action Menu Flyout */}
                        {activeMenuId === camp.id && (
                          <div className="absolute right-4 top-10 w-36 bg-[#101320] border border-[#22283d] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 text-left animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                handleTogglePause(camp);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs text-[#cbd5e1] hover:bg-[#814AC8]/25 hover:text-white rounded flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              {(camp.status || '').toLowerCase() === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                              <span>{(camp.status || '').toLowerCase() === 'paused' ? 'Resume' : 'Pause'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicate(camp)}
                              className="w-full px-2.5 py-1.5 text-xs text-[#cbd5e1] hover:bg-[#814AC8]/25 hover:text-white rounded flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Copy size={12} />
                              <span>Duplicate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(camp.id)}
                              className="w-full px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 rounded flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0b0e18] border-t border-[#161a28] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <span>
            Showing {filteredCampaigns.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Left Arrow */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={13} />
              </button>

              {/* Dynamic Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[#814AC8] text-white shadow-sm'
                      : 'bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {/* Right Arrow */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg bg-[#0e111d] border border-[#1e2436] text-white/60 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Promotional Banner ("Reach more customers with WhatsApp") with Purple Wave Gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-[#251b42]/60 bg-[#090812] p-5 sm:p-6 flex items-center gap-4 shadow-2xl group">
        {/* Decorative Glowing Purple Wave Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-50 transition-opacity">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 1200 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0 160C300 160 450 60 700 80C950 100 1050 20 1200 40V160H0Z"
              fill="url(#paint0_linear_wave)"
            />
            <path
              d="M0 160C250 140 500 40 750 90C1000 140 1100 50 1200 70V160H0Z"
              fill="url(#paint1_linear_wave)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="paint0_linear_wave" x1="0" y1="60" x2="1200" y2="160" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6322b5" stopOpacity="0.4" />
                <stop offset="0.5" stopColor="#814AC8" stopOpacity="0.6" />
                <stop offset="1" stopColor="#3b0764" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="paint1_linear_wave" x1="0" y1="40" x2="1200" y2="140" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9333ea" stopOpacity="0.25" />
                <stop offset="0.5" stopColor="#814AC8" stopOpacity="0.3" />
                <stop offset="1" stopColor="#6b21a8" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* WhatsApp Icon + Header Text */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#091a14] border border-[#14532d]/60 flex items-center justify-center text-[#25D366] shrink-0 shadow-[0_0_20px_rgba(37,211,102,0.25)]">
            <WhatsAppLogo size={28} />
          </div>
          <div>
           <h3 className="text-sm sm:text-base font-medium text-white tracking-tight">
              Reach more customers with WhatsApp
            </h3>

            <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
              Use templates, personalization and smart timing to get better results.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Create WhatsApp Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadData()}
        workspaceId={workspaceId}
      />
    </div>
  );
}
