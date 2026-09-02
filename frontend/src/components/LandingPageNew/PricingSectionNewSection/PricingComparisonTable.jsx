'use client';

import React, { useState, useEffect } from 'react';
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
import api from '@/lib/api';

function ValueCell({ value, isFeatured = false }) {
  if (value === 'check' || value === true) {
    return (
      <div className="w-5 h-5 rounded-full bg-[#7C3AED]/30 border border-[#7C3AED] flex items-center justify-center mx-auto shadow-[0_0_10px_rgba(124,58,237,0.5)]">
        <Check size={11} className="text-[#C084FC] stroke-[3]" />
      </div>
    );
  }
  if (value === '-' || value === false || value === null || value === undefined) {
    return <span className="text-zinc-600 font-medium text-xs md:text-sm">—</span>;
  }
  return (
    <span className={`text-[11px] sm:text-xs md:text-sm ${isFeatured ? 'text-white font-extrabold' : 'text-zinc-300 font-medium'}`}>
      {value}
    </span>
  );
}

function formatStorage(mb) {
  if (!mb || mb <= 0) return '—';
  if (mb >= 1024) return `${mb / 1024} GB`;
  return `${mb} MB`;
}

function formatLimit(val, suffix = '') {
  if (val === -1 || val === null || val === undefined) return 'Unlimited';
  if (val === 0) return '—';
  return `${Number(val).toLocaleString('en-IN')}${suffix}`;
}

