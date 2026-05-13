'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Phone, Instagram, Globe, Mail, Paperclip,
    Zap, Sparkles, Send, Clock, User, Star, Calendar,
    ArrowRight, ChevronRight, MoreHorizontal, Info
} from 'lucide-react';
import { getWorkspace, getToken } from '@/lib/auth';

const CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: '#25D366' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
    { id: 'twilio', label: 'Twilio', icon: Zap, color: '#F22F46' },
];

const PROXY_BASE = '/backend';

function getHeaders() {
    const token = typeof window !== 'undefined' ? getToken() : null;
    return {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

//  Get display name based on channel
function getDisplayName(lead, channelId) {
    if (channelId === 'instagram') {
        return lead.contact_name || lead.username || 'Instagram User';
    }
    return lead.phone || lead.contact_name || 'Unknown';
}

//  Get avatar initials based on channel
function getAvatarText(lead, channelId) {
    if (channelId === 'instagram') {
        const name = lead.contact_name || lead.username || 'U';
        return name[0].toUpperCase();
    }
    const phone = lead.phone || '';
    return phone.slice(-2) || 'U';
}

/**
 * ProfilePic — renders an Instagram profile picture with an automatic
 * fallback to coloured initials when the CDN URL returns 403/fails.
 *
 * Instagram CDN URLs (scontent.cdninstagram.com) are session-bound and
 * expire; they cannot be loaded cross-origin without Instagram cookies.
 * Rather than showing a broken image, we catch the error and swap to the
 * initials avatar that was already being shown for non-Instagram channels.
 */
function ProfilePic({ src, alt, fallbackText, color, className = '' }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <span style={{ color }} className={className}>
                {fallbackText}
            </span>
        );
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

export default function InboxPage() {
    const workspace = getWorkspace();
    const [ch, setCh] = useState(CHANNELS[0]);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [lead, setLead] = useState(null);
    const [msg, setMsg] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const ref = useRef(null);
    const [previewMedia, setPreviewMedia] = useState(null);
    const messagesContainerRef = useRef(null);
    useEffect(() => {
        setLead(null);
        setMessages([]);
        setConversations([]);
        fetchConversations();
    }, [ch]);

    useEffect(() => {
        if (!lead) return;
        const interval = setInterval(() => fetchMessages(lead.id), 5000);
        return () => clearInterval(interval);
    }, [lead]);

    useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (isNearBottom) {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
}, [messages]);

    async function fetchConversations() {
        try {
            const res = await fetch(
                `${PROXY_BASE}/api/conversations?workspace_id=${workspace.id}&channel=${ch.id}`,
                { headers: getHeaders() }
            );
            const data = await res.json();
            if (Array.isArray(data)) {
                setConversations(data);
                if (data.length > 0) {
                    setLead(data[0]);
                    fetchMessages(data[0].id);
                }
            }
        } catch (e) {
            console.error('Conversation fetch error:', e);
        }
    }

    async function fetchMessages(id) {
        try {
            const res = await fetch(`${PROXY_BASE}/api/messages/${id}`, { headers: getHeaders() });
                    console.log('Status:', res.status, 'URL:', res.url); 
            const data = await res.json();
              console.log('Messages API response:', id, data?.length, data);
               console.log('Messages API response:', data); // debug
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
    }

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
        } catch (e) {
            console.error('Send error:', e);
        }
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
            const data = await res.json();
            setAiSuggestion(data.suggestion);
        } catch (e) {
            console.error(e);
        }
    }

    function useSuggestion() {
        setMsg(aiSuggestion);
        setAiSuggestion('');
    }

    const I = ch.icon;
    const isInstagram = ch.id === 'instagram';

    return (
        <div className="h-screen flex flex-col bg-[#0f0f0f]">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-3 bg-[#161616] border-b border-[#1f1f1f]">
                {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    const on = ch.id === c.id;
                    const count = on ? conversations.length : 0;
                    return (
                        <button
                            key={c.id}
                            onClick={() => setCh(c)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all ${on ? 'text-white' : 'text-[#666] hover:text-[#999]'}`}
                            style={{ backgroundColor: on ? c.color : 'transparent' }}
                        >
                            <Icon size={15} strokeWidth={2} />
                            {c.label}
                            {count > 0 && (
                                <span className="ml-1 text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-[#161616] border-r border-[#1f1f1f] flex flex-col overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-[13px] font-semibold mb-4" style={{ color: ch.color }}>
                                    <I size={15} strokeWidth={2} />
                                    {ch.label} Inbox
                                </div>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" strokeWidth={2} />
                                    <input
                                        placeholder="Search conversations..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white placeholder:text-[#555] outline-none focus:border-[#333] transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-2">
                                {conversations.length === 0 && (
                                    <p className="text-center text-[#555] text-[12px] mt-8">No conversations yet</p>
                                )}
                                {conversations.map((l) => {
                                    const sel = lead?.id === l.id;
                                    const displayName = getDisplayName(l, ch.id);
                                    const avatarText = getAvatarText(l, ch.id);

                                    return (
                                        <button
                                            key={l.id}
                                            onClick={() => { setLead(l); fetchMessages(l.id); }}
                                            className={`w-full p-3 mb-1 rounded-xl text-left transition-all ${sel ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
                                            style={{ borderLeft: sel ? `3px solid ${ch.color}` : '3px solid transparent' }}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/*  Avatar: profile pic for Instagram, initials for others */}
                                                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#222] flex items-center justify-center text-[14px] font-semibold shrink-0">
                                                    {isInstagram && l.profile_pic ? (
                                                        <ProfilePic
                                                            src={l.profile_pic}
                                                            alt={displayName}
                                                            fallbackText={avatarText}
                                                            color={ch.color}
                                                        />
                                                    ) : (
                                                        <span style={{ color: ch.color }}>{avatarText}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        {/*  Display name: username for Instagram, phone for WhatsApp/Twilio */}
                                                        <span className="text-[13px] font-medium text-white truncate">{displayName}</span>
                                                        <span className="text-[11px] text-[#555] shrink-0 ml-2">Active</span>
                                                    </div>
                                                    {/*  Subtitle: show phone for Instagram too if available */}
                                                    <p className="text-[12px] text-[#666] truncate leading-relaxed">
                                                        {isInstagram && l.phone ? l.phone : `Lead from ${ch.label}`}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span
                                                            className="text-[10px] font-medium px-2 py-1 rounded-md"
                                                            style={{ backgroundColor: `${ch.color}15`, color: ch.color }}
                                                        >
                                                            {l.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-[#0f0f0f]">
                    {lead ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-b border-[#1f1f1f]">
                                <div className="flex items-center gap-3">
                                    {!showSidebar && (
                                        <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-white/5 rounded-lg text-[#666]">
                                            <ChevronRight size={20} />
                                        </button>
                                    )}

                                    {/*  Header avatar: profile pic for Instagram, initials for others */}
                                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-[14px] font-semibold shrink-0"
                                        style={{ backgroundColor: `${ch.color}18` }}>
                                        {isInstagram && lead.profile_pic ? (
                                            <ProfilePic
                                                src={lead.profile_pic}
                                                alt={getDisplayName(lead, ch.id)}
                                                fallbackText={getAvatarText(lead, ch.id)}
                                                color={ch.color}
                                            />
                                        ) : (
                                            <span style={{ color: ch.color }}>{getAvatarText(lead, ch.id)}</span>
                                        )}
                                    </div>

                                    <div>
                                        {/*  Header title: username for Instagram, phone for others */}
                                        <h3 className="text-[14px] font-semibold text-white">
                                            {getDisplayName(lead, ch.id)}
                                        </h3>
                                        <p className="text-[12px] flex items-center gap-1.5" style={{ color: ch.color }}>
                                            <I size={12} strokeWidth={2} />
                                            {ch.label}
                                            {/*  Show phone as subtitle for Instagram */}
                                            {isInstagram && lead.phone && (
                                                <span className="text-[#666] ml-1">{lead.phone}</span>
                                            )}
                                            <span className="text-emerald-400 ml-1">● Online</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const newState = !showInfo;
                                            setShowInfo(newState);
                                            if (newState) setShowSidebar(false);
                                        }}
                                        className={`p-2.5 rounded-lg transition-colors ${showInfo ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}`}
                                        style={{ color: showInfo ? ch.color : '#666' }}
                                    >
                                        <Info size={18} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                           <div
    ref={messagesContainerRef}
    className="flex-1 overflow-y-auto p-6 relative"
>
                                <div
                                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                    style={{
                                        backgroundImage: `url("https://www.transparenttextures.com/patterns/carbon-fibre.png")`,
                                        backgroundColor: '#000',
                                    }}
                                />
                                <div className="max-w-3xl mx-auto space-y-3 relative z-10">
                                    {messages.map((m) => {
                                       const isUser = m.sender_type?.toLowerCase() === 'user';
                                        const isAI = m.sender_type?.toLowerCase() === 'ai';
                                        const isSuggested = m.status?.toLowerCase() === 'suggested';

                                        return (
                                            <div key={m.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                                                {isAI && isSuggested ? (
                                                    <div className="max-w-[75%] p-4 rounded-2xl" style={{ backgroundColor: `${ch.color}10`, border: `1px solid ${ch.color}20` }}>
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
                                                        className={`max-w-[75%] px-4 py-3 ${isUser ? 'rounded-[20px_20px_20px_6px]' : 'rounded-[20px_20px_6px_20px]'}`}
                                                        style={{ backgroundColor: isUser ? '#1c1c1c' : ch.color }}
                                                    >
                                                        {!isUser && m.content?.startsWith('[IMAGE]') ? (
                                                            <>
                                                                <img
                                                                    src={m.content.replace('[IMAGE]', '').trim()}
                                                                    alt="image"
                                                                    className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
                                                                    onClick={() =>
                                                                        setPreviewMedia({
                                                                            type: 'image',
                                                                            url: m.content.replace('[IMAGE]', '').trim()
                                                                        })
                                                                    }
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                                <p className="text-[10px] text-white/50 mt-2">
                                                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </>
                                                        ) : !isUser && m.content?.startsWith('[VIDEO]') ? (
                                                            <>
                                                                <video
                                                                    src={m.content.replace('[VIDEO]', '').trim()}
                                                                    controls
                                                                    className="max-w-[220px] rounded-xl cursor-pointer"
                                                                    onClick={() =>
                                                                        setPreviewMedia({
                                                                            type: 'video',
                                                                            url: m.content.replace('[VIDEO]', '').trim()
                                                                        })
                                                                    }
                                                                />
                                                                <p className="text-[10px] text-white/50 mt-2">
                                                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </>
                                                        ) : !isUser && m.content?.startsWith('[DOCUMENT]') ? (
                                                            <>
                                                                <a
                                                                    href={m.content.replace('[DOCUMENT]', '').trim()}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-white underline text-[13px]"
                                                                >
                                                                    <Paperclip size={14} />
                                                                    View Document
                                                                </a>
                                                                <p className="text-[10px] text-white/50 mt-2">
                                                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </>
                                                        ) : !isUser && m.content?.includes('\n') && m.content?.includes('[') ? (
                                                            <>
                                                                {m.content.split('\n')[0] && (
                                                                    <p className="text-[13px] text-white leading-relaxed mb-3">
                                                                        {m.content.split('\n')[0]}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-col gap-2">
                                                                    {m.content.split('\n').slice(1).join('').split('|').map((btn, i) => {
                                                                        const label = btn.replace(/\[|\]/g, '').trim();
                                                                        if (!label) return null;
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium"
                                                                                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                                                                            >
                                                                                {label}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <p className="text-[10px] text-white/50 mt-2">
                                                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-[13px] text-white leading-relaxed">{m.content}</p>
                                                                <p className="text-[10px] text-white/50 mt-2">
                                                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div ref={ref} />
                                    {previewMedia && (
                                        <div
                                            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                                            onClick={() => setPreviewMedia(null)}
                                        >
                                            {previewMedia.type === 'image' ? (
                                                <img
                                                    src={previewMedia.url}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="max-h-[90vh] max-w-[90vw] rounded-2xl"
                                                />
                                            ) : (
                                                <video
                                                    src={previewMedia.url}
                                                    controls
                                                    autoPlay
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="max-h-[90vh] max-w-[90vw] rounded-2xl"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-[#161616] border-t border-[#1f1f1f]">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex items-center gap-2 mb-3">
                                        <button
                                            onClick={generateSuggestion}
                                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                                            style={{ backgroundColor: `${ch.color}12`, color: ch.color }}
                                        >
                                            Suggest Reply
                                        </button>
                                    </div>

                                    {aiSuggestion && (
                                        <div className="p-3 mb-3 rounded-xl flex justify-between items-center" style={{ backgroundColor: `${ch.color}15`, border: `1px solid ${ch.color}30` }}>
                                            <p className="text-sm text-white">{aiSuggestion}</p>
                                            <button onClick={useSuggestion} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition" style={{ color: ch.color }}>Use</button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <input
                                            value={msg}
                                            onChange={(e) => setMsg(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-3 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white placeholder:text-[#555] outline-none focus:border-[#333]"
                                        />
                                        <button className="p-3 rounded-xl transition-colors" style={{ backgroundColor: `${ch.color}15`, color: ch.color }}>
                                            <Zap size={18} strokeWidth={2} />
                                        </button>
                                        <button
                                            onClick={sendMessage}
                                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold text-white transition-all active:scale-95"
                                            style={{ backgroundColor: ch.color }}
                                        >
                                            <Send size={16} strokeWidth={2} />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-[#444] text-[14px]">
                            Select a conversation
                        </div>
                    )}
                </div>

                {/* Info Panel */}
                <AnimatePresence>
                    {showInfo && lead && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#161616] border-l border-[#1f1f1f] overflow-hidden"
                        >
                            <div className="w-[300px] h-full overflow-y-auto p-5">
                                <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-5">Lead Details</p>
                                <div className="text-center mb-6">
                                    {/*  Info panel avatar */}
                                    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 flex items-center justify-center text-xl font-bold"
                                        style={{ backgroundColor: `${ch.color}18` }}>
                                        {isInstagram && lead.profile_pic ? (
                                            <ProfilePic
                                                src={lead.profile_pic}
                                                alt={getDisplayName(lead, ch.id)}
                                                fallbackText={getAvatarText(lead, ch.id)}
                                                color={ch.color}
                                            />
                                        ) : (
                                            <span style={{ color: ch.color }}>{getAvatarText(lead, ch.id)}</span>
                                        )}
                                    </div>
                                    {/*  Info panel name */}
                                    <h4 className="text-[15px] font-semibold text-white">{getDisplayName(lead, ch.id)}</h4>
                                    {/*  Show phone separately if Instagram */}
                                    {isInstagram && lead.phone && (
                                        <p className="text-[12px] text-[#666] mt-1">{lead.phone}</p>
                                    )}
                                    <p className="text-[12px] text-[#666] mt-1">Lead ID: {lead.id.slice(0, 8)}</p>
                                </div>
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] text-[#666]">Channel</span>
                                        <span className="text-[12px] flex items-center gap-1.5" style={{ color: ch.color }}>
                                            <I size={13} strokeWidth={2} />
                                            {ch.label}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] text-[#666]">Status</span>
                                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                                            {lead.status}
                                        </span>
                                    </div>
                                    {/*  Show identifier row */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] text-[#666]">
                                            {isInstagram ? 'Username' : 'Phone'}
                                        </span>
                                        <span className="text-[12px] text-white">
                                            {isInstagram
                                                ? (lead.contact_name || lead.username || '—')
                                                : (lead.phone || '—')}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { icon: User, text: 'Assign Agent' },
                                        { icon: Star, text: 'Mark Priority' },
                                        { icon: Calendar, text: 'Schedule Follow-up' },
                                    ].map((a, i) => (
                                        <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#282828] text-[13px] text-white hover:border-[#333] transition-colors">
                                            <a.icon size={16} strokeWidth={2} className="text-[#666]" />
                                            {a.text}
                                        </button>
                                    ))}
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold text-white transition-colors" style={{ backgroundColor: ch.color }}>
                                        <ArrowRight size={16} strokeWidth={2} />
                                        Convert to Deal
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}