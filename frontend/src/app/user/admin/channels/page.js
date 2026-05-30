'use client';

import { useState, useEffect, useCallback } from 'react';
import { Instagram, Mail, Search,
         ChevronDown, Check, X, ChevronRight } from 'lucide-react';
import { getWorkspace, authHeader } from '@/lib/auth';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#25D366"/>
        <path d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" fill="white"/>
    </svg>
);

const TwilioIcon = () => (
    <svg viewBox="0 0 48 48" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#F22F46"/>
        <circle cx="24" cy="24" r="9" fill="none" stroke="white" strokeWidth="3.5"/>
        <circle cx="24" cy="15.5" r="2.8" fill="white"/>
        <circle cx="24" cy="32.5" r="2.8" fill="white"/>
        <circle cx="15.5" cy="24" r="2.8" fill="white"/>
        <circle cx="32.5" cy="24" r="2.8" fill="white"/>
    </svg>
);

const CHANNELS_DATA = [
    {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    subHeader: 'Meta Cloud API',
    badgeColor: 'bg-green-500/20 text-green-400 border border-green-500/30',
    description: 'Connect your whatsApp business number to automate replies and manage conversations.',
    iconBg: 'from-green-400 to-green-600',
    iconColor: '#fff',
    glowColor: 'rgba(78,237,110,0.15)',
    borderGlow: '',
    activeBorderGlow: '',
    cardBorder: '1px solid #4EED6E',
    categoryLabel: 'Messaging',
    categoryDot: 'bg-green-500',
    connectBtnClass: 'text-white',
    connectBtnStyle: { background: '#140D1F', border: '0.2px solid #49E967', boxShadow: '0 0 12px -5px #49E967' },
    icon: WhatsAppIcon,
    },
    {
    id: 'instagram',
    name: 'Instagram',
    subHeader: 'Meta Business',
    subHeaderBelow: true,
    badgeColor: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
    description: 'Sync DMs and comments from Instagram to your Unified Inbox.',
    iconBg: 'from-pink-500 via-red-500 to-yellow-500',
    iconColor: '#fff',
    glowColor: 'rgba(199,54,141,0.15)',
    borderGlow: '',
    activeBorderGlow: '',
    cardBorder: '1px solid #C7368D',
    categoryLabel: 'Social media',
    categoryDot: 'bg-pink-500',
    connectBtnClass: 'text-white',
    connectBtnStyle: { background: '#140D1F', border: '0.2px solid #C7368D', boxShadow: '0 0 12px -5px #C7368D' },
    icon: Instagram,
    },
    {
    id: 'twilio',
    name: 'Twilio',
    subHeader: 'Twilio Powered',
    subHeaderBelow: true,
    badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    description: 'Power your WhatsApp and SMS communications with our native Twilio bridge.',
    iconBg: 'from-red-500 to-red-700',
    iconColor: '#fff',
    glowColor: 'rgba(206,39,45,0.15)',
    borderGlow: '',
    activeBorderGlow: '',
    cardBorder: '1px solid #CE272D',
    categoryLabel: 'SMS & WhatsApp',
    categoryDot: 'bg-red-500',
    connectBtnClass: 'text-white',
    connectBtnStyle: { background: '#140D1F', border: '0.2px solid #C7368D', boxShadow: '0 0 12px -5px #C7368D' },
    icon: TwilioIcon,
    },
];

