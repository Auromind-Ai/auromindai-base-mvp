'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft, Sparkles, Wallet, Coins } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function CreditRingDropdown({ user, size = 36 }) {
  const { workspaceId, user: authUser, workspaces } = useAuth();
  const currentUser = user || authUser;

  const [credits, setCredits] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [wccBalance, setWccBalance] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const router = useRouter();

  // Fetch AI credits summary
  useEffect(() => {
    async function fetchCredits() {
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
      try {
        const res = await api.getCreditSummary(workspaceId);
        setCredits(res.data ?? res ?? null);

        // Set workspace object matching active workspaceId
        if (workspaces && workspaces.length > 0) {
          const activeWs = workspaces.find(w => w.id === workspaceId);
          if (activeWs) setWorkspace(activeWs);
        }
      } catch (err) {
        console.warn("Failed to fetch credits:", err?.message || err);
      }
    }
    fetchCredits();
  }, [workspaceId, workspaces]);

  // Fetch WCC balance from backend when dropdown is open
  useEffect(() => {
    async function fetchWcc() {
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
      try {
        const res = await api.getWccBalance(workspaceId);
        setWccBalance(parseFloat(res.balance ?? res.data?.balance ?? 0));
      } catch (err) {
        console.warn("Failed to fetch WCC balance:", err?.message || err);
      }
    }
    if (isOpen) {
      fetchWcc();
      // Compute fixed position from button rect
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 14,
          right: window.innerWidth - rect.right,
        });
      }
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCredits = (value, precision = 2) => {
    if (value === undefined || value === null || isNaN(Number(value))) return '—';
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  };

  const balance = credits?.credits_balance ?? 2450;
  const added = credits?.credits_added ?? 3000;
  const used = Math.max(0, added - balance);
  const percentUsed = added > 0 ? Math.min(100, (used / added) * 100) : 0;
  const percentRemaining = Math.max(0, 100 - percentUsed);
  
  const radius = (size / 2) - 2; // slightly smaller than half to fit stroke
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentRemaining / 100) * circumference;

  // Calculate estimated WhatsApp marketing messages
  const estMarketingMsgs = Math.floor(wccBalance / 1.25);

  // On mobile, use left/right insets for full-width; on sm+ anchor to button's right edge
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const panelStyle = isMobile
    ? { top: dropdownPos.top, left: 16, right: 16 }
    : { top: dropdownPos.top, right: dropdownPos.right };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Ring Button with Avatar */}
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full hover:scale-105 transition-transform relative focus:outline-none"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 transform -rotate-90 pointer-events-none">
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" fill="none" />
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            stroke={percentRemaining < 15 ? "#ef4444" : "#814AC8"} 
            strokeWidth="2.5" fill="none" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {currentUser ? (
          <div className="rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold" style={{ width: size - 10, height: size - 10, fontSize: size * 0.35 }}>
            {currentUser.email?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-[#D4D4D4]">
             {/* Fallback */}
          </div>
        )}
      </button>

      {/* ElevenLabs-style Dropdown */}
      {isOpen && (
        <div
          className="fixed max-w-80 sm:w-80 bg-[#0c0c12] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-[13px] text-[#EDEDED] font-sans"
          style={panelStyle}
        >
          
          {/* Section 1: AI Model Messages Balance */}
          <div className="p-5 bg-gradient-to-b from-purple-950/20 to-transparent">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles size={14} />
                <span className="font-bold text-xs uppercase tracking-wider">AI Models Usage</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {percentRemaining.toFixed(0)}% Left
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-white">{formatCredits(balance, 2)}</span>
                <span className="text-zinc-500 text-xs font-semibold">/ {formatCredits(added, 2)} AI Messages</span>
              </div>
              
              {/* ElevenLabs Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-purple-500 transition-all duration-500" 
                  style={{ width: `${percentRemaining}%` }} 
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Used for LLMs (Sonnet, Groq, etc.)</p>
            </div>
          </div>

          {/* Section 2: Meta WhatsApp Prepaid Balance */}
          <div className="p-5 border-t border-white/5 bg-gradient-to-b from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Wallet size={14} />
                <span className="font-bold text-xs uppercase tracking-wider">WhatsApp Wallet</span>
              </div>
              <button 
                onClick={() => { setIsOpen(false); router.push('/user/admin/credits?tab=wcc'); }}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-colors"
              >
                Recharge
              </button>
            </div>
            
            <div className="space-y-1">
              <div className="text-lg font-black text-white">
                ₹{wccBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>≈ {estMarketingMsgs.toLocaleString()} Marketing messages</span>
              </div>
            </div>
          </div>

          {/* Workspace Footer */}
          <div className="p-4 border-t border-white/5 bg-[#12121c]/40 flex items-center justify-between group cursor-pointer" onClick={() => { setIsOpen(false); router.push('/user/admin/credits'); }}>
            <div>
              <div className="font-bold text-xs text-[#E5E5E5] flex items-center gap-1">
                {workspace?.name || 'My Workspace'}
              </div>
              <div className="text-zinc-500 text-[10px] mt-0.5 font-bold uppercase tracking-wider">Manage Credits & Wallet</div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#1a1a24] flex items-center justify-center text-zinc-400 group-hover:text-white border border-white/5 transition-colors">
              <ArrowRightLeft size={13} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
