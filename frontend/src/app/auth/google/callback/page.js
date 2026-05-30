'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { setToken, setUser, setWorkspace } from '@/lib/auth';
import { Loader2, Cpu } from 'lucide-react';

export default function GoogleCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setError('Google login failed. Please try again.');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    if (status === 'authenticated') {
      if (!session?.customToken) {
        setError('Session error. Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      const adminToken = localStorage.getItem('admin_backup_token');
      localStorage.clear();
      if (adminToken) localStorage.setItem('admin_backup_token', adminToken);

      setToken(session.customToken);
      setUser(session.customUser);

      if (session.customUser?.role === 'admin' || session.customUser?.is_platform_admin) {
        localStorage.setItem('admin_backup_token', session.customToken);
      }

      if (session.workspaces?.length > 0) {
        setWorkspace(session.workspaces[0]);
        localStorage.setItem('workspace_id', session.workspaces[0].id);
      }

      router.push('/user/admin/dashboard');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
          <Cpu className="text-white" size={24} />
        </div>
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-slate-400 text-sm">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
}