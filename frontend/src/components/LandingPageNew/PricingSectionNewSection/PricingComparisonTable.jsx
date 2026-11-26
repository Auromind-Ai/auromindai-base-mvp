'use client';

import React, { useState } from 'react';
import {
  Check,
  MessageSquare,
  Bot,
  Zap,
  Users,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import {
  WhatsAppBrandIcon,
  InstagramBrandIcon,
  TwilioBrandIcon,
} from '@/components/BrandChannelIcons';
import {
  buildTableTiers,
  buildComparisonSections,
} from '@/lib/utils/pricingMapper';

function renderCategoryIcon(iconKey) {
  switch (iconKey) {
    case 'message-square':
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
    case 'bot':
      return <Bot className="w-4 h-4 text-indigo-400" />;
    case 'zap':
      return <Zap className="w-4 h-4 text-amber-400" />;
    case 'users':
      return <Users className="w-4 h-4 text-pink-400" />;
    case 'shield-check':
    default:
      return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
  }
}

function ComparisonMatrixCell({ value, capability, tier }) {
  const isBusiness = tier?.isFeatured || tier?.key === 'business';
  const channels = Array.isArray(tier?.channels) ? tier.channels : [];

  if (!value || value === '—' || value === '-') {
    return <span className="text-zinc-600 font-light text-base select-none">—</span>;
  }

  // Dynamic channel icon stack driven by DB allowed_channels
  if (capability === 'Supported Channels') {
    const hasWA = channels.includes('whatsapp');
    const hasIG = channels.includes('instagram');
    const hasTwilio = channels.includes('twilio');

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center -space-x-1.5">
          {hasWA && (
            <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center ring-2 ring-[#0b0c14] shadow-[0_0_8px_rgba(37,211,102,0.45)] z-30">
              <WhatsAppBrandIcon className="w-3 h-3" />
            </div>
          )}
          {hasIG && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] text-white flex items-center justify-center ring-2 ring-[#0b0c14] shadow-[0_0_8px_rgba(225,48,108,0.45)] z-20">
              <InstagramBrandIcon className="w-3 h-3" />
            </div>
          )}
          {hasTwilio && (
            <div className="w-6 h-6 rounded-full bg-[#F22F46] text-white flex items-center justify-center ring-2 ring-[#0b0c14] shadow-[0_0_8px_rgba(242,47,70,0.45)] z-10">
              <TwilioBrandIcon className="w-3 h-3" />
            </div>
          )}
        </div>
        <span className={`text-[11px] font-mono ${isBusiness ? 'text-purple-200 font-bold' : 'text-zinc-300 font-medium'}`}>
          {value}
        </span>
      </div>
    );
  }

  if (value.startsWith('✓') || value.includes('Enabled')) {
    const cleanLabel = value.replace('✓', '').trim();
    if (isBusiness) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
          <Check className="w-3.5 h-3.5 text-purple-300 stroke-[3]" />
          <span>{cleanLabel || 'Included'}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
        <span>{cleanLabel || 'Included'}</span>
      </div>
    );
  }

  if (value.toLowerCase().startsWith('unlimited')) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isBusiness ? 'text-purple-200' : 'text-zinc-200'}`}>
        <Check className="w-3.5 h-3.5 text-purple-400 stroke-[2.5]" />
        <span>{value}</span>
      </div>
    );
  }

  if (
    value.includes('Full event-driven') ||
    value.includes('CRM + AI') ||
    value.includes('Private Vector') ||
    value.includes('Managed Meta') ||
    value.includes('Priority queue')
  ) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isBusiness ? 'text-purple-200' : 'text-white'}`}>
        <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 stroke-[2.5]" />
        <span>{value}</span>
      </div>
    );
  }

  return (
    <span className={`text-xs sm:text-[13px] ${isBusiness ? 'text-purple-100 font-semibold' : 'text-zinc-300 font-normal'}`}>
      {value}
    </span>
  );
}

