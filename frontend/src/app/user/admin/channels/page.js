'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Instagram, Mail, Search,
         ChevronDown, Check, X, ChevronRight, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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

    toast.offsetHeight; // trigger reflow

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 48 48" width="62" height="62" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#14c956"/>
        <path d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" fill="white"/>
    </svg>
);

const TwilioIcon = () => (
    <svg viewBox="0 0 48 48" width="62" height="62" xmlns="http://www.w3.org/2000/svg">
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
    type: 'channel',
    category: 'messaging',
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
    type: 'channel',
    category: 'social media',
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
    type: 'channel',
    category: 'sms',
    },
];

const GmailIcon = () => (
    <svg viewBox="0 0 48 48" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M6 40h6V22.5L4 17v21a3 3 0 003 3z"/>
        <path fill="#34A853" d="M36 40h6a3 3 0 003-3V17l-9 5.5z"/>
        <path fill="#FBBC05" d="M36 8l-12 9L12 8H6l18 13L42 8z"/>
        <path fill="#4285F4" d="M4 17l8 5.5V8H6a3 3 0 00-2 2.83z"/>
        <path fill="#C5221F" d="M44 10.83A3 3 0 0042 8h-6v14.5L44 17z"/>
    </svg>
);

const GoogleCalendarIcon = () => (
    <svg viewBox="0 0 48 48" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="36" height="36" rx="3" fill="#fff"/>
        <rect x="6" y="6" width="36" height="10" rx="3" fill="#1A73E8"/>
        <text x="24" y="34" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1A73E8">31</text>
        <rect x="14" y="6" width="4" height="8" rx="2" fill="#fff"/>
        <rect x="30" y="6" width="4" height="8" rx="2" fill="#fff"/>
    </svg>
);

const INTEGRATIONS_DATA = [
    {
        id: 'gmail',
        name: 'Gmail',
        subHeader: 'Google',
        subHeaderBelow: false,
        badgeColor: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        description: 'Connect your WhatsApp business number to automate replies and manage conversations.',
        iconBg: 'from-red-400 via-yellow-400 to-green-400',
        glowColor: 'rgba(251,188,5,0.15)',
        cardBorder: '1px solid #FBBC05',
        categoryLabel: 'Messaging',
        categoryDot: 'bg-yellow-500',
        connectBtnClass: 'text-white',
        connectBtnStyle: { background: '#140D1F', border: '0.2px solid #FBBC05', boxShadow: '0 0 12px -5px #FBBC05' },
        icon: GmailIcon,
        type: 'integration',
        category: 'email',
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        subHeader: 'Google',
        subHeaderBelow: false,
        badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        description: 'Connect your WhatsApp business number to automate replies and manage conversations.',
        iconBg: 'from-blue-400 to-blue-600',
        glowColor: 'rgba(26,115,232,0.15)',
        cardBorder: '1px solid #1A73E8',
        categoryLabel: 'Calendar',
        categoryDot: 'bg-blue-500',
        connectBtnClass: 'text-white',
        connectBtnStyle: { background: '#140D1F', border: '0.2px solid #1A73E8', boxShadow: '0 0 12px -5px #1A73E8' },
        icon: GoogleCalendarIcon,
        type: 'integration',
        category: 'calendar',
    },
];

const ALL_ITEMS = [...CHANNELS_DATA, ...INTEGRATIONS_DATA];

const SORT_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'name-az', label: 'Name A\u2013Z' },
    { value: 'name-za', label: 'Name Z\u2013A' },
    { value: 'connected', label: 'Connected first' },
];

const TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'channel', label: 'Channel' },
    { value: 'integration', label: 'Integration' },
];

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'messaging', label: 'Messaging' },
    { value: 'social media', label: 'Social media' },
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
    { value: 'calendar', label: 'Calendar' },
];

