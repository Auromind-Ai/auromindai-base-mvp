'use client';

import { useState, useEffect } from 'react';
import {
  Search, Plus, X, Send, Eye, CheckCircle2,
  Clock, XCircle, FileText, LayoutGrid, List,
  ArrowUpRight, ChevronRight, MessageSquare, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getWorkspaceIdFromToken } from '@/lib/auth';

/* ─── Config─ */
const TABS = ['All', 'Draft', 'Pending', 'Approved', 'Rejected'];

const STATUS = {
  draft:    { label: 'Draft',    dot: '#71717a', text: '#a1a1aa', bg: '#1c1c1e', ring: '#27272a' },
  pending:  { label: 'Pending',  dot: '#eab308', text: '#facc15', bg: '#1c1a0e', ring: '#292510' },
  approved: { label: 'Approved', dot: '#22c55e', text: '#4ade80', bg: '#0d1f14', ring: '#14291b' },
  rejected: { label: 'Rejected', dot: '#ef4444', text: '#f87171', bg: '#1f0d0d', ring: '#291414' },
};

/* ─── Reusable atoms─ */
const StatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 99,
      background: s.bg, border: `1px solid ${s.ring}`,
      fontSize: 11, fontWeight: 500, color: s.text,
      letterSpacing: '0.02em', fontFamily: 'var(--mono)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

const TypeTag = ({ type }) => (
  <span style={{
    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#52525b',
    padding: '2px 7px', borderRadius: 5,
    border: '1px solid #27272a', background: '#18181b',
  }}>
    {type || 'text'}
  </span>
);

