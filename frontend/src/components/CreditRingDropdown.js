'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CreditRingDropdown({ user, size = 36 }) {
  const [credits, setCredits] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchCredits() {
      try {
        const workspaceId = localStorage.getItem('workspace_id');
        if (!workspaceId) return;
        
        try {
            const storedWs = localStorage.getItem('workspace');
            if(storedWs) setWorkspace(JSON.parse(storedWs));
        } catch(e) {}

        const res = await api.getCreditSummary(workspaceId);
        setCredits(res);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      }
    }
    fetchCredits();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!credits) return null;

  const balance = credits.credits_balance || 0;
  const added = credits.credits_added || 0;
  const used = Math.max(0, added - balance);
  const percentUsed = added > 0 ? Math.min(100, (used / added) * 100) : 0;
  
  const radius = (size / 2) - 2; // slightly smaller than half to fit stroke
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentUsed / 100) * circumference;

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Ring Button with Avatar */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full hover:scale-105 transition-transform relative focus:outline-none"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 transform -rotate-90 pointer-events-none">
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            stroke={percentUsed > 90 ? "#ef4444" : "#D4D4D4"} 
            strokeWidth="2.5" fill="none" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {user ? (
          <div className="rounded-full bg-orange-600 flex items-center justify-center text-white font-bold" style={{ width: size - 12, height: size - 12, fontSize: size * 0.35 }}>
            {user.email?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-[#D4D4D4]">
             {/* Fallback if no user */}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden text-[13px] text-[#EDEDED] font-sans">
          <div className="p-4 bg-[#252525]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" className="transform -rotate-90">
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="9" stroke="#D4D4D4" strokeWidth="2" fill="none" strokeDasharray={2*Math.PI*9} strokeDashoffset={(2*Math.PI*9)*(1 - percentUsed/100)} />
                </svg>
                <span className="font-medium text-sm text-[#E5E5E5]">Balance</span>
              </div>
              <button 
                onClick={() => { setIsOpen(false); router.push('/user/admin/credits'); }}
                className="bg-white text-black px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Upgrade
              </button>
            </div>
            <div className="space-y-2 text-[#A1A1AA]">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-[#E5E5E5] font-medium">{added.toLocaleString()} credits</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining</span>
                <span className="text-[#E5E5E5] font-medium">{balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#333] bg-[#1e1e1e]">
            <div className="text-[#A1A1AA] mb-2 text-[12px]">Current workspace</div>
            <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsOpen(false)}>
              <div>
                <div className="font-medium text-sm text-[#E5E5E5]">{workspace?.name || 'My Workspace'}</div>
                <div className="text-[#A1A1AA] text-xs mt-0.5">Free plan</div>
              </div>
              <div className="w-7 h-7 rounded bg-[#2D2D2D] flex items-center justify-center text-[#A1A1AA] group-hover:text-white transition-colors">
                <ArrowRightLeft size={14} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
