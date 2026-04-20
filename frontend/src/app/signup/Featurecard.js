'use client';

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
    badgeBg: '#1f2d4f',
    title: 'AI Follow – Ups',
    subtitle: 'Never let a lead go cold again.',
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
  },
];

export default function FeatureCard() {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '420px',
      }}
    >
      <h3
        style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 10px',
          letterSpacing: '-0.2px',
        }}
      >
        Continuous Optimization
      </h3>
      <p
        style={{
          color: '#9ca3af',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0 0 22px',
          maxWidth: '320px',
        }}
      >
        We refine performance, analyze insights, and enhance automation for long-term growth.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {features.map((f) => (
          <div
            key={f.id}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                background: '#242424',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {f.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: '#e5e7eb',
                  fontSize: '13px',
                  fontWeight: '600',
                  margin: '0 0 2px',
                }}
              >
                {f.title}
              </p>
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '12px',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.subtitle}
              </p>
            </div>

            <div
              style={{
                width: '28px',
                height: '28px',
                background: f.badgeBg,
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {f.badgeIcon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}