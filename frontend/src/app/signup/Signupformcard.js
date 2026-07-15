'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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
  const router = useRouter();
  const { refreshUser } = useAuth();
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
      await api.sendOTP(email, 'signup');
      setStep('otp');
    } catch (err) {
      const mappedError = getErrorMessage(err);
      setError(mappedError);
<<<<<<< HEAD
      if (mappedError.includes("Account already exists")) {
        console.log("Setting redirect timeout to /login");
        setTimeout(() => {
          console.log("Executing redirect to /login via router.push");
          router.push('/login');
        }, 3000);
      }
=======
>>>>>>> 561607ccbefb38844079883400c81bb2ea34b159
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
      const data = await api.verifyOTP(email, otp, 'signup', fullName);
      // Cookies are set by the server; local token caching is disabled for security.
      await refreshUser();
      router.push('/user/admin/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#111111',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '40px 36px',
      width: '100%',
      maxWidth: '440px',
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
          {step === 'form' ? 'Create Account' : 'Enter OTP'}
        </h2>
        <p style={{ color: '#adb2bd', fontSize: '14px', margin: 0 }}>
          {step === 'form' ? 'Start your free account today' : `OTP sent to ${email}`}
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>{error}</div>
          {(error.includes("already registered") || error.includes("log in") || error.includes("registered")) && (
            <Link href="/login" style={{ color: '#a78bfa', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Go to Login page →
            </Link>
          )}
        </div>
      )}

      {step === 'form' ? (
<<<<<<< HEAD
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Full Name</label>
            <input
              type="text"
              placeholder="Sarah Jenkins"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0px 4px 20px 0px rgba(255,255,255,0.18)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0px 4px 20px 0px rgba(255,255,255,0.18)' }}
            />
          </div>
          <button
            onClick={handleSignup}
            disabled={loading}
            style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '28px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Sending OTP...' : 'Sign Up Free'}
          </button>
        </div>
=======
        <>
          <button
            onClick={() => api.googleLogin('signup')}
            style={{ 
              width: '100%', 
              background: '#ffffff', 
              border: '1px solid #e5e7eb', 
              borderRadius: '20px', 
              padding: '16px', 
              color: '#111827', 
              fontSize: '15px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              boxShadow: '0 4px 14px 0 rgba(255,255,255,0.1)',
              transition: 'box-shadow 0.3s ease',
              marginBottom: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(255,255,255,0.1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Full Name</label>
              <input
                type="text"
                placeholder="Sarah Jenkins"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0px 4px 20px 0px rgba(255,255,255,0.18)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0px 4px 20px 0px rgba(255,255,255,0.18)' }}
              />
            </div>
            <button
              onClick={handleSignup}
              disabled={loading}
              style={{ width: '100%', background: '#814AC8', color: '#ffffff', border: 'none', borderRadius: '28px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending OTP...' : 'Sign Up Free'}
            </button>
          </div>
          
          <p style={{ textAlign: 'center', marginTop: '24px', marginBottom: 0, color: '#6b7280', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>
              Login
            </Link>
          </p>
        </>
>>>>>>> 561607ccbefb38844079883400c81bb2ea34b159
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>6-digit OTP</label>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: '#ffffff', fontSize: '20px', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
            />
          </div>
          <button
            onClick={handleVerifyOTP}
            disabled={loading}
            style={{ width: '100%', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '28px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
          <button
            onClick={() => { setStep('form'); setOtp(''); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
          >
            ← Back
          </button>
        </div>
      )}
<<<<<<< HEAD

      {step === 'form' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#6b7280', fontSize: '13px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <button
            onClick={() => api.googleLogin('signup')}
            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '13px 16px', color: '#e5e7eb', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <p style={{ textAlign: 'center', marginTop: '22px', marginBottom: 0, color: '#6b7280', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>
              Login
            </Link>
          </p>
        </>
      )}
=======
>>>>>>> 561607ccbefb38844079883400c81bb2ea34b159
    </div>
  );
}