export default function ChannelsPage() {
    const FB_APP_ID  = process.env.NEXT_PUBLIC_FB_APP_ID;
    const WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    const { workspaces, workspaceId } = useAuth();
    const workspace = workspaces.find((item) => item.id === workspaceId) || null;

    useEffect(() => {
        // Load statuses from localStorage
        const waConnected = localStorage.getItem("whatsapp_connected") === "true";
        const waPhone = localStorage.getItem("whatsapp_phone");
        const igConnected = localStorage.getItem("instagram_connected") === "true";
        const igUsername = localStorage.getItem("instagram_username");
        const twConnected = localStorage.getItem("twilio_connected") === "true";
        const twPhone = localStorage.getItem("twilio_phone");

        setStatuses(prev => ({
            ...prev,
            whatsapp: waConnected,
            instagram: igConnected,
            twilio: twConnected
        }));

        if (waPhone) setConnectedInfo(prev => ({ ...prev, whatsapp: waPhone }));
        if (igUsername) setConnectedInfo(prev => ({ ...prev, instagram: igUsername }));
        if (twPhone) setConnectedInfo(prev => ({ ...prev, twilio: twPhone }));
    }, []);

    const loadIntegrationStatus = async () => {
        try {
            if (!workspace?.id) return;
            const response = await fetch(
                `${API}/integrations/status`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                setStatuses(prev => ({
                    ...prev,
                    gmail: data.gmail?.connected || false,
                    google_calendar: data.calendar?.connected || false,
                }));
                if (data.gmail?.email) setConnectedInfo(prev => ({ ...prev, gmail: data.gmail.email }));
                if (data.calendar?.email) setConnectedInfo(prev => ({ ...prev, google_calendar: data.calendar.email }));
            }
        } catch (err) {
            console.error('Failed to load integration status:', err);
        }
    };

    useEffect(() => {
        if (workspace?.id) loadIntegrationStatus();
    }, [workspace?.id]);

    const [statuses, setStatuses] = useState({
        whatsapp: false, instagram: false, gmail: false, twilio: false, google_calendar: false
    });

    const [connecting, setConnecting] = useState(null);
    const [showTwilioModal, setShowTwilioModal] = useState(false);
    const [twilioForm, setTwilioForm] = useState({ sid: '', token: '', phone: '' });
    const [showAuthToken, setShowAuthToken] = useState(false);
    const [twilioSubmitting, setTwilioSubmitting] = useState(false);
    const [connectedInfo, setConnectedInfo] = useState({});

    // ─── Filter / Sort state ─
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [openDropdown, setOpenDropdown] = useState(null); // 'sort' | 'type' | 'category' | null

    const sortRef = useRef(null);
    const typeRef = useRef(null);
    const categoryRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                sortRef.current && !sortRef.current.contains(e.target) &&
                typeRef.current && !typeRef.current.contains(e.target) &&
                categoryRef.current && !categoryRef.current.contains(e.target)
            ) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Filtering + Sorting logic ─
    const filteredItems = useMemo(() => {
        let items = [...ALL_ITEMS];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            items = items.filter(item => item.type === typeFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            items = items.filter(item => item.category === categoryFilter);
        }

        // Sort
        if (sortBy === 'name-az') {
            items.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'name-za') {
            items.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortBy === 'connected') {
            items.sort((a, b) => {
                const aConn = statuses[a.id] ? 1 : 0;
                const bConn = statuses[b.id] ? 1 : 0;
                return bConn - aConn;
            });
        }
        // 'default' keeps original order (no sort)

        return items;
    }, [searchQuery, sortBy, typeFilter, categoryFilter, statuses]);

    const filteredChannels = useMemo(() => filteredItems.filter(i => i.type === 'channel'), [filteredItems]);
    const filteredIntegrations = useMemo(() => filteredItems.filter(i => i.type === 'integration'), [filteredItems]);

    // ─── Listen for WhatsApp embedded signup messages ─
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.origin !== "https://www.facebook.com") return;
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id } = data.data;
                        console.log('WhatsApp signup finished, FB.login callback will handle connection:', { phone_number_id, waba_id });
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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
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
        const REDIRECT_URI = `${window.location.origin}/instagram/callback`;
        const authUrl =
            `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${encodeURIComponent(workspaceId)}` +
            `&scope=${encodeURIComponent('instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_messaging,pages_read_engagement,business_management')}` +
            `&response_type=code`;
        window.location.href = authUrl;
    }, [workspace]);

    const connectInstagramToBackend = async (code) => {
        try {
            const res = await fetch(`/backend/api/instagram/connect`, {
                method: 'POST',
                credentials: 'include',
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

    const connectIntegration = async (integrationId) => {
    setConnecting(integrationId);
    try {
        const backendId = integrationId === 'google_calendar' ? 'calendar' : integrationId;
        const response = await fetch(
            `${API}/integrations/google/auth/${backendId}`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (!response.ok) {
            const error = await response.json();
            alert(`Connection failed: ${error.detail || 'Unknown error'}`);
            return;
        }
        const data = await response.json();
        if (data.authorization_url) {
            window.location.href = data.authorization_url;
        }
    } catch (err) {
        console.error('Integration connect error:', err);
        alert(`Connection failed: ${err.message}`);
    } finally {
        setConnecting(null);
    }
};

const disconnectIntegration = async (integrationId) => {
    if (!confirm(`Disconnect ${integrationId}?`)) return;
    try {
        const backendId = integrationId === 'google_calendar' ? 'calendar' : integrationId;
        await fetch(
            `${API}/integrations/disconnect/google_${backendId}`,
            { method: 'DELETE', credentials: 'include' }
        );
        setStatuses(prev => ({ ...prev, [integrationId]: false }));
        setConnectedInfo(prev => ({ ...prev, [integrationId]: null }));
    } catch (err) {
        console.error('Disconnect failed:', err);
    }
};

    const submitTwilio = async () => {
        const { sid, token, phone } = twilioForm;
        
        if (!sid.trim()) {
            showToast("⚠️ Twilio Account SID is required");
            return;
        }
        if (!token.trim()) {
            showToast("⚠️ Twilio Auth Token is required");
            return;
        }
        if (!phone.trim()) {
            showToast("⚠️ Twilio Phone Number is required");
            return;
        }

        setTwilioSubmitting(true);
        try {
            const res = await fetch(`/backend/twilio/connect`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sid: sid.trim(), 
                    token: token.trim(), 
                    phone: phone.trim(), 
                    workspace_id: workspace?.id 
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || errData.message || 'Failed to save Twilio configuration');
            }

            const data = await res.json();
            if (data.status === 'connected') {
                setStatuses(prev => ({ ...prev, twilio: true }));
                setConnectedInfo(prev => ({ ...prev, twilio: phone.trim() }));
                localStorage.setItem("twilio_connected", "true");
                localStorage.setItem("twilio_phone", phone.trim());
                setShowTwilioModal(false);
                showToast("✅ Twilio configuration saved successfully");
            } else {
                throw new Error(data.message || 'Failed to connect Twilio');
            }
        } catch (err) {
            console.error('Twilio error:', err);
            showToast(`❌ ${err.message || 'An error occurred'}`);
        } finally {
            setTwilioSubmitting(false);
        }
    };

    const handleConnect = (id) => {
        if (statuses[id]) return;
        if (id === 'whatsapp')        startWhatsAppSignup();
        if (id === 'instagram')       startInstagramLogin();
        if (id === 'gmail')           connectIntegration('gmail');
        if (id === 'google_calendar') connectIntegration('google_calendar');
        if (id === 'twilio') {
            const savedPhone = localStorage.getItem("twilio_phone") || '';
            setTwilioForm({ sid: '', token: '', phone: savedPhone });
            setShowAuthToken(false);
            setShowTwilioModal(true);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-6">
                    <div className="pt-2 md:pb-2">
                        <h1 className="text-3xl lg:text-4xl font-medium text-white tracking-tight mb-5">Channels</h1>
                        <p className="text-white/70 text-[15px] max-w-md leading-relaxed mb-4">
                            Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                        </p>
                    </div>                                   

                    <div className="hidden md:flex items-center justify-center flex-shrink-0 pointer-events-none select-none">
                        <Image
                            src="/images/ChannelImage.webp"
                            alt="AI Assistant"
                            className="object-contain drop-shadow-2xl"
                            width={432}
                            height={288}
                            quality={100}
                            priority
                        />
                    </div>
                </div>

                {/* ── Toolbar ── */}
                <div className="flex flex-wrap items-center gap-3 mb-10">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                        <input type="text" placeholder="Search Channels"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#070012] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-[#888] outline-none focus:border-[#333] transition-colors" />
                    </div>

                    {/* Sort by dropdown */}
                    <div className="relative" ref={sortRef}>
                        <button
                            onClick={() => setOpenDropdown(prev => prev === 'sort' ? null : 'sort')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#070012] border border-[#1f1f1f] rounded-xl text-[13px] text-[#aaa] hover:border-[#333] hover:text-white transition-colors">
                            {sortBy === 'default' ? 'Sort by' : SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                            <ChevronDown size={13} className="text-[#555]" />
                        </button>
                        {openDropdown === 'sort' && (
                            <div className="absolute top-full mt-1 right-0 min-w-[160px] rounded-xl py-1 z-50" style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
                                {SORT_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                        onClick={() => { setSortBy(opt.value); setOpenDropdown(null); }}
                                        className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
                                            sortBy === opt.value ? 'text-white bg-white/5' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Type dropdown */}
                    <div className="relative" ref={typeRef}>
                        <button
                            onClick={() => setOpenDropdown(prev => prev === 'type' ? null : 'type')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#070012] border border-[#1f1f1f] rounded-xl text-[13px] text-[#aaa] hover:border-[#333] hover:text-white transition-colors">
                            {typeFilter === 'all' ? 'Type' : TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}
                            <ChevronDown size={13} className="text-[#555]" />
                        </button>
                        {openDropdown === 'type' && (
                            <div className="absolute top-full mt-1 right-0 min-w-[160px] rounded-xl py-1 z-50" style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
                                {TYPE_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                        onClick={() => { setTypeFilter(opt.value); setOpenDropdown(null); }}
                                        className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
                                            typeFilter === opt.value ? 'text-white bg-white/5' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Categories dropdown */}
                    <div className="relative" ref={categoryRef}>
                        <button
                            onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#070012] border border-[#1f1f1f] rounded-xl text-[13px] text-[#aaa] hover:border-[#333] hover:text-white transition-colors">
                            {categoryFilter === 'all' ? 'Categories' : CATEGORY_OPTIONS.find(o => o.value === categoryFilter)?.label}
                            <ChevronDown size={13} className="text-[#555]" />
                        </button>
                        {openDropdown === 'category' && (
                            <div className="absolute top-full mt-1 right-0 min-w-[160px] rounded-xl py-1 z-50" style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
                                {CATEGORY_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                        onClick={() => { setCategoryFilter(opt.value); setOpenDropdown(null); }}
                                        className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
                                            categoryFilter === opt.value ? 'text-white bg-white/5' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Empty state ── */}
                {filteredItems.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-white/40 text-[15px]">No channels or integrations match your filters.</p>
                    </div>
                )}

                {/* ── Channel Cards ── */}
                {filteredChannels.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredChannels.map((item) => {
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
                                        <span className="text-[12px] text-white/60">
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
                )}

                {/* ── Integration Section ── */}
                {filteredIntegrations.length > 0 && (
                <div className="mt-14">
                    <h2 className="text-3xl lg:text-4xl font-medium text-white tracking-tight mb-3">Integration</h2>
                    <p className="text-white/70 text-[15px] max-w-md leading-relaxed mb-8">
                        Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredIntegrations.map((item) => {
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
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 40px ${item.glowColor}, inset 0 0 20px ${item.glowColor}`; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 30px ${item.glowColor}`; }}
                                >
                                    <div className="p-6 flex-1 min-h-[160px]">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                                <Icon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                    <h3 className="text-[17px] font-semibold text-white leading-tight">{item.name}</h3>
                                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                                                        {item.subHeader}
                                                    </span>
                                                </div>
                                                <p className="text-white/60 text-[12px] leading-relaxed">{item.description}</p>
                                                {isConnected && info && <p className="mt-2 text-[11px] text-[#666] font-mono">{info}</p>}
                                                {isConnecting && <p className="mt-2 text-[11px] text-yellow-500 animate-pulse">Connecting...</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 border-t border-[#141414] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isConnected
                                                ? <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                                                : <span className={`w-2 h-2 rounded-full ${item.categoryDot}`} />}
                                            <span className="text-[12px] text-white/60">{isConnected ? 'Connected' : item.categoryLabel}</span>
                                        </div>
                                        {isConnected ? (
                                            <button
                                                onClick={() => disconnectIntegration(item.id)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-[13px] font-medium hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                                                title="Click to disconnect">
                                                <Check size={14} /> Connected
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleConnect(item.id)}
                                                disabled={isConnecting || !workspace}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${item.connectBtnClass} disabled:opacity-40`}
                                                style={item.connectBtnStyle}>
                                                {isConnecting ? <><span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Connecting...</> : <>Connect <ChevronRight size={14} /></>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                )}

                {/* ── Footer ── */}
                <div className="mt-14 text-center text-white/50 text-[12px]">
                    <p>Auromind AI securely handles your communication data according to our privacy policy.</p>
                </div>
            </div>

            {/* ── Twilio Modal ── */}
            {showTwilioModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0d0d0d] border border-[#1f1f1f] p-6 rounded-2xl w-full max-w-[420px] shadow-2xl relative"
                        style={{ boxShadow: '0 0 60px rgba(242,47,70,0.15)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                                    <Zap size={18} color="#fff" />
                                </div>
                                <div>
                                    <h2 className="text-[16px] font-semibold text-white">Connect Twilio</h2>
                                    <p className="text-[11px] text-white/40">Enter your Twilio credentials</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTwilioModal(false)}
                                className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white/40 hover:text-white hover:bg-[#222] transition-colors">
                                <X size={15} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] text-white/50 mb-1.5 uppercase tracking-widest font-medium">Twilio Account SID</label>
                                <input 
                                    type="text" 
                                    placeholder="ACxxxxxxxx..."
                                    value={twilioForm.sid}
                                    onChange={e => setTwilioForm(prev => ({ ...prev, sid: e.target.value }))}
                                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-[#333] outline-none font-mono focus:border-red-500/40 transition-colors" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] text-white/50 mb-1.5 uppercase tracking-widest font-medium">Twilio Auth Token</label>
                                <div className="relative">
                                    <input 
                                        type={showAuthToken ? "text" : "password"} 
                                        placeholder="Your Twilio Auth Token"
                                        value={twilioForm.token}
                                        onChange={e => setTwilioForm(prev => ({ ...prev, token: e.target.value }))}
                                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl pl-4 pr-10 py-2.5 text-white text-[13px] placeholder:text-[#333] outline-none font-mono focus:border-red-500/40 transition-colors" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAuthToken(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                    >
                                        {showAuthToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[11px] text-white/50 mb-1.5 uppercase tracking-widest font-medium">Twilio Phone Number</label>
                                <input 
                                    type="text" 
                                    placeholder="+1234567890"
                                    value={twilioForm.phone}
                                    onChange={e => setTwilioForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-[#333] outline-none font-mono focus:border-red-500/40 transition-colors" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowTwilioModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[#222] text-white/60 hover:text-white hover:border-[#333] text-[13px] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitTwilio} 
                                disabled={twilioSubmitting}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
                            >
                                {twilioSubmitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}   