/* ─── Skeleton─────── */
const SkeletonCard = () => (
  <div style={{
    background: '#111113', border: '1px solid #1f1f23',
    borderRadius: 16, padding: 22, display: 'flex',
    flexDirection: 'column', gap: 14,
  }}>
    {[['60%', 16], ['90%', 13], ['75%', 13]].map(([w, h], i) => (
      <div key={i} style={{
        width: w, height: h, borderRadius: 6,
        background: 'linear-gradient(90deg,#1c1c1e 25%,#252528 50%,#1c1c1e 75%)',
        backgroundSize: '300% 100%', animation: 'shimmer 1.5s infinite',
      }} />
    ))}
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #1f1f23' }}>
      {[[70, 24, 99], [80, 30, 8]].map(([w, h, r], i) => (
        <div key={i} style={{
          width: w, height: h, borderRadius: r,
          background: 'linear-gradient(90deg,#1c1c1e 25%,#252528 50%,#1c1c1e 75%)',
          backgroundSize: '300% 100%', animation: 'shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  </div>
);

/* ─── Template Card── */
function TemplateCard({ tpl, onPreview, onSubmit, viewMode, idx }) {
  const [hov, setHov] = useState(false);
  const isList = viewMode === 'list';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#161618' : '#111113',
        border: `1px solid ${hov ? '#2e2e34' : '#1f1f23'}`,
        borderRadius: 16,
        padding: isList ? '14px 20px' : 22,
        display: 'flex',
        flexDirection: isList ? 'row' : 'column',
        alignItems: isList ? 'center' : 'flex-start',
        gap: isList ? 16 : 14,
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.2s, transform 0.18s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.55)' : '0 1px 4px rgba(0,0,0,0.2)',
        animation: `cardIn 0.35s ${idx * 45}ms both`,
      }}
    >
      {/* icon */}
      <div style={{
        width: isList ? 36 : 42, height: isList ? 36 : 42,
        background: '#1a1a1d', border: '1px solid #2a2a2f',
        borderRadius: 11, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
        color: '#6366f1',
      }}>
        <MessageSquare size={isList ? 15 : 17} />
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: isList ? 3 : 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 600,
            color: '#f4f4f5', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240,
          }}>
            {tpl.name}
          </h3>
          <TypeTag type={tpl.type} />
        </div>

        <p style={{
          margin: 0, fontSize: 13, color: '#71717a', lineHeight: 1.65,
          ...(isList
            ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 480 }
            : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
        }}>
          {tpl.content}
        </p>
      </div>

      {/* footer */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: isList ? 'flex-end' : 'space-between',
        gap: 10, flexShrink: 0,
        ...(isList ? {} : { width: '100%', paddingTop: 14, borderTop: '1px solid #1f1f23' }),
      }}>
        <StatusPill status={tpl.status} />

        <div style={{ display: 'flex', gap: 6 }}>
          <Btn ghost onClick={e => { e.stopPropagation(); onPreview(tpl); }}>
            <Eye size={12} /> Preview
          </Btn>
          {tpl.status === 'draft' && (
            <Btn primary onClick={e => { e.stopPropagation(); onSubmit(tpl); }}>
              <Send size={12} /> Submit
            </Btn>
          )}
          {tpl.status === 'approved' && (
            <Btn success>
              Use <ArrowUpRight size={12} />
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Button helpers─ */
function Btn({ children, onClick, ghost, primary, success }) {
  const [h, setH] = useState(false);
  const base = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--sans)', transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  };
  const styles = ghost
    ? { ...base, border: '1px solid #27272a', background: 'transparent', color: h ? '#e4e4e7' : '#a1a1aa', borderColor: h ? '#3f3f46' : '#27272a' }
    : primary
    ? { ...base, border: 'none', background: h ? '#4f46e5' : '#6366f1', color: '#fff' }
    : success
    ? { ...base, border: '1px solid #14291b', background: h ? '#14291b' : '#0d1f14', color: '#4ade80' }
    : base;

  return (
    <button style={styles} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </button>
  );
}

/* ─── Preview Drawer─ */
function PreviewDrawer({ tpl, onClose, onSubmit }) {
  const open = !!tpl;

  const fmt = (msg = '') => {
  const sampleValues = {
    1: "John",        // name
    2: "ORD123",      // order id
    3: "2 days",      // delivery time
    4: "₹500"
  };

  return msg.replace(/\{\{(\d+)\}\}/g, (_, num) => {
    const value = sampleValues[num] || `Value${num}`;

    return `<span style="
      background:#1e2a1a;
      color:#4ade80;
      padding:0 4px;
      border-radius:3px;
      font-size:12px;
      font-family:var(--mono)
    ">${value}</span>`;
  });
};

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition: 'opacity 0.25s',
      }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0f0f11', borderLeft: '1px solid #1f1f23',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0,0.14,1)',
        overflow: 'hidden', fontFamily: 'var(--sans)',
      }}>
        {/* header */}
        <div style={{
          padding: '22px 24px', borderBottom: '1px solid #1a1a1d',
          background: '#111113', display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 11, color: '#52525b', fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Template Preview
            </p>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 650, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
              {tpl?.name}
            </h3>
          </div>
          <IconBtn onClick={onClose}><X size={15} /></IconBtn>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* phone mock */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #27272a' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a472a,#075e54)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)' }}>
                <MessageSquare size={16} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Business</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>online</p>
              </div>
            </div>

            <div style={{
              background: '#0d1117', padding: '20px 16px', minHeight: 140,
              backgroundImage: 'radial-gradient(circle at 1px 1px, #1a1f2a 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}>
              <div style={{
                background: '#1c1f1e', border: '1px solid #243024',
                borderRadius: '12px 12px 12px 0', padding: '13px 15px',
                maxWidth: '90%', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}>
                <p
                  style={{ margin: '0 0 12px', fontSize: 13, color: '#d4d4d8', lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{ __html: fmt(tpl?.content) }}
                />
                <div style={{
                  borderTop: '1px solid #243024', paddingTop: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 5, color: '#4ade80', fontSize: 12, fontWeight: 600,
                }}>
                  <ArrowUpRight size={12} /> Visit Website
                </div>
              </div>
              <p style={{ margin: '6px 0 0 4px', fontSize: 10, color: '#3f3f46', fontFamily: 'var(--mono)' }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
              </p>
            </div>
          </div>

          {/* metadata */}
          <div style={{ border: '1px solid #1f1f23', borderRadius: 12, overflow: 'hidden' }}>
            {[
              ['Status', <StatusPill key="s" status={tpl?.status} />],
              ['Type',   <TypeTag key="t" type={tpl?.type} />],
              ['ID',     <span key="id" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#52525b' }}>{tpl?.id?.toString().slice(0, 18) ?? '—'}</span>],
            ].map(([label, val], i, arr) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid #1a1a1d' : 'none',
                background: i % 2 === 0 ? '#111113' : '#0f0f11',
              }}>
                <span style={{ fontSize: 12, color: '#52525b', fontFamily: 'var(--mono)' }}>{label}</span>
                {val}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #1a1a1d',
          background: '#111113', display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 10, borderRadius: 10,
              border: '1px solid #27272a', background: 'transparent',
              color: '#a1a1aa', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1c1c1f'; e.currentTarget.style.color = '#e4e4e7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
          >
            Close
          </button>
          {tpl?.status === 'draft' && (
            <button
              onClick={() => { onSubmit(tpl); onClose(); }}
              style={{
                flex: 1, padding: 10, borderRadius: 10,
                border: 'none', background: '#6366f1',
                color: '#fff', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
            >
              <Send size={13} /> Submit to Meta
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Icon button──── */
function IconBtn({ children, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${h ? '#3f3f46' : '#27272a'}`,
        background: h ? '#1c1c1f' : 'transparent',
        color: h ? '#e4e4e7' : '#71717a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main Page────── */
export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [viewMode, setViewMode]   = useState('grid');
  const [spinning, setSpinning]   = useState(false);

  const countFor = tab =>
    tab === 'All' ? templates.length
    : templates.filter(t => t.status === tab.toLowerCase()).length;

  useEffect(() => { fetchTemplates(); }, []);

  useEffect(() => {
    let d = [...templates];
    if (activeTab !== 'All') d = d.filter(t => t.status === activeTab.toLowerCase());
    if (search) d = d.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.content || '').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(d);
  }, [templates, activeTab, search]);

  const fetchTemplates = async (refresh = false) => {
    if (refresh) setSpinning(true);
    try {
      const workspace_id = getWorkspaceIdFromToken() || localStorage.getItem("workspace_id");
      await api.get(`/templates/status/${workspace_id}`);
      const data = await api.get('/templates');
      setTemplates(data.templates || []);
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
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

        :root {
          --sans: 'Geist', 'Outfit', ui-sans-serif, system-ui, sans-serif;
          --mono: 'Geist Mono', 'Fira Code', ui-monospace, monospace;
        }
        .tpl-root * { box-sizing: border-box; }
        .tpl-root input { font-family: var(--sans); }

        @keyframes shimmer {
          from { background-position: 300% 0; }
          to   { background-position: -300% 0; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .tpl-root ::-webkit-scrollbar { width: 4px; }
        .tpl-root ::-webkit-scrollbar-track { background: transparent; }
        .tpl-root ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 99px; }
        .tpl-root input::placeholder { color: #3f3f46; font-family: var(--sans); }
      `}</style>

      <div className="tpl-root" style={{
        minHeight: '100vh', background: '#09090b', color: '#f4f4f5',
        fontFamily: 'var(--sans)',
      }}>

        {/* ── Sticky top bar ── */}
        <div style={{
          borderBottom: '1px solid #1a1a1d',
          background: 'rgba(9,9,11,0.9)',
          backdropFilter: 'blur(16px)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={13} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.02em' }}>Templates</span>
              <ChevronRight size={13} color="#3f3f46" />
              <span style={{ fontSize: 12, color: '#52525b' }}>Message Templates</span>
            </div>

            <button
              onClick={() => router.push('/user/admin/templates/create')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 15px', borderRadius: 9, border: 'none',
                background: '#6366f1', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--sans)', letterSpacing: '-0.01em',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#6366f1'; }}
            >
              <Plus size={14} /> New Template
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 32px' }}>

          {/* heading + stats */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 750, color: '#f4f4f5', letterSpacing: '-0.035em' }}>
              Message Templates
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#52525b', letterSpacing: '-0.01em' }}>
              Create, manage and submit WhatsApp Business templates for Meta approval.
            </p>

            {!loading && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {Object.entries(STATUS).map(([key, s]) => {
                  const n = templates.filter(t => t.status === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key.charAt(0).toUpperCase() + key.slice(1))}
                      style={{
                        background: '#111113', border: `1px solid ${activeTab === key.charAt(0).toUpperCase() + key.slice(1) ? s.ring : '#1f1f23'}`,
                        borderRadius: 12, padding: '14px 20px', cursor: 'pointer',
                        minWidth: 100, textAlign: 'left', transition: 'all 0.15s',
                        fontFamily: 'var(--sans)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#161618'; e.currentTarget.style.borderColor = s.ring; }}
                      onMouseLeave={e => {
                        const isActive = activeTab === key.charAt(0).toUpperCase() + key.slice(1);
                        e.currentTarget.style.background = '#111113';
                        e.currentTarget.style.borderColor = isActive ? s.ring : '#1f1f23';
                      }}
                    >
                      <p style={{ margin: '0 0 5px', fontSize: 26, fontWeight: 750, color: s.text, letterSpacing: '-0.04em', lineHeight: 1 }}>{n}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#52525b', fontFamily: 'var(--mono)', letterSpacing: '0.02em' }}>{s.label}</p>
                    </button>
                  );
                })}
                <div style={{ background: '#111113', border: '1px solid #1f1f23', borderRadius: 12, padding: '14px 20px', minWidth: 100 }}>
                  <p style={{ margin: '0 0 5px', fontSize: 26, fontWeight: 750, color: '#f4f4f5', letterSpacing: '-0.04em', lineHeight: 1 }}>{templates.length}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#52525b', fontFamily: 'var(--mono)' }}>Total</p>
                </div>
              </div>
            )}
          </div>

          {/* toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            marginBottom: 20, padding: '10px 14px',
            background: '#111113', border: '1px solid #1f1f23', borderRadius: 13,
          }}>
            {/* search */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f0f11', border: '1px solid #27272a', borderRadius: 8, padding: '7px 12px', width: 260, transition: 'border-color 0.15s' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = '#3f3f46'}
              onBlurCapture={e => e.currentTarget.style.borderColor = '#27272a'}
            >
              <Search size={13} color="#3f3f46" style={{ flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e4e4e7', fontSize: 13, width: '100%' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={{ width: 1, height: 22, background: '#27272a', flexShrink: 0 }} />

            {/* tabs */}
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {TABS.map(tab => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 7,
                      border: active ? '1px solid #27272a' : '1px solid transparent',
                      background: active ? '#1c1c1f' : 'transparent',
                      color: active ? '#f4f4f5' : '#71717a',
                      fontSize: 12, fontWeight: active ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'var(--sans)',
                      transition: 'all 0.13s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = '#141416'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    {tab}
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 10,
                      background: active ? '#27272a' : '#1a1a1d',
                      color: active ? '#e4e4e7' : '#52525b',
                      padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center',
                    }}>
                      {countFor(tab)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* right side */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBtn onClick={() => fetchTemplates(true)}>
                <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }} />
              </IconBtn>
              <div style={{ display: 'flex', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
                {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '6px 9px', border: 'none',
                      background: viewMode === mode ? '#1c1c1f' : 'transparent',
                      color: viewMode === mode ? '#e4e4e7' : '#52525b',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      transition: 'all 0.12s',
                    }}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* result count */}
          {!loading && (
            <p style={{ margin: '0 0 14px', fontSize: 11, color: '#3f3f46', fontFamily: 'var(--mono)' }}>
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
            </p>
          )}

          {/* cards */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 14 }}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              background: '#111113', border: '1px solid #1f1f23',
              borderRadius: 16,
            }}>
              <div style={{
                width: 52, height: 52, background: '#1a1a1d', border: '1px solid #27272a',
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: '#3f3f46',
              }}>
                <FileText size={22} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#71717a' }}>No templates found</p>
              <p style={{ margin: '0 0 22px', fontSize: 13, color: '#3f3f46' }}>
                {search ? `Nothing matched "${search}". Try a different search.` : 'Create your first template to get started.'}
              </p>
              {!search && (
                <button
                  onClick={() => router.push('/user/admin/templates/create')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px', borderRadius: 9, border: 'none',
                    background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >
                  <Plus size={14} /> Create Template
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(auto-fill,minmax(310px,1fr))',
              gap: viewMode === 'list' ? 8 : 14,
            }}>
              {filtered.map((tpl, i) => (
                <TemplateCard
                  key={tpl.id} tpl={tpl} idx={i}
                  viewMode={viewMode}
                  onPreview={setSelected}
                  onSubmit={handleSubmit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <PreviewDrawer tpl={selected} onClose={() => setSelected(null)} onSubmit={handleSubmit} />
    </>
  );
}