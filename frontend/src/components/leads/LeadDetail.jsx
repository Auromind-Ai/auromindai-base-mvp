'use client';

import { useState, useEffect } from 'react';
import { Phone, Instagram, Globe, Mail, MessageCircle, ChevronDown } from 'lucide-react';
import ConversationLog from './ConversationLog';
import ConvertLeadModal from './ConvertLeadModal';

//  Channel config 
const CHANNELS = {
  whatsapp: { icon: Phone, label: 'WhatsApp', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-400/10' },
  web: { icon: Globe, label: 'Web', color: 'text-sky-400', bg: 'bg-sky-400/10' },
  email: { icon: Mail, label: 'Email', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  twilio: { icon: MessageCircle, label: 'Twilio', color: 'text-blue-400', bg: 'bg-blue-400/10' },
};
const DEFAULT_CHANNEL = { icon: Globe, label: 'Unknown', color: 'text-zinc-400', bg: 'bg-zinc-400/10' };

function getChannel(source) {
  if (!source) return DEFAULT_CHANNEL;
  return CHANNELS[source.toLowerCase()] || DEFAULT_CHANNEL;
}

function getScoreColor(score) {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-zinc-500';
}

function getScoreBadgeBg(score) {
  if (score >= 75) return 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400';
  if (score >= 50) return 'bg-amber-400/10 border-amber-400/20 text-amber-400';
  return 'bg-zinc-600/10 border-zinc-500/20 text-zinc-400';
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusLabel(status) {
  switch (status) {
    case 'new': return 'New';
    case 'active': return 'Active';
    case 'converted': return 'Converted';
    case 'lost': return 'Lost';
    default: return status || 'New';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'new': return 'bg-blue-500/20 text-blue-400 border border-blue-500/10';
    case 'active': return 'bg-green-500/20 text-green-400 border border-green-500/10';
    case 'converted': return 'bg-purple-500/20 text-purple-400 border border-purple-500/10';
    case 'lost': return 'bg-gray-500/20 text-gray-400 border border-gray-500/10';
    default: return 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/10';
  }
}

function getStatusDot(status) {
  switch (status) {
    case 'active': return 'bg-green-400';
    case 'new': return 'bg-blue-400';
    case 'converted': return 'bg-purple-400';
    case 'lost': return 'bg-gray-400';
    default: return 'bg-zinc-400';
  }
}

//  Skeleton 
function DetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-6 animate-pulse overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center gap-5 pb-6 border-b border-white/5">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-zinc-800 rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-zinc-800 rounded-lg" />
            <div className="h-5 w-16 bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="h-3 w-16 bg-zinc-800 rounded mx-auto" />
          <div className="h-8 w-14 bg-zinc-800 rounded mx-auto" />
        </div>
      </div>
      {/* Chat skeleton */}
      <div className="flex-1 rounded-3xl bg-[#121218] border border-white/5 p-6 space-y-4">
        <div className="h-4 w-32 bg-zinc-800 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="h-12 w-2/3 bg-zinc-800 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadDetail({ lead, loading, onMobileBack }) {
  const [localLead, setLocalLead] = useState(lead);
  const [showConvert, setShowConvert] = useState(false);

  useEffect(() => {
    setLocalLead(lead);
  }, [lead]);

  if (loading) return <DetailSkeleton />;

  if (!localLead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto">
            <MessageCircle size={24} className="text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Select a lead to view details</p>
          <p className="text-xs text-zinc-600">Click on a lead from the list</p>
        </div>
      </div>
    );
  }

  const ch = getChannel(localLead.source);
  const ChIcon = ch.icon;
  const score = localLead.score ?? 0;
  const budget =
    localLead.budget_min != null && localLead.budget_max != null
      ? `₹${Number(localLead.budget_min).toLocaleString()} - ₹${Number(localLead.budget_max).toLocaleString()}`
      : localLead.budget_min != null
      ? `₹${Number(localLead.budget_min).toLocaleString()}+`
      : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile back button */}
            {onMobileBack && (
              <button
                onClick={onMobileBack}
                className="lg:hidden w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 shrink-0"
              >
                ←
              </button>
            )}

            {/* Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-base font-bold text-white shadow-xl shadow-indigo-600/20 border border-white/10 shrink-0">
              {getInitials(localLead.name)}
            </div>

            {/* Name + Badges */}
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight truncate">
                {localLead.name || localLead.phone || 'Unknown Lead'}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Source */}
                <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md ${ch.bg} ${ch.color}`}>
                  <ChIcon size={10} />
                  {ch.label}
                </span>
                {/* Status */}
                <span className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md ${getStatusBadgeClass(localLead.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(localLead.status)}`} />
                  {getStatusLabel(localLead.status)}
                </span>
                {/* Convert Button */}
                {localLead.status !== 'converted' && localLead.status !== 'lost' && (
                  <button
                    onClick={() => setShowConvert(true)}
                    className="flex items-center justify-center px-2.5 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-[10px] font-bold text-white transition-colors border border-purple-500/30 shadow-md shadow-purple-600/10 active:scale-95 cursor-pointer"
                  >
                    Mark as Converted
                  </button>
                )}
                {/* Budget */}
                {budget && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/5 border border-white/10 text-indigo-400">
                    {budget}
                  </span>
                )}
                {/* Phone */}
                {localLead.phone && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {localLead.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-600 block">
              Lead Score
            </span>
            <span className={`text-3xl font-black tabular-nums ${getScoreColor(score)}`}>
              {score}
              <span className="text-lg">%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4">
        <ConversationLog
          messages={localLead.conversation_log || []}
          conversationId={localLead.conversation_id}
        />
      </div>

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={showConvert}
        onClose={() => setShowConvert(false)}
        lead={localLead}
        onSuccess={(updated) => {
          setLocalLead((prev) => ({
            ...prev,
            status: 'converted',
            score: updated.score,
          }));

          // Dispatch a custom event to notify parent routes or lists to refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lead-converted', { detail: updated }));
          }
        }}
      />
    </div>
  );
}
