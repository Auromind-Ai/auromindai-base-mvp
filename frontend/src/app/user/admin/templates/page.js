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
  draft:    { label: 'Draft',    color: '#94a3b8', bg: 'rgba(1, 5, 12, 0.12)',  ring: 'rgba(148,163,184,0.25)' },
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(19, 14, 1, 0.12)',   ring: 'rgba(251,191,36,0.25)'  },
  approved: { label: 'Approved', color: '#34c091', bg: 'rgba(1, 14, 9, 0.12)',   ring: 'rgba(18, 245, 162, 0.25)'  },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(7, 0, 0, 0.12)',  ring: 'rgba(248,113,113,0.25)' },
};

const STAT_CFG = [
  { key: 'total',    label: 'Total templates', Icon: FileText,    color: '#60a5fa', iconBg: 'rgba(96,165,250,0.12)',  pct: 12 },
  { key: 'draft',    label: 'Draft',           Icon: PenLine,     color: '#22d3ee', iconBg: 'rgba(34,211,238,0.12)',  pct: 6  },
  { key: 'pending',  label: 'Pending',         Icon: Clock,       color: '#fb923c', iconBg: 'rgba(251,146,60,0.12)',  pct: 3  },
  { key: 'approved', label: 'Approved',        Icon: CheckCircle, color: '#34d399', iconBg: 'rgba(52,211,153,0.12)',  pct: 5  },
  { key: 'rejected', label: 'Rejected',        Icon: AlertCircle, color: '#f87171', iconBg: 'rgba(248,113,113,0.12)', pct: 2  },
  { key: 'action',   label: 'Action Required', Icon: Bell,        color: '#a78bfa', iconBg: 'rgba(167,139,250,0.12)', pct: 8  },
];

const CARD_ICONS = [
  { Icon: Rocket,        grad: 'linear-gradient(135deg,#2d1b69 0%,#5b21b6 100%)', color: '#c4b5fd', glow: 'rgba(196,181,253,0.2)' },
  { Icon: Gift,          grad: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)', color: '#93c5fd', glow: 'rgba(147,197,253,0.2)' },
  { Icon: Zap,           grad: 'linear-gradient(135deg,#713f12 0%,#b45309 100%)', color: '#fde68a', glow: 'rgba(253,230,138,0.2)' },
  { Icon: ShoppingCart,  grad: 'linear-gradient(135deg,#064e3b 0%,#059669 100%)', color: '#6ee7b7', glow: 'rgba(110,231,183,0.2)' },
  { Icon: Bell,          grad: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)', color: '#fca5a5', glow: 'rgba(252,165,165,0.2)' },
  { Icon: Package,       grad: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 100%)', color: '#7dd3fc', glow: 'rgba(125,211,252,0.2)' },
  { Icon: Sparkles,      grad: 'linear-gradient(135deg,#4a1d96 0%,#7c3aed 100%)', color: '#ddd6fe', glow: 'rgba(221,214,254,0.2)' },
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

const PRE_TEMPLATE_SAMPLES = [];

/* ─
   Atoms
─ */
const StatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span
      className="inline-flex items-center gap-[5px] px-[10px] py-1 rounded-full text-[11px] font-semibold tracking-[0.02em]"
      style={{ background: s.bg, border: `1px solid ${s.ring}`, color: s.color }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0"
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  );
};

const TypeTag = ({ type }) => (
  <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#a78bfa] px-[9px] py-[3px] rounded-full bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)]">
    {type || 'text'}
  </span>
);

