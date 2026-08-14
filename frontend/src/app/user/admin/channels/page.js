'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Poppins } from 'next/font/google';
import { Instagram, Mail, Search,
         ChevronDown, Check, X, ChevronRight, Eye, EyeOff, Zap, ExternalLink,Settings,   
         MessageSquare, Phone, RefreshCw, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    variable: '--font-poppins',
});

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

const API = '/api';

const WhatsAppIcon = ({ className = "w-14 h-14 sm:w-14 sm:h-14 lg:w-14 lg:h-14" }) => (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#14c956"/>
        <path d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" fill="white"/>
    </svg>
);

const TwilioIcon = ({ className = "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12" }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="#F22F46"/>
        <circle cx="24" cy="24" r="9" fill="none" stroke="white" strokeWidth="3.5"/>
        <circle cx="24" cy="15.5" r="2.8" fill="white"/>
        <circle cx="24" cy="32.5" r="2.8" fill="white"/>
        <circle cx="15.5" cy="24" r="2.8" fill="white"/>
        <circle cx="32.5" cy="24" r="2.8" fill="white"/>
    </svg>
);

// ── Twilio small icon for modal header ──
const TwilioIconSm = ({ size = 20 }) => (
    <svg viewBox="0 0 48 48" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
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
    subHeaderBelow: true,
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
    hoverGlow: '0 0 25px rgba(73,233,103,0.55), 0 4px 18px rgba(0,0,0,0.5)',
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
    hoverGlow: '0 0 25px rgba(199,54,141,0.55), 0 4px 18px rgba(0,0,0,0.5)',
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
    connectBtnStyle: { background: '#140D1F', border: '0.2px solid #CE272D', boxShadow: '0 0 12px -5px #CE272D' },
    hoverGlow: '0 0 25px rgba(206,39,45,0.55), 0 4px 18px rgba(0,0,0,0.5)',
    icon: TwilioIcon,
    type: 'channel',
    category: 'sms',
    },
];

const GmailIcon = ({ className = "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12" }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
        <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
        <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
        <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
        <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/>
    </svg>
);

const GoogleCalendarIcon = ({ className = "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12" }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <clipPath id="gcal-clip">
                <rect x="2" y="2" width="44" height="44" rx="8"/>
            </clipPath>
        </defs>
        <g clipPath="url(#gcal-clip)">
            {/* Blue — top left */}
            <rect x="2" y="2" width="22" height="22" fill="#1A73E8"/>
            {/* Red — top right */}
            <rect x="24" y="2" width="22" height="22" fill="#EA4335"/>
            {/* Yellow — bottom left */}
            <rect x="2" y="24" width="22" height="22" fill="#FBBC04"/>
            {/* Green — bottom right */}
            <rect x="24" y="24" width="22" height="22" fill="#34A853"/>
        </g>
        {/* White center box */}
        <rect x="12" y="12" width="24" height="24" rx="3" fill="white"/>
        {/* 31 */}
        <text x="24" y="29.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A73E8" fontFamily="sans-serif">31</text>
    </svg>
);

