'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Zap } from 'lucide-react';
import api from '@/lib/api';

export default function CreditDisplay() {
  const { workspaceId } = useAuth();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
      try {
        const res = await api.getCreditSummary(workspaceId);
        setCredits(res.data ?? res ?? null);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Defer to avoid blocking render
    const timeout = setTimeout(fetchCredits, 500);
    return () => clearTimeout(timeout);
  }, [workspaceId]);

  if (loading || !credits) {
    return (
      <div className="px-4 py-3 mx-3 mb-2 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2">
        <div className="h-3 w-1/2 rounded-full shimmer-bg shimmer-container" />
        <div className="h-1.5 w-full rounded-full bg-white/10" />
      </div>
    );
  }

  const balance = credits.credits_balance || 0;
  const added = credits.credits_added || 0;
  const percentUsed = credits.usage_percent || 0;
  
  // Color the bar based on usage (warning when > 80%, danger when > 95%)
  let barColor = "bg-indigo-500";
  if (percentUsed > 95) barColor = "bg-red-500";
  else if (percentUsed > 80) barColor = "bg-orange-500";

  return (
    <div className="px-4 py-3 mx-3 mb-2 rounded-lg bg-[#202020] border border-[var(--notion-border)] transition-colors hover:bg-[var(--notion-hover)] group cursor-pointer" onClick={() => window.location.href = '/user/admin/credits'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          <span className="text-xs font-medium text-[#D4D4D4]">Credits</span>
        </div>
        <span className="text-xs text-[#9b9b9b]">
          {balance.toLocaleString()} left
        </span>
      </div>
      
      {added > 0 ? (
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`} 
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      ) : (
        <div className="text-[10px] text-[#7e7e7e] mt-1">Pay as you go</div>
      )}
    </div>
  );
}
