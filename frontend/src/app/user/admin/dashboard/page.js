'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from "../AnimatedCounter";
import {
  Bell,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';
import { getUser, restoreAdminToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const SecretLoginBanner = () => {
    const router = useRouter();
    const isImpersonating = typeof window !== 'undefined' && localStorage.getItem('is_impersonating') === 'true';
    const user = getUser();

    if (!isImpersonating) return null;

    const handleExit = () => {
        restoreAdminToken();
        window.location.href = '/admin';
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="animate-pulse" />
                <span>Secret Login Mode: Viewing {user?.name || user?.email}'s dashboard</span>
            </div>
            <button 
                onClick={handleExit}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors border border-white/30"
            >
                Exit & Return to Admin
            </button>
        </div>
    );
};

const METRICS = [
  {
    label: 'Total Revenue',
    value: '₹12.4L',
    change: '+18.2%',
    trend: 'up',
    subtext: 'vs last month',
    gradient: 'from-blue-500 via-cyan-400 to-emerald-400'
  },
  {
    label: 'Active Leads',
    value: '124',
    change: '+12%',
    trend: 'up',
    subtext: 'vs last week',
    gradient: 'from-yellow-400 via-amber-400 to-orange-500'
  },
  {
    label: 'Conversion Rate',
    value: '18%',
    change: '-2.1%',
    trend: 'down',
    subtext: 'vs target',
    gradient: 'from-purple-500 via-fuchsia-500 to-indigo-500'
  },
  {
    label: 'Avg. Response Time',
    value: '12m',
    change: '8m',
    trend: 'neutral',
    subtext: 'improving',
    gradient: 'from-orange-600 via-red-500 to-rose-600'
  },
];

const ATTENTION_ITEMS = [
  { id: 1, name: 'Rahul Sharma', status: 'Documents Pending', time: '12 min ago', priority: 'high' },
  { id: 2, name: 'Priya Patel', status: 'Demo Not Scheduled', time: '45 min ago', priority: 'medium' },
  { id: 3, name: 'Amit Kumar', status: 'Follow-up Overdue', time: '2h ago', priority: 'high' },
  { id: 4, name: 'Sneha Gupta', status: 'Contract Review', time: '4h ago', priority: 'low' },
];

const AI_INSIGHTS = [
  { text: '3 leads from LinkedIn show high engagement today.' },
  { text: 'WhatsApp messages sent between 2–4 PM convert 15% better.' },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 overflow-y-auto custom-scrollbar">
      <SecretLoginBanner />
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white/90">Dashboard</h1>
            <p className="text-sm text-zinc-500">Good morning! Here are your key actions for today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-400 hover:bg-white/10 cursor-pointer transition-colors shadow-sm">
              <Calendar size={14} />
              <span className="hidden xs:inline">Oct 12 - Oct 18, 2023</span>
              <span className="xs:hidden">Current Week</span>
              <ChevronDown size={14} />
            </div>
            <div className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors shadow-sm">
              <Bell size={18} className="text-zinc-400" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-2 ring-[#050508]" />
            </div>
          </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative group rounded-2xl p-5 border border-white/5 bg-[#0f0f15]/50 hover:border-white/10 transition-all cursor-default overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${metric.gradient} opacity-50`} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{metric.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metric.trend === 'up' ? 'text-emerald-400 bg-emerald-400/10' : 
                  metric.trend === 'down' ? 'text-rose-400 bg-rose-400/10' : 
                  'text-zinc-400 bg-white/5'
                }`}>
                  {metric.change}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{metric.value}</span>
                <span className="text-[10px] text-zinc-600 font-medium">{metric.subtext}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          
          {/* LEFT COLUMN: ACTION CENTER & AI INSIGHTS */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* UNIFIED ACTION CENTER */}
            <section className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0f0f15]/50 backdrop-blur-xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white/90">Unified Action Center</h2>
                <button className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">Settings</button>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { id: 1, title: 'Respond to Client Inquiry (Emma R.)', type: 'Email', priority: 'High', color: 'text-emerald-400 bg-emerald-400/10' },
                  { id: 2, title: 'Review Q4 Sales Forecast', type: 'AI Analysis', priority: 'Due Today', color: 'text-zinc-400 bg-white/5' },
                  { id: 3, title: "Draft follow-up email for 'Apex Dynamics'", type: 'AI Generated', priority: 'Action needed', color: 'text-zinc-400 bg-white/5' },
                ].map((item) => (
                  <div key={item.id} className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer">
                    <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                      {item.id === 1 && <CheckCircle2 size={12} className="text-indigo-500" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white/80">{item.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.type}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${item.color}`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* AI INSIGHTS */}
            <section className="relative rounded-2xl p-8 overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] -ml-32 -mb-32" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-400 mb-6 font-semibold tracking-wide uppercase text-[10px]">
                  <Sparkles size={14} />
                  AI Insights
                </div>
                
                <h3 className="text-xl font-medium text-white/90 mb-8 max-w-md leading-relaxed">
                  Good morning, {getUser()?.name || 'User'}!<br />
                  Here are your key actions for today.
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                    <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-widest">AI Recommendation</p>
                    <p className="text-sm text-zinc-300 leading-relaxed group-hover:text-white transition-colors line-clamp-3">
                      Personalize follow-up email for Apex Dynamics based on recent interaction (High Conversion probability).
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                       <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">High Conversion probability</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Lead Score Update</p>
                      <p className="text-sm text-white/80">5 New High-intent Leads identified via LinkedIn</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Content Summary</p>
                      <p className="text-sm text-white/80">Customer feedback highlights positive reception to new feature.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: PERFORMANCE OVERVIEW */}
          <div className="space-y-8">
            {[
              { label: 'Performance Overview', sub: 'Growth Metrics (This Week)', change: '+14.5%' },
              { label: 'Engagement Analytics', sub: 'Interaction Trends (This Week)', change: '+8.2%' },
            ].map((chart, i) => (
              <section key={i} className="rounded-2xl border border-white/5 bg-[#0f0f15]/50 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white/90">{chart.label}</h2>
                    <p className="text-[10px] text-zinc-500 mt-1">{chart.sub}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{chart.change}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-end gap-2 h-[120px] mb-4">
                    {[40, 60, 45, 90, 55, 75, 85].map((v, idx) => (
                      <div key={idx} className="flex-1 relative group">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${v}%` }}
                          transition={{ delay: idx * 0.1 }}
                          className={`w-full rounded-t-sm transition-all ${idx === (i === 0 ? 3 : 5) ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
                        />
                        {idx === (i === 0 ? 3 : 5) && (
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 text-[8px] font-bold text-indigo-400 px-1 py-0.5 bg-indigo-500/20 rounded">
                             +14.5%
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-600 font-medium uppercase tracking-widest px-1">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                  </div>
                </div>
              </section>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}