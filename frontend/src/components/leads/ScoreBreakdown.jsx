'use client';

import {
  Target,
  CheckCircle2,
  XCircle,
  Zap,
  ShieldAlert,
  Sparkles,
  Clock,
  MapPin,
  Phone,
  Flame,
  Droplets,
  Activity,
  Brain,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

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

function getTier(score, thresholds) {
  const hotThreshold = thresholds?.hot ?? 50;
  const warmThreshold = thresholds?.warm ?? 30;
  if (score >= hotThreshold) return 'hot';
  if (score >= warmThreshold) return 'warm';
  return 'cold';
}

const TIER_CONFIG = {
  hot: {
    label: 'Hot Lead',
    tag: 'High Buying Intent',
    icon: Flame,
    gradientText: 'from-[#FF2A6D] via-rose-500 to-[#FF5E62]',
    glowClass: 'drop-shadow-[0_0_35px_rgba(255,42,109,0.35)]',
    bgMesh: 'from-rose-500/20 via-pink-500/10 to-transparent',
    badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    dot: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]',
  },
  warm: {
    label: 'Warm Lead',
    tag: 'Active Interest',
    icon: Zap,
    gradientText: 'from-amber-300 via-amber-400 to-orange-400',
    glowClass: 'drop-shadow-[0_0_35px_rgba(251,191,36,0.35)]',
    bgMesh: 'from-amber-500/20 via-orange-500/10 to-transparent',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    dot: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]',
  },
  cold: {
    label: 'Cold Lead',
    tag: 'Early Stage',
    icon: Droplets,
    gradientText: 'from-sky-300 via-sky-400 to-indigo-400',
    glowClass: 'drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]',
    bgMesh: 'from-sky-500/20 via-indigo-500/10 to-transparent',
    badge: 'bg-sky-500/15 border-sky-500/30 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]',
    dot: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]',
  },
};

