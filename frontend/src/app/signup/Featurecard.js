'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

// ─── AnimatedIcon Wrapper ─────────────────────────────────────────────────────
//
//  animationType:
//    "sync"  → continuous rotation + scale pulse  (Unified Inbox)
//    "float" → vertical float + scale pulse        (AI Follow-Ups)
//    "clock" → slow rotation + glow breathe        (Founder Assistant)
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedIcon({ children, animationType, badgeBg, isHovered }) {
  const iconMotion = {
    sync: {
      animate: {
        rotate: [0, 360],
        scale: isHovered ? [1, 1.1, 1] : [1, 1.04, 1],
      },
      transition: {
        rotate: { duration: 8, repeat: Infinity, ease: 'linear', repeatType: 'loop' },
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    float: {
      animate: {
        y: isHovered ? [0, -7, 0] : [0, -3.5, 0],
        scale: isHovered ? [1, 1.1, 1] : [1, 1.04, 1],
      },
      transition: {
        y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    clock: {
      animate: {
        rotate: [0, 360],
      },
      transition: {
        rotate: { duration: 10, repeat: Infinity, ease: 'linear', repeatType: 'loop' },
      },
    },
  };

  const glowMotion = {
    sync: {
      animate: {
        boxShadow: isHovered
          ? ['0 0 10px 2px rgba(167,139,250,0.28)', '0 0 22px 6px rgba(167,139,250,0.62)', '0 0 10px 2px rgba(167,139,250,0.28)']
          : ['0 0 4px 1px rgba(167,139,250,0.10)', '0 0 12px 4px rgba(167,139,250,0.34)', '0 0 4px 1px rgba(167,139,250,0.10)'],
      },
      transition: { boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    },
    float: {
      animate: {
        boxShadow: isHovered
          ? ['0 0 10px 2px rgba(167,139,250,0.28)', '0 0 22px 6px rgba(167,139,250,0.62)', '0 0 10px 2px rgba(167,139,250,0.28)']
          : ['0 0 4px 1px rgba(167,139,250,0.10)', '0 0 12px 4px rgba(167,139,250,0.34)', '0 0 4px 1px rgba(167,139,250,0.10)'],
      },
      transition: { boxShadow: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
    },
    clock: {
      animate: {
        boxShadow: isHovered
          ? ['0 0 8px 2px rgba(167,139,250,0.22)', '0 0 26px 8px rgba(167,139,250,0.68)', '0 0 8px 2px rgba(167,139,250,0.22)']
          : ['0 0 3px 1px rgba(167,139,250,0.08)', '0 0 14px 4px rgba(167,139,250,0.38)', '0 0 3px 1px rgba(167,139,250,0.08)'],
      },
      transition: { boxShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    },
  };

  const { animate: iconAnimate, transition: iconTransition } = iconMotion[animationType];
  const { animate: glowAnimate, transition: glowTransition } = glowMotion[animationType];

  return (
    <motion.div
      animate={glowAnimate}
      transition={glowTransition}
      style={{
        width: 28,
        height: 28,
        background: badgeBg,
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={iconAnimate}
        transition={iconTransition}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Feature Data ─────────────────────────────────────────────────────────────

const features = [
  {
    id: 1,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    badgeIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    ),
    badgeBg: '#2d1f4f',
    title: 'Unified Inbox',
    subtitle: 'All conversations in one place',
    animationType: 'sync',
  },
  {
    id: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    badgeIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"/>
        <polyline points="5 12 12 5 19 12"/>
      </svg>
    ),
    badgeBg: '#2d1f4f',  // ← fixed: same purple as Unified Inbox & Founder Assistant
    title: 'AI Follow – Ups',
    subtitle: 'Never let a lead go cold again.',
    animationType: 'float',
  },
  {
    id: 3,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
    ),
    badgeIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    badgeBg: '#2d1f4f',
    title: 'Founder Assistant',
    subtitle: 'Automate routine tasks & surr',
    animationType: 'clock',
  },
];

// ─── Feature Row ──────────────────────────────────────────────────────────────

function FeatureRow({ feature }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{ borderColor: isHovered ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.06)' }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'default',
      }}
    >
      {/* Left icon — static */}
      <div
        style={{
          width: 32,
          height: 32,
          background: '#242424',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {feature.icon}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>
          {feature.title}
        </p>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {feature.subtitle}
        </p>
      </div>

      {/* Animated right-side badge icon */}
      <AnimatedIcon
        animationType={feature.animationType}
        badgeBg={feature.badgeBg}
        isHovered={isHovered}
      >
        {feature.badgeIcon}
      </AnimatedIcon>
    </motion.div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function FeatureCard() {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 420,
      }}
    >
      <h3 style={{ color: '#ffffff', fontSize: 18, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.2px' }}>
        Continuous Optimization
      </h3>
      <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: '0 0 22px', maxWidth: 360 }}>
        We refine performance, analyze insights, and enhance automation for long-term growth.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {features.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>
    </div>
  );
}