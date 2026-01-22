'use client';

import {
    Smartphone,
    Instagram,
    Linkedin,
    Mail,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Plus
} from 'lucide-react';

const CHANNELS = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Connect your business number to automate replies and manage leads.',
        icon: Smartphone,
        color: 'bg-green-500',
        status: 'Connected',
        accountId: '+91 98765 43210'
    },
    {
        id: 'instagram',
        name: 'Instagram Direct',
        description: 'Sync DMs and comments directly to your Unified Inbox.',
        icon: Instagram,
        color: 'bg-pink-500',
        status: 'Connect',
        accountId: null
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Automate outreach and manage professional network messages.',
        icon: Linkedin,
        color: 'bg-blue-600',
        status: 'Connect',
        accountId: null
    },
    {
        id: 'gmail',
        name: 'Gmail / G-Suite',
        description: 'Sync emails, categorize threads, and draft AI responses.',
        icon: Mail,
        color: 'bg-red-500',
        status: 'Connect',
        accountId: null
    },
    {
        id: 'calendar',
        name: 'Google Calendar',
        description: 'Allow AI to check availability and book meetings automatically.',
        icon: Calendar,
        color: 'bg-blue-500',
        status: 'Connected',
        accountId: 'calendar@auromind.com'
    }
];

export default function ChannelsPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="mb-8 p-4">
                <h1 className="text-3xl font-bold text-[#D4D4D4] tracking-tight font-display mb-2">Channels & Integrations</h1>
                <p className="text-[#9b9b9b] font-medium">Connect your communication platforms to centralize messages and automate workflows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                {CHANNELS.map((channel) => (
                    <div
                        key={channel.id}
                        className="group relative bg-[var(--card)] rounded-2xl p-6 border border-[var(--notion-border)] shadow-xl hover:bg-[#252525] transition-all duration-300 h-full flex flex-col"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl ${channel.color} bg-opacity-20 flex items-center justify-center border border-white/10 shadow-lg`}>
                                <channel.icon size={24} className="text-white" />
                            </div>
                            {channel.status === 'Connected' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                                    <CheckCircle2 size={12} />
                                    Active
                                </span>
                            ) : (
                                <button className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-medium group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Plus size={12} />
                                    Connect
                                </button>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">{channel.name}</h3>
                        <p className="text-sm text-[#9b9b9b] font-medium mb-4 leading-relaxed flex-1">{channel.description}</p>

                        {channel.status === 'Connected' && (
                            <div className="mt-4 pt-4 border-t border-[var(--notion-border)] flex items-center justify-between text-xs font-bold">
                                <span className="text-[#565656] uppercase tracking-wider">Connected as</span>
                                <span className="text-emerald-400/80 font-mono bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{channel.accountId}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-500/10 rounded-2xl pointer-events-none transition-all" />
                    </div>
                ))}

                {/* Proposed/Coming Soon Integration */}
                <div className="group border border-dashed border-[var(--notion-border)] rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-[var(--card)]/50 transition-all cursor-pointer min-h-[160px]">
                    <div className="w-12 h-12 rounded-full bg-[#2c2c2c] flex items-center justify-center text-[#565656] mb-3 group-hover:text-indigo-400 group-hover:bg-[var(--card)] transition-all border border-[#3f3f3f]">
                        <Plus size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-[#787878] group-hover:text-[#D4D4D4] transition-colors">Request Integration</h3>
                    <p className="text-xs font-medium text-[#565656] mt-1">Don't see your channel? Let us know.</p>
                </div>
            </div>
        </div>
    );
}
