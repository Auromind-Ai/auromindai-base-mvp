'use client';

import SettingsContent from '@/components/SettingsContent';
import { useAuth } from '@/context/AuthContext'; 

export default function SettingsPage() {
  const { loading } = useAuth(); 

  if (loading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black overflow-hidden">
      <SettingsContent />
    </div>
  );
}