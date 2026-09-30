'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { poppins } from '@/lib/fonts';
import Link from 'next/link';
import api from '@/lib/api';
import { getToken, isTokenExpired } from '@/lib/auth';
import { isWorkspacePageAllowed } from '@/lib/workspaceAccess.mjs';
import { LogOut, Shield, Menu, PanelLeftClose, PanelLeftOpen, Building2, ChevronDown, Check, Users } from 'lucide-react';
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
    const { user, workspaces, workspaceId, setWorkspaceId, loading, logout, refreshUser, hasPermission, permissionsLoading } = useAuth();
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel, initialSection, openSettings } = useSettings();

    const pageAllowed = Boolean(workspaceId) && !permissionsLoading
        && isWorkspacePageAllowed(pathname, hasPermission);
    const firstAccessiblePath = getFirstAccessibleWorkspacePath(hasPermission)
        || (user?.platform_role === 'platform_admin' ? '/admin' : null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
    const wsDropdownRef = useRef(null);

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
                await refreshUser();
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
            <div className="min-h-screen flex items-center justify-center bg-[#0b111b] p-6">
                <div className="w-full max-w-sm space-y-4">
                    <div className="h-4 w-3/4 rounded-full shimmer-container shimmer-bg mx-auto" />
                    <div className="h-4 w-1/2 rounded-full shimmer-container shimmer-bg mx-auto" />
                    <div className="h-4 w-2/3 rounded-full shimmer-container shimmer-bg mx-auto" />
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const isFullScreenPage = pathname && (
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
    );

    return (
        <RealtimeProvider user={user} workspace={workspace}>
            <div className="[--notion-bg:#05080e] [--notion-sidebar:#080c14] [--notion-hover:#111827] [--notion-active:#111827] [--notion-border:#1b2432] flex min-h-screen text-[var(--notion-text)] font-sans relative bg-transparent">

                {/* Desktop Collapsible Sidebar */}
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

                    {/* Platform Global Announcement Banner */}
                    <AnnouncementBanner />

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
                                ) : pageAllowed ? children : (
                                    <ErrorPage
                                        embedded
                                        code="404"
                                        backgroundLabel="PAGE NOT FOUND"
                                        description="We couldn't find the page you were looking for. Let's get you back on track."
                                        actionHref={workspace ? firstAccessiblePath : "/"}
                                        actionLabel="Back to dashboard"
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
                {hasPermission('ai.chat') && pathname !== '/user/admin/ai' && <GlobalAIChat key={`${user?.id}:${workspaceId}`} />}

                {/* Global Audio Notification for Incoming Messages */}
                {hasPermission('inbox.conversations') && <GlobalAudioNotification />}
            </div>
        </RealtimeProvider>
    );
}
