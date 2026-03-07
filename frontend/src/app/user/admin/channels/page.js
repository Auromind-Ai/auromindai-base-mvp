'use client';

import {
    Smartphone,
    Instagram,
    Linkedin,
    Mail,
    Calendar,
    CheckCircle2,
    Plus,
    Zap
} from 'lucide-react';

const CHANNELS = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Connect your business number to automate replies and manage leads.',
        icon: Smartphone,
        color: 'bg-green-500',
        status: 'Connected',
        accountId: '+91 98765 43210',
        tags: ['Messaging', 'Automation', 'AI Replies']
    },
    {
        id: 'instagram',
        name: 'Instagram Direct',
        description: 'Sync DMs and comments directly to your Unified Inbox.',
        icon: Instagram,
        color: 'bg-pink-500',
        status: 'Connect',
        accountId: null,
        tags: ['Messaging', 'Comments']
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Automate outreach and manage professional network messages.',
        icon: Linkedin,
        color: 'bg-blue-600',
        status: 'Connect',
        accountId: null,
        tags: ['Outreach', 'Networking']
    },
    {
        id: 'gmail',
        name: 'Gmail / G-Suite',
        description: 'Sync emails, categorize threads, and draft AI responses.',
        icon: Mail,
        color: 'bg-red-500',
        status: 'Connect',
        accountId: null,
        tags: ['Email', 'AI Drafts']
    },
    {
        id: 'calendar',
        name: 'Google Calendar',
        description: 'Allow AI to check availability and book meetings automatically.',
        icon: Calendar,
        color: 'bg-blue-500',
        status: 'Connected',
        accountId: 'calendar@auromind.com',
        tags: ['Meetings', 'Scheduling']
    }
];

export default function ChannelsPage() {

    const active = CHANNELS.filter(c => c.status === 'Connected').length;

    return (
        <div className="w-full max-w-[1400px] mx-auto px-6 space-y-10">

            {/* HEADER */}
            <div className="p-4 text-center">
                <h1 className="text-3xl font-bold text-[#E5E5E5] tracking-tight">
                    Channels & Integrations
                </h1>

                <p className="text-[#9b9b9b] mt-1">
                    Connect your communication platforms to centralize messages and automate workflows.
                </p>
            </div>


            {/* STATS */}
            <div className="grid grid-cols-3 gap-4 px-4">

                <div className="sparkle-border rounded-xl p-5 flex flex-col items-center justify-center text-center border border-white/10 backdrop-blur-md bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
                    <div className="text-2xl font-bold text-white">{CHANNELS.length}</div>
                    <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Integrations</div>
                </div>

                <div className="sparkle-border rounded-xl p-5 flex flex-col items-center justify-center text-center border border-white/10 backdrop-blur-md bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
                    <div className="text-2xl font-bold text-white">{active}</div>
                    <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Active</div>
                </div>

                <div className="sparkle-border rounded-xl p-5 flex flex-col items-center justify-center text-center border border-white/10 backdrop-blur-md bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
                    <div className="text-2xl font-bold text-white">{CHANNELS.length - active}</div>
                    <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Available</div>
                </div>

            </div>


            {/* INTEGRATIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">

                {CHANNELS.map((channel) => (

                    <div
                        key={channel.id}
                        className="group relative rounded-2xl p-6 border border-white/10
                                    backdrop-blur-md
                                    bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent
                                    transition-all duration-300
                                    hover:-translate-y-1
                                    hover:shadow-2xl
                                    hover:shadow-indigo-500/10
                                    hover:border-indigo-500/30"
                    >

                        {/* HEADER */}
                        <div className="flex items-start justify-between mb-4">

                            <div className={`w-12 h-12 rounded-xl ${channel.color} bg-opacity-20 flex items-center justify-center border border-white/10`}>
                                <channel.icon size={24} className="text-white" />
                            </div>

                            {channel.status === 'Connected' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">
                                    <CheckCircle2 size={12} />
                                    Active
                                </span>
                            ) : (
                                <button className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs hover:bg-indigo-600 hover:text-white transition">
                                    <Plus size={12} />
                                    Connect
                                </button>
                            )}

                        </div>


                        {/* TITLE */}
                        <h3 className="text-lg font-semibold text-white mb-1">
                            {channel.name}
                        </h3>

                        <p className="text-sm text-[#9b9b9b] mb-4 leading-relaxed">
                            {channel.description}
                        </p>


                        {/* CAPABILITY TAGS */}
                        <div className="flex flex-wrap gap-2 mb-4">

                            {channel.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="text-xs px-2 py-1 rounded-md bg-[#262626] text-[#9b9b9b] border border-[#2f2f2f]"
                                >
                                    {tag}
                                </span>
                            ))}

                        </div>


                        {/* AI READY BADGE */}
                        <div className="flex items-center gap-2 text-xs text-indigo-400 mb-2">
                            <Zap size={12}/>
                            AI Automation Ready
                        </div>


                        {/* ACCOUNT */}
                        {channel.status === 'Connected' && (
                            <div className="mt-4 pt-4 border-t border-[var(--notion-border)] flex items-center justify-between text-xs">
                                <span className="text-[#6f6f6f]">Connected as</span>
                                <span className="text-emerald-400 font-mono">
                                    {channel.accountId}
                                </span>
                            </div>
                        )}

                    </div>
                ))}


                {/* REQUEST INTEGRATION */}
                <div className="border border-dashed border-[var(--notion-border)] rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-[var(--card)]/60 transition cursor-pointer min-h-[200px]">

                    <div className="w-12 h-12 rounded-full bg-[#2c2c2c] flex items-center justify-center mb-3">
                        <Plus size={24}/>
                    </div>

                    <h3 className="text-sm font-semibold text-[#D4D4D4]">
                        Request Integration
                    </h3>

                    <p className="text-xs text-[#787878] mt-1">
                        Don't see your channel? Let us know.
                    </p>

                </div>

            </div>

        </div>
    );
}