'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Plus, Search, MoreHorizontal,
  X, Check, ChevronRight, Sparkles,
  Globe, Phone, RefreshCw, Settings, Trash2, Play, Pause, AlertCircle,
  Lightbulb, ArrowRight, Sliders, Wrench, FileText, CheckCircle2,
  Shield, Zap, ChevronDown, MessageSquare, Code2, Users, Save
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { poppins } from '@/lib/fonts';
import api from '@/lib/api';

// ─── Channel Config ─────────────────────────────────────────────────────────────
const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400 shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: '#25D366',
    bgColor: 'rgba(37, 211, 102, 0.1)',
    borderColor: 'rgba(37, 211, 102, 0.3)',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="url(#ig-grad)">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    color: '#E1306C',
    bgColor: 'rgba(225, 48, 108, 0.1)',
    borderColor: 'rgba(225, 48, 108, 0.3)',
  },
];

// ─── LLM Providers ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'gemini',
    label: 'Gemini',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 shrink-0">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#814AC8" />
      </svg>
    ),
    models: [
      'Gemini 3.8 Flash',
      'Gemini 3.6 Flash',
      'Gemini 3.5 Flash',
      'Gemini 3.5 Flash Lite',
      'Pro 3.1 Preview',
      'Flash 3.1 Lite',
      'Flash 3 Preview',
    ],
    recommended: 'Gemini 3.8 Flash',
    recommendedNote:
      'Newest stable Flash. Smarter than 3.6 at the same price, with image and voice-note understanding.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.369 2.019-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.4-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .029-.06l4.831-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
    models: ['GPT-4o', 'GPT-4o Mini', 'GPT-4 Turbo', 'GPT-3.5 Turbo'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    icon: () => (
      <div className="w-3.5 h-3.5 rounded-sm bg-[#d97757] flex items-center justify-center text-white text-[8px] font-bold shrink-0">
        A
      </div>
    ),
    models: ['Claude Sonnet 4.6', 'Claude Haiku 3.5', 'Claude Opus 4'],
  },
  {
    id: 'deepseek',
    label: 'Deepseek',
    icon: () => (
      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-[7px] font-bold shrink-0">
        D
      </div>
    ),
    models: ['DeepSeek-V3', 'DeepSeek-R1', 'DeepSeek-R1 Distill'],
  },
  {
    id: 'deepinfra',
    label: 'DeepInfra',
    icon: () => (
      <div className="w-3.5 h-3.5 flex items-end gap-px shrink-0">
        {[3, 5, 7, 9].map((h, i) => (
          <div key={i} className="w-0.5 rounded-full bg-purple-400" style={{ height: h }} />
        ))}
      </div>
    ),
    models: ['Llama 3.3 70B', 'Mistral 7B', 'Qwen 72B'],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const on = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        on
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-white/5 text-zinc-400 border-white/10'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {on ? 'Active' : 'Inactive'}
    </span>
  );
}

function ChannelBadge({ channelId }) {
  const ch = CHANNELS.find((c) => c.id === channelId) || CHANNELS[0];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border"
      style={{
        backgroundColor: ch.bgColor,
        borderColor: ch.borderColor,
        color: ch.color,
      }}
    >
      <ch.icon />
      <span>{ch.label}</span>
    </span>
  );
}

