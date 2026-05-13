'use client';

export default function SignupFormCard() {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '440px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2
          style={{
            color: '#ffffff',
            fontSize: '26px',
            fontWeight: '700',
            margin: '0 0 6px',
            letterSpacing: '-0.3px',
          }}
        >
          Welcome Back
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Create Account</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label
            style={{
              display: 'block',
              color: '#9ca3af',
              fontSize: '13px',
              marginBottom: '8px',
              fontWeight: '400',
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            placeholder="Sarah Jenkins"
            style={{
              width: '100%',
              background: '#1c1c1c',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '14px 16px',
              color: '#9ca3af',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#9ca3af',
              fontSize: '13px',
              marginBottom: '8px',
              fontWeight: '400',
            }}
          >
            Email
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            style={{
              width: '100%',
              background: '#1c1c1c',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '14px 16px',
              color: '#9ca3af',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          style={{
            width: '100%',
            background: '#7c3aed',
            color: '#ffffff',
            border: 'none',
            borderRadius: '28px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            marginTop: '4px',
            letterSpacing: '0.1px',
          }}
        >
          Sign Up Free
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '22px 0',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: '#6b7280', fontSize: '13px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          style={{
            flex: 1,
            background: '#1c1c1c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '13px 16px',
            color: '#e5e7eb',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
            <rect x="11.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
            <rect x="1" y="11.5" width="8.5" height="8.5" fill="#00A4EF" />
            <rect x="11.5" y="11.5" width="8.5" height="8.5" fill="#FFB900" />
          </svg>
          Microsoft
        </button>

        <button
          style={{
            flex: 1,
            background: '#1c1c1c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '13px 16px',
            color: '#e5e7eb',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: '22px',
          marginBottom: 0,
          color: '#6b7280',
          fontSize: '13px',
        }}
      >
        Already have an account?{' '}
        <span style={{ color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}>Login</span>
      </p>
    </div>
  );
}