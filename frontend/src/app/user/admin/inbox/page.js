'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Phone, Instagram, Globe, Mail, Paperclip,
    Zap, Sparkles, Send, Clock, User, Star, Calendar,
    ArrowRight, ChevronRight, MoreHorizontal, Info,
    ArrowLeft, SlidersHorizontal, Camera, FileText,
    PenLine, CheckSquare, UserCheck, XCircle, ChevronDown, ChevronUp, Check,
    Inbox, X, Play, Pause, Mic, CheckCheck, Smile, Loader2, MessageCircle,
    RefreshCw, MessageSquarePlus, MessageSquare, Plus, Video, Trash2,
    Activity, Bell
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useToast } from '@/context/ToastContext';
import MessageRenderer from '@/components/chat/MessageRenderer';
import SendTemplateModal from '@/components/chat/SendTemplateModal';
import { insertDateSeparators } from '@/lib/dateUtils';
import ConvertLeadModal from '@/components/leads/ConvertLeadModal';
import CloseConversationModal from '@/components/inbox/CloseConversationModal';
import NewChatModal from '@/components/inbox/NewChatModal';
import api from '@/lib/api';
import Preloader, { RazorpaySpinner } from '@/components/Preloader';
import { SYSTEM_TIERS, AGENT_LABELS } from '@/lib/labelStyles';
import {
    playNotificationSound,
    playSentSound,
    markMessageAsProcessed,
    isMessageAlreadyProcessed,
} from '@/lib/notificationSound';
import EmojiPicker from 'emoji-picker-react';



const TwilioIcon = ({ size = 20, style = {}, className = "" }) => {
    const isInactive = style?.color === '#666';
    const circleFill = isInactive ? '#52525b' : '#F22F46';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill={circleFill}/>
            <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.75"/>
            <circle cx="12" cy="7.75" r="1.4" fill="white"/>
            <circle cx="12" cy="16.25" r="1.4" fill="white"/>
            <circle cx="7.75" cy="12" r="1.4" fill="white"/>
            <circle cx="16.25" cy="12" r="1.4" fill="white"/>
        </svg>
    );
};

const WhatsAppIcon = ({ size = 20, style = {}, className = "" }) => {
    const isInactive = style?.color === '#666';
    const circleFill = isInactive ? '#52525b' : '#25D366';
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            className={`shrink-0 select-none ${className}`}
            style={style}
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="24" cy="24" r="24" fill={circleFill} />
            <path
                d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z"
                fill="white"
            />
        </svg>
    );
};

const InstagramIcon = ({ size = 20, style = {}, className = "" }) => {
    const isInactive = style?.color === '#666';
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            className={`shrink-0 select-none ${className}`}
            style={style}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="inbox-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="24" fill={isInactive ? '#52525b' : 'url(#inbox-ig-grad)'} />
            <path
                d="M30 15H18A3 3 0 0015 18v12a3 3 0 003 3h12a3 3 0 003-3V18a3 3 0 00-3-3zm-6 14.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zm6.8-10.3a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm-6.8 2.3a3 3 0 100 6 3 3 0 000-6z"
                fill="white"
            />
        </svg>
    );
};

const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366', gradient: null },
    {
        id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: '#ee2a7b',
        gradient: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)'
    },
    { id: 'twilio', label: 'Twilio', icon: TwilioIcon, color: '#F22F46', gradient: null },
];

const STATUS_FILTERS = [
    { id: 'all', label: 'All', countKey: 'all', param: 'ALL' },
    { id: 'open', label: 'Open', countKey: 'open', param: 'OPEN' },
    { id: 'follow_up', label: 'Follow Up', countKey: 'follow_up', param: 'FOLLOW_UP' },
    { id: 'converted', label: 'Converted', countKey: 'converted', param: 'CONVERTED' },
];

function getStatusFilters() {
    return STATUS_FILTERS;
}

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
    if (!lead) return 'Unknown';
    if (channelId === 'instagram') {
        return lead.contact_name || lead.name || lead.username || 'Instagram User';
    }

    // 1. Check if lead has an explicit non-numeric contact name, lead name, profile name or username
    const candidate = lead.contact_name || lead.name || lead.profile_name || lead.username || lead.customer_name;
    const cleanPhone = String(lead.phone || lead.external_id || '').replace(/\D/g, '');
    const cleanCandidate = String(candidate || '').replace(/\D/g, '');

    if (candidate && (!cleanCandidate || cleanCandidate !== cleanPhone) && !/^\+?\d{7,}$/.test(candidate.trim())) {
        return candidate.trim();
    }

    // 2. Fallback: check if the preview or last message begins with a greeting like "Hi Name 👋" or "Hello Name,"
    const preview = lead.preview || lead.last_message || lead.last_message_text || '';
    if (preview) {
        const match = preview.match(/^(?:Hi|Hello|Hey|Dear)\s+([A-Za-z][A-Za-z\s]{1,30}?)(?:\s*[👋,!]|\s+Thanks|\s+welcome)/i);
        if (match && match[1]) {
            const extracted = match[1].trim();
            if (extracted && extracted.length > 1 && !/^(?:there|team|customer|user|sir|madam)$/i.test(extracted)) {
                return extracted;
            }
        }
    }

    // 3. Fallback: formatted phone number
    const rawPhone = lead.phone || lead.external_id || candidate;
    if (rawPhone) {
        const digits = String(rawPhone).replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length === 12) {
            return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
        }
        return rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
    }
    return 'Unknown Contact';
}

