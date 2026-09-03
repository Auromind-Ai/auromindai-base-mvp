'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

const HEALTH_CHECK_URL = '/api/health';
const RETRY_INTERVAL_SEC = 5;

export default function ServerHealthMonitor() {
  const [isOffline, setIsOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [countdown, setCountdown] = useState(RETRY_INTERVAL_SEC);
  const [justRestored, setJustRestored] = useState(false);

  const errorCountRef = useRef(0);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  // Ping backend /api/health directly
  const checkHealth = useCallback(async () => {
    try {
      setIsReconnecting(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(HEALTH_CHECK_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        // Server is back!
        errorCountRef.current = 0;
        setIsOffline(false);
        setIsReconnecting(false);
        setJustRestored(true);

        // Broadcast to pages that server is back
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('server-reconnected'));
          // Auto-refresh the page after 900ms so all failed API calls and UI state re-hydrate automatically
          setTimeout(() => {
            window.location.reload();
          }, 900);
        }

        setTimeout(() => {
          setJustRestored(false);
        }, 2800);
        return true;
      }
    } catch {
      // Still offline
    }
    setIsReconnecting(false);
    return false;
  }, []);

  // Listen to APIClient error events
  useEffect(() => {
    const handleConnectionError = () => {
      errorCountRef.current += 1;
      // If 2 or more failures occur, activate maintenance / reconnecting overlay
      if (errorCountRef.current >= 2 && !isOffline) {
        setIsOffline(true);
        setCountdown(RETRY_INTERVAL_SEC);
      }
    };

    const handleConnectionSuccess = () => {
      if (isOffline) {
        setIsOffline(false);
        setJustRestored(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('server-reconnected'));
          setTimeout(() => {
            window.location.reload();
          }, 900);
        }
        setTimeout(() => setJustRestored(false), 2800);
      }
      errorCountRef.current = 0;
    };

    window.addEventListener('server-connection-error', handleConnectionError);
    window.addEventListener('server-connection-success', handleConnectionSuccess);

    return () => {
      window.removeEventListener('server-connection-error', handleConnectionError);
      window.removeEventListener('server-connection-success', handleConnectionSuccess);
    };
  }, [isOffline]);

  // Handle countdown & auto-retry loop when offline
  useEffect(() => {
    if (!isOffline) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    setCountdown(RETRY_INTERVAL_SEC);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkHealth();
          return RETRY_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOffline, checkHealth]);

  // Don't render anything if everything is healthy
  if (!isOffline && !justRestored) {
    return null;
  }

  // Green "Restored" Toast
  if (justRestored) {
    return (
      <aside aria-label="Server status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#06180c]/95 border border-[#39ff7e]/40 shadow-[0_0_25px_rgba(57,255,126,0.25)] backdrop-blur-xl text-[#39ff7e]">
          <CheckCircle2 size={16} className="text-[#39ff7e] shrink-0 animate-bounce" />
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
            Connection Restored · System is back online
          </span>
        </div>
      </aside>
    );
  }

  // Amber/Purple "Reconnecting / Maintenance" Floating Bar
  return (
    <aside aria-label="Server status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[94vw] sm:max-w-xl w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0b0518]/95 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-xl text-white">
        
        {/* Left: Pulsing icon & message */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 shrink-0">
            <WifiOff size={15} className="text-amber-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-semibold text-white/95 truncate">
                System Maintenance / Reconnecting
              </p>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 hidden sm:inline-block">
                Retrying in {countdown}s
              </span>
            </div>
            <p className="text-[11px] text-white/70 truncate mt-0.5">
              System is undergoing maintenance. Your screen will auto-resume in a moment.
            </p>
          </div>
        </div>

        {/* Right: Manual Retry Button */}
        <button
          onClick={() => checkHealth()}
          disabled={isReconnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={12} className={isReconnecting ? "animate-spin" : ""} />
          <span>{isReconnecting ? "Checking..." : "Retry Now"}</span>
        </button>
      </div>
    </aside>
  );
}
