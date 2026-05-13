'use client';

import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Instagram, Mail, Zap, Search,
         ChevronDown, Plus, Check, X, Filter, ArrowUpDown, Grid } from 'lucide-react';
import { getWorkspace, authHeader } from '@/lib/auth';
const CHANNELS_DATA = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        subHeader: 'Meta Cloud API',
        description: 'Connect your business number via Meta to automate replies and manage leads.',
        icon: Smartphone,
        iconColor: '#25D366',
    },
    {
        id: 'instagram',
        name: 'Instagram Direct',
        subHeader: 'Meta Business',
        description: 'Sync DMs and comments directly to your Unified Inbox.',
        icon: Instagram,
        iconColor: '#E4405F',
    },
    {
        id: 'gmail',
        name: 'Gmail / G-Suite',
        subHeader: 'Email Service',
        description: 'Sync emails, categorize threads, and draft AI responses automatically.',
        icon: Mail,
        iconColor: '#EA4335',
    },
    {
        id: 'twilio',
        name: 'Twilio API',
        subHeader: 'Twilio Powered',
        description: 'Power your WhatsApp and SMS communications with our native Twilio bridge.',
        icon: Zap,
        iconColor: '#F22F46',
    }
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
  
    const [connecting, setConnecting] = useState(null); // which channel is loading
    const [showTwilioModal, setShowTwilioModal] = useState(false);
    const [twilioForm, setTwilioForm] = useState({ sid: '', token: '', phone: '' });
    const [twilioSubmitting, setTwilioSubmitting] = useState(false);
    const [connectedInfo, setConnectedInfo] = useState({}); // stores ig username, wa number etc

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
                        console.log('WhatsApp signup cancelled at step:', data.data?.current_step);
                    } else if (data.event === 'ERROR') {
                        setConnecting(null);
                        console.error('WhatsApp signup error:', data.data);
                    }
                }
            } catch (_) {}
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [workspace?.id]);

    // ─── WhatsApp: Embedded Signup Popup ──────────────
    const startWhatsAppSignup = useCallback(() => {
        setConnecting('whatsapp');

        window.FB.login(
            (response) => {
                if (response.authResponse?.code) {
                    connectWhatsAppToBackend({ code: response.authResponse.code });
                } else {
                    setConnecting(null);
                    console.log('WhatsApp FB login cancelled');
                }
            },
            {
                config_id: WA_CONFIG_ID,           //
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    sessionInfoVersion: 3,
                    featureType: '',
                    setup: {}
                }
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
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error('WhatsApp connect failed parsing JSON:', text);
            return;
        }

        if (data.status === 'connected') {
            setStatuses(prev => ({ ...prev, whatsapp: true }));
            setConnectedInfo(prev => ({ ...prev, whatsapp: data.phone_number }));

            //  FIX: move here
            localStorage.setItem("whatsapp_connected", "true");
        }

    } catch (err) {
        console.error('WhatsApp connect error:', err);
    } finally {
        setConnecting(null);
    }
};

    // ─── Instagram: Facebook Login Popup ──────────────
//    const startInstagramLogin = useCallback(() => {
//     setConnecting('instagram');

//     window.FB.login(
//         (response) => {
//             console.log('FB login response:', response);