const INTEGRATIONS_DATA = [
    {
        id: 'gmail',
        name: 'Gmail',
        subHeader: 'Google',
        subHeaderBelow: true,
        badgeColor: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        description: 'Connect your Gmail account to manage outreach, draft replies, and monitor inboxes.',
        iconBg: 'from-red-400 via-yellow-400 to-green-400',
        glowColor: 'rgba(251,188,5,0.15)',
        cardBorder: '1px solid #FBBC05',
        categoryLabel: 'Messaging',
        categoryDot: 'bg-yellow-500',
        connectBtnClass: 'text-white',
        connectBtnStyle: { background: '#140D1F', border: '0.2px solid #FBBC05', boxShadow: '0 0 12px -5px #FBBC05' },
        hoverGlow: '0 0 25px rgba(251,188,5,0.55), 0 4px 18px rgba(0,0,0,0.5)',
        icon: GmailIcon,
        type: 'integration',
        category: 'email',
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        subHeader: 'Google',
        subHeaderBelow: true,
        badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        description: 'Sync availability, coordinate meetings, and book appointments automatically in Google Calendar.',
        iconBg: 'from-blue-400 to-blue-600',
        glowColor: 'rgba(26,115,232,0.15)',
        cardBorder: '1px solid #1A73E8',
        categoryLabel: 'Calendar',
        categoryDot: 'bg-blue-500',
        connectBtnClass: 'text-white',
        connectBtnStyle: { background: '#140D1F', border: '0.2px solid #1A73E8', boxShadow: '0 0 12px -5px #1A73E8' },
        hoverGlow: '0 0 25px rgba(26,115,232,0.55), 0 4px 18px rgba(0,0,0,0.5)',
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

// ── Twilio Onboarding Modal ──────────────────────// ── Twilio Onboarding Modal ───────────────────────────────────────────────────
// Step labels for progress bar
const TWILIO_STEPS = [
    { num: 1, label: 'Credentials' },
    { num: 2, label: 'Connect' },
];

function TwilioOnboardingModal({
    twilioStep,
    setTwilioStep,
    twilioForm,
    setTwilioForm,
    showAuthToken,
    setShowAuthToken,
    twilioSubmitting,
    submitTwilio,
}) {
    if (twilioStep === null) return null;

    const isSuccess = twilioStep === 'success';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
            {/* Modal container */}
            <div
                className="relative w-full max-w-[480px] sm:max-w-[500px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(145deg, #0f0305 0%, #0d0d0d 60%, #0a0305 100%)',
                    border: '1px solid rgba(242,47,70,0.18)',
                    boxShadow: '0 0 80px rgba(242,47,70,0.12), 0 0 0 1px rgba(255,255,255,0.03), 0 24px 60px rgba(0,0,0,0.6)',
                }}
            >
                {/* Top gradient line */}
                <div
                    className="h-px w-full shrink-0"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(242,47,70,0.8) 30%, rgba(242,47,70,1) 50%, rgba(242,47,70,0.8) 70%, transparent 100%)',
                    }}
                />

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #F22F46 0%, #9b1c2e 100%)',
                                boxShadow: '0 0 12px rgba(242,47,70,0.4)',
                            }}
                        >
                            <TwilioIconSm size={16} />
                        </div>
                        <span className="text-xs sm:text-[13px] font-semibold text-white/70 tracking-wide">
                            Connect Twilio
                        </span>
                    </div>
                    <button
                        onClick={() => setTwilioStep(null)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                        <X size={13} className="text-white/50" />
                    </button>
                </div>

                {/* Step Progress (hidden on success) */}
                {!isSuccess && (
                    <div className="px-4 sm:px-6 pb-4 shrink-0">
                        <div className="flex items-center gap-1.5 mb-2">
                            {TWILIO_STEPS.map((s) => {
                                const active = typeof twilioStep === 'number' && twilioStep >= s.num;
                                return (
                                    <div key={s.num} className="flex-1 relative">
                                        <div
                                            className="h-1 rounded-full transition-all duration-500"
                                            style={{
                                                background: active
                                                    ? 'linear-gradient(90deg, #F22F46, #ff6b7a)'
                                                    : 'rgba(255,255,255,0.07)',
                                                boxShadow: active ? '0 0 8px rgba(242,47,70,0.5)' : 'none',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-white/25 font-medium">
                            Step {twilioStep} of 2
                        </p>
                    </div>
                )}

                {/* ─── Step Content ─────────────────────────────────────── */}
                <div className="px-4 sm:px-6 pb-5 sm:pb-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* ── STEP 1: Get Credentials ── */}
                    {twilioStep === 1 && (
                        <div>
                            <h2 className="text-lg sm:text-[20px] font-semibold text-white mb-1.5 tracking-tight">Get Your Credentials</h2>
                            <p className="text-xs sm:text-[13px] text-white/60 mb-4 sm:mb-5 leading-relaxed">
                                Follow these steps to retrieve your Twilio credentials.
                            </p>

                            <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
                                {[
                                    {
                                        num: 1,
                                        title: 'Login to Twilio Console',
                                        desc: 'Go to https://console.twilio.com and sign in.',
                                    },
                                    {
                                        num: 2,
                                        title: 'Copy Account SID',
                                        desc: 'Find your Account SID on the main dashboard.',
                                    },
                                    {
                                        num: 3,
                                        title: 'Copy Auth Token',
                                        desc: 'Find your Auth Token under Account → General Settings.',
                                    },
                                    {
                                        num: 4,
                                        title: 'Get Your Phone Number',
                                        desc: 'Purchase or use an existing WhatsApp-enabled number.',
                                    },
                                    {
                                        num: 5,
                                        title: 'Connect Your Twilio Account by using below mentioned link',
                                        desc: 'www.example.com',
                                    },  
                                ].map((step) => (
                                    <div
                                        key={step.num}
                                        className="flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-3.5 rounded-xl transition-all duration-200"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,47,70,0.2)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                    >
                                        <div
                                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] sm:text-[11px] font-bold"
                                            style={{
                                                background: 'rgba(242,47,70,0.15)',
                                                border: '1px solid rgba(242,47,70,0.3)',
                                                color: '#F22F46',
                                            }}
                                        >
                                            {step.num}
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-[13px] font-regular text-white mb-0.5">{step.title}</div>
                                            <div className="text-[10px] sm:text-[11px] text-white/60 leading-relaxed">{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Open Console link */}
                            <a
                                href="https://console.twilio.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-medium mb-4 sm:mb-5 transition-all duration-200"
                                style={{
                                    border: '1px solid rgba(242,47,70,0.3)',
                                    color: '#F22F46',
                                    background: 'rgba(242,47,70,0.05)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,47,70,0.1)'; e.currentTarget.style.borderColor = 'rgba(242,47,70,0.5)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(242,47,70,0.05)'; e.currentTarget.style.borderColor = 'rgba(242,47,70,0.3)'; }}
                            >
                                <ExternalLink size={13} />
                                Open Twilio Console
                            </a>

                            <button
                                onClick={() => setTwilioStep(2)}
                                className="w-full py-2.5 rounded-xl text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #F22F46 0%, #c0233a 100%)',
                                    boxShadow: '0 0 20px rgba(242,47,70,0.28)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(242,47,70,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(242,47,70,0.28)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                I Have My Credentials <ChevronRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Enter Credentials ── */}
                    {twilioStep === 2 && (
                        <div>
                            <h2 className="text-lg sm:text-[20px] font-semibold text-white mb-1.5 tracking-tight">Enter Your Credentials</h2>
                            <p className="text-xs sm:text-[13px] text-white/60 mb-4 sm:mb-5 leading-relaxed">
                                Paste your Twilio details below to complete the connection.
                            </p>

                            <div className="space-y-3.5 sm:space-y-4 mb-5 sm:mb-6">
                                <div>
                                    <label className="block text-[10px] sm:text-[11px] text-white/60 mb-1 sm:mb-1.5 uppercase tracking-widest font-medium">
                                        Twilio Account SID
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ACxxxxxxxx..."
                                        value={twilioForm.sid}
                                        onChange={e => setTwilioForm(prev => ({ ...prev, sid: e.target.value }))}
                                        className="w-full rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(242,47,70,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,47,70,0.06)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] sm:text-[11px] text-white/60 mb-1 sm:mb-1.5 uppercase tracking-widest font-medium">
                                        Twilio Auth Token
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAuthToken ? 'text' : 'password'}
                                            placeholder="Your Twilio Auth Token"
                                            value={twilioForm.token}
                                            onChange={e => setTwilioForm(prev => ({ ...prev, token: e.target.value }))}
                                            className="w-full rounded-xl pl-3 sm:pl-4 pr-10 sm:pr-11 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.09)',
                                            }}
                                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(242,47,70,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,47,70,0.06)'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAuthToken(prev => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                        >
                                            {showAuthToken ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] sm:text-[11px] text-white/60 mb-1 sm:mb-1.5 uppercase tracking-widest font-medium">
                                        Twilio Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+1234567890"
                                        value={twilioForm.phone}
                                        onChange={e => setTwilioForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(242,47,70,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,47,70,0.06)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <p className="text-[10px] text-white/45 mt-1">Use a WhatsApp-enabled number</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5 sm:gap-3">
                                <button
                                    onClick={() => setTwilioStep(1)}
                                    disabled={twilioSubmitting}
                                    className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-[13px] text-white/50 transition-all duration-200 disabled:opacity-30"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    onMouseEnter={e => { if (!twilioSubmitting) { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={submitTwilio}
                                    disabled={twilioSubmitting}
                                    className="flex-1 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                                    style={{
                                        background: 'linear-gradient(135deg, #F22F46 0%, #c0233a 100%)',
                                        boxShadow: '0 0 20px rgba(242,47,70,0.3)',
                                    }}
                                    onMouseEnter={e => { if (!twilioSubmitting) { e.currentTarget.style.boxShadow = '0 0 28px rgba(242,47,70,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={e => { if (!twilioSubmitting) { e.currentTarget.style.boxShadow = '0 0 20px rgba(242,47,70,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                >
                                    {twilioSubmitting ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>Connect <ChevronRight size={14} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS SCREEN ── */}
                    {twilioStep === 'success' && (
                        <div className="text-center py-4 sm:py-5">
                            <div
                                className="w-16 h-16 sm:w-[80px] sm:h-[80px] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
                                style={{
                                    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.04) 70%)',
                                    border: '2px solid rgba(34,197,94,0.3)',
                                    boxShadow: '0 0 50px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.05)',
                                    animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                            >
                                <Check size={30} className="text-green-400" strokeWidth={2.5} />
                            </div>

                            <h2 className="text-lg sm:text-[20px] font-semibold text-white mb-2 tracking-tight">
                                Twilio Connected Successfully
                            </h2>
                            <p className="text-xs sm:text-[13px] text-white/45 leading-relaxed max-w-[280px] mx-auto mb-6 sm:mb-8">
                                You can now send and receive WhatsApp and SMS messages through Twilio.
                            </p>

                            <button
                                onClick={() => setTwilioStep(null)}
                                className="px-8 sm:px-10 py-2.5 sm:py-3 rounded-xl text-white font-semibold text-xs sm:text-[14px] transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                    boxShadow: '0 0 24px rgba(34,197,94,0.3)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(34,197,94,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(34,197,94,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                Done
                            </button>

                            <style>{`
                                @keyframes scaleIn {
                                    0% { transform: scale(0); opacity: 0; }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                            `}</style>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChannelsPage() {
    const FB_APP_ID  = process.env.NEXT_PUBLIC_FB_APP_ID;
    const WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    const { workspaces, workspaceId } = useAuth();
    const workspace = workspaces.find((item) => item.id === workspaceId) || null;

    const [statuses, setStatuses] = useState(() => {
        if (typeof window === 'undefined') return { whatsapp: false, instagram: false, gmail: false, twilio: false, google_calendar: false };
        return {
            whatsapp: localStorage.getItem("whatsapp_connected") === "true",
            instagram: localStorage.getItem("instagram_connected") === "true",
            gmail: false,
            twilio: localStorage.getItem("twilio_connected") === "true",
            google_calendar: false
        };
    });
    const [hoveredBtn, setHoveredBtn] = useState(null);
    const [connecting, setConnecting] = useState(null);

    // ── Twilio state ────────────────────────────────────────────────────────
    const [showTwilioModal, setShowTwilioModal] = useState(false);
    const [twilioStep, setTwilioStep] = useState(null);
    const [twilioForm, setTwilioForm] = useState({ sid: '', token: '', phone: '' });
    const [showAuthToken, setShowAuthToken] = useState(false);
    const [twilioSubmitting, setTwilioSubmitting] = useState(false);
    const [connectedInfo, setConnectedInfo] = useState(() => {
        if (typeof window === 'undefined') return {};
        const waPhone = localStorage.getItem("whatsapp_phone");
        const igUsername = localStorage.getItem("instagram_username");
        const twPhone = localStorage.getItem("twilio_phone");
        const info = {};
        if (waPhone) info.whatsapp = waPhone;
        if (igUsername) info.instagram = igUsername;
        if (twPhone) info.twilio = twPhone;
        return info;
    });
    const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
    const [whatsappWabaId, setWhatsappWabaId] = useState('');

    const loadIntegrationStatus = useCallback(async () => {
        try {
            if (!workspace?.id) return;
            const data = await api.getIntegrationStatus();
            setStatuses(prev => ({
                ...prev,
                gmail: data.gmail?.connected || false,
                google_calendar: data.calendar?.connected || false,
                whatsapp: data.whatsapp?.connected || false,
                instagram: data.instagram?.connected || false,
                twilio: data.twilio?.connected || false,
            }));
            if (data.gmail?.email) setConnectedInfo(prev => ({ ...prev, gmail: data.gmail.email }));
            if (data.calendar?.email) setConnectedInfo(prev => ({ ...prev, google_calendar: data.calendar.email }));
           
            // Sync WhatsApp Status and Info
            if (data.whatsapp?.connected) {
                setConnectedInfo(prev => ({ ...prev, whatsapp: data.whatsapp.phone || "Connected" }));
                setWhatsappPhoneId(data.whatsapp.phone_number_id || '');
                setWhatsappWabaId(data.whatsapp.waba_id || '');
                localStorage.setItem("whatsapp_connected", "true");
                if (data.whatsapp.phone) localStorage.setItem("whatsapp_phone", data.whatsapp.phone);
            } else {
                setWhatsappPhoneId('');
                setWhatsappWabaId('');
                localStorage.removeItem("whatsapp_connected");
                localStorage.removeItem("whatsapp_phone");
            }

            // Sync Instagram Status and Info
            if (data.instagram?.connected) {
                setConnectedInfo(prev => ({ ...prev, instagram: data.instagram.username || "Connected" }));
                localStorage.setItem("instagram_connected", "true");
                if (data.instagram.username) localStorage.setItem("instagram_username", data.instagram.username);
            } else {
                localStorage.removeItem("instagram_connected");
                localStorage.removeItem("instagram_username");
            }

            // Sync Twilio Status and Info
            if (data.twilio?.connected) {
                setConnectedInfo(prev => ({ ...prev, twilio: data.twilio.phone || "Connected" }));
                localStorage.setItem("twilio_connected", "true");
                if (data.twilio.phone) localStorage.setItem("twilio_phone", data.twilio.phone);
            } else {
                localStorage.removeItem("twilio_connected");
                localStorage.removeItem("twilio_phone");
            }
        } catch (err) {
            console.error('Failed to load integration status:', err);
        }
    }, [workspace]);

    const loadChannelsStatus = async () => {
        try {
            if (!workspace?.id) return;
            const data = await api.getChannelsStatus(workspace.id);
            setStatuses(prev => ({
                ...prev,
                whatsapp: data.whatsapp?.connected || false,
                instagram: data.instagram?.connected || false,
                twilio: data.twilio?.connected || false,
            }));
            if (data.whatsapp?.phone) setConnectedInfo(prev => ({ ...prev, whatsapp: data.whatsapp.phone }));
            if (data.whatsapp?.phone_number_id) setWhatsappPhoneId(data.whatsapp.phone_number_id);
            if (data.whatsapp?.waba_id) setWhatsappWabaId(data.whatsapp.waba_id);
            if (data.instagram?.username) setConnectedInfo(prev => ({ ...prev, instagram: data.instagram.username }));
            if (data.twilio?.phone) setConnectedInfo(prev => ({ ...prev, twilio: data.twilio.phone }));
        } catch (err) {
            console.error('Failed to load channels status:', err);
        }
    };

    useEffect(() => {
        if (!workspace?.id) return;
        const fetchStatus = async () => {
            await loadIntegrationStatus();
        };
        fetchStatus();
    }, [workspace?.id, loadIntegrationStatus]);

    // ─── Detect successful Twilio connection and advance to success screen ───
    // Watches twilioSubmitting transition (true → false) while on step 2
    const prevTwilioSubmitting = useRef(false);
    useEffect(() => {
        if (prevTwilioSubmitting.current === true && !twilioSubmitting && statuses.twilio && twilioStep === 2) {
            setTwilioStep('success');
        }
        prevTwilioSubmitting.current = twilioSubmitting;
    }, [twilioSubmitting, statuses.twilio, twilioStep]);
    // ────────────────────────────────────────────────────────────────────────

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

    // ─ Filtering + Sorting logic ─
    const filteredItems = useMemo(() => {
        let items = [...ALL_ITEMS];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q))
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            items = items.filter(item => item.type === typeFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            items = items.filter(item =>
                (item.category && item.category.toLowerCase() === categoryFilter.toLowerCase()) ||
                (item.categoryLabel && item.categoryLabel.toLowerCase().includes(categoryFilter.toLowerCase()))
            );
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

    // ─ Listen for WhatsApp embedded signup messages ─
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.origin !== "https://www.facebook.com") return;
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id } = data.data;
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

    const connectWhatsAppToBackend = async (payload) => {
        try {
            const data = await api.connectWhatsApp({ ...payload, workspace_id: workspace?.id });
            if (data.status === 'connected') {
                setStatuses(prev => ({ ...prev, whatsapp: true }));
                setConnectedInfo(prev => ({ ...prev, whatsapp: data.phone_number || data.display_number }));
                setWhatsappPhoneId(data.phone_number_id || '');
                setWhatsappWabaId(data.waba_id || '');
                localStorage.setItem("whatsapp_connected", "true");
            }
        } catch (err) {
            console.error('WhatsApp connect error:', err);
        } finally {
            setConnecting(null);
        }
    };

    const startWhatsAppSignup = () => {
        if (typeof window === 'undefined' || !window.FB) {
            alert("Facebook SDK is not loaded yet. If you are using an adblocker or private browsing mode, please disable tracking protection for this site and try again in a moment.");
            return;
        }
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
            const data = await api.connectInstagram({ code, workspace_id: workspace?.id });
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
        const data = await api.connectGoogleAuth(backendId);
        if (data.authorization_url) {
            window.location.assign(data.authorization_url);
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
        await api.disconnectGoogleIntegration(backendId);
        setStatuses(prev => ({ ...prev, [integrationId]: false }));
        setConnectedInfo(prev => ({ ...prev, [integrationId]: null }));
    } catch (err) {
        console.error('Disconnect failed:', err);
    }
};

const disconnectChannel = async (channelId) => {
    if (!confirm(`Disconnect ${channelId === 'whatsapp' ? 'WhatsApp Business' : channelId === 'instagram' ? 'Instagram' : 'Twilio'}?`)) return;
    try {
        await api.disconnectChannel(channelId, workspace.id);
        setStatuses(prev => ({ ...prev, [channelId]: false }));
        setConnectedInfo(prev => ({ ...prev, [channelId]: null }));
        localStorage.removeItem(`${channelId}_connected`);
        localStorage.removeItem(`${channelId}_phone`);
        localStorage.removeItem(`${channelId}_username`);
        showToast(`Disconnected ${channelId === 'whatsapp' ? 'WhatsApp Business' : channelId === 'instagram' ? 'Instagram' : 'Twilio'} successfully`);
    } catch (err) {
        console.error('Disconnect failed:', err);
    }
};

    // ── submitTwilio — EXISTING FUNCTION, NOT MODIFIED ──────────────────────
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
            const data = await api.connectTwilio({
                sid: sid.trim(),
                token: token.trim(),
                phone: phone.trim(),
                workspace_id: workspace?.id
            });

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
    // ────────────────────────────────────────────────────────────────────────

    const handleConnect = (id) => {
        if (statuses[id]) return;
        triggerConnect(id);
    };

    // Reconnect bypasses the "already connected" guard
    const handleReconnect = (id) => {
        setStatuses(prev => ({ ...prev, [id]: false }));
        setConnectedInfo(prev => ({ ...prev, [id]: null }));
        triggerConnect(id);
    };

    const triggerConnect = (id) => {
        if (id === 'whatsapp')        startWhatsAppSignup();
        if (id === 'instagram')       startInstagramLogin();
        if (id === 'gmail')           connectIntegration('gmail');
        if (id === 'google_calendar') connectIntegration('google_calendar');
        if (id === 'twilio') {
            // Open the new onboarding modal at step 1
            const savedPhone = localStorage.getItem("twilio_phone") || '';
            setTwilioForm({ sid: '', token: '', phone: savedPhone });
            setShowAuthToken(false);
            setTwilioStep(1);
        }
    };

    return (
        <div className={`w-full h-full min-h-screen bg-black text-white overflow-y-auto custom-scrollbar ${poppins.className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">

                {/*  Header  */}
                <div className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold sm:font-medium text-white tracking-tight mb-2 sm:mb-3">
                        Channels
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm lg:text-[15px] max-w-xl leading-relaxed">
                        Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                    </p>
                </div>

                {/*  Toolbar  */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 sm:mb-8 lg:mb-10">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px] lg:min-w-[260px]">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
                        <input
                            type="text"
                            placeholder="Search Channels"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#070012] border border-[#1f1f1f] rounded-xl py-2 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-xs sm:text-sm text-white placeholder:text-[#666] outline-none focus:border-[#444] transition-colors"
                        />
                    </div>

                    {/* Filter Dropdowns Container */}
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0 relative z-30">
                        {/* Sort by dropdown */}
                        <div className="relative" ref={sortRef}>
                            <button
                                onClick={() => setOpenDropdown(prev => prev === 'sort' ? null : 'sort')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] transition-all whitespace-nowrap border ${
                                    sortBy !== 'default'
                                        ? 'bg-[#7C4DFF]/15 border-[#7C4DFF]/40 text-[#7C4DFF] font-semibold'
                                        : 'bg-[#070012] border-[#1f1f1f] text-[#aaa] hover:border-[#333] hover:text-white'
                                }`}
                            >
                                <span>{sortBy === 'default' ? 'Sort by' : SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                                <ChevronDown size={13} className={`shrink-0 transition-transform ${openDropdown === 'sort' ? 'rotate-180 text-white' : 'text-[#555]'}`} />
                            </button>
                            {openDropdown === 'sort' && (
                                <div className="absolute top-full mt-1.5 right-0 min-w-[160px] rounded-xl py-1.5 z-[100] bg-[#120C24] border border-white/10 shadow-2xl backdrop-blur-xl">
                                    {SORT_OPTIONS.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setSortBy(opt.value); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2 text-xs sm:text-[13px] font-medium transition-colors flex items-center justify-between ${
                                                sortBy === opt.value ? 'text-[#7C4DFF] bg-[#7C4DFF]/10 font-bold' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                            }`}>
                                            <span>{opt.label}</span>
                                            {sortBy === opt.value && <Check size={12} className="text-[#7C4DFF]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Type dropdown */}
                        <div className="relative" ref={typeRef}>
                            <button
                                onClick={() => setOpenDropdown(prev => prev === 'type' ? null : 'type')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] transition-all whitespace-nowrap border ${
                                    typeFilter !== 'all'
                                        ? 'bg-[#7C4DFF]/15 border-[#7C4DFF]/40 text-[#7C4DFF] font-semibold'
                                        : 'bg-[#070012] border-[#1f1f1f] text-[#aaa] hover:border-[#333] hover:text-white'
                                }`}
                            >
                                <span>{typeFilter === 'all' ? 'Type' : TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}</span>
                                <ChevronDown size={13} className={`shrink-0 transition-transform ${openDropdown === 'type' ? 'rotate-180 text-white' : 'text-[#555]'}`} />
                            </button>
                            {openDropdown === 'type' && (
                                <div className="absolute top-full mt-1.5 right-0 min-w-[160px] rounded-xl py-1.5 z-[100] bg-[#120C24] border border-white/10 shadow-2xl backdrop-blur-xl">
                                    {TYPE_OPTIONS.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setTypeFilter(opt.value); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2 text-xs sm:text-[13px] font-medium transition-colors flex items-center justify-between ${
                                                typeFilter === opt.value ? 'text-[#7C4DFF] bg-[#7C4DFF]/10 font-bold' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                            }`}>
                                            <span>{opt.label}</span>
                                            {typeFilter === opt.value && <Check size={12} className="text-[#7C4DFF]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Categories dropdown */}
                        <div className="relative" ref={categoryRef}>
                            <button
                                onClick={() => setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] transition-all whitespace-nowrap border ${
                                    categoryFilter !== 'all'
                                        ? 'bg-[#7C4DFF]/15 border-[#7C4DFF]/40 text-[#7C4DFF] font-semibold'
                                        : 'bg-[#070012] border-[#1f1f1f] text-[#aaa] hover:border-[#333] hover:text-white'
                                }`}
                            >
                                <span>{categoryFilter === 'all' ? 'Categories' : CATEGORY_OPTIONS.find(o => o.value === categoryFilter)?.label}</span>
                                <ChevronDown size={13} className={`shrink-0 transition-transform ${openDropdown === 'category' ? 'rotate-180 text-white' : 'text-[#555]'}`} />
                            </button>
                            {openDropdown === 'category' && (
                                <div className="absolute top-full mt-1.5 right-0 min-w-[160px] rounded-xl py-1.5 z-[100] bg-[#120C24] border border-white/10 shadow-2xl backdrop-blur-xl">
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setCategoryFilter(opt.value); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2 text-xs sm:text-[13px] font-medium transition-colors flex items-center justify-between ${
                                                categoryFilter === opt.value ? 'text-[#7C4DFF] bg-[#7C4DFF]/10 font-bold' : 'text-[#aaa] hover:text-white hover:bg-white/5'
                                            }`}>
                                            <span>{opt.label}</span>
                                            {categoryFilter === opt.value && <Check size={12} className="text-[#7C4DFF]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reset filters button */}
                        {(sortBy !== 'default' || typeFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setSortBy('default');
                                    setTypeFilter('all');
                                    setCategoryFilter('all');
                                    setSearchQuery('');
                                }}
                                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1.5 transition-colors underline underline-offset-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/*  Empty state  */}
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 sm:py-20">
                        <p className="text-white/40 text-xs sm:text-sm lg:text-[15px]">No channels or integrations match your filters.</p>
                    </div>
                )}

                {/*  Channel Cards  */}
                {/* ─────────────────────────────────────────────────────────────
                    Channel Cards
                ───────────────────────────────────────────────────────────── */}
                {filteredChannels.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {filteredChannels.map((item) => {
                 const isConnected = statuses[item.id];
                const isConnecting = connecting === item.id;
                const Icon = item.icon;
                const info = connectedInfo[item.id];

            return (
                <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden flex flex-col min-h-[190px] sm:min-h-[200px] transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, #070912 0%, #05050d 100%)',
                        border: item.cardBorder,
                        boxShadow: `0 0 24px ${item.glowColor}`,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                            `0 0 38px ${item.glowColor}, inset 0 0 22px ${item.glowColor}`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                            `0 0 24px ${item.glowColor}`;
                    }}
                >
                    {/* ───────────── Card Main Content ───────────── */}
                    <div className="flex-1 px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                        <div className="flex items-start gap-4 sm:gap-5">

                            {/* Icon */}
                            <div
                                className={`
                                    w-14 h-14 sm:w-16 sm:h-16
                                    rounded-xl sm:rounded-2xl
                                    bg-gradient-to-br ${item.iconBg}
                                    flex items-center justify-center
                                    flex-shrink-0 shadow-lg
                                `}
                            >
                                <Icon
                                    className={
                                        item.id === 'instagram'
                                            ? "w-8 h-8 sm:w-9 sm:h-9 text-white"
                                            : "w-9 h-9 sm:w-10 sm:h-10"
                                    }
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">

                                {/* Title + Badge */}
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                    <h3 className="text-[17px] sm:text-[18px] font-semibold text-white leading-tight">
                                        {item.name}
                                    </h3>

                                    {item.subHeader && (
                                        <span
                                            className={`
                                                inline-flex items-center
                                                px-2.5 py-1
                                                rounded-full
                                                text-[9px] sm:text-[10px]
                                                font-semibold
                                                tracking-wide
                                                ${item.badgeColor}
                                            `}
                                        >
                                            {item.subHeader}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-white/65 text-xs sm:text-[13px] leading-relaxed max-w-[430px]">
                                    {item.description}
                                </p>

                                {/* Connecting */}
                                {isConnecting && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span className="text-[11px] text-yellow-400">
                                            Connecting...
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ───────────── Bottom Section ───────────── */}
                    <div
                        className="
                            px-5 sm:px-6
                            py-3.5 sm:py-4
                            border-t border-white/[0.07]
                            flex items-center justify-between
                            gap-3
                        "
                    >
                        {/* Connected information */}
                        <div className="flex items-center min-w-0 flex-1">

                            {/* Status */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isConnected ? (
                                    <span
                                        className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0"
                                        style={{
                                            boxShadow:
                                                '0 0 8px rgba(74,222,128,0.8)',
                                        }}
                                    />
                                ) : (
                                    <span
                                        className={`
                                            w-2.5 h-2.5 rounded-full
                                            ${item.categoryDot}
                                            shrink-0
                                        `}
                                    />
                                )}

                                <span className="text-xs sm:text-[13px] text-white/70">
                                    {isConnected
                                        ? 'Connected'
                                        : item.categoryLabel}
                                </span>
                            </div>

                            {/* Divider */}
                            {isConnected && info && (
                                <>
                                    <span className="mx-3 sm:mx-4 h-4 w-px bg-white/10" />

                                    {/* Connected info */}
                                    <div className="min-w-0">
                                        <span className="text-xs sm:text-[13px] text-white/60 truncate block max-w-[170px] sm:max-w-[220px]">
                                            {info}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ───────────── Actions ───────────── */}
                        <div className="flex items-center gap-1.5 shrink-0">

                            {isConnected ? (
                                <>
                                    {/* Manage */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (item.id === 'twilio') {
                                                const savedPhone =
                                                    localStorage.getItem(
                                                        'twilio_phone'
                                                    ) || '';

                                                setTwilioForm({
                                                    sid: '',
                                                    token: '',
                                                    phone: savedPhone,
                                                });

                                                setShowAuthToken(false);
                                                setTwilioStep(1);
                                            } else {
                                                handleReconnect(item.id);
                                            }
                                        }}
                                        className="
                                            px-4 sm:px-5
                                            py-2 sm:py-2.5
                                            rounded-xl
                                            border border-white/[0.12]
                                            bg-white/[0.02]
                                            text-white/85
                                            text-xs sm:text-[13px]
                                            font-medium
                                            hover:bg-white/[0.07]
                                            hover:border-white/[0.2]
                                            hover:text-white
                                            transition-all duration-200
                                        "
                                    >
                                        Manage
                                    </button>

                                    {/* Settings */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (item.id === 'whatsapp' || item.id === 'instagram' || item.id === 'twilio') {
                                                disconnectChannel(item.id);
                                            } else {
                                                disconnectIntegration(item.id);
                                            }
                                        }}
                                        className="
                                            w-9 h-9 sm:w-10 sm:h-10
                                            rounded-xl
                                            border border-white/[0.12]
                                            bg-white/[0.02]
                                            flex items-center justify-center
                                            text-white/50
                                            hover:text-white
                                            hover:bg-white/[0.07]
                                            hover:border-white/[0.2]
                                            transition-all duration-200
                                        "
                                        title="Channel settings"
                                    >
                                        <Settings
                                            size={15}
                                            className="transition-transform duration-300 group-hover:rotate-45"
                                        />
                                    </button>
                                </>
                            ) : (
                                /* Connect button */
                                <button
                                    onClick={() => handleConnect(item.id)}
                                    disabled={isConnecting || !workspace}
                                    className={`
                                        group/btn
                                        relative overflow-hidden
                                        flex items-center gap-1.5 sm:gap-2
                                        px-4 sm:px-5
                                        py-2 sm:py-2.5
                                        rounded-xl
                                        text-xs sm:text-[13px]
                                        font-semibold
                                        transition-all duration-300
                                        hover:-translate-y-0.5
                                        hover:scale-[1.03]
                                        active:scale-95
                                        ${item.connectBtnClass}
                                        disabled:opacity-40
                                        disabled:cursor-not-allowed
                                        disabled:transform-none
                                        disabled:shadow-none
                                    `}
                                    style={item.connectBtnStyle}
                                    onMouseEnter={(e) => {
                                        if (
                                            !isConnecting &&
                                            workspace &&
                                            item.hoverGlow
                                        ) {
                                            e.currentTarget.style.boxShadow =
                                                item.hoverGlow;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (
                                            !isConnecting &&
                                            workspace &&
                                            item.connectBtnStyle?.boxShadow
                                        ) {
                                            e.currentTarget.style.boxShadow =
                                                item.connectBtnStyle.boxShadow;
                                        }
                                    }}
                                >
                                    {/* Shimmer */}
                                    <span
                                        className="
                                            absolute inset-0
                                            w-full h-full
                                            bg-gradient-to-r
                                            from-transparent
                                            via-white/20
                                            to-transparent
                                            -translate-x-full
                                            group-hover/btn:translate-x-full
                                            transition-transform
                                            duration-700
                                            ease-in-out
                                            pointer-events-none
                                        "
                                    />

                                    {isConnecting ? (
                                        <>
                                            <span className="
                                                w-3.5 h-3.5
                                                border-2
                                                border-white/20
                                                border-t-white
                                                rounded-full
                                                animate-spin
                                            " />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative z-10">
                                                Connect
                                            </span>

                                            <ChevronRight
                                                size={13}
                                                className="
                                                    relative z-10
                                                    transition-transform
                                                    duration-300
                                                    group-hover/btn:translate-x-1
                                                "
                                            />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
)}

                {/*  Integration Section  */}
                        {filteredIntegrations.length > 0 && (
                <div className="mt-10 sm:mt-14">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold sm:font-medium text-white tracking-tight mb-2 sm:mb-3">
                    Integration
                </h2>

                <p className="text-white/70 text-xs sm:text-sm lg:text-[15px] max-w-xl leading-relaxed mb-6 sm:mb-8">
                    Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                </p>

                {/* 2 COLUMN GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
                    {filteredIntegrations.map((item) => {
                        const isConnected = statuses[item.id];
                const isConnecting = connecting === item.id;
                const Icon = item.icon;
                const info = connectedInfo[item.id];

                return (
                    <div
                        key={item.id}
                        className="relative group rounded-2xl transition-all duration-300 flex flex-col overflow-hidden"
                        style={{
                            background: '#070012',
                            border: item.cardBorder,
                            boxShadow: `0 0 30px ${item.glowColor}`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                                `0 0 40px ${item.glowColor}, inset 0 0 20px ${item.glowColor}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                                `0 0 30px ${item.glowColor}`;
                        }}
                    >
                        {/* ================= CARD BODY ================= */}
                        <div className="p-4 sm:p-5 lg:p-6 flex-1 min-h-[140px] sm:min-h-[160px]">
                            <div className="flex items-start gap-3 sm:gap-4">

                                {/* EXISTING ICON - DON'T CHANGE */}
                                <div className="w-12 h-12 sm:w-13 sm:h-13 lg:w-14 lg:h-14 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12" />
                                </div>

                                {/* CONTENT */}
                                <div className="flex-1 min-w-0">

                                    {/* NAME + BADGE */}
                                    {item.subHeaderBelow ? (
                                        <div className="mb-1 sm:mb-1.5">
                                            <h3 className="text-base sm:text-[17px] font-semibold text-white leading-tight mb-1 truncate">
                                                {item.name}
                                            </h3>

                                            <span
                                                className={`inline-block text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}
                                            >
                                                {item.subHeader}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                                            <h3 className="text-base sm:text-[17px] font-semibold text-white leading-tight">
                                                {item.name}
                                            </h3>

                                            <span
                                                className={`text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider ${item.badgeColor}`}
                                            >
                                                {item.subHeader}
                                            </span>
                                        </div>
                                    )}

                                    {/* DESCRIPTION */}
                                    <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed">
                                        {item.description}
                                    </p>

                                    {/* CONNECTING */}
                                    {isConnecting && (
                                        <p className="mt-2 text-[10px] sm:text-[11px] text-yellow-500 animate-pulse">
                                            Connecting...
                                        </p>
                                    )}
                                </div>

                                {/* ================= CONNECTED TOP ACTIONS ================= */}
                                {isConnected && (
                                    <div className="hidden sm:flex items-center gap-0 shrink-0">

                                        {/* Manage */}
                                        <button
                                            onClick={() => {
                                                // Add your manage action here
                                                // Example:
                                                // handleManage(item.id)
                                            }}
                                            className="h-11 px-4 rounded-xl border border-white/10 bg-[#070012] text-white/90 text-xs sm:text-[13px] font-medium hover:bg-white/5 hover:border-white/20 transition-all duration-200"
                                        >
                                            Manage
                                        </button>

                                        {/* Settings */}
                                        <button
                                            onClick={() => {
                                                // Add your settings action here
                                                // Example:
                                                // handleSettings(item.id)
                                            }}
                                            className="w-11 h-11 rounded-xl border border-white/10 bg-[#070012] text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex items-center justify-center"
                                            title="Settings"
                                        >
                                            <Settings
                                                size={16}
                                                className="transition-transform duration-300 group-hover:rotate-45"
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ================= CARD FOOTER ================= */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#141414] flex items-center justify-between gap-3">

                            {/* LEFT SIDE */}
                            <div className="flex items-center gap-3 min-w-0">

                                {/* Status */}
                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                    {isConnected ? (
                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                                    ) : (
                                        <span
                                            className={`w-2 h-2 rounded-full ${item.categoryDot}`}
                                        />
                                    )}

                                    <span className="text-xs sm:text-[13px] text-white/70">
                                        {isConnected
                                            ? 'Connected'
                                            : item.categoryLabel}
                                    </span>
                                </div>

                                {/* Divider + Connected Info */}
                                {isConnected && info && (
                                    <>
                                        <span className="h-4 w-px bg-white/10 shrink-0" />

                                        <span className="text-xs sm:text-[13px] text-white/60 truncate max-w-[150px] sm:max-w-[220px]">
                                            {info}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* ================= RIGHT SIDE ================= */}
                            <div className="flex items-center gap-2 shrink-0">

                                {isConnected ? (
                                    <>
                                        {/* Mobile Manage */}
                                        <button
                                            onClick={() => {
                                                // Add your manage action here
                                                // Example:
                                                // handleManage(item.id)
                                            }}
                                            className="sm:hidden flex items-center justify-center px-3 py-1.5 rounded-xl border border-white/10 bg-[#070012] text-white/90 text-xs font-medium hover:bg-white/5 hover:border-white/20 transition-all duration-200"
                                        >
                                            Manage
                                        </button>

                                        {/* Connected Button */}
                                        <button
                                            onMouseEnter={() => setHoveredBtn(item.id)}
                                            onMouseLeave={() => setHoveredBtn(null)}
                                            onClick={() => disconnectIntegration(item.id)}
                                            className="group/disc flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs sm:text-[13px] font-medium hover:bg-red-500/15 hover:border-red-500/50 hover:text-red-400 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 transition-all duration-300 shrink-0"
                                            title="Click to disconnect"
                                        >
                                            {hoveredBtn === item.id ? (
                                                <>
                                                    <X
                                                        size={13}
                                                        className="transition-transform duration-200 transform group-hover/disc:rotate-90"
                                                    />
                                                    Disconnect
                                                </>
                                            ) : (
                                                <>
                                                    <Check
                                                        size={13}
                                                        className="transition-transform duration-200 transform group-hover/disc:scale-110"
                                                    />
                                                    Connected
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    /* ================= CONNECT BUTTON ================= */
                                    <button
                                        onClick={() => handleConnect(item.id)}
                                        disabled={isConnecting || !workspace}
                                        className={`group/btn relative overflow-hidden flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95 active:translate-y-0 ${item.connectBtnClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none shrink-0`}
                                        style={item.connectBtnStyle}
                                        onMouseEnter={(e) => {
                                            if (
                                                !isConnecting &&
                                                workspace &&
                                                item.hoverGlow
                                            ) {
                                                e.currentTarget.style.boxShadow =
                                                    item.hoverGlow;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (
                                                !isConnecting &&
                                                workspace &&
                                                item.connectBtnStyle?.boxShadow
                                            ) {
                                                e.currentTarget.style.boxShadow =
                                                    item.connectBtnStyle.boxShadow;
                                            }
                                        }}
                                    >
                                        {/* Shimmer */}
                                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />

                                        {isConnecting ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <span className="relative z-10">
                                                    Connect
                                                </span>

                                                <ChevronRight
                                                    size={13}
                                                    className="relative z-10 transition-transform duration-300 transform group-hover/btn:translate-x-1"
                                                />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
)}

                {/*  Footer  */}
                <div className="mt-10 sm:mt-14 text-center text-white/50 text-[11px] sm:text-[12px] pb-6">
                    <p>Orbion Agents securely handles your communication data according to our privacy policy.</p>
                </div>
            </div>

            {/* ── Twilio Onboarding Modal ── */}
            <TwilioOnboardingModal
                twilioStep={twilioStep}
                setTwilioStep={setTwilioStep}
                twilioForm={twilioForm}
                setTwilioForm={setTwilioForm}
                showAuthToken={showAuthToken}
                setShowAuthToken={setShowAuthToken}
                twilioSubmitting={twilioSubmitting}
                submitTwilio={submitTwilio}
            />
        </div>
    );
}