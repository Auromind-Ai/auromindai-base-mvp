'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Phone, Instagram, Globe, Mail, Paperclip,
    Zap, Sparkles, Send, Clock, User, Star, Calendar,
    ArrowRight, ChevronRight, MoreHorizontal, Info,
    ArrowLeft, SlidersHorizontal, Camera, FileText,
    PenLine, CheckSquare, UserCheck, XCircle, ChevronDown, Check,
    Inbox, X, Play, Pause, Mic, CheckCheck, Smile, Loader2
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import MessageRenderer from '@/components/chat/MessageRenderer';
import { insertDateSeparators } from '@/lib/dateUtils';
import ConvertLeadModal from '@/components/leads/ConvertLeadModal';
import CloseConversationModal from '@/components/inbox/CloseConversationModal';
import api from '@/lib/api';
import { SYSTEM_TIERS, AGENT_LABELS } from '@/lib/labelStyles';
import {
    playNotificationSound,
    markMessageAsProcessed,
    isMessageAlreadyProcessed,
} from '@/lib/notificationSound';
import EmojiPicker from 'emoji-picker-react';



const TwilioIcon = ({ size = 16, style = {} }) => {
    const isInactive = style.color === '#666';
    const circleFill = isInactive ? '#3f3f46' : '#F22F46';
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" style={style} xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill={circleFill}/>
            <circle cx="24" cy="24" r="9" fill="none" stroke="white" strokeWidth="3.5"/>
            <circle cx="24" cy="15.5" r="2.8" fill="white"/>
            <circle cx="24" cy="32.5" r="2.8" fill="white"/>
            <circle cx="15.5" cy="24" r="2.8" fill="white"/>
            <circle cx="32.5" cy="24" r="2.8" fill="white"/>
        </svg>
    );
};

const WhatsAppIcon = ({ size = 16, style = {} }) => {
    const isInactive = style.color === '#666';
    const circleFill = isInactive ? '#3f3f46' : '#28C661';
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" style={style} xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill={circleFill}/>
            <path d="M34.2 29.8c-.5-.2-2.9-1.4-3.4-1.6-.5-.2-.8-.2-1.1.2-.3.5-1.3 1.6-1.6 1.9-.3.3-.6.4-1.1.1-.5-.2-2.1-.8-4-2.5-1.5-1.3-2.5-2.9-2.8-3.4-.3-.5 0-.8.2-1 .2-.2.5-.6.8-.9.3-.3.4-.5.6-.8.2-.3.1-.6 0-.9-.1-.2-1.1-2.7-1.5-3.7-.4-1-.8-.8-1.1-.8h-1c-.3 0-.9.1-1.3.6-.4.5-1.7 1.7-1.7 4.1s1.8 4.7 2 5c.3.3 3.5 5.3 8.4 7.4 1.2.5 2.1.8 2.8 1 1.2.4 2.3.3 3.1.2.9-.1 2.9-1.2 3.3-2.3.4-1.2.4-2.2.3-2.4-.2-.2-.5-.3-1-.5z" fill="white"/>
        </svg>
    );
};

const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: '#28C661', gradient: null },
    {
        id: 'instagram', label: 'Instagram', icon: Instagram, color: '#ee2a7b',
        gradient: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)'
    },
    { id: 'twilio', label: 'Twilio', icon: TwilioIcon, color: '#F22F46', gradient: null },
];

const STATUS_FILTERS = ['Open', 'Converted', 'Closed', 'All'];

const CARD_BG = '#15161C';
const CARD_BORDER = 'rgba(255,255,255,0.07)';

const showToast = (message) => {
    if (typeof window === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.innerHTML = message;

    container.appendChild(toast);
    toast.offsetHeight;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    
    };  
}

function getDisplayName(lead, channelId) {
    if (channelId === 'instagram') {
        return lead?.contact_name || lead?.username || 'Instagram User';
    }
    return lead?.phone || lead?.contact_name || 'Unknown';
}

