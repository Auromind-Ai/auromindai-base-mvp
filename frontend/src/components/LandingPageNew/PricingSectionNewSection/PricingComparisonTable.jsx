'use client';

import React, { useState } from 'react';
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
    icon: Sparkles,
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
    icon: Bot,
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
    icon: Users,
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
    icon: Mail,
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
    icon: PlusCircle,
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
    ],
  },
];

function ValueCell({ value, isPro = false }) {
  if (value === 'check') {
    return (
      <div className="w-5 h-5 rounded-full bg-[#7C3AED]/30 border border-[#7C3AED] flex items-center justify-center mx-auto shadow-[0_0_10px_rgba(124,58,237,0.5)]">
        <Check size={11} className="text-[#C084FC] stroke-[3]" />
      </div>
    );
  }
  if (value === '-' || !value) {
    return <span className="text-zinc-600 font-medium text-xs md:text-sm">—</span>;
  }
  return (
    <span className={`text-[11px] sm:text-xs md:text-sm ${isPro ? 'text-white font-extrabold' : 'text-zinc-300 font-medium'}`}>
      {value}
    </span>
  );
}

export default function PricingComparisonTable({ onSelectPlan }) {
  const [billingCycle, setBillingCycle] = useState('monthly');

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
      <div className="sm:hidden grid grid-cols-3 gap-2 mb-4">
        {/* Mobile Free Starter */}
        <div className="bg-[#0e0d16] border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-bold text-white">Free</div>
          <div className="text-[10px] text-zinc-400">Starter</div>
        </div>

        {/* Mobile Pro */}
        <div className="bg-[#1a122e] border border-purple-500/60 rounded-xl p-2 text-center flex flex-col items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          <span className="text-[8px] bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-full px-1.5 py-0.5 mb-1 font-bold uppercase tracking-wider">
            • POPULAR
          </span>
          <div className="text-xs font-black text-white">Pro</div>
          <div className="text-[10px] text-purple-300 font-bold">
            {billingCycle === 'monthly' ? '₹199 /month' : '₹159 /month'}
          </div>
        </div>

        {/* Mobile Enterprise */}
        <div className="bg-[#0e0d16] border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-bold text-white">Enterprise</div>
          <div className="text-[10px] text-zinc-400">Let&#39;s Talk</div>
        </div>
      </div>

      {/* Top Plan Cards (Tablet & Laptop View >= 640px) */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {/* Free Starter Card */}
        <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col justify-between text-center">
          <div>
            <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-400">
              FREE STARTER
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              Free
            </div>
            <div className="text-xs text-zinc-400 mt-2 leading-relaxed font-normal min-h-[2.5rem] flex items-center justify-center">
              A controlled top-of-funnel acquisition tier.
            </div>
          </div>
          <button
            onClick={() => handleAction('free')}
            className="mt-4 w-full py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div>Get Started</div>
            <div className="text-[10px] text-zinc-400 font-normal">Free forever</div>
          </button>
        </div>

        {/* Pro Card (Hero Highlight) */}
        <div className="bg-gradient-to-b from-[#1c1333] via-[#120c22] to-[#0d0918] border border-purple-500/60 rounded-2xl p-4 md:p-5 flex flex-col justify-between text-center shadow-[0_0_30px_rgba(139,92,246,0.25)] relative overflow-hidden">
          <div>
            <span className="inline-block bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest mb-1">
              • POPULAR
            </span>
            <div className="text-xs font-extrabold tracking-widest uppercase text-purple-200">
              PRO
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {billingCycle === 'monthly' ? '₹199' : '₹159'}{' '}
              <span className="text-xs md:text-sm font-medium text-purple-300/80">/month</span>
            </div>
            <div className="text-xs text-purple-200/80 mt-2 leading-relaxed font-medium min-h-[2.5rem] flex items-center justify-center">
              {billingCycle === 'monthly'
                ? 'Billed monthly at ₹199. Cancel or upgrade anytime.'
                : 'Billed annually at ₹1,908. Save 20%.'}
            </div>
          </div>
          <button
            onClick={() => handleAction('pro')}
            className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-xs font-extrabold shadow-[0_0_25px_rgba(124,58,237,0.7)] hover:brightness-110 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div>Get Started</div>
            <div className="text-[10px] text-purple-200 font-semibold">
              {billingCycle === 'monthly' ? '₹199 / month' : '₹159 / month'}
            </div>
          </button>
        </div>

        {/* Enterprise Card */}
        <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col justify-between text-center">
          <div>
            <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-400">
              ENTERPRISE
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              Let&#39;s Talk
            </div>
            <div className="text-xs text-zinc-400 mt-2 leading-relaxed font-normal min-h-[2.5rem] flex items-center justify-center">
              For large-scale operations with dedicated infrastructure and unlimited limits.
            </div>
          </div>
          <button
            onClick={() => handleAction('enterprise')}
            className="mt-4 w-full py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div>Contact Sales</div>
            <div className="text-[10px] text-zinc-400 font-normal">Let&#39;s Talk</div>
          </button>
        </div>
      </div>

      {/* Feature Comparison Table Container */}
      <div className="w-full rounded-2xl border border-white/10 bg-[#0a0a10] overflow-hidden shadow-2xl">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="sr-only">
              <th scope="col">Feature</th>
              <th scope="col">Free</th>
              <th scope="col">Pro</th>
              <th scope="col">Enterprise</th>
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
                      colSpan={4}
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
                        <td className="w-[38%] sm:w-[34%] md:w-[31%] py-3 px-2.5 sm:px-5 text-left align-middle">
                          <div className="flex items-center gap-1.5 sm:gap-2.5">
                            {IconComp && (
                              <IconComp size={14} className="text-purple-400 shrink-0 hidden xs:block" />
                            )}
                            <span className="text-[11px] sm:text-xs md:text-sm text-zinc-300 font-medium">
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* Free Starter Value */}
                        <td className="w-[20%] sm:w-[22%] md:w-[23%] py-3 px-1 sm:px-3 text-center align-middle">
                          <ValueCell value={row.free} />
                        </td>

                        {/* Pro Value (Highlighted Column) */}
                        <td className="w-[22%] sm:w-[22%] md:w-[23%] py-3 px-1 sm:px-3 text-center align-middle bg-[#7C3AED]/[0.08] border-l border-r border-purple-500/30">
                          <ValueCell value={row.pro} isPro={true} />
                        </td>

                        {/* Enterprise Value */}
                        <td className="w-[20%] sm:w-[22%] md:w-[23%] py-3 px-1 sm:px-3 text-center align-middle">
                          <ValueCell value={row.enterprise} />
                        </td>
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
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 md:gap-4 mt-2">
        <button
          onClick={() => handleAction('free')}
          className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold text-center transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <div>Get Started with Free</div>
          <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Free forever</div>
        </button>

        <button
          onClick={() => handleAction('pro')}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-xs font-extrabold text-center shadow-[0_0_25px_rgba(124,58,237,0.7)] hover:brightness-110 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <div>Get Started with Pro</div>
          <div className="text-[10px] text-purple-200 font-semibold mt-0.5">
            {billingCycle === 'monthly' ? '₹199 / month' : '₹159 / month'}
          </div>
        </button>

        <button
          onClick={() => handleAction('enterprise')}
          className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold text-center transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <div>Contact Sales</div>
          <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Let&#39;s Talk</div>
        </button>
      </div>

      {/* Bottom CTA Action Buttons (Mobile View < 640px) */}
      <div className="sm:hidden flex flex-col gap-2.5 mt-2">
        <button
          onClick={() => handleAction('pro')}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-xs font-extrabold text-center shadow-[0_0_25px_rgba(124,58,237,0.7)]"
        >
          <div>Get Started with Pro</div>
          <div className="text-[10px] text-purple-200 font-semibold mt-0.5">
            {billingCycle === 'monthly' ? '₹199 / month' : '₹159 / month'}
          </div>
        </button>

        <button
          onClick={() => handleAction('free')}
          className="w-full py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 text-white text-xs font-semibold text-center"
        >
          <div>Get Started with Free</div>
          <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Free forever</div>
        </button>

        <button
          onClick={() => handleAction('enterprise')}
          className="w-full py-2 text-zinc-400 hover:text-white text-xs font-semibold text-center"
        >
          <div>Contact Sales</div>
          <div className="text-[10px] text-zinc-500 font-normal">Let&#39;s Talk</div>
        </button>
      </div>
    </div>
  );
}

