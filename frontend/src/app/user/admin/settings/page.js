'use client';

import SettingsContent from '@/components/SettingsContent';

export default function SettingsPage() {
    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] w-full rounded-xl border border-[#333] overflow-hidden shadow-2xl">
            <SettingsContent />
        </div>
    );
}