//             if (response.authResponse?.code) {
//                 connectInstagramToBackend(response.authResponse.code);
//             } else if (response.authResponse?.accessToken) {
//                 // fallback if code not returned
//                 connectInstagramToBackend(null, response.authResponse.accessToken);
//             } else {
//                 setConnecting(null);
//                 console.log('Instagram login cancelled or failed');
//             }
//         },
//         {
//             //  NO config_id here — use scope directly
//             response_type: 'code',
//             override_default_response_type: true,
//             scope: [
//                 'instagram_basic',
//                 'instagram_manage_messages',
//                 'instagram_manage_comments',
//                 'pages_show_list',
//                 'pages_messaging',
//                 'pages_read_engagement',
//                 'business_management'
//             ].join(',')
//         }
//     );
// }, []);

    const startInstagramLogin = useCallback(() => {
    setConnecting('instagram');

    const workspaceId = workspace?.id;

    if (!workspaceId) {
        console.error("❌ Workspace not loaded yet");
        alert("Workspace not loaded. Please wait...");
        return;
    }

    localStorage.setItem("instagram_workspace_id", workspaceId);

    const REDIRECT_URI = `${window.location.origin}/instagram/callback`;

    const authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(
            'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_messaging,pages_read_engagement,business_management'
        )}` +
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
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('Instagram connect failed parsing JSON:', text);
                return;
            }
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

    // ─── Gmail OAuth ─────────────
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

    // ─── Twilio Modal──────
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
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('Twilio connect failed parsing JSON:', text);
                return;
            }
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

    // ─── Main connect dispatcher───
    const handleConnect = (id) => {
        if (statuses[id]) return; // already connected
        if (id === 'whatsapp')  startWhatsAppSignup();
        if (id === 'instagram') startInstagramLogin();
        if (id === 'gmail')     startGmailOAuth();
        if (id === 'twilio')    setShowTwilioModal(true);
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-[#E5E5E5] p-6 lg:p-12 font-sans">
            <div className="max-w-6xl mx-auto">

                <div className="mb-10 pt-4">
                    <h1 className="text-4xl font-semibold text-white mb-3">Channels</h1>
                    <p className="text-[#888] text-[15px] max-w-2xl leading-relaxed">
                        Centralize your communications. Connect your messaging platforms to allow Auromind to manage and automate your customer interactions.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-10">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                        <input type="text" placeholder="Search"
                            className="w-full bg-[#262626] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-[15px] text-white placeholder:text-[#555] outline-none" />
                    </div>
                    {[{ label: 'Sort', icon: ArrowUpDown }, { label: 'Type', icon: Grid }, { label: 'Categories', icon: Filter }].map(btn => (
                        <button key={btn.label} className="flex items-center gap-2 px-4 py-2.5 bg-[#262626] border border-white/5 rounded-xl text-[14px] text-[#D4D4D4]">
                            {btn.label} <ChevronDown size={14} className="text-[#666]" />
                        </button>
                    ))}
                </div>

                {/* Channel Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {CHANNELS_DATA.map((item) => {
                        const isConnected  = statuses[item.id];
                        const isConnecting = connecting === item.id;
                        const Icon         = item.icon;
                        const info         = connectedInfo[item.id];

                        return (
                            <div key={item.id}
                                className="bg-[#262626] border border-white/5 rounded-2xl p-5 flex items-start gap-5 hover:border-white/10 transition-all">

                                <div className="w-14 h-14 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <Icon size={28} style={{ color: item.iconColor }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-[17px] font-medium text-white">{item.name}</h3>
                                        <span className="text-[11px] text-[#555] uppercase tracking-wider">{item.subHeader}</span>
                                    </div>
                                    <p className="text-[#888] text-[14px] leading-snug">{item.description}</p>
                                    {isConnected && info && (
                                        <p className="mt-2 text-[11px] text-[#555] font-mono">{info}</p>
                                    )}
                                    {/*  Status pill */}
                                    {isConnecting && (
                                        <p className="mt-2 text-[11px] text-yellow-500 animate-pulse">Connecting...</p>
                                    )}
                                    {isConnected && (
                                        <p className="mt-2 text-[11px] text-green-500">● Connected</p>
                                    )}
                                </div>

                                <div className="pt-1">
                                    {isConnected ? (
                                        <button
                                            title="Connected"
                                            className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                                            <Check size={20} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(item.id)}
                                            disabled={isConnecting || !workspace}
                                            className="w-10 h-10 rounded-xl bg-[#333] border border-white/5 flex items-center justify-center text-[#D4D4D4] hover:bg-[#3d3d3d] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                            {isConnecting
                                                ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                : <Plus size={20} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Twilio Modal */}
                {showTwilioModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-[#262626] border border-white/10 p-6 rounded-2xl w-[420px] shadow-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-center">
                                        <Zap size={18} style={{ color: '#F22F46' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-[16px] font-medium text-white">Connect Twilio</h2>
                                        <p className="text-[11px] text-[#555]">Enter your Twilio credentials</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTwilioModal(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#666] hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Account SID', key: 'sid', placeholder: 'ACxxxxxxxx...', type: 'text' },
                                    { label: 'Auth Token',  key: 'token', placeholder: 'Your Twilio Auth Token', type: 'password' },
                                    { label: 'Phone Number', key: 'phone', placeholder: '+1234567890', type: 'text' }
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className="block text-[12px] text-[#666] mb-1.5 uppercase tracking-wider">{field.label}</label>
                                        <input type={field.type} placeholder={field.placeholder}
                                            value={twilioForm[field.key]}
                                            onChange={e => setTwilioForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2.5 text-white text-[14px] placeholder:text-[#444] outline-none font-mono" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowTwilioModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-[#888] hover:text-white text-[14px]">
                                    Cancel
                                </button>
                                <button onClick={submitTwilio} disabled={twilioSubmitting}
                                    className="flex-1 bg-[#F22F46] hover:bg-[#d9283d] px-4 py-2.5 rounded-xl text-white text-[14px] font-medium disabled:opacity-50">
                                    {twilioSubmitting ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-[#444] text-[13px]">
                    <p>Auromind AI securely handles your communication data according to our privacy policy.</p>
                </div>
            </div>
        </div>
    );
}