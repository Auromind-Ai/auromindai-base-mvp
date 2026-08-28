'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
import api from '@/lib/api';
import {
    Sparkles,
    LayoutDashboard,
    MessageSquare,
    Zap,
    Send,
    CheckCircle2,
    TrendingUp,
    Brain,
    CreditCard,
    Settings,
    LogOut,
    Users,
    FileText,
    Shield,
    Share2,
    ChevronDown,
    Menu,
    Wand2,
    Plug,
    Calendar as CalendarIcon,
    Mail,
    Coins,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const GlobalAIChat = dynamic(() => import('@/components/AIChat'), { ssr: false });
const SettingsModal = dynamic(() => import('@/components/SettingsModal'), { ssr: false });
const FeedbackModal = dynamic(
    () => import('@/components/UserFeedback/UserFeedbackPanel'),
    { ssr: false }
);
const GlobalAudioNotification = dynamic(
    () => import('@/components/GlobalAudioNotification'),
    { ssr: false }
);
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import CreditRingDropdown from '@/components/CreditRingDropdown';

const MAIN_NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/user/admin/dashboard' },
    { label: 'AI Workspace', icon: Sparkles, href: '/user/admin/ai' },
    { label: 'Brain', icon: Brain, href: '/user/admin/brain' },
    { label: 'Omni-Inbox', icon: MessageSquare, href: '/user/admin/inbox' },
    { label: 'Automations', icon: Zap, href: '/user/admin/automation' },
    { label: 'Leads & CRM', icon: Users, href: '/user/admin/leads' },
    { label: 'Channels', icon: Share2, href: '/user/admin/channels' },
    { label: 'Templates', icon: FileText, href: '/user/admin/templates' },
    { label: 'Credits & Wallet', icon: Coins, href: '/user/admin/credits' },
    { label: 'Billing', icon: CreditCard, href: '/user/admin/billing' },
];