export default function PricingComparisonTable({
  billing = 'annual',
  dbPlans = [],
  gstRate = 18,
  loading = false,
  error = null,
}) {
  const TABLE_TIERS = buildTableTiers(dbPlans, billing);
  const SECTIONS = buildComparisonSections(dbPlans);
  const [collapsedSections, setCollapsedSections] = useState({});
  const scrollWrapperRef = React.useRef(null);

  const toggleSection = (catIdx) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [catIdx]: !prev[catIdx],
    }));
  };

  const allCollapsed = SECTIONS.length > 0 && SECTIONS.every((_, idx) => !!collapsedSections[idx]);

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const all = {};
      SECTIONS.forEach((_, idx) => {
        all[idx] = true;
      });
      setCollapsedSections(all);
    }
  };

  const scrollToPlan = (index) => {
    if (!scrollWrapperRef.current) return;
    const isMobile = window.innerWidth < 640;
    const col1Width = isMobile ? 150 : 220;
    const colWidth = isMobile ? 115 : 135;
    const scrollTarget = index === 0 ? 0 : col1Width + index * colWidth - 100;
    scrollWrapperRef.current.scrollTo({
      left: Math.max(0, scrollTarget),
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1380px] mx-auto mt-14 sm:mt-20 md:mt-28 px-2 sm:px-4 lg:px-6">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0c13] p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-white/[0.05] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || TABLE_TIERS.length === 0) {
    return null;
  }

  return (
    <div
      className="w-full max-w-[1380px] min-w-0 mx-auto mt-14 sm:mt-20 md:mt-28 px-2 sm:px-4 lg:px-6 font-['Poppins',sans-serif]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="text-left mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-xs text-zinc-300 mb-2 sm:mb-3 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="uppercase tracking-widest text-[9px] sm:text-[10px] font-semibold text-purple-200">
              FEATURE MATRIX
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Compare every{' '}
            <span className="bg-gradient-to-r from-[#F97316] via-[#EC4899] to-[#A855F7] bg-clip-text text-transparent">
              capability.
            </span>
          </h2>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-zinc-400 max-w-xl">
            Detailed side-by-side feature matrix synced with live plan entitlements.{' '}
            <span className="text-purple-300 font-medium">All plans include {gstRate}% GST.</span>
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 text-xs font-semibold tracking-wide transition-all self-start sm:self-end cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]"
        >
          <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${allCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </button>
      </div>

      {/* Mobile Plan Jump Strip */}
      <div className="block sm:hidden mb-4 p-2 rounded-2xl bg-[#0b0c14] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold text-zinc-400">Quick plan jump:</span>
          <span className="text-[10px] text-purple-300 flex items-center gap-1">
            ← swipe table →
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TABLE_TIERS.map((tier, idx) => (
            <button
              key={`mobile-tab-${tier.key}`}
              type="button"
              onClick={() => scrollToPlan(idx)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                tier.isFeatured
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                  : 'bg-white/[0.04] text-zinc-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {tier.name}
              {tier.isFeatured && ' ★'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="w-full max-w-full min-w-0 rounded-2xl border border-white/[0.08] bg-[#0b0c13] shadow-2xl overflow-hidden">
        <div
          ref={scrollWrapperRef}
          className="w-full max-w-full min-w-0 overflow-x-auto"
          style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
        >
          <table className="w-full min-w-[820px] sm:min-w-[1050px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[150px] sm:w-[220px] md:w-[22%] md:min-w-[240px]" />
              {TABLE_TIERS.map((tier) => (
                <col key={`col-${tier.key}`} className="w-[110px] sm:w-[130px] md:w-[13%] md:min-w-[135px]" />
              ))}
            </colgroup>

            <thead className="bg-[#0e0f18] border-b border-white/[0.08]">
              <tr className="border-b border-white/[0.08]">
                <th className="py-4 sm:py-5 px-3 sm:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider sticky left-0 bg-[#0e0f18] z-20 shadow-[2px_0_10px_rgba(0,0,0,0.6)] align-bottom">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-zinc-300">
                      Capabilities &amp; Features
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 font-normal lowercase tracking-normal">
                      Click section to collapse
                    </span>
                  </div>
                </th>

                {TABLE_TIERS.map((tier) => (
                  <th
                    key={tier.key}
                    className={`py-4 sm:py-5 px-1.5 sm:px-3 text-center align-bottom transition-all ${
                      tier.isFeatured
                        ? 'bg-purple-950/40 border-x-2 border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                        : 'border-r border-white/[0.04]'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {tier.badge ? (
                        <span
                          className={`text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full tracking-wider mb-1.5 sm:mb-2 ${
                            tier.isFeatured
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                              : 'bg-white/[0.06] text-zinc-400 border border-white/10'
                          }`}
                        >
                          {tier.badge}
                        </span>
                      ) : (
                        <div className="h-[18px] sm:h-[21px] mb-1.5 sm:mb-2" />
                      )}

                      <span
                        className={`text-sm sm:text-base font-bold tracking-tight ${
                          tier.isFeatured ? 'text-purple-300 text-base sm:text-lg' : tier.key === 'creator' ? 'text-purple-400' : 'text-white'
                        }`}
                      >
                        {tier.name}
                      </span>

                      <div className="mt-0.5 sm:mt-1 flex items-baseline justify-center">
                        <span className="text-base sm:text-2xl font-extrabold text-white tracking-tight">
                          {tier.price}
                        </span>
                        {tier.period && (
                          <span className="ml-0.5 text-[9px] sm:text-[11px] text-zinc-400 font-normal">
                            {tier.period}
                          </span>
                        )}
                      </div>

                      <a
                        href={tier.ctaHref}
                        className={`mt-2 sm:mt-3 w-full max-w-[95px] sm:max-w-[120px] py-1 sm:py-1.5 px-2 sm:px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all duration-200 block text-center cursor-pointer ${
                          tier.isFeatured
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:opacity-90'
                            : 'border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white'
                        }`}
                      >
                        {tier.ctaText}
                      </a>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {SECTIONS.map((section, catIdx) => {
                const isCollapsed = !!collapsedSections[catIdx];
                return (
                  <React.Fragment key={`section-${catIdx}`}>
                    <tr
                      onClick={() => toggleSection(catIdx)}
                      className="bg-[#10111d] border-y border-purple-500/20 cursor-pointer hover:bg-purple-950/25 transition-colors select-none group"
                      title={isCollapsed ? 'Click to expand this category' : 'Click to collapse this category'}
                    >
                      <td
                        colSpan={TABLE_TIERS.length + 1}
                        className="py-2.5 sm:py-3 px-3 sm:px-6 sticky left-0 bg-[#10111d] z-20 shadow-[2px_0_8px_rgba(0,0,0,0.5)] group-hover:bg-purple-950/30 transition-colors"
                      >
                        <div className="flex items-center justify-between w-full max-w-[calc(100vw-3rem)] sm:max-w-none">
                          <div className="flex items-center gap-2 sm:gap-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-300">
                            {renderCategoryIcon(section.icon)}
                            <span className="truncate">{section.category}</span>
                            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-mono font-normal normal-case px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] shrink-0">
                              {section.rows.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-purple-300/80 group-hover:text-purple-200 shrink-0 ml-2">
                            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 text-purple-400 ${
                                isCollapsed ? '-rotate-90' : 'rotate-0'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed &&
                      section.rows.map((row, rowIdx) => {
                        const isEven = rowIdx % 2 === 0;
                        return (
                          <tr
                            key={`row-${catIdx}-${rowIdx}`}
                            className={`border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] ${
                              isEven ? 'bg-transparent' : 'bg-white/[0.01]'
                            }`}
                          >
                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-6 text-xs sm:text-[13px] font-medium text-zinc-300 sticky left-0 bg-[#0b0c13] z-20 shadow-[2px_0_8px_rgba(0,0,0,0.6)]">
                              <div className="flex flex-col">
                                <span className="font-medium text-zinc-200 text-[11px] sm:text-[13px] leading-snug">
                                  {row.capability}
                                </span>
                                {row.tooltip && (
                                  <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 leading-tight hidden sm:inline-block">
                                    {row.tooltip}
                                  </span>
                                )}
                              </div>
                            </td>

                            {TABLE_TIERS.map((tier) => (
                              <td
                                key={`${rowIdx}-${tier.key}`}
                                className={`py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center ${
                                  tier.isFeatured
                                    ? 'bg-purple-950/25 border-x-2 border-purple-500/40 shadow-inner'
                                    : 'border-r border-white/[0.04]'
                                }`}
                              >
                                <ComparisonMatrixCell
                                  value={row.values?.[tier.key]}
                                  capability={row.capability}
                                  tier={tier}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
