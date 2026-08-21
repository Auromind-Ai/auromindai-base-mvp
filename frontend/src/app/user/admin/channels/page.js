'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Poppins } from 'next/font/google';
import { Instagram, Search, ChevronDown, Check, X, ChevronRight, Eye, EyeOff, ExternalLink, Settings, Copy } from 'lucide-react';
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
    toast.className = 'flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md shadow-2xl text-white text-sm font-semibold transition-all duration-300 ease-out opacity-0 translate-y-5';
    toast.innerHTML = message;

    container.appendChild(toast);
    toast.offsetHeight;

    toast.classList.remove('opacity-0', 'translate-y-5');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-5');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

const WhatsAppIcon = ({ className = "w-8 h-8 sm:w-9 sm:h-9 text-white" }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
);

const TwilioIcon = ({ className = "w-8 h-8 sm:w-9 sm:h-9 text-white" }) => (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="4"/>
        <circle cx="24" cy="14" r="3.2" fill="currentColor"/>
        <circle cx="24" cy="34" r="3.2" fill="currentColor"/>
        <circle cx="14" cy="24" r="3.2" fill="currentColor"/>
        <circle cx="34" cy="24" r="3.2" fill="currentColor"/>
    </svg>
);

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

const GmailIcon = ({ className = "w-11 h-11 sm:w-12 sm:h-12" }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
        <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
        <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
        <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
        <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/>
    </svg>
);

const GoogleCalendarIcon = ({ className = "w-11 h-11 sm:w-12 sm:h-12" }) => (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <clipPath id="gcal-clip">
                <rect x="2" y="2" width="44" height="44" rx="8"/>
            </clipPath>
        </defs>
        <g clipPath="url(#gcal-clip)">
            <rect x="2" y="2" width="22" height="22" fill="#1A73E8"/>
            <rect x="24" y="2" width="22" height="22" fill="#EA4335"/>
            <rect x="2" y="24" width="22" height="22" fill="#FBBC04"/>
            <rect x="24" y="24" width="22" height="22" fill="#34A853"/>
        </g>
        <rect x="12" y="12" width="24" height="24" rx="3" fill="white"/>
        <text x="24" y="29.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A73E8" fontFamily="sans-serif">31</text>
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
        cardBorderClass: 'border border-[#4EED6E]',
        glowColor: 'rgba(78,237,110,0.18)',
        hoverGlow: '0 0 25px rgba(73,233,103,0.55)',
        categoryLabel: 'Messaging',
        categoryDot: 'bg-green-500',
        activeDotShadow: 'shadow-[0_0_8px_rgba(34,197,94,0.8)]',
        connectBtnClass: 'border border-[#4EED6E]/70 text-white bg-black/60',
        icon: WhatsAppIcon,
        type: 'channel',
        category: 'messaging',
    },
    {
        id: 'instagram',
        name: 'Instagram',
        subHeader: 'Meta Business',
        badgeColor: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
        description: 'Sync DMs and comments from Instagram to your Unified Inbox.',
        iconBg: 'from-pink-500 via-red-500 to-yellow-500',
        cardBorderClass: 'border border-[#C7368D]',
        glowColor: 'rgba(199,54,141,0.18)',
        hoverGlow: '0 0 25px rgba(199,54,141,0.55)',
        categoryLabel: 'Social media',
        categoryDot: 'bg-pink-500',
        activeDotShadow: 'shadow-[0_0_8px_rgba(236,72,153,0.8)]',
        connectBtnClass: 'border border-[#C7368D]/70 text-white bg-black/60',
        icon: Instagram,
        type: 'channel',
        category: 'social media',
    },
    {
        id: 'twilio',
        name: 'Twilio',
        subHeader: 'Twilio Powered',
        badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
        description: 'Power your WhatsApp and SMS communications with our native Twilio bridge.',
        iconBg: 'from-red-500 to-red-700',
        cardBorderClass: 'border border-[#CE272D]',
        glowColor: 'rgba(206,39,45,0.18)',
        hoverGlow: '0 0 25px rgba(206,39,45,0.55)',
        categoryLabel: 'SMS & WhatsApp',
        categoryDot: 'bg-red-500',
        activeDotShadow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',
        connectBtnClass: 'border border-[#CE272D]/70 text-white bg-black/60',
        icon: TwilioIcon,
        type: 'channel',
        category: 'sms',
    },
];

