'use client';

import { Target, CheckCircle2, XCircle, Zap, ShieldAlert, Sparkles, Clock, MapPin, Phone } from 'lucide-react';

const INTENT_MAPPINGS = {
  has_pricing: { label: 'Pricing intent detected', positive: true, icon: Sparkles },
  has_urgency: { label: 'Urgency detected', positive: true, icon: Zap },
  shared_contact: { label: 'Shared contact details', positive: true, icon: MapPin },
  is_specific: { label: 'Specific query', positive: true, icon: Target },
  has_number: { label: 'Budget mentioned', positive: true, icon: Target },
  has_question: { label: 'Asked a clear question', positive: true, icon: Target },
  callback_request: { label: 'Callback request', positive: true, icon: Phone },
  pincode_shared: { label: 'Pincode shared', positive: true, icon: MapPin },
  delivery_interest: { label: 'Delivery interest', positive: true, icon: Clock },
  is_vague: { label: 'Vague communication', positive: false, icon: ShieldAlert },
  negative_intent: { label: 'Negative intent', positive: false, icon: XCircle },
  pricing_intent: { label: 'Pricing conversation', positive: true, icon: Sparkles },
  payment_intent: { label: 'Payment intent', positive: true, icon: CheckCircle2 },
  budget_acceptance: { label: 'Budget accepted', positive: true, icon: CheckCircle2 },
};

function getScoreColorClass(tier) {
  if (tier === 'hot') return 'text-red-500';
  if (tier === 'warm') return 'text-amber-400';
  return 'text-sky-400';
}

function getScoreGlow(tier) {
  if (tier === 'hot') return 'drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  if (tier === 'warm') return 'drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]';
  return 'drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]';
}

export default function ScoreBreakdown({ breakdown, score, leadTier }) {
  if (!breakdown) return null;

  const { behavioral_score, intent, recency } = breakdown;
  const tier = leadTier || breakdown.lead_tier;
  const tierLabel = tier ? `${tier.charAt(0).toUpperCase()}${tier.slice(1)}` : 'Unclassified';

  // Gather active deterministic signals
  const activeIntents = [];
  if (intent?.signals) {
    Object.entries(intent.signals).forEach(([key, val]) => {
      const isActive = val === true || (val && typeof val === 'object' && val.value === true);
      if (isActive) {
        const mapping = INTENT_MAPPINGS[key] || { label: key.replaceAll('_', ' '), positive: true };
        const weight = typeof val?.weight === 'number' ? val.weight : null;
        const snippet = val && typeof val === 'object' ? val.snippet : null;
        const reasoning = val && typeof val === 'object' ? val.reasoning : null;
        const explanation = val && typeof val === 'object' ? val.explanation : mapping.label;
        activeIntents.push({
          key,
          ...mapping,
          positive: weight === null ? mapping.positive : weight >= 0,
          points: weight === null ? null : `${weight >= 0 ? '+' : ''}${weight}`,
          snippet,
          reasoning,
          explanation
        });
      }
    });
  }

  // Fast reply pseudo-signal based on recency
  const hasFastReply = recency?.days_inactive === 0;

  return (
    <div className="space-y-4">
      {/*  REALTIME SCORE  */}
      <div className="rounded-2xl bg-[#121218] border border-white/5 p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Ambient background glow based on score */}
        <div className={`absolute inset-0 opacity-20 ${tier === 'hot' ? 'bg-red-500' : tier === 'warm' ? 'bg-amber-400' : 'bg-sky-400'} blur-3xl`} />
        
        <h3 className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-2 relative z-10">
          Realtime Score
        </h3>
        
        <div className={`text-6xl font-black tabular-nums transition-all duration-500 ${getScoreColorClass(tier)} ${getScoreGlow(tier)} relative z-10`}>
          {score ?? 0}
        </div>
        <div className="mt-2 text-xs font-medium uppercase tracking-widest text-white/50 relative z-10">
          {tierLabel} Lead
        </div>
      </div>

      <div className="rounded-2xl bg-[#121218] border border-white/5 p-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Behavioral score</p>
          <p className="text-3xl font-semibold text-white">{behavioral_score ?? 0}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Progress, recency, and engagement performance.</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Semantic intent score</p>
          <p className="text-3xl font-semibold text-white">{intent?.score ?? 0}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Intent signal strength from customer messages.</p>
        </div>
      </div>

      {/*  INTELLIGENCE CHECKLIST  */}
      <div className="rounded-2xl bg-[#121218] border border-white/5 p-5">
        <h3 className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase mb-4">
          Why this lead is {tierLabel}
        </h3>

        <div className="space-y-3">
          {/* Active Intent Signals */}
          {activeIntents.length > 0 ? (
            activeIntents.map((signal) => (
              <div key={signal.key} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 hover:bg-white/[0.04] transition-all duration-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {signal.positive ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-rose-400 shrink-0" />
                    )}
                    <p className="text-[11px] font-bold text-zinc-200 tracking-wide">
                      {signal.label}
                    </p>
                  </div>
                  {signal.points !== null && <span className={`text-[10px] font-black tracking-wide px-1.5 py-0.5 rounded ${signal.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {signal.points}
                  </span>}
                </div>
                
                {/* Signal explanation */}
                {signal.explanation && (
                  <p className="text-[10px] text-zinc-400 pl-5 leading-normal">
                    {signal.explanation}
                  </p>
                )}

                {/* Message Snippet and Reasoning */}
                {signal.snippet && (
                  <div className="ml-5 mt-1.5 p-2 rounded-lg bg-zinc-950/40 border border-white/5 space-y-1 relative">
                    <p className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Snippet</p>
                    <p className="text-[11px] text-zinc-300 bg-white/[0.01] px-1.5 py-0.5 rounded leading-relaxed select-all">
                      &quot;{signal.snippet}&quot;
                    </p>
                    {signal.reasoning && (
                      <div className="pt-1 border-t border-white/5 flex items-center gap-1">
                        <Sparkles size={10} className="text-indigo-400" />
                        <span className="text-[10px] text-indigo-300 font-medium">{signal.reasoning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-[11px] text-zinc-500 flex items-center gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
              <Clock size={12} className="animate-pulse" />
              Waiting for conversational signals...
            </div>
          )}

          {/* Behavioral Signals */}
          {hasFastReply && (
            <div className="flex items-start gap-2.5 pt-2 border-t border-white/5 mt-2">
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-zinc-200">
                  Recent engagement
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400">
                +{recency?.score || 0}
              </span>
            </div>
          )}

          {/* Negative Inactivity */}
          {!hasFastReply && recency?.days_inactive > 0 && (
            <div className="flex items-start gap-2.5 pt-2 border-t border-white/5 mt-2">
              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-zinc-200">
                  Inactive for {recency.days_inactive} days
                </p>
              </div>
              <span className="text-[10px] font-bold text-rose-400">
                Decaying
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
