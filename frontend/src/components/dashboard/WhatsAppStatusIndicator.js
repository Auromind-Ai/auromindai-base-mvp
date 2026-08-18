'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// Option 6 WhatsApp Icon (Connected vs Disconnected styling)
const WhatsAppIcon = ({ isConnected }) => {
    return (
        <div className="relative flex items-center justify-center flex-shrink-0 shrink-0 w-5 h-5 sm:w-7 sm:h-7">
            {/* Ambient outer glow ring */}
            {isConnected && (
                <div 
                    className="absolute inset-0 rounded-full bg-[#14c956]/40 blur-[5px] transform scale-110"
                    aria-hidden="true" 
                />
            )}
            
            <svg 
                viewBox="0 0 48 48" 
                className="relative z-10 w-5 h-5 sm:w-7 sm:h-7" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle 
                    cx="24" 
                    cy="24" 
                    r="24" 
                    fill={isConnected ? "#14c956" : "#27272a"} 
                />
                <path 
                    d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" 
                    fill={isConnected ? "#ffffff" : "#a1a1aa"} 
                />
            </svg>
        </div>
    );
};

// 5-Dot Cross Decorative Accent (matching uploaded reference images)
const CrossDotAccent = ({ isConnected }) => {
    const color = isConnected ? "#14c956" : "#a1a1aa";

    return (
        <svg 
            className="flex-shrink-0 shrink-0 w-3.5 h-3.5 sm:w-6 sm:h-6 ml-0.5 sm:ml-1 pointer-events-none select-none z-10" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Center dot (larger & brighter with ambient glow if connected) */}
            <circle 
                cx="12" 
                cy="12" 
                r="2.2" 
                fill={color} 
                className={isConnected ? "drop-shadow-[0_0_6px_#14c956]" : ""}
            />
            {/* Top dot */}
            <circle cx="12" cy="5.5" r="1.3" fill={color} opacity="0.6" />
            {/* Bottom dot */}
            <circle cx="12" cy="18.5" r="1.3" fill={color} opacity="0.6" />
            {/* Left dot */}
            <circle cx="5.5" cy="12" r="1.3" fill={color} opacity="0.6" />
            {/* Right dot */}
            <circle cx="18.5" cy="12" r="1.3" fill={color} opacity="0.6" />
        </svg>
    );
};

export default function WhatsAppStatusIndicator() {
    const [isConnected, setIsConnected] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await api.getIntegrationStatus();
            const status = Boolean(data?.whatsapp?.connected);
            setIsConnected(status);
            if (typeof window !== 'undefined') {
                localStorage.setItem("whatsapp_connected", status ? "true" : "false");
            }
        } catch (err) {
            console.error("Failed to fetch WhatsApp integration status:", err);
            // Fallback safely to cached value if network request fails
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem("whatsapp_connected");
                if (cached !== null) {
                    setIsConnected(cached === "true");
                } else {
                    setIsConnected(false);
                }
            } else {
                setIsConnected(false);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const load = () => {
            fetchStatus().catch(() => {});
        };

        // Initial fetch from backend (single source of truth)
        load();

        // 1. Refresh when user switches back to this tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMounted) {
                load();
            }
        };

        // 2. Listen for cross-tab storage changes
        const handleStorageChange = (e) => {
            if (e.key === 'whatsapp_connected' && isMounted) {
                load();
            }
        };

        // 3. Listen for custom same-tab channel status changes
        const handleChannelStatusChange = () => {
            if (isMounted) {
                load();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('channel-status-changed', handleChannelStatusChange);

        return () => {
            isMounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('channel-status-changed', handleChannelStatusChange);
        };
    }, [fetchStatus]);

    // Loading skeleton placeholder matching exact dimensions
    if (loading && isConnected === null) {
        return (
            <div 
                className="relative h-8 sm:h-[42px] px-2 sm:px-3.5 rounded-lg sm:rounded-2xl bg-[#09090e]/80 border border-white/10 flex items-center gap-1 sm:gap-2.5 animate-pulse overflow-hidden select-none flex-shrink-0 shrink-0"
                aria-label="Loading WhatsApp Status"
            >
                <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white/10 flex-shrink-0 shrink-0" />
                <div className="w-10 sm:w-16 h-3 rounded bg-white/10" />
                <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-white/10 ml-0.5 sm:ml-1 flex-shrink-0 shrink-0" />
            </div>
        );
    }

    const connectedState = Boolean(isConnected);

    return (
        <div 
            className={`
                relative h-8 sm:h-[42px] px-2 sm:px-4 rounded-lg sm:rounded-2xl flex items-center gap-1 sm:gap-3 
                bg-[#09090e]/90 backdrop-blur-md select-none transition-all duration-300 overflow-hidden flex-shrink-0 shrink-0
                ${connectedState 
                    ? 'border border-[#14c956]/35 shadow-[0_0_15px_rgba(20,201,86,0.15)]' 
                    : 'border border-white/10 shadow-none'
                }
            `}
        >
            {/* Left WhatsApp Icon with ambient glow */}
            <WhatsAppIcon isConnected={connectedState} />

            {/* Status Text (Connected / Disconnected) */}
            <span 
                className={`
                    text-[10px] sm:text-xs font-semibold tracking-tight whitespace-nowrap z-10 transition-colors duration-300 flex-shrink-0 shrink-0
                    ${connectedState ? 'text-[#14c956]' : 'text-zinc-400'}
                `}
            >
                {connectedState ? 'Connected' : 'Disconnected'}
            </span>

            {/* Decorative 5-Dot Cross Accent on the Right */}
            <CrossDotAccent isConnected={connectedState} />
        </div>
    );
}
