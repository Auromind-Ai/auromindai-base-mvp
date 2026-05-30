'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';

// ── Icons (inline SVG to avoid extra deps) ────────────────────────────────────
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

// ── Sidebar category item ─────────────────────────────────────────────────────
const CatItem = ({ iconKey, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
      ${active
        ? 'bg-[#1A0B2E] text-white border border-[#3D1F6B]'
        : 'text-[#B7B3C7] hover:text-white hover:bg-[#110820]'
      }`}
  >
    <Icon d={icons[iconKey] || icons.template} size={14} />
    <span>{label}</span>
  </button>
);

// ── Input ─────────────────────────────────────────────────────────────────────
const Input = ({ label, hint, placeholder, value, onChange, className = '' }) => (
  <div className={className}>
    {label && <p className="text-white text-sm font-medium mb-1">{label}</p>}
    {hint && <p className="text-white/60 text-xs mb-3 leading-relaxed">{hint}</p>}
    <input
      className="w-full bg-[#0B0613] border border-[#24113A] rounded-2xl px-4 py-3 text-sm text-white
        placeholder:text-[#4A4359] focus:outline-none focus:border-purple-500 focus:ring-2
        focus:ring-purple-500/20 transition-all duration-300"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

// ── Phone Preview Component (extracted to avoid deep nesting in return) ────────
function PhonePreview({ form, actionMode }) {
  const whatsappPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' opacity='0.06'%3E%3Ctext x='5' y='20' font-size='14' fill='white'%3E%F0%9F%98%8A%3C/text%3E%3Ctext x='40' y='15' font-size='12' fill='white'%3E%F0%9F%93%B7%3C/text%3E%3Ctext x='60' y='35' font-size='11' fill='white'%3E%F0%9F%8E%B5%3C/text%3E%3Ctext x='10' y='50' font-size='11' fill='white'%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3Ctext x='45' y='55' font-size='13' fill='white'%3E%F0%9F%8C%9F%3C/text%3E%3Ctext x='20' y='72' font-size='12' fill='white'%3E%F0%9F%93%B1%3C/text%3E%3Ctext x='58' y='70' font-size='11' fill='white'%3E%E2%9C%88%EF%B8%8F%3C/text%3E%3C/svg%3E")`;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden', height: '560px' }}>
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', width: '300px', position: 'relative' }}>

        {/* ── Status Bar — IphoneMockup style: OUTSIDE phone shell, overlays notch ── */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '0',
          right: '0',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 28px',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600',
          pointerEvents: 'none',
        }}>
          <span>9:05</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* WiFi */}
            <svg width="14" height="11" viewBox="0 0 15 11" fill="none" style={{ display: 'block' }}>
              <path d="M7.5 8.5C8.05 8.5 8.5 8.95 8.5 9.5C8.5 10.05 8.05 10.5 7.5 10.5C6.95 10.5 6.5 10.05 6.5 9.5C6.5 8.95 6.95 8.5 7.5 8.5Z" fill="white"/>
              <path d="M4.2 6.2C5.1 5.4 6.25 5 7.5 5C8.75 5 9.9 5.4 10.8 6.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M1.5 3.8C3.1 2.35 5.2 1.5 7.5 1.5C9.8 1.5 11.9 2.35 13.5 3.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {/* Battery */}
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none" style={{ display: 'block' }}>
              <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="white" strokeOpacity="0.55"/>
              <rect x="1.5" y="1.5" width="17" height="9" rx="1.5" fill="white"/>
              <path d="M22 4V8C22.8 7.6 23.5 6.85 23.5 6C23.5 5.15 22.8 4.4 22 4Z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {/* ── Phone outer shell — IphoneMockup exact style ── */}
        <div style={{
          width: '300px',
          borderRadius: '44px',
          background: '#0d0d0e',
          padding: '10px',
          border: '1.5px solid rgba(255,255,255,0.18)',
          boxShadow: '0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 52px 110px rgba(0,0,0,0.88), 0 0 70px rgba(129,74,200,0.12)',
          position: 'relative',
        }}>

          {/* ── Phone screen ── */}
          <div style={{
            background: '#0d0d14',
            borderRadius: '36px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '580px',
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* Dynamic Island — IphoneMockup exact */}
            <div style={{
              width: '100px',
              height: '28px',
              background: '#000',
              borderRadius: '20px',
              margin: '12px auto 0',
              flexShrink: 0,
            }} />

            {/* ── WA Header — IphoneMockup style ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#1a1a2e',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              {/* Back arrow */}
              <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="9" height="16" viewBox="0 0 10 17" fill="none">
                  <path d="M9 1L1.5 8.5L9 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Avatar — IphoneMockup style: purple gradient + letter */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                flexShrink: 0,
                position: 'relative',
              }}>
                A
                {/* Online dot — IphoneMockup style */}
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid #1a1a2e',
                }} />
              </div>

              {/* Name + status */}
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Auromind</div>
                <div style={{ color: '#22c55e', fontSize: '10px' }}>online</div>
              </div>

              {/* Actions — IphoneMockup: video + phone only */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.899L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                    stroke="rgba(255,255,255,0.72)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.08 2.83 2 2 0 012.07 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                    stroke="rgba(255,255,255,0.72)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* ── Chat area — dark bg + WA pattern ── */}
            <div style={{
              flex: 1,
              padding: '12px',
              background: '#0d0d1a',
              backgroundImage: whatsappPattern,
              backgroundSize: '80px 80px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '380px',
            }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>

                {/* Message bubble */}
                <div style={{
                  background: '#1e2a45',
                  borderRadius: '16px 16px 16px 4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ padding: '10px 12px' }}>
                    {form.header && (
                      <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '12px', color: 'white' }}>
                        {form.header}
                      </div>
                    )}
                    <div style={{ color: 'white', fontSize: '11px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {form.message
                        ? form.message
                        : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Your message will appear here...</span>
                      }
                    </div>
                    {form.footer && (
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '6px' }}>
                        {form.footer}
                      </div>
                    )}
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', textAlign: 'right', marginTop: '4px' }}>
                      11:30 AM
                    </div>
                  </div>

                  {/* CTA button */}
                  {actionMode === 'cta' && (
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      padding: '9px 12px',
                      textAlign: 'center',
                      color: '#4da3ff',
                      fontSize: '12px',
                      fontWeight: '600',
                      letterSpacing: '0.3px',
                    }}>
                      🔗 Buy Now
                    </div>
                  )}
                </div>

                {/* Quick reply buttons */}
                {actionMode === 'quick' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {['Yes', 'No'].map(r => (
                      <div key={r} style={{
                        background: '#1e2a45',
                        border: '1px solid rgba(77,163,255,0.4)',
                        borderRadius: '20px',
                        padding: '5px 14px',
                        color: '#4da3ff',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Input bar — IphoneMockup style ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#1a1a2e',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '6px 14px',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '11px',
              }}>
                Message
              </div>
              {/* Send button — IphoneMockup purple gradient */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreateTemplatePage() {
  const [form, setForm] = useState({
    category: 'MARKETING',
    language: 'en_US',
    name: '',
    type: 'TEXT',
    header: '',
    message: '',
    footer: '',
    cta: '',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [tone, setTone] = useState('normal');
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const [actionMode, setActionMode] = useState('none');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          let cleanMessage = res.message.replace(/```json/g, '').replace(/```/g, '').trim();
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
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post('/templates/create', {
        name: form.name,
        type: form.type,
        message: form.message,
        header: form.header,
        footer: form.footer,
        cta: form.cta,
        category: form.category,
        language: form.language,
        workspace_id: getWorkspaceIdFromToken(),
      });
      window.location.href = '/user/admin/templates';
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create template');
    }
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
    <div className="flex h-screen bg-[#05010D] text-white overflow-hidden font-sans">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:static z-30 flex flex-col h-full w-[240px] bg-[#060010] border-r border-[#1A0B2E]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 template-scroll">
          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium uppercase tracking-widest px-3 mb-2">Manage</p>
            <CatItem iconKey="template" label="Template Message" active={true} />
            <CatItem iconKey="agents"   label="Agents"           active={false} />
            <CatItem iconKey="analytics" label="Analytics"       active={false} />
          </div>
          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium uppercase tracking-widest px-3 mb-2">Categories</p>
            <CatItem iconKey="template" label="Utility"        active={false}
              onClick={() => setForm({ ...form, category: 'UTILITY' })} />
            <CatItem iconKey="template" label="Marketing"      active={form.category === 'MARKETING'}
              onClick={() => setForm({ ...form, category: 'MARKETING' })} />
            <CatItem iconKey="template" label="Authentication" active={form.category === 'AUTHENTICATION'}
              onClick={() => setForm({ ...form, category: 'AUTHENTICATION' })} />
          </div>
          <div className="pt-4 pb-1">
            <p className="text-[14px] text-white font-medium uppercase tracking-widest px-3 mb-2">Template Type</p>
            <CatItem iconKey="text"  label="Text"  active={form.type === 'TEXT'}
              onClick={() => setForm({ ...form, type: 'TEXT' })} />
            <CatItem iconKey="image" label="Image" active={form.type === 'IMAGE'}
              onClick={() => setForm({ ...form, type: 'IMAGE' })} />
            <CatItem iconKey="video" label="Video" active={form.type === 'VIDEO'}
              onClick={() => setForm({ ...form, type: 'VIDEO' })} />
          </div>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1A0B2E]">
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-[#24113A] text-[#B7B3C7]">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="text-base font-semibold">New Template Message</h1>
        </div>

        {/* Page header */}
        <div className="hidden md:block px-8 pt-7 pb-5 border-b border-[#1A0B2E]">
          <h1 className="text-3xl font-bold text-white tracking-tight">New Templates Message</h1>
          <p className="text-white/60 text-sm mt-1">Create, manage and approve WhatsApp Business templates.</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto template-scroll">
          <div className="flex gap-6 p-6 max-w-[1400px] mx-auto">

            {/* ── FORM COLUMN ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Generate with AI */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-8 shadow-[0_0_40px_rgba(168,85,247,0.08)]">
                  <h2 className="text-2xl font-bold text-center mb-1">Generate with AI</h2>
                  <p className="text-white/60 text-sm text-center mb-6 max-w-lg mx-auto leading-relaxed">
                    Generate professional message templates in seconds using AI-powered
                    content suggestions and smart personalization.
                  </p>
                  <div className="relative mb-4">
                    <p className="text-white text-m font-medium mb-1">Write your prompt here*</p>
                    <p className="text-white/60 text-[13px] mb-2">
                      "Describe the template you want to create and AI will generate it for you."
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Write your prompt here..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-[#0B0613] border border-[#24113A] rounded-2xl px-4 py-3 text-sm
                        text-white placeholder:text-[#4A4359] focus:outline-none focus:border-purple-500
                        focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 resize-none"
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
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                            ${tone === key
                              ? 'bg-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                              : 'bg-transparent border border-[#24113A] text-[#B7B3C7] hover:border-purple-500/50 hover:text-white'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={!aiPrompt || aiPrompt.trim() === ''}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
                        transition-all duration-300 hover:scale-[1.02]
                        ${!aiPrompt
                          ? 'bg-[#1A0B2E] text-[#4A4359] cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]'
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
                            className="w-full bg-purple-600/20 border border-purple-500/30 text-purple-300
                              py-1.5 rounded-xl text-sm hover:bg-purple-600/30 transition-all duration-200"
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

              {/* Message Body */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <p className="text-white text-m font-medium mb-1">Message Content</p>
                <p className="text-white/60 text-xs mb-3 leading-relaxed">
                  Use text formatting - *bold*, _italic_ &amp; ~strikethrough~<br />
                  Your message content. Upto 1024 characters are allowed.<br />
                  {'e.g – Hello {{1}}, your code will expire in {{2}} mins.'}
                </p>
                <div className="relative">
                  <textarea
                    rows={6}
                    placeholder="Hi {{1}}..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#0B0613] border border-[#24113A] rounded-2xl px-4 py-3 text-sm
                      text-white placeholder:text-[#4A4359] focus:outline-none focus:border-purple-500
                      focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                  />
                  <span className="absolute bottom-3 right-4 text-[11px] text-[#4A4359]">
                    {form.message.length} / 1024
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {['{{1}}', '{{2}}', '{{3}}', '{{4}}', '{{5}}'].map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVar(v)}
                      className="px-3 py-1 rounded-full border border-[#3D1F6B] text-purple-400 text-xs
                        hover:bg-purple-600/20 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]
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
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <p className="text-white text-m font-medium mb-1">Interactive Actions</p>
                  <p className="text-white/60 text-xs mb-4 leading-relaxed">
                    In addition to your message, you can send actions with your message. Maximum 25 characters
                    are allowed in CTA button title &amp; Quick Replies.
                  </p>
                  <div className="flex gap-2 mb-5 flex-wrap">
                    {[
                      { key: 'none',  label: 'None' },
                      { key: 'cta',   label: 'Quick to Actions' },
                      { key: 'quick', label: 'Quick Replies' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setActionMode(key)}
                        className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all duration-200
                          ${actionMode === key
                            ? 'border-purple-500 text-purple-300 bg-purple-600/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                            : 'border-[#24113A] text-[#B7B3C7] hover:border-purple-500/40 hover:text-white'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {actionMode === 'cta' && (
                    <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white">Call to Action</p>
                        <span className="text-[10px] text-green-400">20 Characters left</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-white/60 text-xs mb-1">Action Type</p>
                          <input defaultValue="URL"
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-sm
                              text-white focus:outline-none focus:border-purple-500/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs mb-1">Button Title</p>
                          <input defaultValue="Buy Now"
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-sm
                              text-white focus:outline-none focus:border-purple-500/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs mb-1">Website URL</p>
                          <input
                            placeholder="URL"
                            value={form.cta}
                            onChange={(e) => setForm({ ...form, cta: e.target.value })}
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-sm
                              text-white placeholder:text-[#4A4359] focus:outline-none focus:border-purple-500/60"
                          />
                        </div>
                      </div>
                      <button className="w-full mt-3 py-2.5 rounded-xl border border-[#24113A] text-[#B7B3C7]
                        text-sm hover:border-purple-500/40 hover:text-white transition-all duration-200">
                        + Add Another Action
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl font-semibold text-white
                  bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500
                  shadow-[0_0_30px_rgba(168,85,247,0.3)]
                  hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-[1.01]
                  transition-all duration-300"
              >
                Submit
              </button>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="w-[300px] shrink-0 hidden lg:flex flex-col gap-5">

              {/* Template Preview card */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
                <h3 className="text-white font-semibold mb-1">Template Preview</h3>
                <p className="text-white/60 text-xs mb-4 leading-relaxed">
                  Your template message preview. It will update as you fill in the values in the form.
                </p>
                <PhonePreview form={form} actionMode={actionMode} />
              </div>
              {/* ↑ Template Preview card closes here */}

              {/* Sample Values */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <h3 className="text-white font-semibold mb-4">Sample Values</h3>
                <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-3">
                  <p className="text-white text-[13px] font-medium mb-1">About Variables</p>
                  <p className="text-white/60 text-[12px] mb-3">
                    {'Use {{1}}, {{2}}, etc. to personalize your message.'}
                  </p>
                  <div className="space-y-2">
                    {sampleVars.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between border-b border-[#1A0B2E] pb-2">
                        <span className="text-purple-400 text-xs font-mono">{key}</span>
                        <span className="text-[#B7B3C7] text-xs">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-purple-600/20 rounded-lg">
                    <Icon d={icons.tip} size={14} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-1">Pro Tip</p>
                    <p className="text-white/60 text-xs leading-relaxed">
                      Maximize engagement by adding up to 20 actions. These will appear as button to your users.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}