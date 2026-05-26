'use client';

import { Phone, Instagram, Globe, Mail, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';
import React from 'react';

// ── Channel config ──
const CHANNELS = {
  whatsapp: { icon: Phone, label: 'WhatsApp', color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-400/10', dot: 'bg-pink-400' },
  web: { icon: Globe, label: 'Web', color: 'text-sky-400', bg: 'bg-sky-400/10', dot: 'bg-sky-400' },
  email: { icon: Mail, label: 'Email', color: 'text-amber-400', bg: 'bg-amber-400/10', dot: 'bg-amber-400' },
  twilio: { icon: MessageCircle, label: 'Twilio', color: 'text-blue-400', bg: 'bg-blue-400/10', dot: 'bg-blue-400' },
};

const DEFAULT_CHANNEL = { icon: Globe, label: 'Unknown', color: 'text-zinc-400', bg: 'bg-zinc-400/10', dot: 'bg-zinc-500' };

// ── Helpers ──
function getChannel(source) {
  if (!source) return DEFAULT_CHANNEL;
  return CHANNELS[source.toLowerCase()] || DEFAULT_CHANNEL;
}

function getScoreColor(tier, score) {
  if (tier === 'hot' || score >= 75) return 'text-red-500';
  if (tier === 'warm' || score >= 40) return 'text-amber-400';
  return 'text-sky-400';
}

function getTierDot(tier, score) {
  if (tier === 'hot' || score >= 75) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
  if (tier === 'warm' || score >= 40) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
  return 'bg-sky-400';
}

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Map intent signals to badges
function getIntentBadges(signals) {
  if (!signals) return [];
  const badges = [];
  const hasPricing = signals.has_pricing === true || (signals.has_pricing && typeof signals.has_pricing === 'object' && signals.has_pricing.value === true);
  const hasUrgency = signals.has_urgency === true || (signals.has_urgency && typeof signals.has_urgency === 'object' && signals.has_urgency.value === true);
  const sharedContact = signals.shared_contact === true || (signals.shared_contact && typeof signals.shared_contact === 'object' && signals.shared_contact.value === true);

  if (hasPricing) badges.push({ id: 'pricing', label: '💰 Pricing' });
  if (hasUrgency) badges.push({ id: 'urgent', label: '🚨 Urgent' });
  if (sharedContact) badges.push({ id: 'contact', label: '📞 Contact' });
  return badges.slice(0, 2); // Show max 2 badges so it doesn't clutter
}

function LeadCardComponent({ lead, isSelected, onClick }) {
  const ch = getChannel(lead.source);
  const Icon = ch.icon;
  const badges = getIntentBadges(lead.breakdown?.intent?.signals);
  
  // We can look at the latest delta if we have history, 
  // but if not, we can infer it or simply omit if zero.
  // For UI MVP, if lead just moved, we could temporarily store movement. 
  // Let's assume we might inject `scoreDelta` in the future, if present we show it.
  const delta = lead.scoreDelta || 0; 

  return (
    <div
      onClick={onClick}
      className={`group p-3.5 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-r from-[#1a1a26] to-[#14141c] border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
          : 'hover:bg-[#16161e] border border-transparent'
        }`}
    >
      {/* Row 1: Name + Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${getTierDot(lead.lead_tier, lead.score)}`} />
          <span className="text-sm font-semibold text-white truncate">
            {lead.name || lead.phone || 'Unknown Lead'}
          </span>
          {badges.map(b => (
             <span key={b.id} className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/80 whitespace-nowrap hidden xs:inline-block">
               {b.label}
             </span>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {delta !== 0 && (
            <span className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'} flex items-center`}>
              {delta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(delta)}
            </span>
          )}
          <span className={`text-sm font-bold tabular-nums ${getScoreColor(lead.lead_tier, lead.score)}`}>
            {lead.score ?? 0}
          </span>
        </div>
      </div>

      {/* Row 2: Source + Time + Tier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${ch.bg} ${ch.color}`}>
            <Icon size={10} />
            {ch.label}
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-zinc-600/10 border-zinc-500/20 text-zinc-400 uppercase tracking-wider">
            {lead.lead_tier || 'cold'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">
          {timeAgo(lead.last_activity_at)}
        </span>
      </div>
    </div>
  );
}

export default React.memo(LeadCardComponent, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.lead.score === next.lead.score &&
    prev.lead.lead_tier === next.lead.lead_tier &&
    prev.lead.last_activity_at === next.lead.last_activity_at &&
    prev.lead.status === next.lead.status
  );
});
