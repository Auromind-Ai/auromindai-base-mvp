'use client';
import { useState, useEffect } from 'react';
import { useTurnstile } from '@/hooks/useTurnstile';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { User, Mail } from 'lucide-react';

const getErrorMessage = (err) => {
  let msg = err?.message || '';
  let status = err?.status;
  
  if (msg.includes("Invalid or expired OTP") || msg.includes("Invalid OTP") || msg.includes("expired OTP")) {
    return "Invalid or expired OTP. Please request a new code.";
  }
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("Please log in") || msg.includes("Email already registered")) {
    return "Account already exists. Please log in.";
  }
  if (msg.includes("not registered") || msg.includes("not found") || msg.includes("sign up first") || msg.includes("Account not found")) {
    return "Account not found. Please sign up.";
  }
  if (msg.includes("Too many OTP requests") || msg.includes("too many requests") || status === 429) {
    return "Too many OTP requests. Please wait before trying again.";
  }
  if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("aborted")) {
    return "Network error. Please check your connection and try again.";
  }
  if (status >= 500 || msg.toLowerCase().includes("server error") || msg.toLowerCase().includes("non-json response")) {
    return "Server error. Please try again later.";
  }
  return "Something went wrong. Please try again.";
};

export default function SignupFormCard() {
  const {
    containerRef,
    loading: turnstileLoading,
    error: turnstileError,
    siteKeyMissing,
    execute: executeTurnstile,
    initWidget: initTurnstileWidget
  } = useTurnstile();

  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    initTurnstileWidget();
  }, [initTurnstileWidget]);
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await executeTurnstile();
      await api.sendOTP(email, 'signup', token);
      setStep('otp');
    } catch (err) {
      const mappedError = getErrorMessage(err);
      setError(mappedError);
      if (mappedError.includes("Account already exists")) {
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await executeTurnstile();
      const data = await api.verifyOTP(email, otp, 'signup', fullName, null, null, token);
      if (data?.access_token) {
        setToken(data.access_token);
      }
      await refreshUser();
      router.push('/user/admin/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="w-full max-w-[430px] rounded-[22px] sm:rounded-[28px] bg-[#111111] border border-white/[0.08] p-5 sm:p-8 md:p-9 shadow-2xl z-10"
      style={{
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '24px', smFontSize: '26px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.3px' }} className="text-[22px] sm:text-[26px]">
          {step === 'form' ? 'Create Account' : 'Enter OTP'}
        </h2>
        <p style={{ color: '#9ca3af', margin: 0 }} className="text-[13px] sm:text-[14px]">
          {step === 'form' ? 'Start your free account today' : `OTP sent to ${email}`}
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>{error}</div>
          {(error.includes("already registered") || error.includes("log in") || error.includes("registered")) && (
            <Link href="/login" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Go to Login page →
            </Link>
          )}
        </div>
      )}

      {step === 'form' ? (
        <>
          <button
            onClick={() => api.googleLogin('signup')}
            style={{ 
              width: '100%', 
              background: '#ffffff', 
              border: '1px solid #e5e7eb', 
              borderRadius: '9999px', 
              padding: '14px 20px', 
              color: '#111827', 
              fontSize: '15px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              marginBottom: '2px'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0 20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '600' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                <User size={15} style={{ color: '#a855f7' }} strokeWidth={2} />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                placeholder="Sarah Jenkins"
                disabled={siteKeyMissing}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ 
                  width: '100%', 
                  background: '#1d1d21', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '14px', 
                  padding: '14px 18px', 
                  color: '#ffffff', 
                  fontSize: '15px', 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                <Mail size={15} style={{ color: '#a855f7' }} strokeWidth={2} />
                <span>Email</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                disabled={siteKeyMissing}
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  background: '#1d1d21', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '14px', 
                  padding: '14px 18px', 
                  color: '#ffffff', 
                  fontSize: '15px', 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                }}
              />
            </div>
            <button
              onClick={handleSignup}
              disabled={loading || turnstileLoading || siteKeyMissing}
              style={{ 
                width: '100%', 
                background: '#814AC8', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '9999px', 
                padding: '16px', 
                fontSize: '16px', 
                fontWeight: '700', 
                cursor: 'pointer', 
                marginTop: '4px', 
                opacity: (loading || turnstileLoading || siteKeyMissing) ? 0.7 : 1, 
                boxShadow: '0 4px 22px rgba(129, 74, 200, 0.45)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 26px rgba(129, 74, 200, 0.6)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 22px rgba(129, 74, 200, 0.45)'}
            >
              {loading || turnstileLoading ? 'Verifying...' : 'Sign Up Free'}
            </button>
          </div>
          
          <p style={{ textAlign: 'center', marginTop: '22px', marginBottom: 0, color: '#9ca3af', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#ffffff', fontWeight: '700', textDecoration: 'none' }}>
              Login
            </Link>
          </p>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px' }}>6-digit OTP</label>
            <input
              type="text"
              placeholder="Enter OTP"
              disabled={siteKeyMissing}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              style={{ width: '100%', background: '#1d1d21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 18px', color: '#ffffff', fontSize: '18px', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', textAlign: 'center', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
            />
          </div>
          <button
            onClick={handleVerifyOTP}
            disabled={loading || turnstileLoading || siteKeyMissing || otp.length < 6}
            style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: (loading || turnstileLoading || siteKeyMissing) ? 0.7 : 1, boxShadow: '0 4px 22px rgba(129, 74, 200, 0.45)' }}
          >
            {loading || turnstileLoading ? 'Verifying...' : 'Verify & Continue'}
          </button>
          <button
            onClick={() => { setStep('form'); setOtp(''); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', textAlign: 'center', padding: '6px' }}
          >
            ← Back to details
          </button>
        </div>
      )}
      {/* Hidden Turnstile Container */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '-9999px',
          width: '0px', 
          height: '0px'
        }} 
      />
    </div>
  );
}