const INTEGRATIONS_DATA = [
    {
        id: 'gmail',
        name: 'Gmail',
        subHeader: 'Google',
        badgeColor: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        description: 'Connect your Gmail account to manage outreach, draft replies, and monitor inboxes.',
        iconBg: 'bg-transparent',
        cardBorderClass: 'border border-[#FBBC05]',
        glowColor: 'rgba(251,188,5,0.18)',
        hoverGlow: '0 0 25px rgba(251,188,5,0.55)',
        categoryLabel: 'Messaging',
        categoryDot: 'bg-yellow-500',
        activeDotShadow: 'shadow-[0_0_6px_rgba(251,188,5,0.8)]',
        connectBtnClass: 'border border-[#FBBC05]/70 text-white bg-black/60',
        icon: GmailIcon,
        type: 'integration',
        category: 'email',
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        subHeader: 'Google',
        badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        description: 'Sync availability, coordinate meetings, and book appointments automatically in Google Calendar.',
        iconBg: 'bg-transparent',
        cardBorderClass: 'border border-[#1A73E8]',
        glowColor: 'rgba(26,115,232,0.18)',
        hoverGlow: '0 0 25px rgba(26,115,232,0.55)',
        categoryLabel: 'Calendar',
        categoryDot: 'bg-blue-500',
        activeDotShadow: 'shadow-[0_0_6px_rgba(26,115,232,0.8)]',
        connectBtnClass: 'border border-[#1A73E8]/70 text-white bg-black/60',
        icon: GoogleCalendarIcon,
        type: 'integration',
        category: 'calendar',
    },
];

const ALL_ITEMS = [...CHANNELS_DATA, ...INTEGRATIONS_DATA];