export default function PricingComparisonTable({ 
  plans: propPlans, 
  onSelectPlan, 
  billingCycle: propBillingCycle, 
  onBillingCycleChange 
}) {
  const [internalBillingCycle, setInternalBillingCycle] = useState('monthly');
  const [loadedPlans, setLoadedPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const billingCycle = propBillingCycle || internalBillingCycle;
  const setBillingCycle = onBillingCycleChange || setInternalBillingCycle;

  useEffect(() => {
    if (propPlans && Array.isArray(propPlans) && propPlans.length > 0) {
      setLoadedPlans(propPlans);
    } else {
      setLoading(true);
      api.getPricing()
        .then((data) => {
          if (data && data.plans && Array.isArray(data.plans)) {
            setLoadedPlans(data.plans);
          }
        })
        .catch((err) => console.error("Failed to load pricing for comparison table:", err))
        .finally(() => setLoading(false));
    }
  }, [propPlans]);

  const activePlans = (propPlans && propPlans.length > 0) ? propPlans : loadedPlans;

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

  if (!activePlans || activePlans.length === 0) {
    if (loading) {
      return (
        <div className="w-full text-center py-12 text-zinc-500 text-sm font-medium">
          Loading comparison table...
        </div>
      );
    }
    return null;
  }

  // Define structured feature categories based on real plan entitlements
  const featureCategories = [
    {
      category: 'USAGE & CREDITS',
      icon: Sparkles,
      rows: [
        {
          icon: Sparkles,
          name: 'AI Credits / month',
          getValue: (p) => formatLimit(p.included_ai_credits || p.credits || (p.token_limit ? p.token_limit / 1000 : 0)),
        },
        {
          icon: MessageSquare,
          name: 'WhatsApp Wallet',
          getValue: (p) => {
            const val = Number(p.included_wcc_wallet || 0);
            if (val <= 0) return '—';
            const approxMsgs = Math.round(val / 1.1);
            return `₹${val.toFixed(0)} (~${approxMsgs} msgs)`;
          },
        },
        {
          icon: Workflow,
          name: 'Flow Executions / month',
          getValue: (p) => formatLimit(p.flow),
        },
      ],
    },
    {
      category: 'AUTOMATION & KNOWLEDGE',
      icon: Bot,
      rows: [
        {
          icon: Bot,
          name: 'Active Automations',
          getValue: (p) => formatLimit(p.automation_limit),
        },
        {
          icon: BookOpen,
          name: 'Knowledge Base Documents',
          getValue: (p) => formatLimit(p.knowledge_base_limit),
        },
        {
          icon: HardDrive,
          name: 'Brain File Storage',
          getValue: (p) => formatStorage(p.storage_limit_mb),
        },
      ],
    },
    {
      category: 'CRM & MEETINGS',
      icon: Users,
      rows: [
        {
          icon: Users,
          name: 'Leads & CRM',
          getValue: (p) => formatLimit(p.lead_limit),
        },
        {
          icon: Calendar,
          name: 'Meetings / month',
          getValue: (p) => formatLimit(p.meeting_limit),
        },
      ],
    },
    {
      category: 'INTEGRATIONS & TEAM',
      icon: Mail,
      rows: [
        {
          icon: Mail,
          name: 'Gmail Connections',
          getValue: (p) => formatLimit(p.gmail_limit),
        },
        {
          icon: UserCheck,
          name: 'Team Members',
          getValue: (p) => formatLimit(p.team_limit),
        },
      ],
    },
    {
      category: 'ADVANCED FEATURES',
      icon: PlusCircle,
      rows: [
        {
          icon: PlusCircle,
          name: 'AI Credit Top-ups',
          getValue: (p) => p.allow_ai_topup ? 'check' : '-',
        },
        {
          icon: RefreshCw,
          name: 'WhatsApp Wallet Recharge',
          getValue: (p) => p.allow_wcc_recharge ? 'check' : '-',
        },
      ],
    },
  ];

  const gridColsClass = activePlans.length === 2 
    ? 'grid-cols-2' 
    : activePlans.length === 3 
    ? 'grid-cols-3' 
    : 'grid-cols-4';

  return (
    <div className="w-full max-w-6xl mx-auto mt-16 md:mt-24 px-3 sm:px-6 font-['Poppins',sans-serif]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header with Title and Monthly/Yearly Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wider uppercase">
            COMPARE PLANS
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Choose the perfect plan for your business
          </p>
        </div>

        {/* Monthly / Yearly Switcher Pill */}
        <div className="flex items-center justify-center">
          <div className="bg-[#12111d] border border-white/10 p-1 rounded-full flex items-center gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#7C3AED] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-[#7C3AED] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Top Plan Headers (Mobile View < 640px) */}
      <div className={`sm:hidden grid ${gridColsClass} gap-2 mb-4`}>
        {activePlans.map((plan) => {
          const isFeatured = plan.featured || plan.is_featured || plan.key === 'pro';
          const isFree = plan.key === 'free' || (plan.monthly_price === 0 && plan.yearly_price === 0);
          const isEnterprise = plan.key === 'enterprise';
          const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
          const displayPrice = isFree ? 'Free' : isEnterprise ? "Let's Talk" : `₹${Number(price).toLocaleString('en-IN')}`;

          return (
            <div 
              key={plan.key || plan.name}
              className={`${
                isFeatured 
                  ? 'bg-[#1a122e] border border-purple-500/60 shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                  : 'bg-[#0e0d16] border border-white/10'
              } rounded-xl p-2.5 text-center flex flex-col items-center justify-center`}
            >
              {isFeatured && (
                <span className="text-[8px] bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-full px-1.5 py-0.5 mb-1 font-bold uppercase tracking-wider">
                  • POPULAR
                </span>
              )}
              <div className="text-xs font-bold text-white capitalize">{plan.display_name || plan.name}</div>
              <div className={`text-[10px] ${isFeatured ? 'text-purple-300 font-bold' : 'text-zinc-400'}`}>
                {displayPrice} {(!isFree && !isEnterprise) ? (billingCycle === 'yearly' ? '/yr' : '/mo') : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Plan Cards (Tablet & Laptop View >= 640px) */}
      <div className={`hidden sm:grid ${gridColsClass} gap-3 md:gap-4 mb-6`}>
        {activePlans.map((plan) => {
          const isFeatured = plan.featured || plan.is_featured || plan.key === 'pro';
          const isFree = plan.key === 'free' || (plan.monthly_price === 0 && plan.yearly_price === 0);
          const isEnterprise = plan.key === 'enterprise';
          const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
          const displayPrice = isFree ? 'Free' : isEnterprise ? "Let's Talk" : `₹${Number(price).toLocaleString('en-IN')}`;

          return (
            <div
              key={plan.key || plan.name}
              className={`${
                isFeatured
                  ? 'bg-gradient-to-b from-[#1c1333] via-[#120c22] to-[#0d0918] border border-purple-500/60 shadow-[0_0_30px_rgba(139,92,246,0.25)] relative overflow-hidden'
                  : 'bg-[#0d0d14] border border-white/10'
              } rounded-2xl p-4 md:p-5 flex flex-col justify-between text-center`}
            >
              <div>
                {isFeatured ? (
                  <span className="inline-block bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest mb-1">
                    • POPULAR
                  </span>
                ) : (
                  <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-400">
                    {plan.display_name || plan.name}
                  </div>
                )}
                {isFeatured && (
                  <div className="text-xs font-extrabold tracking-widest uppercase text-purple-200">
                    {plan.display_name || plan.name}
                  </div>
                )}
                <div className="text-2xl md:text-3xl font-black text-white mt-2">
                  {displayPrice}{' '}
                  {!isFree && !isEnterprise && (
                    <span className="text-xs md:text-sm font-medium text-purple-300/80">
                      {billingCycle === 'yearly' ? '/year' : '/month'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-2 leading-relaxed font-normal min-h-[2.5rem] flex items-center justify-center">
                  {plan.description || (isFree ? 'Get started for free.' : isEnterprise ? 'For large-scale operations with dedicated infrastructure.' : 'Advanced features for scaling teams.')}
                </div>
              </div>
              <button
                onClick={() => handleAction(plan.key)}
                className={`mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  isFeatured
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-extrabold shadow-[0_0_25px_rgba(124,58,237,0.7)] hover:brightness-110'
                    : 'border border-white/15 bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                <div>{isEnterprise ? 'Contact Sales' : 'Get Started'}</div>
                <div className={`text-[10px] font-normal ${isFeatured ? 'text-purple-200 font-semibold' : 'text-zinc-400'}`}>
                  {isFree ? 'Free forever' : isEnterprise ? "Let's Talk" : `${displayPrice} / ${billingCycle === 'yearly' ? 'year' : 'month'}`}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table Container */}
      <div className="w-full rounded-2xl border border-white/10 bg-[#0a0a10] overflow-hidden shadow-2xl">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="sr-only">
              <th scope="col">Feature</th>
              {activePlans.map((p) => (
                <th key={p.key || p.name} scope="col">{p.display_name || p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureCategories.map((catGroup, idx) => {
              const CategoryIcon = catGroup.icon || Sparkles;
              return (
                <React.Fragment key={idx}>
                  {/* Category Header Row */}
                  <tr>
                    <td
                      colSpan={activePlans.length + 1}
                      className="bg-[#130f24] border-t border-b border-purple-500/20 py-2.5 px-3 sm:px-5"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon size={13} className="text-purple-400 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-purple-300">
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
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Feature Name */}
                        <td className="w-[38%] sm:w-[30%] py-3 px-2.5 sm:px-5 text-left align-middle">
                          <div className="flex items-center gap-1.5 sm:gap-2.5">
                            {IconComp && (
                              <IconComp size={14} className="text-purple-400 shrink-0 hidden xs:block" />
                            )}
                            <span className="text-[11px] sm:text-xs md:text-sm text-zinc-300 font-medium">
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* Plan Values */}
                        {activePlans.map((plan) => {
                          const isFeatured = plan.featured || plan.is_featured || plan.key === 'pro';
                          const val = row.getValue(plan);
                          return (
                            <td 
                              key={plan.key || plan.name}
                              className={`py-3 px-1 sm:px-3 text-center align-middle ${
                                isFeatured 
                                  ? 'bg-[#7C3AED]/[0.08] border-l border-r border-purple-500/30' 
                                  : ''
                              }`}
                            >
                              <ValueCell value={val} isFeatured={isFeatured} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Currency Note */}
      <div className="text-[10px] sm:text-[11px] text-zinc-500 text-center my-4 md:my-5 font-normal">
        * All prices are in INR. Taxes may apply.
      </div>

      {/* Bottom CTA Action Buttons (Tablet & Laptop View >= 640px) */}
      <div className={`hidden sm:grid ${gridColsClass} gap-3 md:gap-4 mt-2`}>
        {activePlans.map((plan) => {
          const isFeatured = plan.featured || plan.is_featured || plan.key === 'pro';
          const isFree = plan.key === 'free' || (plan.monthly_price === 0 && plan.yearly_price === 0);
          const isEnterprise = plan.key === 'enterprise';
          const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
          const displayPrice = isFree ? 'Free' : isEnterprise ? "Let's Talk" : `₹${Number(price).toLocaleString('en-IN')}`;

          return (
            <button
              key={plan.key || plan.name}
              onClick={() => handleAction(plan.key)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold text-center transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                isFeatured
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-extrabold shadow-[0_0_25px_rgba(124,58,237,0.7)] hover:brightness-110'
                  : 'border border-white/15 bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <div>{isEnterprise ? 'Contact Sales' : `Get Started with ${plan.display_name || plan.name}`}</div>
              <div className={`text-[10px] font-normal mt-0.5 ${isFeatured ? 'text-purple-200 font-semibold' : 'text-zinc-400'}`}>
                {isFree ? 'Free forever' : isEnterprise ? "Let's Talk" : `${displayPrice} / ${billingCycle === 'yearly' ? 'year' : 'month'}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
