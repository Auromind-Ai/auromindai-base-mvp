'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Send,
  CheckCircle2,
  MessageSquare,
  Clock,
  Sparkles,
  BarChart3,
  PieChart,
  Calendar,
  ChevronDown,
  Plus
} from 'lucide-react';
import CreateCampaignModal from '@/components/marketing/CreateCampaignModal';

export default function MarketingAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#8c88a6] mb-1.5 font-medium">
            <span>Marketing</span>
            <span>›</span>
            <span className="text-[#C49FE0]">Analytics</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campaign Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#8c88a6] mt-0.5">
            Real-time delivery performance, open rates, response times and ROI insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#0b0a17] border border-[#231d3d] text-xs text-white flex items-center gap-2">
            <Calendar size={13} className="text-[#814AC8]" />
            <span>{timeRange}</span>
          </div>

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d]">
          <span className="text-xs font-medium text-[#8c88a6]">Overall Delivery Rate</span>
          <div className="text-3xl font-bold text-white mt-3">98.4%</div>
          <span className="text-[11px] text-emerald-400 font-medium block mt-1">↑ 2.1% from last month</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d]">
          <span className="text-xs font-medium text-[#8c88a6]">Avg. Read Rate</span>
          <div className="text-3xl font-bold text-white mt-3">86.2%</div>
          <span className="text-[11px] text-emerald-400 font-medium block mt-1">Within 15 minutes</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d]">
          <span className="text-xs font-medium text-[#8c88a6]">Response / CTR</span>
          <div className="text-3xl font-bold text-white mt-3">14.8%</div>
          <span className="text-[11px] text-[#C49FE0] font-medium block mt-1">1,840 incoming replies</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d]">
          <span className="text-xs font-medium text-[#8c88a6]">Avg. Response Time</span>
          <div className="text-3xl font-bold text-white mt-3">3.2 min</div>
          <span className="text-[11px] text-sky-400 font-medium block mt-1">AI agent response speed</span>
        </div>
      </div>

      {/* Analytics Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Funnel */}
        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] space-y-4">
          <h3 className="text-sm font-semibold text-white">Campaign Funnel Overview</h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a8a3c2]">Total Queued</span>
                <span className="text-white font-bold">145,000 (100%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#18142e]">
                <div className="w-full h-full rounded-full bg-[#814AC8]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a8a3c2]">Sent to Meta API</span>
                <span className="text-white font-bold">143,500 (99.0%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#18142e]">
                <div className="w-[99%] h-full rounded-full bg-indigo-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a8a3c2]">Delivered to Recipient</span>
                <span className="text-white font-bold">141,200 (98.4%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#18142e]">
                <div className="w-[98.4%] h-full rounded-full bg-emerald-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#a8a3c2]">Read by Customer</span>
                <span className="text-white font-bold">121,800 (86.2%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#18142e]">
                <div className="w-[86.2%] h-full rounded-full bg-sky-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Templates */}
        <div className="p-5 rounded-2xl bg-[#0b0a17] border border-[#231d3d] space-y-3">
          <h3 className="text-sm font-semibold text-white">Top Performing Templates</h3>
          <div className="space-y-2.5 pt-1">
            <div className="p-3 rounded-xl bg-[#121024] border border-[#231d3d] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">diwali_festive_offer</span>
                <span className="text-[10px] text-[#8c88a6]">Promotional • 2,480 sent</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">18.4% CTR</span>
                <span className="text-[10px] text-[#8c88a6] block">99.1% delivered</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121024] border border-[#231d3d] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">flash_sale_march</span>
                <span className="text-[10px] text-[#8c88a6]">Promotional • 856 sent</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">14.2% CTR</span>
                <span className="text-[10px] text-[#8c88a6] block">98.5% delivered</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121024] border border-[#231d3d] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">cart_reminder_discount</span>
                <span className="text-[10px] text-[#8c88a6]">Transactional • 640 sent</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">22.0% CTR</span>
                <span className="text-[10px] text-[#8c88a6] block">99.8% delivered</span>
              </div>
            </div>
          </div>
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