const SORT_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'name-az', label: 'Name A–Z' },
    { value: 'name-za', label: 'Name Z–A' },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-[480px] sm:max-w-[500px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0305] via-[#0d0d0d] to-[#0a0305] border border-[#F22F46]/20 shadow-[0_0_80px_rgba(242,47,70,0.12),0_24px_60px_rgba(0,0,0,0.6)]">
                <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-[#F22F46] to-transparent" />

                <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#F22F46] to-[#9b1c2e] shadow-[0_0_12px_rgba(242,47,70,0.4)]">
                            <TwilioIconSm size={16} />
                        </div>
                        <span className="text-xs sm:text-[13px] font-semibold text-white/70 tracking-wide">
                            Connect Twilio
                        </span>
                    </div>
                    <button
                        onClick={() => setTwilioStep(null)}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/[0.07] transition-all"
                    >
                        <X size={13} className="text-white/50" />
                    </button>
                </div>

                {!isSuccess && (
                    <div className="px-4 sm:px-6 pb-4 shrink-0">
                        <div className="flex items-center gap-1.5 mb-2">
                            {TWILIO_STEPS.map((s) => {
                                const active = typeof twilioStep === 'number' && twilioStep >= s.num;
                                return (
                                    <div key={s.num} className="flex-1 relative">
                                        <div
                                            className={`h-1 rounded-full transition-all duration-500 ${
                                                active
                                                    ? 'bg-gradient-to-r from-[#F22F46] to-[#ff6b7a] shadow-[0_0_8px_rgba(242,47,70,0.5)]'
                                                    : 'bg-white/[0.07]'
                                            }`}
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

                <div className="px-4 sm:px-6 pb-5 sm:pb-6 overflow-y-auto custom-scrollbar flex-1">
                    {twilioStep === 1 && (
                        <div>
                            <h2 className="text-lg sm:text-[20px] font-semibold text-white mb-1.5 tracking-tight">Get Your Credentials</h2>
                            <p className="text-xs sm:text-[13px] text-white/60 mb-4 sm:mb-5 leading-relaxed">
                                Follow these steps to retrieve your Twilio credentials.
                            </p>

                            <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
                                {[
                                    { num: 1, title: 'Login to Twilio Console', desc: 'Go to https://console.twilio.com and sign in.' },
                                    { num: 2, title: 'Copy Account SID', desc: 'Find your Account SID on the main dashboard.' },
                                    { num: 3, title: 'Copy Auth Token', desc: 'Find your Auth Token under Account → General Settings.' },
                                    { num: 4, title: 'Get Your Phone Number', desc: 'Purchase or use an existing WhatsApp-enabled number.' },
                                    { num: 5, title: 'Connect Your Twilio Account', desc: 'Paste credentials into the next screen.' },
                                ].map((step) => (
                                    <div
                                        key={step.num}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,47,70,0.2)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                        className="flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-3.5 rounded-xl transition-all duration-200 bg-white/[0.03] border border-white/[0.06]"
                                    >
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] sm:text-[11px] font-bold bg-[#F22F46]/15 border border-[#F22F46]/30 text-[#F22F46]">
                                            {step.num}
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-[13px] font-normal text-white mb-0.5">{step.title}</div>
                                            <div className="text-[10px] sm:text-[11px] text-white/60 leading-relaxed">{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <a
                                href="https://console.twilio.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(242,47,70,0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(242,47,70,0.5)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(242,47,70,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(242,47,70,0.3)';
                                }}
                                className="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-medium mb-4 sm:mb-5 transition-all duration-200 border border-[#F22F46]/30 text-[#F22F46] bg-[#F22F46]/5"
                            >
                                <ExternalLink size={13} />
                                Open Twilio Console
                            </a>

                            <button
                                onClick={() => setTwilioStep(2)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = '0 0 28px rgba(242,47,70,0.45)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(242,47,70,0.28)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                                className="w-full py-2.5 rounded-xl text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all duration-200 bg-gradient-to-br from-[#F22F46] to-[#c0233a] shadow-[0_0_20px_rgba(242,47,70,0.28)]"
                            >
                                I Have My Credentials <ChevronRight size={14} />
                            </button>
                        </div>
                    )}

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
                                        className="w-full rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200 bg-white/[0.03] border border-white/[0.09] focus:border-[#F22F46]/40 focus:ring-2 focus:ring-[#F22F46]/10"
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
                                            className="w-full rounded-xl pl-3 sm:pl-4 pr-10 sm:pr-11 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200 bg-white/[0.03] border border-white/[0.09] focus:border-[#F22F46]/40 focus:ring-2 focus:ring-[#F22F46]/10"
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
                                        className="w-full rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-white text-xs sm:text-[13px] placeholder:text-white/40 outline-none font-mono transition-all duration-200 bg-white/[0.03] border border-white/[0.09] focus:border-[#F22F46]/40 focus:ring-2 focus:ring-[#F22F46]/10"
                                    />
                                    <p className="text-[10px] text-white/45 mt-1">Use a WhatsApp-enabled number</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5 sm:gap-3">
                                <button
                                    onClick={() => setTwilioStep(1)}
                                    disabled={twilioSubmitting}
                                    className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-[13px] text-white/50 border border-white/10 hover:text-white/90 hover:border-white/20 transition-all duration-200 disabled:opacity-30"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={submitTwilio}
                                    disabled={twilioSubmitting}
                                    onMouseEnter={e => {
                                        if (!twilioSubmitting) {
                                            e.currentTarget.style.boxShadow = '0 0 28px rgba(242,47,70,0.5)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!twilioSubmitting) {
                                            e.currentTarget.style.boxShadow = '0 0 20px rgba(242,47,70,0.3)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all duration-200 bg-gradient-to-br from-[#F22F46] to-[#c0233a] shadow-[0_0_20px_rgba(242,47,70,0.3)] disabled:opacity-50"
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

                    {twilioStep === 'success' && (
                        <div className="text-center py-4 sm:py-5">
                            <style>{`
                                @keyframes scaleIn {
                                    0% { transform: scale(0); opacity: 0; }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                            `}</style>
                            <div
                                style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 bg-green-500/15 border-2 border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
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
                                className="px-8 sm:px-10 py-2.5 sm:py-3 rounded-xl text-white font-semibold text-xs sm:text-[14px] transition-all duration-200 bg-gradient-to-br from-green-600 to-green-700 shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:shadow-[0_0_32px_rgba(34,197,94,0.5)] hover:-translate-y-0.5"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChannelDetailsModal({
    item,
    onClose,
    connectedInfo,
    whatsappPhoneId,
    whatsappWabaId,
    twilioForm,
    onDisconnect,
    detailsRevealedSecrets,
    toggleRevealSecret,
    copiedKey,
    handleCopyText
}) {
    if (!item) return null;

    const Icon = item.icon;
    const info = connectedInfo[item.id];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-[480px] sm:max-w-[500px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-[#0e0a16] via-[#0d0d0d] to-[#070912] border border-white/10 shadow-[0_0_80px_rgba(124,77,255,0.15),0_24px_60px_rgba(0,0,0,0.6)]">
                {/* Top accent glow line */}
                <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-[#7C4DFF] to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${item.iconBg || 'from-purple-500 to-indigo-600'} flex items-center justify-center shrink-0 shadow-md`}
                        >
                            <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                                {item.name}
                            </h2>
                            <p className="text-[11px] text-white/50 truncate">
                                Connection Details
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-green-500/15 border border-green-500/30 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                            Connected
                        </span>
                        <button
                            onClick={onClose}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/[0.07] transition-all ml-1"
                        >
                            <X size={13} className="text-white/50" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto custom-scrollbar flex-1 space-y-3.5 sm:space-y-4">
                    {/* Twilio Fields */}
                    {item.id === 'twilio' && (
                        <>
                            {/* Account SID */}
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Account SID
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-white/90 truncate">
                                        {twilioForm.sid || (info ? "Configured in Workspace" : "AC••••••••••••••••••••••••••••••••")}
                                    </span>
                                    {(twilioForm.sid || info) && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(twilioForm.sid || info, 'twilio_sid')}
                                            title="Copy Account SID"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'twilio_sid' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Auth Token */}
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Auth Token
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-white/90 truncate">
                                        {detailsRevealedSecrets.twilio_token
                                            ? (twilioForm.token || "••••••••••••••••••••••••••••••••")
                                            : "••••••••••••••••••••••••••••••••"}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {twilioForm.token && (
                                            <button
                                                type="button"
                                                onClick={() => toggleRevealSecret('twilio_token')}
                                                title={detailsRevealedSecrets.twilio_token ? "Hide token" : "Reveal token"}
                                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                {detailsRevealedSecrets.twilio_token ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        )}
                                        {twilioForm.token && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyText(twilioForm.token, 'twilio_token')}
                                                title="Copy Auth Token"
                                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                {copiedKey === 'twilio_token' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Twilio WhatsApp / Phone */}
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    WhatsApp Phone Number
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-green-400 font-medium truncate">
                                        {info || twilioForm.phone || "Connected"}
                                    </span>
                                    {(info || twilioForm.phone) && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(info || twilioForm.phone, 'twilio_phone')}
                                            title="Copy Phone Number"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'twilio_phone' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* WhatsApp Business Fields */}
                    {item.id === 'whatsapp' && (
                        <>
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    WhatsApp Business Number
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-green-400 font-medium truncate">
                                        {info || "Connected"}
                                    </span>
                                    {info && info !== "Connected" && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(info, 'wa_phone')}
                                            title="Copy Phone Number"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'wa_phone' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {whatsappPhoneId && (
                                <div>
                                    <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                        Phone Number ID
                                    </label>
                                    <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                        <span className="font-mono text-xs sm:text-[13px] text-white/90 truncate" title={whatsappPhoneId}>
                                            {whatsappPhoneId}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(whatsappPhoneId, 'wa_phone_id')}
                                            title="Copy Phone Number ID"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'wa_phone_id' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {whatsappWabaId && (
                                <div>
                                    <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                        WhatsApp Business Account ID (WABA ID)
                                    </label>
                                    <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                        <span className="font-mono text-xs sm:text-[13px] text-white/90 truncate" title={whatsappWabaId}>
                                            {whatsappWabaId}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(whatsappWabaId, 'wa_waba_id')}
                                            title="Copy WABA ID"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'wa_waba_id' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Integration Platform
                                </label>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-[13px] text-white/70">
                                    Meta Cloud API
                                </div>
                            </div>
                        </>
                    )}

                    {/* Instagram Fields */}
                    {item.id === 'instagram' && (
                        <>
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Connected Account
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-pink-400 font-medium truncate">
                                        {info || "Connected"}
                                    </span>
                                    {info && info !== "Connected" && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(info, 'ig_user')}
                                            title="Copy Account"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'ig_user' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Integration Type
                                </label>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-[13px] text-white/70">
                                    Meta Business Graph API (Direct Messages & Comments)
                                </div>
                            </div>
                        </>
                    )}

                    {/* Gmail Fields */}
                    {item.id === 'gmail' && (
                        <>
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Connected Email Address
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-yellow-400 font-medium truncate">
                                        {info || "Connected"}
                                    </span>
                                    {info && info !== "Connected" && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(info, 'gmail_email')}
                                            title="Copy Email"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'gmail_email' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Provider & Protocol
                                </label>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-[13px] text-white/70">
                                    Google Workspace / Gmail (OAuth 2.0)
                                </div>
                            </div>
                        </>
                    )}

                    {/* Google Calendar Fields */}
                    {item.id === 'google_calendar' && (
                        <>
                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Connected Calendar Account
                                </label>
                                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                    <span className="font-mono text-xs sm:text-[13px] text-blue-400 font-medium truncate">
                                        {info || "Connected"}
                                    </span>
                                    {info && info !== "Connected" && (
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(info, 'gcal_email')}
                                            title="Copy Calendar Account"
                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                        >
                                            {copiedKey === 'gcal_email' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-[11px] text-white/50 mb-1 uppercase tracking-wider font-medium">
                                    Provider & Protocol
                                </label>
                                <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-[13px] text-white/70">
                                    Google Calendar (OAuth 2.0)
                                </div>
                            </div>
                        </>
                    )}

                    {/* Security Notice */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/45 leading-relaxed">
                        Credentials and tokens are encrypted and managed securely for your workspace.
                    </div>
                </div>

                {/* Footer with Disconnect and Done */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/[0.07] bg-black/40 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            const channelId = item.id;
                            onClose();
                            onDisconnect(channelId);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400/90 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 transition-all duration-200"
                    >
                        Disconnect Channel
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all duration-200"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChannelsPage() {
    const WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    const { workspaces, workspaceId } = useAuth();
    const workspace = workspaces?.find((item) => item.id === workspaceId) || null;

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
    const [connecting, setConnecting] = useState(null);
    const [disconnectModal, setDisconnectModal] = useState(null);
    const [disconnecting, setDisconnecting] = useState(false);

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

    const [whatsappPhoneId, setWhatsappPhoneId] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem("whatsapp_phone_id") || '';
    });
    const [whatsappWabaId, setWhatsappWabaId] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem("whatsapp_waba_id") || '';
    });

    const [selectedChannelDetails, setSelectedChannelDetails] = useState(null);
    const [detailsRevealedSecrets, setDetailsRevealedSecrets] = useState({});
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopyText = (text, key) => {
        if (!text) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
        }
        setCopiedKey(key);
        showToast("Copied to clipboard");
        setTimeout(() => {
            setCopiedKey((prev) => (prev === key ? null : prev));
        }, 2000);
    };

    const toggleRevealSecret = (key) => {
        setDetailsRevealedSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

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
           
            if (data.whatsapp?.connected) {
                const phone = data.whatsapp.phone || data.whatsapp.display_number || "Connected";
                const phoneId = data.whatsapp.phone_number_id || '';
                const wabaId = data.whatsapp.waba_id || '';

                setConnectedInfo(prev => ({ ...prev, whatsapp: phone }));
                setWhatsappPhoneId(phoneId);
                setWhatsappWabaId(wabaId);

                localStorage.setItem("whatsapp_connected", "true");
                if (phone) localStorage.setItem("whatsapp_phone", phone);
                if (phoneId) localStorage.setItem("whatsapp_phone_id", phoneId);
                if (wabaId) localStorage.setItem("whatsapp_waba_id", wabaId);
            } else {
                setWhatsappPhoneId('');
                setWhatsappWabaId('');
                localStorage.removeItem("whatsapp_connected");
                localStorage.removeItem("whatsapp_phone");
                localStorage.removeItem("whatsapp_phone_id");
                localStorage.removeItem("whatsapp_waba_id");
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('channel-status-changed'));
            }

            if (data.instagram?.connected) {
                setConnectedInfo(prev => ({ ...prev, instagram: data.instagram.username || "Connected" }));
                localStorage.setItem("instagram_connected", "true");
                if (data.instagram.username) localStorage.setItem("instagram_username", data.instagram.username);
            } else {
                localStorage.removeItem("instagram_connected");
                localStorage.removeItem("instagram_username");
            }

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

    useEffect(() => {
        if (!workspace?.id) return;
        loadIntegrationStatus();
    }, [workspace?.id, loadIntegrationStatus]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('default');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [openDropdown, setOpenDropdown] = useState(null);

    const sortRef = useRef(null);
    const typeRef = useRef(null);
    const categoryRef = useRef(null);

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

    const filteredItems = useMemo(() => {
        let items = [...ALL_ITEMS];

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q))
            );
        }

        if (typeFilter !== 'all') {
            items = items.filter(item => item.type === typeFilter);
        }

        if (categoryFilter !== 'all') {
            items = items.filter(item =>
                (item.category && item.category.toLowerCase() === categoryFilter.toLowerCase()) ||
                (item.categoryLabel && item.categoryLabel.toLowerCase().includes(categoryFilter.toLowerCase()))
            );
        }

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

        return items;
    }, [searchQuery, sortBy, typeFilter, categoryFilter, statuses]);

    const filteredChannels = useMemo(() => filteredItems.filter(i => i.type === 'channel'), [filteredItems]);
    const filteredIntegrations = useMemo(() => filteredItems.filter(i => i.type === 'integration'), [filteredItems]);

    useEffect(() => {
        const handleMessage = (e) => {
            if (e.origin !== "https://www.facebook.com") return;
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'CANCEL' || data.event === 'ERROR') {
                        setConnecting(null);
                    }
                }
            } catch (_) {}
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const connectWhatsAppToBackend = async (payload) => {
        try {
            const data = await api.connectWhatsApp({ ...payload, workspace_id: workspace?.id });
            if (data.status === 'connected') {
                const phone = data.phone_number || data.display_number || "Connected";
                const phoneId = data.phone_number_id || '';
                const wabaId = data.waba_id || '';

                setStatuses(prev => ({ ...prev, whatsapp: true }));
                setConnectedInfo(prev => ({ ...prev, whatsapp: phone }));
                setWhatsappPhoneId(phoneId);
                setWhatsappWabaId(wabaId);

                localStorage.setItem("whatsapp_connected", "true");
                if (phone) localStorage.setItem("whatsapp_phone", phone);
                if (phoneId) localStorage.setItem("whatsapp_phone_id", phoneId);
                if (wabaId) localStorage.setItem("whatsapp_waba_id", wabaId);

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('channel-status-changed'));
                }
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
        const currentWorkspaceId = workspace?.id;
        if (!currentWorkspaceId) {
            alert("Workspace not loaded. Please wait...");
            return;
        }
        const REDIRECT_URI = `${window.location.origin}/instagram/callback`;
        const authUrl =
            `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${encodeURIComponent(currentWorkspaceId)}` +
            `&scope=${encodeURIComponent('instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_messaging,pages_read_engagement,business_management')}` +
            `&response_type=code`;
        window.location.href = authUrl;
    }, [workspace]);

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

    const confirmDisconnectIntegration = async () => {
        if (!disconnectModal) return;

        setDisconnecting(true);
        const integrationId = disconnectModal;

        try {
            if (['twilio', 'whatsapp', 'instagram'].includes(integrationId)) {
                await api.disconnectChannel(integrationId, workspace?.id);
            } else {
                const backendId = integrationId === 'google_calendar' ? 'calendar' : integrationId;
                await api.disconnectGoogleIntegration(backendId);
            }

            localStorage.removeItem(`${integrationId}_connected`);
            localStorage.removeItem(`${integrationId}_phone`);
            localStorage.removeItem(`${integrationId}_username`);
            if (integrationId === 'whatsapp') {
                localStorage.removeItem("whatsapp_phone_id");
                localStorage.removeItem("whatsapp_waba_id");
                setWhatsappPhoneId('');
                setWhatsappWabaId('');
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('channel-status-changed'));
            }

            setStatuses(prev => ({
                ...prev,
                [integrationId]: false,
            }));

            setConnectedInfo(prev => ({
                ...prev,
                [integrationId]: null,
            }));

            setDisconnectModal(null);

            const displayNames = {
                whatsapp: 'WhatsApp Business',
                google_calendar: 'Google Calendar',
                gmail: 'Gmail',
                instagram: 'Instagram',
                twilio: 'Twilio'
            };

            showToast(`Disconnected ${displayNames[integrationId] || integrationId} successfully`);
        } catch (err) {
            console.error('Disconnect failed:', err);
            const displayNames = {
                whatsapp: 'WhatsApp Business',
                google_calendar: 'Google Calendar',
                gmail: 'Gmail',
                instagram: 'Instagram',
                twilio: 'Twilio'
            };
            showToast(`Failed to disconnect ${displayNames[integrationId] || integrationId}`);
        } finally {
            setDisconnecting(false);
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
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('channel-status-changed'));
                }
                setTwilioStep('success');
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
        triggerConnect(id);
    };

    const triggerConnect = (id) => {
        if (id === 'whatsapp')        startWhatsAppSignup();
        if (id === 'instagram')       startInstagramLogin();
        if (id === 'gmail')           connectIntegration('gmail');
        if (id === 'google_calendar') connectIntegration('google_calendar');
        if (id === 'twilio') {
            const savedPhone = localStorage.getItem("twilio_phone") || '';
            setTwilioForm({ sid: '', token: '', phone: savedPhone });
            setShowAuthToken(false);
            setTwilioStep(1);
        }
    };

    return (
        <div className={`w-full h-full min-h-screen bg-black text-white overflow-y-auto custom-scrollbar ${poppins.className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">

                {/* Header */}
                <div className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold sm:font-medium text-white tracking-tight mb-2 sm:mb-3">
                        Channels
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm lg:text-[15px] max-w-xl leading-relaxed">
                        Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 sm:mb-8 lg:mb-10">
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

                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0 relative z-30">
                        {/* Sort Dropdown */}
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

                        {/* Type Dropdown */}
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

                        {/* Category Dropdown */}
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

                        {/* Reset filters */}
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

                {/* Empty State */}
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 sm:py-20">
                        <p className="text-white/40 text-xs sm:text-sm lg:text-[15px]">No channels or integrations match your filters.</p>
                    </div>
                )}

                {/* Channel Cards */}
                {filteredChannels.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                        {filteredChannels.map((item) => {
                            const isConnected = statuses[item.id];
                            const isConnecting = connecting === item.id;
                            const Icon = item.icon;
                            const info = connectedInfo[item.id];

                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        boxShadow: `0 0 30px ${item.glowColor}`,
                                        transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = `0 0 40px ${item.glowColor}, inset 0 0 20px ${item.glowColor}`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = `0 0 30px ${item.glowColor}`;
                                    }}
                                    className={`relative group rounded-2xl overflow-hidden flex flex-col min-h-[190px] sm:min-h-[200px] transition-all duration-300 bg-gradient-to-br from-[#070912] to-[#05050d] ${item.cardBorderClass}`}
                                >
                                    <div className="flex-1 px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                                        <div className="flex items-start gap-4 sm:gap-5">
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
                                                            : item.id === 'whatsapp'
                                                                ? "w-8 h-8 sm:w-9 sm:h-9 text-white"
                                                                : item.id === 'twilio'
                                                                    ? "w-8 h-8 sm:w-9 sm:h-9 text-white"
                                                                    : "w-9 h-9 sm:w-10 sm:h-10"
                                                    }
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
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

                                                <p className="text-white/65 text-xs sm:text-[13px] leading-relaxed max-w-[430px]">
                                                    {item.description}
                                                </p>

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

                                    <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
                                        <div className="flex items-center min-w-0 flex-1">
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full ${item.categoryDot} shrink-0 ${isConnected ? item.activeDotShadow : ''}`}
                                                />
                                                <span className="text-xs sm:text-[13px] text-white/70">
                                                    {isConnected ? 'Connected' : item.categoryLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isConnected ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDisconnectModal(item.id)}
                                                        className="group/disc relative flex items-center gap-1 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-red-500/15 hover:border-red-500/50 hover:text-red-400 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95"
                                                    >
                                                        <span className="group-hover/disc:hidden flex items-center gap-1">
                                                            <Check size={13} className="transition-transform duration-200 transform group-hover/disc:scale-110" />
                                                            Connected
                                                        </span>
                                                        <span className="hidden group-hover/disc:flex items-center gap-1">
                                                            <X size={13} className="transition-transform duration-200 transform group-hover/disc:rotate-90" />
                                                            Disconnect
                                                        </span>
                                                    </button>

                                                    <div className="relative group/settings-btn">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedChannelDetails(item)}
                                                            className="group/settings w-9 h-9 rounded-full border border-white/15 bg-black/60 text-white/65 flex items-center justify-center transition-all duration-200 hover:text-white hover:border-white/30 hover:shadow-[0_0_15px_rgba(124,77,255,0.2)] active:scale-95"
                                                        >
                                                            <Settings size={15} className="transition-transform duration-300 ease-out group-hover/settings:rotate-45" />
                                                        </button>
                                                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden md:group-hover/settings-btn:flex flex-col items-end z-40 transition-all duration-200 opacity-0 group-hover/settings-btn:opacity-100">
                                                            <div className="px-2.5 py-1 rounded-lg bg-[#111115] border border-white/15 text-[11px] font-medium text-white/90 whitespace-nowrap shadow-2xl backdrop-blur-md">
                                                                View connection details
                                                            </div>
                                                            <div className="w-1.5 h-1.5 rotate-45 bg-[#111115] border-r border-b border-white/15 -mt-0.5 mr-3.5" />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(item.id)}
                                                    disabled={isConnecting || !workspace}
                                                    onMouseEnter={(e) => {
                                                        if (!isConnecting && workspace && item.hoverGlow) {
                                                            e.currentTarget.style.boxShadow = item.hoverGlow;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                    className={`
                                                        group/btn
                                                        relative overflow-hidden
                                                        flex items-center gap-1.5
                                                        px-4 py-1.5
                                                        rounded-full
                                                        text-xs sm:text-[13px]
                                                        font-medium
                                                        transition-all duration-300
                                                        hover:-translate-y-0.5
                                                        hover:scale-[1.04]
                                                        active:scale-95
                                                        active:translate-y-0
                                                        ${item.connectBtnClass}
                                                        disabled:opacity-40
                                                        disabled:cursor-not-allowed
                                                        disabled:transform-none
                                                        disabled:shadow-none
                                                    `}
                                                >
                                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                                                    {isConnecting ? (
                                                        <>
                                                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            <span className="relative z-10">Connecting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="relative z-10">Connect</span>
                                                            <ChevronRight size={13} className="relative z-10 transition-transform duration-300 transform group-hover/btn:translate-x-1" />
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

                {/* Integration Section */}
                {filteredIntegrations.length > 0 && (
                    <div className="mt-10 sm:mt-14">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold sm:font-medium text-white tracking-tight mb-2 sm:mb-3">
                            Integration
                        </h2>

                        <p className="text-white/70 text-xs sm:text-sm lg:text-[15px] max-w-xl leading-relaxed mb-6 sm:mb-8">
                            Connect your favourite apps and messaging platform to automate conversations and keep everything in one place.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5">
                            {filteredIntegrations.map((item) => {
                                const isConnected = statuses[item.id];
                                const isConnecting = connecting === item.id;
                                const Icon = item.icon;
                                const info = connectedInfo[item.id];

                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            boxShadow: `0 0 30px ${item.glowColor}`,
                                            transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.boxShadow = `0 0 40px ${item.glowColor}, inset 0 0 20px ${item.glowColor}`;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.boxShadow = `0 0 30px ${item.glowColor}`;
                                        }}
                                        className={`relative group rounded-2xl transition-all duration-300 flex flex-col overflow-hidden bg-[#070012] ${item.cardBorderClass}`}
                                    >
                                        <div className="p-4 sm:p-5 lg:p-6 flex-1 min-h-[140px] sm:min-h-[160px]">
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
                                                    <Icon className="w-12 h-12 sm:w-13 sm:h-13" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="mb-1 sm:mb-1.5">
                                                        <h3 className="text-base sm:text-[17px] font-semibold text-white leading-tight mb-1 truncate">
                                                            {item.name}
                                                        </h3>
                                                        <span className={`inline-block text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                                                            {item.subHeader}
                                                        </span>
                                                    </div>

                                                    <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed">
                                                        {item.description}
                                                    </p>

                                                    {isConnecting && (
                                                        <p className="mt-2 text-[10px] sm:text-[11px] text-yellow-500 animate-pulse">
                                                            Connecting...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#141414] flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${item.categoryDot} ${isConnected ? item.activeDotShadow : ''}`}
                                                    />
                                                    <span className="text-xs sm:text-[13px] text-white/70">
                                                        {isConnected ? 'Connected' : item.categoryLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isConnected ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDisconnectModal(item.id)}
                                                            className="group/disc relative flex items-center gap-1 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-red-500/15 hover:border-red-500/50 hover:text-red-400 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95"
                                                        >
                                                            <span className="group-hover/disc:hidden flex items-center gap-1">
                                                                <Check size={13} className="transition-transform duration-200 transform group-hover/disc:scale-110" />
                                                                Connected
                                                            </span>
                                                            <span className="hidden group-hover/disc:flex items-center gap-1">
                                                                <X size={13} className="transition-transform duration-200 transform group-hover/disc:rotate-90" />
                                                                Disconnect
                                                            </span>
                                                        </button>

                                                        <div className="relative group/settings-btn">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedChannelDetails(item)}
                                                                className="group/settings w-9 h-9 rounded-full border border-white/15 bg-black/60 text-white/65 flex items-center justify-center transition-all duration-200 hover:text-white hover:border-white/30 hover:shadow-[0_0_15px_rgba(124,77,255,0.2)] active:scale-95"
                                                            >
                                                                <Settings size={15} className="transition-transform duration-300 ease-out group-hover/settings:rotate-45" />
                                                            </button>
                                                            <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden md:group-hover/settings-btn:flex flex-col items-end z-40 transition-all duration-200 opacity-0 group-hover/settings-btn:opacity-100">
                                                                <div className="px-2.5 py-1 rounded-lg bg-[#111115] border border-white/15 text-[11px] font-medium text-white/90 whitespace-nowrap shadow-2xl backdrop-blur-md">
                                                                    View connection details
                                                                </div>
                                                                <div className="w-1.5 h-1.5 rotate-45 bg-[#111115] border-r border-b border-white/15 -mt-0.5 mr-3.5" />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConnect(item.id)}
                                                        disabled={isConnecting || !workspace}
                                                        onMouseEnter={(e) => {
                                                            if (!isConnecting && workspace && item.hoverGlow) {
                                                                e.currentTarget.style.boxShadow = item.hoverGlow;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                        className={`group/btn relative overflow-hidden flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95 active:translate-y-0 ${item.connectBtnClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none shrink-0`}
                                                    >
                                                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                                                        {isConnecting ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                                <span className="relative z-10">Connecting...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="relative z-10">Connect</span>
                                                                <ChevronRight size={13} className="relative z-10 transition-transform duration-300 transform group-hover/btn:translate-x-1" />
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

                {/* Footer */}
                <div className="mt-10 sm:mt-14 text-center text-white/50 text-[11px] sm:text-[12px] pb-6">
                    <p>
                        Orbion Agents securely handles your communication data according to our privacy policy.
                    </p>
                </div>

                {/* Twilio Modal */}
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

                {/* Channel Connection Details Modal */}
                <ChannelDetailsModal
                    item={selectedChannelDetails}
                    onClose={() => {
                        setSelectedChannelDetails(null);
                        setDetailsRevealedSecrets({});
                    }}
                    connectedInfo={connectedInfo}
                    whatsappPhoneId={whatsappPhoneId}
                    whatsappWabaId={whatsappWabaId}
                    twilioForm={twilioForm}
                    onDisconnect={(channelId) => setDisconnectModal(channelId)}
                    detailsRevealedSecrets={detailsRevealedSecrets}
                    toggleRevealSecret={toggleRevealSecret}
                    copiedKey={copiedKey}
                    handleCopyText={handleCopyText}
                />

                {/* Disconnect Modal */}
                {disconnectModal && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                        <div className="w-full max-w-[384px] rounded-2xl border border-white/[0.12] bg-[#111111] p-6 shadow-2xl">
                            <div className="flex justify-center mb-5">
                                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                                    <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <X size={20} className="text-rose-500" />
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-center text-lg font-semibold text-white mb-2">
                                Disconnect{" "}
                                {disconnectModal === "google_calendar"
                                    ? "Google Calendar"
                                    : disconnectModal === "gmail"
                                        ? "Gmail"
                                        : disconnectModal === "whatsapp"
                                            ? "WhatsApp Business"
                                            : disconnectModal === "instagram"
                                                ? "Instagram"
                                                : disconnectModal === "twilio"
                                                    ? "Twilio"
                                                    : disconnectModal}
                                ?
                            </h2>

                            <p className="text-center text-sm text-white/45 leading-relaxed mb-6">
                                This will disconnect the integration from your workspace.
                                You can reconnect it again anytime.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDisconnectModal(null)}
                                    disabled={disconnecting}
                                    className="flex-1 h-10 rounded-xl bg-white/[0.08] border border-white/[0.06] text-white/90 text-sm font-semibold transition-all duration-200 hover:bg-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmDisconnectIntegration}
                                    disabled={disconnecting}
                                    className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-sm font-semibold shadow-[0_0_18px_rgba(244,63,94,0.25)] transition-all duration-200 hover:bg-rose-400 hover:shadow-[0_0_24px_rgba(244,63,94,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
