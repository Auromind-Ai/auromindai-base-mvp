'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Sparkles,
  Mail,
  Building2,
  Lock
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { user, workspaceId, setWorkspaceId, refreshUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadInvitation() {
      try {
        setLoading(true);
        const data = await api.getInvitationDetails(token);
        setInvitation(data);
      } catch (err) {
        console.error('Failed to load invitation:', err);
        setError(err?.message || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !user?.email || user.email.toLowerCase() !== invitation?.email?.toLowerCase()) return;
    try {
      setAccepting(true);
      const res = await api.acceptInvitation(token);
      showToast('success', res?.message || 'Successfully joined workspace!');
      setAcceptedSuccess(true);
      
      // Update active workspace
      if (res?.workspace_id) {
        setWorkspaceId(res.workspace_id);
      }
      
      try {
        await refreshUser();
      } catch (e) {
        console.warn('User refresh notice:', e);
      }

      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err) {
      console.error('Accept invitation failed:', err);
      showToast('error', err?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (token && (loading || authLoading)) {
    return (
      <div className="min-h-screen bg-[#070012] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto" />
          <p className="text-zinc-400 text-sm font-medium">Validating your workspace invitation...</p>
        </div>
      </div>
    );
  }

  if (!token || error || !invitation) {
    return (
      <div className="min-h-screen bg-[#070012] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0e0720] border border-red-500/20 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Invalid Invitation</h1>
            <p className="text-sm text-zinc-400 mt-2">{error || 'This invitation is invalid or no longer exists.'}</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = invitation.status !== 'accepted' && (invitation.is_expired || invitation.status === 'expired');
  const isAlreadyAccepted = invitation.status === 'accepted';
  const isEmailMatch = user?.email && invitation?.email && user.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen bg-[#070012] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 blur-[140px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full rounded-3xl bg-[#0d061f]/90 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 shadow-2xl relative z-10 space-y-6"
      >
        {/* Header Icon */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-0.5 shadow-lg shadow-violet-600/30">
            <div className="w-full h-full bg-[#0d061f] rounded-[14px] flex items-center justify-center text-violet-400">
              <Building2 className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Workspace Invitation
          </h1>
          <p className="text-sm text-zinc-400">
            <span className="text-white font-medium">{invitation.invited_by_name || 'A team member'}</span> has invited you to collaborate in:
          </p>
        </div>

        {/* Workspace Card */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-white font-bold text-sm">
                {(invitation.workspace_name || 'W').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{invitation.workspace_name}</h3>
                <p className="text-xs text-zinc-400">OrbionAgents Workspace</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize">
              {invitation.role === 'admin' ? 'Admin (Full Access)' : 'Member (Custom Access)'}
            </span>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              <span>Invited Email: <strong className="text-zinc-300">{invitation.email}</strong></span>
            </div>
          </div>
        </div>

        {/* Content based on state */}
        {isExpired ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
            <p className="text-sm text-red-300 font-medium">This invitation link has expired.</p>
            <p className="text-xs text-zinc-400">Please ask the workspace administrator to send you a new invitation.</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white font-medium transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : isAlreadyAccepted ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Invitation already accepted!</span>
            </div>
            <p className="text-xs text-zinc-400">This invitation has been accepted. Sign in with the invited email to open the workspace.</p>
            <Link
              href={isEmailMatch ? "/user/admin/dashboard" : `/login?email=${encodeURIComponent(invitation.email)}&invite_token=${token}`}
              onClick={(event) => {
                if (isEmailMatch) {
                  event.preventDefault();
                  handleAccept();
                }
              }}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-600/20"
            >
              <span>{isEmailMatch ? "Go to Workspace Dashboard" : "Sign in with invited email"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : acceptedSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Welcome to {invitation.workspace_name}!</span>
            </div>
            <p className="text-xs text-zinc-300">Redirecting to login...</p>
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
          </div>
        ) : user ? (
          /* User is logged in */
          <div className="space-y-4">
            {!isEmailMatch && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You are logged in as <strong>{user.email}</strong>, while this invite was addressed to <strong>{invitation.email}</strong>. Sign in with the invited email address to accept this invitation.
                </span>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting || !isEmailMatch}
              className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Workspace...</span>
                </>
              ) : (
                <>
                  <span>Accept Invitation & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* User is NOT logged in */
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 text-center">
              Log in or create an account with <strong className="text-white">{invitation.email}</strong> to join this workspace.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/login?email=${encodeURIComponent(invitation.email)}&invite_token=${token}`}
                className="py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-center font-medium text-sm transition-all shadow-md shadow-violet-600/20 flex items-center justify-center gap-1.5"
              >
                <span>Log In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/signup?email=${encodeURIComponent(invitation.email)}&invite_token=${token}`}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-center font-medium text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070012] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