function getAvatarText(lead, channelId) {
    if (channelId === 'instagram') {
        const name = lead?.contact_name || lead?.username || 'U';
        return name[0].toUpperCase();
    }
    const phone = lead?.phone || '';
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
    if (!channel) return <Mail size={size} style={{ color: '#888' }} strokeWidth={2} />;
    const chObj = typeof channel === 'object' ? channel : CHANNELS.find(c => c.id === channel?.toLowerCase());
    if (chObj) {
        const Icon = chObj.icon;
        if (chObj.gradient) {
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id={`grad-${chObj.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f9ce34" />
                            <stop offset="50%" stopColor="#ee2a7b" />
                            <stop offset="100%" stopColor="#6228d7" />
                        </linearGradient>
                    </defs>
                    <Icon size={size} stroke={`url(#grad-${chObj.id})`} strokeWidth={2} />
                </svg>
            );
        }
        return <Icon size={size} strokeWidth={2} style={{ color: chObj.color }} />;
    }
    const channelStr = (typeof channel === 'string' ? channel : channel?.id || '').toLowerCase();
    if (channelStr === 'whatsapp') return <WhatsAppIcon size={size} />;
    if (channelStr === 'twilio') return <TwilioIcon size={size} />;
    if (channelStr === 'instagram') return <Instagram size={size} strokeWidth={2} style={{ color: '#ee2a7b' }} />;
    return <Mail size={size} style={{ color: '#888' }} strokeWidth={2} />;
}

function UnreadBadge({ count, channel }) {
    if (!count || count <= 0) return null;
    const style = channel?.gradient
        ? { background: channel.gradient }
        : { backgroundColor: channel?.color || '#F22F46' };
    return (
        <span
            className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0 ml-2 shadow-sm"
            style={style}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

function formatActiveTime(dateInput) {
    if (!dateInput) return 'Offline';
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return 'Offline';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    // If active within 2 minutes: Online
    if (diffMs < 2 * 60 * 1000 && diffMs >= 0) {
        return 'Online';
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (d.toDateString() === now.toDateString()) {
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Active just now';
        if (mins < 60) return `Active ${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        return `Active ${hrs}h ago`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Active yesterday';
    }

    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24));

    if (diffDays >= 1 && diffDays <= 7) {
        return `Active ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Beyond 7 days: Formatted date e.g. "Active Aug 17, 2026"
    return `Active ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getLastUserActivity(lead, messages) {
    if (messages && messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            const senderType = m.sender_type?.toLowerCase();
            if (senderType === 'user' || senderType === 'customer' || senderType === 'lead') {
                const ts = m.timestamp || m.created_at;
                if (ts) {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) return d;
                }
            }
        }
        // Fallback to most recent message timestamp if no explicit user message is flagged
        const latestMsg = messages[messages.length - 1];
        const latestTs = latestMsg?.timestamp || latestMsg?.created_at;
        if (latestTs) {
            const d = new Date(latestTs);
            if (!isNaN(d.getTime())) return d;
        }
    }
    if (lead) {
        const leadTs = lead.last_contact_time || lead.last_interaction || lead.last_message_at || lead.updated_at || lead.created_at;
        if (leadTs) {
            const d = new Date(leadTs);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
}

// Screenshot Match: WhatsApp Exact Audio Bubble (Avatar left -> Play button -> Waveform with dot -> Time & Blue ticks)
function WhatsAppAudioMessage({ url, isMe, timestamp }) {
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration || 0);
    };

    const handleEnded = () => {
        setPlaying(false);
        setCurrentTime(0);
    };

    const formatSeconds = (sec) => {
        if (!sec || isNaN(sec)) return '0:30';
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const waveformBars = [4, 6, 8, 12, 16, 20, 24, 28, 22, 14, 8, 6, 10, 14, 18, 24, 30, 26, 18, 12, 8, 6, 8, 14, 18, 22, 26, 20, 14, 8, 6, 4, 6, 8, 12];
    const progress = duration > 0 ? (currentTime / duration) : 0.08;
    const activeDotIndex = Math.min(Math.floor(progress * waveformBars.length), waveformBars.length - 1);

    return (
        <div className="flex items-center gap-3 py-1 px-1 min-w-[270px] sm:min-w-[320px] select-none font-sans">
            {url && (
                <audio
                    ref={audioRef}
                    src={url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    className="hidden"
                />
            )}

            {/* Left: Avatar with Mic Badge */}
            <div className="relative shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#6d757d] flex items-center justify-center text-white">
                    <User size={20} fill="currentColor" />
                </div>
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <Mic size={13} className="text-[#6d757d]" />
                </span>
            </div>

            {/* Waveform and Play/Time Controls */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={togglePlay}
                        className="text-[#667085] hover:text-[#333] transition-transform active:scale-90 shrink-0"
                    >
                        {playing ? (
                            <Pause size={24} fill="#667085" />
                        ) : (
                            <Play size={24} fill="#667085" className="ml-0.5" />
                        )}
                    </button>

                    <div
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
                            if (audioRef.current && duration > 0) {
                                audioRef.current.currentTime = newProgress * duration;
                                setCurrentTime(newProgress * duration);
                            }
                        }}
                        className="flex-1 flex items-center gap-[2.5px] h-7 cursor-pointer relative"
                    >
                        {waveformBars.map((height, i) => {
                            const isPlayed = i <= activeDotIndex;
                            return (
                                <div key={i} className="flex items-center justify-center relative flex-1">
                                    <span
                                        className={`w-[2.5px] rounded-full transition-all duration-150 ${
                                            isPlayed ? 'bg-[#5e6670]' : 'bg-[#a3b899]'
                                        }`}
                                        style={{ height: `${height}px` }}
                                    />
                                    {i === activeDotIndex && (
                                        <span className="absolute w-3.5 h-3.5 rounded-full bg-[#5e6670] shadow-sm pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#556066] mt-1 pl-8 pr-1 font-sans">
                    <span className="font-medium text-[#4a5568]">
                        {formatSeconds(playing ? currentTime : (duration || 30))}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[#6b7280]">{timestamp}</span>
                        <CheckCheck size={16} className="text-[#34B7F1]" strokeWidth={2.5} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConversationSidebar({ ch, conversations = [], lead, activeFilter, onFilterChange, onLeadSelect, filterCounts = {}, unreadCounts = {}, lastMessageMap = {} }) {
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const isInstagram = ch.id === 'instagram';

    useEffect(() => {
        if (lead?.id && containerRef.current) {
            const activeEl = containerRef.current.querySelector('[data-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [lead?.id]);

    function formatConvTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0);
        if (msgDay.getTime() === today.getTime()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
        const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Ensure unique conversations by ID
    const uniqueConversations = useMemo(() => {
        const map = new Map();
        (conversations || []).forEach(item => {
            if (item && item.id && !map.has(item.id)) {
                map.set(item.id, item);
            }
        });
        return Array.from(map.values());
    }, [conversations]);

    let filtered = uniqueConversations.filter(l => {
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
            <div className="p-4 pb-3 shrink-0">
                <div className="flex items-center gap-2.5 mb-4">
                    {isInstagram ? (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ch.gradient }}>
                            <Instagram size={16} strokeWidth={2} className="text-white" />
                        </div>
                    ) : ch.id === 'twilio' ? (
                        <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center">
                            <TwilioIcon size={32} />
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

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {STATUS_FILTERS.map((f, i) => {
                        const filterKey = f.toLowerCase();
                        const isCurrentActive = activeFilter === i;

                        const count = isCurrentActive
                            ? uniqueConversations.length
                            : (filterCounts[filterKey] !== undefined ? filterCounts[filterKey] : 0);

                        return (
                            <button
                                key={f}
                                onClick={() => onFilterChange(i)}
                                className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer"
                                style={isCurrentActive
                                    ? { backgroundColor: `${ch.color}20`, color: ch.color, borderColor: `${ch.color}40` }
                                    : { backgroundColor: 'transparent', color: '#666', borderColor: 'rgba(255,255,255,0.07)' }
                                }
                            >
                                <span>{f}</span>
                                <span className="text-[11px] opacity-75 font-normal">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto px-3 pb-3">
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center mt-16 gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <Inbox size={20} className="text-[#444]" />
                        </div>
                        <p className="text-center text-[#555] text-[13px] font-medium">
                            {STATUS_FILTERS[activeFilter] === 'Open'
                                ? 'No open conversations'
                                : STATUS_FILTERS[activeFilter] === 'Converted'
                                ? 'No converted conversations'
                                : STATUS_FILTERS[activeFilter] === 'Closed'
                                ? 'No closed conversations (>24h)'
                                : STATUS_FILTERS[activeFilter] === 'Unread'
                                ? 'No unread conversations'
                                : 'No conversations found'}
                        </p>
                        <p className="text-center text-[#3a3a3a] text-[11px]">
                            {STATUS_FILTERS[activeFilter] === 'Open' ? 'All caught up! ✨' : 'Try a different filter'}
                        </p>
                    </div>
                )}
                {filtered.map((l) => {
                    const sel = lead?.id === l.id;
                    const displayName = getDisplayName(l, ch.id);
                    const avatarText = getAvatarText(l, ch.id);
                    const convChannel = CHANNELS.find(c => c.id === (l.channel?.toLowerCase() || ch.id)) || ch;
                    const lastMsgText = lastMessageMap[l.id] || l.last_message || l.preview || l.last_message_text || 'No messages yet';
                    const unreadCount = unreadCounts[l.id] !== undefined ? unreadCounts[l.id] : (l.unread_count || l.unread || 0);

                    return (
                        <motion.button
                            key={l.id}
                            data-active={sel}
                            onClick={() => onLeadSelect(l)}
                            whileHover={{ backgroundColor: '#1e1e1e' }}
                            className="w-full p-3.5 mb-1 rounded-xl text-left transition-all border"
                            style={sel
                                ? { backgroundColor: '#1e1e1e', borderColor: `${ch.color}40`, borderLeftColor: ch.color, borderLeftWidth: 3 }
                                : { backgroundColor: 'rgba(30, 30, 30, 0)', borderColor: 'transparent', borderLeftWidth: 3, borderLeftColor: 'transparent' }
                            }
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                                    <ChannelIcon channel={convChannel} size={20} />
                                </div>
                                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-semibold shrink-0"
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
                                            {lastMsgText}
                                        </p>
                                        <UnreadBadge count={unreadCount} channel={convChannel} />
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
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0);

        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (msgDay.getTime() === today.getTime()) return `Today, ${timeStr}`;
        if (msgDay.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
        const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) return `${diffDays} days ago, ${timeStr}`;
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

function InfoPanel({ ch, lead, onBack, showBackButton = false, resolvedLeadId, messages, onCloseConversation, onConvertClick, leadDetail, setLeadDetail }) {
    const isInstagram = ch.id === 'instagram';
    const stats = getConversationStats(lead, messages);

    const handleLabelClick = async (leadId, label) => {
        if (!leadId) return;
        const currentLabels = leadDetail?.labels || [];
        const isActive = currentLabels.includes(label);
        const nextLabels = isActive ? [] : [label];
        if (setLeadDetail) {
            setLeadDetail(prev => prev ? { ...prev, labels: nextLabels } : null);
        }

        const action = isActive ? "remove" : "add";

        try {
            const res = await api.updateLeadLabels(leadId, label, action);
            if (setLeadDetail) {
                setLeadDetail(prev => ({
                    ...prev,
                    ...res,
                    labels: res.labels || []
                }));
            }
        } catch (err) {
            console.error("Failed to update label:", err);
            if (setLeadDetail) {
                setLeadDetail(prev => prev ? { ...prev, labels: currentLabels } : null);
            }
        }
    };

    const activeLabels = leadDetail?.labels || [];
    const activeLabel = activeLabels.find(l => ['Premium Lead', 'High Priority', 'Interested', 'Follow Up'].includes(l)) || null;
    const tier = leadDetail?.lead_tier || 'cold';
    const score = leadDetail?.score || 0;

    return (
        <div className="w-full h-full overflow-y-auto p-5" style={{ backgroundColor: CARD_BG }}>
            {showBackButton && (
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#666] text-[13px] hover:text-white transition cursor-pointer"
                    >
                        <ArrowLeft size={16} /> Back to Chat
                    </button>
                    <button
                        onClick={onBack}
                        className="p-1 rounded-lg text-[#666] hover:text-white transition cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {!lead ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-[#444] text-[13px]">Select a conversation</p>
                </div>
            ) : (
                <>
                    <p className="text-[16px] font-regular text-white/90 tracking-widest mb-8">Contact Details</p>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold shrink-0"
                            style={{ backgroundColor: '#1e1e1e' }}>
                            {isInstagram && lead.profile_pic ? (
                                <ProfilePic src={lead.profile_pic} alt={getDisplayName(lead, ch.id)} fallbackText={getAvatarText(lead, ch.id)} color={ch.color} />
                            ) : (
                                <span style={{ color: ch.color }}>{getAvatarText(lead, ch.id)}</span>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[15px] font-semibold text-white truncate">
                                {getDisplayName(lead, ch.id)}
                            </h4>
                            {isInstagram && (
                                <p className="text-[12px] text-white/50 mt-0.5">
                                    {lead.contact_name && !/^\d+$/.test(lead.contact_name) ? (lead.contact_name.startsWith('@') ? lead.contact_name : `@${lead.contact_name}`) : 'Instagram User'}
                                </p>
                            )}
                            {!isInstagram && lead.phone && (
                                <p className="text-[12px] text-white/50 mt-0.5">{lead.phone}</p>
                            )}
                            {isInstagram && (
                                <p className="text-[11px] text-white/40 mt-0.5">India · 10:45 AM</p>
                            )}
                        </div>
                    </div>

                    {/* SECTION A: System Tier */}
                    <div className="mb-6 border-b border-white/[0.06] pb-6">
                        <p className="text-[14px] font-semibold text-white/90 uppercase tracking-wider mb-3">System Tier</p>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const t = SYSTEM_TIERS[tier.toLowerCase()] || SYSTEM_TIERS.cold;
                                return (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${t.bg} ${t.border} ${t.textCls}`}>
                                        {t.text}
                                    </span>
                                );
                            })()}
                            <span className="text-[11px] text-zinc-500 font-medium italic">Calculated automatically ({score || 0})</span>
                        </div>
                    </div>

                    {/* SECTION B: Agent Labels */}
                    <div className="mb-6">
                        <p className="text-[14px] font-semibold text-white/90 uppercase tracking-wider mb-3">Agent Labels</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(AGENT_LABELS).map(lblKey => {
                                const config = AGENT_LABELS[lblKey];
                                const isSelected = activeLabel === lblKey;
                                return (
                                    <button
                                        key={lblKey}
                                        onClick={() => handleLabelClick(resolvedLeadId || lead?.id, lblKey)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-300
                                            ${isSelected
                                                ? `${config.activeBg} ${config.textCls} shadow-lg`
                                                : config.bgOpacity
                                            }`}
                                    >
                                        {config.emoji} {lblKey}
                                    </button>
                                );
                            })}
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
                            <button
                                onClick={onConvertClick}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] border text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                                style={{ backgroundColor: 'rgba(16,185,129,0.05)' }}>
                                <Check size={15} strokeWidth={2} />
                                Convert Conversation
                            </button>
                            <button
                                onClick={() => onCloseConversation(lead?.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer"
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

function SendTemplateModal({ isOpen, onClose, workspace, lead, onSuccess }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [variables, setVariables] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!isOpen || !workspace?.id) return;
        const fetchTemplates = async () => {
            setFetching(true);
            try {
                const data = await api.get('/api/templates');
                const list = data.templates || [];
                const approved = list.filter(t => t.status === 'approved');
                setTemplates(approved);
                if (approved.length > 0) setSelectedTemplate(approved[0]);
            } catch (e) {
                console.error("Failed to fetch templates:", e);
            } finally {
                setFetching(false);
            }
        };
        fetchTemplates();
    }, [isOpen, workspace?.id]);

    useEffect(() => {
        if (!selectedTemplate) { setVariables({}); return; }
        const matches = selectedTemplate.content.match(/\{\{(\d+)\}\}/g) || [];
        const uniqueVars = {};
        matches.forEach(m => {
            const num = m.replace(/\{\{|\}\}/g, '');
            uniqueVars[num] = '';
        });
        setVariables(uniqueVars);
    }, [selectedTemplate]);

    if (!isOpen) return null;

    const getPreviewContent = () => {
        if (!selectedTemplate) return '';
        let text = selectedTemplate.content;
        Object.keys(variables).forEach(k => {
            const val = variables[k] || `{{${k}}}`;
            text = text.replaceAll(`{{${k}}}`, val);
        });
        return text;
    };

    const handleSend = async () => {
        if (!selectedTemplate || !workspace?.id || !lead?.phone) return;
        setLoading(true);
        try {
            const varArray = Object.keys(variables)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(k => variables[k]);

            await api.post('/api/messages/send', {
                workspace_id: workspace.id,
                phone: lead.phone,
                template_name: selectedTemplate.name,
                variables: varArray
            });
            onSuccess(getPreviewContent());
            onClose();
        } catch (e) {
            console.error("Send template error:", e);
            alert("Error sending template message.");
        } finally {
            setLoading(false);
        }
    };

    const varKeys = Object.keys(variables).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#15161C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                    <span className="text-[14px] font-bold text-white uppercase tracking-wide">Send WhatsApp Template</span>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors text-lg">&times;</button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {fetching ? (
                        <p className="text-zinc-500 text-[13px] text-center py-8">Fetching templates...</p>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-6 space-y-3">
                            <p className="text-zinc-500 text-[13px]">No approved templates found.</p>
                            <Link href="/user/admin/templates" className="inline-block text-[12px] font-bold text-indigo-400 hover:underline">
                                Go to Templates Page →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Select Template</label>
                                <select
                                    value={selectedTemplate?.id || ''}
                                    onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value))}
                                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none"
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                                    ))}
                                </select>
                            </div>

                            {varKeys.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Variables</label>
                                    {varKeys.map(k => (
                                        <div key={k} className="flex flex-col gap-1.5">
                                            <span className="text-[12px] text-zinc-400 font-medium font-mono">Variable {`{{${k}}}`}</span>
                                            <input
                                                type="text"
                                                value={variables[k]}
                                                onChange={e => setVariables(prev => ({ ...prev, [k]: e.target.value }))}
                                                placeholder={`Enter value for {{${k}}}`}
                                                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Preview</label>
                                <div className="bg-[#252525] border border-white/5 rounded-2xl p-4 text-[13px] text-[#eee] leading-relaxed whitespace-pre-wrap">
                                    {getPreviewContent() || 'No preview available.'}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-[#181820] flex items-center justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    {templates.length > 0 && (
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="px-5 py-2 rounded-xl text-[12px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? 'Sending...' : 'Send Template'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatArea({
    ch, lead, messages, msg, setMsg, aiSuggestion, sendMessage,
    generateSuggestion, useSuggestion, onInfoClick, onBackToList,
    previewMedia, setPreviewMedia,
    showMobileBackButton = false,
    infoActive = false,
    templateName,
    setTemplateName,
    setTemplateVariables,
    setTemplateLanguage,
    fetchInboxTemplates,
    setSelectedInboxTemplate,
    setTemplateSearchQuery,
    setShowTemplateSelect,
    workspace,
    onSendTemplateSuccess,
    selectedFile,
    setSelectedFile,
    selectedFilePreview,
    setSelectedFilePreview,
    isUploadingMedia,
    onLoadOlderMessages,
    hasMoreMessages = false,
    isLoadingOlder = false,
}) {
    const ref = useRef(null);
    const messagesContainerRef = useRef(null);
    const isInstagram = ch.id === 'instagram';
    const [unreadScrolledCount, setUnreadScrolledCount] = useState(0);
    const prevMessagesLenRef = useRef(messages.length);
    const prevOldestIdRef = useRef(messages[0]?.id);
    const prevLatestIdRef = useRef(messages[messages.length - 1]?.id);

    const fileInputRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('.emoji-picker-container')) {
            setShowEmojiPicker(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, []);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile?.(file);
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const isAudio = file.type.startsWith('audio/');
            if (isImage || isVideo || isAudio) {
                const previewUrl = URL.createObjectURL(file);
                setSelectedFilePreview?.({
                    url: previewUrl,
                    type: isImage ? 'image' : isVideo ? 'video' : 'audio',
                    name: file.name,
                    size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                });
            } else {
                setSelectedFilePreview?.({
                    url: null,
                    type: 'document',
                    name: file.name,
                    size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                });
            }
            e.target.value = '';
        }
    };

    const handleScroll = async (e) => {
        const container = e.currentTarget;
        if (container.scrollTop < 60 && hasMoreMessages && !isLoadingOlder) {
            const prevScrollHeight = container.scrollHeight;
            const prevScrollTop = container.scrollTop;

            await onLoadOlderMessages?.();

            requestAnimationFrame(() => {
                if (container) {
                    const newScrollHeight = container.scrollHeight;
                    container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
                }
            });
        }
    };

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const currentOldestId = messages[0]?.id;
        const currentLatestId = messages[messages.length - 1]?.id;

        const isOlderPrepended = messages.length > prevMessagesLenRef.current && currentOldestId !== prevOldestIdRef.current && currentLatestId === prevLatestIdRef.current;
        const isNewAppended = currentLatestId !== prevLatestIdRef.current;

        prevMessagesLenRef.current = messages.length;
        prevOldestIdRef.current = currentOldestId;
        prevLatestIdRef.current = currentLatestId;

        if (isOlderPrepended) {
            return;
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceFromBottom < 130;

        if (isNearBottom || !isNewAppended) {
            ref.current?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => setUnreadScrolledCount(0), 0);
        } else {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender_type?.toLowerCase() === 'user') {
                setTimeout(() => setUnreadScrolledCount(prev => prev + 1), 0);
            }
        }
    }, [messages]);

    const messagesWithSeparators = useMemo(
        () => insertDateSeparators(messages),
        [messages]
    );

    const hasIncomingMessage = useMemo(() => {
        return messages.some(m => m.sender_type?.toLowerCase() === 'user');
    }, [messages]);

    const lastUserActivity = useMemo(
        () => getLastUserActivity(lead, messages),
        [lead, messages]
    );

    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (ch.id !== 'whatsapp' || !lastUserActivity) return;
        const timeout = setTimeout(() => setNow(Date.now()), 0);
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => { clearTimeout(timeout); clearInterval(interval); };
    }, [ch.id, lastUserActivity]);

    const { whatsAppWindowState, whatsAppWindowRemaining } = useMemo(() => {
        if (ch.id !== 'whatsapp') return { whatsAppWindowState: 'window_open', whatsAppWindowRemaining: '' };
        if (!hasIncomingMessage) return { whatsAppWindowState: 'awaiting_reply', whatsAppWindowRemaining: '' };
        if (!lastUserActivity) return { whatsAppWindowState: 'awaiting_reply', whatsAppWindowRemaining: '' };
        const diffMs = 24 * 60 * 60 * 1000 - (now - lastUserActivity.getTime());
        if (diffMs > 0) {
            const diffHrs = Math.floor(diffMs / (60 * 60 * 1000));
            const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
            const remaining = diffHrs > 0 ? `${diffHrs}h ${diffMins}m remaining` : `${diffMins}m remaining`;
            return { whatsAppWindowState: 'window_open', whatsAppWindowRemaining: remaining };
        }
        return { whatsAppWindowState: 'window_closed', whatsAppWindowRemaining: '' };
    }, [ch.id, hasIncomingMessage, lastUserActivity, now]);

    if (!lead) {
        return (
            <div className="flex-1 flex items-center justify-center h-full" style={{ backgroundColor: CARD_BG }}>
                <p className="text-[#444] text-[14px]">Select a conversation</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: CARD_BG }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                    {showMobileBackButton && (
                        <button onClick={onBackToList} className="p-1.5 rounded-lg text-[#666] hover:text-white">
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
                            {(() => {
                                const activeText = formatActiveTime(lastUserActivity);
                                if (activeText === 'Online') {
                                    return <span className="text-emerald-400 font-medium">● Online</span>;
                                }
                                return <span>{activeText}</span>;
                            })()}
                        </p>
                        {ch.id === 'whatsapp' && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {whatsAppWindowState === 'awaiting_reply' && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                        ◉ Awaiting First Reply
                                    </span>
                                )}
                                {whatsAppWindowState === 'window_open' && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                                        ◉ Window Open · {whatsAppWindowRemaining}
                                    </span>
                                )}
                                {whatsAppWindowState === 'window_closed' && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm bg-rose-500/10 text-rose-300 border-rose-500/20">
                                        ◉ Window Closed
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onInfoClick}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-[1601px]:hidden"
                        style={{ color: infoActive ? ch.color : '#777' }}
                        title="Contact Details"
                    >
                        <Info size={17} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-4">
                <div className="max-w-3xl mx-auto space-y-2">
                    {isLoadingOlder && (
                        <div className="flex items-center justify-center py-2">
                            <Loader2 size={18} className="text-zinc-400 animate-spin" />
                        </div>
                    )}
                    {messagesWithSeparators.map((item) => {
                        if (item._dateSeparator) {
                            return (
                                <div key={item.key} className="flex items-center justify-center my-4">
                                    <span className="text-[11px] text-[#555] px-3 py-1 rounded-full border border-white/5 bg-white/[0.03]">
                                        {item.label}
                                    </span>
                                </div>
                            );
                        }

                        const m = item;
                        const isUser = m.sender_type?.toLowerCase() === 'user';

                        let parsedMetadata = {};
                        try {
                            if (typeof m.metadata === 'string') {
                                parsedMetadata = JSON.parse(m.metadata);
                            } else if (m.metadata && typeof m.metadata === 'object') {
                                parsedMetadata = m.metadata;
                            } else if (typeof m.metadata_json === 'string') {
                                parsedMetadata = JSON.parse(m.metadata_json);
                            } else if (m.metadata_json && typeof m.metadata_json === 'object') {
                                parsedMetadata = m.metadata_json;
                            }
                        } catch {
                            parsedMetadata = {};
                        }

                        const isAI = m.sender_type?.toLowerCase() === 'ai';
                        const isSuggested = m.status?.toLowerCase() === 'suggested';

                        const messageDate = new Date(m.timestamp || m.created_at);

                        const timeStr = !isNaN(messageDate.getTime())
                            ? messageDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                            : '';

                        const mediaUrl =
                            m.media_url ||
                            parsedMetadata.media_url ||
                            null;

                        const mediaType = (
                            m.media_type ||
                            parsedMetadata.media_type ||
                            parsedMetadata.message_type ||
                            m.type ||
                            ''
                        ).toLowerCase();

                        const mimeType = (
                            m.mime_type ||
                            parsedMetadata.mime_type ||
                            ''
                        ).toLowerCase();

                        const normalizedContent = (m.content || '').trim();

                        const isImage =
                            mediaType === 'image' ||
                            mimeType.startsWith('image/') ||
                            /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(mediaUrl || '');

                        const isAudio =
                            mediaType === 'audio' ||
                            mediaType === 'voice' ||
                            mimeType.startsWith('audio/') ||
                            /\.(mp3|ogg|wav|m4a|aac|opus)(\?|$)/i.test(mediaUrl || '');

                        const isVideo =
                            mediaType === 'video' ||
                            mimeType.startsWith('video/') ||
                            /\.(mp4|webm|mov|mkv)(\?|$)/i.test(mediaUrl || '');

                        const isMediaPlaceholder = /^(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)$/i.test(
                            normalizedContent.replace(/^\[|\]$/g, '')
                        );

                        const displayContent = isMediaPlaceholder ? '' : m.content;

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
                                        className={`max-w-[72%] px-4 py-3 ${
                                            isUser
                                                ? 'rounded-[20px_20px_20px_6px]'
                                                : 'rounded-[20px_20px_6px_20px]'
                                        }`}
                                        style={
                                            isUser
                                                ? {
                                                    backgroundColor: '#252525',
                                                    borderBottomLeftRadius: '6px'
                                                }
                                                : {
                                                    backgroundColor: (lead?.channel?.toLowerCase() === 'twilio' || ch.id === 'twilio') ? '#CE272D' : (ch.id === 'instagram' ? '#ee2a7b' : '#1a7a45'),
                                                    borderBottomRightRadius: '6px'
                                                }
                                        }
                                    >
                                        <MessageRenderer
                                            content={displayContent}
                                            metadata={parsedMetadata}
                                            media_url={mediaUrl}
                                            media_type={mediaType}
                                            mime_type={mimeType}
                                            isMe={!isUser}
                                            theme={ch}
                                            onPreviewMedia={setPreviewMedia}
                                        />
                                        <p className="text-[10px] text-white/40 mt-1.5">
                                            {(() => {
                                                const ts = m.timestamp || m.created_at;
                                                if (!ts) return '';
                                                const d = new Date(ts);
                                                return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                    <div ref={ref} />
                </div>

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

                <AnimatePresence>
                    {unreadScrolledCount > 0 && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => {
                                ref.current?.scrollIntoView({ behavior: 'smooth' });
                                setUnreadScrolledCount(0);
                            }}
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold shadow-lg border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                            <span>{unreadScrolledCount === 1 ? 'New message' : `${unreadScrolledCount} new messages`}</span>
                            <span>↓</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* AI Suggestion bar */}
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

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-2xl mx-auto">
                    {ch.id === 'whatsapp' && whatsAppWindowState === 'window_closed' ? (
                        <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center gap-3">
                            <div className="text-[#eee] text-[13px] font-medium leading-relaxed">
                                🔒 WhatsApp 24-hour window has expired.<br />Only approved template messages can be sent.
                            </div>
                            <button
                                onClick={() => setShowTemplateModal(true)}
                                className="mt-1 px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 transition duration-150 active:scale-95 shadow-[0_4px_16px_rgba(239,68,68,0.25)]"
                            >
                                Use Template Message
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <button
                                    onClick={generateSuggestion}
                                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                                    style={{ backgroundColor: `${ch.color}15`, color: ch.color }}
                                >
                                    <Sparkles size={11} />
                                    Suggest Reply
                                </button>
                                {templateName && (
                                    <div
                                        className="text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 border border-purple-500/30 shrink-0"
                                        style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
                                    >
                                        <FileText size={11} />
                                        <span>Active Template: <strong>{templateName}</strong></span>
                                        <button
                                            onClick={() => {
                                                setTemplateName(null);
                                                setTemplateVariables([]);
                                                setTemplateLanguage('en_US');
                                                setMsg('');
                                            }}
                                            className="hover:text-white transition-colors ml-1"
                                            title="Clear template"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectedFilePreview && (
                                <div className="mb-2 p-2 rounded-xl bg-[#1e1e1e] border border-white/10 inline-flex items-center gap-3 max-w-full">
                                    {selectedFilePreview.type === 'image' && (
                                        <img src={selectedFilePreview.url} alt="attachment" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                                    )}
                                    {selectedFilePreview.type === 'video' && (
                                        <video src={selectedFilePreview.url} className="w-16 h-12 object-cover rounded-lg shrink-0" />
                                    )}
                                    {(selectedFilePreview.type === 'audio' || selectedFilePreview.type === 'document') && (
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                                            <FileText size={18} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-[12px] text-white font-medium truncate max-w-[200px]">{selectedFilePreview.name}</p>
                                        <p className="text-[10px] text-white/50">{selectedFilePreview.size}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFile?.(null); setSelectedFilePreview?.(null); }}
                                        className="p-1 text-red-400 hover:bg-white/10 rounded-full cursor-pointer shrink-0"
                                        title="Remove attachment"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-2 py-2 rounded-full border"
                                style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255,255,255,0.07)' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*,video/*,audio/*,application/pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 hover:bg-white/5 active:scale-95 cursor-pointer"
                                    style={{ backgroundColor: `${ch.color}20` }}
                                    title="Attach Image / Video / Media"
                                >
                                    <Camera size={16} style={{ color: ch.color }} strokeWidth={2} />
                                </button>
                                {ch.id === 'whatsapp' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fetchInboxTemplates();
                                            setSelectedInboxTemplate(null);
                                            setTemplateSearchQuery('');
                                            setShowTemplateSelect(true);
                                        }}
                                        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95 shrink-0 cursor-pointer"
                                        style={{ backgroundColor: `${ch.color}20` }}
                                        title="Use Template"
                                    >
                                        <FileText size={16} style={{ color: ch.color }} strokeWidth={2} />
                                    </button>
                                )}

                                <div className="relative emoji-picker-container">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(prev => !prev)}
                                        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95 shrink-0 cursor-pointer"
                                        style={{ backgroundColor: `${ch.color}20` }}
                                        title="Emoji"
                                    >
                                        <Smile
                                            size={16}
                                            style={{ color: ch.color }}
                                            strokeWidth={2}
                                        />
                                    </button>

                                    {showEmojiPicker && (
                                        <div
                                            className="
                                                absolute bottom-[52px] left-0 z-[9999]
                                                w-[280px]
                                                max-w-[calc(100vw-32px)]
                                                rounded-2xl overflow-hidden
                                                border border-white/[0.08]
                                                bg-[#1c1c1f]
                                                shadow-[0_16px_40px_rgba(0,0,0,0.45)]
                                            "
                                        >
                                            <EmojiPicker
                                                onEmojiClick={(emojiData) => {
                                                    setMsg(prev => prev + emojiData.emoji);
                                                }}
                                                theme="dark"
                                                lazyLoadEmojis
                                                width="100%"
                                                height={300}
                                                searchDisabled={false}
                                                skinTonesDisabled={false}
                                                previewConfig={{
                                                    showPreview: false,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <input
                                    value={msg}
                                    onChange={(e) => setMsg(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder={selectedFilePreview ? "Add a caption..." : "Message"}
                                    disabled={isUploadingMedia}
                                    className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#555] outline-none px-1"
                                />
                                <button
                                    type="button"
                                    onClick={sendMessage}
                                    disabled={isUploadingMedia || (!msg.trim() && !selectedFile)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                        isUploadingMedia || (!msg.trim() && !selectedFile) ? 'opacity-40 cursor-not-allowed' : ''
                                    }`}
                                    style={isInstagram
                                        ? { background: 'linear-gradient(135deg, #ee2a7b, #6228d7)' }
                                        : { backgroundColor: ch.color }
                                    }
                                >
                                    {isUploadingMedia ? (
                                        <Loader2 size={15} className="text-white animate-spin" />
                                    ) : (
                                        <Send size={15} className="text-white" strokeWidth={2} />
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <SendTemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                workspace={workspace}
                lead={lead}
                onSuccess={onSendTemplateSuccess}
            />
        </div>
    );
}

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

function PanelCard({ children, className = '', style = {} }) {
    return (
        <div
            className={`rounded-2xl overflow-hidden border flex flex-col ${className}`}
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER, ...style }}
        >
            {children}
        </div>
    );
}

function InboxContent() {
    const { workspaces, workspaceId } = useAuth();
    const workspace = workspaces?.find((item) => item.id === workspaceId) || null;

    const { subscribe, subscribeConversation, unsubscribeConversation } = useRealtime();

    const [ch, setCh] = useState(CHANNELS[0]);
    const channelRef = useRef(ch);
    useEffect(() => {
        channelRef.current = ch;
    }, [ch]);
    const [activeFilter, setActiveFilter] = useState(0);
    const activeFilterRef = useRef(activeFilter);
    useEffect(() => {
        activeFilterRef.current = activeFilter;
    }, [activeFilter]);
    const reqIdRef = useRef(0);
    const [filterCounts, setFilterCounts] = useState({ all: 0, open: 0, unread: 0, converted: 0, closed: 0 });

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [lead, setLead] = useState(null);
    const [resolvedLeadId, setResolvedLeadId] = useState(null);
    const [leadDetail, setLeadDetail] = useState(null);
    const [msg, setMsg] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [previewMedia, setPreviewMedia] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessageMap, setLastMessageMap] = useState({});

    // Template state (from HEAD)
    const [templateName, setTemplateName] = useState(null);
    const [templateVariables, setTemplateVariables] = useState([]);
    const [templateLanguage, setTemplateLanguage] = useState('en_US');
    const [showTemplateSelect, setShowTemplateSelect] = useState(false);
    const [inboxTemplates, setInboxTemplates] = useState([]);
    const [selectedInboxTemplate, setSelectedInboxTemplate] = useState(null);
    const [inboxTemplateVariables, setInboxTemplateVariables] = useState({});
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');

    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeTargetId, setCloseTargetId] = useState(null);
    const [closingConversation, setClosingConversation] = useState(false);

    const leadRef = useRef(null);
    const lastProcessedIdRef = useRef(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const urlConversationId = searchParams.get('conversationId') || searchParams.get('conversation');

    const [tabletRight, setTabletRight] = useState('chat');
    const [ipadRight, setIpadRight] = useState('chat');
    const [mobileView, setMobileView] = useState('list');
    const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(false);

    const fetchInboxTemplates = useCallback(async () => {
        try {
            const workspace_id = workspace?.id;
            if (!workspace_id) return;
            await api.getTemplatesStatus(workspace_id);
            const data = await api.getTemplates();
            const approved = (data.templates || []).filter(t => t.status === 'approved');
            setInboxTemplates(approved);
        } catch (e) {
            console.error("Failed to fetch templates in inbox:", e);
        }
    }, [workspace?.id]);

    useEffect(() => {
        if (selectedInboxTemplate?.content) {
            const regex = /(?:\{\{|\{)(\d+)(?:\}\}|\})/g;
            let match;
            const vars = {};
            while ((match = regex.exec(selectedInboxTemplate.content)) !== null) {
                vars[match[1]] = '';
            }
            setInboxTemplateVariables(vars);
        } else {
            setInboxTemplateVariables({});
        }
    }, [selectedInboxTemplate]);

    const getInboxTemplatePreviewText = () => {
        if (!selectedInboxTemplate?.content) return '';
        return selectedInboxTemplate.content.replace(/(?:\{\{|\{)(\d+)(?:\}\}|\})/g, (_, num) => {
            return inboxTemplateVariables[num] || `{{${num}}}`;
        });
    };

    const handleApplyInboxTemplate = () => {
        if (!selectedInboxTemplate) return;
        const finalMsg = getInboxTemplatePreviewText();
        const varKeys = Object.keys(inboxTemplateVariables).sort((a, b) => Number(a) - Number(b));
        setMsg(finalMsg);
        setTemplateName(selectedInboxTemplate.name);
        setTemplateVariables(varKeys.map(k => inboxTemplateVariables[k]));
        setTemplateLanguage(selectedInboxTemplate.language || 'en_US');
        setShowTemplateSelect(false);
    };

    const filteredInboxTemplates = inboxTemplates.filter(t =>
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        (t.content || '').toLowerCase().includes(templateSearchQuery.toLowerCase())
    );

    useEffect(() => {
        const msgParam = searchParams.get('msg');
        const channelParam = searchParams.get('channel');
        const tplNameParam = searchParams.get('template_name');
        const tplVarsParam = searchParams.get('variables');
        const tplLangParam = searchParams.get('language');

        const timer = setTimeout(() => {
            if (msgParam) setMsg(msgParam);
            if (channelParam) {
                const matchedCh = CHANNELS.find(c => c.id === channelParam);
                if (matchedCh) setCh(matchedCh);
            }
            if (tplNameParam) setTemplateName(tplNameParam);
            if (tplVarsParam) {
                try { setTemplateVariables(JSON.parse(tplVarsParam)); } catch { }
            }
            if (tplLangParam) setTemplateLanguage(tplLangParam);
        }, 0);
        return () => clearTimeout(timer);
    }, [searchParams]);

    useEffect(() => { leadRef.current = lead; }, [lead]);

    useEffect(() => {
        if (!resolvedLeadId) { setLeadDetail(null); return; }
        let active = true;
        api.get(`/lead-scoring/leads/${resolvedLeadId}/detail`)
            .then(data => { if (active) setLeadDetail(data); })
            .catch(err => console.error("Failed to fetch lead detail:", err));
        return () => { active = false; };
    }, [resolvedLeadId]);

    const fetchLeadIdForConversation = useCallback(async (conversationId) => {
        if (!conversationId || !workspace?.id) return null;
        try {
            const data = await api.get('/api/lead-scoring/leads?limit=100&offset=0');
            const items = data.items || data || [];
            const match = items.find(l => l.conversation_id === conversationId);
            return match?.lead_id || match?.id || null;
        } catch { return null; }
    }, [workspace?.id]);

    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    const fetchMessages = useCallback(async (id) => {
        if (!id) return;
        try {
            const data = await api.get(`/api/messages/${id}?limit=50`);
            if (!Array.isArray(data)) { console.warn("Messages API non-array:", data); return; }

            data.forEach(m => {
                if (m.id) markMessageAsProcessed(m.id);
            });

            if (data.length > 0) {
                const lastMsg = data[data.length - 1];
                if (lastMsg?.content) {
                    setLastMessageMap(prev => ({ ...prev, [id]: lastMsg.content }));
                }
            }

            if (id === leadRef.current?.id) {
                setMessages(data);
                setHasMoreMessages(data.length >= 50);
            }
        } catch (e) { console.error('Message fetch error:', e); }
    }, []);

    const loadOlderMessages = useCallback(async () => {
        const currentLeadId = leadRef.current?.id;
        if (!currentLeadId || isLoadingOlder || !hasMoreMessages) return;

        const oldestMsg = messages[0];
        if (!oldestMsg) return;

        const oldestTimestamp = oldestMsg.timestamp || oldestMsg.created_at;
        const oldestId = oldestMsg.id;
        if (!oldestTimestamp) return;

        setIsLoadingOlder(true);
        try {
            const olderData = await api.get(
                `/api/messages/${currentLeadId}?limit=50&before_timestamp=${encodeURIComponent(oldestTimestamp)}&before_id=${encodeURIComponent(oldestId || '')}`
            );

            if (!Array.isArray(olderData) || olderData.length === 0) {
                setHasMoreMessages(false);
                return;
            }

            if (olderData.length < 50) {
                setHasMoreMessages(false);
            }

            olderData.forEach(m => {
                if (m.id) markMessageAsProcessed(m.id);
            });

            if (currentLeadId === leadRef.current?.id) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newItems = olderData.filter(m => !existingIds.has(m.id));
                    return [...newItems, ...prev];
                });
            }
        } catch (e) {
            console.error('Failed to load older messages:', e);
        } finally {
            setIsLoadingOlder(false);
        }
    }, [hasMoreMessages, isLoadingOlder, messages]);

    const getStatusParam = useCallback((filterIdx) => {
        return { 0: 'OPEN', 1: 'CONVERTED', 2: 'CLOSED', 3: 'ALL' }[filterIdx] || 'OPEN';
    }, []);

    const fetchConversations = useCallback(async ({ selectFirst = false, statusOverride = null, filterIdx = null, reqId = null } = {}) => {
        if (!workspace?.id) return;
        const targetFilterIdx = filterIdx !== null ? filterIdx : activeFilterRef.current;
        const statusParam = statusOverride || getStatusParam(targetFilterIdx);
        const currentChannel = ch.id;

        try {
            const [data, counts] = await Promise.all([
                api.get(`/api/conversations?workspace_id=${workspace.id}&channel=${currentChannel}&status=${statusParam}`),
                api.get(`/api/conversations/counts?workspace_id=${workspace.id}&channel=${currentChannel}`).catch(() => null)
            ]);

            if (!Array.isArray(data)) {
                console.warn("Conversations API non-array:", data);
                return;
            }

            // Drop response if channel or filter changed while request was in-flight
            if (channelRef.current.id !== currentChannel) return;
            if (activeFilterRef.current !== targetFilterIdx && !statusOverride) return;
            if (reqId !== null && reqId !== reqIdRef.current) return;

            // Deduplicate conversations strictly by ID
            const uniqueData = Array.from(
                new Map(data.map(item => [item.id, item])).values()
            );

            setConversations(uniqueData);

            if (counts && typeof counts === 'object') {
                setFilterCounts({
                    all: counts.all ?? 0,
                    open: counts.open ?? 0,
                    unread: counts.unread ?? 0,
                    converted: counts.converted ?? 0,
                    closed: counts.closed ?? 0,
                });
            }

            // Populate unreadCounts from backend for conversations not currently open
            setUnreadCounts(prev => {
                const next = { ...prev };
                uniqueData.forEach(c => {
                    if (leadRef.current?.id === c.id) {
                        next[c.id] = 0;
                    } else if (c.unread_count !== undefined) {
                        next[c.id] = Math.max(prev[c.id] || 0, c.unread_count || 0);
                    }
                });
                return next;
            });

            // Populate lastMessageMap directly from conversation data
            setLastMessageMap(prev => {
                const next = { ...prev };
                uniqueData.forEach(c => {
                    const text = c.last_message || c.last_message_text || c.preview;
                    if (text) {
                        next[c.id] = text;
                    }
                });
                return next;
            });

            if (uniqueData.length === 0) {
                setLead(null);
                setResolvedLeadId(null);
                setMessages([]);
                return;
            }

            let urlConvId = null;
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                urlConvId = params.get('conversationId') || params.get('conversation');
            }

            let nextLead = null;
            if (urlConvId && uniqueData.some(item => item.id === urlConvId)) {
                nextLead = uniqueData.find(item => item.id === urlConvId);
                if (typeof window !== 'undefined') {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete('conversationId');
                    newParams.delete('conversation');
                    router.replace(`${pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`, { scroll: false });
                }
            } else {
                const currentLeadId = leadRef.current?.id;
                nextLead = selectFirst ? uniqueData[0] : (uniqueData.find(item => item.id === currentLeadId) || uniqueData[0]);
            }

            setLead(nextLead);
            leadRef.current = nextLead;
            if (nextLead) {
                setUnreadCounts(prev => ({ ...prev, [nextLead.id]: 0 }));
                fetchMessages(nextLead.id);
                fetchLeadIdForConversation(nextLead.id).then(id => setResolvedLeadId(id));
            }
        } catch (e) {
            console.error('Conversation fetch error:', e);
        }
    }, [workspace?.id, ch.id, getStatusParam, pathname, router, searchParams, fetchMessages, fetchLeadIdForConversation]);

    const handleFilterChange = useCallback((newFilterIdx) => {
        if (activeFilterRef.current === newFilterIdx) return;
        setActiveFilter(newFilterIdx);
        activeFilterRef.current = newFilterIdx;
        reqIdRef.current += 1;
        const currentReqId = reqIdRef.current;

        // Flush old conversation results immediately
        setConversations([]);
        setLead(null);
        setResolvedLeadId(null);
        setMessages([]);
        leadRef.current = null;

        fetchConversations({
            filterIdx: newFilterIdx,
            selectFirst: true,
            reqId: currentReqId,
        });
    }, [fetchConversations]);

    useEffect(() => {
        if (!workspace?.id || !urlConversationId) {
            if (!urlConversationId) lastProcessedIdRef.current = null;
            return;
        }
        if (urlConversationId === lastProcessedIdRef.current) return;
        lastProcessedIdRef.current = urlConversationId;

        api.get(`/api/conversations/${urlConversationId}`).then(data => {
            if (data?.channel) {
                const targetChannel = CHANNELS.find(c => c.id === data.channel);
                if (targetChannel) {
                    setCh(targetChannel);
                    setActiveFilter(0);
                    activeFilterRef.current = 0;
                    reqIdRef.current += 1;
                    fetchConversations({ selectFirst: true, statusOverride: 'ALL', reqId: reqIdRef.current });
                }
            }
        }).catch(e => console.error('Failed to look up conversation:', e));
    }, [workspace?.id, urlConversationId, fetchConversations]);

    useEffect(() => {
        setDesktopDrawerOpen(false);
        reqIdRef.current += 1;
        const currentReqId = reqIdRef.current;
        setLead(null);
        setResolvedLeadId(null);
        leadRef.current = null;
        setMessages([]);
        setConversations([]);
        fetchConversations({ selectFirst: true, reqId: currentReqId });
    }, [ch.id, fetchConversations]);

    useEffect(() => {
        if (!workspace?.id) return;
        const interval = setInterval(() => {
            fetchConversations();
            if (leadRef.current?.id) {
                fetchMessages(leadRef.current.id);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [workspace?.id, fetchConversations, fetchMessages]);

    useEffect(() => {
        if (!lead?.id) return;
        subscribeConversation(lead.id);
        return () => unsubscribeConversation(lead.id);
    }, [lead?.id, subscribeConversation, unsubscribeConversation]);

    useEffect(() => {
        return subscribe((event) => {
            const eventWorkspaceId = event.workspace_id || event.payload?.workspace_id;
            if (eventWorkspaceId && workspace?.id && eventWorkspaceId !== workspace.id) return;

            const eventConversationId = event.conversation_id || event.payload?.conversation_id;

            switch (event.event_type) {
                case 'new_message': {
                    const msgData = event.payload || {};
                    const msgId = msgData.id || event.id || event.event_id;
                    const senderRaw = typeof msgData.sender_type === 'string'
                        ? msgData.sender_type
                        : (msgData.sender_type?.value || msgData.sender || event.sender_type || '');
                    const msgSender = senderRaw.toLowerCase();
                    const msgContent = msgData.content || msgData.message_preview || event.content || '';

                    console.log("📩 Incoming WebSocket message:", event);

                    if (eventConversationId && msgContent) {
                        setLastMessageMap(prev => ({ ...prev, [eventConversationId]: msgContent }));
                    }

                    // Genuine NEW incoming message from customer
                    const isExplicitOutbound = msgSender.includes('agent') || msgSender.includes('ai') || msgSender.includes('system') || msgData.direction === 'outbound';
                    const isExplicitInbound = msgSender.includes('user') || msgSender.includes('customer') || msgSender.includes('lead') || msgSender.includes('contact') || msgData.direction === 'inbound';
                    const isIncoming = isExplicitInbound || (!isExplicitOutbound && !msgSender);

                    if (isIncoming) {
                        // Play sound only if not already played for this message ID
                        if (!msgId || !isMessageAlreadyProcessed(msgId)) {
                            if (msgId) markMessageAsProcessed(msgId);
                            playNotificationSound();
                        }

                        const isCurrentlyActive = leadRef.current?.id === eventConversationId;
                        if (!isCurrentlyActive && eventConversationId) {
                            setUnreadCounts(prev => ({
                                ...prev,
                                [eventConversationId]: (prev[eventConversationId] || 0) + 1
                            }));
                        }
                    } else {
                        console.log("ℹ️ Outbound / non-customer message detected, skipping audio notification");
                    }

                    fetchConversations();
                    if (eventConversationId && leadRef.current?.id === eventConversationId) {
                        fetchMessages(eventConversationId);
                    }
                    break;
                }
                case 'conversation_updated':
                    fetchConversations();
                    if (eventConversationId && leadRef.current?.id === eventConversationId) {
                        fetchMessages(eventConversationId);
                    }
                    break;
                case 'message_status_updated':
                case 'ai_response_ready':
                case 'ai_thinking':
                    if (eventConversationId && leadRef.current?.id === eventConversationId) {
                        fetchMessages(eventConversationId);
                    }
                    break;
                case 'lead.score.updated':
                case 'lead.updated':
                    fetchConversations();
                    const targetLeadId = event.payload?.lead_id || resolvedLeadId;
                    if (targetLeadId && (event.payload?.conversation_id === leadRef.current?.id || event.payload?.lead_id === resolvedLeadId)) {
                        api.get(`/lead-scoring/leads/${targetLeadId}/detail`)
                            .then(data => setLeadDetail(data))
                            .catch(err => console.error("Failed to refresh lead detail:", err));
                    }
                    break;
                default:
                    break;
            }
        });
    }, [fetchConversations, fetchMessages, subscribe, workspace?.id, resolvedLeadId]);

    async function sendMessage() {
        if ((!msg.trim() && !selectedFile) || !lead || isUploadingMedia) return;
        setIsUploadingMedia(true);
        try {
            let uploadedMediaUrl = null;
            let detectedMessageType = null;
            let detectedMimeType = null;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const uploadRes = await api.post('/api/upload', formData);
                uploadedMediaUrl = uploadRes.url;
                detectedMessageType = uploadRes.file_type || (
                    selectedFile.type.startsWith('video/') ? 'video' :
                    selectedFile.type.startsWith('audio/') ? 'audio' :
                    selectedFile.type.startsWith('image/') ? 'image' : 'document'
                );
                detectedMimeType = selectedFile.type;
            }

            const payload = {
                conversation_id: lead.id,
                message: msg.trim() || (uploadedMediaUrl ? `[${(detectedMessageType || 'IMAGE').toUpperCase()}]` : ''),
            };

            if (uploadedMediaUrl) {
                payload.metadata = {
                    media_url: uploadedMediaUrl,
                    message_type: detectedMessageType,
                    mime_type: detectedMimeType,
                };
            }

            if (templateName) {
                payload.metadata = {
                    ...(payload.metadata || {}),
                    template_name: templateName,
                    variables: templateVariables,
                    language: templateLanguage,
                };
            }

            await api.post('/api/send-reply', payload);
            setMsg('');
            setSelectedFile(null);
            setSelectedFilePreview(null);
            setTemplateName(null);
            setTemplateVariables([]);
            setTemplateLanguage('en_US');
            fetchMessages(lead.id);
        } catch (e) {
            console.error('Send error:', e);
            if (e.status === 503) {
                showToast("This channel isn't configured for this workspace yet. Please contact admin to set up channel credentials.");
            } else {
                showToast("Failed to send message. Please try again.");
            }
        } finally {
            setIsUploadingMedia(false);
        }
    }

    async function generateSuggestion() {
        if (!lead) return;
        try {
            const data = await api.post('/api/ai-suggest', {
                conversation_id: lead.id,
                message: messages[messages.length - 1]?.content || '',
            });
            setAiSuggestion(data.suggestion);
        } catch (e) { console.error(e); }
    }

    function useSuggestion() { setMsg(aiSuggestion); setAiSuggestion(''); }

    function removeConversationFromList(conversationId) {
        setConversations(prev => {
            const updated = prev.filter(c => c.id !== conversationId);
            if (lead?.id === conversationId) {
                if (updated.length > 0) {
                    const next = updated[0];
                    setLead(next);
                    fetchMessages(next.id);
                    fetchLeadIdForConversation(next.id).then(id => setResolvedLeadId(id));
                } else {
                    setLead(null); setResolvedLeadId(null); setMessages([]);
                }
            }
            return updated;
        });
    }

    function promptCloseConversation(conversationId) {
        if (!conversationId) return;
        setCloseTargetId(conversationId);
        setShowCloseModal(true);
    }

    async function handleConfirmClose() {
        if (!closeTargetId) return;
        setClosingConversation(true);
        try {
            await api.post(`/api/conversations/${closeTargetId}/close`);
            removeConversationFromList(closeTargetId);
            setShowCloseModal(false);
            setCloseTargetId(null);
        } catch (e) {
            console.error('Failed to close conversation:', e);
        } finally {
            setClosingConversation(false);
        }
    }

    function handleConvertSuccess() {
        if (!lead?.id) return;
        removeConversationFromList(lead.id);
    }

    function handleLeadSelectTablet(l) {
        if (!l) return;
        setLead(l);
        leadRef.current = l;
        fetchMessages(l.id);
        setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
        api.post(`/api/conversations/${l.id}/read`).catch(() => {});
        fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
        setTabletRight('chat');
    }

    function handleLeadSelectMobile(l) {
        if (!l) return;
        setLead(l);
        leadRef.current = l;
        fetchMessages(l.id);
        setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
        api.post(`/api/conversations/${l.id}/read`).catch(() => {});
        fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
        setMobileView('chat');
    }

    const chatAreaProps = {
        ch, lead, messages, msg, setMsg,
        aiSuggestion, sendMessage, generateSuggestion, useSuggestion,
        previewMedia, setPreviewMedia,
        templateName, setTemplateName, setTemplateVariables, setTemplateLanguage,
        fetchInboxTemplates, setSelectedInboxTemplate,
        setTemplateSearchQuery, setShowTemplateSelect,
        workspace,
        selectedFile, setSelectedFile,
        selectedFilePreview, setSelectedFilePreview,
        isUploadingMedia,
        onLoadOlderMessages: loadOlderMessages,
        hasMoreMessages,
        isLoadingOlder,
        onSendTemplateSuccess: (formattedContent) => {
            fetchMessages(lead.id);
            setMessages(prev => [...prev, {
                id: 'temp-' + Date.now(),
                sender_type: 'agent',
                content: formattedContent,
                timestamp: new Date().toISOString(),
                status: 'sent',
            }]);
        },
    };

    const infoPanelProps = {
        ch, lead,
        resolvedLeadId, messages,
        onCloseConversation: promptCloseConversation,
        onConvertClick: () => setShowConvertModal(true),
        leadDetail, setLeadDetail,
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0d0d0d', fontFamily: "'Poppins', sans-serif" }}>

            {/* DESKTOP (≥1260px) */}
            <div className="hidden xl:flex flex-1 overflow-hidden p-3 gap-3 relative">
                <div className="flex flex-col gap-3" style={{ width: 400, minWidth: 380, maxWidth: 420 }}>
                    <ChannelTabs ch={ch} setCh={setCh} />
                    <PanelCard className="flex-1">
                        <ConversationSidebar
                            ch={ch} conversations={conversations} lead={lead}
                            activeFilter={activeFilter} onFilterChange={handleFilterChange}
                            filterCounts={filterCounts}
                            unreadCounts={unreadCounts} lastMessageMap={lastMessageMap}
                            onLeadSelect={(l) => {
                                setLead(l);
                                leadRef.current = l;
                                fetchMessages(l.id);
                                setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                                api.post(`/api/conversations/${l.id}/read`).catch(() => {});
                                fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
                            }}
                        />
                    </PanelCard>
                </div>

                <div className="flex flex-col gap-3 flex-1" style={{ minWidth: 0 }}>
                    <div className="shrink-0" style={{ height: 40 }} />
                    <PanelCard className="flex-1">
                        <ChatArea
                            {...chatAreaProps}
                            onInfoClick={() => setDesktopDrawerOpen(prev => !prev)}
                            infoActive={desktopDrawerOpen}
                            showMobileBackButton={false}
                        />
                    </PanelCard>
                </div>

                {/* Permanent Contact Details Panel (ONLY on Large Desktop >1600px) */}
                <div className="hidden min-[1601px]:flex flex-col gap-3" style={{ width: 420, minWidth: 400, maxWidth: 450 }}>
                    <div className="shrink-0" style={{ height: 40 }} />
                    <PanelCard className="flex-1">
                        <InfoPanel {...infoPanelProps} showBackButton={false} />
                    </PanelCard>
                </div>

                {/* Slide-over Drawer for Contact Details (ONLY on 1260px – 1600px) */}
                <AnimatePresence>
                    {desktopDrawerOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setDesktopDrawerOpen(false)}
                                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm min-[1601px]:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                                className="fixed top-0 right-0 bottom-0 z-[90] w-[420px] max-w-[90vw] p-3 flex flex-col min-[1601px]:hidden"
                            >
                                <PanelCard className="flex-1 overflow-hidden shadow-2xl relative">
                                    <InfoPanel
                                        {...infoPanelProps}
                                        showBackButton={true}
                                        onBack={() => setDesktopDrawerOpen(false)}
                                    />
                                </PanelCard>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* IPAD PRO (1024px–1279px) */}
            <div className="hidden lg:flex xl:hidden flex-col flex-1 overflow-hidden">
                <div className="flex flex-1 overflow-hidden p-3 gap-3">
                    <div className="flex flex-col gap-3" style={{ width: 360, minWidth: 320, maxWidth: 380 }}>
                        <ChannelTabs ch={ch} setCh={setCh} />
                        <PanelCard className="flex-1">
                            <ConversationSidebar
                                ch={ch} conversations={conversations} lead={lead}
                                activeFilter={activeFilter} onFilterChange={handleFilterChange}
                                filterCounts={filterCounts}
                                unreadCounts={unreadCounts} lastMessageMap={lastMessageMap}
                                onLeadSelect={(l) => {
                                    setLead(l);
                                    leadRef.current = l;
                                    fetchMessages(l.id);
                                    setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                                    api.post(`/api/conversations/${l.id}/read`).catch(() => {});
                                    fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
                                    setIpadRight('chat');
                                }}
                            />
                        </PanelCard>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 relative overflow-hidden" style={{ minWidth: 0 }}>
                        <div className="shrink-0" style={{ height: 40 }} />
                        <div className="flex-1 relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                {ipadRight === 'chat' ? (
                                    <motion.div key="ipad-chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                                        className="absolute inset-0 rounded-2xl overflow-hidden border"
                                        style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                                        <ChatArea {...chatAreaProps} onInfoClick={() => setIpadRight('info')} infoActive={false} showMobileBackButton={false} />
                                    </motion.div>
                                ) : (
                                    <motion.div key="ipad-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                        className="absolute inset-0 rounded-2xl overflow-hidden border overflow-y-auto"
                                        style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                                        <InfoPanel {...infoPanelProps} showBackButton={true} onBack={() => setIpadRight('chat')} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLET (768px–1023px) */}
            <div className="hidden md:flex lg:hidden flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
                    <ChannelTabs ch={ch} setCh={setCh} />
                </div>
                <div className="flex flex-1 overflow-hidden px-3 pb-3 gap-3">
                    <PanelCard style={{ width: 260, minWidth: 240 }}>
                        <ConversationSidebar
                            ch={ch} conversations={conversations} lead={lead}
                            activeFilter={activeFilter} onFilterChange={handleFilterChange}
                            filterCounts={filterCounts}
                            unreadCounts={unreadCounts} lastMessageMap={lastMessageMap}
                            onLeadSelect={(l) => {
                                handleLeadSelectTablet(l);
                                setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                            }}
                        />
                    </PanelCard>
                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {tabletRight === 'chat' ? (
                                <motion.div key="tablet-chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                                    className="absolute inset-0 rounded-2xl overflow-hidden border"
                                    style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                                    <ChatArea {...chatAreaProps} onInfoClick={() => setTabletRight('info')} infoActive={false} showMobileBackButton={false} />
                                </motion.div>
                            ) : (
                                <motion.div key="tablet-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                    className="absolute inset-0 rounded-2xl overflow-hidden border overflow-y-auto"
                                    style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                                    <InfoPanel {...infoPanelProps} showBackButton={true} onBack={() => setTabletRight('chat')} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* MOBILE (<768px) */}
            <div className="flex md:hidden flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
                    <ChannelTabs ch={ch} setCh={setCh} />
                </div>
                <div className="flex flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {mobileView === 'list' && (
                            <motion.div key="mobile-list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0" style={{ backgroundColor: CARD_BG }}>
                                <ConversationSidebar
                                    ch={ch} conversations={conversations} lead={lead}
                                    activeFilter={activeFilter} onFilterChange={handleFilterChange}
                                    filterCounts={filterCounts}
                                    unreadCounts={unreadCounts} lastMessageMap={lastMessageMap}
                                    onLeadSelect={(l) => {
                                        handleLeadSelectMobile(l);
                                        setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                                    }}
                                />
                            </motion.div>
                        )}
                        {mobileView === 'chat' && (
                            <motion.div key="mobile-chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex flex-col" style={{ backgroundColor: CARD_BG }}>
                                <ChatArea {...chatAreaProps} onInfoClick={() => setMobileView('info')} infoActive={false} showMobileBackButton={true} onBackToList={() => setMobileView('list')} />
                            </motion.div>
                        )}
                        {mobileView === 'info' && lead && (
                            <motion.div key="mobile-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: CARD_BG }}>
                                <InfoPanel {...infoPanelProps} showBackButton={true} onBack={() => setMobileView('chat')} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Template Selector Modal */}
            {showTemplateSelect && (
                <>
                    <div onClick={() => setShowTemplateSelect(false)} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[6px]" />
                    <div className="fixed z-[101] flex flex-col"
                        style={{
                            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: 800, height: 600, maxWidth: '95vw', maxHeight: '90vh',
                            background: 'linear-gradient(160deg, #16112c 0%, #0d0820 100%)',
                            borderRadius: 24, border: '1px solid #2a1f4a',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15)',
                            fontFamily: "'Poppins', sans-serif", overflow: 'hidden',
                        }}>

                        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#2a1f4a]/50">
                            <h2 className="m-0 text-[18px] font-bold text-[#f0f0ff] tracking-tight flex items-center gap-2">
                                <FileText size={18} className="text-purple-400" />
                                Select WhatsApp Template
                            </h2>
                            <button onClick={() => setShowTemplateSelect(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all border border-[#2a2a4a] bg-white/5 text-white hover:bg-white/10">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            <div className="w-[320px] border-r border-[#2a1f4a]/30 flex flex-col bg-[#0b0717]/40">
                                <div className="p-3">
                                    <div className="flex items-center gap-2 bg-[#120d22] border border-[#2a1f4a] rounded-xl px-3 py-2">
                                        <Search size={14} className="text-gray-400 shrink-0" />
                                        <input
                                            type="text" value={templateSearchQuery}
                                            onChange={e => setTemplateSearchQuery(e.target.value)}
                                            placeholder="Search templates..."
                                            className="bg-transparent border-none outline-none text-white text-[12px] w-full placeholder:text-gray-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5">
                                    {filteredInboxTemplates.length > 0 ? filteredInboxTemplates.map(t => {
                                        const isSelected = selectedInboxTemplate?.id === t.id;
                                        return (
                                            <button key={t.id} onClick={() => setSelectedInboxTemplate(t)}
                                                className="w-full text-left p-3 rounded-xl transition-all border outline-none"
                                                style={{ backgroundColor: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent', borderColor: isSelected ? '#7c3aed' : 'transparent' }}>
                                                <div className="font-semibold text-white text-[13px] truncate">{t.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{t.category}</span>
                                                    <span className="text-[10px] text-gray-400">{t.language}</span>
                                                </div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="text-center py-8 text-gray-500 text-[12px]">No approved templates found.</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col bg-[#0b081c]/10 overflow-y-auto p-6">
                                {selectedInboxTemplate ? (
                                    <div className="flex-1 flex flex-col gap-5">
                                        <div className="flex justify-between items-center bg-[#150f28] border border-[#2a1f4a]/50 p-3 rounded-xl">
                                            <div>
                                                <div className="text-xs text-gray-400">Template Name</div>
                                                <div className="text-sm font-semibold text-white">{selectedInboxTemplate.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">Language</div>
                                                <div className="text-sm font-semibold text-purple-300">{selectedInboxTemplate.language}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Preview</div>
                                            <div className="bg-[#100b21] border border-[#251d3b] p-4 rounded-2xl max-w-md">
                                                {selectedInboxTemplate.header && (
                                                    <div className="font-bold text-white text-[13px] mb-1">{selectedInboxTemplate.header}</div>
                                                )}
                                                <div className="text-[13px] text-white/90 whitespace-pre-wrap leading-relaxed">
                                                    {getInboxTemplatePreviewText()}
                                                </div>
                                                {selectedInboxTemplate.footer && (
                                                    <div className="text-[11px] text-gray-400 mt-2">{selectedInboxTemplate.footer}</div>
                                                )}
                                            </div>
                                        </div>

                                        {Object.keys(inboxTemplateVariables).length > 0 && (
                                            <div className="flex flex-col gap-3">
                                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Variables</div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {Object.keys(inboxTemplateVariables).sort((a, b) => Number(a) - Number(b)).map(key => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Variable {`{{${key}}}`}</label>
                                                            <input
                                                                type="text" value={inboxTemplateVariables[key]}
                                                                onChange={e => setInboxTemplateVariables(prev => ({ ...prev, [key]: e.target.value }))}
                                                                placeholder={`Enter value for {{${key}}}`}
                                                                className="w-full px-3 py-2 rounded-lg border border-[#2a1f4a] bg-[#120d22] text-white text-[13px] outline-none focus:border-[#7c3aed]"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                                        <FileText size={42} className="text-gray-600 mb-3" />
                                        <p className="text-[13px]">Select a template from the list to preview and configure.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-[#2a1f4a]/50 flex justify-end gap-3 bg-[#0d091e]">
                            <button onClick={() => setShowTemplateSelect(false)}
                                className="px-5 py-2.5 rounded-xl border border-[#2a1f4a] bg-transparent text-white text-[13px] font-semibold hover:bg-white/5">
                                Cancel
                            </button>
                            <button onClick={handleApplyInboxTemplate} disabled={!selectedInboxTemplate}
                                className="px-5 py-2.5 rounded-xl border-none text-white text-[13px] font-bold transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: selectedInboxTemplate ? '0 2px 14px rgba(129,74,200,0.45)' : 'none' }}>
                                Apply Template
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            {showConvertModal && (
                <ConvertLeadModal
                    isOpen={showConvertModal}
                    onClose={() => setShowConvertModal(false)}
                    conversation={lead}
                    onSuccess={handleConvertSuccess}
                />
            )}

            <CloseConversationModal
                isOpen={showCloseModal}
                onClose={() => { setShowCloseModal(false); setCloseTargetId(null); }}
                onConfirm={handleConfirmClose}
                loading={closingConversation}
            />

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

export default function InboxPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#0d0d0d] flex items-center justify-center text-white/70">Loading Inbox...</div>}>
            <InboxContent />
        </Suspense>
    );
}