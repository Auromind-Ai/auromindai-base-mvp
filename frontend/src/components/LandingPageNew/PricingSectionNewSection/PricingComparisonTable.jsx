'use client';

import React from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Workflow, 
  Bot, 
  BookOpen, 
  HardDrive, 
  Users, 
  Calendar, 
  Mail, 
  UserCheck, 
  PlusCircle, 
  RefreshCw,
  Check
} from 'lucide-react';

const featureCategories = [
  {
    category: 'USAGE & CREDITS',
    rows: [
      {
        icon: Sparkles,
        name: 'AI Credits / month',
        free: '20,000',
        pro: '250,000',
        enterprise: '500,000',
      },
      {
        icon: MessageSquare,
        name: 'WhatsApp Wallet',
        free: '₹50 (~45 messages)',
        pro: '₹500 (~450 messages)',
        enterprise: '₹500',
      },
      {
        icon: Workflow,
        name: 'Flow Executions / month',
        free: '2',
        pro: '10',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    category: 'AUTOMATION & KNOWLEDGE',
    rows: [
      {
        icon: Bot,
        name: 'Active Automations',
        free: '2',
        pro: '50',
        enterprise: 'Unlimited',
      },
      {
        icon: BookOpen,
        name: 'Knowledge Base Documents',
        free: '5',
        pro: '100',
        enterprise: '1,000',
      },
      {
        icon: HardDrive,
        name: 'Brain File Storage',
        free: '100 MB',
        pro: '5 GB',
        enterprise: '100 GB',
      },
    ],
  },
  {
    category: 'CRM & MEETINGS',
    rows: [
      {
        icon: Users,
        name: 'Leads & CRM',
        free: '50',
        pro: '100',
        enterprise: 'Unlimited',
      },
      {
        icon: Calendar,
        name: 'Meetings / month',
        free: '10',
        pro: '500',
        enterprise: 'Unlimited',
      },
    ],
  },
  {
    category: 'INTEGRATIONS & TEAM',
    rows: [
      {
        icon: Mail,
        name: 'Gmail Connections',
        free: '1',
        pro: '5',
        enterprise: 'Unlimited',
      },
      {
        icon: UserCheck,
        name: 'Team Members',
        free: '1',
        pro: '10',
        enterprise: '50',
      },
    ],
  },
  {
    category: 'ADVANCED FEATURES',
    rows: [
      {
        icon: PlusCircle,
        name: 'AI Credit Top-ups',
        free: '-',
        pro: 'check',
        enterprise: '-',
      },
      {
        icon: RefreshCw,
        name: 'WhatsApp Wallet Recharge',
        free: '-',
        pro: 'check',
        enterprise: '-',
      },
      {
        icon: PlusCircle,
        name: 'Flow Pack Add-ons',
        free: '-',
        pro: 'check',
        enterprise: '-',
      },
    ],
  },
];

export default function PricingComparisonTable({ onSelectPlan }) {
  const handleAction = (planKey) => {
    if (onSelectPlan) {
      onSelectPlan(planKey);
    } else {
      if (planKey === 'enterprise') {
        window.location.href = 'mailto:sales@orbionagents.com?subject=Enterprise Inquiry';
      } else {
        window.location.href = `/login?redirect=${encodeURIComponent('/user/admin/billing/payment')}`;
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-16 md:mt-24 px-2 sm:px-4">
      {/* Full-height card container showing ALL rows naturally without inner scrollbar */}
      <div className="w-full rounded-[32px] border border-white/15 bg-[#08080c]/98 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(124,58,237,0.15)] relative">
        <table className="w-full text-left border-collapse min-w-[880px] relative">
          {/* Window Sticky Header - locks under navbar when scrolling down the page */}
          <thead className="border-b border-white/10">
            <tr>
              {/* Features Column Header */}
              <th className="sticky top-0 md:top-[68px] z-30 bg-[#08080c] py-7 px-6 w-[28%] align-top border-b border-r border-white/10 shadow-lg">
                <div className="flex flex-col justify-start h-full">
                  {/* Badge Row Spacer */}
                  <div className="h-7 mb-2" />
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/35 text-[11px] font-bold text-[#C084FC] uppercase tracking-widest shadow-[0_0_12px_rgba(124,58,237,0.2)]">
                      ⚡ FEATURES
                    </span>
                  </div>
                </div>
              </th>

              {/* Free Starter Header */}
              <th className="sticky top-0 md:top-[68px] z-30 bg-[#08080c]/98 backdrop-blur-2xl py-7 px-6 text-center w-[24%] align-top border-l border-b border-white/[0.08] shadow-lg">
                <div className="flex flex-col items-center justify-between h-full">
                  <div className="w-full flex flex-col items-center">
                    {/* Badge Row Spacer */}
                    <div className="h-7 mb-2" />

                    {/* Title */}
                    <div className="text-xs font-bold tracking-widest uppercase text-white/70">
                      FREE STARTER
                    </div>

                    {/* Price */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-3xl font-extrabold text-white tracking-tight">
                      Free
                    </div>

                    {/* Description */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-xs text-white/55 leading-relaxed max-w-[200px] text-center font-normal">
                      A controlled top-of-funnel acquisition tier.
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleAction('free')}
                    className="mt-6 w-full max-w-[180px] py-2.5 px-4 rounded-xl text-xs font-semibold border border-white/20 hover:border-white/50 bg-white/[0.04] hover:bg-white/10 text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Choose this plan
                  </button>
                </div>
              </th>

              {/* Pro Header (The Enhanced Hero Featured Column) */}
              <th className="sticky top-0 md:top-[68px] z-30 bg-gradient-to-b from-[#1c1333]/98 via-[#130d24]/98 to-[#0d0918]/98 backdrop-blur-2xl py-7 px-6 text-center w-[24%] align-top border-l border-r border-b border-[#7C3AED]/60 shadow-[0_0_35px_rgba(124,58,237,0.35)] relative overflow-hidden">
                {/* Ambient Top Radial Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#7C3AED]/35 blur-3xl pointer-events-none rounded-full" />
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#9B5DE5] to-transparent" />

                <div className="relative z-10 flex flex-col items-center justify-between h-full">
                  <div className="w-full flex flex-col items-center">
                    {/* Badge Row (POPULAR Sheen Badge) */}
                    <div className="h-7 mb-2 flex items-center justify-center">
                      <span className="inline-block rounded-full bg-gradient-to-r from-[#7C3AED] via-[#9B5DE5] to-[#7C3AED] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(124,58,237,0.9)] border border-purple-300/30 animate-pulse">
                        🔥 POPULAR
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-xs font-extrabold tracking-widest uppercase text-purple-200">
                      PRO
                    </div>

                    {/* Price */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-purple-100 to-[#C084FC] bg-clip-text text-transparent tracking-tight">
                      ₹199 <span className="ml-1 text-xs md:text-sm font-medium text-purple-200/80">/month</span>
                    </div>

                    {/* Description */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-xs text-purple-200/85 leading-relaxed max-w-[210px] text-center font-medium">
                      Billed monthly at ₹199. Cancel or upgrade anytime.
                    </div>
                  </div>

                  {/* High Impact Glowing CTA Button */}
                  <button
                    onClick={() => handleAction('pro')}
                    className="mt-6 w-full max-w-[190px] py-3 px-5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#7C3AED] via-[#814AC8] to-[#9B5DE5] hover:brightness-110 text-white shadow-[0_0_30px_rgba(124,58,237,0.7)] hover:shadow-[0_0_40px_rgba(124,58,237,0.9)] transform hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 cursor-pointer border border-purple-300/30"
                  >
                    Choose this plan
                  </button>
                </div>
              </th>

              {/* Enterprise Header */}
              <th className="sticky top-0 md:top-[68px] z-30 bg-[#08080c]/98 backdrop-blur-2xl py-7 px-6 text-center w-[24%] align-top border-l border-b border-white/[0.08] shadow-lg">
                <div className="flex flex-col items-center justify-between h-full">
                  <div className="w-full flex flex-col items-center">
                    {/* Badge Row Spacer */}
                    <div className="h-7 mb-2" />

                    {/* Title */}
                    <div className="text-xs font-bold tracking-widest uppercase text-white/70">
                      ENTERPRISE
                    </div>

                    {/* Price */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-3xl font-extrabold text-[#C084FC] tracking-tight">
                      Let&#39;s Talk
                    </div>

                    {/* Description */}
                    <div className="mt-2.5 h-10 flex items-center justify-center text-xs text-white/55 leading-relaxed max-w-[200px] text-center font-normal">
                      For large-scale operations with dedicated infrastructure and unlimited limits.
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleAction('enterprise')}
                    className="mt-6 w-full max-w-[180px] py-2.5 px-4 rounded-xl text-xs font-semibold border border-white/20 hover:border-white/50 bg-white/[0.04] hover:bg-white/10 text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Schedule a call
                  </button>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {featureCategories.map((catGroup, idx) => (
              <React.Fragment key={idx}>
                {/* Category Header Row */}
                <tr>
                  <td
                    colSpan={4}
                    className="py-3.5 px-6 bg-gradient-to-r from-[#171129] via-[#0d0a17] to-[#08080c] border-t border-b border-white/[0.09]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-[#9B5DE5] to-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                      <span className="text-[11px] font-extrabold tracking-[0.2em] text-[#C084FC] uppercase">
                        {catGroup.category}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Individual Feature Rows */}
                {catGroup.rows.map((row, rowIdx) => {
                  const IconComp = row.icon;
                  return (
                    <tr
                      key={rowIdx}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150 group"
                    >
                      {/* Feature Name with Sleek Icon */}
                      <td className="bg-[#08080c] py-4.5 px-6 text-sm text-white/90 flex items-center gap-3 border-r border-white/[0.06] group-hover:bg-[#0c0c14] transition-colors">
                        {IconComp && (
                          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[#C084FC] shrink-0 shadow-sm group-hover:border-[#7C3AED]/40 group-hover:text-purple-300 transition-colors">
                            <IconComp className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-medium text-[13.5px] text-white/90 group-hover:text-white transition-colors">{row.name}</span>
                      </td>

                      {/* Free Starter Value */}
                      <td className="py-4.5 px-6 text-sm text-white/70 text-center font-medium border-l border-white/[0.06]">
                        {row.free === 'check' ? (
                          <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          row.free
                        )}
                      </td>

                      {/* Pro Value (Enhanced PRO Glowing Column Body) */}
                      <td className="py-4.5 px-6 text-sm text-white text-center font-bold border-l border-r border-[#7C3AED]/40 bg-[#7C3AED]/[0.07] shadow-[inset_0_0_15px_rgba(124,58,237,0.06)] relative">
                        {row.pro === 'check' ? (
                          <div className="inline-flex p-1 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 shadow-[0_0_10px_rgba(124,58,237,0.4)]">
                            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-white font-extrabold text-[14px] tracking-wide text-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {row.pro}
                          </span>
                        )}
                      </td>

                      {/* Enterprise Value */}
                      <td className="py-4.5 px-6 text-sm text-white/75 text-center font-medium border-l border-white/[0.06]">
                        {row.enterprise === 'check' ? (
                          <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          row.enterprise
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
