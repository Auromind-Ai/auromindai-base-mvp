'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Check,
  Instagram,
  Bot,
  Brain,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const CREATOR_BENEFITS = [
  {
    icon: Instagram,
    gradient: 'from-[#f09433] to-[#bc1888]',
    border: 'border-pink-500/30',
    line1: 'Automate Instagram',
    line2: 'DMs & comments',
  },
  {
    icon: Bot,
    gradient: 'from-[#2e1768] to-[#160b35]',
    border: 'border-purple-500/30',
    line1: 'Deploy 2 AI agents',
    line2: '24/7 engagement',
  },
  {
    icon: Brain,
    gradient: 'from-[#21166b] to-[#100b35]',
    border: 'border-indigo-500/30',
    line1: 'Brain knowledge',
    line2: 'FAQ training',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    gradient: 'from-[#47105c] to-[#23082f]',
    border: 'border-fuchsia-500/30',
    line1: '1,000 Social leads',
    line2: 'with enrichment',
  },
];

export default function InstagramSetupChecklist({
  isIgConnected = false,
  igUsername = '',
  onOpenStep1,
  isHeroDismissed = false,
  onReopenHero,
}) {
  const router = useRouter();

  const completedCount = isIgConnected ? 1 : 0;
  const percentage = isIgConnected ? 33 : 0;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl bg-[#080911] border border-white/10 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] p-5 sm:p-6 text-white h-full flex flex-col justify-between"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0">
              <Instagram size={16} />
            </div>
            <h3 className="text-sm sm:text-[15px] font-semibold text-white tracking-tight">
              Finish your Instagram setup
            </h3>
          </div>
          <span className="text-xs text-white/60 shrink-0 font-normal">
            {completedCount} of 3 completed
          </span>
        </div>

        <p className="text-[12px] sm:text-xs text-white/60 mt-1 mb-3.5 leading-relaxed">
          Complete the remaining steps to unlock the full power of your Creator plan.
        </p>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold text-pink-400">
            {percentage}%
          </span>
        </div>

        {/* Action Steps */}
        <div className="space-y-2.5">
          {/* Step 1: Connect Instagram */}
          <div
            onClick={onOpenStep1 || (() => router.push('/channels'))}
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
              isIgConnected
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-white/[0.02] border-white/10 hover:border-pink-500/40 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isIgConnected ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80'
                }`}
              >
                {isIgConnected ? <Check size={14} /> : '1'}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Connect Instagram</p>
                <p className="text-[11px] text-zinc-400">
                  {isIgConnected ? (igUsername ? `@${igUsername} connected` : 'Connected') : 'Link professional account'}
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-semibold flex items-center gap-1 ${
                isIgConnected ? 'text-emerald-400' : 'text-pink-400 hover:text-pink-300'
              }`}
            >
              {isIgConnected ? 'Done' : 'Connect'} <ChevronRight size={13} />
            </span>
          </div>

          {/* Step 2: Configure AI Workflows */}
          <div
            onClick={() => router.push('/ai-agents')}
            className="p-3 rounded-xl border bg-white/[0.02] border-white/10 hover:border-purple-500/40 hover:bg-white/[0.04] flex items-center justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/80">
                2
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Set Up AI Agent</p>
                <p className="text-[11px] text-zinc-400">Configure DM & story replies</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Configure <ChevronRight size={13} />
            </span>
          </div>

          {/* Step 3: Train Brain */}
          <div
            onClick={() => router.push('/brain')}
            className="p-3 rounded-xl border bg-white/[0.02] border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.04] flex items-center justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/80">
                3
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Add Knowledge Base</p>
                <p className="text-[11px] text-zinc-400">Upload FAQs & documents</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Train <ChevronRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="mt-5 pt-4 border-t border-white/[0.08]">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Sparkles size={13} className="text-pink-400" />
          <span>Creator Plan Benefits</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CREATOR_BENEFITS.map((b, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between"
            >
              <b.icon size={15} className="text-pink-400 mb-1" />
              <p className="text-[10px] text-white/80 font-medium leading-tight">{b.line1}</p>
              <p className="text-[10px] text-zinc-400 leading-tight">{b.line2}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
