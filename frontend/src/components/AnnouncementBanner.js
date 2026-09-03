'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import api from '@/lib/api';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchAnnouncement() {
      try {
        const res = await api.get('/public/announcement');
        if (isMounted && res && res.enabled && res.message && res.message.trim() !== '') {
          // Check if this specific message was dismissed in this session
          const dismissedMsg = sessionStorage.getItem('dismissed_announcement');
          if (dismissedMsg !== res.message) {
            setAnnouncement(res);
          }
        }
      } catch {
        // Silently fail if public announcement endpoint fails
      }
    }
    fetchAnnouncement();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!announcement || dismissed || !announcement.enabled || !announcement.message) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('dismissed_announcement', announcement.message);
    } catch {}
  };

  return (
    <aside aria-label="Platform Announcement" className="w-full bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-indigo-900/60 border-b border-indigo-500/30 text-indigo-100 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm backdrop-blur-md z-40 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 shrink-0 border border-indigo-500/30">
          <Megaphone size={13} className="animate-pulse" />
        </span>
        <span className="text-xs sm:text-sm font-medium tracking-wide text-white/95 truncate">
          {announcement.message}
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        title="Dismiss announcement"
        aria-label="Dismiss announcement"
      >
        <X size={14} />
      </button>
    </aside>
  );
}
