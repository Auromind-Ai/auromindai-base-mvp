'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

function formatLimit(val, suffix = '') {
  if (val === -1 || val === null || val === undefined) return 'Unlimited';
  if (val === 0) return '0';
  return `${Number(val).toLocaleString('en-IN')}${suffix}`;
}

function formatStorage(mb) {
  if (!mb || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${mb / 1024} GB File Storage`;
  return `${mb} MB Storage`;
}

export default function DocsDynamicTierMatrix() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getPricing()
      .then((data) => {
        if (isMounted && data && Array.isArray(data.plans)) {
          setPlans(data.plans.filter((p) => p.key !== 'solo'));
        }
      })
      .catch((err) => {
        console.warn('Live pricing fetch failed:', err);
        if (isMounted) setError('Unable to load live pricing matrix.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 p-6 bg-white/[0.01] text-xs text-zinc-400">
        Loading live plan entitlements...
      </div>
    );
  }

  if (error || !plans || plans.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 p-6 bg-white/[0.01] text-xs text-zinc-400">
        {error || 'No active plans configured.'}
      </div>
    );
  }

  const headers = [
    'Platform Metric / Quota',
    ...plans.map((p) =>
      p.is_featured || p.key === 'business' || p.key === 'pro'
        ? `${p.display_name || p.name} (Most Popular)`
        : (p.display_name || p.name)
    ),
  ];

  const rows = [
    [
      'Subscription Price',
      ...plans.map((p) =>
        p.key === 'free' || Number(p.monthly_price) === 0
          ? (p.key === 'enterprise' ? 'Custom Quote' : '₹0 / month')
          : `₹${Number(p.monthly_price).toLocaleString('en-IN')} / month`
      ),
    ],
    [
      'Monthly AI Credits',
      ...plans.map((p) => `${formatLimit(p.included_ai_credits || p.credits)} Credits`),
    ],
    [
      'WhatsApp Wallet (WCC)',
      ...plans.map((p) => {
        const val = Number(p.included_wcc_wallet || 0);
        if (val <= 0) return '₹0';
        return `₹${val} (~${Math.round(val / 1.1)} messages)`;
      }),
    ],
    [
      'Monthly Conversations',
      ...plans.map((p) => formatLimit(p.monthly_conversations, ' / month')),
    ],
    [
      'Active Automations (Wires)',
      ...plans.map((p) => formatLimit(p.automation_limit, ' Active Automations')),
    ],
    [
      'Flow Executions / month',
      ...plans.map((p) => formatLimit(p.flow, ' Executions / month')),
    ],
    [
      'Knowledge Base Documents',
      ...plans.map((p) => formatLimit(p.knowledge_base_limit, ' Documents')),
    ],
    [
      'Brain File Storage',
      ...plans.map((p) => formatStorage(p.storage_limit_mb)),
    ],
    [
      'Leads & CRM Limit',
      ...plans.map((p) => formatLimit(p.lead_limit, ' Active Leads')),
    ],
    [
      'Meetings Scheduled / month',
      ...plans.map((p) => formatLimit(p.meeting_limit, ' Meetings / month')),
    ],
    [
      'Gmail Connections',
      ...plans.map((p) => formatLimit(p.gmail_limit, ' Connections')),
    ],
    [
      'Team Members',
      ...plans.map((p) => formatLimit(p.team_limit, ' Members')),
    ],
    [
      'AI Credit Top-ups',
      ...plans.map((p) => (p.allow_ai_topup ? 'Enabled' : 'Locked (Upgrade required)')),
    ],
    [
      'WhatsApp Wallet Recharge',
      ...plans.map((p) => (p.allow_wcc_recharge ? 'Enabled' : 'Locked (Upgrade required)')),
    ],
    [
      'Flow Pack Add-ons',
      ...plans.map((p) => (p.allow_flow_addon ? 'Enabled' : 'Locked (Upgrade required)')),
    ],
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1">
        <span className="flex items-center gap-1.5 text-violet-400">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span>Live Database Entitlements Sync Active</span>
        </span>
        <span className="text-white/50 text-[10px]">Auto-synchronizes when database entitlements change</span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.01]">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-white/[0.04] border-b border-white/10 text-zinc-300 font-semibold">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-400">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`p-3 font-sans ${
                      cIdx === 0
                        ? 'font-medium text-zinc-200'
                        : cIdx === 2
                        ? 'text-white font-semibold'
                        : 'text-zinc-300'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
