'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getFirstAccessibleWorkspacePath } from '@/components/WorkspaceNavigation';

export default function UserAdminIndexPage() {
  const router = useRouter();
  const { hasPermission, permissionsLoading, loading } = useAuth();

  useEffect(() => {
    if (loading || permissionsLoading) return;
    const target = getFirstAccessibleWorkspacePath(hasPermission) || '/dashboard';
    router.replace(target);
  }, [loading, permissionsLoading, hasPermission, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
      Loading workspace...
    </div>
  );
}
