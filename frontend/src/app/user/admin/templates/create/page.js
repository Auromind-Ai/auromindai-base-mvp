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

// ── Nav item ──────────────────────────────────────────────────────────────────
const NavItem = ({ iconKey, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
      ${active
        ? 'bg-[#1A0B2E] text-white border border-[#3D1F6B]'
        : 'text-[#B7B3C7] hover:text-white hover:bg-[#110820]'
      }`}
  >
    <Icon d={icons[iconKey]} size={15} />
    <span>{label}</span>
  </button>
);

// ── Sidebar category item ─────────────────────────────────────────────────────
const CatItem = ({ iconKey, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200
      ${active
        ? 'bg-[#1A0B2E] text-purple-400 border border-[#3D1F6B]'
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
    {hint && <p className="text-[#7B748D] text-xs mb-3 leading-relaxed">{hint}</p>}
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
  const [actionMode, setActionMode] = useState('none'); // 'none' | 'cta' | 'quick'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuth = form.category === 'AUTHENTICATION';

  // ── existing handlers (unchanged) ─────────────────────────────────────────
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

  // ── variable chip helper ───────────────────────────────────────────────────
  const insertVar = (v) => setForm({ ...form, message: form.message + v });

  // ── sample variable labels ─────────────────────────────────────────────────
  const sampleVars = [
    { key: '{{1}}', label: 'Customer Name' },
    { key: '{{2}}', label: 'First Product Name' },
    { key: '{{3}}', label: 'Remaining Product Count' },
    { key: '{{4}}', label: 'Checkout Link' },
    { key: '{{5}}', label: 'Coupon Code' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#05010D] text-white overflow-hidden font-sans">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════ */}
      <aside className={`
        fixed md:static z-30 flex flex-col h-full w-[240px] bg-[#060010] border-r border-[#1A0B2E]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

       
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">

          {/* Manage */}
          <div className="pt-4 pb-1">
            <p className="text-[10px] text-[#4A4359] font-medium uppercase tracking-widest px-3 mb-2">Manage</p>
            <CatItem iconKey="template" label="Template Message" active={true} />
            <CatItem iconKey="agents"   label="Agents"           active={false} />
            <CatItem iconKey="analytics"label="Analytics"        active={false} />
          </div>

          {/* Categories */}
          <div className="pt-4 pb-1">
            <p className="text-[10px] text-[#4A4359] font-medium uppercase tracking-widest px-3 mb-2">Categories</p>
            <CatItem iconKey="template" label="Utility"        active={false}
              onClick={() => setForm({ ...form, category: 'UTILITY' })} />
            <CatItem iconKey="template" label="Marketing"      active={form.category === 'MARKETING'}
              onClick={() => setForm({ ...form, category: 'MARKETING' })} />
            <CatItem iconKey="template" label="Authentication" active={form.category === 'AUTHENTICATION'}
              onClick={() => setForm({ ...form, category: 'AUTHENTICATION' })} />
          </div>

          {/* Template Type */}
          <div className="pt-4 pb-1">
            <p className="text-[10px] text-[#4A4359] font-medium uppercase tracking-widest px-3 mb-2">Template Type</p>
            <CatItem iconKey="text"  label="Text"  active={form.type === 'TEXT'}
              onClick={() => setForm({ ...form, type: 'TEXT' })} />
            <CatItem iconKey="image" label="Image" active={form.type === 'IMAGE'}
              onClick={() => setForm({ ...form, type: 'IMAGE' })} />
            <CatItem iconKey="video" label="Video" active={form.type === 'VIDEO'}
              onClick={() => setForm({ ...form, type: 'VIDEO' })} />
          </div>

          {/* Template Language */}
          <div className="pt-4 pb-1">
            <p className="text-[10px] text-[#4A4359] font-medium uppercase tracking-widest px-3 mb-2">Template Language</p>
            <div className="px-1">
              <select
                className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-xs
                  text-[#B7B3C7] focus:outline-none focus:border-purple-500/60"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                <option value="en_US">English (US)</option>
                <option value="en_GB">English (UK)</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#1A0B2E] space-y-1">
          <NavItem iconKey="settings" label="Settings" active={false} />
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
            text-[#B7B3C7] hover:text-red-400 hover:bg-red-500/5 transition-all duration-200">
            <Icon d={icons.logout} size={15} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1A0B2E]">
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-[#24113A] text-[#B7B3C7]">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="text-base font-semibold">New Template Message</h1>
        </div>

        {/* Page header */}
        <div className="hidden md:block px-8 pt-7 pb-5 border-b border-[#1A0B2E]">
          <h1 className="text-3xl font-bold text-white tracking-tight">New Templates Message</h1>
          <p className="text-[#7B748D] text-sm mt-1">Create, manage and approve WhatsApp Business templates.</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-6 p-6 max-w-[1400px] mx-auto">

            {/* ── FORM COLUMN ─────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Generate with AI */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-8
                  shadow-[0_0_40px_rgba(168,85,247,0.08)]">
                  <h2 className="text-2xl font-bold text-center mb-1">Generate with AI</h2>
                  <p className="text-[#7B748D] text-sm text-center mb-6 max-w-lg mx-auto leading-relaxed">
                    Generate professional message templates in seconds using AI-powered
                    content suggestions and smart personalization.
                  </p>

                  {/* Prompt */}
                  <div className="relative mb-4">
                    <p className="text-white text-sm font-medium mb-1">Write your prompt here*</p>
                    <p className="text-[#4A4359] text-xs mb-2">
                      "Describe the template you want to create and AI will generate it for you."
                    </p>
                    <textarea
                      rows={3}
                      placeholder='Write your prompt here...'
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-[#0B0613] border border-[#24113A] rounded-2xl px-4 py-3 text-sm
                        text-white placeholder:text-[#4A4359] focus:outline-none focus:border-purple-500
                        focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                    />
                  </div>

                  {/* Tone + Generate */}
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

                  {/* Generated results */}
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
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6
                shadow-[0_0_30px_rgba(168,85,247,0.05)]">
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
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6
                  shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <Input
                    label={<span>Template Header Text <span className="text-[#7B748D] font-normal">(Optional)</span></span>}
                    hint="Add a short header to grab attention ( upto 60 characters)"
                    placeholder="Enter header text here"
                    value={form.header}
                    onChange={(e) => setForm({ ...form, header: e.target.value })}
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6
                shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <p className="text-white text-sm font-medium mb-1">Message Content</p>
                <p className="text-[#7B748D] text-xs mb-3 leading-relaxed">
                  Use text formatting - *bold*, _italic_ & ~strikethrough~<br />
                  Your message content. Upto 1024 characters are allowed.<br />
                  e.g – Hello {'{{1}}'}, your code will expire in {'{{2}}'} mins.
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

                {/* Variable chips */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {['{{1}}','{{2}}','{{3}}','{{4}}','{{5}}'].map((v) => (
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
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6
                shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <Input
                  label={<span>Message Footer <span className="text-[#7B748D] font-normal">(Optional)</span></span>}
                  hint="Your message content. Upto 60 characters are allowed."
                  placeholder="Enter footer text here"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </div>

              {/* Interactive Actions */}
              {!isAuth && (
                <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-6
                  shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                  <p className="text-white text-sm font-medium mb-1">Interactive Actions</p>
                  <p className="text-[#7B748D] text-xs mb-4 leading-relaxed">
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

                  {/* CTA fields */}
                  {(actionMode === 'cta') && (
                    <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white">Call to Action</p>
                        <span className="text-[10px] text-green-400">20 Characters left</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[#7B748D] text-xs mb-1">Action Type</p>
                          <input defaultValue="URL"
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-sm
                              text-white focus:outline-none focus:border-purple-500/60" />
                        </div>
                        <div>
                          <p className="text-[#7B748D] text-xs mb-1">Button Title</p>
                          <input defaultValue="Buy Now"
                            className="w-full bg-[#0B0613] border border-[#24113A] rounded-xl px-3 py-2 text-sm
                              text-white focus:outline-none focus:border-purple-500/60" />
                        </div>
                        <div>
                          <p className="text-[#7B748D] text-xs mb-1">Website URL</p>
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

            {/* ── RIGHT PANEL ─────────────────────────────── */}
            <div className="w-[300px] shrink-0 hidden lg:flex flex-col gap-5">

              {/* Template Preview */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5
                shadow-[0_0_30px_rgba(168,85,247,0.08)]">
                <h3 className="text-white font-semibold mb-1">Template Preview</h3>
                <p className="text-[#7B748D] text-xs mb-4 leading-relaxed">
                  Your template message preview. It will update as you fill in the values in the form.
                </p>

                {/* Phone mockup */}
                <div className="mx-auto w-[200px] bg-[#0D021A] border border-[#2a1a3e] rounded-[28px] p-3
                  shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-2 mb-3">
                    <span className="text-[9px] text-[#4A4359]">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-[#4A4359]" />
                      <div className="w-1 h-1 rounded-full bg-[#4A4359]" />
                      <div className="w-1 h-1 rounded-full bg-[#4A4359]" />
                    </div>
                  </div>
                  {/* Chat bubble */}
                  <div className="bg-[#1a0d30] rounded-[16px] p-3 min-h-[100px]">
                    {form.header && (
                      <p className="text-white text-[11px] font-semibold mb-1">{form.header}</p>
                    )}
                    <p className="text-[#B7B3C7] text-[10px] whitespace-pre-line leading-relaxed">
                      {form.message || 'Message preview...'}
                    </p>
                    {form.footer && (
                      <p className="text-[#4A4359] text-[9px] mt-2">{form.footer}</p>
                    )}
                    {form.cta && (
                      <p className="text-purple-400 text-[10px] mt-2 text-center">Visit Link ↗</p>
                    )}
                    <p className="text-[#4A4359] text-[9px] text-right mt-2">1:00 AM</p>
                  </div>
                </div>
              </div>

              {/* Sample Values */}
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5
                shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <h3 className="text-white font-semibold mb-4">Sample Values</h3>
                <div className="bg-[#0D021A] border border-[#24113A] rounded-2xl p-3">
                  <p className="text-white text-xs font-medium mb-1">About Variables</p>
                  <p className="text-[#7B748D] text-[11px] mb-3">
                    Use {'{{1}}'}, {'{{2}}'}, etc. to personalize your message.
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
              <div className="bg-[#090014] border border-[#24113A] rounded-[24px] p-5
                shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-purple-600/20 rounded-lg">
                    <Icon d={icons.tip} size={14} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-1">Pro Tip</p>
                    <p className="text-[#7B748D] text-xs leading-relaxed">
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