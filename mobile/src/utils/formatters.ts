const AVATAR_PALETTE = [
  '#5B4EB5',
  '#C026D3',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#2563EB',
];

export function getInitials(name?: string | null, fallback = 'CU'): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return fallback;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase() || fallback;
}

export function getAvatarColor(indexOrKey: number | string): string {
  if (typeof indexOrKey === 'number') {
    return AVATAR_PALETTE[Math.abs(indexOrKey) % AVATAR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < indexOrKey.length; i++) {
    hash = (hash * 31 + indexOrKey.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function formatShortTime(dateStr?: string | null, fallback = 'Recently'): string {
  if (!dateStr) return fallback;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return fallback;
  try {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return fallback;
  }
}

export function formatRelativeTime(dateStr?: string | null, fallback = 'Recently'): string {
  if (!dateStr) return fallback;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return fallback;
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  try {
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return fallback;
  }
}
