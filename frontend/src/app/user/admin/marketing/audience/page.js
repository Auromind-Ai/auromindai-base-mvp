'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ShieldCheck,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { INITIAL_CONTACT_LISTS } from '@/lib/api/marketing';
import CreateCampaignModal from '@/components/marketing/CreateCampaignModal';
import { useToast } from '@/context/ToastContext';

export default function AudiencePage() {
  const [lists, setLists] = useState(INITIAL_CONTACT_LISTS);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showToast } = useToast();

  const filtered = lists.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalContacts = lists.reduce((acc, l) => acc + l.totalContacts, 0);
  const validContacts = lists.reduce((acc, l) => acc + l.validContacts, 0);
  const invalidContacts = lists.reduce((acc, l) => acc + l.invalidContacts, 0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Audience contact lists synced successfully', 'success');
    }, 600);
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#8c88a6] mb-1.5 font-medium">
            <span>Marketing</span>
            <span>›</span>
            <span className="text-[#C49FE0]">Audience</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Audience & Contacts
          </h1>
          <p className="text-xs sm:text-sm text-[#8c88a6] mt-0.5">
            Manage your CRM contact lists, smart segments, and WhatsApp opt-in preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] flex items-center gap-2 transition-all"
          >
            <Plus size={16} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8c88a6] block font-medium">Total Audiences</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalContacts.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#814AC8]/20 text-[#C49FE0] flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8c88a6] block font-medium">WhatsApp Opted-in</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{validContacts.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8c88a6] block font-medium">Opted-out / Invalid</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{invalidContacts.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-[#231d3d] bg-[#0b0a17] overflow-hidden shadow-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6d688c]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contact lists..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#080710] border border-[#231d3d] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-[#121024] border border-[#2d2650] text-[#8c88a6] hover:text-white"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#814AC8]' : ''} />
            </button>

            <button
              type="button"
              onClick={() => showToast('Upload CSV contact importer opened', 'info')}
              className="px-3.5 py-2 rounded-xl bg-[#141228] border border-purple-500/30 text-[#C49FE0] text-xs font-semibold hover:bg-purple-600/20 flex items-center gap-1.5 transition-all"
            >
              <UploadCloud size={14} />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#100e21] border-b border-[#231d3d] text-[#8c88a6] uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">List Name</th>
                <th className="px-4 py-3.5">Total Contacts</th>
                <th className="px-4 py-3.5">Valid Opted-in</th>
                <th className="px-4 py-3.5">Opted-out</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Created On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1936]">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-[#131126] transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-white">{l.name}</td>
                  <td className="px-4 py-3.5 text-[#a8a3c2] font-semibold">{l.totalContacts.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-emerald-400 font-medium">{l.validContacts.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-amber-400 font-medium">{l.invalidContacts.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-[#8c88a6]">{l.description}</td>
                  <td className="px-4 py-3.5 text-[#6d688c]">{l.createdOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