/* ─
   Skeleton
─ */
const SkeletonCard = () => (
  <div className="bg-[#111122] border border-[#1e1e3f] rounded-[18px] p-[24px_20px] flex flex-col items-center gap-[14px]">
    <div className="w-[72px] h-[72px] rounded-[20px] bg-[#1c1c3a] animate-[shimmer_1.6s_infinite] bg-[length:300%_100%]" />
    {[['50%', 16], ['80%', 13], ['95%', 13], ['70%', 13]].map(([w, h], i) => (
      <div
        key={i}
        className="rounded-[6px] animate-[shimmer_1.6s_infinite] bg-[length:300%_100%]"
        style={{
          width: w,
          height: h,
          background: 'linear-gradient(90deg,#1c1c3a 25%,#25254a 50%,#1c1c3a 75%)',
          backgroundSize: '300% 100%',
        }}
      />
    ))}
    <div className="flex gap-2 w-full pt-[14px] border-t border-[#1e1e3f]">
      <div
        className="flex-1 h-9 rounded-[9px] animate-[shimmer_1.6s_infinite]"
        style={{ background: 'linear-gradient(90deg,#1c1c3a 25%,#25254a 50%,#1c1c3a 75%)', backgroundSize: '300% 100%' }}
      />
      <div
        className="flex-1 h-9 rounded-[9px] animate-[shimmer_1.6s_infinite]"
        style={{ background: 'linear-gradient(90deg,#1c1c3a 25%,#25254a 50%,#1c1c3a 75%)', backgroundSize: '300% 100%' }}
      />
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
      className="rounded-[18px] transition-all duration-[220ms] ease-[ease] cursor-pointer relative overflow-hidden"
      style={{
        background: hov ? '#15152e' : '#0B001C',
        border: `1px solid ${hov ? '#2e2e60' : '#1e1e3f'}`,
        padding: isList ? '16px 20px' : '26px 22px 22px',
        display: 'flex',
        flexDirection: isList ? 'row' : 'column',
        alignItems: 'center',
        gap: isList ? 16 : 18,
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 12px 40px rgba(124,58,237,0.18), 0 0 0 1px #2e2e60'
          : '0 1px 4px rgba(0,0,0,0.3)',
        animation: `cardIn 0.4s ${idx * 40}ms both`,
      }}
    >
      {/* subtle top glow */}
      {hov && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.33), transparent)' }}
        />
      )}

      {/* Icon */}
      <div
        className="shrink-0 flex items-center justify-center transition-shadow duration-[220ms]"
        style={{
          width: isList ? 44 : 76,
          height: isList ? 44 : 76,
          background: ci.grad,
          borderRadius: isList ? 13 : 22,
          boxShadow: hov ? `0 6px 24px ${ci.glow}` : `0 2px 12px ${ci.glow}`,
        }}
      >
        <CardIcon size={isList ? 20 : 34} color={ci.color} strokeWidth={1.6} />
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{
          alignItems: isList ? 'flex-start' : 'center',
          gap: isList ? 4 : 10,
          textAlign: isList ? 'left' : 'center',
        }}
      >
        <h3
          className="m-0 text-[15px] font-bold text-[#f0f0ff] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis w-full"
          style={{ maxWidth: isList ? 280 : '100%' }}
        >
          {tpl.name}
        </h3>
        <TypeTag type={tpl.type} />
        <p
          className="m-0 text-[13px] text-[rgba(255,255,255,0.7)] leading-[1.65]"
          style={
            isList
              ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }
              : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
          }
        >
          {tpl.content}
        </p>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 shrink-0 flex-wrap"
        style={{
          justifyContent: isList ? 'flex-end' : 'space-between',
          ...(isList ? {} : { width: '100%', paddingTop: 16, borderTop: '1px solid #1e1e3f' }),
        }}
      >
        <StatusPill status={tpl.status} />
        <div className="flex gap-[7px] w-full justify-between">
          {/* Preview button */}
          <button
            onClick={e => { e.stopPropagation(); onPreview(tpl); }}
            className="px-[14px] py-[7px] rounded-[9px] text-[12px] font-semibold cursor-pointer flex items-center gap-[5px] transition-all duration-[150ms] font-[var(--sans)]"
            style={{
              border: '1px solid #814AC8',
              background: '#140D1F',
              color: '#9090bb',
              boxShadow: '2px 2px 10px -5px #814AC8',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#a78bfa';
              e.currentTarget.style.color = '#a78bfa';
              e.currentTarget.style.background = 'rgba(124,58,237,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#814AC8';
              e.currentTarget.style.color = '#9090bb';
              e.currentTarget.style.background = '#140D1F';
            }}
          >
            <Eye size={12} /> Preview
          </button>

          {/* Submit (draft) */}
          {tpl.status === 'draft' && (
            <button
              onClick={e => { e.stopPropagation(); onSubmit(tpl); }}
              className="px-[14px] py-[7px] rounded-[9px] border-none text-white text-[12px] font-bold cursor-pointer flex items-center gap-[5px] transition-all duration-[150ms] font-[var(--sans)]"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                boxShadow: '0 2px 14px rgba(129,74,200,0.45)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 22px rgba(129,74,200,0.7)';
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 14px rgba(129,74,200,0.45)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Send size={12} /> Submit
            </button>
          )}

          {/* Use (approved) */}
          {tpl.status === 'approved' && (
            <button
              onClick={e => { e.stopPropagation(); onUse(tpl); }}
              className="px-[14px] py-[7px] rounded-[9px] border-none text-white text-[12px] font-bold cursor-pointer flex items-center gap-[5px] transition-all duration-[150ms] font-[var(--sans)]"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                boxShadow: '0 2px 14px rgba(129,74,200,0.45)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 22px rgba(129,74,200,0.7)';
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 14px rgba(129,74,200,0.45)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
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
      className="rounded-[16px] p-[16px_18px] transition-all duration-[220ms] ease-[ease] relative overflow-hidden flex items-center gap-[14px] min-h-[100px]"
      style={{
        background: active ? `${color}08` : '#070012',
        border: `1px solid ${active ? color + '60' : color + '40'}`,
        cursor: onClick ? 'pointer' : 'default',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov ? `0 8px 28px ${color}18` : 'none',
      }}
    >
      {/* Icon — left */}
      <div
        className="w-11 h-11 rounded-[12px] shrink-0 flex items-center justify-center self-start"
        style={{
          background: iconBg,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon size={20} color={color} strokeWidth={1.8} />
      </div>

      {/* Count + Label + Percentage */}
      <div className="flex flex-col gap-[3px]">
        <p className="m-0 text-[26px] font-extrabold text-[rgba(255,255,255,0.95)] tracking-[-0.05em] leading-none">
          {count}
        </p>
        <p className="m-0 text-[13px] text-[rgba(255,255,255,0.7)] font-semibold">
          {label}
        </p>
        <p className="m-0 mt-4 text-[12px] text-[#0a8659] font-semibold">
          {pct}% <span className="text-[rgba(255,255,255,0.5)] font-normal">from last month</span>
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[6px]"
      />

      {/* Modal */}
      <div
        className="fixed z-[101] flex flex-col"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 420,
          maxWidth: '95vw',
          background: 'linear-gradient(160deg, #1a1030 0%, #0d0820 100%)',
          borderRadius: 24,
          border: '1px solid #2a1f4a',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15)',
          fontFamily: 'var(--sans)',
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center cursor-pointer transition-all duration-[150ms]"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid #2a2a4a',
            background: 'rgba(255,255,255,0.06)',
            color: '#ffffff',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <X size={15} color="#ffffff" />
        </button>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">

          {/* WhatsApp icon */}
          <div
            className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 14, background: '#25D366' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.073-1.117l-.291-.173-3.017.897.897-3.017-.173-.291A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.242-.121-1.432-.707-1.654-.787-.222-.081-.384-.121-.545.121-.161.242-.626.787-.768.949-.141.161-.282.181-.524.06-.242-.121-1.021-.376-1.945-1.199-.718-.641-1.203-1.432-1.344-1.674-.141-.242-.015-.373.106-.494.109-.109.242-.282.363-.424.121-.141.161-.242.242-.404.081-.161.04-.303-.02-.424-.061-.121-.545-1.314-.747-1.799-.196-.473-.396-.409-.545-.416l-.464-.008c-.161 0-.424.06-.646.303-.222.242-.848.829-.848 2.022s.868 2.346.989 2.507c.121.161 1.708 2.608 4.139 3.656.579.25 1.031.399 1.382.511.581.185 1.11.159 1.527.097.466-.069 1.432-.585 1.634-1.151.202-.565.202-1.049.141-1.151-.06-.101-.222-.161-.464-.282z"/>
            </svg>
          </div>

          {/* Message bubble */}
          <div
            className="w-full flex flex-col gap-[10px] p-[18px_20px]"
            style={{
              background: '#1a1a2e',
              borderRadius: 16,
              border: '1px solid #25204a',
            }}
          >
            {tpl.header && (
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '13px', color: 'white' }}>
                {tpl.header}
              </div>
            )}
            <p
              className="m-0 text-[14px] text-[#e8e8ff] leading-[1.7] whitespace-pre-wrap"
              style={{ fontFamily: 'var(--sans)' }}
            >
              {fmt(tpl?.content) || 'No content available.'}
            </p>
            {tpl.footer && (
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '6px' }}>
                {tpl.footer}
              </div>
            )}
            {tpl.cta && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '9px',
                marginTop: '6px',
                textAlign: 'center',
                color: '#4da3ff',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.3px',
              }}>
                🔗 {tpl.cta_btn_title || 'Open'}
              </div>
            )}
          </div>

          {/* Tag pills */}
          <div className="flex items-center gap-[10px] flex-wrap">
            {[
              { label: 'Personalized', bg: 'rgba(16,100,50,0.5)',  border: '#1a5c30', color: '#4ade80' },
              { label: 'Fast Delivery', bg: 'rgba(100,40,10,0.5)', border: '#7a3010', color: '#fb923c' },
              { label: 'Secure Payment', bg: 'rgba(30,20,80,0.5)', border: '#3a2a70', color: '#a78bfa' },
            ].map(({ label, bg, border, color }) => (
              <span
                key={label}
                className="text-[12px] font-semibold px-[14px] py-[6px] rounded-full"
                style={{ background: bg, border: `1px solid ${border}`, color }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Footer — Review & Submit */}
        <div className="px-6 pb-6">
          {tpl?.status === 'draft' ? (
            <button
              onClick={() => { onSubmit(tpl); onClose(); }}
              className="w-full py-[15px] rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer transition-all duration-[150ms]"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
                fontFamily: 'var(--sans)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 32px rgba(124,58,237,0.7)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.5)'}
            >
              Review &amp; Submit
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-[15px] rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer transition-all duration-[150ms]"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
                fontFamily: 'var(--sans)',
              }}
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

  // Extract variables when template changes
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[6px]"
      />

      {/* Modal */}
      <div
        className="fixed z-[101] flex flex-col"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          maxWidth: '95vw',
          background: 'linear-gradient(160deg, #1a1030 0%, #0d0820 100%)',
          borderRadius: 24,
          border: '1px solid #2a1f4a',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15)',
          fontFamily: 'var(--sans)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#2a1f4a]/50">
          <h2 className="m-0 text-[18px] font-bold text-[#f0f0ff] tracking-[-0.02em]">
            Fill Template Variables
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-all duration-[150ms]"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid #2a2a4a',
              background: 'rgba(255,255,255,0.06)',
              color: '#ffffff',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <X size={14} color="#ffffff" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[50vh] overflow-y-auto">
          {varKeys.length > 0 ? (
            <div className="flex flex-col gap-4">
              {varKeys.map(key => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-purple-300">
                    Variable {"{{"}{key}{"}}"}
                  </label>
                  <input
                    type="text"
                    value={variables[key]}
                    onChange={e => handleInputChange(key, e.target.value)}
                    placeholder={`Enter value for {{${key}}}`}
                    className="w-full px-4 py-3 rounded-xl border border-[#2a1f4a] bg-[#140D1F] text-[#f0f0ff] text-[14px] outline-none focus:border-[#7c3aed] transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400">
              {'No variables found in this template. Click "Proceed to Inbox" to use the message as is.'}
            </p>
          )}

          {/* Live Preview */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400">Message Preview</span>
            <div
              className="w-full flex flex-col gap-[10px] p-[16px_18px]"
              style={{
                background: '#140D1F',
                borderRadius: 16,
                border: '1px solid #25204a',
              }}
            >
              <p className="m-0 text-[14px] text-[#e8e8ff] leading-[1.6] whitespace-pre-wrap">
                {getPreviewText() || 'No preview available.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-[#2a1f4a]/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-[12px] rounded-[12px] border border-[#2a1f4a] bg-transparent text-white text-[14px] font-semibold cursor-pointer hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUseTemplate}
            className="flex-1 py-[12px] rounded-[12px] border-none text-white text-[14px] font-bold cursor-pointer transition-all duration-[150ms]"
            style={{
              background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
              boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 32px rgba(124,58,237,0.6)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.4)'}
          >
            Proceed to Inbox
          </button>
        </div>
      </div>
    </>
  );
}

/* ─
   Category Sidebar Item
─ */
function SidebarItem({ id, label, Icon, active, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-[10px] px-[13px] py-[9px] rounded-[10px] border-none text-[13px] cursor-pointer w-full text-left transition-all duration-[180ms]"
      style={{
        background: active
          ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
          : hov
            ? 'rgba(124,58,237,0.15)'
            : 'transparent',
        color: active ? '#ffffff' : hov ? '#a78bfa' : 'rgba(255,255,255,0.5)',
        fontWeight: active ? 700 : 500,
        boxShadow: active ? '0 2px 14px rgba(124,58,237,0.4)' : 'none',
        fontFamily: 'var(--sans)',
      }}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2.2 : 1.6}
        color={active ? '#ffffff' : hov ? '#a78bfa' : 'rgba(255,255,255,0.4)'}
      />
      {label}
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
  const [viewSource, setViewSource] = useState('samples'); // 'samples' or 'user'
  const [activeTab, setActiveTab] = useState(null); // All, Draft, Pending, Approved, Rejected
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [useTemplate, setUseTemplate] = useState(null);
  const [viewMode, setViewMode]   = useState('grid');
  const [spinning, setSpinning]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending'); // trending, ecommerce, etc.

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
        }
        .tpl-root * { box-sizing: border-box; }
        .tpl-root input { font-family: var(--sans); }

        @keyframes shimmer {
          from { background-position: 300% 0; }
          to   { background-position: -300% 0; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .tpl-root ::-webkit-scrollbar { width: 4px; }
        .tpl-root ::-webkit-scrollbar-track { background: transparent; }
        .tpl-root ::-webkit-scrollbar-thumb { background: #2e2e5a; border-radius: 99px; }
        .tpl-root input::placeholder { color: #55557a; font-family: var(--sans); }
      `}</style>

      <div
        className="tpl-root min-h-screen bg-[#0b0b14] text-[#f0f0ff]"
        style={{ fontFamily: 'var(--sans)' }}
      >

        <div className="max-w-[1600px] mx-auto px-3 pt-8 pb-16">

          {/*  Page header  */}
          <div
            className="flex items-start justify-between mb-11 gap-4"
            style={{ animation: 'fadeIn 0.5s ease' }}
          >
            {/* Centered title block */}
            <div className="flex-1 text-center">
              <h1 className="m-0 mb-[10px] text-[34px] font-extrabold text-[#f0f0ff] tracking-[-0.04em]">
                Message Templates
              </h1>
              <p className="m-0 mx-auto text-[15px] text-[rgba(255,255,255,0.8)] leading-[1.6] max-w-[480px]">
                Create, manage and submit WhatsApp Business templates for Meta approval.
              </p>
            </div>

            {/* New Template button */}
            <button
              onClick={() => router.push('/user/admin/templates/create')}
              className="flex items-center gap-[7px] shrink-0 px-5 py-[10px] rounded-[11px] border-none text-white text-[13px] font-bold cursor-pointer tracking-[-0.01em] transition-all duration-[180ms] mt-1"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                boxShadow: '0 2px 18px rgba(129,74,200,0.45)',
                fontFamily: 'var(--sans)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 28px rgba(129,74,200,0.7)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 18px rgba(129,74,200,0.45)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={15} strokeWidth={2.5} /> New Template
            </button>
          </div>

          {!loading && (
            <div
              className="grid grid-cols-6 gap-[13px] mb-[34px] w-full"
              style={{ animation: 'fadeIn 0.5s 0.1s ease both' }}
            >
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

          
          <div
            className="flex items-center gap-2 mb-[26px] w-full"
            style={{ animation: 'fadeIn 0.5s 0.15s ease both' }}
          >
            <div
              className="flex items-center gap-2 bg-[#070012] border border-[#1e1e3f] rounded-[12px] px-4 py-[17px] flex-1 transition-[border-color] duration-[150ms]"
              onFocusCapture={e => e.currentTarget.style.borderColor = '#7c3aed'}
              onBlurCapture={e => e.currentTarget.style.borderColor = '#1e1e3f'}
            >
              <Search size={13} color="#55557a" className="shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="bg-transparent border-none outline-none text-[#f0f0ff] text-[13px] w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="bg-none border-none text-[#55557a] cursor-pointer p-0 flex"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Tabs — CHANGED px-8 to px-4 */}
            <div className="flex items-center gap-1 bg-[#070012] border border-[#1e1e3f] rounded-[12px] px-4 py-3 shrink-0">
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
                    className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[9px] border-none text-[13px] cursor-pointer whitespace-nowrap transition-all duration-[150ms]"
                    style={{
                      background: active ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                      color: active ? '#fff' : '#9090bb',
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? '0 2px 14px rgba(124,58,237,0.4)' : 'none',
                      fontFamily: 'var(--sans)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.color = '#f0f0ff';
                        e.currentTarget.style.background = 'rgba(124,58,237,0.1)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.color = '#9090bb';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {tab}
                    <span
                      className="text-[11px] font-bold px-[7px] py-[1px] rounded-full min-w-[20px] text-center"
                      style={{
                        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(136,136,187,0.15)',
                        color: active ? '#fff' : '#55557a',
                      }}
                    >
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {[['grid', LayoutGrid], ['list', List]].map(([mode, ModeIcon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center justify-center cursor-pointer transition-all duration-[150ms]"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: `1.5px solid ${viewMode === mode ? '#7c3aed' : '#2a2a4a'}`,
                    background: viewMode === mode ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#0d0d1e',
                    color: '#ffffff',
                    boxShadow: viewMode === mode ? '0 2px 14px rgba(124,58,237,0.4)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (viewMode !== mode) {
                      e.currentTarget.style.borderColor = '#7c3aed';
                      e.currentTarget.style.background = 'rgba(124,58,237,0.12)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (viewMode !== mode) {
                      e.currentTarget.style.borderColor = '#2a2a4a';
                      e.currentTarget.style.background = '#0d0d1e';
                    }
                  }}
                >
                  <ModeIcon size={22} strokeWidth={1.8} color="#ffffff" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div
              className="w-[240px] shrink-0 bg-[#070012] border border-[#1e1e3f] rounded-[18px] p-[20px_14px] sticky top-[80px]"
              style={{ animation: 'fadeIn 0.5s 0.2s ease both' }}
            >
              <p className="m-0 mb-2 ml-1 text-[10px] font-bold text-[rgba(255,255,255,0.9)] uppercase tracking-[0.12em]">
                Categories
              </p>
              <div className="flex flex-col gap-[2px] mb-[22px]">
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

              <p className="m-0 mb-[10px] ml-1 text-[11px] font-bold text-[rgba(255,255,255,0.9)] uppercase tracking-[0.1em]">
                Industry
              </p>
              <div className="flex flex-col gap-[2px]">
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

            {/* Cards area — flex-1 already fills remaining space */}
            <div
              className="flex-1 min-w-0 bg-[#070012] border border-[#1e1e3f] rounded-[18px] p-[20px]"
            >

              {/* Loading */}
              {loading ? (
                <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>

              /* Empty state */
              ) : filtered.length === 0 ? (
                <div className="text-center p-[80px_20px] bg-[#111122] border border-[#1e1e3f] rounded-[18px]">
                  <div className="w-[60px] h-[60px] bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.25)] rounded-[18px] flex items-center justify-center mx-auto mb-[18px] text-[#a78bfa]">
                    <FileText size={26} strokeWidth={1.6} />
                  </div>
                  <p className="m-0 mb-2 text-[16px] font-bold text-[#9090bb]">
                    No templates found
                  </p>
                  <p className="m-0 mb-[26px] text-[13px] text-[#55557a]">
                    {search ? `Nothing matched "${search}". Try a different search.` : 'Create your first template to get started.'}
                  </p>
                  {!search && (
                    <button
                      onClick={() => router.push('/user/admin/templates/create')}
                      className="inline-flex items-center gap-[7px] px-[22px] py-[10px] rounded-[11px] border-none text-white text-[13px] font-bold cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                        boxShadow: '0 2px 18px rgba(129,74,200,0.45)',
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      <Plus size={15} /> Create Template
                    </button>
                  )}
                </div>

              /* Grid / List */
              ) : (
                <div
                  className="grid gap-[14px]"
                  style={{
                    gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(4, minmax(0, 1fr))',
                    gap: viewMode === 'list' ? 9 : 14,
                  }}
                >
                  {filtered.map((tpl, i) => (
                    <TemplateCard
                      key={tpl.id} tpl={tpl} idx={i}
                      viewMode={viewMode}
                      onPreview={setSelected}
                      onSubmit={handleSubmit}
                      onUse={(t) => {
                        setUseTemplate(t);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PreviewModal tpl={selected} onClose={() => setSelected(null)} onSubmit={handleSubmit} />
      <UseTemplateModal tpl={useTemplate} onClose={() => setUseTemplate(null)} />
    </>
  );
}
