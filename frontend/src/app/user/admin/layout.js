'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { poppins } from '@/lib/fonts';
import Link from 'next/link';
import api from '@/lib/api';
import { getToken, isTokenExpired } from '@/lib/auth';
import { isWorkspacePageAllowed } from '@/lib/workspaceAccess.mjs';
import { LogOut, Shield, Menu, PanelLeftClose, PanelLeftOpen, Building2, ChevronDown, Check, Users, Sparkles, Inbox, Wallet } from 'lucide-react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const GlobalAIChat = dynamic(() => import('@/components/AIChat'), { ssr: false });
const SettingsModal = dynamic(() => import('@/components/SettingsModal'), { ssr: false });
const GlobalAudioNotification = dynamic(
    () => import('@/components/GlobalAudioNotification'),
    { ssr: false }
);
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import ErrorPage from '@/components/ErrorPage';
import Preloader from '@/components/Preloader';
import WorkspaceNavigation, { getFirstAccessibleWorkspacePath } from '@/components/WorkspaceNavigation';

export default function AdminLayout({ children }) {
    return (
        <SettingsProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </SettingsProvider>
    );
}

function AdminLayoutContent({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const cleanPath = pathname ? pathname.replace(/^\/user\/admin/, '') || '/' : '/';
    const { user, workspaces, workspaceId, setWorkspaceId, loading, logout, refreshUser, hasPermission, permissionsLoading } = useAuth();
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel, initialSection, openSettings } = useSettings();

    const pageAllowed = Boolean(workspaceId) && !permissionsLoading
        && isWorkspacePageAllowed(cleanPath, hasPermission);
    const firstAccessiblePath = getFirstAccessibleWorkspacePath(hasPermission)
        || (user?.platform_role === 'platform_admin' ? '/admin' : null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
    const wsDropdownRef = useRef(null);
    const [railCredits, setRailCredits] = useState({ ai: null, wcc: null });

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
        let isMounted = true;
        async function fetchRailCredits() {
            try {
                const [creditRes, wccRes] = await Promise.allSettled([
                    api.getCreditSummary(workspaceId),
                    api.getWccBalance(workspaceId)
                ]);
                if (isMounted) {
                    const aiBal = creditRes.status === 'fulfilled'
                        ? Number(creditRes.value?.data?.credits_balance ?? creditRes.value?.credits_balance ?? 0)
                        : null;
                    const wccBal = wccRes.status === 'fulfilled'
                        ? parseFloat(wccRes.value?.balance ?? wccRes.value?.data?.balance ?? 0)
                        : null;
                    setRailCredits({ ai: aiBal, wcc: wccBal });
                }
            } catch (err) {
                console.warn("Failed to fetch rail credits:", err);
            }
        }
        fetchRailCredits();
        return () => { isMounted = false; };
    }, [workspaceId]);

    const formatRailCredit = (val, isCurrency = false) => {
        if (val === null || val === undefined) return '...';
        const num = Number(val);
        if (isNaN(num)) return '0';
        if (isCurrency) {
            if (num >= 1000) return `₹${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
            return `₹${Math.round(num)}`;
        }
        if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return Math.round(num).toString();
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target)) {
                setIsWsDropdownOpen(false);
            }
        }
        if (isWsDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isWsDropdownOpen]);


    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem('sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });


    const workspace = workspaces.find(w => w.id === workspaceId) || null;
    const currentWorkspaceName = (() => {
        if (workspace?.name) {
            return workspace.name;
        }
        return `${user?.full_name || user?.name || 'User'}'s Workspace`;
    })();

    // Toggle Handler with LocalStorage Save
    const toggleSidebar = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('sidebar_collapsed', String(next));
                } catch {}
            }
            return next;
        });
    };

    const handleStopImpersonation = async () => {
        try {
            const res = await api.stopImpersonation();
            if (typeof window !== 'undefined') {
                if (res?.access_token || res?.token) {
                    localStorage.setItem("auth_token", res.access_token || res.token);
                } else {
                    const backupToken = localStorage.getItem("admin_backup_token");
                    if (backupToken) {
                        localStorage.setItem("auth_token", backupToken);
                    }
                }
            }
        } catch (err) {
            console.error("Stop impersonation failed:", err);
            if (typeof window !== 'undefined') {
                const backupToken = localStorage.getItem("admin_backup_token");
                if (backupToken) {
                    localStorage.setItem("auth_token", backupToken);
                }
            }
        } finally {
            if (typeof window !== 'undefined') {
                localStorage.removeItem("user");
                localStorage.removeItem("workspace");
                localStorage.removeItem("workspace_id");
                localStorage.removeItem("admin_backup_token");
                sessionStorage.removeItem("ai_active");
                sessionStorage.removeItem("last_session_id");
            }
            try {
                await refreshUser(undefined, true);
            } catch (refreshErr) {
                console.warn("Failed to refresh user on impersonation stop:", refreshErr);
            }
            router.replace('/admin/users');
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    useEffect(() => {
        if (loading) return;

        const token = getToken();
        if (!token || isTokenExpired(token)) {
            console.warn("🚫 Session expired on route navigation:", pathname);
            logout({ reason: 'expired' });
            return;
        }

        if (!user) {
            console.warn("🚫 No current user found, redirecting to login");
            router.replace('/login');
        }
    }, [pathname, user, loading, router, logout]);

    // Automatically route to first accessible feature if landing on dashboard without dashboard permissions
    useEffect(() => {
        if (!loading && !permissionsLoading && workspaceId && !pageAllowed && firstAccessiblePath && (pathname === '/user/admin/dashboard' || cleanPath === '/dashboard')) {
            router.replace(firstAccessiblePath);
        }
    }, [loading, permissionsLoading, workspaceId, pageAllowed, firstAccessiblePath, pathname, cleanPath, router]);

    // app/layout.js or _app.js
    useEffect(() => {
        window.fbAsyncInit = function () {
            FB.init({
                appId: process.env.NEXT_PUBLIC_FB_APP_ID || '990851527207522',
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
        };

        (function (d, s, id) {
            if (d.getElementById(id)) return;
            const js = d.createElement(s);
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            d.getElementsByTagName('head')[0].appendChild(js);
        })(document, 'script', 'facebook-jssdk');
    }, []);

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        if (isMobileOpen && typeof window !== 'undefined') {
            window.scrollTo({ left: 0, behavior: 'instant' });
            if (document.documentElement) document.documentElement.scrollLeft = 0;
            if (document.body) document.body.scrollLeft = 0;
        }
    }, [isMobileOpen]);

    if (loading) {
        return (
            <Preloader text="Loading Workspace..." fullScreen={false} className="min-h-screen bg-[#0b111b]" />
        );
    }

    if (!user) {
        return null;
    }

    const isFullScreenPage = Boolean(cleanPath && (
        cleanPath === '/ai' ||
        cleanPath.startsWith('/ai/') ||
        cleanPath === '/inbox' ||
        cleanPath.startsWith('/inbox/') ||
        cleanPath === '/leads' ||
        cleanPath.startsWith('/leads/') ||
        cleanPath === '/crm' ||
        cleanPath.startsWith('/crm/') ||
        cleanPath === '/flows' ||
        cleanPath.startsWith('/flows/') ||
        cleanPath === '/automation' ||
        cleanPath.startsWith('/automation/') ||
        cleanPath === '/dashboard' ||
        cleanPath === '/brain' ||
        cleanPath.startsWith('/brain/') ||
        cleanPath === '/channels' ||
        cleanPath.startsWith('/channels/') ||
        cleanPath.startsWith('/marketing') ||
        pathname === '/user/admin/ai' ||
        pathname.startsWith('/user/admin/ai/') ||
        pathname === '/user/admin/inbox' ||
        pathname.startsWith('/user/admin/inbox/') ||
        pathname === '/user/admin/leads' ||
        pathname.startsWith('/user/admin/leads/') ||
        pathname === '/user/admin/crm' ||
        pathname.startsWith('/user/admin/crm/') ||
        pathname === '/user/admin/flows' ||
        pathname.startsWith('/user/admin/flows/') ||
        pathname === '/user/admin/automation' ||
        pathname.startsWith('/user/admin/automation/') ||
        pathname === '/user/admin/dashboard' ||
        pathname === '/user/admin/brain' ||
        pathname.startsWith('/user/admin/brain/') ||
        pathname === '/user/admin/channels' ||
        pathname.startsWith('/user/admin/channels/') ||
        pathname.startsWith('/user/admin/marketing')
    ));

    const isInboxPage = Boolean(cleanPath && (
        cleanPath === '/inbox' ||
        cleanPath.startsWith('/inbox/') ||
        pathname === '/user/admin/inbox' ||
        pathname.startsWith('/user/admin/inbox/')
    ));

    return (
        <RealtimeProvider user={user} workspace={workspace}>
            <div className="[--notion-bg:#05080e] [--notion-sidebar:#080c14] [--notion-hover:#111827] [--notion-active:#111827] [--notion-border:#1b2432] flex min-h-screen text-[var(--notion-text)] font-sans relative bg-transparent">

                {/* Left Navigation: Dedicated Slim Rail on Inbox Page, or Standard Collapsible Sidebar on other pages */}
                {isInboxPage ? (
                    <aside className="hidden lg:flex shrink-0 flex-col items-center py-4.5 px-2 border-r border-white/[0.08] bg-[#080c14] w-[72px] h-dvh max-h-dvh sticky top-0 z-20 select-none">
                        {/* Top: Authentic Orbion 3D Purple Logo (Large & Crisp) */}
                        <Link href="/dashboard" className="p-1 hover:opacity-90 transition-opacity flex items-center justify-center shrink-0" title="Orbion Agents">
                            <img src="/images/orbion-logo.png" alt="Orbion Agents" className="w-9.5 h-9.5 object-contain" />
                        </Link>

                        {/* Subtle Horizontal Divider below Logo */}
                        <div className="w-8 h-px bg-white/[0.12] my-3 shrink-0" />

                        {/* Navigation & Credit Icons Stack */}
                        <div className="flex flex-col items-center gap-3.5 w-full">
                            {/* 1. Inbox (Active - Dark Rounded Container with Inbox Tray Icon) */}
                            <Link
                                href="/inbox"
                                title="Inbox"
                                className="flex flex-col items-center group cursor-pointer w-full relative"
                            >
                                <div className="w-11.5 h-11.5 rounded-2xl flex items-center justify-center transition-all bg-[#1a1d2c] text-white border border-white/15 shadow-sm group-hover:scale-105">
                                    <Inbox size={23} strokeWidth={2} className="text-white" />
                                </div>
                                <span className="text-[9.5px] font-medium text-zinc-300 mt-1 leading-tight tracking-tight">
                                    Inbox
                                </span>
                                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#181926] border border-white/10 text-white text-[11px] font-medium shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                    Inbox
                                </div>
                            </Link>

                            {/* 2. AI Credits (Robot Head Icon + AI Credits Label + Balance Amount) */}
                            <a
                                href="/credits?tab=ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="AI Credits"
                                className="flex flex-col items-center group cursor-pointer w-full relative"
                            >
                                <div className="w-11.5 h-11.5 rounded-2xl flex items-center justify-center transition-all bg-[#141724] text-white border border-white/10 group-hover:border-white/25 group-hover:bg-[#1e2337] group-hover:scale-105 shadow-sm">
                                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transition-transform group-hover:scale-110">
                                        <circle cx="12" cy="4" r="1.75" />
                                        <path d="M12 5.75V7.5" />
                                        <rect x="4" y="7.5" width="16" height="13" rx="6" />
                                        <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
                                        <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
                                    </svg>
                                </div>
                                <span className="text-[9.5px] font-medium text-zinc-400 mt-1 leading-tight tracking-tight group-hover:text-zinc-200 text-center">
                                    AI Credits
                                </span>
                                <span className="text-[10px] font-bold text-white leading-tight tracking-tight text-center">
                                    {formatRailCredit(railCredits.ai)}
                                </span>
                                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#181926] border border-white/10 text-white text-[11px] font-medium shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex items-center gap-1.5">
                                    <span>AI Credits: {railCredits.ai !== null ? railCredits.ai.toLocaleString() : '...'}</span>
                                    <span className="text-[10px] text-zinc-400">↗</span>
                                </div>
                            </a>

                            {/* 3. WA Wallet (WhatsApp Icon + WA Wallet Label + Wallet Amount) */}
                            <a
                                href="/credits?tab=wcc"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WA Wallet"
                                className="flex flex-col items-center group cursor-pointer w-full relative"
                            >
                                <div className="w-11.5 h-11.5 rounded-2xl flex items-center justify-center transition-all bg-[#141724] text-white border border-white/10 group-hover:border-white/25 group-hover:bg-[#1e2337] group-hover:scale-105 shadow-sm">
                                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white transition-transform group-hover:scale-110">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                        <path d="M15.8 14.2c-.2-.1-1.1-.5-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.4.6-.6.7-.1.1-.3.1-.5 0-.2-.1-1-.3-1.8-1.1-.7-.6-1.1-1.4-1.3-1.6-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.4.1-.1.2-.2.3-.4 0-.1 0-.3-.1-.4-.1-.1-.4-1.1-.6-1.5-.2-.4-.3-.3-.4-.3h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.2.2 1.6 2.5 3.9 3.5.5.2.9.4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.3-.6 1.5-1.1.2-.5.2-1 .1-1.1-.1-.2-.3-.3-.5-.4z" fill="currentColor" stroke="none"/>
                                    </svg>
                                </div>
                                <span className="text-[9.5px] font-medium text-zinc-400 mt-1 leading-tight tracking-tight group-hover:text-zinc-200 text-center">
                                    WA Wallet
                                </span>
                                <span className="text-[10px] font-bold text-white leading-tight tracking-tight text-center">
                                    {formatRailCredit(railCredits.wcc, true)}
                                </span>
                                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#181926] border border-white/10 text-white text-[11px] font-medium shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex items-center gap-1.5">
                                    <span>WA Wallet: {railCredits.wcc !== null ? `₹${railCredits.wcc.toLocaleString()}` : '...'}</span>
                                    <span className="text-[10px] text-zinc-400">↗</span>
                                </div>
                            </a>
                        </div>
                    </aside>
                ) : (
                    /* Desktop Collapsible Sidebar */
                    <aside
                        className={`${poppins.className} hidden lg:flex shrink-0 flex-col border-r border-[var(--notion-border)] bg-[#080c14] h-dvh max-h-dvh min-h-0 overflow-clip sticky top-0 z-10 transition-all duration-300 ease-in-out ${
                            isCollapsed ? 'w-[68px]' : 'w-[240px]'
                        }`}
                    >
                        {/* Top Profile & Toggle Section */}
                        <div className={`flex items-center shrink-0 pt-5 pb-4 [@media(min-height:781px)_and_(max-height:880px)]:py-3 [@media(min-height:701px)_and_(max-height:780px)]:py-2.5 [@media(max-height:700px)]:py-1.5 border-b border-white/5 ${
                            isCollapsed ? 'justify-center px-2 flex-col gap-2' : 'justify-between px-4'
                        }`}>
                            <div className={`relative min-w-0 ${isCollapsed ? 'w-full flex justify-center' : 'flex-1'}`} ref={wsDropdownRef}>
                                <button
                                    type="button"
                                    disabled={workspaces.length <= 1 || isCollapsed}
                                    aria-expanded={workspaces.length > 1 && !isCollapsed ? isWsDropdownOpen : undefined}
                                    onClick={() => workspaces.length > 1 && !isCollapsed && setIsWsDropdownOpen((prev) => !prev)}
                                    className={`flex items-center gap-2 overflow-hidden text-left rounded-lg transition-colors ${
                                        isCollapsed ? 'justify-center p-0 w-8 h-8' : workspaces.length > 1 ? 'w-full p-1 hover:bg-white/5 cursor-pointer' : 'w-full p-1 cursor-default'
                                    }`}
                                    title={isCollapsed ? currentWorkspaceName : undefined}
                                >
                                    <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden bg-[#814AC8] flex items-center justify-center text-xs text-white font-bold border border-white/10 shadow-sm">
                                        {(currentWorkspaceName || user?.full_name || 'W').charAt(0).toUpperCase()}
                                    </div>
                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="font-semibold text-xs text-white truncate max-w-[125px]">
                                                    {currentWorkspaceName}
                                                </span>
                                                {workspaces.length > 1 && (
                                                    <ChevronDown size={13} className={`text-zinc-400 shrink-0 transition-transform ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-zinc-400 truncate max-w-[130px]">
                                                {user?.full_name || user?.name || user?.email}
                                            </p>
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                {workspaces.length > 1 && isWsDropdownOpen && !isCollapsed && (
                                    <div className="absolute left-0 top-full mt-2 w-56 p-1.5 rounded-xl bg-[#0e1422] border border-white/10 shadow-2xl z-50 space-y-1">
                                        <div className="px-2.5 py-1 flex items-center justify-between">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                                Workspaces ({workspaces.length})
                                            </span>
                                        </div>

                                        {workspaces.map((ws) => {
                                            const isActive = ws.id === workspaceId;
                                            return (
                                                <button
                                                    key={ws.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setWorkspaceId(ws.id);
                                                        setIsWsDropdownOpen(false);
                                                        router.refresh();
                                                    }}
                                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                                        isActive
                                                            ? 'bg-violet-600/20 text-white font-medium border border-violet-500/30'
                                                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Building2 size={13} className={isActive ? 'text-violet-400' : 'text-zinc-400'} />
                                                        <span className="truncate">{ws.name}</span>
                                                    </div>
                                                    {isActive && <Check size={13} className="text-violet-400 shrink-0" />}
                                                </button>
                                            );
                                        })}

                                        {hasPermission('team.members') && (
                                            <div className="pt-1 border-t border-white/5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsWsDropdownOpen(false);
                                                        openSettings('team');
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-violet-300 hover:bg-violet-500/10 transition-colors cursor-pointer"
                                                >
                                                    <Users size={13} />
                                                    <span>Manage Team & Seats</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={toggleSidebar}
                                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                className="p-1.5 rounded-[6px] text-[#9b9b9b] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                            >
                                {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                            </button>
                        </div>

                        <WorkspaceNavigation
                            pathname={pathname}
                            collapsed={isCollapsed}
                            isAdmin={user?.platform_role === 'platform_admin'}
                            onSettings={() => setIsSettingsOpen(true)}
                            onExpand={toggleSidebar}
                        />

                        {/* Sidebar Bottom Actions */}
                        <div className="shrink-0 p-2.5 pb-4 border-t border-[var(--notion-border)] space-y-1">
                            {/* Logout */}
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                title={isCollapsed ? "Log out" : undefined}
                                aria-label="Log out"
                                className={`flex items-center gap-2.5 py-1.5 text-[13px] text-[#9b9b9b] hover:text-white transition-colors rounded-[4px] hover:bg-[var(--notion-hover)] w-full cursor-pointer ${
                                    isCollapsed ? 'justify-center px-0' : 'px-2'
                                }`}
                            >
                                <LogOut size={15} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Log out</span>}
                            </button>
                        </div>
                    </aside>
                )}

                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
                        <div className="w-[calc(100%-2rem)] max-w-[360px] rounded-xl border border-[#1b2432] bg-[#0b111b] p-5 shadow-2xl">
                            <h3 className="text-[16px] font-medium text-white">
                                Log out?
                            </h3>

                            <p className="mt-2 text-[13px] text-[#9b9b9b]">
                                Are you sure you want to log out?
                            </p>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="rounded-md px-4 py-2 text-[13px] text-[#b5b5b5] hover:bg-[#111827] hover:text-white"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        handleLogout();
                                    }}
                                    className="rounded-md bg-red-500 px-4 py-2 text-[13px] text-white hover:bg-red-600"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile and tablet navigation drawer */}
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetContent
                        side="left"
                        className="p-0 w-[200px] max-w-[calc(100vw-2rem)] h-dvh max-h-dvh overflow-clip bg-[#080c14] border-r border-[var(--notion-border)] text-[var(--notion-text)] shadow-2xl"
                    >
                        <div className={`${poppins.className} flex flex-col h-full min-h-0 bg-[#080c14]`}>
                            {/* Workspace Brand */}
                            <div className="h-14 [@media(max-height:700px)]:h-12 flex items-center pl-3 pr-10 border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-5 h-5 rounded-[4px] bg-[#814AC8] flex items-center justify-center flex-shrink-0 text-[10px] text-white font-bold">
                                        {(currentWorkspaceName || 'A').charAt(0).toUpperCase()}
                                    </div>

                                    <span className="font-semibold text-xs truncate text-white min-w-0 flex-1">
                                        {currentWorkspaceName}
                                    </span>
                                </div>
                                {workspaces.length > 1 && (
                                    <div className="mt-1 flex flex-col gap-0.5 max-h-24 overflow-y-auto">
                                        {workspaces.map((ws) => (
                                            <button
                                                key={ws.id}
                                                onClick={() => {
                                                    setWorkspaceId(ws.id);
                                                    setIsMobileOpen(false);
                                                    router.refresh();
                                                }}
                                                className={`text-left px-2 py-1 rounded text-[11px] truncate flex items-center justify-between ${
                                                    ws.id === workspaceId ? 'bg-violet-600/30 text-white font-medium' : 'text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                <span className="truncate">{ws.name}</span>
                                                {ws.id === workspaceId && <Check size={10} className="text-violet-400 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>


                            <WorkspaceNavigation
                                pathname={pathname}
                                isAdmin={user?.platform_role === 'platform_admin'}
                                onSettings={() => setIsSettingsOpen(true)}
                                onNavigate={() => setIsMobileOpen(false)}
                            />
                            <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:700px)]:pt-1.5 [@media(max-height:700px)]:pb-[max(0.375rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-[#080c14]">
                                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-[#814AC8] flex items-center justify-center text-xs text-white font-bold">
                                        {(user?.full_name || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[#D4D4D4] font-medium truncate">
                                            {user?.full_name || user?.name || 'User'}
                                        </p>

                                        <p className="text-[10px] text-[#555] truncate">
                                            {user?.email}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => { setIsMobileOpen(false); setShowLogoutConfirm(true); }}
                                        aria-label="Log out"
                                        className="text-[#9b9b9b] hover:text-white transition-colors p-1"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 flex flex-col min-h-screen relative overflow-hidden bg-[var(--notion-bg)]">
                    {/* Impersonation Banner */}
                    {user?.impersonated && (
                        <div className="bg-indigo-600 px-4 py-2 flex items-center justify-between text-white text-xs font-bold z-[60] shadow-lg animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="animate-pulse" />
                                <span>
                                    SECRET LOGIN MODE: Impersonating{' '}
                                    {user?.full_name || user?.name || user?.email}
                                </span>
                            </div>

                            <button
                                onClick={handleStopImpersonation}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors border border-white/10"
                            >
                                Exit & Return to Admin
                            </button>
                        </div>
                    )}

                    {/* Mobile Top Navigation */}
                    {!isInboxPage && (
                        <div className="lg:hidden flex items-center justify-between h-14 shrink-0 px-4 border-b border-[var(--notion-border)] bg-[var(--notion-bg)]/80 backdrop-blur-md sticky top-0 z-50">
                            <div className="flex items-center gap-3">
                                <button
                                    aria-label="Open navigation"
                                    aria-expanded={isMobileOpen}
                                    onClick={() => setIsMobileOpen(true)}
                                    className="p-2 -ml-2 rounded-lg hover:bg-[var(--notion-hover)] transition-colors active:scale-95"
                                >
                                    <Menu size={20} className="text-[#D4D4D4]" />
                                </button>

                                <span className="font-semibold text-sm text-[#D4D4D4] tracking-tight">
                                    OrbionAgents
                                </span>
                            </div>

                            {/* Compact Profile Circle for Mobile Header */}
                            <div className="w-7 h-7 rounded-lg bg-[#814AC8] flex items-center justify-center text-[10px] text-white font-bold border border-white/10">
                                {(user?.full_name || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}

                    {/* Platform Global Announcement Banner */}
                    {!isInboxPage && <AnnouncementBanner />}

                    <div
                        className={`w-full flex-1 flex flex-col overflow-hidden ${
                            isFullScreenPage
                                ? ''
                                : 'overflow-y-auto custom-scrollbar'
                        }`}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${workspaceId}:${pathname}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{
                                    duration: 0.18,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className="flex-1 flex flex-col h-full"
                            >
                                {permissionsLoading ? (
                                    <p className="p-6 text-zinc-400">Checking workspace access...</p>
                                ) : pageAllowed ? children : ((pathname === '/user/admin/dashboard' || cleanPath === '/dashboard') && firstAccessiblePath) ? (
                                    <div className="flex items-center justify-center min-h-[50vh] text-zinc-400 text-sm">
                                        <p>Redirecting to your workspace...</p>
                                    </div>
                                ) : (
                                    <ErrorPage
                                        embedded
                                        code="404"
                                        backgroundLabel="PAGE NOT FOUND"
                                        description="We couldn't find the page you were looking for. Let's get you back on track."
                                        actionHref={workspace ? firstAccessiblePath : "/"}
                                        actionLabel={workspace ? "Go to your workspace" : "Back to dashboard"}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* Settings Modal */}
                <SettingsModal
                    key={workspaceId}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    initialSection={initialSection}
                />


                {/* Global AI Chat - Hidden on Orbion Agents page */}
                {hasPermission('ai.chat') && pathname !== '/user/admin/ai' && cleanPath !== '/ai' && <GlobalAIChat key={`${user?.id}:${workspaceId}`} />}

                {/* Global Audio Notification for Incoming Messages */}
                {hasPermission('inbox.conversations') && <GlobalAudioNotification />}
            </div>
        </RealtimeProvider>
    );
}
