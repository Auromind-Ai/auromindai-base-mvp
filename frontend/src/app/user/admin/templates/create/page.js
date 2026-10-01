'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { poppins } from '@/lib/fonts';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import UpgradeModal from '@/components/UpgradeModal';
import VariablePicker from '@/components/templates/VariablePicker';
import DefineVariableModal from '@/components/templates/DefineVariableModal';
import VariableMappingCard from '@/components/templates/VariableMappingCard';
import {
  buildWhatsAppVariableMapping,
  renderPreviewText,
  sanitizeVariableName,
  formatVariableLabel,
  convertNumberedToNamedText,
} from '@/lib/variableUtils';

//  Icons (inline SVG to avoid extra deps) 
const Icon = ({ d, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:   'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  ai:          'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  inbox:       'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  automations: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  leads:       'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  channels:    'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z',
  integration: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  settings:    'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  search:      'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  logout:      'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  template:    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  agents:      'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  analytics:   'M18 20V10 M12 20V4 M6 20v-6',
  sparkle:     'M12 3l1.9 5.8L19 9l-5.1 3.7 1.9 5.8L12 15l-3.8 3.5 1.9-5.8L5 9l5.1-.2z',
  plus:        'M12 5v14 M5 12h14',
  text:        'M4 6h16M4 12h16M4 18h7',
  image:       'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
  video:       'M23 7l-7 5 7 5V7z M1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z',
  tip:         'M12 22h6a2 2 0 002-2V7l-5-5H6a2 2 0 00-2 2v3 M14 2v4a2 2 0 002 2h4 M10.42 12.61a2.1 2.1 0 112.97 2.97L7.95 21 4 22l.99-3.95 5.43-5.44z',
  phone:       'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8',
};

//  Sidebar category item 
const CatItem = ({ iconKey, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-normal sm:font-medium transition-all duration-200
      ${active
        ? 'bg-[#1A0B2E] text-white border border-[#3D1F6B]'
        : 'text-[#B7B3C7] hover:text-white hover:bg-[#110820]'
      }`}
  >
    <Icon d={icons[iconKey] || icons.template} size={14} />
    <span>{label}</span>
  </button>
);

//  Input ─
const Input = ({ label, hint, placeholder, value, onChange, className = '' }) => (
  <div className={className}>
    {label && <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">{label}</p>}
    {hint && <p className="text-white/60 text-[11px] sm:text-xs mb-2 sm:mb-3 leading-relaxed font-normal">{hint}</p>}
    <input
      className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal text-white
        placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]-500 focus:ring-2
        focus:ring-[#814AC8]/20 transition-all duration-300"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

const buttonOptions = [
  {
    type: 'QUICK_REPLY',
    label: 'Custom',
    description: 'Quick reply button for customer responses',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 14 4 9 9 4"></polyline>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
      </svg>
    ),
  },
  {
    type: 'URL',
    label: 'Visit website',
    description: 'Direct link to an external website or page',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    ),
  },
  {
    type: 'VOICE_CALL',
    label: 'Call on WhatsApp',
    description: 'Direct WhatsApp voice call action button',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    ),
  },
  {
    type: 'PHONE_NUMBER',
    label: 'Call Phone Number',
    description: 'Direct phone call with country code',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 9.8 19.79 19.79 0 0 1 .01 1.18 2 2 0 0 1 2 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92v2z"></path>
      </svg>
    ),
  },
  {
    type: 'COPY_CODE',
    label: 'Copy offer code',
    description: 'One-click copy button for coupon / promo codes',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    ),
  },
  {
    type: 'CONTACT_INFO',
    label: 'Share contact info',
    description: 'Let users share contact details or profile',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
  },
];

function renderFormattedAiText(text) {
  if (!text) return null;
  const defaultAiMapping = { '1': 'customer_name', '2': 'plan_name', '3': 'amount', '4': 'product_name' };
  let normalized = String(text).replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (_, v) => '{{' + v + '}}');
  const namedText = convertNumberedToNamedText(normalized, defaultAiMapping);
  const parts = String(namedText).split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-purple-500/20 text-[#c490e8] font-mono text-[12px] border border-purple-500/40 font-semibold align-baseline"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── Phone Preview Component (extracted to avoid deep nesting in return) ──
function PhonePreview({ form, buttons = [], actionMode, previewMode = 'named', variableMapping = {} }) {
  const whatsappPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' opacity='0.08'%3E%3Cpath d='M10 10h12v12H10zM40 50h12v12H40zM70 20h12v12H70zM20 70h12v12H20zM70 70h12v12H70z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='25' cy='35' r='5' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='75' cy='45' r='6' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Cpath d='M45 15l10 10-10 10M15 85l10-10 10 10' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`;
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.error("Video preview play error:", err));
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden', height: '560px' }}>
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', width: '300px', position: 'relative' }}>

        {/* ── Phone outer shell ── */}
        <div style={{
          width: '300px',
          borderRadius: '44px',
          background: '#14121b',
          padding: '10px',
          border: '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 0 8px #14121b, 0 20px 60px rgba(0,0,0,0.9)',
          position: 'relative',
        }}>

          {/* ── Phone screen ── */}
          <div style={{
            background: '#0c0b11',
            borderRadius: '36px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '580px',
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* ── Top Header Section (#1C1C1C Fill Color) ── */}
            <div style={{
              background: '#1C1C1C',
              padding: '10px 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              {/* Status bar row: 9:05 + Dynamic Island + Icons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '8px',
              }}>
                <span style={{ minWidth: '40px' }}>9:05</span>

                {/* Dynamic Island Pill Notch */}
                <div style={{
                  width: '80px',
                  height: '20px',
                  background: '#000000',
                  borderRadius: '14px',
                }} />

                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', minWidth: '40px', justifyContent: 'flex-end' }}>
                  {/* WiFi */}
                  <svg width="13" height="10" viewBox="0 0 15 11" fill="none">
                    <path d="M7.5 8.5C8.05 8.5 8.5 8.95 8.5 9.5C8.5 10.05 8.05 10.5 7.5 10.5C6.95 10.5 6.5 10.05 6.5 9.5C6.5 8.95 6.95 8.5 7.5 8.5Z" fill="white"/>
                    <path d="M4.2 6.2C5.1 5.4 6.25 5 7.5 5C8.75 5 9.9 5.4 10.8 6.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M1.5 3.8C3.1 2.35 5.2 1.5 7.5 1.5C9.8 1.5 11.9 2.35 13.5 3.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {/* Battery */}
                  <svg width="20" height="10" viewBox="0 0 24 12" fill="none">
                    <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="white" strokeOpacity="0.8"/>
                    <rect x="1.5" y="1.5" width="17" height="9" rx="1.5" fill="white"/>
                    <path d="M22 4V8C22.8 7.6 23.5 6.85 23.5 6C23.5 5.15 22.8 4.4 22 4Z" fill="white" fillOpacity="0.6"/>
                  </svg>
                </div>
              </div>

              {/* Header content */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {/* Back arrow */}
                <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <svg width="9" height="16" viewBox="0 0 10 17" fill="none">
                    <path d="M9 1L1.5 8.5L9 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Avatar */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#2A2A2A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '700',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
                  <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Orbion Agents</div>
                  <div style={{ color: '#8E8E93', fontSize: '10px' }}>Business account</div>
                </div>

                {/* Actions: video + phone */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
                    <rect width="14" height="12" x="2" y="6" rx="2" />
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.08 2.83 2 2 0 012.07 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ── Chat area ── */}
            <div style={{
              flex: 1,
              padding: '14px 12px',
              background: '#0c0b11',
              backgroundImage: whatsappPattern,
              backgroundSize: '100px 100px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '430px',
            }}>
              <div style={{ alignSelf: 'flex-start', width: '100%' }}>

                {/* Message bubble */}
                <div style={{
                  background: '#1C1C1C',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  padding: '14px 16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}>

                  {/* Media header */}
                  {(form.type === 'IMAGE' || form.type === 'VIDEO') && form.mediaPreviewUrl && (
                    <div
                      onClick={form.type === 'VIDEO' ? togglePlay : undefined}
                      style={{
                        width: '100%',
                        aspectRatio: '1.91 / 1',
                        overflow: 'hidden',
                        background: '#000',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        position: 'relative',
                        cursor: form.type === 'VIDEO' ? 'pointer' : 'default'
                      }}
                    >
                      {form.type === 'IMAGE' ? (
                        <img src={form.mediaPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <video
                          ref={videoRef}
                          src={form.mediaPreviewUrl}
                          playsInline
                          preload="metadata"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                      {form.type === 'VIDEO' && !isPlaying && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    {form.header && (
                      <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '13px', color: '#ffffff' }}>
                        {form.header}
                      </div>
                    )}
                    <div style={{ color: '#ffffff', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: '400' }}>
                      {form.message
                        ? (previewMode === 'samples'
                            ? renderPreviewText(form.message, variableMapping, 'samples')
                            : form.message)
                        : <span style={{ color: 'rgba(255,255,255,0.4)' }}>Hi {"{{customer_name}}"}, welcome to OrbionAgents.</span>
                      }
                    </div>
                    {form.footer && (
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '6px' }}>
                        {form.footer}
                      </div>
                    )}
                    <div style={{ color: '#8E8E93', fontSize: '10px', textAlign: 'right', marginTop: '6px' }}>
                      11:30 AM
                    </div>
                  </div>
                </div>

                {/* Authentication OTP button */}
                {form.category === 'AUTHENTICATION' && (
                  <div style={{
                    marginTop: '8px',
                    background: '#1C1C1C',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    textAlign: 'center',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>{form.ctaBtnTitle || 'Copy Code'}</span>
                  </div>
                )}

                {/* Dynamic Meta Buttons */}
                {form.category !== 'AUTHENTICATION' && buttons && buttons.length > 0 && (
                  buttons.length <= 3 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {buttons.map((b, idx) => (
                        <div key={b.id || idx} style={{
                          background: '#1C1C1C',
                          borderRadius: '14px',
                          padding: '10px 14px',
                          textAlign: 'center',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        }}>
                          {b.type === 'URL' && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          )}
                          {b.type === 'PHONE_NUMBER' && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 9.8 19.79 19.79 0 0 1 .01 1.18 2 2 0 0 1 2 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92v2z"></path>
                            </svg>
                          )}
                          {b.type === 'VOICE_CALL' && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                          )}
                          {b.type === 'COPY_CODE' && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                          {(b.type === 'QUICK_REPLY' || b.type === 'CUSTOM') && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 14 4 9 9 4"></polyline>
                              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                            </svg>
                          )}
                          {b.type === 'CONTACT_INFO' && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.type === 'COPY_CODE'
                              ? (b.code ? `Copy code (${b.code})` : 'Copy code')
                              : (b.text || 'Button')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '8px',
                      background: '#1C1C1C',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                      </svg>
                      <span>See all options ({buttons.length})</span>
                    </div>
                  )
                )}

                {/* Legacy Fallback CTA button below message bubble */}
                {form.category !== 'AUTHENTICATION' && (!buttons || buttons.length === 0) && actionMode === 'cta' && (
                  <div style={{
                    marginTop: '8px',
                    background: '#1C1C1C',
                    borderRadius: '16px',
                    padding: '12px',
                    textAlign: 'center',
                    color: '#2d60ff',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                    {form.ctaBtnTitle || 'Buy Now'}
                  </div>
                )}

                {/* Legacy Quick reply buttons */}
                {form.category !== 'AUTHENTICATION' && (!buttons || buttons.length === 0) && actionMode === 'quick' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {['Yes', 'No'].map(r => (
                      <div key={r} style={{
                        background: '#1C1C1C',
                        borderRadius: '16px',
                        padding: '10px 18px',
                        color: '#2d60ff',
                        fontSize: '12px',
                        fontWeight: '600',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      }}>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

//  Main Component ─
export default function CreateTemplatePage() {
  const { workspaceId } = useAuth();
  const { showToast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [form, setForm] = useState({
    category: 'MARKETING',
    language: 'en_US',
    name: '',
    type: 'TEXT',
    header: '',
    message: '',
    footer: '',
    cta: '',
    ctaBtnTitle: 'Buy Now',
    mediaFile: null,
    mediaPreviewUrl: '',
    mediaName: '',
    mediaSize: 0,
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [tone, setTone] = useState('normal');
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const [actionMode, setActionMode] = useState('none');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Dynamic Variable System State
  const [variableMapping, setVariableMapping] = useState({});
  const [defineModalOpen, setDefineModalOpen] = useState(false);
  const [activeDefineNumber, setActiveDefineNumber] = useState('1');
  const [previewMode, setPreviewMode] = useState('named'); // 'named' or 'samples'
  const messageTextareaRef = useRef(null);

  // Derive real-time WhatsApp mapping and variable list
  const mappingResult = useMemo(() => {
    return buildWhatsAppVariableMapping(form.message, variableMapping);
  }, [form.message, variableMapping]);

  // Numbered variables in message that haven't been named yet
  const unmappedNumberedVars = useMemo(() => {
    const matches = (form.message || '').match(/\{\{(\d+)\}\}/g) || [];
    const nums = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));
    return nums;
  }, [form.message]);

  const handleMessageChange = (e) => {
    const val = e.target.value;
    const oldVal = form.message || '';
    setForm(prev => ({ ...prev, message: val }));

    // Detect if user typed a new numbered variable (e.g. {{1}}, {{2}}, {{3}})
    const prevMatches = oldVal.match(/\{\{(\d+)\}\}/g) || [];
    const newMatches = val.match(/\{\{(\d+)\}\}/g) || [];
    const newlyAdded = newMatches.filter(m => !prevMatches.includes(m));

    if (newlyAdded.length > 0) {
      const num = newlyAdded[0].replace(/[{}]/g, '');
      setActiveDefineNumber(num);
      setDefineModalOpen(true);
    }
  };

  const handleInsertVariable = (varKey) => {
    const cleanKey = sanitizeVariableName(varKey);
    const varTag = `{{${cleanKey}}}`;
    const textarea = messageTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart ?? form.message.length;
      const end = textarea.selectionEnd ?? form.message.length;
      const before = form.message.substring(0, start);
      const after = form.message.substring(end);
      const nextMessage = before + varTag + after;
      setForm(prev => ({ ...prev, message: nextMessage }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varTag.length, start + varTag.length);
      }, 0);
    } else {
      setForm(prev => ({ ...prev, message: (prev.message || '') + varTag }));
    }
  };

  const handleDefineVariable = (number, chosenName) => {
    const cleanName = sanitizeVariableName(chosenName);
    if (!cleanName) return;

    setVariableMapping(prev => ({
      ...prev,
      [number]: cleanName,
    }));

    // Replace all instances of {{number}} in message with {{cleanName}}
    const regex = new RegExp(`\\{\\{\\s*${number}\\s*\\}\\}`, 'g');
    setForm(prev => ({
      ...prev,
      message: (prev.message || '').replace(regex, `{{${cleanName}}}`),
    }));

    showToast(`Variable defined as {{${cleanName}}}!`, 'success');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('name');
      const category = params.get('category');
      const content = params.get('content');
      const header = params.get('header');
      const footer = params.get('footer');
      const cta = params.get('cta');
      const ctaBtnTitle = params.get('cta_btn_title');

      if (name || category || content || header || footer || cta || ctaBtnTitle) {
        setForm(prev => ({
          ...prev,
          name: name || prev.name,
          category: category ? category.toUpperCase() : prev.category,
          message: content ? decodeURIComponent(content) : prev.message,
          header: header || prev.header,
          footer: footer || prev.footer,
          cta: cta || prev.cta,
          ctaBtnTitle: ctaBtnTitle || prev.ctaBtnTitle || 'Buy Now',
        }));
        if (cta) {
          setActionMode('cta');
          setButtons([{
            id: 'btn_init',
            type: 'URL',
            text: ctaBtnTitle || 'Visit Website',
            url: cta,
          }]);
        }
      }
    }
  }, []);

  // Interactive Buttons State (Meta WhatsApp Official Buttons)
  const [buttons, setButtons] = useState([]);
  const [buttonDropdownOpen, setButtonDropdownOpen] = useState(false);
  const buttonDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (buttonDropdownRef.current && !buttonDropdownRef.current.contains(event.target)) {
        setButtonDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddButton = (type) => {
    setButtonDropdownOpen(false);
    if (buttons.length >= 10) {
      showToast('Meta allows a maximum of 10 buttons per template.', 'warning');
      return;
    }

    if (type === 'URL') {
      const urlCount = buttons.filter(b => b.type === 'URL').length;
      if (urlCount >= 2) {
        showToast('Meta allows a maximum of 2 website URL buttons.', 'warning');
        return;
      }
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'URL',
        text: 'Visit website',
        url: '',
      }]);
    } else if (type === 'PHONE_NUMBER') {
      const phoneCount = buttons.filter(b => b.type === 'PHONE_NUMBER').length;
      if (phoneCount >= 1) {
        showToast('Meta allows a maximum of 1 phone call button.', 'warning');
        return;
      }
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'PHONE_NUMBER',
        text: 'Call Phone Number',
        phone_number: '',
      }]);
    } else if (type === 'COPY_CODE') {
      const copyCount = buttons.filter(b => b.type === 'COPY_CODE').length;
      if (copyCount >= 1) {
        showToast('Meta allows a maximum of 1 copy offer code button.', 'warning');
        return;
      }
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'COPY_CODE',
        text: 'Copy offer code',
        code: 'SAVE20',
      }]);
    } else if (type === 'VOICE_CALL') {
      const voiceCount = buttons.filter(b => b.type === 'VOICE_CALL').length;
      if (voiceCount >= 1) {
        showToast('Meta allows a maximum of 1 Call on WhatsApp button.', 'warning');
        return;
      }
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'VOICE_CALL',
        text: 'Call on WhatsApp',
      }]);
    } else if (type === 'CONTACT_INFO') {
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'CONTACT_INFO',
        text: 'Share contact info',
      }]);
    } else {
      // QUICK_REPLY (Custom)
      setButtons(prev => [...prev, {
        id: 'btn_' + Date.now(),
        type: 'QUICK_REPLY',
        text: '',
      }]);
    }
  };

  const handleUpdateBtn = (index, field, value) => {
    setButtons(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteBtn = (index) => {
    setButtons(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveBtn = (index, direction) => {
    setButtons(prev => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  const isAuth = form.category === 'AUTHENTICATION';

  const handleGenerate = async () => {
    if (isGeneratingAI) return;
    if (!aiPrompt || aiPrompt.trim() === '') {
      showToast('Please enter a prompt to generate message', 'warning');
      return;
    }
    if (aiPrompt.trim().length < 3) {
      showToast('Prompt must be at least 3 characters', 'warning');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await api.post('/templates/generate', {
        prompt: aiPrompt.trim(),
        tone: tone,
        language: form.language,
        workspace_id: workspaceId || undefined,
      });
      let templates = [];
      if (res?.message) {
        try {
          let cleanMessage = res.message.trim();
          const firstBrace = cleanMessage.indexOf('{');
          const lastBrace = cleanMessage.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanMessage = cleanMessage.substring(firstBrace, lastBrace + 1);
          } else {
            cleanMessage = cleanMessage.replace(/```json/g, '').replace(/```/g, '').trim();
          }
          const parsed = JSON.parse(cleanMessage);
          templates = parsed.templates || [];
        } catch (e) {
          console.error('Failed to parse AI response:', e);
        }
      } else {
        templates = res?.templates || res?.data?.templates || [];
      }
      const defaultAiMapping = { '1': 'customer_name', '2': 'plan_name', '3': 'amount', '4': 'product_name' };
      const formatted = (templates || []).map(t => {
        let rawText = typeof t === 'string' ? t : (t?.text || '');
        rawText = String(rawText).replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (_, v) => '{{' + v + '}}');
        const namedText = convertNumberedToNamedText(rawText, defaultAiMapping);
        return {
          ...(typeof t === 'object' && t !== null ? t : {}),
          text: namedText
        };
      });
      setGeneratedTemplates(formatted);
    } catch (err) {
      console.warn('[Template Generator Handler]:', err?.message || err);
      const errStr = String(err?.message || err?.data?.detail || err?.data?.message || err).toLowerCase();
      const isQuotaOrLimit = err?.status === 402 || 
        err?.data?.error === 'billing_error' ||
        errStr.includes('insufficient quota') || 
        errStr.includes('upgrade your plan') || 
        errStr.includes('upgrade plan') || 
        errStr.includes('insufficient credits') || 
        errStr.includes('quota exceeded') || 
        errStr.includes('enable overages');
      if (isQuotaOrLimit) {
        setShowUpgradeModal(true);
      } else {
        const errorDetail = err?.data?.detail || err?.data?.message || err.message || 'Failed to generate template';
        showToast(errorDetail, 'error');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!form.name || form.name.trim() === '') {
      showToast('Template Name is required', 'warning');
      return;
    }
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(form.name)) {
      showToast('Template Name can only contain lowercase alphanumeric characters and underscores (e.g., app_verification_code)', 'warning');
      return;
    }
    if (!form.message || form.message.trim() === '') {
      showToast('Message content is required', 'warning');
      return;
    }
    if ((form.type === 'IMAGE' || form.type === 'VIDEO') && !form.mediaFile) {
      showToast(`Please upload a ${form.type === 'IMAGE' ? 'image' : 'video'} for the header`, 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate interactive buttons
      if (!isAuth && buttons.length > 0) {
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i];
          if (btn.type !== 'COPY_CODE' && (!btn.text || !btn.text.trim())) {
            showToast(`Button #${i + 1} text is required`, 'warning');
            setIsSubmitting(false);
            return;
          }
          if (btn.type === 'URL' && (!btn.url || !btn.url.trim())) {
            showToast(`Button #${i + 1} website URL is required`, 'warning');
            setIsSubmitting(false);
            return;
          }
          if (btn.type === 'PHONE_NUMBER' && (!btn.phone_number || !btn.phone_number.trim())) {
            showToast(`Button #${i + 1} phone number is required`, 'warning');
            setIsSubmitting(false);
            return;
          }
          if (btn.type === 'COPY_CODE' && (!btn.code || !btn.code.trim())) {
            showToast(`Button #${i + 1} offer code is required`, 'warning');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Prepare buttons payload
      const preparedButtons = (!isAuth && buttons.length > 0)
        ? buttons.map(b => {
            if (b.type === 'URL') {
              let cleanUrl = (b.url || '').trim();
              if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = `https://${cleanUrl}`;
              }
              return {
                type: 'URL',
                text: (b.text || 'Visit website').trim().slice(0, 25),
                url: cleanUrl,
              };
            }
            if (b.type === 'PHONE_NUMBER') {
              return {
                type: 'PHONE_NUMBER',
                text: (b.text || 'Call Phone Number').trim().slice(0, 25),
                phone_number: (b.phone_number || '').trim(),
              };
            }
            if (b.type === 'COPY_CODE') {
              return {
                type: 'COPY_CODE',
                example: (b.code || 'SAVE20').trim().slice(0, 15),
              };
            }
            if (b.type === 'VOICE_CALL') {
              return {
                type: 'VOICE_CALL',
                text: (b.text || 'Call on WhatsApp').trim().slice(0, 25),
              };
            }
            if (b.type === 'CONTACT_INFO') {
              return {
                type: 'CONTACT_INFO',
                text: (b.text || 'Share contact info').trim().slice(0, 25),
              };
            }
            return {
              type: 'QUICK_REPLY',
              text: (b.text || 'Reply').trim().slice(0, 25),
            };
          })
        : [];

      const firstUrl = preparedButtons.find(b => b.type === 'URL');
      const ctaVal = firstUrl ? firstUrl.url : form.cta;
      const ctaTitleVal = firstUrl ? firstUrl.text : form.ctaBtnTitle;

      // Map meaningful variables to WhatsApp sequential numbers:
      // e.g. {{customer_name}} → {{1}}, {{plan_name}} → {{2}}, {{amount}} → {{3}}
      const { numberedText, mapping } = buildWhatsAppVariableMapping(form.message, variableMapping);

      let payload;

      if (form.mediaFile) {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('type', form.type);
        fd.append('message', numberedText);
        fd.append('named_content', form.message);
        fd.append('variable_mapping', JSON.stringify(mapping));
        fd.append('header', form.header);
        fd.append('footer', form.footer);
        fd.append('cta', ctaVal || '');
        fd.append('cta_btn_title', ctaTitleVal || '');
        fd.append('buttons', JSON.stringify(preparedButtons));
        fd.append('category', form.category);
        fd.append('language', form.language);
        fd.append('workspace_id', workspaceId);
        fd.append('media', form.mediaFile);
        payload = fd;
      } else {
        payload = {
          name: form.name,
          type: form.type,
          message: numberedText,
          named_content: form.message,
          variable_mapping: mapping,
          header: form.header,
          footer: form.footer,
          cta: ctaVal || null,
          cta_btn_title: ctaTitleVal || null,
          buttons: preparedButtons,
          category: form.category,
          language: form.language,
          workspace_id: workspaceId,
        };
      }

      await api.post('/templates/create', payload);
      showToast('Template submitted successfully for Meta approval!', 'success');
      window.location.href = '/user/admin/templates';
    } catch (err) {
      console.error(err);
      showToast(err.message || err?.data?.detail || 'Failed to create template', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = form.type === 'IMAGE';
    const allowedTypes = isImage
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['video/mp4'];
    const maxSize = isImage ? 5 * 1024 * 1024 : 16 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      showToast(isImage ? 'Only JPG, PNG, WEBP allowed' : 'Only MP4 video allowed', 'warning');
      return;
    }
    if (file.size > maxSize) {
      showToast(`Max file size is ${isImage ? '5MB' : '16MB'}`, 'warning');
      return;
    }

    setForm(prev => ({
      ...prev,
      mediaFile: file,
      mediaPreviewUrl: URL.createObjectURL(file),
      mediaName: file.name,
      mediaSize: file.size,
    }));
  };

  const removeMedia = () => {
    setForm(prev => ({ ...prev, mediaFile: null, mediaPreviewUrl: '', mediaName: '', mediaSize: 0 }));
  };

  return (
    <div className={`${poppins.className} flex h-screen bg-[#05010D] text-white overflow-hidden`} style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* Mobile & Tablet Overlay Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/*  CATEGORIES SIDEBAR  */}
      <aside className={`
        fixed xl:static top-0 left-0 z-50 flex flex-col h-full w-[240px] xl:w-[240px] bg-[#060010] border-r border-[#1A0B2E] shadow-2xl xl:shadow-none
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 template-scroll">
          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium tracking-widest px-3 mb-2">Categories</p>
            <CatItem iconKey="sparkle" label="Marketing"       active={form.category === 'MARKETING'}
              onClick={() => { setForm({ ...form, category: 'MARKETING' }); setSidebarOpen(false); }} />
            <CatItem iconKey="template" label="Utility"        active={form.category === 'UTILITY'}
              onClick={() => { setForm({ ...form, category: 'UTILITY' }); setSidebarOpen(false); }} />
            <CatItem iconKey="template" label="Authentication" active={form.category === 'AUTHENTICATION'}
              onClick={() => {
                setForm(prev => ({
                  ...prev,
                  category: 'AUTHENTICATION',
                  message: prev.message && prev.message.includes('{{')
                    ? prev.message
                    : '{{otp_code}} is your verification code. For your security, do not share this code.',
                  ctaBtnTitle: prev.ctaBtnTitle && prev.ctaBtnTitle !== 'Buy Now' ? prev.ctaBtnTitle : 'Copy Code',
                }));
                setSidebarOpen(false);
              }} />
          </div>
          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium uppercase tracking-widest px-3 mb-2">Template Type</p>
            <CatItem iconKey="text"  label="Text"  active={form.type === 'TEXT'}
              onClick={() => { setForm({ ...form, type: 'TEXT' }); setSidebarOpen(false); }} />
            <CatItem iconKey="image" label="Image" active={form.type === 'IMAGE'}
              onClick={() => { setForm({ ...form, type: 'IMAGE' }); setSidebarOpen(false); }} />
            <CatItem iconKey="video" label="Video" active={form.type === 'VIDEO'}
              onClick={() => { setForm({ ...form, type: 'VIDEO' }); setSidebarOpen(false); }} />
          </div>

          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium uppercase tracking-widest px-3 mb-2">Language</p>
            <CatItem iconKey="text" label="English (US)"    active={form.language === 'en_US'}
              onClick={() => { setForm({ ...form, language: 'en_US' }); setSidebarOpen(false); }} />
            <CatItem iconKey="text" label="Tamil (தமிழ்)"   active={form.language === 'ta'}
              onClick={() => { setForm({ ...form, language: 'ta' }); setSidebarOpen(false); }} />
            <CatItem iconKey="text" label="Hindi (हिन्दी)"  active={form.language === 'hi'}
              onClick={() => { setForm({ ...form, language: 'hi' }); setSidebarOpen(false); }} />
          </div>
        </nav>
      </aside>

      {/*  MAIN CONTENT  */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar (mobile < 768px) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1A0B2E]">
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-[#24113A] text-[#B7B3C7] hover:bg-white/5 active:scale-95 transition-all">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="text-xs sm:text-base font-normal sm:font-semibold">New Template Message</h1>
        </div>

        {/* Page header (tablet md & desktop lg) */}
        <div className="hidden md:flex items-center gap-4 px-6 lg:px-8 pt-6 pb-5 border-b border-[#1A0B2E]">
          <button onClick={() => setSidebarOpen(true)}
            className="xl:hidden p-2 rounded-lg border border-[#24113A] text-[#B7B3C7] hover:bg-white/5 hover:text-white active:scale-95 transition-all"
            title="Toggle Categories"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">New Templates Message</h1>
            <p className="text-white/60 text-sm mt-0.5">Create, manage and approve WhatsApp Business templates.</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto template-scroll">
          <div className="flex flex-col xl:flex-row gap-6 p-4 sm:p-6 max-w-[1400px] mx-auto">

            {/*  FORM COLUMN  */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Generate with AI */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 shadow-[0_0_40px_rgba(168,85,247,0.08)]">
                  <h2 className="text-lg sm:text-2xl font-semibold sm:font-bold text-center mb-1">Generate with AI</h2>
                  <p className="text-white/60 text-xs sm:text-sm font-normal text-center mb-4 sm:mb-6 max-w-lg mx-auto leading-relaxed">
                    Generate professional message templates in seconds using AI-powered
                    content suggestions and smart personalization.
                  </p>
                  <div className="relative mb-4">
                    <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">Write your prompt here*</p>
                    <p className="text-white/60 text-[11px] sm:text-[13px] font-normal mb-2">
                      "Describe the template you want to create and AI will generate it for you."
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Write your prompt here..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal
                        text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]
                        focus:ring-2 focus:ring-[#814AC8]/20 transition-all duration-300 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-2">
                      {[
                        { key: 'normal',   label: 'Normal' },
                        { key: 'exciting', label: '🔥 Exciting' },
                        { key: 'funny',    label: '😂 Funny' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setTone(key)}
                          className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-normal sm:font-medium transition-all duration-200
                            ${tone === key
                              ? 'bg-[#814AC8] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                              : 'bg-transparent border border-[#24113A] text-[#B7B3C7] hover:border-[#814AC8]/50 hover:text-white'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={isGeneratingAI || !aiPrompt || aiPrompt.trim() === ''}
                      className={`flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-normal sm:font-medium
                        transition-all duration-300 ${isGeneratingAI ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'}
                        ${!aiPrompt || isGeneratingAI
                          ? 'bg-[#1A0B2E] text-[#B7B3C7]/60 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#814AC8] to-[#814AC8] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]'
                        }`}
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Icon d={icons.sparkle} size={14} />
                          ✨ Generate (10 WCC)
                        </>
                      )}
                    </button>
                  </div>
                  {generatedTemplates.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {generatedTemplates.map((tpl, i) => (
                        <div key={i} className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-4">
                          <p className="text-sm text-[#B7B3C7] whitespace-pre-line mb-3 leading-relaxed">
                            {renderFormattedAiText(tpl.text)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const defaultAiMapping = { '1': 'customer_name', '2': 'plan_name', '3': 'amount', '4': 'product_name' };
                              let raw = tpl.text || '';
                              raw = String(raw).replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (_, v) => '{{' + v + '}}');
                              const converted = convertNumberedToNamedText(raw, defaultAiMapping);
                              const { mapping } = buildWhatsAppVariableMapping(converted);
                              setVariableMapping(prev => ({ ...defaultAiMapping, ...mapping, ...prev }));
                              setForm(prev => ({ ...prev, message: converted }));
                              showToast('AI Template applied with dynamic variables!', 'info');
                            }}
                            className="w-full bg-[#814AC8]/20 border border-[#814AC8]/30 text-[#c490e8]
                              py-2 rounded-xl text-sm hover:bg-[#814AC8]/30 transition-all duration-200 cursor-pointer font-medium"
                          >
                            Use this
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Authentication Notice Banner */}
              {form.category === 'AUTHENTICATION' && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-[20px] p-4 text-xs text-amber-200/90 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <span className="text-lg leading-none mt-0.5">ℹ️</span>
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300 text-sm">Authentication Category Notice</p>
                    <p className="text-white/80 leading-relaxed">
                      If your WhatsApp account is currently not eligible for Authentication templates, you can switch category to <button type="button" onClick={() => setForm(prev => ({ ...prev, category: 'UTILITY' }))} className="underline font-bold text-white hover:text-purple-300 cursor-pointer">Utility</button>.
                    </p>
                  </div>
                </div>
              )}

              {/* Template Name */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <Input
                  label="Template Name"
                  hint="Name can only be in lowercase alphanumeric characters and underscores. Special characters and white-space are not allowed e.g - app_verification_code"
                  placeholder="cart_revival_offerflow_x9k21"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

             

              {/* Header */}
              {form.type === 'TEXT' && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <Input
                    label={<span>Template Header Text <span className="text-white/60 font-normal">(Optional)</span></span>}
                    hint="Add a short header to grab attention ( upto 60 characters)"
                    placeholder="Enter header text here"
                    value={form.header}
                    onChange={(e) => setForm({ ...form, header: e.target.value })}
                  />
                </div>
              )}

              {/* Header Media Upload — IMAGE / VIDEO types */}
              {(form.type === 'IMAGE' || form.type === 'VIDEO') && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">
                    Header ({form.type === 'IMAGE' ? 'Image' : 'Video'}) <span className="text-white/60 font-normal">(Optional)</span>
                  </p>
                  <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-2 sm:mb-3 leading-relaxed">
                    Upload {form.type === 'IMAGE' ? 'an image' : 'a video'} for your template header.
                  </p>

                  {!form.mediaPreviewUrl ? (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#3D1F6B] rounded-2xl py-6 sm:py-8 cursor-pointer hover:border-[#814AC8] transition-all duration-200">
                      <Icon d={form.type === 'IMAGE' ? icons.image : icons.video} size={24} className="text-[#814AC8]" />
                      <span className="text-xs sm:text-sm font-normal text-white/70">
                        Drag &amp; Drop or <span className="text-[#c490e8] underline">Browse File</span>
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-[#4A4359]">
                        {form.type === 'IMAGE' ? 'JPG, PNG, WEBP • Max 5MB' : 'MP4 • Max 16MB'}
                      </span>
                      <input
                        type="file"
                        accept={form.type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4'}
                        className="hidden"
                        onChange={handleMediaUpload}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 bg-[#0D021A] border border-[#24113A] rounded-2xl p-3">
                      {form.type === 'IMAGE' ? (
                        <img src={form.mediaPreviewUrl} alt={form.mediaName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <video src={form.mediaPreviewUrl} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-normal text-white truncate">{form.mediaName}</p>
                        <p className="text-[10px] sm:text-xs text-white/50">{(form.mediaSize / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <label className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#24113A] text-[11px] sm:text-xs text-[#B7B3C7] hover:border-[#814AC8]/40 hover:text-white cursor-pointer transition-all duration-200">
                        Replace
                        <input
                          type="file"
                          accept={form.type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4'}
                          className="hidden"
                          onChange={handleMediaUpload}
                        />
                      </label>
                      <button
                        onClick={removeMedia}
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      >
                        <Icon d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Message Body */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">Message Content</p>
                    <p className="text-white/60 text-[11px] sm:text-xs font-normal leading-relaxed">
                      Use text formatting - *bold*, _italic_ &amp; ~strikethrough~<br />
                      Personalize with meaningful variables like <code className="text-[#c490e8] font-mono">{"{{customer_name}}"}</code>, <code className="text-[#c490e8] font-mono">{"{{plan_name}}"}</code>, <code className="text-[#c490e8] font-mono">{"{{amount}}"}</code>.<br />
                  
                    </p>
                  </div>
                  {/* Variable Picker Button */}
                  <VariablePicker onInsertVariable={handleInsertVariable} />
                </div>

                <div className="relative mt-3">
                  <textarea
                    ref={messageTextareaRef}
                    rows={5}
                    placeholder="Hi {{customer_name}}, your {{plan_name}} plan is ready. Amount: {{amount}}"
                    value={form.message}
                    onChange={handleMessageChange}
                    className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal
                      text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]
                      focus:ring-2 focus:ring-[#814AC8]/20 transition-all duration-300 resize-none font-sans"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] sm:text-[11px] text-[#4A4359]">
                    {form.message.length} / 1024
                  </span>
                </div>

                {/* Variable Mapping & Status Card */}
                <VariableMappingCard
                  variableList={mappingResult.variableList}
                  unmappedNumberedVars={unmappedNumberedVars}
                  onOpenDefineModal={(num) => {
                    setActiveDefineNumber(num);
                    setDefineModalOpen(true);
                  }}
                />
              </div>

              {/* Footer */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <Input
                  label={<span>Message Footer <span className="text-white/60 font-normal">(Optional)</span></span>}
                  hint="Your message content. Upto 60 characters are allowed."
                  placeholder="Enter footer text here"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </div>

              {/* Buttons (Meta WhatsApp Official) */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-white text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <span>Buttons</span>
                        <span className="text-white/40 font-normal">• Optional</span>
                      </h3>
                      <p className="text-white/60 text-[11px] sm:text-xs font-normal mt-1 leading-relaxed max-w-xl">
                        Create buttons that let customers respond to your message or take action. You can add up to ten buttons. If you add more than three buttons, they will appear in a list.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 relative" ref={buttonDropdownRef}>
                      <span className="text-[11px] text-white/50 bg-[#140a26] border border-[#2c144d] px-2.5 py-1.5 rounded-xl font-mono">
                        {buttons.length} / 10
                      </span>

                      {/* + Add button Dropdown Trigger */}
                      <button
                        type="button"
                        onClick={() => setButtonDropdownOpen(prev => !prev)}
                        disabled={buttons.length >= 10}
                        className="flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#1A0B2E] border border-[#3D1F6B] text-white hover:bg-[#251042] hover:border-[#814AC8] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                      >
                        <span className="text-base leading-none font-light">+</span>
                        <span>Add button</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`transition-transform duration-200 ${buttonDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {buttonDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-[#110620] border border-[#3D1F6B] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-1.5 z-50">
                          {buttonOptions.map((opt) => (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() => handleAddButton(opt.type)}
                              className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#1E0D38] text-left transition-colors group cursor-pointer"
                            >
                              <div className="mt-0.5 p-1.5 rounded-lg bg-[#180a2c] border border-[#2e1352] text-[#c490e8] group-hover:text-white group-hover:border-[#814AC8]">
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-white group-hover:text-[#e0b0ff] block">
                                  {opt.label}
                                </span>
                                <span className="text-[10px] text-white/50 block leading-tight mt-0.5">
                                  {opt.description}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons List */}
                  {buttons.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {buttons.map((btn, index) => {
                        const opt = buttonOptions.find(o => o.type === btn.type) || buttonOptions[0];
                        return (
                          <div
                            key={btn.id || index}
                            className="bg-[#0B0613] border border-[#24113A] hover:border-[#3D1F6B] rounded-2xl p-3.5 sm:p-4 transition-all"
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#1c0d30]">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-white/40 font-semibold">
                                  #{index + 1}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-[#1A0B2E] border-[#3D1F6B] text-[#c490e8]">
                                  {opt.icon}
                                  <span>{opt.label}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveBtn(index, -1)}
                                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 text-xs cursor-pointer"
                                    title="Move up"
                                  >
                                    ▲
                                  </button>
                                )}
                                {index < buttons.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveBtn(index, 1)}
                                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 text-xs cursor-pointer"
                                    title="Move down"
                                  >
                                    ▼
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBtn(index)}
                                  className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 ml-1 transition-colors cursor-pointer"
                                  title="Remove button"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Button Title */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-white/70 text-[11px] sm:text-xs font-normal">Button text</label>
                                  <span className="text-[10px] text-white/40">{(btn.text || '').length} / 25</span>
                                </div>
                                <input
                                  type="text"
                                  maxLength={25}
                                  value={btn.text}
                                  onChange={(e) => handleUpdateBtn(index, 'text', e.target.value)}
                                  placeholder={opt.label}
                                  className="w-full bg-[#0E071A] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#814AC8]"
                                />
                              </div>

                              {/* Website URL */}
                              {btn.type === 'URL' && (
                                <div>
                                  <label className="block text-white/70 text-[11px] sm:text-xs font-normal mb-1">Website URL</label>
                                  <input
                                    type="text"
                                    value={btn.url || ''}
                                    onChange={(e) => handleUpdateBtn(index, 'url', e.target.value)}
                                    placeholder="https://example.com/shop"
                                    className="w-full bg-[#0E071A] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#814AC8]"
                                  />
                                  <p className="text-[10px] text-white/40 mt-1">Supports variables like https://example.com/order/{"{{order_id}}"}</p>
                                </div>
                              )}

                              {/* Phone Number */}
                              {btn.type === 'PHONE_NUMBER' && (
                                <div>
                                  <label className="block text-white/70 text-[11px] sm:text-xs font-normal mb-1">Phone number with country code</label>
                                  <input
                                    type="text"
                                    value={btn.phone_number || ''}
                                    onChange={(e) => handleUpdateBtn(index, 'phone_number', e.target.value)}
                                    placeholder="+919876543210"
                                    className="w-full bg-[#0E071A] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#814AC8]"
                                  />
                                  <p className="text-[10px] text-white/40 mt-1">E.g. +91 98765 43210</p>
                                </div>
                              )}

                              {/* Offer Code */}
                              {btn.type === 'COPY_CODE' && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-white/70 text-[11px] sm:text-xs font-normal">Offer / Discount Code</label>
                                    <span className="text-[10px] text-white/40">{(btn.code || '').length} / 15</span>
                                  </div>
                                  <input
                                    type="text"
                                    maxLength={15}
                                    value={btn.code || ''}
                                    onChange={(e) => handleUpdateBtn(index, 'code', e.target.value.toUpperCase())}
                                    placeholder="SAVE20"
                                    className="w-full bg-[#0E071A] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-emerald-400 placeholder:text-white/30 focus:outline-none focus:border-[#814AC8]"
                                  />
                                  <p className="text-[10px] text-white/40 mt-1">Customers tap to copy code directly (max 15 chars)</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-2xl border border-dashed border-[#24113A] bg-[#0c0416] text-center">
                      <p className="text-xs text-white/40">No buttons added yet. Click &quot;+ Add button&quot; to add interactive actions.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Actions for Authentication (OTP Copy Code Button) */}
              {isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Icon d={icons.sparkle} size={14} className="text-[#c490e8]" />
                      <span>One-Tap OTP Button (Authentication)</span>
                    </p>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      Copy Code
                    </span>
                  </div>
                  <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-3 leading-relaxed">
                    Meta automatically provides a high-converting one-tap Copy Code action button for authentication templates.
                  </p>
                  <div>
                    <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-1">Button Title</p>
                    <input
                      value={form.ctaBtnTitle || 'Copy Code'}
                      onChange={(e) => setForm({ ...form, ctaBtnTitle: e.target.value })}
                      placeholder="Copy Code"
                      className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm font-normal text-white focus:outline-none focus:border-[#814AC8]/60"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-normal sm:font-semibold text-xs sm:text-base text-white
                  bg-[#814AC8] disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-[0_0_30px_rgba(168,85,247,0.3)]
                  hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-[1.01]
                  transition-all duration-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-5">

              {/* Template Preview card */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs sm:text-base font-normal sm:font-semibold text-white">Template Preview</h3>
                </div>
                <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-3 leading-relaxed">
                  Preview your template with meaningful variables or live sample values.
                </p>

                {/* View Mode Toggle: Named Variables vs Sample Values */}
                <div className="flex items-center gap-1 p-1 mb-3 rounded-xl bg-[#0d041a] border border-[#24113A]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('named')}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      previewMode === 'named'
                        ? 'bg-[#814AC8] text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Variable Names
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('samples')}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      previewMode === 'samples'
                        ? 'bg-[#814AC8] text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Sample Data
                  </button>
                </div>

                <PhonePreview
                  form={form}
                  buttons={buttons}
                  actionMode={actionMode}
                  previewMode={previewMode}
                  variableMapping={mappingResult.mapping}
                />
              </div>
              {/* ↑ Template Preview card closes here */}

              {/* Quick Click-to-Insert Variables Palette */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-base font-medium text-white flex items-center gap-1.5">
                    <span>Quick Variables</span>
                  </h3>
                  <span className="text-[10px] text-[#c490e8] bg-[#814AC8]/20 border border-[#814AC8]/30 px-2 py-0.5 rounded-full font-medium">
                    Click to insert
                  </span>
                </div>
                <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-3 leading-relaxed">
                  Click any variable below to instantly add it to your message editor:
                </p>

                {/* Variable chips grouped by category */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 block mb-1.5">
                      Contact
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'customer_name', label: 'First Name' },
                        { key: 'last_name', label: 'Last Name' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'email', label: 'Email' },
                      ].map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertVariable(v.key)}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#140a26] hover:bg-[#814AC8]/30 text-[#c490e8] hover:text-white border border-[#2c144d] hover:border-[#814AC8] transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                          title={`Insert {{${v.key}}}`}
                        >
                          <span className="text-white/40 text-[10px]">+</span>
                          <span>{`{{${v.key}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 block mb-1.5">
                      Custom &amp; Security
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'plan_name', label: 'Plan Name' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'otp_code', label: 'OTP Code' },
                        { key: 'product_name', label: 'Product Name' },
                        { key: 'order_id', label: 'Order ID' },
                        { key: 'company', label: 'Company' },
                      ].map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertVariable(v.key)}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#140a26] hover:bg-[#814AC8]/30 text-[#c490e8] hover:text-white border border-[#2c144d] hover:border-[#814AC8] transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                          title={`Insert {{${v.key}}}`}
                        >
                          <span className="text-white/40 text-[10px]">+</span>
                          <span>{`{{${v.key}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active in Template summary */}
                <div className="mt-4 pt-3 border-t border-[#1f0d36]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 block mb-2">
                    Active in Template ({mappingResult.variableList.length})
                  </span>
                  {mappingResult.variableList.length > 0 ? (
                    <div className="space-y-1.5">
                      {mappingResult.variableList.map((v) => (
                        <div
                          key={v.key}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#0d021a] border border-[#24113A] text-xs font-mono"
                        >
                          <span className="text-emerald-400 font-semibold">{`{{${v.key}}}`}</span>
                          <span className="text-white/50 text-[11px] font-sans truncate max-w-[120px]">
                            {v.sample}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/40 italic">
                      No variables added yet. Click any variable above to personalize.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Define Variable Modal (shown when {{1}} is typed or clicked) */}
      <DefineVariableModal
        isOpen={defineModalOpen}
        variableNumber={activeDefineNumber}
        onClose={() => setDefineModalOpen(false)}
        onDefine={handleDefineVariable}
        existingMapping={variableMapping}
      />

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}