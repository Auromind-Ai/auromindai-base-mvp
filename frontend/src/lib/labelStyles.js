export const SYSTEM_TIERS = {
    hot: { text: '🔥 Hot', bg: 'bg-rose-500/10', textCls: 'text-rose-400', border: 'border-rose-500/25' },
    warm: { text: '🟡 Warm', bg: 'bg-amber-500/10', textCls: 'text-amber-400', border: 'border-amber-500/25' },
    cold: { text: '❄️ Cold', bg: 'bg-zinc-500/10', textCls: 'text-zinc-400', border: 'border-zinc-500/25' }
};

export const AGENT_LABELS = {
    'Premium Lead': {
        name: 'Premium Lead',
        emoji: '👑',
        activeBg: 'bg-[#4B2580] border-[#6D39BD]',
        textCls: 'text-white',
        inactiveBorder: 'border-white/10 hover:border-white/20',
        bgOpacity: 'bg-[#4B2580]/10 border-[#6D39BD]/20 text-zinc-400 hover:bg-[#4B2580]/20 hover:border-[#6D39BD]/45 hover:text-zinc-200'
    },
    'High Priority': {
        name: 'High Priority',
        emoji: '🔥',
        activeBg: 'bg-[#7B1A2E] border-[#A82B44]',
        textCls: 'text-white',
        inactiveBorder: 'border-white/10 hover:border-white/20',
        bgOpacity: 'bg-[#7B1A2E]/10 border-[#A82B44]/20 text-zinc-400 hover:bg-[#7B1A2E]/20 hover:border-[#A82B44]/45 hover:text-zinc-200'
    },
    'Interested': {
        name: 'Interested',
        emoji: '⚡',
        activeBg: 'bg-[#145A32] border-[#208A4E]',
        textCls: 'text-white',
        inactiveBorder: 'border-white/10 hover:border-white/20',
        bgOpacity: 'bg-[#145A32]/10 border-[#208A4E]/20 text-zinc-400 hover:bg-[#145A32]/20 hover:border-[#208A4E]/45 hover:text-zinc-200'
    },
    'Follow Up': {
        name: 'Follow Up',
        emoji: '📅',
        activeBg: 'bg-[#0F4C81] border-[#1A73C2]',
        textCls: 'text-white',
        inactiveBorder: 'border-white/10 hover:border-white/20',
        bgOpacity: 'bg-[#0F4C81]/10 border-[#1A73C2]/20 text-zinc-400 hover:bg-[#0F4C81]/20 hover:border-[#1A73C2]/45 hover:text-zinc-200'
    }
};

export const STATUS_STYLES = {
    'new': { bg: 'bg-[#1e293b]', text: 'text-zinc-300', border: 'border-white/10' },
    'active': { bg: 'bg-[#0f172a]', text: 'text-sky-400', border: 'border-sky-500/10' },
    'converted': { bg: 'bg-[#1e1b4b]', text: 'text-purple-400', border: 'border-purple-500/10' },
    'lost': { bg: 'bg-[#450a0a]', text: 'text-rose-400', border: 'border-rose-500/10' }
};