const SYSTEM_NAV_ITEMS = [
    { label: 'Settings', icon: Settings, href: '#' },
];

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
});

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
    const { user, workspaces, workspaceId, loading, logout, refreshUser } = useAuth();
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel } = useSettings();

    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const workspace = workspaces.find(w => w.id === workspaceId) || null;
    const currentWorkspaceName = (() => {
        if (workspace?.name) {
            if (workspace.name.endsWith("'s Workspace") || workspace.name.endsWith("’s Workspace")) {
                return `${user?.full_name || user?.name || 'User'}'s Workspace`;
            }
            return workspace.name;
        }
        return `${user?.full_name || user?.name || 'User'}'s Workspace`;
    })();

    // 1. Safe Client-side LocalStorage Read
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    // 2. Toggle Handler with LocalStorage Save
    const toggleSidebar = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
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
        if (!loading && !user) {
            console.warn("🚫 No current user found, redirecting to login");
            router.push('/login');
        }
    }, [user, loading, router]);

    // app/layout.js or _app.js
    useEffect(() => {
        window.fbAsyncInit = function () {
            FB.init({
                appId: process.env.NEXT_PUBLIC_FB_APP_ID,
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

    const isAIPage = pathname && (pathname === '/user/admin/ai' || pathname.includes('/admin/ai'));

    const renderNavItem = (item, isMobile = false) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        const handleClick = (e) => {
            if (item.label === 'Settings') {
                e.preventDefault();
                setIsSettingsOpen(true);
                if (isMobile) setIsMobileOpen(false);
            } else if (isMobile) {
                setIsMobileOpen(false);
            }
        };

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                title={!isMobile && isCollapsed ? item.label : undefined}
                className={`relative flex items-center gap-2.5 py-[7px] rounded-[6px] text-sm group select-none
                    transition-all duration-150 active:scale-[0.97] active:opacity-80
                    ${!isMobile && isCollapsed ? 'justify-center px-0' : 'px-3'}
                    ${isActive
                        ? 'bg-white/10 text-white font-medium shadow-sm'
                        : 'text-[#9b9b9b] hover:bg-white/5 hover:text-white'}
                `}
            >
                {isActive && (
                    <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-[6px] bg-white/10 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                )}
                <Icon
                    size={16}
                    strokeWidth={2}
                    className={`relative z-10 shrink-0 transition-colors duration-150 ${
                        isActive
                            ? 'text-white'
                            : 'text-[#7e7e7e] group-hover:text-white'
                    }`}
                />
                {(isMobile || !isCollapsed) && (
                    <span className="relative z-10 truncate">{item.label}</span>
                )}
            </Link>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#191919] p-6">
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
        pathname === '/user/admin/flows' ||
        pathname.startsWith('/user/admin/flows/') ||
        pathname === '/user/admin/automation' ||
        pathname.startsWith('/user/admin/automation/') ||
        pathname === '/user/admin/dashboard' ||
        pathname === '/user/admin/brain' ||
        pathname.startsWith('/user/admin/brain/') ||
        pathname === '/user/admin/channels' ||
        pathname.startsWith('/user/admin/channels/')
    );

    return (
        <RealtimeProvider user={user} workspace={workspace}>
            <div className="flex min-h-screen text-[var(--notion-text)] font-sans relative bg-transparent">

                {/* Desktop Collapsible Sidebar */}
                <aside
                    className={`${poppins.className} hidden md:flex shrink-0 flex-col border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)] h-screen sticky top-0 z-10 transition-all duration-300 ease-in-out ${
                        isCollapsed ? 'w-[68px]' : 'w-[240px]'
                    }`}
                >
                    {/* Top Profile & Toggle Section */}
                    <div className={`flex items-center pt-5 pb-4 border-b border-white/5 ${
                        isCollapsed ? 'justify-center px-2 flex-col gap-2' : 'justify-between px-4'
                    }`}>
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-[#814AC8] flex items-center justify-center text-xs text-white font-bold border-2 border-white/10">
                                {(user?.full_name || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            {!isCollapsed && (
                                <span className="font-semibold text-[15px] text-white truncate">
                                    {user?.full_name || user?.name || 'User'}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={toggleSidebar}
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                            className="p-1.5 rounded-[6px] text-[#9b9b9b] hover:text-white hover:bg-white/5 transition-colors shrink-0"
                        >
                            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                        </button>
                    </div>

                    {/* Nav Items */}
                    <div className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className="space-y-0.5">
                            {MAIN_NAV_ITEMS.map(item => renderNavItem(item))}
                        </div>

                        <div className="mt-5 space-y-0.5">
                            {!isCollapsed && (
                                <div className="px-3 py-1 text-[11px] font-medium text-[#555] uppercase tracking-wider mb-1">
                                    System
                                </div>
                            )}

                            {SYSTEM_NAV_ITEMS.map(item => renderNavItem(item))}

                            {user?.platform_role === 'platform_admin' &&
                                renderNavItem({
                                    label: 'Admin Console',
                                    icon: Shield,
                                    href: '/admin'
                                })
                            }
                        </div>
                    </div>

                    {/* Sidebar Bottom Actions */}
                    <div className="p-2.5 border-t border-[var(--notion-border)] space-y-1">
                        {/* Feedback / Report Issue */}
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            title={isCollapsed ? "Feedback / Report Issue" : undefined}
                            className={`flex items-center gap-2.5 py-1.5 text-[13px] text-[#9b9b9b] hover:text-white transition-colors rounded-[4px] hover:bg-[var(--notion-hover)] w-full ${
                                isCollapsed ? 'justify-center px-0' : 'px-2'
                            }`}
                        >
                            <MessageSquare size={15} className="shrink-0" />
                            {!isCollapsed && <span className="truncate">Feedback / Report Issue</span>}
                        </button>

                        {/* Logout */}
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            title={isCollapsed ? "Log out" : undefined}
                            className={`flex items-center gap-2.5 py-1.5 text-[13px] text-[#9b9b9b] hover:text-white transition-colors rounded-[4px] hover:bg-[var(--notion-hover)] w-full ${
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
                        <div className="w-[360px] rounded-xl border border-[#2a2a2a] bg-[#191919] p-5 shadow-2xl">
                            <h3 className="text-[16px] font-medium text-white">
                                Log out?
                            </h3>

                            <p className="mt-2 text-[13px] text-[#9b9b9b]">
                                Are you sure you want to log out?
                            </p>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="rounded-md px-4 py-2 text-[13px] text-[#b5b5b5] hover:bg-[#2a2a2a] hover:text-white"
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

                {/* Mobile Drawer */}
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetContent
                        side="left"
                        className="p-0 w-[200px] bg-[var(--notion-sidebar)] border-r border-[var(--notion-border)] text-[var(--notion-text)] shadow-2xl"
                    >
                        <div className={`${poppins.className} flex flex-col h-full bg-[#0f0f12]`}>
                            {/* Workspace Brand */}
                            <div className="h-14 flex items-center px-4 border-b border-white/5">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-5 h-5 rounded-[4px] bg-[#814AC8] flex items-center justify-center flex-shrink-0 text-[10px] text-white font-bold">
                                        {(currentWorkspaceName || 'A').charAt(0).toUpperCase()}
                                    </div>

                                    <span className="font-medium text-sm truncate text-[#D4D4D4]">
                                        {currentWorkspaceName}
                                    </span>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex-1 px-2 py-4 overflow-y-auto custom-scrollbar">
                                <div className="space-y-6">
                                    <div className="space-y-0.5">
                                        {MAIN_NAV_ITEMS.map((item) =>
                                            renderNavItem(item, true)
                                        )}
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="px-3 py-1.5 text-xs font-medium text-[#787878] mb-1">
                                            System
                                        </div>

                                        {SYSTEM_NAV_ITEMS.map((item) =>
                                            renderNavItem(item, true)
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* User Profile */}
                            <div className="p-3 border-t border-white/5 bg-[#141418]">
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
                                        onClick={handleLogout}
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
                    <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[var(--notion-border)] bg-[var(--notion-bg)]/80 backdrop-blur-md sticky top-0 z-50">
                        <div className="flex items-center gap-3">
                            <button
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

                    <div
                        className={`w-full flex-1 flex flex-col overflow-hidden ${
                            isFullScreenPage
                                ? ''
                                : 'overflow-y-auto custom-scrollbar'
                        }`}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{
                                    duration: 0.18,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className="flex-1 flex flex-col h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* Settings Modal */}
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />

                {/* Feedback Modal */}
                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={() => setIsFeedbackOpen(false)}
                />

                {/* Global AI Chat - Hidden on Orbion Agents page */}
                {pathname !== '/user/admin/ai' && <GlobalAIChat />}

                {/* Global Audio Notification for Incoming Messages */}
                <GlobalAudioNotification />
            </div>
        </RealtimeProvider>
    );
}