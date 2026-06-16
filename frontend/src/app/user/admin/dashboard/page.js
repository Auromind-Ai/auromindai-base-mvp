'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from "../AnimatedCounter";
import { getUser, restoreAdminToken } from '@/lib/auth';
import NotificationBell from '@/components/NotificationBell';
import {
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Zap,
  Radio,
  UserPlus,
  Link2,
  Mail,
  Flame,
  Bot,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { useDashboard } from '@/lib/useDashboard';
import AddLeadModal from '@/components/leads/AddLeadModal';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

const SecretLoginBanner = () => {
    const router = useRouter();
    const user = getUser();
    const isImpersonating = Boolean(user?.impersonated);

    if (!isImpersonating) return null;

    const handleExit = () => {
        restoreAdminToken();
        window.location.href = '/admin';
    };

    return ( 
        <div className="fixed top-0 left-0 right-0 z-[100] bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="animate-pulse" />
                <span>Secret Login Mode: Viewing {user?.name || user?.email}&apos;s dashboard</span>
            </div>
            <button 
                onClick={handleExit}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors border border-white/30"
            >
                Exit & Return to Admin
            </button>
        </div>
    );
};

// Magic Bento helpers
function parseRgb(hex) {
  const s = (hex || '#8400ff').trim();
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 6 || h.length === 8)
      return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }
  return { r: 132, g: 0, b: 255 };
}

function makeParticles(count) {
  return Array.from({ length: Math.min(count, 20) }, () => ({
    x: Math.random()*100, y: Math.random()*100,
    dx: (Math.random()-0.5)*100, dy: (Math.random()-0.5)*100,
    size: 2+Math.random()*2.5,
    dur: 2+Math.random()*2, delay: Math.random()*0.8,
  }));
}

