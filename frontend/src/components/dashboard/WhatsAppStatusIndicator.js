'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPen, Lock, Instagram, ArrowUpRight } from 'lucide-react';
import api from '@/lib/api';
import { useWorkspaceEntitlements } from '@/hooks/useWorkspaceEntitlements';

// WhatsApp Icon
const WhatsAppIcon = ({ isConnected }) => {
    return (
        <div className="relative flex items-center justify-center flex-shrink-0 shrink-0 w-5 h-5 sm:w-7 sm:h-7">
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

// Instagram Icon
const InstagramIcon = ({ isConnected }) => {
    return (
        <div className="relative flex items-center justify-center flex-shrink-0 shrink-0 w-5 h-5 sm:w-7 sm:h-7">
            {isConnected && (
                <div 
                    className="absolute inset-0 rounded-full bg-pink-500/40 blur-[5px] transform scale-110"
                    aria-hidden="true" 
                />
            )}
            <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${isConnected ? 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]' : 'bg-[#27272a]'}`}>
                <Instagram size={14} className={isConnected ? "text-white" : "text-zinc-400"} />
            </div>
        </div>
    );
};

// 5-Dot Cross Decorative Accent
const CrossDotAccent = ({ isConnected, activeColor = "#14c956" }) => {
    const color = isConnected ? activeColor : "#a1a1aa";

    return (
        <svg 
            className="flex-shrink-0 shrink-0 w-3.5 h-3.5 sm:w-6 sm:h-6 ml-0.5 sm:ml-1 pointer-events-none select-none z-10" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <circle 
                cx="12" 
                cy="12" 
                r="2.2" 
                fill={color} 
                className={isConnected ? `drop-shadow-[0_0_6px_${activeColor}]` : ""}
            />
            <circle cx="12" cy="5.5" r="1.3" fill={color} opacity="0.6" />
            <circle cx="12" cy="18.5" r="1.3" fill={color} opacity="0.6" />
            <circle cx="5.5" cy="12" r="1.3" fill={color} opacity="0.6" />
            <circle cx="18.5" cy="12" r="1.3" fill={color} opacity="0.6" />
        </svg>
    );
};

export default function WhatsAppStatusIndicator() {
    const router = useRouter();
    const { allowedChannels, planName, loading: entLoading } = useWorkspaceEntitlements();
    const [channelsStatus, setChannelsStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const isCreatorPlan = allowedChannels.length === 1 && allowedChannels[0] === 'instagram';
    const hasNoChannels = allowedChannels.length === 0;

    const handleEditProfile = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('open_whatsapp_profile_modal', 'true');
            if (window.location.pathname === '/channels' || window.location.pathname === '/user/admin/channels') {
                window.dispatchEvent(new CustomEvent('open-whatsapp-profile'));
            } else {
                router.push('/channels?editProfile=true');
            }
        } else {
            router.push('/channels?editProfile=true');
        }
    };

    const fetchStatus = useCallback(async () => {
        try {
            const data = await api.getIntegrationStatus();
            setChannelsStatus(data);
            const waStatus = Boolean(data?.whatsapp?.connected);
            if (typeof window !== 'undefined') {
                localStorage.setItem("whatsapp_connected", waStatus ? "true" : "false");
                if (data?.instagram?.connected) {
                    localStorage.setItem("instagram_connected", "true");
                }
            }
        } catch (err) {
            console.error("Failed to fetch integration status:", err);
            if (typeof window !== 'undefined') {
                const waCached = localStorage.getItem("whatsapp_connected") === "true";
                const igCached = localStorage.getItem("instagram_connected") === "true";
                setChannelsStatus({
                    whatsapp: { connected: waCached },
                    instagram: { connected: igCached }
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let lastFetch = 0;

        const load = (force = false) => {
            const now = Date.now();
            if (!force && now - lastFetch < 1500) return;
            lastFetch = now;
            fetchStatus().catch(() => {});
        };

        load(true);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMounted) load();
        };

        const handleStorageChange = (e) => {
            if ((e.key === 'whatsapp_connected' || e.key === 'instagram_connected') && isMounted) load();
        };

        const handleChannelStatusChange = () => {
            if (isMounted) load();
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

    if ((loading || entLoading) && !channelsStatus) {
        return (
            <div 
                className="relative h-8 sm:h-[42px] px-2 sm:px-3.5 rounded-lg sm:rounded-2xl bg-[#09090e]/80 border border-white/10 flex items-center gap-1 sm:gap-2.5 animate-pulse overflow-hidden select-none flex-shrink-0 shrink-0"
                aria-label="Loading Channel Status"
            >
                <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white/10 flex-shrink-0 shrink-0" />
                <div className="w-10 sm:w-16 h-3 rounded bg-white/10" />
                <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-white/10 ml-0.5 sm:ml-1 flex-shrink-0 shrink-0" />
            </div>
        );
    }

    // CASE 1: No messaging channels allowed in plan
    if (hasNoChannels) {
        return (
            <button
                type="button"
                onClick={() => router.push('/billing/payment')}
                className="relative h-8 sm:h-[42px] px-2.5 sm:px-3.5 rounded-lg sm:rounded-2xl flex items-center gap-1.5 sm:gap-2.5 bg-[#09090e]/90 hover:bg-purple-950/30 border border-purple-500/30 select-none transition-all cursor-pointer flex-shrink-0 shrink-0 group"
                title="Messaging channels locked - Upgrade Plan"
            >
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                <span className="text-[10px] sm:text-xs font-semibold text-purple-300">
                    Upgrade for Channels
                </span>
                <ArrowUpRight className="w-3 h-3 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
        );
    }

    // CASE 2: Creator Plan (Instagram only)
    if (isCreatorPlan) {
        const isIgConnected = Boolean(channelsStatus?.instagram?.connected);
        return (
            <div 
                className={`
                    relative h-8 sm:h-[42px] px-2 sm:px-3.5 rounded-lg sm:rounded-2xl flex items-center gap-1 sm:gap-2.5 
                    bg-[#09090e]/90 backdrop-blur-md select-none transition-all duration-300 overflow-hidden flex-shrink-0 shrink-0
                    ${isIgConnected 
                        ? 'border border-pink-500/35 shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                        : 'border border-white/10 shadow-none'
                    }
                `}
            >
                <InstagramIcon isConnected={isIgConnected} />
                <span 
                    className={`
                        text-[10px] sm:text-xs font-semibold tracking-tight whitespace-nowrap z-10 transition-colors duration-300 flex-shrink-0 shrink-0
                        ${isIgConnected ? 'text-pink-400' : 'text-zinc-400'}
                    `}
                >
                    {isIgConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isIgConnected ? (
                    <button
                        type="button"
                        onClick={() => router.push('/channels')}
                        title="Manage Instagram Channel"
                        className="relative z-10 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg text-white bg-pink-500/15 hover:bg-pink-500/30 border border-pink-500/30 transition-all cursor-pointer ml-0.5 sm:ml-1 shrink-0 flex-shrink-0"
                    >
                        <UserPen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                ) : (
                    <CrossDotAccent isConnected={false} />
                )}
            </div>
        );
    }

    // CASE 3: WhatsApp is allowed (Starter, Growth, Business, Enterprise, Free)
    const isWaConnected = Boolean(channelsStatus?.whatsapp?.connected);

    return (
        <div 
            className={`
                relative h-8 sm:h-[42px] px-2 sm:px-3.5 rounded-lg sm:rounded-2xl flex items-center gap-1 sm:gap-2.5 
                bg-[#09090e]/90 backdrop-blur-md select-none transition-all duration-300 overflow-hidden flex-shrink-0 shrink-0
                ${isWaConnected 
                    ? 'border border-[#14c956]/35 shadow-[0_0_15px_rgba(20,201,86,0.15)]' 
                    : 'border border-white/10 shadow-none'
                }
            `}
        >
            <WhatsAppIcon isConnected={isWaConnected} />
            <span 
                className={`
                    text-[10px] sm:text-xs font-semibold tracking-tight whitespace-nowrap z-10 transition-colors duration-300 flex-shrink-0 shrink-0
                    ${isWaConnected ? 'text-[#14c956]' : 'text-zinc-400'}
                `}
            >
                {isWaConnected ? 'Connected' : 'Disconnected'}
            </span>

            {isWaConnected ? (
                <button
                    type="button"
                    onClick={handleEditProfile}
                    title="Edit WhatsApp Profile"
                    aria-label="Edit WhatsApp Profile"
                    className="relative z-10 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg text-white hover:text-white bg-[#14c956]/15 hover:bg-[#14c956]/30 border border-[#14c956]/30 hover:border-[#14c956]/60 transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(20,201,86,0.2)] hover:shadow-[0_0_12px_rgba(20,201,86,0.4)] active:scale-95 ml-0.5 sm:ml-1 shrink-0 flex-shrink-0"
                >
                    <UserPen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
            ) : (
                <CrossDotAccent isConnected={false} />
            )}
        </div>
    );
}