// ─── Create Assistant SIDEPANEL ──────────────────────────────────────────────────
function CreateSidepanel({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('Gemini 3.8 Flash');
  const [selectedAccount, setSelectedAccount] = useState('primary_waba');
  const [agreed, setAgreed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const prov = PROVIDERS.find((p) => p.id === provider);
  const selectedCh = CHANNELS.find((c) => c.id === channel);
  const canCreate = Boolean(name.trim() && channel && provider && model && agreed);

  const handleProviderSelect = (id) => {
    setProvider(id);
    const p = PROVIDERS.find((item) => item.id === id);
    setModel(p?.recommended || p?.models[0] || '');
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 600));

    const newAgent = {
      id: Date.now().toString(),
      name: name.trim(),
      channel,
      provider,
      model,
      selectedAccount,
      status: 'active',
      createdAt: new Date().toISOString(),
      // Professional AI Configuration defaults
      instructions: `You are an elite AI assistant for ${name.trim()}. Be professional, accurate, and concise. Act like an expert AI engineer and software engineer delivering high-grade support, product inquiries, and automated assistance.`,
      personaPreset: 'engineer',
      temperature: 0.3,
      maxTokens: 512,
      tools: {
        knowledgeBase: true,
        appointmentBooking: true,
        humanHandover: true,
        catalogLookup: false,
      },
    };

    onCreate(newAgent);
    setCreating(false);
    setName('');
    setAgreed(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Slide-in Sidepanel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-10 w-full sm:w-[580px] md:w-[640px] max-w-[100vw] h-full bg-black border-l border-white/10 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Sidepanel Header */}
            <div className="shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#814AC8]/15 border border-[#814AC8]/30 text-[#a875ec] text-[11px] font-semibold tracking-wider">
                <Sparkles size={11} /> NEW ASSISTANT
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close sidepanel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidepanel Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-[#060913]">
              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight">
                  Let&apos;s create your assistant
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Give it a name, pick where it lives, and choose its brain. You&apos;ll add instructions and tools right after.
                </p>
              </div>

              {/* Name Input & Quick Role Presets */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Engineer & Support Assistant"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#0e1424] border border-[#1e2638] text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-[#814AC8] focus:ring-2 focus:ring-[#814AC8]/20 transition-all font-medium"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-500 font-medium">Quick suggestions:</span>
                  {[
                    'AI Engineer & Support',
                    'Sales & Solutions Closer',
                    'Customer Care Agent'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setName(preset)}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1 – Choose a channel */}
              <div className="rounded-xl border border-[#1e2638] bg-gradient-to-b from-[#0e1424] to-[#080d18] overflow-hidden shadow-lg shadow-black/40">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e2638]">
                  <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Globe size={13} className="text-zinc-400" /> Choose a channel
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Where will this assistant talk to your customers?
                    </p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2.5">
                  {CHANNELS.map((ch) => {
                    const isSelected = channel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setChannel(ch.id)}
                        className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'text-white border-[#814AC8] bg-[#814AC8]/20 shadow-md shadow-[#814AC8]/10'
                            : 'text-zinc-400 border-[#1e2638] bg-[#121829] hover:border-white/20 hover:text-white hover:bg-[#161f36]'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                          <ch.icon />
                        </div>
                        <span className="font-semibold text-white">{ch.label}</span>
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#814AC8] flex items-center justify-center text-white">
                            <Check size={9} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 – Connect an account */}
              <div className="rounded-xl border border-[#1e2638] bg-gradient-to-b from-[#0e1424] to-[#080d18] overflow-hidden shadow-lg shadow-black/40">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e2638]">
                  <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Phone size={13} className="text-zinc-400" /> Connect an account
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Link the {selectedCh?.label} account this assistant should reply from.
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                      <span>WABA Account (Business API)</span>
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={11} /> Connected
                      </span>
                    </label>

                    {/* Account Selector Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#121829] border border-[#1e2638] hover:border-[#814AC8]/50 text-left transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <selectedCh.icon />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold truncate">
                              {selectedAccount === 'primary_waba'
                                ? 'Groww Digital (+91 76959 51519)'
                                : 'Meta Cloud API (Business Manager)'}
                            </p>
                            <p className="text-zinc-400 text-[11px] truncate">
                              Official Meta WhatsApp Business Account
                            </p>
                          </div>
                        </div>
                        <ChevronDown size={15} className={`text-zinc-400 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {accountDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-[#0c1220] border border-[#1e2638] shadow-2xl z-20 overflow-hidden divide-y divide-[#1e2638]">
                          <button
                            type="button"
                            onClick={() => { setSelectedAccount('primary_waba'); setAccountDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                          >
                            <div>
                              <p className="text-white text-xs font-semibold">Groww Digital (+91 76959 51519)</p>
                              <p className="text-zinc-400 text-[10px]">WABA ID: 2100178990543175 · Tier 1 (Verified)</p>
                            </div>
                            {selectedAccount === 'primary_waba' && <Check size={14} className="text-[#814AC8]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedAccount('secondary_waba'); setAccountDropdownOpen(false); }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                          >
                            <div>
                              <p className="text-white text-xs font-semibold">Meta Cloud API (Secondary)</p>
                              <p className="text-zinc-400 text-[10px]">Standard WhatsApp Business API</p>
                            </div>
                            {selectedAccount === 'secondary_waba' && <Check size={14} className="text-[#814AC8]" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 – Pick its brain */}
              <div className="rounded-xl border border-[#1e2638] bg-gradient-to-b from-[#0e1424] to-[#080d18] overflow-hidden shadow-lg shadow-black/40">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e2638]">
                  <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Sparkles size={13} className="text-zinc-400" /> Pick its brain
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Choose the AI provider and model that will power your assistant. You can fine-tune response settings later.
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Provider */}
                  <div>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
                      PROVIDER
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PROVIDERS.map((p) => {
                        const isSelected = provider === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProviderSelect(p.id)}
                            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#814AC8] bg-[#814AC8]/20 text-white shadow-sm ring-1 ring-[#814AC8]/50'
                                : 'border-[#1e2638] bg-[#121829] text-zinc-400 hover:border-white/20 hover:text-white hover:bg-[#161f36]'
                            }`}
                          >
                            <p.icon />
                            <span>{p.label}</span>
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-[#814AC8] flex items-center justify-center text-white shrink-0 ml-0.5">
                                <Check size={8} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model */}
                  {prov && (
                    <div>
                      <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
                        MODEL
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {prov.models.map((m) => {
                          const isSelected = model === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setModel(m)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#814AC8] bg-[#814AC8]/20 text-white shadow-sm ring-1 ring-[#814AC8]/50 font-semibold'
                                  : 'border-[#1e2638] bg-[#121829] text-zinc-400 hover:border-white/20 hover:text-white hover:bg-[#161f36]'
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>

                      {/* Recommendation Note */}
                      {prov.recommended === model && prov.recommendedNote && (
                        <div className="mt-3 flex items-start gap-2.5 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30">
                          <Lightbulb size={15} className="text-[#a875ec] mt-0.5 shrink-0" />
                          <p className="text-purple-200/90 text-xs leading-relaxed">
                            {prov.recommendedNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Almost there Notice */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#0e1424] border border-[#1e2638]">
                <AlertCircle size={15} className="text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold mb-0.5">Almost there</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    After creating, you&apos;ll land on the AI Configuration tab to write instructions, add tools and go live.
                  </p>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setAgreed((v) => !v)}
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-all ${
                      agreed
                        ? 'bg-[#814AC8] border-[#814AC8]'
                        : 'border-white/25 bg-white/[0.03] hover:border-white/40'
                    }`}
                  >
                    {agreed && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                  <span className="text-zinc-400 text-xs leading-relaxed">
                    I have read and agree to the{' '}
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-[#a875ec] hover:underline underline-offset-2 font-medium"
                    >
                      AI Assistant Terms of Use
                    </a>
                    .
                  </span>
                </label>
              </div>
            </div>

            {/* Sidepanel Sticky Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-black/95 backdrop-blur-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                {selectedCh && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300">
                    <selectedCh.icon />
                    <span>{selectedCh.label}</span>
                  </span>
                )}
                {prov && model && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300">
                    <Sparkles size={11} className="text-[#a875ec]" />
                    <span>{prov.label} · {model}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  canCreate && !creating
                    ? 'bg-[#814AC8] text-white hover:bg-[#9660da] shadow-lg shadow-[#814AC8]/25 cursor-pointer active:scale-[0.98]'
                    : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                }`}
              >
                {creating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <span>Create Assistant</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── AI Configuration SIDEPANEL (Tab View) ──────────────────────────────────────────
function ConfigureSidepanel({ agent, isOpen, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('instructions');
  const [instructions, setInstructions] = useState('');
  const [personaPreset, setPersonaPreset] = useState('engineer');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(512);
  const [status, setStatus] = useState('active');
  const [tools, setTools] = useState({
    knowledgeBase: true,
    appointmentBooking: true,
    humanHandover: true,
    catalogLookup: false,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (agent) {
      setInstructions(agent.instructions || `You are ${agent.name}, an AI assistant powered by ${agent.model}. Provide professional, accurate, and rapid responses.`);
      setPersonaPreset(agent.personaPreset || 'engineer');
      setTemperature(agent.temperature ?? 0.3);
      setMaxTokens(agent.maxTokens ?? 512);
      setStatus(agent.status || 'active');
      setTools(agent.tools || {
        knowledgeBase: true,
        appointmentBooking: true,
        humanHandover: true,
        catalogLookup: false,
      });
    }
  }, [agent]);

  if (!agent) return null;

  const handleApplyPreset = (preset) => {
    setPersonaPreset(preset);
    if (preset === 'engineer') {
      setInstructions(`You are an expert AI Engineer and Software Systems Specialist for ${agent.name}. 
Your goal is to answer technical architecture queries, troubleshoot integrations, assist with API flows, and provide precise code and configuration guidance in concise, helpful steps.`);
    } else if (preset === 'sales') {
      setInstructions(`You are a high-converting Sales & Solutions Assistant for ${agent.name}. 
Qualify leads by asking strategic questions, explain product value, share pricing plans, and guide users to book a demo or sign up.`);
    } else if (preset === 'support') {
      setInstructions(`You are an empathetic, dedicated Customer Support Agent for ${agent.name}. 
Resolve customer questions quickly, clarify common queries using available knowledge docs, and smoothly escalate to a human agent when necessary.`);
    }
  };

  const handleSave = () => {
    onUpdate({
      ...agent,
      instructions,
      personaPreset,
      temperature,
      maxTokens,
      status,
      tools,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-10 w-full sm:w-[620px] md:w-[700px] max-w-[100vw] h-full bg-black border-l border-white/10 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-white/10 bg-[#080d1a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#814AC8]/20 border border-[#814AC8]/30 flex items-center justify-center text-[#a875ec]">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-white text-base font-bold flex items-center gap-2">
                    {agent.name}
                    <StatusBadge status={status} />
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    {agent.channel.toUpperCase()} · {agent.provider.toUpperCase()} · {agent.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="shrink-0 px-6 border-b border-white/10 bg-[#060913] flex items-center gap-1">
              {[
                { id: 'instructions', label: 'Instructions & Persona', icon: FileText },
                { id: 'tools', label: 'Tools & Knowledge', icon: Wrench },
                { id: 'brain', label: 'Model Brain', icon: Cpu },
                { id: 'golive', label: 'Go Live', icon: Zap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-[#814AC8] text-white'
                        : 'border-transparent text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <Icon size={13} className={isCurrent ? 'text-[#a875ec]' : 'text-zinc-500'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-[#060913]">
              {/* TAB 1: Instructions & Persona */}
              {activeTab === 'instructions' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-white uppercase tracking-wider block mb-1.5">
                      Persona Preset
                    </label>
                    <p className="text-xs text-zinc-400 mb-3">
                      Choose a starting expertise role for your AI assistant.
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'engineer', label: 'AI & Software Engineer', desc: 'Technical & precise' },
                        { id: 'sales', label: 'Sales & Solutions', desc: 'High-converting' },
                        { id: 'support', label: 'Customer Care', desc: 'Empathetic & fast' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            personaPreset === p.id
                              ? 'border-[#814AC8] bg-[#814AC8]/15 ring-1 ring-[#814AC8]/50'
                              : 'border-[#1e2638] bg-[#0e1424] hover:border-white/20'
                          }`}
                        >
                          <p className="text-white text-xs font-bold">{p.label}</p>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-white uppercase tracking-wider">
                        System Instructions (Prompt)
                      </label>
                      <span className="text-[11px] text-zinc-500">{instructions.length} characters</span>
                    </div>
                    <textarea
                      rows={9}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Write how your assistant should greet customers, answer questions, and behave..."
                      className="w-full p-4 rounded-xl bg-[#0e1424] border border-[#1e2638] text-white placeholder:text-zinc-600 text-xs font-mono leading-relaxed focus:outline-none focus:border-[#814AC8] focus:ring-2 focus:ring-[#814AC8]/20 transition-all custom-scrollbar"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Tools & Knowledge */}
              {activeTab === 'tools' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Capabilities & Integrations</h4>
                    <p className="text-xs text-zinc-400">Enable automated tools this assistant can invoke during conversations.</p>
                  </div>

                  {[
                    {
                      key: 'knowledgeBase',
                      title: 'Knowledge Base (RAG)',
                      desc: 'Query company documents, FAQs, and pricing PDFs automatically before answering.',
                      icon: FileText
                    },
                    {
                      key: 'appointmentBooking',
                      title: 'Appointment & Demo Booking',
                      desc: 'Check calendar slots and book customer meetings directly in WhatsApp.',
                      icon: Zap
                    },
                    {
                      key: 'humanHandover',
                      title: 'Human Agent Handover',
                      desc: 'Pause AI and alert human support when a user asks for an agent or expresses frustration.',
                      icon: Users
                    },
                    {
                      key: 'catalogLookup',
                      title: 'Product Catalog & Orders',
                      desc: 'Browse product availability and retrieve customer order status.',
                      icon: Bot
                    },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isEnabled = tools[t.key];
                    return (
                      <div
                        key={t.key}
                        className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#0e1424] border border-[#1e2638]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#161f36] border border-[#1e2638] flex items-center justify-center shrink-0 mt-0.5">
                            <Icon size={15} className="text-[#a875ec]" />
                          </div>
                          <div>
                            <p className="text-white text-xs font-semibold">{t.title}</p>
                            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{t.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTools(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1 ${
                            isEnabled ? 'bg-[#814AC8]' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white block transition-transform absolute top-0.5 ${
                              isEnabled ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: Model Brain & Hyperparameters */}
              {activeTab === 'brain' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#0e1424] border border-[#1e2638] space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-white">Temperature (Creativity)</label>
                        <span className="text-xs font-bold text-[#a875ec]">{temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-[#814AC8] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <span>Precise & Factual (0.0)</span>
                        <span>Balanced (0.3)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-white">Max Output Tokens</label>
                        <span className="text-xs font-bold text-[#a875ec]">{maxTokens} tokens</span>
                      </div>
                      <input
                        type="range"
                        min="128"
                        max="2048"
                        step="64"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                        className="w-full accent-[#814AC8] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <span>Short (128)</span>
                        <span>Standard (512)</span>
                        <span>Long (2048)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Go Live */}
              {activeTab === 'golive' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0e1424] border border-[#1e2638] flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-bold">Assistant Status</p>
                      <p className="text-zinc-400 text-xs mt-0.5">Toggle live automated replies on WhatsApp.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatus(s => s === 'active' ? 'inactive' : 'active')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                      {status === 'active' ? 'Live & Replying' : 'Paused'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Drawer Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-black/95 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 size={14} /> Configuration Saved!
                </span>
              ) : (
                <span className="text-xs text-zinc-500">Unsaved changes will be applied instantly.</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#814AC8] hover:bg-[#9660da] text-white text-xs font-bold shadow-lg shadow-[#814AC8]/25 transition-all cursor-pointer active:scale-95"
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Agent Card ──────────────────────────────────────────────────────────────────
function AgentCard({ agent, onDelete, onToggle, onConfigure }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div
      onClick={() => onConfigure(agent)}
      className="flex items-center gap-4 px-5 py-4 rounded-xl border border-[#1e2638] bg-gradient-to-b from-[#0e1424] to-[#080d18] hover:border-[#814AC8]/50 transition-all group shadow-md shadow-black/40 cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-[#814AC8]/15 border border-[#814AC8]/25 flex items-center justify-center shrink-0">
        <Bot size={20} className="text-[#a875ec]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold text-sm truncate">{agent.name}</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelBadge channelId={agent.channel} />
          <span className="text-zinc-600 text-xs">·</span>
          <span className="text-zinc-400 text-xs">{agent.model}</span>
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onConfigure(agent)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all cursor-pointer"
          title="Configure Assistant"
        >
          <Settings size={13} className="text-[#a875ec]" />
          <span>Configure</span>
        </button>

        <button
          onClick={() => onToggle(agent)}
          className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title={agent.status === 'active' ? 'Pause assistant' : 'Activate assistant'}
        >
          {agent.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <MoreHorizontal size={15} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-[#1e2638] bg-[#0c1220] shadow-2xl z-50 overflow-hidden"
              >
                <button
                  onClick={() => {
                    onConfigure(agent);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Settings size={13} /> Configure
                </button>
                <button
                  onClick={() => {
                    onDelete(agent.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#814AC8]/15 border border-[#814AC8]/25 flex items-center justify-center text-[#a875ec] mb-5 shadow-lg shadow-[#814AC8]/10">
        <Bot size={32} />
      </div>
      <h3 className="text-white font-bold text-xl mb-2">No assistants yet</h3>
      <p className="text-zinc-400 text-sm leading-relaxed mb-6">
        Create your first AI assistant and connect it to WhatsApp or Instagram. It replies 24/7, in your voice.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#814AC8] text-white text-sm font-medium hover:bg-[#9660da] shadow-lg shadow-[#814AC8]/25 transition-all cursor-pointer active:scale-[0.98]"
      >
        <Plus size={15} /> Create your first assistant
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────
export default function AIAgentsPage() {
  const { workspaceId } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidepanelOpen, setIsSidepanelOpen] = useState(false);
  const [configuringAgent, setConfiguringAgent] = useState(null);
  const [search, setSearch] = useState('');

  // Load persisted agents from localStorage
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      const stored = localStorage.getItem(`aurofin_ai_agents_${workspaceId}`);
      if (stored) {
        setAgents(JSON.parse(stored));
      } else {
        setAgents([]);
      }
    } catch {
      setAgents([]);
    }
    setLoading(false);
  }, [workspaceId]);

  const saveAgents = (newAgents) => {
    setAgents(newAgents);
    if (workspaceId) {
      try {
        localStorage.setItem(`aurofin_ai_agents_${workspaceId}`, JSON.stringify(newAgents));
      } catch (e) {
        console.error('Failed to save agents to localStorage', e);
      }
    }
  };

  const handleAddAgent = (newAgent) => {
    saveAgents([newAgent, ...agents]);
    // Automatically land on AI Configuration tab as requested!
    setConfiguringAgent(newAgent);
  };

  const handleUpdateAgent = (updatedAgent) => {
    saveAgents(agents.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
    setConfiguringAgent(updatedAgent);
  };

  const handleDeleteAgent = (id) => {
    saveAgents(agents.filter((a) => a.id !== id));
    if (configuringAgent?.id === id) {
      setConfiguringAgent(null);
    }
  };

  const handleToggleAgent = (agent) => {
    saveAgents(
      agents.map((a) =>
        a.id === agent.id
          ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
          : a
      )
    );
  };

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`${poppins.className} relative flex flex-col h-full min-h-screen bg-[#060913] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.22),rgba(255,255,255,0))] text-white`}
    >
      {/* Top Header Bar */}
      <div className="shrink-0 px-6 py-5 border-b border-[#1e2638] flex items-center justify-between bg-[#080c16]">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <span>Dashboard</span>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-zinc-300 font-medium">AI Assistants</span>
          </nav>

          {/* AI Assistants stats badge card */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0e1424] border border-[#1e2638] w-fit shadow-md shadow-black/40">
            <div className="w-7 h-7 rounded-lg bg-[#814AC8]/20 border border-[#814AC8]/30 flex items-center justify-center text-[#a875ec]">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold leading-none mb-1">
                  AI ASSISTANTS
                </div>
                <div className="text-xs font-bold text-white leading-none">
                  {agents.length}/6
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#814AC8]/20 text-[#a875ec] border border-[#814AC8]/30 font-medium">
                + Active
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right CTA */}
        <div className="flex items-center gap-3">
          {agents.length > 0 && (
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assistants…"
                className="pl-8 pr-3 py-2 rounded-xl bg-[#0e1424] border border-[#1e2638] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#814AC8] w-48 transition-all"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSidepanelOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#814AC8] text-white text-sm font-medium hover:bg-[#9660da] shadow-lg shadow-[#814AC8]/25 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus size={15} /> Create Assistant
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-transparent">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-[#814AC8]/30 border-t-[#814AC8] animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <EmptyState onCreateClick={() => setIsSidepanelOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-zinc-400 text-sm">No assistants match &quot;{search}&quot;</p>
            <button
              onClick={() => setSearch('')}
              className="text-xs text-[#a875ec] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filtered.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onDelete={handleDeleteAgent}
                onToggle={handleToggleAgent}
                onConfigure={(ag) => setConfiguringAgent(ag)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Assistant Sidepanel (Sheet / Drawer from right) */}
      <CreateSidepanel
        isOpen={isSidepanelOpen}
        onClose={() => setIsSidepanelOpen(false)}
        onCreate={handleAddAgent}
      />

      {/* Configure Assistant Sidepanel (Tab view) */}
      <ConfigureSidepanel
        agent={configuringAgent}
        isOpen={Boolean(configuringAgent)}
        onClose={() => setConfiguringAgent(null)}
        onUpdate={handleUpdateAgent}
      />
    </div>
  );
}