function BentoMetricCard({ metric, i, rgb }) {
  const ref = useRef(null);
  const particles = useMemo(() => makeParticles(12), []);

  const setVars = useCallback((rx, ry, gx, gy, gi) => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
    el.style.setProperty('--gx', `${gx}%`);
    el.style.setProperty('--gy', `${gy}%`);
    el.style.setProperty('--gi', `${gi}`);
  }, []);

  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const nx = (x - r.width/2) / (r.width/2);
    const ny = (y - r.height/2) / (r.height/2);
    setVars(ny*-6, nx*6, (x/r.width)*100, (y/r.height)*100, 1);
  }, [setVars]);

  const onLeave = useCallback(() => setVars(0,0,50,50,0), [setVars]);

  const onClick = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const maxD = Math.max(Math.hypot(x,y), Math.hypot(r.width-x,y), Math.hypot(x,r.height-y), Math.hypot(r.width-x,r.height-y));
    const rip = document.createElement('span');
    Object.assign(rip.style, { position:'absolute', borderRadius:'999px', pointerEvents:'none',
      left:`${x-maxD}px`, top:`${y-maxD}px`, width:`${maxD*2}px`, height:`${maxD*2}px`, zIndex:10 });
    rip.style.setProperty('--rr', rgb.r); rip.style.setProperty('--rg', rgb.g); rip.style.setProperty('--rb', rgb.b);
    rip.className = 'bento-ripple';
    el.appendChild(rip);
    rip.addEventListener('animationend', ()=>rip.remove(), {once:true});
  }, [rgb]);

  return (
    <motion.div
      ref={ref}
      key={metric.label}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      className="relative group rounded-2xl p-5 border border-purple-300/30 bg-[#070012] hover:border-white/10 transition-all cursor-default overflow-hidden bento-card"
      style={{
        '--r': rgb.r, '--g': rgb.g, '--b': rgb.b,
        '--gx': '50%', '--gy': '50%', '--gi': 0,
        '--rx': '0deg', '--ry': '0deg',
        transform: 'rotateX(var(--rx)) rotateY(var(--ry))',
        transformStyle: 'preserve-3d',
        transition: 'transform 180ms ease, box-shadow 220ms ease',
      }}
    >
      <div className="bento-glow-ring" aria-hidden="true" />
      <div className="bento-particles absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true">
        {particles.map((p, idx) => (
          <span key={idx} className="bento-particle absolute rounded-full" style={{
            left:`${p.x}%`, top:`${p.y}%`,
            width:`${p.size}px`, height:`${p.size}px`,
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
            '--dur': `${p.dur}s`, '--del': `${p.delay}s`,
            background: `rgba(${rgb.r},${rgb.g},${rgb.b},1)`,
            boxShadow: `0 0 8px rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`,
          }} />
        ))}
      </div>
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
          <h3 className="text-[18px] font-medium text-white/85 tracking-[-0.01em]">
            {metric.label}
          </h3>
        </div>
        <div className="mt-7">
          <div className="text-[22px] sm:text-[24px] font-semibold text-white leading-none tracking-tight flex items-baseline gap-2">
            {metric.value}
            {metric.change && metric.change !== '—' && (
              <span className={`text-sm ${metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-rose-400' : 'text-zinc-400'}`}>
                {metric.change}
              </span>
            )}
          </div>
          <p className="mt-3 text-[14px] text-white/80 font-medium">
            {metric.subtext}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function BentoMetricsGrid({ metrics }) {
  const rgb = useMemo(() => parseRgb('#8400ff'), []);
  return (
    <>
      <style>{`
        .bento-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 5px;
          background: radial-gradient(
            260px circle at var(--gx) var(--gy),
            rgba(var(--r), var(--g), var(--b), calc(var(--gi) * 0.7)) 0%,
            rgba(var(--r), var(--g), var(--b), calc(var(--gi) * 0.25)) 30%,
            transparent 60%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
          transition: opacity 200ms ease;
        }
        .bento-particle {
          animation:
            bfloat var(--dur) ease-in-out var(--del) infinite alternate,
            btwinkle 1.3s ease-in-out calc(var(--del)*0.5) infinite alternate;
        }
        @keyframes bfloat {
          from { transform: translate3d(0,0,0); opacity: 1; }
          to   { transform: translate3d(var(--dx), var(--dy), 0); opacity: 0.3; }
        }
        @keyframes btwinkle {
          from { filter: blur(0px); }
          to   { filter: blur(0.5px); }
        }
        .bento-ripple {
          background: radial-gradient(circle,
            rgba(var(--rr),var(--rg),var(--rb),0.3) 0%,
            rgba(var(--rr),var(--rg),var(--rb),0.12) 30%,
            transparent 70%
          );
          transform: scale(0);
          animation: bripple 650ms ease-out forwards;
        }
        @keyframes bripple {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }

        /* ─── CHART STYLES ─── */
        .chart-line-2026 { fill: none; stroke: #39ff7e; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
        .chart-line-2025 { fill: none; stroke: #b794f4; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }

        /* Chart tooltip animation */
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chart-tooltip-group {
          animation: tooltipIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Active dot pulse */
        @keyframes dotPulse {
          0%   { r: 5; opacity: 1; }
          50%  { r: 7; opacity: 0.6; }
          100% { r: 5; opacity: 1; }
        }
        .chart-active-dot-pulse {
          animation: dotPulse 1.4s ease-in-out infinite;
        }

        /* ─── QUICK ACTIONS ─── */
        .quick-action-card {
          transition: transform 220ms cubic-bezier(0.34,1.2,0.64,1), border-color 200ms ease, box-shadow 220ms ease, background 200ms ease;
          position: relative;
        }
        .quick-action-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 220ms ease;
          pointer-events: none;
          z-index: 0;
        }
        .quick-action-card:hover {
          transform: translateY(-4px);
        }
        .quick-action-card:hover .qa-arrow-btn {
          transform: rotate(0deg) scale(1.1);
        }

        /* Bottom glow pseudo-element for each card */
        .qa-card-workflow::after,
        .qa-card-broadcast::after,
        .qa-card-lead::after,
        .qa-card-connect::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 75%;
          height: 55%;
          border-radius: 0 0 14px 14px;
          pointer-events: none;
          z-index: 0;
          transition: opacity 220ms ease;
        }

        /* Purple glow - New workflow */
        .qa-card-workflow::after {
          background: radial-gradient(ellipse 70% 45% at 50% 100%, rgba(101, 75, 204, 0.30) 0%, rgba(101, 75, 204, 0.10) 50%, transparent 75%);
        }
        .qa-card-workflow:hover::after {
          background: radial-gradient(ellipse 75% 50% at 50% 100%, rgba(101, 75, 204, 0.42) 0%, rgba(101, 75, 204, 0.14) 50%, transparent 75%);
        }

        /* Blue glow - Broadcast */
        .qa-card-broadcast::after {
          background: radial-gradient(ellipse 70% 45% at 50% 100%, rgba(34, 67, 130, 0.35) 0%, rgba(34, 67, 130, 0.12) 50%, transparent 75%);
        }
        .qa-card-broadcast:hover::after {
          background: radial-gradient(ellipse 75% 50% at 50% 100%, rgba(34, 67, 130, 0.48) 0%, rgba(34, 67, 130, 0.16) 50%, transparent 75%);
        }

        /* Green glow - Add Lead */
        .qa-card-lead::after {
          background: radial-gradient(ellipse 70% 45% at 50% 100%, rgba(26, 117, 90, 0.32) 0%, rgba(26, 117, 90, 0.10) 50%, transparent 75%);
        }
        .qa-card-lead:hover::after {
          background: radial-gradient(ellipse 75% 50% at 50% 100%, rgba(26, 117, 90, 0.45) 0%, rgba(26, 117, 90, 0.14) 50%, transparent 75%);
        }

        /* Orange glow - Connect Channel */
        .qa-card-connect::after {
          background: radial-gradient(ellipse 70% 45% at 50% 100%, rgba(130, 73, 38, 0.35) 0%, rgba(130, 73, 38, 0.12) 50%, transparent 75%);
        }
        .qa-card-connect:hover::after {
          background: radial-gradient(ellipse 75% 50% at 50% 100%, rgba(130, 73, 38, 0.48) 0%, rgba(130, 73, 38, 0.16) 50%, transparent 75%);
        }

        /* Card border hover */
        .qa-card-workflow:hover {
          border-color: rgba(139,92,246,0.35) !important;
          box-shadow: 0 4px 24px rgba(139,92,246,0.12);
        }
        .qa-card-broadcast:hover {
          border-color: rgba(56,189,248,0.35) !important;
          box-shadow: 0 4px 24px rgba(56,189,248,0.12);
        }
        .qa-card-lead:hover {
          border-color: rgba(52,211,153,0.35) !important;
          box-shadow: 0 4px 24px rgba(52,211,153,0.12);
        }
        .qa-card-connect:hover {
          border-color: rgba(251,146,60,0.35) !important;
          box-shadow: 0 4px 24px rgba(251,146,60,0.12);
        }

        .qa-arrow-btn {
          transition: transform 200ms cubic-bezier(0.34,1.4,0.64,1), background 180ms ease, border-color 180ms ease;
        }
        .qa-card-workflow:hover .qa-arrow-btn {
          background: rgba(139,92,246,0.25);
          border-color: rgba(139,92,246,0.5);
        }
        .qa-card-broadcast:hover .qa-arrow-btn {
          background: rgba(56,189,248,0.25);
          border-color: rgba(56,189,248,0.5);
        }
        .qa-card-lead:hover .qa-arrow-btn {
          background: rgba(52,211,153,0.25);
          border-color: rgba(52,211,153,0.5);
        }
        .qa-card-connect:hover .qa-arrow-btn {
          background: rgba(251,146,60,0.25);
          border-color: rgba(251,146,60,0.5);
        }

        /* AI Insight item hover */
        .ai-insight-item {
          transition: background 180ms ease, border-color 180ms ease;
        }
        .ai-insight-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(139,92,246,0.25);
        }

        /* Recent Activity compact desktop */
        @media (min-width: 1024px) {
          .recent-activity-list .activity-item {
            padding-top: 10px;
            padding-bottom: 10px;
          }
        }
      `}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((metric, i) => (
          <BentoMetricCard key={metric.label} metric={metric} i={i} rgb={rgb} />
        ))}
      </div>
    </>
  );
}

