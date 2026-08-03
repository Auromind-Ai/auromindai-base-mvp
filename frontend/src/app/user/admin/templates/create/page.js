'use client';

import { useState, useEffect, useRef } from 'react';
import { Poppins } from 'next/font/google';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UpgradeModal from '@/components/UpgradeModal';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

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

// ── Phone Preview Component (extracted to avoid deep nesting in return) ──
function PhonePreview({ form, actionMode }) {
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
                  <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Auromind</div>
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
                        ? form.message
                        : <span style={{ color: 'rgba(255,255,255,0.4)' }}>Hey {"{{1}}"}, just a reminder.</span>
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

                {/* CTA Action button below message bubble */}
                {actionMode === 'cta' && (
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

                {/* Quick reply buttons */}
                {actionMode === 'quick' && (
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [form, setForm] = useState({
    category: 'UTILITY',
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
        }
      }
    }
  }, []);

  const isAuth = form.category === 'AUTHENTICATION';

  const handleGenerate = async () => {
    if (!aiPrompt || aiPrompt.trim() === '') {
      alert('Please enter a prompt to generate message');
      return;
    }
    try {
      const res = await api.post('/templates/generate', {
        prompt: aiPrompt,
        tone: tone,
        language: form.language,
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
      setGeneratedTemplates(templates);
    } catch (err) {
      console.warn('[Template Generator Handler]:', err?.message || err);
      const errStr = String(err?.message || err?.data?.detail || err).toLowerCase();
      const isQuotaOrLimit = err?.status === 402 || err?.status === 403 || err?.status === 429 || errStr.includes('quota') || errStr.includes('limit') || errStr.includes('insufficient') || errStr.includes('upgrade') || errStr.includes('overages');
      if (isQuotaOrLimit) {
        setShowUpgradeModal(true);
      } else {
        alert(err.message || 'Failed to generate template');
      }
    }
  };

  const handleSubmit = async () => {
  if (!form.name || form.name.trim() === '') {
    alert('Template Name is required');
    return;
  }
  const nameRegex = /^[a-z0-9_]+$/;
  if (!nameRegex.test(form.name)) {
    alert('Template Name can only contain lowercase alphanumeric characters and underscores (e.g., app_verification_code)');
    return;
  }
  if (!form.message || form.message.trim() === '') {
    alert('Message content is required');
    return;
  }
  if ((form.type === 'IMAGE' || form.type === 'VIDEO') && !form.mediaFile) {
    alert(`Please upload a ${form.type === 'IMAGE' ? 'image' : 'video'} for the header`);
    return;
  }

  try {
    let payload;

    if (form.mediaFile) {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('type', form.type);
      fd.append('message', form.message);
      fd.append('header', form.header);
      fd.append('footer', form.footer);
      fd.append('cta', form.cta);
      fd.append('cta_btn_title', form.ctaBtnTitle);
      fd.append('category', form.category);
      fd.append('language', form.language);
      fd.append('workspace_id', workspaceId);
      fd.append('media', form.mediaFile);
      payload = fd;
    } else {
      payload = {
        name: form.name,
        type: form.type,
        message: form.message,
        header: form.header,
        footer: form.footer,
        cta: form.cta,
        cta_btn_title: form.ctaBtnTitle,
        category: form.category,
        language: form.language,
        workspace_id: workspaceId,
      };
    }

    await api.post('/templates/create', payload);
    window.location.href = '/user/admin/templates';
  } catch (err) {
    console.error(err);
    alert(err.message || 'Failed to create template');
  }
};

  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = form.type === 'IMAGE';
    const allowedTypes = isImage
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['video/mp4', 'video/quicktime'];
    const maxSize = isImage ? 5 * 1024 * 1024 : 16 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      alert(isImage ? 'Only JPG, PNG, WEBP allowed' : 'Only MP4, MOV allowed');
      return;
    }
    if (file.size > maxSize) {
      alert(`Max file size is ${isImage ? '5MB' : '16MB'}`);
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

  const insertVar = (v) => setForm({ ...form, message: form.message + v });

  const sampleVars = [
    { key: '{{1}}', label: 'Customer Name' },
    { key: '{{2}}', label: 'First Product Name' },
    { key: '{{3}}', label: 'Remaining Product Count' },
    { key: '{{4}}', label: 'Checkout Link' },
    { key: '{{5}}', label: 'Coupon Code' },
  ];

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
            <CatItem iconKey="template" label="Utility"        active={form.category === 'UTILITY'}
              onClick={() => { setForm({ ...form, category: 'UTILITY' }); setSidebarOpen(false); }} />
            <CatItem iconKey="template" label="Authentication" active={form.category === 'AUTHENTICATION'}
              onClick={() => { setForm({ ...form, category: 'AUTHENTICATION' }); setSidebarOpen(false); }} />
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
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">New Templates Message</h1>
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
                      disabled={!aiPrompt || aiPrompt.trim() === ''}
                      className={`flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-normal sm:font-medium
                        transition-all duration-300 hover:scale-[1.02]
                        ${!aiPrompt
                          ? 'bg-[#1A0B2E] text-[#4A4359] cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#814AC8] to-[#814AC8] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]'
                        }`}
                    >
                      <Icon d={icons.sparkle} size={14} />
                      ✨ Generate ($10 WCC)
                    </button>
                  </div>
                  {generatedTemplates.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {generatedTemplates.map((tpl, i) => (
                        <div key={i} className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-4">
                          <p className="text-sm text-[#B7B3C7] whitespace-pre-line mb-3">{tpl.text}</p>
                          <button
                            onClick={() => setForm({ ...form, message: tpl.text })}
                            className="w-full bg-[#814AC8]/20 border border-[#814AC8]/30 text-[#c490e8]
                              py-1.5 rounded-xl text-sm hover:bg-[#814AC8]/30 transition-all duration-200"
                          >
                            Use this
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                        {form.type === 'IMAGE' ? 'JPG, PNG, WEBP • Max 5MB' : 'MP4, MOV • Max 16MB'}
                      </span>
                      <input
                        type="file"
                        accept={form.type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'}
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
                          accept={form.type === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'}
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
                <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">Message Content</p>
                <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-2 sm:mb-3 leading-relaxed">
                  Use text formatting - *bold*, _italic_ &amp; ~strikethrough~<br />
                  Your message content. Upto 1024 characters are allowed.<br />
                  {'e.g – Hello {{1}}, your code will expire in {{2}} mins.'}
                </p>
                <div className="relative">
                  <textarea
                    rows={5}
                    placeholder="Hi {{1}}..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal
                      text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]
                      focus:ring-2 focus:ring-[#814AC8]/20 transition-all duration-300 resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] sm:text-[11px] text-[#4A4359]">
                    {form.message.length} / 1024
                  </span>
                </div>
                <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 flex-wrap">
                  {['{{1}}', '{{2}}', '{{3}}', '{{4}}', '{{5}}'].map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVar(v)}
                      className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-[#814AC8]/40 text-[#814AC8] text-[11px] sm:text-xs font-normal
                        hover:bg-[#814AC8]/20 hover:border-[#814AC8] hover:shadow-[0_0_10px_rgba(129,74,200,0.2)]
                        transition-all duration-200"
                    >
                      {v}
                    </button>
                  ))}
                </div>
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

              {/* Interactive Actions */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <p className="text-white text-xs sm:text-sm font-normal sm:font-medium mb-1">Interactive Actions</p>
                  <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-3 sm:mb-4 leading-relaxed">
                    In addition to your message, you can send actions with your message. Maximum 25 characters
                    are allowed in CTA button title &amp; Quick Replies.
                  </p>
                  <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5 flex-wrap">
                    {[
                      { key: 'none',  label: 'None' },
                      { key: 'cta',   label: 'Quick to Actions' },
                      { key: 'quick', label: 'Quick Replies' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setActionMode(key)}
                        className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-normal sm:font-medium border transition-all duration-200
                          ${actionMode === key
                            ? 'border-[#814AC8] text-[#c490e8] bg-[#814AC8]/10 shadow-[0_0_12px_rgba(129,74,200,0.2)]'
                            : 'border-[#24113A] text-[#B7B3C7] hover:border-[#814AC8]/40 hover:text-white'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {actionMode === 'cta' && (
                    <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs sm:text-sm font-normal sm:font-medium text-white">Call to Action</p>
                        <span className="text-[10px] text-green-400 font-normal">20 Characters left</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-1">Action Type</p>
                          <input defaultValue="URL"
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm font-normal
                              text-white focus:outline-none focus:border-[#814AC8]/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-1">Button Title</p>
                          <input
                            value={form.ctaBtnTitle}
                            onChange={(e) => setForm({ ...form, ctaBtnTitle: e.target.value })}
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm font-normal
                              text-white focus:outline-none focus:border-[#814AC8]/60"
                          />
                        </div>
                        <div>
                          <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-1">Website URL</p>
                          <input
                            placeholder="URL"
                            value={form.cta}
                            onChange={(e) => setForm({ ...form, cta: e.target.value })}
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-xs sm:text-sm font-normal
                              text-white placeholder:text-[#4A4359] focus:outline-none focus:border-[#814AC8]/60"
                          />
                        </div>
                      </div>
                      <button className="w-full mt-3 py-2.5 rounded-xl border border-[#24113A] text-[#B7B3C7]
                        text-xs sm:text-sm font-normal hover:border-[#814AC8]/40 hover:text-white transition-all duration-200">
                        + Add Another Action
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-normal sm:font-semibold text-xs sm:text-base text-white
                  bg-[#814AC8]
                  shadow-[0_0_30px_rgba(168,85,247,0.3)]
                  hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-[1.01]
                  transition-all duration-300"
              >
                Submit
              </button>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-5">

              {/* Template Preview card */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
                <h3 className="text-xs sm:text-base font-normal sm:font-semibold text-white mb-1">Template Preview</h3>
                <p className="text-white/60 text-[11px] sm:text-xs font-normal mb-3 sm:mb-4 leading-relaxed">
                  Your template message preview. It will update as you fill in the values in the form.
                </p>
                <PhonePreview form={form} actionMode={actionMode} />
              </div>
              {/* ↑ Template Preview card closes here */}

              {/* Sample Values */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <h3 className="text-xs sm:text-base font-normal sm:font-semibold text-white mb-3 sm:mb-4">Sample Values</h3>
                <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-3">
                  <p className="text-white text-[11px] sm:text-[13px] font-normal sm:font-medium mb-1">About Variables</p>
                  <p className="text-white/60 text-[10px] sm:text-[12px] font-normal mb-2.5 sm:mb-3">
                    {'Use {{1}}, {{2}}, etc. to personalize your message.'}
                  </p>
                  <div className="space-y-2">
                    {sampleVars.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between border-b border-[#1A0B2E] pb-2">
                        <span className="text-[#814AC8] text-[10px] sm:text-xs font-mono">{key}</span>
                        <span className="text-[#B7B3C7] text-[10px] sm:text-xs font-normal">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-[#814AC8]/20 rounded-lg">
                    <Icon d={icons.tip} size={14} className="text-[#c490e8]" />
                  </div>
                  <div>
                    <p className="text-white text-xs sm:text-sm font-normal sm:font-semibold mb-0.5 sm:mb-1">Pro Tip</p>
                    <p className="text-white/60 text-[11px] sm:text-xs font-normal leading-relaxed">
                      Maximize engagement by adding up to 20 actions. These will appear as button to your users.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}