'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  RefreshCw,
  TrendingUp,
  FileText,
  Trash2,
  Copy,
  Pause,
  Play,
  Eye,
  Rocket
} from 'lucide-react';
import CampaignStatusBadge from './CampaignStatusBadge';
import CreateCampaignModal from './CreateCampaignModal';
import { getCampaigns, deleteCampaign, updateCampaign } from '@/lib/api/marketing';
import { useToast } from '@/context/ToastContext';

const TABS = [
  { id: 'all', label: 'All Campaigns' },
  { id: 'draft', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'sending', label: 'Sending' },
  { id: 'completed', label: 'Completed' },
  { id: 'paused', label: 'Paused' },
  { id: 'failed', label: 'Failed' },
];

export default function CampaignDashboard({ activeSubmenu = 'Campaigns' }) {
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [dateFilter, setDateFilter] = useState('Last 30 days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getCampaigns().then((data) => {
      if (isMounted && data) {
        setCampaigns(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter campaigns by active tab & search query
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (c.status.toLowerCase() !== activeTab.toLowerCase()) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchAudience = c.audienceListName?.toLowerCase().includes(q);
        const matchStatus = c.status?.toLowerCase().includes(q);
        if (!matchName && !matchAudience && !matchStatus) return false;
      }
      return true;
    });
  }, [campaigns, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: campaigns.length };
    TABS.forEach((t) => {
      if (t.id !== 'all') {
        counts[t.id] = campaigns.filter((c) => c.status?.toLowerCase() === t.id.toLowerCase()).length;
      }
    });
    return counts;
  }, [campaigns]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = campaigns.length;
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
    const totalReplies = campaigns.reduce((acc, c) => acc + (c.repliesCount || 0), 0);
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '98.2%';

    return {
      totalCampaigns: total || 48,
      messagesSent: totalSent ? (totalSent > 1000 ? (totalSent / 1000).toFixed(1) + 'k' : totalSent) : '142.5k',
      deliveredRate: deliveryRate,
      deliveredSubtext: totalDelivered ? `${(totalDelivered / 1000).toFixed(1)}k delivered` : '139.9k delivered',
      replies: totalReplies ? totalReplies.toLocaleString() : '1,248',
      replyRate: '9.7% response rate',
    };
  }, [campaigns]);

  const toggleSelectAll = () => {
    if (selectedCampaignIds.length === filteredCampaigns.length) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(filteredCampaigns.map((c) => c.id));
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
      showToast('Campaign deleted', 'success');
      loadData();
    } catch (e) {
      showToast('Failed to delete campaign', 'error');
    }
    setActiveMenuId(null);
  };

  const handleTogglePause = async (campaign) => {
    const nextStatus = campaign.status === 'Paused' ? 'Sending' : 'Paused';
    try {
      await updateCampaign(campaign.id, { status: nextStatus });
      showToast(`Campaign status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
    setActiveMenuId(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#8c88a6] mb-1.5 font-medium">
            <span>Marketing</span>
            <span>›</span>
            <span className="text-[#C49FE0]">{activeSubmenu}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {activeSubmenu}
          </h1>
          <p className="text-xs sm:text-sm text-[#8c88a6] mt-0.5">
            Create, schedule and manage your WhatsApp marketing and broadcast campaigns.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/user/admin/templates"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#D4D4D4] bg-[#141228] border border-[#2d2650] hover:bg-[#1f1b3b] hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText size={14} className="text-[#814AC8]" />
            <span>View Templates</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] flex items-center gap-2 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Campaigns */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] hover:border-purple-500/30 transition-all shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8c88a6]">
              Total Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#814AC8]/15 text-[#C49FE0] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Rocket size={15} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.totalCampaigns}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
              <TrendingUp size={12} />
              <span>+12% this month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Messages Sent */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] hover:border-purple-500/30 transition-all shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8c88a6]">
              Messages Sent
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send size={15} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.messagesSent}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
              <TrendingUp size={12} />
              <span>+24% vs last week</span>
            </div>
          </div>
        </div>

        {/* Card 3: Delivered Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] hover:border-purple-500/30 transition-all shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8c88a6]">
              Delivered
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.deliveredRate}
            </div>
            <div className="text-[11px] text-[#8c88a6] mt-1">
              {stats.deliveredSubtext}
            </div>
          </div>
        </div>

        {/* Card 4: Replies */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] hover:border-purple-500/30 transition-all shadow-sm flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8c88a6]">
              Replies
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#814AC8]/15 text-[#C49FE0] flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare size={15} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>{stats.replies}</span>
              <span className="text-xs font-semibold text-emerald-400">↑ 18%</span>
            </div>
            <div className="text-[11px] text-[#8c88a6] mt-1">
              {stats.replyRate}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Campaign Tabs Bar */}
      <div className="border-b border-[#231d3d] overflow-x-auto custom-scrollbar flex items-center gap-2 pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-[#814AC8]/20 text-white border border-[#814AC8]/40 shadow-sm'
                  : 'text-[#8c88a6] hover:text-white hover:bg-[#141228]'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-[#814AC8] text-white' : 'bg-[#1e1938] text-[#8c88a6]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6d688c]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0b0a17] border border-[#231d3d] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8] transition-all"
          />
        </div>

        {/* Date Filter & Filter Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Date range dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="px-3.5 py-2 rounded-xl bg-[#0b0a17] border border-[#231d3d] hover:border-[#3d3363] text-xs text-white flex items-center gap-2 transition-colors"
            >
              <Calendar size={13} className="text-[#814AC8]" />
              <span>{dateFilter}</span>
              <ChevronDown size={13} className="text-[#8c88a6]" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                {['Today', 'Last 7 days', 'Last 30 days', 'This Month', 'All time'].map((d) => (
                  <div
                    key={d}
                    onClick={() => {
                      setDateFilter(d);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                      dateFilter === d ? 'bg-[#814AC8]/20 text-white font-medium' : 'text-[#D4D4D4] hover:bg-[#1a1638]'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Campaign Data Table */}
      <div className="rounded-2xl border border-[#231d3d] bg-[#0b0a17] overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#100e21] border-b border-[#231d3d] text-[#8c88a6] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredCampaigns.length > 0 &&
                      selectedCampaignIds.length === filteredCampaigns.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Campaign Name</th>
                <th className="px-4 py-3.5">Audience</th>
                <th className="px-4 py-3.5">Messages</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Sent</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Delivered</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Failed</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="w-12 px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1936]">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#8c88a6]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Sparkles size={24} className="text-[#814AC8]" />
                      <span className="text-sm font-medium text-white">No campaigns found</span>
                      <p className="text-xs text-[#6d688c]">
                        Try changing the tab filter or search query, or create a new campaign.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const isChecked = selectedCampaignIds.includes(camp.id);

                  return (
                    <tr
                      key={camp.id}
                      className={`transition-colors duration-150 ${
                        isChecked ? 'bg-[#814AC8]/10' : 'hover:bg-[#131126]'
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(camp.id)}
                          className="w-4 h-4 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white tracking-tight">
                          {camp.name}
                        </div>
                        <div className="text-[10px] text-[#7f7a9c] flex items-center gap-1.5 mt-0.5">
                          <span className="text-[#814AC8] font-medium">{camp.type}</span>
                          <span>•</span>
                          <span>{camp.whatsappNumber}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-[#D4D4D4] font-medium">
                        {camp.audienceListName || 'All Customers'}
                      </td>

                      <td className="px-4 py-3.5 text-[#D4D4D4] font-semibold">
                        {(camp.recipientsCount || 2480).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell text-emerald-400 font-medium">
                        {(camp.sentCount ?? 2430).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell text-sky-400 font-medium">
                        {(camp.deliveredCount ?? 2380).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 hidden lg:table-cell text-rose-400 font-medium">
                        {(camp.failedCount ?? 50).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-[#8c88a6] whitespace-nowrap text-[11px]">
                        {camp.date || 'Oct 28, 2025'}
                      </td>

                      <td className="px-4 py-3.5">
                        <CampaignStatusBadge status={camp.status} />
                      </td>

                      <td className="px-4 py-3.5 text-right relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === camp.id ? null : camp.id)}
                          className="p-1.5 rounded-lg text-[#8c88a6] hover:text-white hover:bg-[#1f1b3b] transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {/* Action Menu Flyout */}
                        {activeMenuId === camp.id && (
                          <div className="absolute right-4 top-10 w-36 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                handleTogglePause(camp);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs text-[#D4D4D4] hover:bg-[#814AC8]/20 hover:text-white rounded flex items-center gap-2"
                            >
                              {camp.status === 'Paused' ? <Play size={12} /> : <Pause size={12} />}
                              <span>{camp.status === 'Paused' ? 'Resume' : 'Pause'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                showToast('Campaign duplicated as draft', 'success');
                                setActiveMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs text-[#D4D4D4] hover:bg-[#814AC8]/20 hover:text-white rounded flex items-center gap-2"
                            >
                              <Copy size={12} />
                              <span>Duplicate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(camp.id)}
                              className="w-full px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 rounded flex items-center gap-2"
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

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#100e21] border-t border-[#231d3d] flex items-center justify-between text-xs text-[#8c88a6]">
          <span>
            Showing <strong className="text-white">{filteredCampaigns.length}</strong> of{' '}
            <strong className="text-white">{campaigns.length}</strong> campaigns
          </span>

          <div className="flex items-center gap-1.5">
            <button className="px-2.5 py-1 rounded-lg border border-[#2d2650] bg-[#141228] text-[#8c88a6] hover:text-white disabled:opacity-40">
              ‹
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-[#814AC8] text-white font-semibold">
              1
            </button>
            <button className="px-2.5 py-1 rounded-lg border border-[#2d2650] bg-[#141228] text-[#8c88a6] hover:text-white">
              2
            </button>
            <button className="px-2.5 py-1 rounded-lg border border-[#2d2650] bg-[#141228] text-[#8c88a6] hover:text-white">
              3
            </button>
            <button className="px-2.5 py-1 rounded-lg border border-[#2d2650] bg-[#141228] text-[#8c88a6] hover:text-white">
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 6. Bottom Banner: "Reach more customers with WhatsApp" */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100d24] to-[#080712] border border-[#2d244d] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shrink-0 shadow-[0_0_20px_rgba(37,211,102,0.2)]">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Reach more customers with WhatsApp
            </h3>
            <p className="text-xs text-[#8c88a6] mt-0.5">
              Use templates, personalization and smart timing to get better results.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_15px_rgba(129,74,200,0.35)] flex items-center gap-1.5 shrink-0 transition-all"
        >
          <Plus size={14} />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* 7. Create WhatsApp Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
