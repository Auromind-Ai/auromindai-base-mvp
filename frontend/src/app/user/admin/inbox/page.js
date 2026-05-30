'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Phone, Instagram, Globe, Mail, Paperclip,
    Zap, Sparkles, Send, Clock, User, Star, Calendar,
    ArrowRight, ChevronRight, MoreHorizontal, Info,
    ArrowLeft, SlidersHorizontal, Camera, FileText,
    PenLine, CheckSquare, UserCheck, XCircle, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getWorkspace, getToken } from '@/lib/auth';
import { useRealtime } from '@/context/RealtimeContext';
import MessageRenderer from '@/components/chat/MessageRenderer';

const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: '#28C661', gradient: null },
    {
        id: 'instagram', label: 'Instagram', icon: Instagram, color: '#ee2a7b',
        gradient: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)'
    },
    { id: 'twilio', label: 'Twilio', icon: Zap, color: '#CE272D', gradient: null },
];

const FILTER_PILLS = {
    whatsapp: ['All', 'Unread', 'Open', 'Closed'],
    instagram: [],
    twilio: [],
};

const PROXY_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Shared card style for all three panels
const CARD_BG = '#15161C';
const CARD_BORDER = 'rgba(255,255,255,0.07)';

function getHeaders() {
    const token = typeof window !== 'undefined' ? getToken() : null;
    return {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getDisplayName(lead, channelId) {
    if (channelId === 'instagram') {
        return lead.contact_name || lead.username || 'Instagram User';
    }
    return lead.phone || lead.contact_name || 'Unknown';
}

function getAvatarText(lead, channelId) {
    if (channelId === 'instagram') {
        const name = lead.contact_name || lead.username || 'U';
        return name[0].toUpperCase();
    }
    const phone = lead.phone || '';
    return phone.slice(-2) || 'U';
}

function ProfilePic({ src, alt, fallbackText, color, className = '' }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return <span style={{ color }} className={className}>{fallbackText}</span>;
    }
    return (
        <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover ${className}`}
            onError={() => setFailed(true)}
        />
    );
}

function ChannelIcon({ channel, size = 16 }) {
    const Icon = channel.icon;
    if (channel.gradient) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <defs>
                    <linearGradient id={`grad-${channel.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f9ce34" />
                        <stop offset="50%" stopColor="#ee2a7b" />
                        <stop offset="100%" stopColor="#6228d7" />
                    </linearGradient>
                </defs>
                <Icon size={size} stroke={`url(#grad-${channel.id})`} strokeWidth={2} />
            </svg>
        );
    }
    return <Icon size={size} strokeWidth={2} style={{ color: channel.color }} />;
}

function UnreadBadge({ count, channel }) {
    if (!count) return null;
    const style = channel.gradient
        ? { background: channel.gradient }
        : { backgroundColor: channel.color };
    return (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={style}>
            {count}
        </span>
    );
}

function formatActiveTime(dateStr) {
    if (!dateStr) return 'Inactive';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Inactive';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Active just now';
    if (mins < 60) return `Active ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Active ${hrs}h ago`;
    if (hrs < 48) return 'Active yesterday';
    return `Active ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

// ─── Reusable: Sidebar / Conversations List ───────────────────────────────────
function ConversationSidebar({ ch, conversations, lead, activeFilter, onFilterChange, onLeadSelect }) {
    const [searchQuery, setSearchQuery] = useState('');
    const isInstagram = ch.id === 'instagram';
    const filters = FILTER_PILLS[ch.id] || [];

    function formatConvTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        const today = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const msgDay = new Date(d); msgDay.setHours(0,0,0,0);
        if (msgDay.getTime() === today.getTime()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    let filtered = conversations.filter(l => {
        const name = getDisplayName(l, ch.id).toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery.toLowerCase());
    });

    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = [...filtered].sort((a, b) => {
            const aPhone = (a.phone || '').toLowerCase().includes(query);
            const bPhone = (b.phone || '').toLowerCase().includes(query);
            if (aPhone && !bPhone) return -1;
            if (!aPhone && bPhone) return 1;
            return 0;
        });
    }

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            {/* Header */}
            <div className="p-4 pb-3 shrink-0">
                <div className="flex items-center gap-2.5 mb-4">
                    {isInstagram ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ch.gradient }}>
                            <Instagram size={16} strokeWidth={2} className="text-white" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ch.color}20` }}>
                            <ch.icon size={16} strokeWidth={2} style={{ color: ch.color }} />
                        </div>
                    )}
                    <span className="text-[15px] font-semibold text-white">{ch.label} Inbox</span>
                </div>

                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" strokeWidth={2} />
                    <input
                        placeholder={isInstagram ? 'Search or ask Meta AI' : 'Search Conversations'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-full text-[13px] text-white placeholder:text-[#555] outline-none border"
                        style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.07)' }}
                    />
                </div>

                {filters.length > 0 && (
                    <div className="flex items-center gap-2">
                        {ch.id !== 'whatsapp' && (
                            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[#666]"
                                style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.07)' }}>
                                <SlidersHorizontal size={13} strokeWidth={2} />
                                <ChevronDown size={12} strokeWidth={2} />
                            </button>
                        )}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                            {filters.map((f, i) => (
                                <button
                                    key={f}
                                    onClick={() => onFilterChange(i)}
                                    className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border"
                                    style={activeFilter === i
                                        ? { backgroundColor: `${ch.color}20`, color: ch.color, borderColor: `${ch.color}40` }
                                        : { backgroundColor: 'transparent', color: '#666', borderColor: 'rgba(255,255,255,0.07)' }
                                    }
                                >
                                    {f}
                                    {f === 'All' && conversations.length > 0 && (
                                        <span className="ml-1 text-[10px] opacity-60">{conversations.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
                {filtered.length === 0 && (
                    <p className="text-center text-[#444] text-[12px] mt-10">No conversations yet</p>
                )}
                {filtered.map((l, idx) => {
                    const sel = lead?.id === l.id;
                    const displayName = getDisplayName(l, ch.id);
                    const avatarText = getAvatarText(l, ch.id);

                    return (
                        <motion.button
                            key={l.id}
                            onClick={() => onLeadSelect(l)}
                            whileHover={{ backgroundColor: '#1e1e1e' }}
                            className="w-full p-3.5 mb-1 rounded-xl text-left transition-all border"
                            style={sel
                                ? { backgroundColor: '#1e1e1e', borderColor: `${ch.color}40`, borderLeftColor: ch.color, borderLeftWidth: 3 }
                                : { backgroundColor: 'transparent', borderColor: 'transparent', borderLeftWidth: 3, borderLeftColor: 'transparent' }
                            }
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-[14px] font-semibold shrink-0"
                                    style={{ backgroundColor: '#222' }}>
                                    {isInstagram && l.profile_pic ? (
                                        <ProfilePic src={l.profile_pic} alt={displayName} fallbackText={avatarText} color={ch.color} />
                                    ) : (
                                        <span style={{ color: ch.color }}>{avatarText}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[13px] font-semibold text-white truncate">{displayName}</span>
                                        <span className="text-[11px] text-[#555] shrink-0 ml-2">
                                            {formatConvTime(l.last_message_at || l.updated_at || l.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[12px] text-[#666] truncate leading-relaxed flex-1">
                                            {l.last_message || l.preview || l.last_message_text || 'No messages yet'}
                                        </p>
                                        {ch.id === 'instagram'
                                            ? <Camera size={15} className="shrink-0 ml-2 text-[#555]" strokeWidth={1.5} />
                                            : <UnreadBadge count={l.unread_count || l.unread || l.unseen_count || 0} channel={ch} />
                                        }
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

function getConversationStats(conversation, messages) {
    const firstMsgDate = messages && messages.length > 0 ? (messages[0].created_at || messages[0].timestamp) : null;
    const oldestDate = firstMsgDate || conversation?.created_at || conversation?.first_contact_at;

    const lastMsgDate = messages && messages.length > 0 ? (messages[messages.length - 1].created_at || messages[messages.length - 1].timestamp) : null;
    const newestDate = lastMsgDate || conversation?.last_message_at || conversation?.updated_at || conversation?.created_at;

    const totalMessages = conversation?.message_count || conversation?.total_messages || (messages ? messages.length : 0);

    let rawStatus = conversation?.status || "Open";
    const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

    function formatFirstContact(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatLastContact(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const today = new Date(); today.setHours(0,0,0,0);
        const msgDay = new Date(d); msgDay.setHours(0,0,0,0);
        
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (msgDay.getTime() === today.getTime()) {
            return `Today, ${timeStr}`;
        }
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${datePart} ${timeStr}`;
    }

    return {
        firstContact: formatFirstContact(oldestDate),
        lastContact: formatLastContact(newestDate),
        totalMessages,
        status
    };
}

// ─── Reusable: Info Panel ─────────────────────────────────────────────────────
function InfoPanel({ ch, lead, onBack, showBackButton = false, resolvedLeadId, messages }) {
    const router = useRouter();
    const isInstagram = ch.id === 'instagram';
    const stats = getConversationStats(lead, messages);

    return (
        <div className="w-full h-full overflow-y-auto p-5" style={{ backgroundColor: CARD_BG }}>
            {showBackButton && (
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#666] text-[13px] mb-4 hover:text-white transition"
                >
                    <ArrowLeft size={16} /> Back to Chat
                </button>
            )}

            {!lead ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-[#444] text-[13px]">Select a conversation</p>
                </div>
            ) : (
                <>
                    <p className="text-[16px] font-regular text-white/90 tracking-widest mb-8">Contact Details</p>

                    <div className="flex items-center gap-3 mb-5">
                        {/* Avatar — left */}
                        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold shrink-0"
                            style={{ backgroundColor: '#1e1e1e' }}>
                            {isInstagram && lead.profile_pic ? (
                                <ProfilePic src={lead.profile_pic} alt={getDisplayName(lead, ch.id)} fallbackText={getAvatarText(lead, ch.id)} color={ch.color} />
                            ) : (
                                <span style={{ color: ch.color }}>{getAvatarText(lead, ch.id)}</span>
                            )}
                        </div>

                        {/* Info — right */}
                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[15px] font-semibold text-white truncate">
                                {getDisplayName(lead, ch.id)}
                            </h4>
                            {isInstagram && (
                                <p className="text-[12px] text-white/50 mt-0.5">@priya__002</p>
                            )}
                            {!isInstagram && lead.phone && (
                                <p className="text-[12px] text-white/50 mt-0.5">{lead.phone}</p>
                            )}
                            {isInstagram && (
                                <p className="text-[11px] text-white/40 mt-0.5">India · 10:45 AM</p>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-[16px] font-regular text-white/90 tracking-wider mb-3 mt-10">About</p>
                        <p className="text-[14px] text-white/70 leading-relaxed">
                            Interested in premium plans<br />Frequently asks about pricing
                        </p>
                        <button className="text-[13px] mt-1 font-medium" style={{ color: ch.color }}>View more</button>
                    </div>

                    <div className="mb-6">
                        <p className="text-[16px] font-regular text-white/90 tracking-wider mb-3 mt-10">Labels</p>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ flexWrap: 'nowrap' }}>
                            <button onClick={() => {
                                const leadId = resolvedLeadId || lead?.id;
                                router.push(`/user/admin/leads?leadId=${leadId}`);
                            }} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: '#752643' }}>High Priority</button>
                            <button onClick={() => {
                                const leadId = resolvedLeadId || lead?.id;
                                router.push(`/user/admin/leads?leadId=${leadId}`);
                            }} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white shrink-0 hover:opacity-80 transition-opacity" style={{ background: '#3B2372' }}>Premium Lead</button>
                            <button onClick={() => {
                                const leadId = resolvedLeadId || lead?.id;
                                router.push(`/user/admin/leads?leadId=${leadId}`);
                            }} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: '#1F5A38' }}>Interested</button>
                        </div>
                    </div>

                    <div className="mb-6 space-y-2.5">
                        <p className="text-[16px] font-regular text-white/90 tracking-wider mb-3 mt-10">Conversation Info</p>
                        {[
                            ['First Contact', stats.firstContact || '—'],
                            ['Last Contact', stats.lastContact || '—'],
                            ['Total Messages', stats.totalMessages],
                            ['Status', <span key="status" style={{ color: ch.color }}>{stats.status}</span>],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-[13px] text-white/70 font-medium">{label}</span>
                                <span className="text-[13px] text-white/70 font-medium">{value}</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <p className="text-[16px] font-regular text-white/90 tracking-wider mb-4 mt-10">Quick Actions</p>
                        <div className="space-y-2">
                            {[
                                { icon: PenLine, text: 'Add Note' },
                                { icon: CheckSquare, text: 'Create Task' },
                                { icon: UserCheck, text: 'Assign Agent' },
                            ].map((a) => (
                                <button key={a.text}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] text-white hover:border-white/10 transition-colors"
                                    style={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <a.icon size={15} strokeWidth={2} className="text-[#666]" />
                                    {a.text}
                                </button>
                            ))}
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                                style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                                <XCircle size={15} strokeWidth={2} />
                                Close Conversation
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Reusable: Chat Area ──────────────────────────────────────────────────────
function ChatArea({
    ch, lead, messages, msg, setMsg, aiSuggestion, sendMessage,
    generateSuggestion, useSuggestion, onInfoClick, onBackToList,
    previewMedia, setPreviewMedia,
    showMobileBackButton = false,
    // For tablet/desktop info icon active state
    infoActive = false,
}) {
    const ref = useRef(null);
    const messagesContainerRef = useRef(null);
    const isInstagram = ch.id === 'instagram';

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
        if (isNearBottom) {
            ref.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    function getOutgoingStyle() {
        if (ch.id === 'instagram') return { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' };
        if (ch.id === 'twilio') return { backgroundColor: '#F22F46' };
        return { backgroundColor: '#1a7a45' };
    }

    if (!lead) {
        return (
            <div className="flex-1 flex items-center justify-center h-full" style={{ backgroundColor: CARD_BG }}>
                <p className="text-[#444] text-[14px]">Select a conversation</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                    {showMobileBackButton && (
                        <button
                            onClick={onBackToList}
                            className="p-1.5 rounded-lg text-[#666] hover:text-white"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ backgroundColor: '#1e1e1e' }}>
                        {isInstagram && lead.profile_pic ? (
                            <ProfilePic src={lead.profile_pic} alt={getDisplayName(lead, ch.id)} fallbackText={getAvatarText(lead, ch.id)} color={ch.color} />
                        ) : (
                            <span style={{ color: ch.color }}>{getAvatarText(lead, ch.id)}</span>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-[14px] font-semibold text-white">{getDisplayName(lead, ch.id)}</h3>
                            {ch.id !== 'whatsapp' && <ChevronRight size={14} className="text-[#555]" />}
                        </div>
                        <p className="text-[12px] text-[#666]">
                            {ch.id === 'whatsapp' ? (
                                <span className="text-emerald-400">● Online</span>
                            ) : formatActiveTime(lead?.last_message_at || lead?.updated_at)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Info icon: visible on tablet only (hidden on desktop since info is always visible) */}
                    <button
                        onClick={onInfoClick}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
                        style={{ color: infoActive ? ch.color : '#777' }}
                    >
                        <Info size={17} strokeWidth={2} />
                    </button>
                    {/* Info icon: desktop version (no-op / decorative) */}
                    <button
                        className="p-2 rounded-lg text-[#777] hidden lg:flex"
                        style={{ color: '#777' }}
                    >
                        <Info size={17} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-center mb-4">
                    <span className="text-[11px] text-[#555] px-3 py-1 rounded-full border border-white/5 bg-white/[0.03]">
                        Today
                    </span>
                </div>

                <div className="max-w-2xl mx-auto space-y-2">
                    {messages.map((m) => {
                        const isUser = m.sender_type?.toLowerCase() === 'user';
                        const isAI = m.sender_type?.toLowerCase() === 'ai';
                        const isSuggested = m.status?.toLowerCase() === 'suggested';

                        return (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                            >
                                {isAI && isSuggested ? (
                                    <div className="max-w-[75%] p-4 rounded-2xl border"
                                        style={{ backgroundColor: `${ch.color}10`, borderColor: `${ch.color}25` }}>
                                        <div className="flex items-center gap-2 mb-2" style={{ color: ch.color }}>
                                            <Sparkles size={13} strokeWidth={2} />
                                            <span className="text-[12px] font-semibold">AI Suggestion</span>
                                        </div>
                                        <p className="text-[13px] text-[#bbb] leading-relaxed">{m.content}</p>
                                        <button onClick={() => setMsg(m.content)} className="flex items-center gap-1 mt-3 text-[12px] font-medium" style={{ color: ch.color }}>
                                            Use reply <ChevronRight size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`max-w-[72%] px-4 py-3 ${isUser ? 'rounded-[20px_20px_20px_6px]' : 'rounded-[20px_20px_6px_20px]'}`}
                                        style={isUser 
                                            ? { backgroundColor: '#252525', borderBottomLeftRadius: '6px' } 
                                            : { ...getOutgoingStyle(), borderBottomRightRadius: '6px' }
                                        }
                                    >
                                        <MessageRenderer
                                            content={m.content}
                                            metadata={(() => { try { return typeof m.metadata_json === 'string' ? JSON.parse(m.metadata_json) : (m.metadata_json || null); } catch { return null; } })()}
                                            isMe={!isUser}
                                            theme={ch}
                                            onPreviewMedia={setPreviewMedia}
                                        />
                                        <p className="text-[10px] text-white/40 mt-1.5">
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                    <div ref={ref} />
                </div>

                {/* Media preview modal */}
                {previewMedia && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewMedia(null)}>
                        {previewMedia.type === 'image' ? (
                            <img src={previewMedia.url} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl" alt="preview" />
                        ) : (
                            <video src={previewMedia.url} controls autoPlay onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
                        )}
                    </div>
                )}
            </div>

            {/* AI Suggestion Banner */}
            <AnimatePresence>
                {aiSuggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mx-4 mb-2 p-3 rounded-xl flex justify-between items-center border"
                        style={{ backgroundColor: `${ch.color}12`, borderColor: `${ch.color}25` }}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={13} style={{ color: ch.color }} />
                            <p className="text-[12px] text-white">{aiSuggestion}</p>
                        </div>
                        <button onClick={useSuggestion} className="text-[11px] font-semibold px-3 py-1 rounded-lg hover:bg-white/5 transition ml-3" style={{ color: ch.color }}>
                            Use
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={generateSuggestion}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            style={{ backgroundColor: `${ch.color}15`, color: ch.color }}
                        >
                            <Sparkles size={11} />
                            Suggest Reply
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-2 rounded-full border"
                        style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: `${ch.color}20` }}>
                            <Camera size={16} style={{ color: ch.color }} strokeWidth={2} />
                        </button>
                        <input
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Message"
                            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#555] outline-none px-1"
                        />
                        <button
                            onClick={sendMessage}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={isInstagram
                                ? { background: 'linear-gradient(135deg, #ee2a7b, #6228d7)' }
                                : { backgroundColor: ch.color }
                            }
                        >
                            <Send size={15} className="text-white" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Channel Tabs ─────────────────────────────────────────────────────────────
function ChannelTabs({ ch, setCh }) {
    function getTabActiveStyle(c) {
        if (c.id === 'instagram') return { background: c.gradient };
        return { backgroundColor: c.color };
    }

    return (
        <div className="flex items-center gap-2 w-full">
            {CHANNELS.map((c) => {
                const on = ch.id === c.id;
                return (
                    <motion.button
                        key={c.id}
                        onClick={() => setCh(c)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all border"
                        style={on
                            ? { ...getTabActiveStyle(c), color: '#fff', borderColor: 'transparent', boxShadow: `0 0 12px ${c.color}55` }
                            : { backgroundColor: 'transparent', color: '#666', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                    >
                        <c.icon size={14} strokeWidth={2} />
                        <span className="hidden sm:inline">{c.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}

// Shared card wrapper
function PanelCard({ children, className = '', style = {} }) {
    return (
        <div
            className={`rounded-2xl overflow-hidden border flex flex-col ${className}`}
            style={{
                backgroundColor: CARD_BG,
                borderColor: CARD_BORDER,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InboxPage() {
    const workspace = getWorkspace();
    const {
        subscribe,
        subscribeConversation,
        unsubscribeConversation,
    } = useRealtime();
    const [ch, setCh] = useState(CHANNELS[0]);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [lead, setLead] = useState(null);
    const [resolvedLeadId, setResolvedLeadId] = useState(null);
    const [msg, setMsg] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [activeFilter, setActiveFilter] = useState(0);
    const [previewMedia, setPreviewMedia] = useState(null);
    const messagesContainerRef = useRef(null);
    const leadRef = useRef(null);

    // Tablet: right panel = 'chat' | 'info'
    const [tabletRight, setTabletRight] = useState('chat');

    // Mobile view: 'list' | 'chat' | 'info'
    const [mobileView, setMobileView] = useState('list');

    useEffect(() => {
        leadRef.current = lead;
    }, [lead]);

    const fetchLeadIdForConversation = useCallback(async (conversationId) => {
        if (!conversationId || !workspace?.id) return null;
        try {
            const res = await fetch(
                `${PROXY_BASE}/lead-scoring/leads?workspace_id=${workspace.id}&limit=100&offset=0`,
                { headers: getHeaders() }
            );
            const data = await res.json();
            const items = data.items || data || [];
            const match = items.find(l => l.conversation_id === conversationId);
            return match?.lead_id || match?.id || null;
        } catch {
            return null;
        }
    }, [workspace?.id]);

    const fetchMessages = useCallback(async (id) => {
        if (!id) return;

        try {
            const res = await fetch(`${PROXY_BASE}/api/messages/${id}`, { headers: getHeaders() });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Failed to parse messages JSON. Raw response:", text);
                return;
            }

            if (!Array.isArray(data)) {
                console.warn("Messages API returned a non-array payload:", data);
                return;
            }

            setMessages(
                data.filter((m) => {
                    const status = m.status?.toLowerCase();
                    const senderType = m.sender_type?.toLowerCase();
                    return (
                        status === 'sent' ||
                        status === 'delivered' ||
                        status === 'received' ||
                        senderType === 'user' ||
                        senderType === 'agent' ||
                        senderType === 'ai'
                    );
                })
            );
        } catch (e) {
            console.error('Message fetch error:', e);
        }
    }, []);

    const fetchConversations = useCallback(async ({ selectFirst = false } = {}) => {
        if (!workspace?.id) return;

        try {
            const res = await fetch(
                `${PROXY_BASE}/api/conversations?workspace_id=${workspace.id}&channel=${ch.id}`,
                { headers: getHeaders() }
            );
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Failed to parse conversations JSON. Raw response:", text);
                return;
            }

            if (!Array.isArray(data)) {
                console.warn("Conversations API returned a non-array payload:", data);
                return;
            }

            setConversations(data);

            if (data.length === 0) {
                setLead(null);
                setResolvedLeadId(null);
                setMessages([]);
                return;
            }

            const currentLeadId = leadRef.current?.id;
            const nextLead = selectFirst
                ? data[0]
                : data.find((item) => item.id === currentLeadId) || data[0];

            setLead(nextLead);
            fetchMessages(nextLead.id);
            if (nextLead) {
                fetchLeadIdForConversation(nextLead.id).then(id => setResolvedLeadId(id));
            }
        } catch (e) {
            console.error('Conversation fetch error:', e);
        }
    }, [workspace?.id, ch.id, fetchMessages, fetchLeadIdForConversation]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLead(null);
            setResolvedLeadId(null);
            leadRef.current = null;
            setMessages([]);
            setConversations([]);
            fetchConversations({ selectFirst: true });
        }, 0);

        return () => clearTimeout(timer);
    }, [ch.id, fetchConversations]);

    useEffect(() => {
        const activeLeadId = lead?.id;
        if (!activeLeadId) return;

        const interval = setInterval(() => fetchMessages(activeLeadId), 30000);
        return () => clearInterval(interval);
    }, [lead?.id, fetchMessages]);

    useEffect(() => {
        if (!lead?.id) return;

        subscribeConversation(lead.id);
        return () => unsubscribeConversation(lead.id);
    }, [lead?.id, subscribeConversation, unsubscribeConversation]);

    useEffect(() => {
        return subscribe((event) => {
            const eventWorkspaceId = event.workspace_id || event.payload?.workspace_id;
            if (eventWorkspaceId && workspace?.id && eventWorkspaceId !== workspace.id) {
                return;
            }

            const eventConversationId =
                event.conversation_id || event.payload?.conversation_id;

            switch (event.event_type) {
                case "new_message":
                case "conversation_updated":
                    fetchConversations();
                    if (eventConversationId && leadRef.current?.id === eventConversationId) {
                        fetchMessages(eventConversationId);
                    }
                    break;
                case "message_status_updated":
                case "ai_response_ready":
                case "ai_thinking":
                    if (eventConversationId && leadRef.current?.id === eventConversationId) {
                        fetchMessages(eventConversationId);
                    }
                    break;
                default:
                    break;
            }
        });
    }, [fetchConversations, fetchMessages, subscribe, workspace?.id]);

    useEffect(() => {
        const container = messagesContainerRef.current;

        if (!container) return;

        const isNearBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < 120;

        if (isNearBottom) {
            ref.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    async function sendMessage() {
        if (!msg.trim() || !lead) return;
        try {
            await fetch(`${PROXY_BASE}/api/send-reply`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ conversation_id: lead.id, message: msg }),
            });
            setMsg('');
            fetchMessages(lead.id);
        } catch (e) { console.error('Send error:', e); }
    }

    async function generateSuggestion() {
        if (!lead) return;
        try {
            const res = await fetch(`${PROXY_BASE}/api/ai-suggest`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    conversation_id: lead.id,
                    workspace_id: lead.workspace_id,
                    message: messages[messages.length - 1]?.content || '',
                }),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { return; }
            setAiSuggestion(data.suggestion);
        } catch (e) { console.error(e); }
    }

    function useSuggestion() {
        setMsg(aiSuggestion);
        setAiSuggestion('');
    }

    function handleLeadSelectTablet(l) {
        setLead(l);
        fetchMessages(l.id);
        fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
        setTabletRight('chat');
    }

    function handleLeadSelectMobile(l) {
        setLead(l);
        fetchMessages(l.id);
        fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
        setMobileView('chat');
    }

    const chatAreaProps = {
        ch,
        lead,
        messages,
        msg,
        setMsg,
        aiSuggestion,
        sendMessage,
        generateSuggestion,
        useSuggestion,
        previewMedia,
        setPreviewMedia,
    };

    return (
        <div
            className="h-screen flex flex-col overflow-hidden"
            style={{ backgroundColor: '#0d0d0d', fontFamily: "'Poppins', sans-serif" }}
        >
            
            {/* DESKTOP LAYOUT (≥1024px) */}
<div className="hidden lg:flex flex-1 overflow-hidden p-3 gap-3">

    {/* Left column: channel tabs + leads panel — UNCHANGED */}
    <div className="flex flex-col gap-3" style={{ width: 400, minWidth: 380, maxWidth: 420 }}>
        <ChannelTabs ch={ch} setCh={setCh} />
        <PanelCard className="flex-1">
            <ConversationSidebar
                ch={ch}
                conversations={conversations}
                lead={lead}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onLeadSelect={(l) => {
                    setLead(l);
                    fetchMessages(l.id);
                    fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
                }}
            />
        </PanelCard>
    </div>

    {/* Chat column — spacer added to match tab height */}
    <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 0 }}>
        <div className="shrink-0" style={{ height: 40 }} />  {/* ← tab height spacer */}
        <PanelCard className="flex-1">
            <ChatArea
                {...chatAreaProps}
                onInfoClick={() => {}}
                infoActive={false}
                showMobileBackButton={false}
            />
        </PanelCard>
    </div>

    {/* Contact Details column — spacer added to match tab height */}
    <div className="flex flex-col gap-3" style={{ width: 420, minWidth: 400, maxWidth: 450 }}>
        <div className="shrink-0" style={{ height: 40 }} />  {/* ← tab height spacer */}
        <PanelCard className="flex-1">
            <InfoPanel ch={ch} lead={lead} showBackButton={false} resolvedLeadId={resolvedLeadId} messages={messages} />
        </PanelCard>
    </div>

</div>

            {/* TABLET LAYOUT  (≥768px and <1024px)*/}
            <div className="hidden md:flex lg:hidden flex-col flex-1 overflow-hidden">
                {/* Channel tabs - full width on tablet */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
                    <ChannelTabs ch={ch} setCh={setCh} />
                </div>

                <div className="flex flex-1 overflow-hidden px-3 pb-3 gap-3">
                    {/* Leads panel — always visible */}
                    <PanelCard style={{ width: 260, minWidth: 240 }}>
                        <ConversationSidebar
                            ch={ch}
                            conversations={conversations}
                            lead={lead}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            onLeadSelect={handleLeadSelectTablet}
                        />
                    </PanelCard>

                    {/* Right panel: Chat OR Contact Details */}
                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {tabletRight === 'chat' ? (
                                <motion.div
                                    key="tablet-chat"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 rounded-2xl overflow-hidden border"
                                    style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
                                >
                                    <ChatArea
                                        {...chatAreaProps}
                                        onInfoClick={() => setTabletRight('info')}
                                        infoActive={false}
                                        showMobileBackButton={false}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="tablet-info"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 rounded-2xl overflow-hidden border overflow-y-auto"
                                    style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
                                >
                                    <InfoPanel
                                        ch={ch}
                                        lead={lead}
                                        showBackButton={true}
                                        onBack={() => setTabletRight('chat')}
                                        resolvedLeadId={resolvedLeadId}
                                        messages={messages}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* MOBILE LAYOUT  (<768px) */}
            <div className="flex md:hidden flex-col flex-1 overflow-hidden">
                {/* Channel tabs */}
                <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
                    <ChannelTabs ch={ch} setCh={setCh} />
                </div>

                <div className="flex flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {mobileView === 'list' && (
                            <motion.div
                                key="mobile-list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0"
                                style={{ backgroundColor: CARD_BG }}
                            >
                                <ConversationSidebar
                                    ch={ch}
                                    conversations={conversations}
                                    lead={lead}
                                    activeFilter={activeFilter}
                                    onFilterChange={setActiveFilter}
                                    onLeadSelect={handleLeadSelectMobile}
                                />
                            </motion.div>
                        )}

                        {mobileView === 'chat' && (
                            <motion.div
                                key="mobile-chat"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex flex-col"
                                style={{ backgroundColor: CARD_BG }}
                            >
                                <ChatArea
                                    {...chatAreaProps}
                                    onInfoClick={() => setMobileView('info')}
                                    infoActive={false}
                                    showMobileBackButton={true}
                                    onBackToList={() => setMobileView('list')}
                                />
                            </motion.div>
                        )}

                        {mobileView === 'info' && lead && (
                            <motion.div
                                key="mobile-info"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-y-auto"
                                style={{ backgroundColor: CARD_BG }}
                            >
                                <InfoPanel
                                    ch={ch}
                                    lead={lead}
                                    showBackButton={true}
                                    onBack={() => setMobileView('chat')}
                                    resolvedLeadId={resolvedLeadId}
                                    messages={messages}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
