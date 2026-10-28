'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  Bot,
  Play,
  Pause,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Globe,
  Mail,
  Calendar,
  Share2,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function MyAgentsPage() {
  const router = useRouter();
  const { workspaceId } = useAuth();

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'paused' | 'drafts'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Restore saved viewMode preference
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('ai_agents_view_mode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ai_agents_view_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  // Fetch agents on mount or when workspace changes
  useEffect(() => {
    let isMounted = true;
    async function loadAgents() {
      if (!workspaceId || workspaceId === 'null' || workspaceId === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.getAgents(workspaceId);
        if (isMounted) {
          setAgents(res.agents || []);
        }
      } catch (err) {
        console.error("Failed to load AI agents:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAgents();
    return () => { isMounted = false; };
  }, [workspaceId]);

  // Filter agents based on active tab and search query
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Tab filter
      if (activeTab === 'active' && agent.status !== 'active') return false;
      if (activeTab === 'paused' && agent.status !== 'paused') return false;
      if (activeTab === 'drafts' && !agent.is_draft && agent.status !== 'draft') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = agent.name?.toLowerCase().includes(q);
        const matchDesc = agent.description?.toLowerCase().includes(q);
        const matchType = agent.agent_type?.toLowerCase().includes(q);
        const matchBiz = agent.business_name?.toLowerCase().includes(q);
        return matchName || matchDesc || matchType || matchBiz;
      }
      return true;
    });
  }, [agents, activeTab, searchQuery]);

  // Toggle active / paused status
  const handleToggleStatus = async (agent) => {
    if (agent.is_draft || agent.status?.toLowerCase() === 'draft') return;
    const nextStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      setActionLoadingId(agent.id);
      await api.toggleAgentStatus(agent.id, nextStatus, workspaceId);
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      console.error("Failed to toggle agent status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId) => {
    try {
      setActionLoadingId(agentId);
      await api.deleteAgent(agentId, workspaceId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete agent:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getAgentTypeLabel = (type) => {
    switch (type) {
      case 'sales_assistant': return 'Sales Assistant';
      case 'customer_support': return 'Customer Support';
      case 'lead_generation': return 'Lead Generation';
      case 'appointment_booker': return 'Appointment Booker';
      default: return 'Custom Agent';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b13] text-white">

      {/* Main Container */}
      <main className="flex-1 px-8 py-7 overflow-y-auto custom-scrollbar max-w-[1440px] w-full mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>AI Agents</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Create and manage your AI agents to handle conversations and grow your business.
            </p>
          </div>

          <Link
            href="/ai-agents/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            <span>Create AI Agent</span>
          </Link>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-6">
            {[
              { id: 'all', label: 'All Agents' },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'drafts', label: 'Drafts' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs font-medium pb-2 relative transition-colors cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search, Filter & View Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 bg-[#101726]/70 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>

            <div className="flex items-center bg-[#101726] p-0.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-purple-500" />
            <p className="text-xs text-zinc-400">Loading your AI agents...</p>
          </div>
        ) : agents.length === 0 ? (
          /* Empty State matching Mockup 1 exactly */
          <div className="flex flex-col items-center justify-center pt-6 pb-12">
            {/* Robot Illustration with Glowing Platform & Orbiting Channel Icons */}
            <div className="relative w-80 h-72 flex items-center justify-center mb-4">
              {/* Radial Purple Glow Behind Platform */}
              <div className="absolute inset-0 bg-radial from-purple-600/25 via-violet-600/10 to-transparent blur-2xl pointer-events-none" />

              {/* Orbiting Channel Badges */}
              {/* 1. WhatsApp (Top Left) */}
              <div className="absolute top-8 left-12 w-10 h-10 rounded-full bg-[#0b1320] border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 hover:scale-110 transition-transform">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
              </div>

              {/* 2. Instagram (Top Right) */}
              <div className="absolute top-6 right-12 w-10 h-10 rounded-full bg-[#0b1320] border border-pink-500/30 flex items-center justify-center shadow-lg shadow-pink-500/10 hover:scale-110 transition-transform">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </div>
              </div>

              {/* 3. Website / Globe (Middle Left) */}
              <div className="absolute top-28 left-4 w-9 h-9 rounded-full bg-[#0f172a] border border-sky-500/30 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Globe size={16} className="text-sky-400" />
              </div>

              {/* 4. Gmail (Middle Right) */}
              <div className="absolute top-26 right-5 w-9 h-9 rounded-full bg-[#0f172a] border border-red-500/30 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Mail size={16} className="text-red-400" />
              </div>

              {/* 5. Calendar (Bottom Left) */}
              <div className="absolute bottom-14 left-8 w-8 h-8 rounded-full bg-[#0f172a] border border-indigo-500/30 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Calendar size={14} className="text-indigo-400" />
              </div>

              {/* Center Robot Icon with Holographic Glow */}
              <div className="relative flex flex-col items-center z-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-b from-[#261f4d] to-[#120f26] border-2 border-purple-400/30 flex items-center justify-center shadow-2xl shadow-purple-900/60 p-4">
                  <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                    {/* Head Body */}
                    <rect x="15" y="20" width="70" height="55" rx="18" fill="url(#botGrad)" stroke="#A855F7" strokeWidth="2.5" />
                    {/* Screen / Visor */}
                    <rect x="25" y="32" width="50" height="30" rx="10" fill="#0b0f19" stroke="#3b82f6" strokeWidth="1.5" />
                    {/* Glowing Eyes */}
                    <circle cx="38" cy="47" r="4.5" fill="#38bdf8" />
                    <circle cx="62" cy="47" r="4.5" fill="#38bdf8" />
                    {/* Headphones */}
                    <rect x="7" y="38" width="8" height="20" rx="4" fill="#a855f7" />
                    <rect x="85" y="38" width="8" height="20" rx="4" fill="#a855f7" />
                    {/* Antenna */}
                    <line x1="50" y1="20" x2="50" y2="10" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="50" cy="8" r="3.5" fill="#c084fc" />
                    <defs>
                      <linearGradient id="botGrad" x1="15" y1="20" x2="85" y2="75" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#6366f1" />
                        <stop offset="1" stopColor="#3b0764" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Glowing Podium */}
                <div className="w-40 h-7 bg-gradient-to-r from-purple-600/30 via-violet-500 to-purple-600/30 rounded-full blur-sm -mt-2 -z-10 shadow-lg shadow-purple-500/50" />
                <div className="w-48 h-3.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent rounded-full -mt-2.5 blur-[2px]" />
              </div>
            </div>

            {/* Headline and Description */}
            <h2 className="text-xl font-bold text-white tracking-tight text-center mb-2">
              No AI Agents Yet
            </h2>
            <p className="text-xs text-zinc-400 text-center max-w-md mb-6 leading-relaxed">
              Create your first AI agent to start automating conversations, capturing leads, and growing your business 24/7.
            </p>

            {/* Big Primary Button */}
            <Link
              href="/ai-agents/create"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 cursor-pointer mb-16"
            >
              <Plus size={16} />
              <span>Create AI Agent</span>
              <ArrowRight size={14} className="ml-0.5" />
            </Link>

            {/* Four Benefit Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {/* Card 1: Automate Conversations */}
              <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] hover:border-purple-500/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  Automate Conversations
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Handle customer enquiries automatically on WhatsApp, Instagram and more.
                </p>
              </div>

              {/* Card 2: Capture More Leads */}
              <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] hover:border-purple-500/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                  <Users size={18} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  Capture More Leads
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Engage visitors and capture leads 24/7 without missing opportunities.
                </p>
              </div>

              {/* Card 3: Increase Sales */}
              <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] hover:border-purple-500/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                  <TrendingUp size={18} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  Increase Sales
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Answer product questions, share pricing and convert leads into customers.
                </p>
              </div>

              {/* Card 4: Save Time */}
              <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] hover:border-purple-500/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                  <Clock size={18} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  Save Time
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Let AI handle repetitive work so you can focus on growing your business.
                </p>
              </div>
            </div>
          </div>
        ) : filteredAgents.length === 0 ? (
          /* Empty Search Filter State */
          <div className="py-20 text-center">
            <Bot size={40} className="mx-auto text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">No agents found</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Try adjusting your search query or switching to another filter tab.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="text-xs text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* Active Agents List View */
          <div className="flex flex-col gap-3">
            {filteredAgents.map((agent) => {
              const isActionLoading = actionLoadingId === agent.id;
              const isDraft = Boolean(agent.is_draft || agent.status?.toLowerCase() === 'draft');
              const channels = agent.channels_config || {};
              const enabledChannels = Object.keys(channels).filter((k) => channels[k]?.enabled);

              return (
                <div
                  key={agent.id}
                  className="rounded-2xl bg-[#0c1220]/90 border border-white/[0.08] hover:border-purple-500/40 p-4 transition-all shadow-md hover:shadow-purple-900/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Left: Avatar + Agent Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/30 shrink-0 overflow-hidden relative border border-purple-400/20">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <Bot size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                          {agent.name}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            agent.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              agent.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          <span className="capitalize">{agent.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-400">
                          {getAgentTypeLabel(agent.agent_type)}
                        </span>
                        {agent.business_name && (
                          <>
                            <span className="text-[10px] text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                              {agent.business_name}
                            </span>
                          </>
                        )}
                      </div>
                      {agent.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-1 max-w-xl leading-relaxed">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Connected Channels & Model */}
                  <div className="flex items-center gap-6 shrink-0 lg:px-4 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x border-white/5">
                    {/* Connected Channels */}
                    <div className="flex flex-col gap-1 min-w-[130px]">
                      <span className="text-[10px] text-zinc-400 font-medium">Active Channels:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {enabledChannels.length > 0 ? (
                          enabledChannels.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-medium text-zinc-300 capitalize"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-500">None connected</span>
                        )}
                      </div>
                    </div>

                    {/* AI Model */}
                    <div className="flex flex-col gap-1 min-w-[110px]">
                      <span className="text-[10px] text-zinc-400 font-medium">Model:</span>
                      <span className="text-[11px] font-mono text-purple-300">
                        {agent.ai_config?.model || 'gpt-4o'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isDraft ? (
                      <Link
                        href={`/ai-agents/test?agentId=${agent.id}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Sparkles size={13} />
                        <span>Test Agent</span>
                      </Link>
                    ) : null}

                    <Link
                      href={`/ai-agents/create?editId=${agent.id}`}
                      className={
                        isDraft
                          ? "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                          : "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      }
                      title="Edit Agent Configuration"
                    >
                      <Edit3 size={14} />
                      {isDraft && <span>Edit Agent</span>}
                    </Link>

                    {!isDraft && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleToggleStatus(agent)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title={agent.status === 'active' ? 'Pause Agent' : 'Activate Agent'}
                      >
                        {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setDeleteConfirmId(agent.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Active Agents Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAgents.map((agent) => {
              const isActionLoading = actionLoadingId === agent.id;
              const isDraft = Boolean(agent.is_draft || agent.status?.toLowerCase() === 'draft');
              const channels = agent.channels_config || {};
              const enabledChannels = Object.keys(channels).filter((k) => channels[k]?.enabled);

              return (
                <div
                  key={agent.id}
                  className="rounded-2xl bg-[#0c1220]/90 border border-white/[0.08] hover:border-purple-500/40 p-5 transition-all shadow-xl hover:shadow-purple-900/10 flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/30 shrink-0 overflow-hidden relative border border-purple-400/20">
                          {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover" />
                          ) : (
                            <Bot size={22} />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                            {agent.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400">
                              {getAgentTypeLabel(agent.agent_type)}
                            </span>
                            {agent.business_name && (
                              <>
                                <span className="text-[10px] text-zinc-600">•</span>
                                <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">
                                  {agent.business_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                          agent.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            agent.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        <span className="capitalize">{agent.status}</span>
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {agent.description || "Helps customers with inquiries, handles conversations, and converts leads."}
                    </p>

                    {/* Metadata Row: Channels & Model */}
                    <div className="space-y-2 py-3 border-y border-white/5 mb-4">
                      {/* Connected Channels */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-zinc-400">Active Channels:</span>
                        <div className="flex items-center gap-1.5">
                          {enabledChannels.length > 0 ? (
                            enabledChannels.map((c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-medium text-zinc-300 capitalize"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-500">None connected</span>
                          )}
                        </div>
                      </div>

                      {/* AI Model */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-zinc-400">Model:</span>
                        <span className="text-[11px] font-mono text-purple-300">
                          {agent.ai_config?.model || 'gpt-4o'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    {/* Separate Test Page Link - Only for published agents */}
                    {!isDraft ? (
                      <Link
                        href={`/ai-agents/test?agentId=${agent.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Sparkles size={13} />
                        <span>Test Agent</span>
                      </Link>
                    ) : null}

                    {/* Edit Configuration Button */}
                    <Link
                      href={`/ai-agents/create?editId=${agent.id}`}
                      className={
                        isDraft
                          ? "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                          : "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      }
                      title="Edit Agent Configuration"
                    >
                      <Edit3 size={14} />
                      {isDraft && <span>Edit Agent</span>}
                    </Link>

                    {/* Pause / Resume Toggle Button */}
                    {!isDraft && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleToggleStatus(agent)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title={agent.status === 'active' ? 'Pause Agent' : 'Activate Agent'}
                      >
                        {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    )}

                    {/* Delete Action with Modal Trigger */}
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setDeleteConfirmId(agent.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f1523] border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Delete AI Agent?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to delete this agent? All channel associations and configuration will be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAgent(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
