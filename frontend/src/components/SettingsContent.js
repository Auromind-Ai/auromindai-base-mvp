'use client';

import { useState } from 'react';
import {
    X,
    User,
    Settings,
    Bell,
    Palette,
    Sparkles,
    Globe,
    Shield,
    ChevronDown,
    Check,
    Moon,
    Sun,
    Monitor,
    ArrowUp
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getUser } from '@/lib/auth';

const SettingsContent = () => {
    const [activeTab, setActiveTab] = useState('account');
    const { selectedModel, setSelectedModel } = useSettings();
    const user = getUser();
    const [appearance, setAppearance] = useState('system');
    const [notifications, setNotifications] = useState(true);
    const [soundEffects, setSoundEffects] = useState(true);

    const handleAppearanceChange = (value) => {
        setAppearance(value);
        localStorage.setItem('auromind_appearance', value);
    };

    const handleModelChange = (value) => {
        setSelectedModel(value);
    };

    const sidebarItems = [
        { id: 'account', label: user?.name || 'User', icon: User, section: 'Account', isProfile: true },
        { id: 'preferences', label: 'Preferences', icon: Settings, section: 'Account' },
        { id: 'notifications', label: 'Notifications', icon: Bell, section: 'Account' },
        { id: 'connections-account', label: 'Connections', icon: Globe, section: 'Account' },
        { id: 'general', label: 'General', icon: Settings, section: 'Workspace' },
        { id: 'people', label: 'People', icon: User, section: 'Workspace' },
        { id: 'teamspaces', label: 'Teamspaces', icon: Palette, section: 'Workspace' },
        { id: 'security', label: 'Security', icon: Monitor, section: 'Workspace' },
        { id: 'identity', label: 'Identity', icon: Shield, section: 'Workspace' },
        { id: 'ai-models', label: 'Notion AI', icon: Sparkles, section: 'Workspace' },
        { id: 'public-pages', label: 'Public pages', icon: Globe, section: 'Workspace' },
        { id: 'import', label: 'Import', icon: ArrowUp, section: 'Workspace' },
        { id: 'upgrade', label: 'Upgrade plan', icon: ArrowUp, section: 'Workspace', isAccent: true },
    ];

    return (
        <div className="flex h-full w-full bg-[#1f1f1f] overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 bg-[#191919] border-r border-[#333] flex flex-col">
                {/* Account Section */}
                <div className="p-4">
                    <div className="flex items-center justify-between px-2 py-1.5 hover:bg-[#252525] rounded transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded overflow-hidden">
                                <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                    {(user?.name || 'U').charAt(0)}
                                </div>
                            </div>
                            <span className="text-[13px] font-medium text-[#e8e8e8] truncate">{user?.name || 'User'}'s Sp...</span>
                        </div>
                        <ChevronDown size={14} className="text-[#555] group-hover:text-[#787878]" />
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-2 overflow-y-auto custom-scrollbar">
                    {/* Account Section */}
                    <div className="px-3 py-2">
                        <span className="text-[11px] font-medium text-[#787878] uppercase tracking-wider">Account</span>
                    </div>
                    {sidebarItems.filter(item => item.section === 'Account').map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${activeTab === item.id
                                ? 'bg-[#333] text-white'
                                : 'text-[#a0a0a0] hover:bg-[#252525] hover:text-[#e8e8e8]'
                                } ${item.isProfile ? 'mb-1' : ''}`}
                        >
                            {item.isProfile ? (
                                <div className="w-5 h-5 rounded overflow-hidden mr-0.5">
                                    <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                                        RS
                                    </div>
                                </div>
                            ) : (
                                <item.icon size={16} />
                            )}
                            {item.label}
                        </button>
                    ))}

                    {/* Workspace Section */}
                    <div className="px-3 py-2 mt-4">
                        <span className="text-[11px] font-medium text-[#787878] uppercase tracking-wider">Workspace</span>
                    </div>
                    {sidebarItems.filter(item => item.section === 'Workspace').map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${activeTab === item.id
                                ? 'bg-[#333] text-white'
                                : 'text-[#a0a0a0] hover:bg-[#252525] hover:text-[#e8e8e8]'
                                }`}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#333]">
                    <h2 className="text-lg font-semibold text-white">
                        {sidebarItems.find(item => item.id === activeTab)?.label || 'Settings'}
                    </h2>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'account' && (
                        <div className="max-w-2xl mx-auto space-y-12">
                            {/* Account Section */}
                            <div className="space-y-6">
                                <h1 className="text-[14px] font-semibold text-white">Account</h1>

                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded overflow-hidden group relative cursor-pointer">
                                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-xl font-bold text-white uppercase">
                                            {(user?.name || 'U').charAt(0)}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-[12px] text-[#787878] mb-1.5 font-medium tracking-tight">Preferred name</h3>
                                            <input
                                                type="text"
                                                defaultValue={user?.name || 'User'}
                                                className="w-full bg-[#252525] border border-[#333] rounded px-3 py-1.5 text-[14px] text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                            />
                                        </div>
                                        <button className="text-[13px] text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Create your portrait
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#333] w-full" />

                            {/* Account Security Section */}
                            <div className="space-y-6">
                                <h2 className="text-[14px] font-semibold text-white">Account security</h2>

                                <div className="space-y-6">
                                    {/* Email */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-[14px] font-medium text-white mb-0.5">Email</h3>
                                            <p className="text-[13px] text-[#787878]">{user?.email || 'test@example.com'}</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-[#252525] border border-[#333] rounded text-[13px] text-white hover:bg-[#2a2a2a] font-medium transition-colors">
                                            Change email
                                        </button>
                                    </div>

                                    {/* Password */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-[14px] font-medium text-white mb-0.5">Password</h3>
                                            <p className="text-[13px] text-[#787878]">Set a permanent password to login to your account.</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-[#252525] border border-[#333] rounded text-[13px] text-white hover:bg-[#2a2a2a] font-medium transition-colors">
                                            Add password
                                        </button>
                                    </div>

                                    {/* 2-step verification */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-[14px] font-medium text-white mb-0.5">2-step verification</h3>
                                            <p className="text-[13px] text-[#787878]">Add an additional layer of security to your account during login.</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-[#252525] border border-[#333] rounded text-[13px] text-white/30 cursor-not-allowed font-medium">
                                            Add verification method
                                        </button>
                                    </div>

                                    {/* Passkeys */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-[14px] font-medium text-white mb-0.5">Passkeys</h3>
                                            <p className="text-[13px] text-[#787878]">Securely sign-in with on-device biometric authentication.</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-[#252525] border border-[#333] rounded text-[13px] text-white hover:bg-[#2a2a2a] font-medium transition-colors">
                                            Add passkey
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#333] w-full" />

                            {/* Support Section */}
                            <div className="space-y-6">
                                <h2 className="text-[14px] font-semibold text-white">Support</h2>

                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-[14px] font-medium text-white mb-1">Support access</h3>
                                            <p className="text-[13px] text-[#787878]">Grant Notion support temporary access to your account so we can troubleshoot problems or recover content on your behalf. You can revoke access at any time.</p>
                                        </div>
                                        <button className="w-9 h-5 rounded-full bg-[#333] relative transition-colors mt-1">
                                            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-[#787878]" />
                                        </button>
                                    </div>

                                    <div>
                                        <button className="flex items-center justify-between w-full group">
                                            <div className="text-left">
                                                <h3 className="text-[14px] font-medium text-red-500 mb-0.5">Delete my account</h3>
                                                <p className="text-[13px] text-[#787878]">Permanently delete the account and remove access from all workspaces.</p>
                                            </div>
                                            <ChevronDown size={14} className="text-[#555] -rotate-90 group-hover:text-[#787878]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="max-w-2xl mx-auto space-y-10">
                            <div className="space-y-6">
                                {/* Appearance */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-[14px] font-medium text-white mb-1">Appearance</h3>
                                        <p className="text-[13px] text-[#787878]">Customize how Auromind looks on your device.</p>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={appearance}
                                            onChange={(e) => handleAppearanceChange(e.target.value)}
                                            className="bg-transparent text-[13px] text-[#e8e8e8] border-none focus:ring-0 cursor-pointer appearance-none pr-6 hover:bg-[#252525] px-2 py-1 rounded transition-colors"
                                        >
                                            <option value="system">Use system setting</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#787878]" />
                                    </div>
                                </div>

                                <div className="h-px bg-[#333] w-full" />

                                {/* Language & Time Section */}
                                <div>
                                    <h2 className="text-[14px] font-semibold text-white mb-6">Language & Time</h2>
                                    <div className="space-y-6">
                                        {/* Language */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-[14px] font-medium text-white mb-1">Language</h3>
                                                <p className="text-[13px] text-[#787878]">Change the language used in the user interface.</p>
                                            </div>
                                            <div className="relative">
                                                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#252525] border border-[#333] rounded text-[13px] text-white hover:bg-[#2a2a2a] transition-colors">
                                                    English (US)
                                                    <ChevronDown size={14} className="text-[#787878]" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Text Direction */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-[14px] font-medium text-white mb-1">Always show text direction controls</h3>
                                                <p className="text-[13px] text-[#787878]">Show options to change text direction (LTR/RTL) in the editor menu, even when your language is left-to-right.</p>
                                            </div>
                                            <button className="w-9 h-5 rounded-full bg-[#333] relative transition-colors mt-1">
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-[#787878]" />
                                            </button>
                                        </div>

                                        {/* Start week on Monday */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-[14px] font-medium text-white mb-1">Start week on Monday</h3>
                                                <p className="text-[13px] text-[#787878]">This will change how all calendars in your app look.</p>
                                            </div>
                                            <button className="w-9 h-5 rounded-full bg-[#333] relative transition-colors mt-1">
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-[#787878]" />
                                            </button>
                                        </div>

                                        {/* Timezone */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-[14px] font-medium text-white mb-1">Set timezone automatically using your location</h3>
                                                <p className="text-[13px] text-[#787878]">Reminders, notifications and emails are delivered based on your time zone.</p>
                                            </div>
                                            <button className="w-9 h-5 rounded-full bg-[#0077d4] relative transition-colors mt-1">
                                                <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-[#333] w-full" />

                                {/* Desktop App */}
                                <div>
                                    <h2 className="text-[14px] font-semibold text-white mb-6">Desktop app</h2>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-[14px] font-medium text-white mb-1">Open links in desktop app</h3>
                                            <p className="text-[13px] text-[#787878]">You must have the <span className="underline cursor-pointer">macOS app</span> installed.</p>
                                        </div>
                                        <button className="w-9 h-5 rounded-full bg-[#333] relative transition-colors mt-1">
                                            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-[#787878]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai-models' && (
                        <div className="max-w-2xl mx-auto space-y-10">
                            <div className="space-y-6">
                                {/* Default Model */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-[14px] font-medium text-white mb-1">Default AI Model</h3>
                                        <p className="text-[13px] text-[#787878]">Choose the default model for new conversations.</p>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => handleModelChange(e.target.value)}
                                            className="bg-transparent text-[13px] text-[#e8e8e8] border-none focus:ring-0 cursor-pointer appearance-none pr-6 hover:bg-[#252525] px-2 py-1 rounded transition-colors"
                                        >
                                            <option value="auto">Auto</option>
                                            <option value="auromind">Auromind AI (Beta)</option>
                                            <option value="gemini">Gemini</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#787878]" />
                                    </div>
                                </div>

                                <div className="h-px bg-[#333] w-full" />

                                {/* Models Info */}
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-[#252525] border border-[#333]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sparkles size={16} className="text-indigo-400" />
                                            <span className="text-sm font-medium text-white">Auromind AI</span>
                                        </div>
                                        <p className="text-xs text-[#787878]">Our flagship model for complex reasoning and workflow automation.</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[#252525] border border-[#333]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none">
                                                <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="#4285F4" />
                                                <path d="M4 16L16 22L28 16L28 10L16 16L4 10L4 16Z" fill="#34A853" />
                                                <path d="M4 22L16 28L28 22L28 16L16 22L4 16L4 22Z" fill="#FBBC04" />
                                                <path d="M16 28L28 22L28 16" fill="#EA4335" opacity="0.7" />
                                            </svg>
                                            <span className="text-sm font-medium text-white">Gemini</span>
                                        </div>
                                        <p className="text-xs text-[#787878]">Fast and efficient for quick tasks and general assistance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder Tabs */}
                    {['notifications', 'connections-account', 'general', 'people', 'teamspaces', 'security', 'public-pages', 'import'].includes(activeTab) && (
                        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full opacity-50">
                            <Settings size={48} className="mb-4 text-[#333]" />
                            <p className="text-[14px] text-[#787878]">This section is under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsContent;