function getAvatarText(lead, channelId) {
    const displayName = getDisplayName(lead, channelId);
    if (displayName && !displayName.startsWith('+') && !/^\d+$/.test(displayName)) {
        return displayName.trim()[0].toUpperCase();
    }
    const phone = lead?.phone || lead?.external_id || '';
    const digits = String(phone).replace(/\D/g, '');
    return digits ? digits.slice(-2) : 'U';
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
    const channelStr = (typeof channel === 'string' ? channel : channel?.id || '').toLowerCase();
    if (channelStr === 'whatsapp') return <WhatsAppIcon size={size} />;
    if (channelStr === 'instagram') return <InstagramIcon size={size} />;
    if (channelStr === 'twilio') return <TwilioIcon size={size} />;
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
            const senderType = (m.sender_type || '').toLowerCase();
            if (senderType === 'user' || senderType === 'customer' || senderType === 'lead' || senderType === 'inbound') {
                const ts = m.timestamp || m.created_at;
                if (ts) {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) return d;
                }
            }
        }
    }
    if (lead?.last_user_message_at || lead?.last_incoming_at) {
        const d = new Date(lead.last_user_message_at || lead.last_incoming_at);
        if (!isNaN(d.getTime())) return d;
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

function ConversationSidebar({
    ch,
    setCh,
    conversations = [],
    lead,
    activeFilter,
    onFilterChange,
    onLeadSelect,
    filterCounts = {},
    unreadCounts = {},
    lastMessageMap = {},
    currentUser,
    onOpenNewChat,
    channelStatuses = {},
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const channelDropdownRef = useRef(null);
    const isInstagram = ch.id === 'instagram';
    const statusFilters = getStatusFilters(ch.id);

    const isWhatsAppConnected = Boolean(channelStatuses?.whatsapp);
    const isInstagramConnected = Boolean(channelStatuses?.instagram);
    const isTwilioConnected = Boolean(channelStatuses?.twilio);

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
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

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

    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const [subFilter, setSubFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Close channel dropdown on click outside or Escape
    useEffect(() => {
        function handleClickOutside(event) {
            if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target)) {
                setIsChannelDropdownOpen(false);
            }
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsChannelDropdownOpen(false);
            }
        }
        if (isChannelDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isChannelDropdownOpen]);

    // Status pill style per conversation matching Image 1
    function getStatusPill(conv) {
        const raw = (conv?.status || 'open').toLowerCase();
        const cId = (conv?.channel || ch?.id || '').toLowerCase();
        const isWA = cId !== 'instagram' && cId !== 'twilio';

        if (raw === 'open') {
            return isWA
                ? { label: 'Open', bg: '#09221a', color: '#25d366', border: '#14533e', dotColor: '#25d366', dotGlow: true }
                : { label: 'Open', bg: '#0e1e38', color: '#38bdf8', border: '#1d3d6e', dotColor: '#0ea5e9', dotGlow: true };
        }
        if (raw === 'follow_up' || raw === 'follow up') {
            return isWA
                ? { label: 'Follow Up', bg: '#09221a', color: '#25d366', border: '#14533e', dotColor: '#25d366', dotGlow: true }
                : { label: 'Follow Up', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)', dotColor: '#fbbf24', dotGlow: false };
        }
        if (raw === 'converted') {
            return { label: 'Converted', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', border: 'rgba(168,85,247,0.3)', dotColor: '#a855f7', dotGlow: false };
        }
        if (raw === 'closed') {
            return { label: 'Closed', bg: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: 'rgba(255,255,255,0.1)', dotColor: '#9ca3af', dotGlow: false };
        }
        return isWA
            ? { label: raw.charAt(0).toUpperCase() + raw.slice(1), bg: '#09221a', color: '#25d366', border: '#14533e', dotColor: '#25d366', dotGlow: false }
            : { label: raw.charAt(0).toUpperCase() + raw.slice(1), bg: '#0e1e38', color: '#38bdf8', border: '#1d3d6e', dotColor: '#0ea5e9', dotGlow: false };
    }

    // Authentic WhatsApp preview helper (Image 3: Camera icon + Photo, Mic + Voice message)
    function renderLastMessagePreview(conv, text) {
        const raw = (text || '').trim();
        if (!raw) return <span className="text-zinc-500">No messages yet</span>;

        const isImage = /^\[?IMAGE\]?$/i.test(raw) || conv?.last_media_type === 'image' || (raw.includes('/temp_uploads/') && /\.(jpe?g|png|webp|gif)/i.test(raw));
        const isAudio = /^\[?(VOICE|AUDIO)\]?$/i.test(raw) || conv?.last_media_type === 'audio' || (raw.includes('/temp_uploads/') && /\.(ogg|webm|mp3|wav|m4a|opus)/i.test(raw));
        const isVideo = /^\[?VIDEO\]?$/i.test(raw) || conv?.last_media_type === 'video' || (raw.includes('/temp_uploads/') && /\.(mp4|mov)/i.test(raw));
        const isDoc = /^\[?DOCUMENT\]?$/i.test(raw) || conv?.last_media_type === 'document' || (raw.includes('/temp_uploads/') && /\.(pdf|docx?|zip)/i.test(raw));

        if (isImage) {
            return (
                <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Camera size={14} className="text-zinc-400 shrink-0 inline -mt-0.5" />
                    <span>Photo</span>
                </span>
            );
        }
        if (isAudio) {
            return (
                <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Mic size={14} className="text-zinc-400 shrink-0 inline -mt-0.5" />
                    <span>Voice message</span>
                </span>
            );
        }
        if (isVideo) {
            return (
                <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Video size={14} className="text-zinc-400 shrink-0 inline -mt-0.5" />
                    <span>Video</span>
                </span>
            );
        }
        if (isDoc) {
            return (
                <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
                    <FileText size={14} className="text-zinc-400 shrink-0 inline -mt-0.5" />
                    <span>Document</span>
                </span>
            );
        }

        return <span className="truncate">{raw}</span>;
    }

    const handleRefreshClick = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 700);
    };

    const orgName = currentUser?.workspace_name || ch.label || 'groww digitel';
    const orgInitials = orgName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'GD';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#10111A] select-none">
            {/* Header */}
            <div className="px-4 pt-3.5 pb-2.5 shrink-0 border-b border-white/[0.05]">
                {/* Top Header Row (Matching User Reference Image) */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Left: Inbox Title + Refresh Button */}
                    <div className="flex items-center gap-2.5">
                        <span className="text-[21px] font-bold text-white tracking-tight">Inbox</span>
                        <button
                            onClick={handleRefreshClick}
                            className={`p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer ${isRefreshing ? 'animate-spin text-white' : ''}`}
                            title="Refresh conversations"
                        >
                            <RefreshCw size={15} strokeWidth={2.2} />
                        </button>
                    </div>

                    {/* Right: Organisation Selector Dropdown Pill */}
                    <div className="relative" ref={channelDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsChannelDropdownOpen(prev => !prev)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#131424] hover:bg-[#1c1e34] active:scale-[0.97] border border-white/[0.14] hover:border-white/25 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-black/40 cursor-pointer select-none"
                            aria-expanded={isChannelDropdownOpen}
                            title="Select channel or organisation"
                        >
                            <div className="shrink-0 flex items-center justify-center">
                                {ch?.id === 'instagram' ? (
                                    <InstagramIcon size={21} />
                                ) : ch?.id === 'twilio' ? (
                                    <TwilioIcon size={21} />
                                ) : (
                                    <WhatsAppIcon size={21} />
                                )}
                            </div>
                            <span className="truncate max-w-[130px] text-[13px] font-semibold tracking-wide lowercase">
                                {ch?.label?.toLowerCase() || 'whatsapp'}
                            </span>
                            <ChevronDown
                                size={14}
                                strokeWidth={2.5}
                                className={`text-zinc-400 transition-transform duration-200 shrink-0 ${
                                    isChannelDropdownOpen ? 'rotate-180 text-white' : ''
                                }`}
                            />
                        </button>

                        <AnimatePresence>
                            {isChannelDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                    className="absolute right-0 top-full mt-2.5 w-[340px] sm:w-[350px] p-3.5 rounded-2xl bg-[#141525]/98 backdrop-blur-2xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 select-none origin-top-right"
                                >
                                    {/* Section 1: YOUR ORGANISATIONS */}
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">
                                        Your Organisations
                                    </div>
                                    <div className="p-3 rounded-xl bg-[#28224c]/90 border border-purple-500/35 flex items-center justify-between mb-3.5 shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="shrink-0 flex items-center justify-center">
                                                {orgName?.toLowerCase().includes('whatsapp') ? (
                                                    <WhatsAppIcon size={30} />
                                                ) : orgName?.toLowerCase().includes('instagram') ? (
                                                    <InstagramIcon size={30} />
                                                ) : orgName?.toLowerCase().includes('twilio') ? (
                                                    <TwilioIcon size={30} />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[#5338ed] flex items-center justify-center text-xs font-bold text-white shadow">
                                                        {orgInitials}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[13.5px] font-semibold text-white truncate lowercase">
                                                {orgName}
                                            </span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 ml-2">
                                            <Check size={14} className="text-purple-300" strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    {/* Section 2: CONNECTED CHANNELS */}
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">
                                        Connected Channels
                                    </div>
                                    <div className="space-y-2">
                                        {/* WhatsApp Channel */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (setCh) setCh(CHANNELS.find(c => c.id === 'whatsapp') || CHANNELS[0]);
                                                setIsChannelDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                                                ch?.id === 'whatsapp'
                                                    ? 'bg-emerald-500/15 border border-emerald-500/35 ring-1 ring-emerald-500/25'
                                                    : 'hover:bg-white/[0.06] border border-transparent'
                                            }`}
                                        >
                                            <div className="shrink-0 flex items-center justify-center drop-shadow-md">
                                                <WhatsAppIcon size={36} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13.5px] font-semibold text-white truncate flex items-center justify-between">
                                                    <span>WhatsApp</span>
                                                    {ch?.id === 'whatsapp' && (
                                                        <span className="text-[10.5px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                                                    )}
                                                </div>
                                                {isWhatsAppConnected ? (
                                                    <div className="text-[11.5px] text-emerald-400 font-medium flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                        Connected
                                                    </div>
                                                ) : (
                                                    <div className="text-[11.5px] text-zinc-400 font-normal flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                                                        Not Connected
                                                    </div>
                                                )}
                                            </div>
                                        </button>

                                        {/* Instagram Channel */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (setCh) setCh(CHANNELS.find(c => c.id === 'instagram') || CHANNELS[1]);
                                                setIsChannelDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                                                ch?.id === 'instagram'
                                                    ? 'bg-pink-500/15 border border-pink-500/35 ring-1 ring-pink-500/25'
                                                    : 'hover:bg-white/[0.06] border border-transparent'
                                            }`}
                                        >
                                            <div className="shrink-0 flex items-center justify-center drop-shadow-md">
                                                <InstagramIcon size={36} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13.5px] font-semibold text-white truncate flex items-center justify-between">
                                                    <span>Instagram</span>
                                                    {ch?.id === 'instagram' && (
                                                        <span className="text-[10.5px] font-semibold text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded-full">Active</span>
                                                    )}
                                                </div>
                                                {isInstagramConnected ? (
                                                    <div className="text-[11.5px] text-pink-400 font-medium flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shadow-[0_0_8px_rgba(244,114,182,0.8)]" />
                                                        Connected
                                                    </div>
                                                ) : (
                                                    <div className="text-[11.5px] text-zinc-400 font-normal flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                                                        Not Connected
                                                    </div>
                                                )}
                                            </div>
                                        </button>

                                        {/* Twilio SMS Channel */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (setCh) setCh(CHANNELS.find(c => c.id === 'twilio') || CHANNELS[2]);
                                                setIsChannelDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                                                ch?.id === 'twilio'
                                                    ? 'bg-red-500/15 border border-red-500/35 ring-1 ring-red-500/25'
                                                    : 'hover:bg-white/[0.06] border border-transparent'
                                            }`}
                                        >
                                            <div className="shrink-0 flex items-center justify-center drop-shadow-md">
                                                <TwilioIcon size={36} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13.5px] font-semibold text-white truncate flex items-center justify-between">
                                                    <span>Twilio SMS</span>
                                                    {ch?.id === 'twilio' && (
                                                        <span className="text-[10.5px] font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Active</span>
                                                    )}
                                                </div>
                                                {isTwilioConnected ? (
                                                    <div className="text-[11.5px] text-red-400 font-medium flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                                        Connected
                                                    </div>
                                                ) : (
                                                    <div className="text-[11.5px] text-zinc-400 font-normal flex items-center gap-1.5 truncate mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                                                        Not Connected
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Search Bar Row with Purple Compose Button (Matching User Reference Image) */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={2.2} />
                        <input
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-3.5 rounded-xl text-[12.5px] text-white placeholder:text-zinc-500 outline-none border transition-colors focus:border-purple-500/50 bg-[#141522] border-white/[0.08]"
                        />
                    </div>

                    {/* Compose Button (Opens New Chat modal) */}
                    <button
                        type="button"
                        onClick={onOpenNewChat}
                        className="w-10 h-10 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center text-white shadow-md shadow-purple-900/30 transition-transform active:scale-95 shrink-0 cursor-pointer"
                        title="New chat"
                    >
                        <MessageSquarePlus size={19} strokeWidth={2} className="text-white" />
                    </button>
                </div>

                {/* Segmented Filter Bar (All, Open, Follow Up, Converted) */}
                <div className="w-full bg-[#141522] border border-white/[0.09] p-1 rounded-full mb-3 flex items-center justify-between gap-0.5 sm:gap-1 shadow-sm">
                    {STATUS_FILTERS.map((filter, idx) => {
                        const isActive = activeFilter === idx;
                        const count = filterCounts[filter.countKey] ?? 0;

                        return (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => onFilterChange(idx)}
                                className={`flex-1 h-[34px] sm:h-[36px] px-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                                    isActive
                                        ? 'bg-[#8b5cf6] text-white font-semibold shadow-sm shadow-purple-900/30'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                                }`}
                            >
                                <span className="whitespace-nowrap">{filter.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`text-[10.5px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold shrink-0 transition-colors ${
                                            isActive
                                                ? 'bg-white/25 text-white'
                                                : 'bg-black/70 text-zinc-300 border border-white/10'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>



            {/* Conversation list */}
            <div ref={containerRef} className="flex-1 overflow-y-auto py-3 px-3 space-y-2.5 custom-scrollbar">
                {filtered.length === 0 && (
                    isRefreshing ? (
                        <div className="flex flex-col items-center justify-center mt-20 gap-3.5">
                            <RazorpaySpinner size={42} />
                            <p className="text-center text-purple-300/80 text-[12px] font-medium tracking-wide">
                                Syncing conversations...
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center mt-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                <Inbox size={20} className="text-zinc-600" />
                            </div>
                            <p className="text-center text-zinc-400 text-[13px] font-medium">
                                No conversations found
                            </p>
                            <p className="text-center text-zinc-600 text-[11px]">
                                All caught up! ✨
                            </p>
                        </div>
                    )
                )}

                {filtered.map((l) => {
                    const sel = lead?.id === l.id;
                    const displayName = getDisplayName(l, ch.id);
                    const avatarText = getAvatarText(l, ch.id);
                    const convChannel = CHANNELS.find(c => c.id === (l.channel?.toLowerCase() || ch.id)) || ch;
                    const lastMsgText = lastMessageMap[l.id] || l.last_message || l.preview || l.last_message_text || 'Hello';
                    const unreadCount = unreadCounts[l.id] !== undefined ? unreadCounts[l.id] : (l.unread_count || l.unread || 0);
                    const pill = getStatusPill(l);
                    const timeStr = formatConvTime(l.last_message_at || l.updated_at || l.created_at) || 'Yesterday';

                    return (
                        <button
                            key={l.id}
                            data-active={sel}
                            onClick={() => onLeadSelect(l)}
                            className={`w-full p-3.5 sm:p-4 rounded-2xl text-left transition-all group relative border ${
                                sel
                                    ? 'bg-[#0d1c17]/85 border-[#25D366]/40 shadow-md ring-1 ring-[#25D366]/20'
                                    : 'bg-[#13141f]/70 border-transparent hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start gap-3.5">
                                {/* Avatar matching Image 1 Color Palette: #128C7E to #25D366 */}
                                <div className="relative shrink-0 mt-0.5">
                                    {(() => {
                                        const cId = (l.channel || ch.id || '').toLowerCase();
                                        const bgCol = cId === 'instagram'
                                            ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                                            : cId === 'twilio'
                                                ? 'bg-[#ef4444]'
                                                : 'bg-gradient-to-br from-[#128C7E] to-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.4)]';
                                        return (
                                            <div
                                                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-[15px] sm:text-[16px] font-bold text-white overflow-hidden ${bgCol}`}
                                            >
                                                {cId === 'instagram' && l.profile_pic ? (
                                                    <ProfilePic src={l.profile_pic} alt={displayName} fallbackText={avatarText} color="#9333ea" />
                                                ) : (
                                                    <span>{avatarText}</span>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Bottom Right Channel Badge */}
                                    <div
                                        className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full border-2 border-[#12131d] shadow-md flex items-center justify-center overflow-hidden z-20 bg-transparent"
                                        title={l.channel || ch.id}
                                    >
                                        <ChannelIcon channel={l.channel || ch} size={18} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Line 1: Name + Time */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[15px] sm:text-[15.5px] font-semibold truncate leading-tight ${sel ? 'text-white' : 'text-zinc-100'}`}>
                                            {displayName}
                                        </span>
                                        <span className="text-[12px] text-zinc-400 shrink-0 ml-2 tabular-nums">
                                            {timeStr}
                                        </span>
                                    </div>

                                    {/* Line 2: Message preview (matching Image 3: Camera icon + Photo, Mic + Voice message) */}
                                    <div className="text-[13px] text-zinc-400 truncate leading-relaxed mb-2.5">
                                        {renderLastMessagePreview(l, lastMsgText)}
                                    </div>

                                    {/* Line 3: Status Pill (• Open) matching Image 1 + Unread Badge */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-0.5 rounded-full border leading-tight shadow-sm"
                                            style={{
                                                backgroundColor: pill.bg,
                                                borderColor: pill.border,
                                                color: pill.color
                                            }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{
                                                    backgroundColor: pill.dotColor,
                                                    boxShadow: pill.dotGlow ? `0 0 6px ${pill.dotColor}` : 'none'
                                                }}
                                            />
                                            {pill.label}
                                        </span>

                                        {unreadCount > 0 && (
                                            <div className="ml-auto">
                                                <UnreadBadge count={unreadCount} channel={convChannel} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}

                {/* End of list label */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <div className="h-px bg-zinc-800 flex-1" />
                        <span className="text-[9.5px] text-zinc-600 font-semibold tracking-widest uppercase">
                            End of list
                        </span>
                        <div className="h-px bg-zinc-800 flex-1" />
                    </div>
                )}
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

function InfoPanel({ ch, lead, onBack, showBackButton = false, resolvedLeadId, messages, onCloseConversation, onConvertClick, leadDetail, setLeadDetail, activeFilter }) {
    const isInstagram = (ch?.id || lead?.channel || '').toLowerCase() === 'instagram';
    const stats = getConversationStats(lead, messages);
    const isClosed =
        lead?.status?.toUpperCase() === 'CLOSED' ||
        leadDetail?.status === 'closed';

    const isConverted =
        (!isClosed && (
            lead?.status?.toUpperCase() === 'CONVERTED' ||
            leadDetail?.is_converted === true ||
            leadDetail?.status === 'converted' ||
            lead?.is_converted === true
        ));

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
                    <p className="text-[16px] font-normal text-white/90 tracking-widest mb-8">Contact Details</p>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold shrink-0"
                            style={{ backgroundColor: '#1e1e1e' }}>
                            {isInstagram && lead.profile_pic ? (
                                <ProfilePic src={lead.profile_pic} alt={getDisplayName(lead, ch?.id)} fallbackText={getAvatarText(lead, ch?.id)} color={ch?.color || '#5bb81d'} />
                            ) : (
                                <span style={{ color: ch?.color || '#5bb81d' }}>{getAvatarText(lead, ch?.id)}</span>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[15px] font-semibold text-white truncate">
                                {getDisplayName(lead, ch?.id)}
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
                                const t = SYSTEM_TIERS[String(tier || 'cold').toLowerCase()] || SYSTEM_TIERS.cold;
                                return (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${t?.bg || ''} ${t?.border || ''} ${t?.textCls || ''}`}>
                                        {t?.text || 'Cold'}
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
                            {Object.keys(AGENT_LABELS || {}).map(lblKey => {
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
                        <p className="text-[16px] font-normal text-white/90 tracking-wider mb-3 mt-10">Conversation Info</p>
                        {[
                            ['First Contact', stats?.firstContact || '—'],
                            ['Last Contact', stats?.lastContact || '—'],
                            ['Total Messages', stats?.totalMessages ?? 0],
                            ['Status', <span key="status" style={{ color: ch?.color || '#22c55e' }}>{stats?.status || 'Open'}</span>],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-[13px] text-white/70 font-medium">{label}</span>
                                <span className="text-[13px] text-white/70 font-medium">{value}</span>
                            </div>
                        ))}
                    </div>

                    {!isConverted && (
                        <div>
                            <p className="text-[16px] font-normal text-white/90 tracking-wider mb-4 mt-10">Quick Actions</p>
                            <div className="space-y-2">
                                <button
                                    onClick={onConvertClick}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] border text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                                    style={{ backgroundColor: 'rgba(16,185,129,0.05)' }}>
                                    <Check size={15} strokeWidth={2} />
                                    Convert Conversation
                                </button>
                                {!isClosed && (
                                    <button
                                        onClick={() => onCloseConversation && onCloseConversation(lead?.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer"
                                        style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                                        <XCircle size={15} strokeWidth={2} />
                                        Close Conversation
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


function EmptyConversationView({ ch, onNewChat }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full relative overflow-hidden bg-[#0c0d14] select-none p-6 text-center">
            {/* Ambient Animated Radial Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.18, 1],
                    opacity: [0.18, 0.32, 0.18],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-purple-600/30 via-pink-600/20 to-emerald-500/20 blur-[110px] pointer-events-none"
            />
            {/* Subtle background grid dots */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

            {/* Central Animated Badge Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex flex-col items-center max-w-[480px]"
            >
                {/* Floating Icon Orb */}
                <div className="relative mb-6">
                    {/* Pulsing Outer Aura */}
                    <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.05, 0.35] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-3 rounded-[32px] bg-gradient-to-tr from-purple-500/30 via-pink-500/20 to-emerald-500/30 blur-md pointer-events-none"
                    />

                    {/* Central Glassmorphic Card */}
                    <motion.div
                        animate={{ y: [0, -7, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] border border-white/[0.15] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex items-center justify-center relative group"
                    >
                        <MessageSquare size={34} className="text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]" strokeWidth={1.8} />

                        {/* Floating Micro Badge: WhatsApp */}
                        <motion.div
                            animate={{ y: [0, -4, 0], rotate: [-2, 4, -2] }}
                            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                            className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full border-2 border-[#0c0d14] shadow-lg flex items-center justify-center overflow-hidden bg-[#10111a]"
                            title="WhatsApp"
                        >
                            <WhatsAppIcon size={24} />
                        </motion.div>

                        {/* Floating Micro Badge: Instagram */}
                        <motion.div
                            animate={{ y: [0, 5, 0], rotate: [3, -3, 3] }}
                            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                            className="absolute -bottom-2.5 -left-2.5 w-8 h-8 rounded-full border-2 border-[#0c0d14] shadow-lg flex items-center justify-center overflow-hidden bg-[#10111a]"
                            title="Instagram"
                        >
                            <InstagramIcon size={24} />
                        </motion.div>

                        {/* Sparkle Accent */}
                        <motion.div
                            animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-1 -right-1 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]"
                        >
                            <Sparkles size={16} />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Heading & Description */}
                <motion.h3
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="text-[19px] sm:text-[22px] font-bold text-white tracking-tight mb-2"
                >
                    Live Inbox Ready
                </motion.h3>

                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="text-[13px] sm:text-[13.5px] text-zinc-400 leading-relaxed mb-6 font-normal"
                >
                    Select an active customer conversation from the left sidebar or start a new chat to begin messaging.
                </motion.p>

                {/* Live Real-time Status Beacon */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 shadow-sm"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[11.5px] font-medium text-emerald-300 tracking-wide">
                        Listening for incoming live messages
                    </span>
                </motion.div>

                {/* Quick Action Button: New Chat */}
                {onNewChat && (
                    <motion.button
                        type="button"
                        onClick={onNewChat}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-[13px] shadow-lg shadow-purple-950/50 mb-7 cursor-pointer transition-all border border-purple-400/30"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Start New Conversation</span>
                    </motion.button>
                )}

                {/* Supported Channels Pill Row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/[0.07] w-full"
                >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11.5px] text-zinc-300">
                        <WhatsAppIcon size={14} />
                        <span>WhatsApp Cloud API</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11.5px] text-zinc-300">
                        <InstagramIcon size={14} />
                        <span>Instagram Direct</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11.5px] text-zinc-300">
                        <TwilioIcon size={14} />
                        <span>Twilio SMS</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

function ChatArea({
    ch, lead, messages = [], msg, setMsg, aiSuggestion, sendMessage,
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
    currentUser,
    onNewChat,
    onSendVoiceNote,
    showTemplateModal: externalShowTemplateModal,
    setShowTemplateModal: externalSetShowTemplateModal,
}) {
    const ref = useRef(null);
    const messagesContainerRef = useRef(null);
    const activeChannel = (lead?.channel || ch?.id || 'whatsapp').toLowerCase();
    const isInstagram = activeChannel === 'instagram';
    const isWhatsApp = activeChannel === 'whatsapp';
    const [unreadScrolledCount, setUnreadScrolledCount] = useState(0);
    const prevMessagesLenRef = useRef(messages.length);
    const prevOldestIdRef = useRef(messages[0]?.id);
    const prevLatestIdRef = useRef(messages[messages.length - 1]?.id);

    // Voice message recording states
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    const startVoiceRecording = async () => {
        try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                alert('Microphone recording is not supported in this browser.');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg; codecs=opus'))
                ? 'audio/ogg; codecs=opus'
                : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4'))
                    ? 'audio/mp4'
                    : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm; codecs=opus'))
                        ? 'audio/webm; codecs=opus'
                        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm'))
                            ? 'audio/webm'
                            : '';
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.start(100);
            setIsRecordingVoice(true);
            setRecordingDuration(0);

            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone error:', err);
            alert('Microphone permission is required to record voice messages.');
        }
    };

    const cancelVoiceRecording = () => {
        if (mediaRecorderRef.current) {
            try {
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
            } catch (e) {}
            mediaRecorderRef.current = null;
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        audioChunksRef.current = [];
        setIsRecordingVoice(false);
        setRecordingDuration(0);
    };

    const sendVoiceRecording = () => {
        if (!mediaRecorderRef.current) return;
        const recorder = mediaRecorderRef.current;

        recorder.onstop = () => {
            try {
                const mimeType = recorder.mimeType || 'audio/ogg';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
                const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });

                if (typeof onSendVoiceNote === 'function') {
                    onSendVoiceNote(audioFile);
                }
            } catch (err) {
                console.error('Failed to create voice note file:', err);
            } finally {
                audioChunksRef.current = [];
                setIsRecordingVoice(false);
                setRecordingDuration(0);
            }
        };

        try {
            recorder.stream.getTracks().forEach(t => t.stop());
            if (recorder.state !== 'inactive') recorder.stop();
        } catch (e) {}
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (mediaRecorderRef.current) {
                try {
                    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                } catch (e) {}
            }
        };
    }, []);

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

    const [isScrolledUp, setIsScrolledUp] = useState(false);

    const handleScroll = async (e) => {
        const container = e.currentTarget;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setIsScrolledUp(distanceFromBottom > 140);

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

    const [internalShowTemplateModal, setInternalShowTemplateModal] = useState(false);
    const showTemplateModal = externalShowTemplateModal !== undefined ? externalShowTemplateModal : internalShowTemplateModal;
    const setShowTemplateModal = externalSetShowTemplateModal || setInternalShowTemplateModal;
    const [isRingHovered, setIsRingHovered] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isWhatsApp || !lastUserActivity) return;
        const timeout = setTimeout(() => setNow(Date.now()), 0);
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => { clearTimeout(timeout); clearInterval(interval); };
    }, [isWhatsApp, lastUserActivity]);

    const { whatsAppWindowState, whatsAppWindowRemaining, windowPercentRemaining, formattedTooltip } = useMemo(() => {
        if (!isWhatsApp) {
            return {
                whatsAppWindowState: 'window_open',
                whatsAppWindowRemaining: '',
                windowPercentRemaining: 100,
                formattedTooltip: ''
            };
        }
        if (!hasIncomingMessage || !lastUserActivity) {
            return {
                whatsAppWindowState: 'awaiting_reply',
                whatsAppWindowRemaining: '',
                windowPercentRemaining: 0,
                formattedTooltip: "Customer hasn't messaged yet"
            };
        }
        const totalMs = 24 * 60 * 60 * 1000;
        const diffMs = totalMs - (now - lastUserActivity.getTime());
        if (diffMs > 0) {
            const diffHrs = Math.floor(diffMs / (60 * 60 * 1000));
            const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
            const remaining = diffHrs > 0 ? `${diffHrs}h ${diffMins}m remaining` : `${diffMins}m remaining`;
            const tooltip = `${diffHrs}h ${diffMins}m left in the 24-hour WhatsApp messaging window`;
            const percent = Math.max(0, Math.min(100, (diffMs / totalMs) * 100));
            return {
                whatsAppWindowState: 'window_open',
                whatsAppWindowRemaining: remaining,
                windowPercentRemaining: percent,
                formattedTooltip: tooltip
            };
        }
        return {
            whatsAppWindowState: 'window_closed',
            whatsAppWindowRemaining: '0m remaining',
            windowPercentRemaining: 0,
            formattedTooltip: '24-hour WhatsApp messaging window closed'
        };
    }, [isWhatsApp, hasIncomingMessage, lastUserActivity, now]);

    const isWindowOpen = !isWhatsApp || whatsAppWindowState === 'window_open';

    const [composerMode, setComposerMode] = useState('respond');
    const [isAiOn, setIsAiOn] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    if (!lead) {
        return <EmptyConversationView ch={ch} onNewChat={onNewChat} />;
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isInstagram ? 'bg-black' : 'bg-[#0c0d14]'} relative select-none`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-2.5 border-b shrink-0 relative z-30 ${
                isInstagram ? 'bg-black border-white/[0.08]' : 'bg-[#10111A] border-white/[0.07]'
            }`}>
                {/* Left: Contact Info */}
                <div className="flex items-center gap-3 min-w-0">
                    {showMobileBackButton && (
                        <button onClick={onBackToList} className="p-1.5 rounded-lg text-zinc-400 hover:text-white">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {/* Avatar with WhatsApp / Channel Badge */}
                    <div className="relative shrink-0">
                        <div
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[14px] sm:text-[15px] font-bold text-white overflow-hidden shadow-sm ${
                                isInstagram
                                    ? 'p-[2px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-md shadow-pink-900/20'
                                    : 'bg-gradient-to-br from-[#128C7E] to-[#25D366] shadow-[0_0_18px_rgba(37,211,102,0.35)]'
                            }`}
                        >
                            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${isInstagram ? 'bg-[#14151a]' : ''}`}>
                                {isInstagram && lead.profile_pic ? (
                                    <ProfilePic src={lead.profile_pic} alt={getDisplayName(lead, ch.id)} fallbackText={getAvatarText(lead, ch.id)} color="#c13584" />
                                ) : (
                                    <span>{getAvatarText(lead, ch.id)}</span>
                                )}
                            </div>
                        </div>
                        {/* Channel Badge bottom-right */}
                        <div className={`absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-sm z-20 ${
                            isInstagram ? 'border-black bg-black' : 'border-[#10111A] bg-transparent'
                        }`}>
                            <ChannelIcon channel={lead.channel || ch} size={18} />
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-[15px] sm:text-[16px] font-bold text-white truncate leading-tight">
                                {getDisplayName(lead, ch.id)}
                            </h3>
                            {lead.phone && (
                                <span className="text-[12.5px] text-zinc-400 font-normal">
                                    {lead.phone}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[12px] text-zinc-400 truncate">
                                {(() => {
                                    const activeText = formatActiveTime(lastUserActivity);
                                    if (activeText === 'Online') {
                                        return <span className="text-emerald-400 font-medium">● Online</span>;
                                    }
                                    return <span>Last active {activeText.replace(/^Active\s*/i, '') || '9:07 PM'}</span>;
                                })()}
                            </span>
                        </div>

                        {/* Channel Pill below Name */}
                        <div className="flex items-center gap-1 mt-1">
                            {isInstagram ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                                    Instagram DM
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {lead.channel_title || currentUser?.workspace_name || ch.label || 'Groww Digital'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* 24-Hour WhatsApp Gateway Countdown Ring (Images 3, 4, 5) */}
                    {isWhatsApp && (
                        <div
                            className="relative z-50 flex items-center justify-center p-1 cursor-pointer"
                            onMouseEnter={() => setIsRingHovered(true)}
                            onMouseLeave={() => setIsRingHovered(false)}
                        >
                            {/* SVG circular progress ring matching Images 3 & 5 */}
                            <svg className="w-[20px] h-[20px] -rotate-90 transform" viewBox="0 0 20 20">
                                {/* Dark background track */}
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="7.5"
                                    fill="none"
                                    stroke="#232634"
                                    strokeWidth="2.4"
                                />
                                {/* Dynamic Green Progress Arc */}
                                {whatsAppWindowState === 'window_open' && (
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r="7.5"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2.4"
                                        strokeDasharray={47.124}
                                        strokeDashoffset={47.124 * (1 - windowPercentRemaining / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-500 ease-linear"
                                    />
                                )}
                            </svg>

                            {/* Floating Tooltip matching Image 4 - Solid backdrop & high z-index */}
                            {isRingHovered && (
                                <div className="absolute top-full right-0 mt-2 z-[9999] pointer-events-none whitespace-nowrap px-3.5 py-1.5 rounded-lg bg-[#0e1017] border border-white/20 text-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.95)] text-[12px] font-medium backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                                    <span>{formattedTooltip}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Star Button */}
                    <button
                        type="button"
                        onClick={() => setIsFavorite(prev => !prev)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-white/5 hover:border-white/10 ${
                            isFavorite ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-white'
                        }`}
                        title="Star conversation"
                    >
                        <Star size={15} className={isFavorite ? 'fill-amber-400' : ''} />
                    </button>

                    {/* Phone / Call Button */}
                    {lead.phone && (
                        <a
                            href={`tel:${lead.phone}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-colors"
                            title={`Call ${lead.phone}`}
                        >
                            <Phone size={15} />
                        </a>
                    )}

                    {/* Template Button matching Image 2 */}
                    {isWhatsApp && (
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#222433] text-zinc-300 hover:text-white border border-white/10 text-[12.5px] font-medium transition-colors cursor-pointer shadow-sm active:scale-95"
                            title="Send WhatsApp Template"
                        >
                            Template
                        </button>
                    )}

                    {/* Info Button to toggle side drawer */}
                    <button
                        onClick={onInfoClick}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 border ${
                            infoActive
                                ? 'bg-[#7c3aed]/20 text-[#c084fc] border-[#7c3aed]/40 shadow-sm shadow-purple-900/20'
                                : 'bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-white border-white/5 hover:border-white/10'
                        }`}
                        title="Contact Information"
                        aria-label="Toggle details sidebar"
                    >
                        <Info size={15} />
                    </button>
                </div>
            </div>

            {/* Messages Area with Authentic Plain Black for Instagram */}
            <div className={`flex-1 relative overflow-hidden ${isInstagram ? 'bg-black' : 'bg-[#0b141a]'}`}>
                {/* Fixed WhatsApp Doodle Pattern Layer - EXCLUSIVELY for WhatsApp */}
                {!isInstagram && (
                    <div
                        className="pointer-events-none absolute inset-0 bg-[url('/images/WABackGround.webp')] bg-repeat bg-[length:520px_auto] opacity-50"
                        aria-hidden="true"
                    />
                )}

                {/* Scrollable Messages Container */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-20 py-6 custom-scrollbar z-10"
                >
                    <div className="w-full max-w-[960px] mx-auto relative z-10">
                        {isLoadingOlder && (
                            <div className="flex items-center justify-center py-3">
                                <RazorpaySpinner size={26} />
                            </div>
                        )}

                    {/* Chat Messages */}
                    {messagesWithSeparators.map((item, idx) => {
                        const m = item;
                        if (item._dateSeparator || m.content === 'Today') {
                            const label = item._dateSeparator ? item.label : 'Today';
                            return (
                                <div key={item.key || m.id} className="flex items-center justify-center my-4 select-none">
                                    {isInstagram ? (
                                        <span className="text-[11.5px] font-medium text-zinc-500 tracking-normal">
                                            {label}
                                        </span>
                                    ) : (
                                        <span className="text-[12px] font-medium text-[#8696a0] px-4 py-1.5 rounded-lg bg-[#182229] shadow-sm tracking-wide">
                                            {label}
                                        </span>
                                    )}
                                </div>
                            );
                        }

                        if (m.sender_type?.toLowerCase() === 'system' || m.content?.startsWith('Task ')) {
                            return (
                                <div key={m.id} className="flex items-center justify-center my-2.5">
                                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] text-[#8696a0] bg-[#182229] border border-white/[0.04] shadow-sm">
                                        <Check size={12} className="text-[#8696a0]" />
                                        <span>{m.content}</span>
                                    </div>
                                </div>
                            );
                        }

                        const isUser = m.sender_type?.toLowerCase() === 'user' || m.sender_type?.toLowerCase() === 'customer' || m.sender_type?.toLowerCase() === 'lead';
                        const isAI = m.sender_type?.toLowerCase() === 'ai';

                        let parsedMetadata = {};
                        try {
                            if (typeof m.metadata === 'string') parsedMetadata = JSON.parse(m.metadata);
                            else if (m.metadata && typeof m.metadata === 'object') parsedMetadata = m.metadata;
                            else if (typeof m.metadata_json === 'string') parsedMetadata = JSON.parse(m.metadata_json);
                        } catch {
                            parsedMetadata = {};
                        }

                        const messageDate = new Date(m.timestamp || m.created_at);
                        const timeStr = !isNaN(messageDate.getTime())
                            ? messageDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                            : '4:34 PM';

                        const mediaUrl = m.media_url || parsedMetadata.media_url || null;
                        const mediaType = (m.media_type || parsedMetadata.media_type || m.type || '').toLowerCase();
                        const mimeType = (m.mime_type || parsedMetadata.mime_type || '').toLowerCase();
                        const normalizedContent = (m.content || '').trim();
                        const isMediaPlaceholder = /^(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)$/i.test(normalizedContent.replace(/^\[|\]$/g, ''));
                        const displayContent = isMediaPlaceholder ? '' : m.content;

                        const isAudioMsg = Boolean(mediaUrl && (mediaType === 'audio' || mediaType === 'voice' || mimeType.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|opus|webm)(\?|$)/i.test(mediaUrl)));
                        const isVisualMedia = Boolean(mediaUrl && (mediaType === 'image' || mediaType === 'video' || /\.(jpe?g|png|gif|webp|svg|heic|mp4|webm|mov)(\?|$)/i.test(mediaUrl)));
                        const hasCaption = Boolean(displayContent && displayContent.trim());

                        let paddingClass = 'px-3.5 pt-2 pb-2.5';
                        if (isVisualMedia) {
                            paddingClass = hasCaption ? 'p-[3px] pb-1' : 'p-[3px]';
                        } else if (isAudioMsg) {
                            paddingClass = 'p-1';
                        }

                        const bubbleClass = isInstagram
                            ? isUser
                                ? `bg-[#262626] text-[#f5f5f5] rounded-[22px] rounded-bl-[4px] shadow-none ${isVisualMedia && !hasCaption ? 'p-[2px]' : isAudioMsg ? 'p-1' : 'px-4 py-2.5'}`
                                : `bg-gradient-to-r from-[#7026ed] via-[#b0269f] to-[#e02868] text-white rounded-[22px] rounded-br-[4px] shadow-md shadow-purple-950/20 ${isVisualMedia && !hasCaption ? 'p-[2px]' : isAudioMsg ? 'p-1' : 'px-4 py-2.5'}`
                            : isUser
                                ? `bg-[#202c33] text-[#e9edef] rounded-[8px] rounded-tl-[0px] ${paddingClass}`
                                : isWhatsApp
                                    ? `bg-[#005c4b] text-[#e9edef] rounded-[8px] rounded-tr-[0px] ${paddingClass}`
                                    : `bg-[#5839b2] text-[#e9edef] rounded-[8px] rounded-tr-[0px] ${paddingClass}`;

                        // Grouping and spacing between messages
                        const prevItem = idx > 0 ? messagesWithSeparators[idx - 1] : null;
                        const isPrevUser = prevItem && (prevItem.sender_type?.toLowerCase() === 'user' || prevItem.sender_type?.toLowerCase() === 'customer' || prevItem.sender_type?.toLowerCase() === 'lead');
                        const isDifferentSender = prevItem && !prevItem._dateSeparator && (isPrevUser !== isUser);
                        const spacingClass = isDifferentSender ? 'mt-3 mb-1' : 'my-1';

                        const timeNode = isInstagram ? (
                            <span className="inline-flex items-center float-right ml-3 mt-1.5 select-none shrink-0 align-bottom">
                                <span className={`text-[10px] leading-none ${isUser ? 'text-zinc-400' : 'text-white/75'}`}>{timeStr}</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 float-right ml-3.5 mt-1 -mb-0.5 select-none shrink-0 align-bottom">
                                <span className="text-[11px] text-[#8696a0] leading-none font-normal">{timeStr}</span>
                                {!isUser && (() => {
                                    const status = (m.status || '').toLowerCase();
                                    const isRead = status === 'read' || status === 'seen' || Boolean(m.is_read) || Boolean(m.read_at);
                                    const isDelivered = status === 'delivered' || Boolean(m.delivered_at);

                                    if (isRead) {
                                        // Double BLUE tick only when user has seen/read the message
                                        return (
                                            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="text-[#53bdeb] shrink-0 inline-block" title="Read">
                                                <path d="M11.05 0.75L4.85 7.15L2.05 4.35L0.95 5.45L4.85 9.35L12.15 1.85L11.05 0.75Z" fill="currentColor"/>
                                                <path d="M15.05 0.75L8.85 7.15L8.05 6.35L6.95 7.45L8.85 9.35L16.15 1.85L15.05 0.75Z" fill="currentColor"/>
                                            </svg>
                                        );
                                    }
                                    if (isDelivered) {
                                        // Double GRAY tick when delivered to device but not yet seen
                                        return (
                                            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="text-[#8696a0] shrink-0 inline-block" title="Delivered">
                                                <path d="M11.05 0.75L4.85 7.15L2.05 4.35L0.95 5.45L4.85 9.35L12.15 1.85L11.05 0.75Z" fill="currentColor"/>
                                                <path d="M15.05 0.75L8.85 7.15L8.05 6.35L6.95 7.45L8.85 9.35L16.15 1.85L15.05 0.75Z" fill="currentColor"/>
                                            </svg>
                                        );
                                    }
                                    // Single GRAY tick when sent
                                    return (
                                        <svg width="12" height="11" viewBox="0 0 12 11" fill="none" className="text-[#8696a0] shrink-0 inline-block" title="Sent">
                                            <path d="M11.05 0.75L4.85 7.15L2.05 4.35L0.95 5.45L4.85 9.35L12.15 1.85L11.05 0.75Z" fill="currentColor"/>
                                        </svg>
                                    );
                                })()}
                            </span>
                        );

                        return (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-end gap-2 ${isUser ? 'justify-start' : 'justify-end'} ${spacingClass}`}
                            >
                                {isInstagram && isUser && (
                                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-0.5 shadow-sm">
                                        {lead.profile_pic ? (
                                            <ProfilePic src={lead.profile_pic} alt="" fallbackText={getAvatarText(lead, 'instagram')} color="#c13584" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                {getAvatarText(lead, 'instagram')}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`w-fit max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[560px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${bubbleClass} relative group`}>
                                    <MessageRenderer
                                        content={displayContent}
                                        metadata={parsedMetadata}
                                        media_url={mediaUrl}
                                        media_type={mediaType}
                                        mime_type={mimeType}
                                        isMe={!isUser}
                                        theme={lead.channel ? { id: lead.channel } : ch}
                                        onPreviewMedia={setPreviewMedia}
                                        timeNode={timeNode}
                                    />

                                    {/* Reaction Emoji Badge (e.g. smile reaction attached to bottom-right of bubble) */}
                                    {parsedMetadata?.reaction && (
                                        <div className="absolute -bottom-2.5 right-3 px-2 py-0.5 rounded-full bg-[#202c33] border border-[#111b21] text-[13px] shadow-md select-none">
                                            {parsedMetadata.reaction}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={ref} />
                </div>

                {previewMedia && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewMedia(null)}>
                        {previewMedia.type === 'image' ? (
                            <img src={previewMedia.url} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl" alt="preview" />
                        ) : (
                            <video src={previewMedia.url} controls autoPlay onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl" />
                        )}
                    </div>
                )}

                {/* Floating Scroll Down Button like WhatsApp Web */}
                <AnimatePresence>
                    {isScrolledUp && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.85, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 10 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => {
                                messagesContainerRef.current?.scrollTo({
                                    top: messagesContainerRef.current.scrollHeight,
                                    behavior: 'smooth'
                                });
                                setIsScrolledUp(false);
                                setUnreadScrolledCount(0);
                            }}
                            className="absolute bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#202c33] hover:bg-[#2a3942] active:scale-95 text-[#8696a0] hover:text-[#e9edef] border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-pointer transition-colors"
                            title="Scroll to bottom"
                        >
                            <ChevronDown size={22} strokeWidth={2.2} />
                            {unreadScrolledCount > 0 && (
                                <span className="absolute -top-1.5 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-[#25D366] text-[#111b21] text-[10px] font-bold flex items-center justify-center shadow-md">
                                    {unreadScrolledCount}
                                </span>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
                </div>
            </div>

            {/* AI Suggestion Banner */}
            <AnimatePresence>
                {aiSuggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mx-4 mb-2 p-2.5 rounded-xl flex justify-between items-center border bg-purple-950/20 border-purple-500/30 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Sparkles size={13} className="text-purple-400 shrink-0" />
                            <p className="text-[12px] text-zinc-200 truncate">{aiSuggestion}</p>
                        </div>
                        <button onClick={useSuggestion} className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/40 transition shrink-0 ml-3">
                            Use
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Composer Container */}
            <div className={`px-4 pb-4 pt-2.5 shrink-0 border-t w-full ${
                isInstagram ? 'bg-black border-white/[0.08]' : 'bg-[#202c33] border-[#111b21]'
            }`}>
                <div className="w-full space-y-2">
                    {/* Active Template Badge if selected */}
                    {templateName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            <FileText size={12} />
                            <span>Active Template: <strong>{templateName}</strong></span>
                            <button onClick={() => { setTemplateName(null); setMsg(''); }} className="hover:text-white ml-1">
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Attachment preview if selected */}
                    {selectedFilePreview && (
                        <div className="p-2 px-3 rounded-xl bg-[#202c33] border border-white/10 inline-flex items-center gap-3 max-w-full shadow-lg mb-2">
                            {selectedFilePreview.type === 'image' && (
                                <img src={selectedFilePreview.url} alt="attachment" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-white/10" />
                            )}
                            {selectedFilePreview.type === 'video' && (
                                <div className="w-12 h-12 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white shrink-0 relative overflow-hidden">
                                    {selectedFilePreview.url ? (
                                        <video src={selectedFilePreview.url} className="w-full h-full object-cover" />
                                    ) : null}
                                    <Video size={16} className="absolute text-white drop-shadow" />
                                </div>
                            )}
                            {selectedFilePreview.type === 'audio' && (
                                <div className="w-12 h-12 rounded-lg bg-[#00a884]/20 border border-[#00a884]/30 flex items-center justify-center text-[#00a884] shrink-0">
                                    <Mic size={20} />
                                </div>
                            )}
                            {selectedFilePreview.type === 'document' && (
                                <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                                    <FileText size={20} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-[12.5px] text-white font-medium truncate max-w-[220px]">{selectedFilePreview.name}</p>
                                <p className="text-[10.5px] text-[#8696a0]">{selectedFilePreview.size}</p>
                            </div>
                            <button onClick={() => { setSelectedFile?.(null); setSelectedFilePreview?.(null); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* Main Input Box Container */}
                    <div className={`flex items-center gap-2.5 px-3 py-2 border transition-all min-h-[52px] w-full ${
                        isInstagram
                            ? 'rounded-full bg-[#1c1c1e] hover:bg-[#222225] border-white/10 focus-within:border-white/25 focus-within:ring-1 focus-within:ring-white/10'
                            : 'rounded-xl bg-[#2a3942] border-transparent focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 shadow-inner'
                    }`}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*,video/*,audio/*,application/pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {isRecordingVoice ? (
                            /* WhatsApp Live Voice Recording Mode */
                            <div className="flex-1 flex items-center justify-between gap-3 px-1 py-1">
                                <button
                                    type="button"
                                    onClick={cancelVoiceRecording}
                                    className="p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-white/5 transition-all cursor-pointer"
                                    title="Discard voice recording"
                                >
                                    <Trash2 size={18} strokeWidth={2.2} />
                                </button>

                                <div className="flex items-center gap-2.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[13.5px] font-mono font-medium text-white tracking-wide">
                                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                    </span>
                                    {/* Animated voice amplitude equalizer */}
                                    <div className="flex items-center gap-[2.5px] h-4 ml-1">
                                        {[10, 16, 7, 20, 12, 18, 9, 15].map((h, i) => (
                                            <span
                                                key={i}
                                                className="w-[2.5px] rounded-full bg-[#00a884] animate-pulse"
                                                style={{
                                                    height: `${h}px`,
                                                    animationDelay: `${i * 120}ms`,
                                                    animationDuration: '800ms'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={sendVoiceRecording}
                                    className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] flex items-center justify-center text-white shadow-md active:scale-95 transition-all cursor-pointer"
                                    title="Send voice note"
                                >
                                    <Send size={15} strokeWidth={2.2} />
                                </button>
                            </div>
                        ) : (
                            /* Standard Composer Mode */
                            <>
                                {/* Paperclip (Media / File upload) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isWindowOpen) {
                                            setShowTemplateModal(true);
                                            return;
                                        }
                                        fileInputRef.current?.click();
                                    }}
                                    className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                        !isWindowOpen
                                            ? 'text-zinc-500 opacity-30 pointer-events-none'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer'
                                    }`}
                                    title={!isWindowOpen ? "Window closed - start with a template" : "Attach image, video or audio"}
                                >
                                    <Paperclip size={18} strokeWidth={2.2} />
                                </button>

                                {/* Smiley (Emoji picker) */}
                                <div className="relative emoji-picker-container">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isWindowOpen) {
                                                setShowTemplateModal(true);
                                                return;
                                            }
                                            setShowEmojiPicker(prev => !prev);
                                        }}
                                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                            !isWindowOpen
                                                ? 'text-zinc-500 opacity-30 pointer-events-none'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer'
                                        }`}
                                        title={!isWindowOpen ? "Window closed - start with a template" : "Emoji"}
                                    >
                                        <Smile size={18} strokeWidth={2.2} />
                                    </button>

                                    {isWindowOpen && showEmojiPicker && (
                                        <div className="absolute bottom-[60px] left-0 z-[9999] w-[280px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#1c1c1f] shadow-2xl">
                                            <EmojiPicker
                                                onEmojiClick={(emojiData) => setMsg(prev => prev + emojiData.emoji)}
                                                theme="dark"
                                                lazyLoadEmojis
                                                width="100%"
                                                height={300}
                                                searchDisabled={false}
                                                skinTonesDisabled={false}
                                                previewConfig={{ showPreview: false }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Microphone (WhatsApp Voice Note Recorder) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isWindowOpen) {
                                            setShowTemplateModal(true);
                                            return;
                                        }
                                        startVoiceRecording();
                                    }}
                                    className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                        !isWindowOpen
                                            ? 'text-zinc-500 opacity-30 pointer-events-none'
                                            : 'text-zinc-400 hover:text-[#00a884] hover:bg-white/5 cursor-pointer'
                                    }`}
                                    title={!isWindowOpen ? "Window closed - start with a template" : "Record voice message"}
                                >
                                    <Mic size={18} strokeWidth={2.2} />
                                </button>

                                {/* Input Field */}
                                {!isWindowOpen ? (
                                    <div
                                        onClick={() => setShowTemplateModal(true)}
                                        className="flex-1 cursor-pointer flex items-center py-1.5 px-2 group"
                                        title="Click to start with a template"
                                    >
                                        <span className="text-[14px] text-zinc-500/70 select-none group-hover:text-zinc-400 transition-colors">
                                            {whatsAppWindowState === 'window_closed'
                                                ? "24-hour messaging window closed — start with a template"
                                                : "Customer hasn't messaged yet — start with a template"}
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        value={msg}
                                        onChange={(e) => setMsg(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder={selectedFilePreview ? "Add a caption..." : isInstagram ? "Message..." : "Type a message..."}
                                        disabled={isUploadingMedia}
                                        className="flex-1 bg-transparent text-[14.5px] text-white placeholder:text-zinc-500 outline-none px-2 font-normal"
                                    />
                                )}

                                {/* Send Button */}
                                {!isWindowOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateModal(true)}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] text-zinc-500 opacity-20 cursor-pointer hover:opacity-50 transition-all shrink-0"
                                        title="Start with a template"
                                    >
                                        <Send size={15} className="text-zinc-400" strokeWidth={2.2} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={sendMessage}
                                        disabled={isUploadingMedia || (!msg.trim() && !selectedFile)}
                                        className={`w-9 h-9 flex items-center justify-center text-white transition-all active:scale-95 shrink-0 ${
                                            isInstagram
                                                ? 'rounded-full bg-gradient-to-r from-[#7026ed] to-[#e02868] hover:opacity-90 shadow-md shadow-purple-950/40'
                                                : 'rounded-full bg-[#00a884] hover:bg-[#02906f] shadow-md shadow-emerald-950/40'
                                        } ${
                                            isUploadingMedia || (!msg.trim() && !selectedFile) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                        title="Send message"
                                    >
                                        {isUploadingMedia ? (
                                            <Loader2 size={16} className="animate-spin text-white" />
                                        ) : (
                                            <Send size={15} className="text-white" strokeWidth={2.2} />
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

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
    const { workspaces, workspaceId, user } = useAuth();
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
    const [filterCounts, setFilterCounts] = useState({ all: 0, open: 0, follow_up: 0, unread: 0, converted: 0, closed: 0 });

    const [channelStatuses, setChannelStatuses] = useState(() => {
        if (typeof window === 'undefined') return { whatsapp: false, instagram: false, twilio: false };
        return {
            whatsapp: localStorage.getItem("whatsapp_connected") === "true",
            instagram: false,
            twilio: false,
        };
    });

    useEffect(() => {
        const wsId = workspace?.id || workspaceId;
        if (!wsId) return;
        let isMounted = true;
        const loadChannelStatus = async () => {
            try {
                const data = await api.getIntegrationStatus(wsId);
                if (isMounted && data) {
                    setChannelStatuses({
                        whatsapp: Boolean(data?.whatsapp?.connected || data?.whatsapp === true),
                        instagram: Boolean(data?.instagram?.connected || data?.instagram === true),
                        twilio: Boolean(data?.twilio?.connected || data?.twilio === true),
                    });
                }
            } catch (err) {
                console.error("Failed to load channel status for inbox dropdown:", err);
            }
        };
        loadChannelStatus();
        const handleStatusChanged = () => loadChannelStatus();
        window.addEventListener('channel-status-changed', handleStatusChanged);
        return () => {
            isMounted = false;
            window.removeEventListener('channel-status-changed', handleStatusChanged);
        };
    }, [workspace?.id, workspaceId]);

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
    const [templateMediaUrl, setTemplateMediaUrl] = useState(null);
    const [templateMediaType, setTemplateMediaType] = useState(null);
    const [inboxTemplateMediaUrl, setInboxTemplateMediaUrl] = useState('');
    const [showTemplateSelect, setShowTemplateSelect] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [inboxTemplates, setInboxTemplates] = useState([]);
    const [selectedInboxTemplate, setSelectedInboxTemplate] = useState(null);
    const [inboxTemplateVariables, setInboxTemplateVariables] = useState({});
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');

    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeTargetId, setCloseTargetId] = useState(null);
    const [closingConversation, setClosingConversation] = useState(false);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);

    const leadRef = useRef(null);
    const lastProcessedIdRef = useRef(null);
    const initialMessagesLoadedRef = useRef({});

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
            const data = await api.getTemplates(workspace_id);
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
            setInboxTemplateMediaUrl(
                selectedInboxTemplate?.media_url
                || (selectedInboxTemplate?.header && (selectedInboxTemplate.header.startsWith('http://') || selectedInboxTemplate.header.startsWith('https://')) ? selectedInboxTemplate.header : '')
                || ''
            );
        } else {
            setInboxTemplateVariables({});
            setInboxTemplateMediaUrl('');
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
        setTemplateMediaUrl(
            inboxTemplateMediaUrl
            || selectedInboxTemplate.media_url
            || (selectedInboxTemplate.header && (selectedInboxTemplate.header.startsWith('http://') || selectedInboxTemplate.header.startsWith('https://')) ? selectedInboxTemplate.header : null)
        );
        setTemplateMediaType(selectedInboxTemplate.type || 'TEXT');
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
        const tplMediaParam = searchParams.get('media_url');
        const tplTypeParam = searchParams.get('template_type');

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
            if (tplMediaParam) setTemplateMediaUrl(tplMediaParam);
            if (tplTypeParam) setTemplateMediaType(tplTypeParam);
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

            const wasInitiallyLoaded = !!initialMessagesLoadedRef.current[id];
            let hasNewIncoming = false;

            data.forEach(m => {
                if (m.id && !isMessageAlreadyProcessed(m.id)) {
                    const sender = (m.sender_type || m.sender || '').toLowerCase();
                    const isOutbound = sender.includes('agent') || sender.includes('ai') || sender.includes('system') || m.direction === 'outbound';
                    const isInbound = sender.includes('user') || sender.includes('customer') || sender.includes('lead') || sender.includes('contact') || m.direction === 'inbound';
                    if (isInbound || (!isOutbound && !sender)) {
                        hasNewIncoming = true;
                    }
                    markMessageAsProcessed(m.id);
                }
            });

            if (wasInitiallyLoaded && hasNewIncoming) {
                console.log("🔔 Inbound message arrived via poll, playing notification sound");
                playNotificationSound();
            }

            initialMessagesLoadedRef.current[id] = true;

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
        // 0: All, 1: Open, 2: Follow Up, 3: Converted
        return STATUS_FILTERS[filterIdx]?.param || 'ALL';
    }, []);

    const fetchConversations = useCallback(async ({ selectFirst = false, statusOverride = null, filterIdx = null, reqId = null } = {}) => {
        if (!workspace?.id) return;
        const targetFilterIdx = filterIdx !== null ? filterIdx : activeFilterRef.current;
        const currentChannel = ch.id;
        const statusParam = statusOverride || getStatusParam(targetFilterIdx, currentChannel);

        const convUrl = `/api/conversations?workspace_id=${workspace.id}&channel=${currentChannel}&status=${statusParam}`;
        const countUrl = `/api/conversations/counts?workspace_id=${workspace.id}&channel=${currentChannel}`;

        try {
            const [data, counts] = await Promise.all([
                api.get(convUrl),
                api.get(countUrl).catch(() => null)
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
                    follow_up: counts.follow_up ?? 0,
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
            } else if (leadRef.current) {
                const currentId = leadRef.current.id;
                const currentPhone = String(leadRef.current.phone || leadRef.current.external_id || '').replace(/\D/g, '');

                const matched = uniqueData.find(item => {
                    if (item.id === currentId) return true;
                    if (currentPhone) {
                        const itemPhone = String(item.phone || item.external_id || '').replace(/\D/g, '');
                        if (itemPhone && itemPhone === currentPhone) return true;
                        if (currentPhone.length >= 10 && itemPhone.length >= 10 && currentPhone.slice(-10) === itemPhone.slice(-10)) return true;
                    }
                    return false;
                });

                if (matched) {
                    nextLead = matched;
                } else if (currentId && currentId.startsWith('whatsapp-')) {
                    // Pending new chat not yet saved on backend - KEEP IT and keep it at top of list
                    nextLead = leadRef.current;
                    if (!uniqueData.some(item => item.id === currentId)) {
                        uniqueData.unshift(leadRef.current);
                        setConversations([...uniqueData]);
                    }
                } else {
                    nextLead = selectFirst ? uniqueData[0] : (uniqueData.find(item => item.id === currentId) || uniqueData[0]);
                }
            } else {
                nextLead = selectFirst ? uniqueData[0] : (uniqueData[0] || null);
            }

            setLead(nextLead);
            leadRef.current = nextLead;
            if (nextLead && !String(nextLead.id).startsWith('whatsapp-')) {
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
        setActiveFilter(0);
        activeFilterRef.current = 0;
        reqIdRef.current += 1;
        const currentReqId = reqIdRef.current;
        setLead(null);
        setResolvedLeadId(null);
        leadRef.current = null;
        setMessages([]);
        setConversations([]);
        fetchConversations({ filterIdx: 0, selectFirst: true, reqId: currentReqId });
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

        // Instantly trigger sent sound for crisp zero-latency feedback
        playSentSound();

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
                    media_url: templateMediaUrl || (uploadedMediaUrl || null),
                    header_url: templateMediaUrl || (uploadedMediaUrl || null),
                    template_type: templateMediaType || 'TEXT',
                };
            }

            const outgoingText = msg.trim() || (uploadedMediaUrl ? `[${(detectedMessageType || 'IMAGE').toUpperCase()}]` : '');
            const optimisticId = `local-${Date.now()}`;
            const optimisticMsg = {
                id: optimisticId,
                conversation_id: lead.id,
                content: outgoingText,
                sender_type: 'AGENT',
                status: 'SENT',
                timestamp: new Date().toISOString(),
                is_read: true,
                media_url: uploadedMediaUrl || null,
                media_type: detectedMessageType || null,
                mime_type: detectedMimeType || null,
                metadata: payload.metadata || {}
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setLastMessageMap(prev => ({ ...prev, [lead.id]: outgoingText }));
            setMsg('');
            setSelectedFile(null);
            setSelectedFilePreview(null);
            setTemplateName(null);
            setTemplateVariables([]);
            setTemplateLanguage('en_US');
            setTemplateMediaUrl(null);
            setTemplateMediaType(null);

            await api.post('/api/send-reply', payload);
        } catch (e) {
            if (e?.status === 401 || e?.isSessionExpired) {
                return;
            }
            console.error('Send error:', e);
            if (e.status === 503) {
                showToast("This channel isn't configured for this workspace yet. Please contact admin to set up channel credentials.");
            } else if (e?.data?.detail) {
                showToast(e.data.detail);
            } else if (e?.message) {
                showToast(e.message);
            } else {
                showToast("Failed to send message. Please try again.");
            }
        } finally {
            setIsUploadingMedia(false);
        }
    }

    async function sendVoiceNote(audioFile) {
        if (!audioFile || !lead || isUploadingMedia) return;
        setIsUploadingMedia(true);
        playSentSound();
        try {
            const formData = new FormData();
            formData.append('file', audioFile);
            const uploadRes = await api.post('/api/upload', formData);
            const uploadedUrl = uploadRes.url;
            const localBlobUrl = URL.createObjectURL(audioFile);
            const payload = {
                conversation_id: lead.id,
                message: '[VOICE]',
                metadata: {
                    media_url: uploadedUrl,
                    message_type: 'audio',
                    mime_type: audioFile.type || 'audio/ogg',
                }
            };
            const optimisticId = `local-${Date.now()}`;
            const optimisticMsg = {
                id: optimisticId,
                conversation_id: lead.id,
                content: '',
                sender_type: 'AGENT',
                status: 'SENT',
                timestamp: new Date().toISOString(),
                is_read: false,
                media_url: localBlobUrl || uploadedUrl,
                media_type: 'audio',
                mime_type: audioFile.type || 'audio/ogg',
                metadata: payload.metadata
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setLastMessageMap(prev => ({ ...prev, [lead.id]: '🎤 Voice message' }));
            setSelectedFile(null);
            setSelectedFilePreview(null);
            await api.post('/api/send-reply', payload);
        } catch (e) {
            console.error('Voice note send error:', e);
            showToast("Failed to send voice note. Please try again.");
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

            if (activeFilterRef.current === 0) {
                // If in "All" tab, update conversation status to CLOSED in place
                setConversations(prev => prev.map(c => c.id === closeTargetId ? { ...c, status: 'CLOSED' } : c));
                setLead(prev => prev?.id === closeTargetId ? { ...prev, status: 'CLOSED' } : prev);
            } else {
                // Remove from active tab list
                removeConversationFromList(closeTargetId);
            }
            setShowCloseModal(false);
            setCloseTargetId(null);
            showToast('Conversation closed');

            // Refresh filter counts so tab badges immediately reflect changes
            if (workspace?.id && ch?.id) {
                api.get(`/api/conversations/counts?workspace_id=${workspace.id}&channel=${ch.id}`)
                    .then(counts => {
                        if (counts && typeof counts === 'object') {
                            setFilterCounts({
                                all: counts.all ?? 0,
                                open: counts.open ?? 0,
                                follow_up: counts.follow_up ?? 0,
                                unread: counts.unread ?? 0,
                                converted: counts.converted ?? 0,
                                closed: counts.closed ?? 0,
                            });
                        }
                    })
                    .catch(() => {});
            }
        } catch (e) {
            console.error('Failed to close conversation:', e);
        } finally {
            setClosingConversation(false);
        }
    }

    function handleConvertSuccess() {
        setShowConvertModal(false);
        const targetConvertedIdx = 3; // "Resolved" tab

        // Switch to "Resolved" tab and refresh
        setActiveFilter(targetConvertedIdx);
        activeFilterRef.current = targetConvertedIdx;
        reqIdRef.current += 1;
        const currentReqId = reqIdRef.current;

        setConversations([]);
        setLead(null);
        setResolvedLeadId(null);
        setMessages([]);
        leadRef.current = null;

        fetchConversations({
            filterIdx: targetConvertedIdx,
            selectFirst: true,
            reqId: currentReqId,
        });

        // Also refresh counts so tab badges update
        if (workspace?.id && ch?.id) {
            api.get(`/api/conversations/counts?workspace_id=${workspace.id}&channel=${ch.id}`)
                .then(counts => {
                    if (counts && typeof counts === 'object') {
                        setFilterCounts({
                            all: counts.all ?? 0,
                            open: counts.open ?? 0,
                            follow_up: counts.follow_up ?? 0,
                            unread: counts.unread ?? 0,
                            converted: counts.converted ?? 0,
                            closed: counts.closed ?? 0,
                        });
                    }
                })
                .catch(() => {});
        }
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
        onNewChat: () => setIsNewChatOpen(true),
        onSendVoiceNote: sendVoiceNote,
        aiSuggestion, sendMessage, generateSuggestion, useSuggestion,
        previewMedia, setPreviewMedia,
        templateName, setTemplateName, setTemplateVariables, setTemplateLanguage,
        fetchInboxTemplates, setSelectedInboxTemplate,
        setTemplateSearchQuery, setShowTemplateSelect,
        showTemplateModal, setShowTemplateModal,
        workspace,
        selectedFile, setSelectedFile,
        selectedFilePreview, setSelectedFilePreview,
        isUploadingMedia,
        onLoadOlderMessages: loadOlderMessages,
        hasMoreMessages,
        isLoadingOlder,
        currentUser: user,
        onSendTemplateSuccess: (formattedContent, res) => handleSendTemplateSuccess(formattedContent, res),
    };

    const handleSendTemplateSuccess = useCallback((formattedContent, res) => {
        playSentSound();
        const realConvId = res?.conversation_id || (leadRef.current?.id && !leadRef.current?.id.startsWith('whatsapp-') ? leadRef.current.id : null);
        if (realConvId) {
            if (leadRef.current) {
                leadRef.current.id = realConvId;
                setLead(prev => prev ? { ...prev, id: realConvId } : prev);
            }
            fetchMessages(realConvId);
            fetchLeadIdForConversation(realConvId).then(id => setResolvedLeadId(id));
        } else if (leadRef.current?.id && !leadRef.current?.id.startsWith('whatsapp-')) {
            fetchMessages(leadRef.current.id);
        }
        fetchConversations({ selectFirst: false });
        setMessages(prev => [...prev, {
            id: 'temp-' + Date.now(),
            sender_type: 'agent',
            content: formattedContent,
            timestamp: new Date().toISOString(),
            status: 'sent',
        }]);
    }, [fetchMessages, fetchConversations, fetchLeadIdForConversation, playSentSound]);

    const infoPanelProps = {
        ch, lead,
        resolvedLeadId, messages,
        onCloseConversation: promptCloseConversation,
        onConvertClick: () => setShowConvertModal(true),
        leadDetail, setLeadDetail,
        activeFilter,
    };

    const handleStartNewChat = useCallback((fullPhoneNumber) => {
        let cleanDigits = String(fullPhoneNumber).replace(/\D/g, '');
        if (!cleanDigits) return;

        // Strip duplicate country codes (e.g. 91917695951519 -> 917695951519)
        if (cleanDigits.length === 14 && cleanDigits.startsWith('9191')) {
            cleanDigits = cleanDigits.slice(2);
        } else if (cleanDigits.length === 10) {
            cleanDigits = `91${cleanDigits}`;
        }

        // Ensure WhatsApp channel is selected
        const waCh = CHANNELS.find(c => c.id === 'whatsapp') || ch;
        if (ch?.id !== 'whatsapp') {
            setCh(waCh);
            channelRef.current = waCh;
        }

        // Switch screen view to chat for mobile and tablet
        setMobileView('chat');
        setTabletRight('chat');

        // Search strictly by phone digits (NEVER match by c.id)
        const existing = (conversations || []).find(c => {
            const pDigits = String(c.phone || c.external_id || '').replace(/\D/g, '');
            if (!pDigits) return false;
            if (pDigits === cleanDigits) return true;
            if (cleanDigits.length >= 10 && pDigits.length >= 10) {
                return cleanDigits.slice(-10) === pDigits.slice(-10);
            }
            return false;
        });

        if (existing) {
            setLead(existing);
            leadRef.current = existing;
            fetchMessages(existing.id);
            fetchLeadIdForConversation(existing.id).then(id => setResolvedLeadId(id));
            setShowTemplateModal(true);
            showToast(`Opened chat for ${getDisplayName(existing, 'whatsapp')}`);
            return;
        }

        // New conversation placeholder for this exact number
        const formattedDisplay = cleanDigits.startsWith('91') && cleanDigits.length === 12
            ? `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`
            : `+${cleanDigits}`;

        const newTarget = {
            id: `whatsapp-${cleanDigits}`,
            phone: cleanDigits,
            contact_name: formattedDisplay,
            name: formattedDisplay,
            channel: 'whatsapp',
            channel_title: 'Groww Digital',
            status: 'OPEN',
            last_message: 'Start conversation with template',
            last_message_at: new Date().toISOString(),
            unread_count: 0,
        };

        setConversations(prev => [
            newTarget,
            ...(prev || []).filter(c => {
                const p = String(c.phone || c.external_id || '').replace(/\D/g, '');
                return p !== cleanDigits && (cleanDigits.length >= 10 && p.length >= 10 ? cleanDigits.slice(-10) !== p.slice(-10) : true);
            })
        ]);
        setLead(newTarget);
        leadRef.current = newTarget;
        setMessages([]);

        // Directly open SendTemplateModal to send template to this exact number
        setShowTemplateModal(true);
        showToast(`Select and send an approved template to ${formattedDisplay}`);
    }, [conversations, ch, fetchMessages, showToast, fetchLeadIdForConversation]);

    const sidebarProps = {
        ch,
        setCh,
        conversations,
        lead,
        activeFilter,
        onFilterChange: handleFilterChange,
        filterCounts,
        unreadCounts,
        lastMessageMap,
        currentUser: user,
        channelStatuses,
        onOpenNewChat: () => setIsNewChatOpen(true),
    };

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden" style={{ backgroundColor: '#0c0d14', fontFamily: "'Poppins', sans-serif" }}>

            {/* DESKTOP (≥1024px) - Integrated 2-Column Edge-to-Edge Layout */}
            <div className="hidden lg:flex flex-1 overflow-hidden relative">
                {/* Left Column: Conversation Sidebar */}
                <div className="w-[360px] xl:w-[380px] shrink-0 h-full border-r border-white/[0.08] bg-[#10111A] flex flex-col overflow-hidden">
                    <ConversationSidebar
                        {...sidebarProps}
                        onLeadSelect={(l) => {
                            setLead(l);
                            leadRef.current = l;
                            fetchMessages(l.id);
                            setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                            api.post(`/api/conversations/${l.id}/read`).catch(() => {});
                            fetchLeadIdForConversation(l.id).then(id => setResolvedLeadId(id));
                        }}
                    />
                </div>

                {/* Right Column: Chat Area */}
                <div className={`flex-1 min-w-0 h-full flex flex-col overflow-hidden relative z-20 ${
                    ch.id === 'instagram' ? 'bg-black' : 'bg-[#0c0d14]'
                }`}>
                    <ChatArea
                        {...chatAreaProps}
                        onInfoClick={() => setDesktopDrawerOpen(prev => !prev)}
                        infoActive={desktopDrawerOpen}
                        showMobileBackButton={false}
                    />
                </div>

                {/* Slide-over Drawer for Contact / Lead Details */}
                <AnimatePresence>
                    {desktopDrawerOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setDesktopDrawerOpen(false)}
                                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                                className="fixed top-0 right-0 bottom-0 z-[90] w-[420px] max-w-[92vw] h-full flex flex-col bg-[#12131D] border-l border-white/[0.08] shadow-2xl overflow-hidden"
                            >
                                <InfoPanel
                                    {...infoPanelProps}
                                    showBackButton={true}
                                    onBack={() => setDesktopDrawerOpen(false)}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* TABLET (768px–1023px) */}
            <div className="hidden md:flex lg:hidden flex-1 overflow-hidden relative">
                <div className="w-[300px] shrink-0 h-full border-r border-white/[0.08] bg-[#10111A]">
                    <ConversationSidebar
                        {...sidebarProps}
                        onLeadSelect={(l) => {
                            handleLeadSelectTablet(l);
                            setUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                        }}
                    />
                </div>
                <div className="flex-1 min-w-0 h-full relative overflow-hidden bg-[#0c0d14]">
                    <AnimatePresence mode="wait">
                        {tabletRight === 'chat' ? (
                            <motion.div key="tablet-chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-hidden bg-[#0c0d14]">
                                <ChatArea {...chatAreaProps} onInfoClick={() => setTabletRight('info')} infoActive={false} showMobileBackButton={false} />
                            </motion.div>
                        ) : (
                            <motion.div key="tablet-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-hidden bg-[#12131D] overflow-y-auto">
                                <InfoPanel {...infoPanelProps} showBackButton={true} onBack={() => setTabletRight('chat')} />
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                    {...sidebarProps}
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
                                                {selectedInboxTemplate.type === 'IMAGE' ? (
                                                    <div className="w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-2">
                                                        {(inboxTemplateMediaUrl || selectedInboxTemplate.media_url || (selectedInboxTemplate.header && (selectedInboxTemplate.header.startsWith('http://') || selectedInboxTemplate.header.startsWith('https://')))) ? (
                                                            <img
                                                                src={inboxTemplateMediaUrl || selectedInboxTemplate.media_url || selectedInboxTemplate.header}
                                                                alt="Template Header"
                                                                className="w-full h-32 object-cover rounded-xl"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#814AC8]/20 via-purple-950/30 to-[#120d24] text-purple-200">
                                                                <div className="w-7 h-7 rounded-full bg-[#814AC8]/25 flex items-center justify-center text-[#C49FE0]">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-[11px] font-semibold text-white/90">Header: Image Media</span>
                                                                <span className="text-[9px] text-white/50">Required for WhatsApp template delivery</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : selectedInboxTemplate.type === 'VIDEO' ? (
                                                    <div className="w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-2">
                                                        {(inboxTemplateMediaUrl || selectedInboxTemplate.media_url || (selectedInboxTemplate.header && (selectedInboxTemplate.header.startsWith('http://') || selectedInboxTemplate.header.startsWith('https://')))) ? (
                                                            <video src={inboxTemplateMediaUrl || selectedInboxTemplate.media_url || selectedInboxTemplate.header} className="w-full h-32 object-cover rounded-xl" controls />
                                                        ) : (
                                                            <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#814AC8]/20 via-purple-950/30 to-[#120d24] text-purple-200">
                                                                <div className="w-7 h-7 rounded-full bg-[#814AC8]/25 flex items-center justify-center text-[#C49FE0]">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-[11px] font-semibold text-white/90">Header: Video Media</span>
                                                                <span className="text-[9px] text-white/50">Required for WhatsApp template delivery</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : selectedInboxTemplate.header && !selectedInboxTemplate.header.startsWith('4:') ? (
                                                    <div className="font-bold text-white text-[13px] mb-1">{selectedInboxTemplate.header}</div>
                                                ) : null}
                                                <div className="text-[13px] text-white/90 whitespace-pre-wrap leading-relaxed">
                                                    {getInboxTemplatePreviewText()}
                                                </div>
                                                {selectedInboxTemplate.footer && (
                                                    <div className="text-[11px] text-gray-400 mt-2">{selectedInboxTemplate.footer}</div>
                                                )}
                                            </div>
                                        </div>

                                        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedInboxTemplate.type) && (
                                            <div className="flex flex-col gap-1.5 bg-[#140d2b] border border-[#2a1f4a] p-3 rounded-xl">
                                                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                                                    <span>Header {selectedInboxTemplate.type === 'IMAGE' ? 'Image' : selectedInboxTemplate.type === 'VIDEO' ? 'Video' : 'Document'} URL</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">Auto-detected or custom link</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={inboxTemplateMediaUrl}
                                                    onChange={e => setInboxTemplateMediaUrl(e.target.value)}
                                                    placeholder={selectedInboxTemplate.type === 'IMAGE' ? "https://example.com/banner.png" : "https://example.com/video.mp4"}
                                                    className="w-full px-3 py-2 rounded-lg border border-[#2a1f4a] bg-[#100b21] text-white text-[13px] outline-none focus:border-[#7c3aed]"
                                                />
                                            </div>
                                        )}

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

            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                onStartChat={handleStartNewChat}
            />

            <SendTemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                workspace={workspace}
                lead={lead}
                onSuccess={handleSendTemplateSuccess}
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
        <Suspense fallback={<Preloader text="Loading Inbox..." fullScreen={false} className="h-screen bg-[#0d0e17]" />}>
            <InboxContent />
        </Suspense>
    );
}