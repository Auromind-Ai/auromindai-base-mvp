'use client';

import { Users, Clock, CheckCircle2, Calendar, Sparkles, AlertCircle } from 'lucide-react';

const MOCK_LEADS = [
  { id: 1, name: 'Ananya Patel', email: 'ananya@company.com', status: 'pending', scheduledFor: 'Today, 3:00 PM', aiDraft: 'Following up on our conversation about your Q1 goals...' },
  { id: 2, name: 'Vikram Singh', email: 'vikram@startup.io', status: 'sent', scheduledFor: 'Yesterday', aiDraft: null },
  { id: 3, name: 'Neha Gupta', email: 'neha@enterprise.com', status: 'overdue', scheduledFor: '2 days ago', aiDraft: 'Hi Neha, just checking in on the proposal we discussed...' },
  { id: 1, name: 'Ananya Patel', email: 'ananya@company.com', status: 'pending', scheduledFor: 'Today, 3:00 PM', aiDraft: 'Following up on our conversation about your Q1 goals...' },
  { id: 2, name: 'Vikram Singh', email: 'vikram@startup.io', status: 'sent', scheduledFor: 'Yesterday', aiDraft: null },
  { id: 3, name: 'Neha Gupta', email: 'neha@enterprise.com', status: 'overdue', scheduledFor: '2 days ago', aiDraft: 'Hi Neha, just checking in on the proposal we discussed...' },
];

export default function FollowUpsPage() {

  return (

    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 lg:space-y-10 mt-6 lg:mt-10">

      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight">
          Follow-Up Manager
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Never miss a lead or promise again.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 opacity-90" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border border-white/10" />

          <div className="relative p-4 lg:p-6 flex items-center gap-4">
            <Users className="text-white/80 w-4 h-4 sm:w-5 sm:h-5" />
            <div>
              <div className="text-lg sm:text-xl lg:text-3xl font-bold text-white">24</div>
              <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide">Active Leads</div>
            </div>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden">

          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 opacity-90" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border border-white/10" />

          <div className="relative p-4 lg:p-6 flex items-center gap-3">
            <Clock className="text-white/80 w-4 h-4 sm:w-5 sm:h-5" />
            <div>
              <div className="text-lg sm:text-xl lg:text-3xl font-bold text-white">5</div>
              <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide">Pending Today</div>
            </div>
          </div>

        </div>

        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 opacity-90" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border border-white/10" />

          <div className="relative p-4 lg:p-6 flex items-center gap-3">
            <CheckCircle2 className="text-white/80 w-4 h-4 sm:w-5 sm:h-5" />
            <div>
              <div className="text-lg sm:text-xl lg:text-3xl font-bold text-white">18</div>
              <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide">Converted</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* FOLLOW UPS */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0f0f15]">

          <div className="p-5 border-b border-white/10 flex justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-white">
              Upcoming Follow-Ups
            </h2>

            <span className="text-xs text-zinc-400">
              {MOCK_LEADS.length} tasks
            </span>
          </div>

          <div className="divide-y divide-white/5">

            {MOCK_LEADS.map((lead) => (

              <div
                key={lead.id}
                className="p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 hover:bg-white/5 transition"
              >

                {/* LEFT */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-semibold">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      {lead.name}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {lead.email}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Calendar size={14} />
                    {lead.scheduledFor}
                  </div>

                  {lead.aiDraft && (
                    <button className="flex items-center gap-2 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20">
                      <Sparkles size={12} />
                      Approve AI Draft
                    </button>

                  )}

                  {lead.status === 'sent' && (
                    <span className="px-3 py-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SENT
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI PANEL */}
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 lg:p-6">

          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Sparkles size={16} />
            AI Assistant
          </div>

          <div className="space-y-4">

            <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-xs sm:text-sm text-zinc-300">
              3 leads haven't responded in 5 days. Suggested follow-up ready.
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-xs sm:text-sm text-zinc-300">
              Vikram Singh has high engagement score today.
            </div>

            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-xs sm:text-sm font-semibold">
              Generate Follow-ups
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}