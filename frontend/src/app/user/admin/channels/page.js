'use client';

import { useState, useEffect } from 'react';
import {
    Smartphone,
    Instagram,
    Mail,
    Search,
    ChevronDown,
    Plus,
    Check,
    X,
    Filter,
    ArrowUpDown,
    Grid,
    Zap
} from 'lucide-react';
import { getWorkspace } from '@/lib/auth';

const CHANNELS_DATA = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        subHeader: 'Twilio Powered',
        description: 'Connect your business number via Twilio to automate replies and manage leads.',
        icon: Smartphone,
        iconColor: '#25D366',
        accountId: '+91 98765 43210'
    },
    {
        id: 'instagram',
        name: 'Instagram Direct',
        subHeader: 'Social Media',
        description: 'Sync DMs and comments directly to your Unified Inbox.',
        icon: Instagram,
        iconColor: '#E4405F',
        accountId: '@auromind_ai'
    },
    {
        id: 'gmail',
        name: 'Gmail / G-Suite',
        subHeader: 'Email Service',
        description: 'Sync emails, categorize threads, and draft AI responses automatically.',
        icon: Mail,
        iconColor: '#EA4335',
        accountId: 'hello@auromind.com'
    },
    {
        id: 'twilio',
        name: 'Twilio API',
        subHeader: 'Infrastructure',
        description: 'Power your WhatsApp and SMS communications with our native Twilio bridge.',
        icon: Zap,
        iconColor: '#F22F46',
        accountId: 'AC...82f1'
    }
];

export default function ChannelsPage() {
    const [statuses, setStatuses] = useState({
        whatsapp: true,
        instagram: true,
        gmail: true,
        twilio: true
    });
    const [loading, setLoading] = useState(false);
    const workspace = getWorkspace();

    const handleToggle = (id) => {
        setStatuses(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-[#E5E5E5] p-6 lg:p-12 font-sans overflow-y-auto">
            <div className="max-w-6xl mx-auto relative">
                
                {/* Header */}
                <div className="mb-10 pt-4">
                    <h1 className="text-4xl font-semibold text-white mb-3">Channels</h1>
                    <p className="text-[#888] text-[15px] max-w-2xl leading-relaxed">
                        Centeralize your communications. Connect your messaging platforms to allow Auromind to manage and automate your customer interactions.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-10">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                        <input 
                            type="text" 
                            placeholder="Search"
                            className="w-full bg-[#262626] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-[15px] text-white placeholder:text-[#555] outline-none focus:border-white/10 transition-all"
                        />
                    </div>
                    
                    {[
                        { label: 'Sort', icon: ArrowUpDown },
                        { label: 'Type', icon: Grid },
                        { label: 'Categories', icon: Filter }
                    ].map((btn) => (
                        <button key={btn.label} className="flex items-center gap-2 px-4 py-2.5 bg-[#262626] border border-white/5 rounded-xl text-[14px] text-[#D4D4D4] hover:bg-[#2d2d2d] transition-all">
                            {btn.label}
                            <ChevronDown size={14} className="text-[#666]" />
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {CHANNELS_DATA.map((item) => {
                        const isConnected = statuses[item.id];
                        const Icon = item.icon;
                        
                        return (
                            <div 
                                key={item.id}
                                className="group bg-[#262626] border border-white/5 rounded-2xl p-5 flex items-start gap-5 hover:border-white/10 transition-all cursor-default"
                            >
                                {/* Platform Icon Wrapper */}
                                <div className="w-14 h-14 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <Icon size={28} style={{ color: item.iconColor }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-[17px] font-medium text-white">{item.name}</h3>
                                        <span className="text-[11px] text-[#555] font-medium uppercase tracking-wider">{item.subHeader}</span>
                                    </div>
                                    <p className="text-[#888] text-[14px] leading-snug">
                                        {item.description}
                                    </p>
                                    {isConnected && item.accountId && (
                                        <p className="mt-2 text-[11px] text-[#555] font-mono">
                                            {item.accountId}
                                        </p>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="pt-1">
                                    {isConnected ? (
                                        <button 
                                            onClick={() => handleToggle(item.id)}
                                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#666] hover:bg-red-500/10 hover:text-red-400 transition-all"
                                            title="Click to disconnect"
                                        >
                                            <Check size={20} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleToggle(item.id)}
                                            className="w-10 h-10 rounded-xl bg-[#333] border border-white/5 flex items-center justify-center text-[#D4D4D4] hover:bg-[#3d3d3d] hover:text-white hover:border-white/10 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-[#444] text-[13px]">
                    <p>Auromind AI securely handles your communication data according to our privacy policy.</p>
                </div>
            </div>
        </div>
    );
}