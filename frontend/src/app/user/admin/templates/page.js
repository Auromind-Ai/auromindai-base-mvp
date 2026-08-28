'use client';

import { useState, useEffect } from 'react';
import {
  Search, Plus, X, Send, Eye,
  LayoutGrid, List, ArrowUpRight, ChevronRight,
  MessageSquare, RefreshCw, TrendingUp, Star,
  BookOpen, Landmark, Heart, MapPin, Plane,
  Bell, PenLine, Clock, CheckCircle, AlertCircle,
  FileText, ShoppingCart, Rocket, Gift, Zap,
  Package, Sparkles, Users, Tag, MoreHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/* ─
   Config
─ */
const TABS = ['All', 'Draft', 'Pending', 'Approved', 'Rejected'];

const STATUS = {
  draft:    { label: 'Draft',    color: '#94a3b8', bg: 'rgba(1, 5, 12, 0.12)',   ring: 'rgba(148,163,184,0.25)' },
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(19, 14, 1, 0.12)',   ring: 'rgba(251,191,36,0.25)'  },
  approved: { label: 'Approved', color: '#34c091', bg: 'rgba(1, 14, 9, 0.12)',   ring: 'rgba(18, 245, 162, 0.25)'  },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(7, 0, 0, 0.12)',   ring: 'rgba(248,113,113,0.25)' },
};

const STAT_CFG = [
  { key: 'total',    label: 'Total templates', Icon: FileText,    color: '#60a5fa', iconBg: 'rgba(96,165,250,0.12)',  pct: 12 },
  { key: 'draft',    label: 'Draft',           Icon: PenLine,     color: '#22d3ee', iconBg: 'rgba(34,211,238,0.12)',  pct: 6  },
  { key: 'pending',  label: 'Pending',         Icon: Clock,       color: '#fb923c', iconBg: 'rgba(251,146,60,0.12)',  pct: 3  },
  { key: 'approved', label: 'Approved',        Icon: CheckCircle, color: '#34d399', iconBg: 'rgba(52,211,153,0.12)',  pct: 5  },
  { key: 'rejected', label: 'Rejected',        Icon: AlertCircle, color: '#f87171', iconBg: 'rgba(248,113,113,0.12)', pct: 2  },
  { key: 'action',   label: 'Action Required', Icon: Bell,        color: '#C49FE0', iconBg: 'rgba(167,139,250,0.12)', pct: 8  },
];

const CARD_ICONS = [
  { Icon: Rocket,        grad: 'linear-gradient(135deg,#3d1f7a 0%,#814AC8 100%)', color: '#c4b5fd', glow: 'rgba(196,181,253,0.2)' },
  { Icon: Gift,          grad: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)', color: '#93c5fd', glow: 'rgba(147,197,253,0.2)' },
  { Icon: Zap,           grad: 'linear-gradient(135deg,#713f12 0%,#b45309 100%)', color: '#fde68a', glow: 'rgba(253,230,138,0.2)' },
  { Icon: ShoppingCart,  grad: 'linear-gradient(135deg,#064e3b 0%,#059669 100%)', color: '#6ee7b7', glow: 'rgba(110,231,183,0.2)' },
  { Icon: Bell,          grad: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)', color: '#fca5a5', glow: 'rgba(252,165,165,0.2)' },
  { Icon: Package,       grad: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 100%)', color: '#7dd3fc', glow: 'rgba(125,211,252,0.2)' },
  { Icon: Sparkles,      grad: 'linear-gradient(135deg,#3d1f7a 0%,#814AC8 100%)', color: '#ddd6fe', glow: 'rgba(221,214,254,0.2)' },
  { Icon: Users,         grad: 'linear-gradient(135deg,#134e4a 0%,#0d9488 100%)', color: '#5eead4', glow: 'rgba(94,234,212,0.2)' },
  { Icon: Tag,           grad: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)', color: '#a5b4fc', glow: 'rgba(165,180,252,0.2)' },
  { Icon: MessageSquare, grad: 'linear-gradient(135deg,#1a2e05 0%,#4d7c0f 100%)', color: '#bef264', glow: 'rgba(190,242,100,0.2)' },
];

const CATEGORIES = [
  { id: 'trending',  label: 'Trending',  Icon: TrendingUp },
  { id: 'general',   label: 'General',   Icon: BookOpen   },
  { id: 'top_rated', label: 'Top Rated', Icon: Star       },
];

const INDUSTRIES = [
  { id: 'ecommerce',   label: 'Ecommerce',   Icon: ShoppingCart },
  { id: 'education',   label: 'Education',   Icon: BookOpen     },
  { id: 'banking',     label: 'Banking',     Icon: Landmark     },
  { id: 'healthcare',  label: 'Healthcare',  Icon: Heart        },
  { id: 'real_estate', label: 'Real Estate', Icon: MapPin       },
  { id: 'travel',      label: 'Travel',      Icon: Plane        },
];

/* ─
   Atoms
─ */
const StatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shrink-0"
      style={{ background: s.bg, border: `1px solid ${s.ring}`, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  );
};

const TypeTag = ({ type }) => (
  <span className="text-[10px] font-bold tracking-wider uppercase text-[#814AC8] px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 shrink-0">
    {type || 'text'}
  </span>
);

/* ─
   Skeleton
─ */
const SkeletonCard = () => (
  <div className="bg-[#111122] border border-[#1e1e3f] rounded-[18px] p-6 flex flex-col items-center gap-3.5 w-full">
    <div className="w-[72px] h-[72px] rounded-[20px] bg-[#1c1c3a] animate-pulse" />
    <div className="w-1/2 h-4 rounded bg-[#1c1c3a] animate-pulse" />
    <div className="w-4/5 h-3.5 rounded bg-[#1c1c3a] animate-pulse" />
    <div className="w-full h-3.5 rounded bg-[#1c1c3a] animate-pulse" />
    <div className="w-3/4 h-3.5 rounded bg-[#1c1c3a] animate-pulse" />
    <div className="flex gap-2 w-full pt-3.5 border-t border-[#1e1e3f]">
      <div className="flex-1 h-9 rounded-lg bg-[#1c1c3a] animate-pulse" />
      <div className="flex-1 h-9 rounded-lg bg-[#1c1c3a] animate-pulse" />
    </div>
  </div>
);

/* ─
   Template Card
─ */
function TemplateCard({ tpl, onPreview, onSubmit, onUse, viewMode, idx }) {
  const [hov, setHov] = useState(false);
  const isList = viewMode === 'list';
  const ci = CARD_ICONS[idx % CARD_ICONS.length];
  const { Icon: CardIcon } = ci;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onPreview(tpl)}
      className={`rounded-[18px] transition-all duration-200 cursor-pointer relative overflow-hidden flex w-full min-w-0 ${
        isList
          ? 'flex-col sm:flex-row sm:items-center p-4 gap-3.5'
          : 'flex-col items-center p-6 gap-4'
      } ${
        hov
          ? 'bg-[#15152e] border-[#2e2e60] -translate-y-1 shadow-[0_12px_40px_rgba(129,74,200,0.18)]'
          : 'bg-[#0B001C] border-[#1e1e3f] shadow-sm'
      } border`}
    >
      {hov && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
      )}

      {/* Icon */}
      <div
        className={`shrink-0 flex items-center justify-center transition-shadow duration-200 ${
          isList ? 'w-11 h-11 rounded-xl' : 'w-[76px] h-[76px] rounded-[22px]'
        }`}
        style={{
          background: ci.grad,
          boxShadow: hov ? `0 6px 24px ${ci.glow}` : `0 2px 12px ${ci.glow}`,
        }}
      >
        <CardIcon size={isList ? 20 : 34} color={ci.color} strokeWidth={1.6} />
      </div>

      {/* Content */}
      <div
        className={`flex-1 min-w-0 w-full flex flex-col ${
          isList ? 'items-center sm:items-start text-center sm:text-left gap-1' : 'items-center text-center gap-2.5'
        }`}
      >
        <h3 className="m-0 text-[15px] font-bold text-[#f0f0ff] tracking-tight truncate w-full">
          {tpl.name}
        </h3>
        <TypeTag type={tpl.type} />
        <p className={`m-0 text-[13px] text-white/70 leading-relaxed w-full min-w-0 ${
          isList ? 'line-clamp-2 sm:truncate sm:block' : 'line-clamp-3'
        }`}>
          {tpl.content}
        </p>
      </div>

      {/* Footer */}
      <div
        className={`flex items-center gap-2 shrink-0 flex-wrap w-full ${
          isList
            ? 'justify-between sm:justify-end sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#1e1e3f]'
            : 'justify-between pt-4 border-t border-[#1e1e3f]'
        }`}
      >
        <StatusPill status={tpl.status} />
        <div className="flex gap-2 w-full justify-between items-center">
          <button
            onClick={e => { e.stopPropagation(); onPreview(tpl); }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all bg-[#140D1F] border border-[#814AC8] text-zinc-400 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-500/10 shrink-0"
          >
            <Eye size={12} /> Preview
          </button>

          {tpl.status === 'draft' && (
            <button
              onClick={e => { e.stopPropagation(); onSubmit(tpl); }}
              className="px-3.5 py-1.5 rounded-lg border-none text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all bg-[#814AC8] hover:shadow-[0_4px_22px_rgba(129,74,200,0.7)] hover:scale-105 active:scale-95 shrink-0"
            >
              <Send size={12} /> Submit
            </button>
          )}

          {tpl.status === 'approved' && (
            <button
              onClick={e => { e.stopPropagation(); onUse(tpl); }}
              className="px-3.5 py-1.5 rounded-lg border-none text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all bg-[#814AC8] hover:shadow-[0_4px_22px_rgba(129,74,200,0.7)] hover:scale-105 active:scale-95 shrink-0"
            >
              Use template <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─
   Stat Card
─ */
function StatCard({ cfg, count, onClick, isActive }) {
  const [hov, setHov] = useState(false);
  const { label, Icon, color, iconBg, pct } = cfg;
  const active = hov || isActive;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`rounded-2xl p-4 transition-all duration-200 relative overflow-hidden flex items-center gap-3.5 min-h-[96px] w-full min-w-0 border ${
        onClick ? 'cursor-pointer' : 'default'
      } ${
        hov ? '-translate-y-1' : 'translate-y-0'
      }`}
      style={{
        background: active ? `${color}08` : '#070012',
        borderColor: active ? `${color}60` : `${color}35`,
        boxShadow: hov ? `0 8px 24px ${color}15` : 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center self-start"
        style={{
          background: iconBg,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon size={18} color={color} strokeWidth={1.8} />
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="m-0 text-2xl font-extrabold text-white tracking-tight leading-none">
          {count}
        </p>
        <p className="m-0 text-xs text-white/70 font-semibold truncate">
          {label}
        </p>
        <p className="m-0 mt-2 text-[11px] text-emerald-400 font-semibold truncate">
          {pct}% <span className="text-white/50 font-normal">from last month</span>
        </p>
      </div>
    </div>
  );
}

/* ─
   Preview Drawer
─ */
function PreviewModal({ tpl, onClose, onSubmit }) {
  const open = !!tpl;

  const fmt = (msg = '') => {
    const sampleValues = { 1: 'John', 2: 'ORD123', 3: '2 days', 4: '₹500' };
    return msg.replace(/\{\{(\d+)\}\}/g, (_, num) => {
      const value = sampleValues[num] || `Value${num}`;
      return `{{${num}}}`;
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
      />

      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[95vw] bg-gradient-to-b from-[#1a1030] to-[#0d0820] rounded-3xl border border-[#2a1f4a] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-colors"
        >
          <X size={15} />
        </button>

        <div className="p-6 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.073-1.117l-.291-.173-3.017.897.897-3.017-.173-.291A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.242-.121-1.432-.707-1.654-.787-.222-.081-.384-.121-.545.121-.161.242-.626.787-.768.949-.141.161-.282.181-.524.06-.242-.121-1.021-.376-1.945-1.199-.718-.641-1.203-1.432-1.344-1.674-.141-.242-.015-.373.106-.494.109-.109.242-.282.363-.424.121-.141.161-.242.242-.404.081-.161.04-.303-.02-.424-.061-.121-.545-1.314-.747-1.799-.196-.473-.396-.409-.545-.416l-.464-.008c-.161 0-.424.06-.646.303-.222.242-.848.829-.848 2.022s.868 2.346.989 2.507c.121.161 1.708 2.608 4.139 3.656.579.25 1.031.399 1.382.511.581.185 1.11.159 1.527.097.466-.069 1.432-.585 1.634-1.151.202-.565.202-1.049.141-1.151-.06-.101-.222-.161-.464-.282z"/>
            </svg>
          </div>

          <div className="w-full flex flex-col gap-2 p-4 bg-[#1a1a2e] rounded-2xl border border-[#25204a]">
            {tpl.header && (
              <div className="font-bold text-xs text-white mb-1">
                {tpl.header}
              </div>
            )}
            <p className="m-0 text-sm text-[#e8e8ff] leading-relaxed whitespace-pre-wrap">
              {fmt(tpl?.content) || 'No content available.'}
            </p>
            {tpl.footer && (
              <div className="text-white/45 text-[11px] mt-1">
                {tpl.footer}
              </div>
            )}
            {tpl.cta && (
              <div className="border-t border-white/10 pt-2 mt-1 text-center text-[#4da3ff] text-xs font-semibold">
                🔗 {tpl.cta_btn_title || 'Open'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Personalized', bg: 'rgba(16,100,50,0.5)',  border: '#1a5c30', color: '#4ade80' },
              { label: 'Fast Delivery', bg: 'rgba(100,40,10,0.5)', border: '#7a3010', color: '#fb923c' },
              { label: 'Secure Payment', bg: 'rgba(30,20,80,0.5)', border: '#3a2a70', color: '#C49FE0' },
            ].map(({ label, bg, border, color }) => (
              <span
                key={label}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: bg, border: `1px solid ${border}`, color }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {tpl?.status === 'draft' ? (
            <button
              onClick={() => { onSubmit(tpl); onClose(); }}
              className="w-full py-3.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer bg-[#814AC8] hover:shadow-[0_4px_24px_rgba(129,74,200,0.5)] transition-all"
            >
              Review &amp; Submit
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer bg-[#814AC8] hover:shadow-[0_4px_24px_rgba(129,74,200,0.5)] transition-all"
            >
              Close Preview
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function UseTemplateModal({ tpl, onClose }) {
  const router = useRouter();
  const [variables, setVariables] = useState({});
  const open = !!tpl;

  useEffect(() => {
    if (tpl && tpl.content) {
      const regex = /\{\{(\d+)\}\}/g;
      let match;
      const initialVars = {};
      while ((match = regex.exec(tpl.content)) !== null) {
        const varNum = match[1];
        initialVars[varNum] = '';
      }
      const timer = setTimeout(() => {
        setVariables(initialVars);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tpl]);

  if (!open) return null;

  const varKeys = Object.keys(variables).sort((a, b) => Number(a) - Number(b));

  const handleInputChange = (key, val) => {
    setVariables(prev => ({ ...prev, [key]: val }));
  };

  const getPreviewText = () => {
    if (!tpl || !tpl.content) return '';
    return tpl.content.replace(/\{\{(\d+)\}\}/g, (_, num) => {
      return variables[num] || `{{${num}}}`;
    });
  };

  const handleUseTemplate = () => {
    const finalMsg = getPreviewText();
    const varValues = varKeys.map(key => variables[key]);
    const query = new URLSearchParams({
      msg: finalMsg,
      channel: 'whatsapp',
      template_name: tpl.name || '',
      variables: JSON.stringify(varValues),
      language: tpl.language || 'en_US'
    }).toString();
    router.push(`/user/admin/inbox?${query}`);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
      />

      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[95vw] bg-gradient-to-b from-[#1a1030] to-[#0d0820] rounded-3xl border border-[#2a1f4a] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#2a1f4a]/50">
          <h2 className="m-0 text-base font-bold text-white tracking-tight">
            Fill Template Variables
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[50vh] overflow-y-auto">
          {varKeys.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {varKeys.map(key => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                    Variable {"{{"}{key}{"}}"}
                  </label>
                  <input
                    type="text"
                    value={variables[key]}
                    onChange={e => handleInputChange(key, e.target.value)}
                    placeholder={`Enter value for {{${key}}}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2a1f4a] bg-[#140D1F] text-white text-sm outline-none focus:border-[#814AC8] transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {'No variables found in this template. Click "Proceed to Inbox" to use the message as is.'}
            </p>
          )}

          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Message Preview</span>
            <div className="w-full flex flex-col gap-2 p-3.5 bg-[#140D1F] rounded-xl border border-[#25204a]">
              <p className="m-0 text-xs text-[#e8e8ff] leading-relaxed whitespace-pre-wrap">
                {getPreviewText() || 'No preview available.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-[#2a1f4a]/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#2a1f4a] bg-transparent text-white text-xs font-semibold cursor-pointer hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUseTemplate}
            className="flex-1 py-2.5 rounded-xl border-none text-white text-xs font-bold cursor-pointer bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 transition-opacity"
          >
            Proceed to Inbox
          </button>
        </div>
      </div>
    </>
  );
}

function ConnectWhatsAppModal({ open, onClose, onConnect }) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
      />
      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[95vw] bg-gradient-to-b from-[#1a1030] to-[#0d0820] rounded-3xl border border-[#2a1f4a] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-colors"
        >
          <X size={15} />
        </button>

        <div className="p-6 pt-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-[0_0_30px_rgba(37,211,102,0.4)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.073-1.117l-.291-.173-3.017.897.897-3.017-.173-.291A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.242-.121-1.432-.707-1.654-.787-.222-.081-.384-.121-.545.121-.161.242-.626.787-.768.949-.141.161-.282.181-.524.06-.242-.121-1.021-.376-1.945-1.199-.718-.641-1.203-1.432-1.344-1.674-.141-.242-.015-.373.106-.494.109-.109.242-.282.363-.424.121-.141.161-.242.242-.404.081-.161.04-.303-.02-.424-.061-.121-.545-1.314-.747-1.799-.196-.473-.396-.409-.545-.416l-.464-.008c-.161 0-.424.06-.646.303-.222.242-.848.829-.848 2.022s.868 2.346.989 2.507c.121.161 1.708 2.608 4.139 3.656.579.25 1.031.399 1.382.511.581.185 1.11.159 1.527.097.466-.069 1.432-.585 1.634-1.151.202-.565.202-1.049.141-1.151-.06-.101-.222-.161-.464-.282z"/>
            </svg>
          </div>

          <h2 className="m-0 text-lg font-bold text-white tracking-tight">
            WhatsApp Not Connected
          </h2>
          <p className="m-0 text-xs text-white/60 leading-relaxed max-w-[280px]">
            Connect your WhatsApp Business Account before creating templates.
          </p>
        </div>

        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#2a1f4a] bg-transparent text-white text-xs font-semibold cursor-pointer hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            className="flex-1 py-2.5 rounded-xl border-none text-white text-xs font-bold cursor-pointer bg-[#814AC8] hover:shadow-[0_4px_24px_rgba(129,74,200,0.5)] transition-all"
          >
            Connect Now
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Category Sidebar Item
─ */
function SidebarItem({ id, label, Icon, active, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs cursor-pointer w-full text-left transition-all border font-sans ${
        active
          ? 'bg-[#814AC8] border-[#814AC8] text-white font-bold shadow-[0_2px_14px_rgba(129,74,200,0.4)]'
          : hov
          ? 'bg-purple-500/15 border-purple-500/30 text-[#C49FE0] font-medium'
          : 'bg-purple-500/5 border-white/10 text-white/70 font-medium'
      }`}
    >
      <Icon
        size={14}
        strokeWidth={active ? 2.2 : 1.6}
        className={active ? 'text-white' : hov ? 'text-[#C49FE0]' : 'text-white/50'}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ─
   Main Page
─ */
export default function TemplatesPage() {
  const router = useRouter();
  const { workspaceId } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [viewSource, setViewSource] = useState('samples');
  const [activeTab, setActiveTab] = useState(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [useTemplate, setUseTemplate] = useState(null);
  const [viewMode, setViewMode]   = useState('grid');
  const [spinning, setSpinning]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);

  const countFor = tab =>
    tab === 'All' ? templates.length
    : templates.filter(t => t.status === tab.toLowerCase()).length;

  useEffect(() => { fetchTemplates(); }, []);

  useEffect(() => {
    if (viewSource === 'samples') {
      let d = systemTemplates.filter(t => t.tag === activeCategory);
      if (search) {
        d = d.filter(t =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.content || '').toLowerCase().includes(search.toLowerCase())
        );
      }
      setFiltered(d);
    } else {
      let d = [...templates];
      if (activeTab && activeTab !== 'All') {
        d = d.filter(t => t.status === activeTab.toLowerCase());
      }
      if (search) {
        d = d.filter(t =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.content || '').toLowerCase().includes(search.toLowerCase())
        );
      }
      setFiltered(d);
    }
  }, [templates, viewSource, activeTab, activeCategory, search]);

  const fetchTemplates = async (refresh = false) => {
    if (refresh) setSpinning(true);
    try {
      if (workspaceId) {
        await api.get(`/templates/status/${workspaceId}`);
      }
      const [userRes, systemRes] = await Promise.all([
        api.get('/templates'),
        api.get('/templates/system')
      ]);
      setTemplates(userRes.templates || []);
      setSystemTemplates(systemRes.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  };

  const handleSubmit = async tpl => {
    try {
      await api.post(`/templates/submit/${tpl.id}`);
      fetchTemplates();
    } catch (err) { console.error(err); }
  };

  const handleNewTemplateClick = async () => {
    setCheckingConnection(true);
    try {
      const data = await api.getChannelsStatus(workspaceId);
      if (data.whatsapp?.connected) {
        router.push('/user/admin/templates/create');
      } else {
        setShowConnectModal(true);
      }
    } catch (err) {
      console.error(err);
      setShowConnectModal(true);
    } finally {
      setCheckingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b14] text-[#f0f0ff] w-full max-w-full overflow-x-hidden font-sans">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 pt-6 sm:pt-8 pb-16 w-full max-w-full overflow-x-hidden">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6 sm:mb-8 gap-4 w-full">
          <div className="flex-1 text-center sm:text-left w-full">
            <h1 className="m-0 mb-1.5 text-2xl sm:text-3xl font-extrabold text-[#f0f0ff] tracking-tight">
              Message Templates
            </h1>
            <p className="m-0 text-xs sm:text-sm text-white/70 leading-relaxed max-w-lg">
              Create, manage and submit WhatsApp Business templates for Meta approval.
            </p>
          </div>

          <button
            onClick={handleNewTemplateClick}
            className="flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto px-5 py-2.5 rounded-xl border-none text-white text-xs sm:text-sm font-bold cursor-pointer transition-all bg-[#814AC8] hover:shadow-[0_4px_28px_rgba(129,74,200,0.7)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={15} strokeWidth={2.5} /> New Template
          </button>
        </div>

        {/* Stat Cards */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 mb-6 w-full">
            {STAT_CFG.map(cfg => {
              const count = cfg.key === 'total' ? templates.length
                : cfg.key === 'action' ? 0
                : templates.filter(t => t.status === cfg.key).length;
              const tabName = cfg.key.charAt(0).toUpperCase() + cfg.key.slice(1);
              const isClickable = cfg.key !== 'total' && cfg.key !== 'action';
              return (
                <StatCard
                  key={cfg.key}
                  cfg={cfg}
                  count={count}
                  onClick={isClickable ? () => {
                    setViewSource('user');
                    setActiveTab(tabName);
                    setActiveCategory(null);
                  } : undefined}
                  isActive={isClickable && viewSource === 'user' && activeTab === tabName}
                />
              );
            })}
          </div>
        )}

        {/* Search, Status Tabs & Grid/List Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6 w-full max-w-full">
          {/* Search input + Grid/List toggle */}
          <div className="flex items-center gap-2 w-full lg:flex-1 min-w-0 max-w-full">
            <div className="flex items-center gap-2 bg-[#070012] border border-[#1e1e3f] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex-1 min-w-0 focus-within:border-[#814AC8] transition-colors">
              <Search size={14} className="text-[#7f7fa3] shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="bg-transparent border-none outline-none text-white text-xs sm:text-sm w-full min-w-0"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="bg-transparent border-none text-[#7f7fa3] hover:text-white cursor-pointer p-0 flex shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Grid/List Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              {[['grid', LayoutGrid], ['list', List]].map(([mode, ModeIcon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center justify-center cursor-pointer transition-all w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 ${
                    viewMode === mode
                      ? 'bg-[#814AC8] border-[#814AC8] text-white shadow-[0_2px_14px_rgba(129,74,200,0.4)]'
                      : 'bg-[#0d0d1e] border-[#2a2a4a] text-white/80'
                  }`}
                >
                  <ModeIcon size={15} strokeWidth={1.8} />
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs — Auto 5-column grid on mobile (No scroll, perfectly fitted) */}
          <div className="grid grid-cols-5 sm:flex sm:flex-row items-center gap-1 sm:gap-2 bg-[#070012] border border-[#1e1e3f] rounded-xl sm:rounded-2xl p-1 sm:px-3 sm:py-2.5 w-full max-w-full lg:w-auto shrink-0">
            {TABS.map(tab => {
              const active = viewSource === 'user' && activeTab === tab;
              const cnt = countFor(tab);
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setViewSource('user');
                    setActiveTab(tab);
                    setActiveCategory(null);
                  }}
                  className={`flex items-center justify-center gap-1 px-1 sm:px-3 py-1.5 rounded-lg border-none text-[10px] sm:text-xs cursor-pointer whitespace-nowrap transition-all w-full sm:w-auto ${
                    active
                      ? 'bg-[#814AC8] text-white font-bold shadow-[0_2px_14px_rgba(129,74,200,0.4)]'
                      : 'bg-white/5 text-white/70 font-medium hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{tab}</span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[14px] sm:min-w-[18px] text-center ${
                    active ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch w-full max-w-full">
          {/* Category & Industry Sidebar */}
          <div className="w-full md:w-[180px] lg:w-[200px] xl:w-[230px] shrink-0 bg-[#070012] border border-[#1e1e3f] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <p className="m-0 mb-2 ml-1 text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-widest">
                Categories
              </p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 sm:gap-2 md:gap-1 mb-4 md:mb-6">
                {CATEGORIES.map(({ id, label, Icon }) => (
                  <SidebarItem
                    key={id} id={id} label={label} Icon={Icon}
                    active={viewSource === 'samples' && activeCategory === id}
                    onClick={() => {
                      setViewSource('samples');
                      setActiveCategory(id);
                      setActiveTab(null);
                    }}
                  />
                ))}
              </div>

              <p className="m-0 mb-2 ml-1 text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-widest">
                Industry
              </p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 sm:gap-2 md:gap-1">
                {INDUSTRIES.map(({ id, label, Icon }) => (
                  <SidebarItem
                    key={id} id={id} label={label} Icon={Icon}
                    active={viewSource === 'samples' && activeCategory === id}
                    onClick={() => {
                      setViewSource('samples');
                      setActiveCategory(id);
                      setActiveTab(null);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Cards Area */}
          <div className="flex-1 min-w-0 w-full bg-[#070012] border border-[#1e1e3f] rounded-2xl p-3.5 sm:p-5 flex flex-col justify-center min-h-[420px]">
            {loading ? (
              <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-[#111122] border border-[#1e1e3f] rounded-2xl w-full min-h-[340px]">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#C49FE0] shadow-[0_0_30px_rgba(129,74,200,0.15)]">
                  <FileText size={26} strokeWidth={1.6} />
                </div>
                <p className="m-0 mb-1.5 text-base font-bold text-[#f0f0ff]">
                  No templates found
                </p>
                <p className="m-0 mb-5 text-xs sm:text-sm text-[#7f7fa3] max-w-xs leading-relaxed">
                  {search ? `Nothing matched "${search}". Try a different search.` : 'Create your first template to get started.'}
                </p>
                {!search && (
                  <button
                    onClick={() => router.push('/user/admin/templates/create')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-none text-white text-xs sm:text-sm font-bold cursor-pointer transition-all bg-[#814AC8] hover:shadow-[0_2px_18px_rgba(129,74,200,0.45)] hover:-translate-y-0.5"
                  >
                    <Plus size={15} strokeWidth={2.5} /> Create Template
                  </button>
                )}
              </div>
            ) : (
              <div className={`grid ${
                viewMode === 'list'
                  ? 'grid-cols-1 gap-2.5'
                  : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5'
              }`}>
                {filtered.map((tpl, i) => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    idx={i}
                    viewMode={viewMode}
                    onPreview={setSelected}
                    onSubmit={handleSubmit}
                    onUse={(t) => setUseTemplate(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PreviewModal tpl={selected} onClose={() => setSelected(null)} onSubmit={handleSubmit} />
      <UseTemplateModal tpl={useTemplate} onClose={() => setUseTemplate(null)} />
      <ConnectWhatsAppModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={() => router.push('/user/admin/channels')}
      />
    </div>
  );
}