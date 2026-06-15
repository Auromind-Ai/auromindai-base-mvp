'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
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
    Search,
    Menu,
    Wand2,
    Plug,
    Calendar as CalendarIcon,
    Mail,
    Coins
} from 'lucide-react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getUser, getWorkspace, logout, restoreAdminToken } from '@/lib/auth';
import GlobalAIChat from '@/components/AIChat';
import SettingsModal from '@/components/SettingsModal';
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
    // Settings logic is handled via handleClick in renderNavItem
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
    const [user, setUser] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel } = useSettings();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {

  const adminToken = localStorage.getItem("admin_backup_token")

  if (!adminToken) return

  try {
    const payload = JSON.parse(atob(adminToken.split(".")[1]))

    if (payload?.impersonated) {
      console.log("❌ Invalid admin token → removing")
      localStorage.removeItem("admin_backup_token")
    }

  } catch {
    localStorage.removeItem("admin_backup_token")
  }

}, [])

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

        // Load SDK
        (function (d, s, id) {
            if (d.getElementById(id)) return;
            const js = d.createElement(s);
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            d.getElementsByTagName('head')[0].appendChild(js);
        })(document, 'script', 'facebook-jssdk');
    }, []);

    useEffect(() => {
        const checkAuth = () => {
            const currentUser = getUser();
            const currentWorkspace = getWorkspace();
            const token = localStorage.getItem('token');
            if (!currentUser) {
                if (token) localStorage.removeItem('token');
                router.push('/login');
                return;
            }
            setUser(currentUser);
            setWorkspace(currentWorkspace);
            setIsLoading(false);
        };
        const timeout = setTimeout(checkAuth, 0);
        return () => clearTimeout(timeout);
    }, [router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const [isMobileOpen, setIsMobileOpen] = useState(false);
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
                className={`relative flex items-center gap-2.5 px-3 py-[7px] rounded-[6px] text-sm group select-none
                    transition-all duration-150 active:scale-[0.97] active:opacity-80
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
                <Icon size={16} strokeWidth={2} className={`relative z-10 transition-colors duration-150 ${isActive ? 'text-white' : 'text-[#7e7e7e] group-hover:text-white'}`} />
                <span className="relative z-10">{item.label}</span>
            </Link>
        );
    };

    if (isLoading || !user) {
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
            {/* Desktop Sidebar */}
            <aside
                className={`${poppins.className} hidden md:flex w-[320px] flex-col border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)] h-screen sticky top-0 z-10`}
            >
                {/* Workspace Brand */}
                <div className="h-14 flex items-center px-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-5 h-5 rounded-[4px] bg-indigo-500 flex items-center justify-center flex-shrink-0 text-[10px] text-white font-bold">
                            {workspace?.name?.charAt(0) || 'A'}
                        </div>
                        <span className="font-medium text-sm truncate text-[#D4D4D4] tracking-tight">{workspace?.name || 'Auromind'}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 mb-4">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#202020] border border-[var(--notion-border)] text-sm text-[#9b9b9b] cursor-pointer hover:bg-[var(--notion-hover)] transition-colors">
                        <Search size={14} />
                        <span>Search</span>
                    </div>
                </div>

                {/* Nav Items */}
                <div className="flex-1 px-3 overflow-y-auto custom-scrollbar">
                    <div className="space-y-0.5">
                        {MAIN_NAV_ITEMS.map(item => renderNavItem(item))}
                    </div>
                    <div className="mt-6 space-y-0.5">
                        <div className="px-3 py-1 text-xs font-medium text-[#555] mb-1">System</div>
                        {SYSTEM_NAV_ITEMS.map(item => renderNavItem(item))}
                    </div>
                </div>

                {/* Bottom: Back to Admin (if impersonating) + Log out */}
                <div className="p-4 border-t border-[var(--notion-border)] space-y-2">
                    {typeof window !== 'undefined' && localStorage.getItem('admin_backup_token') && (
                        <button
                            onClick={() => { restoreAdminToken(); window.location.href = '/' + (process.env.NEXT_PUBLIC_ADMIN_CONSOLE_PATH || 'x7k2-admin-9pqm') + '/dashboard'; }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-sm transition-colors border border-indigo-500/20"
                        >
                            <Shield size={14} />
                            <span>Back to Admin</span>
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] text-[#9b9b9b] hover:text-white transition-colors rounded-[4px] hover:bg-[var(--notion-hover)] w-full"
                    >
                        <LogOut size={14} />
                        Log out
                    </button>
                </div>
            </aside>

            {/* Mobile Drawer (Sheet) */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-[300px] bg-[var(--notion-sidebar)] border-r border-[var(--notion-border)] text-[var(--notion-text)] shadow-2xl">
                    <div className={`${poppins.className} flex flex-col h-full bg-[#0f0f12]`}>
                        {/* Workspace Brand */}
                        <div className="h-14 flex items-center px-4 border-b border-white/5">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-5 h-5 rounded-[4px] bg-indigo-500 flex items-center justify-center flex-shrink-0 text-[10px] text-white font-bold">
                                    {workspace?.name?.charAt(0) || 'A'}
                                </div>
                                <span className="font-medium text-sm truncate text-[#D4D4D4]">{workspace?.name || 'Auromind'}</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 px-2 py-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div className="space-y-0.5">
                                    {MAIN_NAV_ITEMS.map((item) => renderNavItem(item, true))}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="px-3 py-1.5 text-xs font-medium text-[#787878] mb-1">
                                        System
                                    </div>
                                    {SYSTEM_NAV_ITEMS.map((item) => renderNavItem(item, true))}
                                </div>
                            </div>
                        </div>

                        {/* User Profile */}
                        <div className="p-3 border-t border-white/5 bg-[#141418]">
                            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-xs text-white font-bold">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#D4D4D4] font-medium truncate">{user.name || 'User'}</p>
                                    <p className="text-[10px] text-[#555] truncate">{user.email}</p>
                                </div>
                                <button onClick={handleLogout} className="text-[#9b9b9b] hover:text-white transition-colors p-1">
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
                {typeof window !== 'undefined' && localStorage.getItem('admin_backup_token') && (
                    <div className="bg-indigo-600 px-4 py-2 flex items-center justify-between text-white text-xs font-bold z-[60] shadow-lg animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="animate-pulse" />
                            <span>SECRET LOGIN MODE: Impersonating {user?.name || user?.email}</span>
                        </div>
                        <button 
                            onClick={() => {
                                restoreAdminToken();
                                window.location.href = '/' + (process.env.NEXT_PUBLIC_ADMIN_CONSOLE_PATH || 'x7k2-admin-9pqm') + '/dashboard';
                            }}
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
                        <span className="font-semibold text-sm text-[#D4D4D4] tracking-tight">Auromind</span>
                    </div>
                    
                    {/* Compact Profile Circle for Mobile Header */}
                    <div className="flex items-center gap-3">
                        <CreditRingDropdown user={user} size={36} />
                    </div>
                </div>

                <div className={`w-full flex-1 flex flex-col overflow-hidden ${isFullScreenPage ? '' : 'overflow-y-auto custom-scrollbar'}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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

            {/* Global AI Chat - Hidden on Auromind AI page */}
            {pathname !== '/user/admin/ai' && <GlobalAIChat />}
        </div>
        </RealtimeProvider>
    );
}