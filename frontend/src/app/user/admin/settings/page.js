'use client';

import SettingsContent from '@/components/SettingsContent';

export default function SettingsPage() {
  return (
    // Full-height black background wrapper; the inner card is rendered by SettingsContent
    <div className="h-full w-full bg-black overflow-hidden">
      <SettingsContent />
    </div>
  );
}