export default function ScoreBreakdown({
  breakdown,
  score = 0,
  thresholds = { hot: 50, warm: 30, cold: 0 },
  leadTier,
}) {
  if (!breakdown) return null;

  const currentScore = score ?? 0;
  // Prefer a backend-provided tier (leadTier prop, or breakdown.lead_tier) over local
  // threshold math, falling back to local computation only when neither is available.
  const tierKey = leadTier || breakdown?.lead_tier || getTier(currentScore, thresholds);
  const tier = TIER_CONFIG[tierKey] || TIER_CONFIG.cold;
  const TierIcon = tier.icon;

  const { behavioral_score = 0, intent, recency } = breakdown;

  // Gather active deterministic signals (including dynamic and custom signals)
  const activeIntents = [];
  if (intent?.signals) {
    Object.entries(intent.signals).forEach(([key, val]) => {
      if (key === 'word_count') return;
      const isActive = val === true || (val && typeof val === 'object' && val.value === true);
      if (isActive) {
        const mapped = INTENT_MAPPINGS[key] || { label: key.replace(/_/g, ' '), positive: true, icon: Sparkles };
        const snippet = val && typeof val === 'object' ? val.snippet : null;
        const reasoning = val && typeof val === 'object' ? val.reasoning : null;
        const explanation =
          (val && typeof val === 'object' && (val.explanation || val.name)) ||
          mapped.label ||
          key.replace(/_/g, ' ');

        // Support either a `points` or `weight` field on the signal, whichever the
        // backend sends. Hide the score badge entirely when neither is present,
        // rather than guessing at a value.
        const rawWeight =
          val && typeof val === 'object'
            ? (typeof val.points === 'number' ? val.points : (typeof val.weight === 'number' ? val.weight : null))
            : null;
        const points = rawWeight !== null ? `${rawWeight >= 0 ? '+' : ''}${rawWeight}` : null;
        const positive = rawWeight !== null ? rawWeight >= 0 : mapped.positive !== false;

        activeIntents.push({
          key,
          label: explanation,
          points,
          positive,
          icon: mapped.icon || Sparkles,
          snippet,
          reasoning,
          explanation,
        });
      }
    });
  }

  // Fast reply pseudo-signal based on recency
  const hasFastReply = recency?.days_inactive === 0;

  return (
    <div className="space-y-4">
      {/* 1. REALTIME SCORE HERO CARD */}
      <div className="rounded-3xl bg-gradient-to-b from-[#161226] via-[#110E1D] to-[#0D0A17] border border-white/[0.08] p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl">
        {/* Ambient background mesh glow based on tier */}
        <div
          className={`absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b ${tier.bgMesh} blur-3xl opacity-70 pointer-events-none`}
        />

        {/* Top Status Header */}
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full animate-pulse ${tier.dot}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
              Live AI Qualification
            </span>
          </div>
        </div>

        {/* Score Label */}
        <h3 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase mb-2 relative z-10">
          Realtime Score
        </h3>

        {/* Large Numerical Score with Tier Gradient */}
        <div
          className={`text-7xl sm:text-8xl font-black tabular-nums tracking-tight bg-gradient-to-r ${tier.gradientText} bg-clip-text text-transparent ${tier.glowClass} relative z-10 transition-all duration-500`}
        >
          {currentScore}
        </div>

        {/* Dynamic Tier Badge */}
        <div className="mt-4 relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wider uppercase transition-all duration-300 ${tier.badge}`}
          >
            <TierIcon size={14} className="shrink-0" />
            <span>{tier.label}</span>
            <span className="text-white/40">•</span>
            <span className="text-[11px] font-medium tracking-normal capitalize opacity-90">
              {tier.tag}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SCORE METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Behavioral Score Card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#151124] to-[#100D1C] border border-white/[0.07] p-4 sm:p-5 relative overflow-hidden group hover:border-[#7C4DFF]/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#9E7BFF] flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Behavioral Score
              </p>
            </div>
            <span className="text-[11px] text-zinc-500">Weight: 40%</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {behavioral_score ?? 0}
            </p>
            <span className="text-xs text-zinc-500 font-medium">/ 100</span>
          </div>

          {/* Mini progress indicator */}
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#7C4DFF] to-[#9E7BFF] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, behavioral_score ?? 0))}%` }}
            />
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Progress, recency, and customer engagement performance.
          </p>
        </div>

        {/* Semantic Intent Score Card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#151124] to-[#100D1C] border border-white/[0.07] p-4 sm:p-5 relative overflow-hidden group hover:border-[#7C4DFF]/40 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#9E7BFF] flex items-center justify-center shrink-0">
                <Brain size={16} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Semantic Intent
              </p>
            </div>
            <span className="text-[11px] text-zinc-500">Weight: 60%</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {intent?.score ?? 0}
            </p>
            <span className="text-xs text-zinc-500 font-medium">/ 100</span>
          </div>

          {/* Mini progress indicator */}
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#7C4DFF] via-[#9E7BFF] to-[#00F2FE] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, intent?.score ?? 0))}%` }}
            />
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Intent signal strength analyzed from customer messages.
          </p>
        </div>
      </div>

      {/* 3. AI INTELLIGENCE SIGNALS CHECKLIST */}
      <div className="rounded-3xl bg-gradient-to-b from-[#151124] to-[#0F0C1B] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#9E7BFF] flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">
              Why this lead is {tier.label}
            </h3>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-lg">
            {activeIntents.length} signal{activeIntents.length === 1 ? '' : 's'} detected
          </span>
        </div>

        <div className="space-y-3">
          {/* Active Intent Signals */}
          {activeIntents.length > 0 ? (
            activeIntents.map((signal) => (
              <div
                key={signal.key}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#120F20]/90 border border-white/[0.06] hover:border-[#7C4DFF]/30 hover:bg-[#161226] transition-all duration-200 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {signal.positive ? (
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                        <XCircle size={14} />
                      </div>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-wide">
                      {signal.label}
                    </p>
                  </div>
                  {signal.points !== null && signal.points !== undefined && (
                    <span
                      className={`text-xs font-bold tracking-wide px-2.5 py-0.5 rounded-lg border ${
                        signal.positive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {signal.points}
                    </span>
                  )}
                </div>

                {/* Explanation text */}
                {signal.explanation && signal.explanation !== signal.label && (
                  <p className="text-xs text-zinc-400 pl-8 leading-normal">
                    {signal.explanation}
                  </p>
                )}

                {/* Message Snippet & AI Reasoning */}
                {signal.snippet && (
                  <div className="ml-8 rounded-xl bg-[#0B0815] border border-white/[0.06] p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      <MessageSquare size={11} className="text-[#9E7BFF]" />
                      <span>Customer Message Snippet</span>
                    </div>
                    <p className="text-xs text-zinc-200 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 rounded-lg leading-relaxed select-all">
                      &ldquo;{signal.snippet}&rdquo;
                    </p>
                    {signal.reasoning && (
                      <div className="pt-1.5 border-t border-white/[0.05] flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9E7BFF] bg-[#7C4DFF]/10 border border-[#7C4DFF]/20 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} />
                          {signal.reasoning}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-zinc-400 flex items-center gap-2.5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <Clock size={15} className="text-[#7C4DFF] animate-pulse" />
              <span>Waiting for conversational signals from customer interactions...</span>
            </div>
          )}

          {/* Behavioral: Fast reply */}
          {hasFastReply && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-200">
                  Recent customer engagement (&lt; 24 hrs)
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                +{recency?.score || 0}
              </span>
            </div>
          )}

          {/* Behavioral: Inactive decay */}
          {!hasFastReply && recency?.days_inactive > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
              <div className="flex items-center gap-2.5">
                <XCircle size={15} className="text-rose-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-200">
                  Inactive for {recency.days_inactive} days
                </span>
              </div>
              <span className="text-xs font-bold text-rose-400">Decaying</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}