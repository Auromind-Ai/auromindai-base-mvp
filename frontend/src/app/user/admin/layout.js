'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Sparkles,
    LayoutDashboard,
    MessageSquare,
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
    Mail
} from 'lucide-react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getUser, getWorkspace, logout } from '@/lib/auth';
import GlobalAIChat from '@/components/AIChat';
import SettingsModal from '@/components/SettingsModal';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';

const MAIN_NAV_ITEMS = [
    { label: 'Home', icon: LayoutDashboard, href: '/user/admin/dashboard' },
    { label: 'Auromind AI', icon: Sparkles, href: '/user/admin/ai' },
    { label: 'Inbox', icon: MessageSquare, href: '/user/admin/inbox' },
    { label: 'Calendar', icon: CalendarIcon, href: '/user/admin/calendar' },
    { label: 'Email', icon: Mail, href: '/user/admin/email' },
    { label: 'Leads / CRM', icon: Users, href: '/user/admin/leads' },
    { label: 'Tasks & Follow-ups', icon: Send, href: '/user/admin/followups' },
    { label: 'Meetings & Promises', icon: CheckCircle2, href: '/user/admin/promises' },
    { label: 'Brain', icon: Brain, href: '/user/admin/brain' },
    { label: 'Marketing', icon: TrendingUp, href: '/user/admin/marketing' },
    { label: 'Flows & Templates', icon: Wand2, href: '/user/admin/flows' },
    { label: 'Channels', icon: Share2, href: '/user/admin/channels' },
];

const SYSTEM_NAV_ITEMS = [
    { label: 'Integrations', icon: Plug, href: '/user/admin/integrations' },
    { label: 'Automation', icon: Wand2, href: '/user/admin/automation' },
    { label: 'Billing', icon: CreditCard, href: '/user/admin/billing' },
    { label: 'Settings', icon: Settings, href: '/user/admin/settings' },
];

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
        const checkAuth = () => {
            const currentUser = getUser();
            const currentWorkspace = getWorkspace();

            if (!currentUser) {
                router.push('/login');
                return;
            }

            setUser(currentUser);
            setWorkspace(currentWorkspace);
            setIsLoading(false);
        };
        // Defer to next tick to satisfy linter
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
                className={`flex items-center gap-2.5 px-3 py-1 rounded-[4px] text-sm group select-none transition-colors duration-150
                    ${isActive
                        ? 'bg-[var(--notion-active)] text-white font-medium'
                        : 'text-[#9b9b9b] hover:bg-[var(--notion-hover)] hover:text-white'}
                `}
            >
                <Icon size={16} strokeWidth={2} className={`${isActive ? 'text-white' : 'text-[#7e7e7e] group-hover:text-white'}`} />
                {item.label}
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
        pathname.startsWith('/user/admin/brain/')
    );

    return (
        <div className="flex min-h-screen text-[var(--notion-text)] font-sans relative
        bg-gradient-to-br from-[#020617] via-[#030712] to-black">
            {/* Desktop Sidebar */}
            <aside
                className="hidden md:flex w-[260px] flex-col border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)] h-screen sticky top-0 z-10"
            >
                {/* ... sidebar content ... */}
                <div className="h-14 flex items-center px-4 hover:bg-[var(--notion-hover)] cursor-pointer m-1 rounded-[4px] transition-colors">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-5 h-5 rounded-[4px] bg-indigo-500 flex items-center justify-center flex-shrink-0 text-[10px] text-white font-bold">
                            {workspace?.name?.charAt(0) || 'A'}
                        </div>
                        <span className="font-medium text-sm truncate text-[#D4D4D4]">{workspace?.name || 'Auromind'}</span>
                        <ChevronDown size={14} className="text-[#9b9b9b] flex-shrink-0 ml-auto" />
                    </div>
                </div>

                <div className="px-3 mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[var(--notion-border)] bg-[#202020] shadow-sm text-sm text-[#9b9b9b] hover:bg-[var(--notion-hover)] cursor-pointer h-9 transition-colors">
                        <Search size={14} />
                        <span className="flex-1">Search</span>
                        <kbd className="text-[10px] border border-[#2f2f2f] rounded px-1.5 py-0.5 bg-[#252525] text-[#787878]">⌘K</kbd>
                    </div>
                </div>

                <div className="flex-1 px-2 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6 py-2">
                        <div className="space-y-0.5">
                            {MAIN_NAV_ITEMS.map(item => renderNavItem(item))}
                        </div>
                        <div className="space-y-0.5">
                            <div className="px-3 py-1.5 text-xs font-medium text-[#787878] mt-4 mb-1">
                                System
                            </div>
                            {SYSTEM_NAV_ITEMS.map(item => renderNavItem(item))}
                        </div>
                    </div>
                </div>

                <div className="p-2 border-t border-[var(--notion-border)] mt-auto">
                    <div className="flex items-center gap-3 px-2 py-1.5 rounded-[4px] hover:bg-[var(--notion-hover)] cursor-pointer group transition-colors">
                        <div className="w-5 h-5 rounded-[4px] bg-orange-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#D4D4D4] truncate">{user.name || 'User'}</p>
                        </div>
                        <button onClick={handleLogout} className="text-[#9b9b9b] opacity-0 group-hover:opacity-100 hover:text-[#D4D4D4] transition-opacity">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Mobile Drawer (Sheet) */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-[300px] bg-[var(--notion-sidebar)] border-r border-[var(--notion-border)] text-[var(--notion-text)] shadow-2xl">
                    <div className="flex flex-col h-full bg-[#050505]">
                        <div className="h-14 flex items-center px-4 border-b border-white/5">
                            <span className="font-medium text-sm text-[#D4D4D4]">Menu</span>
                        </div>
                        <div className="flex-1 px-2 py-4 overflow-y-auto">
                            <div className="space-y-0.5">
                                {MAIN_NAV_ITEMS.map((item) => renderNavItem(item, true))}
                            </div>
                            <div className="mt-6 space-y-0.5">
                                <div className="px-3 py-1.5 text-xs font-medium text-[#787878] mb-1">System</div>
                                {SYSTEM_NAV_ITEMS.map((item) => renderNavItem(item, true))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center h-14 px-4 border-b border-[var(--notion-border)] bg-[var(--notion-bg)]/80 backdrop-blur-md sticky top-0 z-50">
                    <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 rounded-[4px] hover:bg-[var(--notion-hover)] transition-colors">
                        <Menu size={20} className="text-[#D4D4D4]" />
                    </button>
                    <span className="ml-3 font-medium text-sm text-[#D4D4D4]">Auromind</span>
                </div>

                {isFullScreenPage ? (
                    <div className="w-full flex-1 flex flex-col overflow-hidden">
                        {children}
                    </div>
                ) : (
                    <div className="w-full max-w-[1600px] pl-6 pr-4 pt-10 h-full overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                )}
            </main>

            {/* Settings Modal */}
            {/* ... */}

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
    );
}