export default function ChannelsPage() {
    const FB_APP_ID  = process.env.NEXT_PUBLIC_FB_APP_ID;
    const WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    const [workspace, setWorkspace] = useState(null);

    useEffect(() => {
        const ws = getWorkspace();
        setWorkspace(ws);
    }, []);

    const [statuses, setStatuses] = useState({
        whatsapp: false, instagram: false, gmail: false, twilio: false
    });

    const [connecting, setConnecting] = useState(null);
    const [showTwilioModal, setShowTwilioModal] = useState(false);
    const [twilioForm, setTwilioForm] = useState({ sid: '', token: '', phone: '' });
    const [twilioSubmitting, setTwilioSubmitting] = useState(false);
    const [connectedInfo, setConnectedInfo] = useState({});

    // ─── Listen for WhatsApp embedded signup messages ─
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.origin !== "https://www.facebook.com") return;
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id } = data.data;
                        connectWhatsAppToBackend({ phone_number_id, waba_id });
                    } else if (data.event === 'CANCEL') {
                        setConnecting(null);
                    } else if (data.event === 'ERROR') {
                        setConnecting(null);
                    }
                }
            } catch (_) {}
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [workspace?.id]);

    const startWhatsAppSignup = useCallback(() => {
        setConnecting('whatsapp');
        window.FB.login(
            (response) => {
                if (response.authResponse?.code) {
                    connectWhatsAppToBackend({ code: response.authResponse.code });
                } else {
                    setConnecting(null);
                }
            },
            {
                config_id: WA_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { sessionInfoVersion: 3, featureType: '', setup: {} }
            }
        );
    }, [WA_CONFIG_ID]);

    const connectWhatsAppToBackend = async (payload) => {
        try {
            const res = await fetch(`/backend/api/whatsapp/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ ...payload, workspace_id: workspace?.id })
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (err) { return; }
            if (data.status === 'connected') {
                setStatuses(prev => ({ ...prev, whatsapp: true }));
                setConnectedInfo(prev => ({ ...prev, whatsapp: data.phone_number }));
                localStorage.setItem("whatsapp_connected", "true");
            }
        } catch (err) {
            console.error('WhatsApp connect error:', err);
        } finally {
            setConnecting(null);
        }
    };

    const startInstagramLogin = useCallback(() => {
        setConnecting('instagram');
        const workspaceId = workspace?.id;
        if (!workspaceId) {
            alert("Workspace not loaded. Please wait...");
            return;
        }
        localStorage.setItem("instagram_workspace_id", workspaceId);
        const REDIRECT_URI = `${window.location.origin}/instagram/callback`;
        const authUrl =
            `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&scope=${encodeURIComponent('instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_messaging,pages_read_engagement,business_management')}` +
            `&response_type=code`;
        window.location.href = authUrl;
    }, [workspace]);

    const connectInstagramToBackend = async (code) => {
        try {
            const res = await fetch(`/backend/api/instagram/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, workspace_id: workspace?.id })
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (err) { return; }
            if (data.status === 'connected') {
                setStatuses(prev => ({ ...prev, instagram: true }));
                setConnectedInfo(prev => ({ ...prev, instagram: data.username }));
            }
        } catch (err) {
            console.error('Instagram connect error:', err);
        } finally {
            setConnecting(null);
        }
    };

    const startGmailOAuth = () => {
        const redirectUri = `/api/gmail/callback`;
        window.location.href =
            `https://accounts.google.com/o/oauth2/v2/auth` +
            `?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')}` +
            `&access_type=offline`;
    };

    const submitTwilio = async () => {
        const { sid, token, phone } = twilioForm;
        if (!sid.trim() || !token.trim() || !phone.trim()) return;
        setTwilioSubmitting(true);
        try {
            const res = await fetch(`/api/twilio/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ sid, token, phone, workspace_id: workspace?.id })
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (err) { return; }
            if (data.status === 'connected') {
                setStatuses(prev => ({ ...prev, twilio: true }));
                setConnectedInfo(prev => ({ ...prev, twilio: phone }));
                setShowTwilioModal(false);
            }
        } catch (err) {
            console.error('Twilio error:', err);
        } finally {
            setTwilioSubmitting(false);
        }
    };

    const handleConnect = (id) => {
        if (statuses[id]) return;
        if (id === 'whatsapp')  startWhatsAppSignup();
        if (id === 'instagram') startInstagramLogin();
        if (id === 'gmail')     startGmailOAuth();
        if (id === 'twilio')    setShowTwilioModal(true);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-6">
                    <div className="pt-2 md:pb-2">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-7">Channels</h1>
                        <p className="text-white/70 text-[15px] max-w-md leading-relaxed mb-4">
                            Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                        </p>
                    </div>                                   

                    <div className="hidden md:flex items-center justify-center flex-shrink-0 pointer-events-none select-none">
                        <img
                            src="/images/ChannelImage.png"
                            alt="AI Assistant"
                            className="h-72 w-auto object-contain drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* ── Toolbar ── */}
                <div className="flex flex-wrap items-center gap-3 mb-10">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                        <input type="text" placeholder="Search Channels"
                            className="w-full bg-[#070012] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-[#333] transition-colors" />
                    </div>
                    {[
                        { label: 'Sort by', icon: ChevronDown },
                        { label: 'Type', icon: ChevronDown },
                        { label: 'Categories', icon: ChevronDown },
                    ].map(btn => (
                        <button key={btn.label}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#070012] border border-[#1f1f1f] rounded-xl text-[13px] text-[#aaa] hover:border-[#333] hover:text-white transition-colors">
                            {btn.label}
                            <btn.icon size={13} className="text-[#555]" />
                        </button>
                    ))}
                </div>

                {/* ── Channel Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {CHANNELS_DATA.map((item) => {
                        const isConnected  = statuses[item.id];
                        const isConnecting = connecting === item.id;
                        const Icon         = item.icon;
                        const info         = connectedInfo[item.id];

                        return (
                            <div key={item.id}
                                className="relative group rounded-2xl transition-all duration-300 flex flex-col overflow-hidden"
                                style={{
                                    background: '#070012',
                                    border: item.cardBorder,
                                    boxShadow: `0 0 30px ${item.glowColor}`,
                                    transition: 'box-shadow 0.3s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = `0 0 40px ${item.glowColor}, inset 0 0 20px ${item.glowColor}`;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = `0 0 30px ${item.glowColor}`;
                                }}
                            >
                                {/* Card body */}
                                <div className="p-6 flex-1 min-h-[160px]">
                                    <div className="flex items-start gap-4">
                                        {/* Icon - left side */}
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                            <Icon />
                                        </div>

                                        {/* Content - right side */}
                                        <div className="flex-1 min-w-0">
                                            {item.subHeaderBelow ? (
                                                <div className="mb-1.5">
                                                    <h3 className="text-[17px] font-semibold text-white leading-tight mb-1">{item.name}</h3>
                                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                                                        {item.subHeader}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                    <h3 className="text-[17px] font-semibold text-white leading-tight">{item.name}</h3>
                                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                                                        {item.subHeader}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Description */}
                                            <p className="text-white/60 text-[12px] leading-relaxed">{item.description}</p>

                                            {/* Connected info */}
                                            {isConnected && info && (
                                                <p className="mt-2 text-[11px] text-[#666] font-mono">{info}</p>
                                            )}
                                            {isConnecting && (
                                                <p className="mt-2 text-[11px] text-yellow-500 animate-pulse">Connecting...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div className="px-6 py-4 border-t border-[#141414] flex items-center justify-between">
                                    {/* Category */}
                                    <div className="flex items-center gap-2">
                                        {isConnected ? (
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                                        ) : (
                                            <span className={`w-2 h-2 rounded-full ${item.categoryDot}`} />
                                        )}
                                        <span className="text-[12px] text-[#555]">
                                            {isConnected ? 'Connected' : item.categoryLabel}
                                        </span>
                                    </div>

                                    {/* Connect / Connected button */}
                                    {isConnected ? (
                                        <button
                                            title="Connected"
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-[13px] font-medium cursor-default">
                                            <Check size={14} />
                                            Connected
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(item.id)}
                                            disabled={isConnecting || !workspace}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${item.connectBtnClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                                            style={item.connectBtnStyle}>
                                            {isConnecting ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    Connect
                                                    <ChevronRight size={14} />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="mt-14 text-center text-[#2a2a2a] text-[12px]">
                    <p>Auromind AI securely handles your communication data according to our privacy policy.</p>
                </div>
            </div>

            {/* ── Twilio Modal ── */}
            {showTwilioModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0d0d0d] border border-[#1f1f1f] p-6 rounded-2xl w-full max-w-[420px] shadow-2xl"
                        style={{ boxShadow: '0 0 60px rgba(242,47,70,0.15)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                                    <Zap size={18} color="#fff" />
                                </div>
                                <div>
                                    <h2 className="text-[16px] font-semibold text-white">Connect Twilio</h2>
                                    <p className="text-[11px] text-[#444]">Enter your Twilio credentials</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTwilioModal(false)}
                                className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-[#555] hover:text-white hover:bg-[#222] transition-colors">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Account SID', key: 'sid', placeholder: 'ACxxxxxxxx...', type: 'text' },
                                { label: 'Auth Token',  key: 'token', placeholder: 'Your Twilio Auth Token', type: 'password' },
                                { label: 'Phone Number', key: 'phone', placeholder: '+1234567890', type: 'text' }
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-[11px] text-[#444] mb-1.5 uppercase tracking-widest font-medium">{field.label}</label>
                                    <input type={field.type} placeholder={field.placeholder}
                                        value={twilioForm[field.key]}
                                        onChange={e => setTwilioForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-[#333] outline-none font-mono focus:border-red-500/40 transition-colors" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowTwilioModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[#222] text-[#666] hover:text-white hover:border-[#333] text-[13px] transition-colors">
                                Cancel
                            </button>
                            <button onClick={submitTwilio} disabled={twilioSubmitting}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 transition-all shadow-lg"
                                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                                {twilioSubmitting ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}   