const calculateChartMax = (highestValue) => {
  if (highestValue <= 0) return 10000;
  
  let step = 10000;
  if (highestValue < 1000) {
    step = 200;
  } else if (highestValue < 10000) {
    step = 2000;
  } else if (highestValue < 100000) {
    step = 10000;
  } else if (highestValue < 1000000) {
    if (highestValue < 200000) {
      step = 10000;
    } else if (highestValue < 500000) {
      step = 50000;
    } else {
      step = 100000;
    }
  } else {
    step = 100000;
  }
  
  return Math.floor(highestValue / step) * step + step;
};

// Monthly Revenue Line Chart
function MonthlyRevenueChart({ months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'], currentData = [], priorData = [], currentYear, priorYear }) {
  const [tooltip, setTooltip] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);

  const data2026 = currentData.length ? currentData : Array(months.length).fill(0);
  const data2025 = priorData.length ? priorData : Array(months.length).fill(0);

  const W = 520, H = 200;
  const padL = 58, padR = 30, padT = 20, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = [...data2026, ...data2025];
  const highestVal = allVals.length ? Math.max(...allVals) : 0;
  const chartMax = calculateChartMax(highestVal);
  const minVal = 0;
  const maxVal = chartMax;
  
  // Calculate dynamic yLabels based on maxVal
  const step = chartMax / 4;
  const yLabels = [0, step, step * 2, step * 3, chartMax];

  const xOf = (i) => padL + (i / Math.max(months.length - 1, 1)) * chartW;
  const yOf = (v) => padT + chartH - ((v - minVal) / Math.max(maxVal - minVal, 1)) * chartH;

  const catmullRomPath = (data) => {
    const pts = data.map((v, i) => [xOf(i), yOf(v)]);
    if (pts.length < 2) return '';
    const tension = 0.18;
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const segDy = p2[1] - p1[1];
      let cp1x = p1[0] + (p2[0] - p0[0]) * tension;
      let cp1y = p1[1] + (p2[1] - p0[1]) * tension;
      let cp2x = p2[0] - (p3[0] - p1[0]) * tension;
      let cp2y = p2[1] - (p3[1] - p1[1]) * tension;
      if (segDy >= 0) {
        cp1y = Math.min(cp1y, p2[1]);
        cp1y = Math.max(cp1y, p1[1]);
        cp2y = Math.min(cp2y, p2[1]);
        cp2y = Math.max(cp2y, p1[1]);
      } else {
        cp1y = Math.max(cp1y, p2[1]);
        cp1y = Math.min(cp1y, p1[1]);
        cp2y = Math.max(cp2y, p2[1]);
        cp2y = Math.min(cp2y, p1[1]);
      }
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  };

  const toArea = (data) =>
    `${catmullRomPath(data)} L${xOf(data.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  const formatYLabel = (v) => {
    if (v === 0) return { rupee: '', num: '0' };
    if (v >= 100000) return { rupee: '₹', num: (v).toLocaleString('en-IN') };
    return { rupee: '₹', num: (v).toLocaleString('en-IN') };
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={{ minHeight: 150 }}
      onMouseLeave={() => { setActiveIdx(null); setTooltip(null); }}
    >
      <defs>
        <linearGradient id="grad2026" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333B37" stopOpacity="1" />
          <stop offset="50%" stopColor="#333B37" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#333B37" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="grad2025" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A1F3D" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#1E1530" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#151C1A" stopOpacity="0.15" />
        </linearGradient>
        <filter id="glowGreen" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glowPurple" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glowActive" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="tooltipBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feColorMatrix type="matrix"
            values="1 0 0 0 0.05  0 1 0 0 0.05  0 0 1 0 0.08  0 0 0 18 -7"
            result="glass"
          />
          <feBlend in="SourceGraphic" in2="glass" mode="normal" />
        </filter>
      </defs>

      {/* Grid lines */}
      {yLabels.map((v) => (
        <line
          key={v}
          x1={padL} y1={yOf(v).toFixed(1)}
          x2={padL + chartW} y2={yOf(v).toFixed(1)}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      ))}

      {months.map((m, i) => (
        <line key={`vgrid-${m}`}
          x1={xOf(i).toFixed(1)} y1={padT}
          x2={xOf(i).toFixed(1)} y2={padT + chartH}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      ))}

      {yLabels.map((v) => {
        const { rupee, num } = formatYLabel(v);
        const y = yOf(v) + 4;
        return (
          <text
            key={v}
            x={padL - 8}
            y={y}
            textAnchor="end"
            fontSize="9.5"
            fill="rgba(255,255,255,0.75)"
            fontFamily="inherit"
          >
            <tspan
              fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
              fontSize="9"
              dy="0"
            >{rupee}</tspan>
            <tspan
              fontFamily="inherit"
              fontSize="9.5"
              dy="0"
            >{num}</tspan>
          </text>
        );
      })}

      {months.map((m, i) => (
        <text
          key={m}
          x={xOf(i)} y={padT + chartH + 22}
          textAnchor="middle"
          fontSize="10"
          fill={activeIdx === i ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)'}
          fontFamily="inherit"
          style={{ transition: 'fill 150ms ease' }}
        >
          {m}
        </text>
      ))}

      {/* Area fills */}
      <path d={toArea(data2025)} fill="url(#grad2025)" />
      <path d={toArea(data2026)} fill="url(#grad2026)" />

      {/* Lines */}
      <path
        d={catmullRomPath(data2025)}
        fill="none"
        stroke="#b794f4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glowPurple)"
        opacity="0.90"
      />
      <path
        d={catmullRomPath(data2026)}
        fill="none"
        stroke="#39ff7e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glowGreen)"
      />

      {/* Static dots */}
      {data2025.map((v, i) =>
        activeIdx !== i ? (
          <g key={i} filter="url(#glowPurple)">
            <circle cx={xOf(i)} cy={yOf(v)} r="3" fill="#b794f4" stroke="#0d0d14" strokeWidth="1.5" />
          </g>
        ) : null
      )}
      {data2026.map((v, i) =>
        activeIdx !== i ? (
          <g key={i} filter="url(#glowGreen)">
            <circle cx={xOf(i)} cy={yOf(v)} r="3" fill="#39ff7e" stroke="#0d0d14" strokeWidth="1.5" />
          </g>
        ) : null
      )}

      {/* Active state dots */}
      {activeIdx !== null && (
        <>
          <circle cx={xOf(activeIdx)} cy={yOf(data2025[activeIdx])} r="12" fill="rgba(183,148,244,0.12)" stroke="none" />
          <circle cx={xOf(activeIdx)} cy={yOf(data2026[activeIdx])} r="12" fill="rgba(57,255,126,0.12)" stroke="none" />
          <g filter="url(#glowActive)">
            <circle cx={xOf(activeIdx)} cy={yOf(data2025[activeIdx])} r="5" fill="#b794f4" stroke="#0d0d14" strokeWidth="2" />
          </g>
          <g filter="url(#glowActive)">
            <circle cx={xOf(activeIdx)} cy={yOf(data2026[activeIdx])} r="5" fill="#39ff7e" stroke="#0d0d14" strokeWidth="2" />
          </g>
          <circle cx={xOf(activeIdx)} cy={yOf(data2026[activeIdx])} r="11" fill="none" stroke="#39ff7e" strokeWidth="1.5" opacity="0.35" />
          <circle cx={xOf(activeIdx)} cy={yOf(data2025[activeIdx])} r="11" fill="none" stroke="#b794f4" strokeWidth="1.5" opacity="0.30" />
        </>
      )}

      {/* Hit targets */}
      {data2026.map((v, i) => (
        <circle
          key={`hit2026-${i}`}
          cx={xOf(i)} cy={yOf(v)} r="18"
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseEnter={() => {
            setActiveIdx(i);
            setTooltip({ x: xOf(i), y: yOf(v), val: data2026[i], color: '#39ff7e', label: currentYear });
          }}
        />
      ))}
      {data2025.map((v, i) => (
        <circle
          key={`hit2025-${i}`}
          cx={xOf(i)} cy={yOf(v)} r="18"
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseEnter={() => {
            setActiveIdx(i);
            setTooltip({ x: xOf(i), y: yOf(v), val: data2025[i], color: '#b794f4', label: priorYear });
          }}
        />
      ))}

      {/* Tooltip */}
      {tooltip && (() => {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
        const tw = isDesktop ? 88 : 128;
        const th = isDesktop ? 34 : 52;
        const tx = Math.min(Math.max(tooltip.x - tw / 2, 4), W - tw - 4);
        const ty = tooltip.y - th - 10 < padT ? tooltip.y + 10 : tooltip.y - th - 10;

        return (
          <g className="chart-tooltip-group" style={{ pointerEvents: 'none' }}>
            <line x1={tooltip.x} y1={padT} x2={tooltip.x} y2={padT + chartH}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
            <rect x={tx - 2} y={ty - 2} width={tw + 4} height={th + 4} rx={5}
              fill="rgba(255,255,255,0.03)" filter="url(#tooltipBlur)" />

            <rect x={tx} y={ty} width={tw} height={th} rx={4}
              fill="rgba(12,12,20,0.82)" />

            <rect x={tx + 1} y={ty + 1} width={tw - 2} height={th / 2} rx={3}
              fill="rgba(255,255,255,0.04)" />

            <rect x={tx} y={ty} width={tw} height={th} rx={4}
              fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
            <text
              x={tx + 8}
              y={ty + 11}
              fontSize={isDesktop ? "7" : "11"}
              fontWeight="600"
              fill="rgb(255,255,255)"
              fontFamily="inherit"
            >
              {months[activeIdx]}
            </text>

            <line
              x1={tx + 8}
              y1={ty + 17}
              x2={tx + tw - 8}
              y2={ty + 17}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.6"
            />

            <circle
              cx={tx + 12}
              cy={ty + 25}
              r="2.5"
              fill={tooltip.color}
            />

            <text
              x={tx + 18}
              y={ty + 28}
              fontSize={isDesktop ? "7" : "11"}
              fontWeight="500"
              fill="rgba(255,255,255,0.78)"
              fontFamily="inherit"
            >
              {tooltip.label}: ₹{Number(tooltip.val).toLocaleString('en-IN')}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Recent Activity Card ──────────────────────────────────────────────
function RecentActivityCard({ activities = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0 });
  const itemRefs = useRef([]);

  const handleMouseEnter = (i) => {
    const el = itemRefs.current[i];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sectionRect = el.closest('section').getBoundingClientRect();
    setPopupPos({
      top: rect.top + rect.height / 2,
      right: window.innerWidth - sectionRect.right + sectionRect.width + 12,
      left: sectionRect.right + 12,
    });
    setHoveredIdx(i);
  };

  const handleMouseLeave = () => { setHoveredIdx(null); };

  const activity = hoveredIdx !== null ? activities[hoveredIdx] : null;

  return (
    <section
      className="rounded-2xl border border-purple-300/30 bg-[#070012] backdrop-blur-xl overflow-visible flex flex-col relative h-full"
      onMouseLeave={handleMouseLeave}
    >
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <h2 className="text-[18px] font-semibold text-white/90">Recent Activity</h2>
        <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/20 font-medium">
          View all
        </button>
      </div>
      <div className="px-6 pb-3 pt-1 flex flex-col justify-start flex-1 recent-activity-list overflow-y-auto custom-scrollbar">
        {activities.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-8 text-sm">
            No recent activity
          </div>
        ) : (
          activities.map((a, i) => (
            <div
              key={i}
              ref={(el) => (itemRefs.current[i] = el)}
              onMouseEnter={() => handleMouseEnter(i)}
              className="
                activity-item
                flex items-center gap-3
                py-[10px]
                border-b border-white/[0.04]
                last:border-0
                cursor-default
                group
                transition-all duration-300
                hover:translate-x-2
                hover:bg-white/[0.03]
                hover:rounded-lg
                hover:px-3
              "
            >
              <span
                className="
                  w-[9px]
                  h-[9px]
                  rounded-full
                  border-2
                  border-white/20
                  flex-shrink-0
                  transition-all duration-300
                  group-hover:border-purple-400
                  group-hover:scale-125
                  group-hover:shadow-[0_0_10px_rgba(168,85,247,0.8)]
                "
              />
              <span
                className="
                  flex-1
                  text-sm
                  text-white/70
                  transition-all duration-300
                  group-hover:text-white
                  group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]
                "
              >
                {a.label}
              </span>
              <span className="text-[11px] text-zinc-500 whitespace-nowrap">{a.time}</span>
            </div>
          ))
        )}
      </div>
      <AnimatePresence>
        {hoveredIdx !== null && activity && (
          <motion.div
            key={hoveredIdx}
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.34, 1.2, 0.64, 1] }}
            className="fixed w-52 z-[9999] pointer-events-none"
            style={{ top: popupPos.top - 36, left: popupPos.left }}
          >
            <div className="absolute left-[-6px] top-[30px] w-3 h-3 rotate-45 rounded-sm bg-[#1a1a2e] border-l border-b border-white/10" />
            <div className="rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.08)] px-4 py-3">
              <div className="w-8 h-[2px] rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 mb-3" />
              <p className="text-[13px] font-medium text-white/90 leading-snug mb-2">{activity.label}</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#a78bfa]" />
                <span className="text-[11px] text-zinc-400">{activity.time}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Quick Actions Card
const QUICK_ACTIONS = [
  {
    title: 'New workflow',
    desc: 'Create automation and streamline your process',
    iconGradient: 'from-[#654BCC] to-[#654BCC]',
    iconShadow: '0 4px 16px rgba(101,75,204,0.5)',
    cardClass: 'qa-card-workflow',
    borderColor: 'rgba(101,75,204,0.18)',
    bgBase: '#070012',
    icon: Zap,
  },
  {
    title: 'Broadcast',
    desc: 'Send announcements to your audience',
    iconGradient: 'from-[#224382] to-[#224382]',
    iconShadow: '0 4px 16px rgba(34,67,130,0.5)',
    cardClass: 'qa-card-broadcast',
    borderColor: 'rgba(34,67,130,0.18)',
    bgBase: '#070012',
    icon: Radio,
  },
  {
    title: 'Add Lead',
    desc: 'Add a new lead to your pipeline',
    iconGradient: 'from-[#1A755A] to-[#1A755A]',
    iconShadow: '0 4px 16px rgba(26,117,90,0.5)',
    cardClass: 'qa-card-lead',
    borderColor: 'rgba(26,117,90,0.18)',
    bgBase: '#070012',
    icon: UserPlus,
  },
  {
    title: 'Connect Channel',
    desc: 'Connect channel with other tools and apps',
    iconGradient: 'from-[#824926] to-[#824926]',
    iconShadow: '0 4px 16px rgba(130,73,38,0.5)',
    cardClass: 'qa-card-connect',
    borderColor: 'rgba(130,73,38,0.18)',
    bgBase: '#070012',
    icon: Link2,
  },
];

function QuickActionsCard({ onAddLeadClick }) {
  const router = useRouter();

  const handleAction = (title) => {
    switch (title) {
      case 'New workflow':
        router.push('/user/admin/automation');
        break;
      case 'Broadcast':
        router.push('/user/admin/templates');
        break;
      case 'Add Lead':
        if (onAddLeadClick) onAddLeadClick();
        break;
      case 'Connect Channel':
        router.push('/user/admin/channels');
        break;
      default:
        break;
    }
  };

  return (
    <section className="rounded-2xl border border-purple-300/30 bg-[#070012] backdrop-blur-xl overflow-hidden h-full">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-[18px] font-semibold text-white/90">Quick Actions</h2>
        <p className="text-xs text-white/70 mt-1">Perform important task in one click</p>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <div
              key={i}
              onClick={() => handleAction(action.title)}
              className={`quick-action-card ${action.cardClass} relative flex flex-col rounded-xl border p-5 cursor-pointer overflow-hidden`}
              style={{
                borderColor: 'rgba(255,255,255,0.1)',
                background: action.bgBase,
              }}
            >
              {/* Icon — sits above the glow layer (z-10) */}
              <div
                className={`relative z-10 w-11 h-11 rounded-xl bg-gradient-to-br ${action.iconGradient} flex items-center justify-center mb-4 flex-shrink-0`}
                style={{ boxShadow: action.iconShadow }}
              >
                <Icon size={20} className="text-white" />
              </div>

              {/* Text content — also above glow */}
              <div className="relative z-10 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-white/90 mb-1">{action.title}</h3>
                <p className="text-xs text-white/75 leading-relaxed flex-1">{action.desc}</p>
                <div className="flex justify-end mt-4">
                  <button className="qa-arrow-btn w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                    <ArrowUpRight size={14} className="text-white/60" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// AI Insights Card 
function AIInsightsCard({ insights = [] }) {
  const iconMap = {
    flame: Flame,
    mail: Mail,
    bot: Bot
  };
  return (
    <section className="rounded-2xl border border-purple-300/30 bg-[#070012] backdrop-blur-xl overflow-hidden flex flex-col h-full relative">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
        <h2 className="text-[18px] font-semibold text-white/90">AI Insights</h2>
        <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/20 font-medium">
          View all
        </button>
      </div>
      <div className="flex-1 px-5 py-4 space-y-3">
        {insights.map((item, i) => {
          const Icon = iconMap[item.icon_type] || Sparkles;
          return (
            <div
              key={i}
              className="ai-insight-item flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.015] cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-xl ${item.icon_bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={item.icon_color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 leading-tight">{item.title}</p>
                <p className="text-xs text-white/75 mt-0.5 leading-relaxed">{item.subtitle}</p>
              </div>
              <ArrowRight size={15} className="text-white group-hover:text-purple-400 transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

const calculateDatesForPeriod = (selectedPeriod) => {
  const now = new Date();
  let start, end;
  switch (selectedPeriod) {
    case 'current_week': {
      const day = now.getDay();
      const monday = new Date(now);
      const diffToMonday = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      start = monday;
      end = sunday;
      break;
    }
    case 'last_week': {
      const day = now.getDay();
      const monday = new Date(now);
      const diffToMonday = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const lastMonday = new Date(monday);
      lastMonday.setDate(monday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      start = lastMonday;
      end = lastSunday;
      break;
    }
    case 'current_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    default:
      return { startDate: '', endDate: '' };
  }
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
};

const formatDisplayRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return '';
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

function PeriodPicker({ period, dateRange, onPeriodChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = [
    { value: 'current_week', label: 'Current Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'current_month', label: 'Current Month' },
    { value: 'last_month', label: 'Last Month' },
  ];

  const labels = {
    current_week: 'Current Week',
    last_week: 'Last Week',
    current_month: 'Current Month',
    last_month: 'Last Month',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-400 hover:bg-white/10 cursor-pointer transition-colors shadow-sm select-none"
      >
        <Calendar size={14} />
        <span className="hidden xs:inline">{formatDisplayRange(dateRange.startDate, dateRange.endDate)}</span>
        <span className="xs:hidden">{labels[period]}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0e0e1a] border border-white/10 p-1.5 shadow-2xl z-[100] backdrop-blur-xl flex flex-col gap-1"
          >
            {options.map((opt) => {
              const optDates = calculateDatesForPeriod(opt.value);
              const isSelected = period === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onPeriodChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex flex-col ${
                    isSelected
                      ? 'bg-purple-600/20 text-purple-300'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-medium">{opt.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 font-normal">
                    {formatDisplayRange(optDates.startDate, optDates.endDate)}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Dashboard 
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isImpersonated] = useState(() => Boolean(getUser()?.impersonated));
  const [showAddLead, setShowAddLead] = useState(false);

  const [period, setPeriod] = useState('current_week');
  const [dateRange, setDateRange] = useState(() => calculateDatesForPeriod('current_week'));

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setDateRange(calculateDatesForPeriod(newPeriod));
  };

  const { metrics, revenue, activities, insights, loading, error, refetch } = useDashboard({
    refreshInterval: 60000,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLeadAdded = () => {
      refetch();
    };
    window.addEventListener('lead-added', handleLeadAdded);
    return () => window.removeEventListener('lead-added', handleLeadAdded);
  }, [refetch]);

  if (!mounted) return null;

  const isInitialLoading = loading && (!metrics || metrics.length === 0 || metrics[0]?.value === '—');
  const cardStateClass = isInitialLoading ? "opacity-50 animate-pulse pointer-events-none" : "transition-opacity duration-300";

  return (
    <div className={`${poppins.className} min-h-screen bg-[#050508] text-white p-6 overflow-y-auto custom-scrollbar`}>
      <SecretLoginBanner />
      
      {error && (
        <div className="max-w-[1600px] mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button 
            onClick={() => refetch()} 
            className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {isImpersonated && (
        <div className="w-full flex items-center justify-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl mb-6 px-6 py-2.5 text-amber-400 text-sm font-semibold">
          <ShieldAlert size={15} />
          Admin Viewing Mode — you are viewing this dashboard as the user.
          <button
            onClick={exitImpersonation}
            className="ml-4 px-3 py-1 rounded bg-amber-600/10 text-amber-300 text-xs hover:bg-amber-600/20 transition-colors"
          >
            Exit impersonation
          </button>
        </div>
      )}
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white/90">Dashboard</h1>
            <p className="text-m text-white/90 lg:mt-2">Good morning! Here are your key actions for today.</p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodPicker period={period} dateRange={dateRange} onPeriodChange={handlePeriodChange} />
            <NotificationBell />
          </div>
        </header>

        {/* METRICS GRID */}
        <div className={cardStateClass}>
          <BentoMetricsGrid metrics={metrics} />
        </div>

        {/* ROW 1: Monthly Revenue + Recent Activity */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 overflow-visible ${cardStateClass}`}>
          {/* Monthly Revenue — 2/3 */}
          <section className="lg:col-span-2 rounded-2xl border border-purple-300/30 bg-[#070012] backdrop-blur-xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-[18px] font-semibold text-white/90">Monthly Revenue</h2>
              <p className="text-[14px] text-white/80 mt-1">This year vs last year (INR)</p>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-5 px-6 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: '#39ff7e', boxShadow: '0 0 8px #39ff7e' }} />
                <span className="text-xs text-white/60">{revenue.current_year || new Date().getFullYear()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: '#b794f4', boxShadow: '0 0 8px #b794f4' }} />
                <span className="text-xs text-white/60">{revenue.prior_year || new Date().getFullYear() - 1}</span>
              </div>
            </div>
            <div className="px-4 pb-5">
              <MonthlyRevenueChart 
                months={revenue.months} 
                currentData={revenue.current_data} 
                priorData={revenue.prior_data}
                currentYear={revenue.current_year}
                priorYear={revenue.prior_year}
              />
            </div>
          </section>

          {/* Recent Activity — 1/3 */}
          <div className="h-full">
            <RecentActivityCard activities={activities} />
          </div>
        </div>

        {/* ROW 2: Quick Actions + AI Insights */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 ${cardStateClass}`}>
          <div className="lg:col-span-2 h-full">
            <QuickActionsCard onAddLeadClick={() => setShowAddLead(true)} />
          </div>
          <AIInsightsCard insights={insights} />
        </div>

      </div>

      <AddLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

const exitImpersonation = () => {
  restoreAdminToken();
  window.location.reload();
};
