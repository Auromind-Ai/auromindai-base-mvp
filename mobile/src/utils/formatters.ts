const AVATAR_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#06B6D4',
  '#EF4444',
];

/**
 * Return a deterministic avatar background color for a given list index.
 */
export function getAvatarColor(index: number): string {
  const safeIndex = Number.isFinite(index) ? Math.abs(Math.floor(index)) : 0;
  return AVATAR_COLORS[safeIndex % AVATAR_COLORS.length];
}

/**
 * Extract up to 2 uppercase initials from a display name, falling back when blank.
 */
export function getInitials(name?: string | null, fallback = 'CU'): string {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return fallback;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

function parseValidDate(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a timestamp concisely for inbox rows and chat message bubbles.
 */
export function formatShortTime(value?: string | Date | null, fallback = ''): string {
  const date = parseValidDate(value);
  if (!date) {
    return fallback;
  }

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

/**
 * Format a timestamp as a relative duration (e.g. "5m ago") or short date.
 */
export function formatRelativeTime(value?: string | Date | null, fallback = 'Recently'): string {
  const date = parseValidDate(value);
  if (!date) {
    return fallback;
  }

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format a timestamp strictly as time of day (e.g. "10:42 AM") for chat message bubbles.
 */
export function formatMessageTime(value?: string | Date | null, fallback = ''): string {
  const date = parseValidDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a timestamp for floating chat date separator badges like WhatsApp
 * (e.g. "Today", "Yesterday", "Wednesday", "October 7").
 */
export function formatDateSeparator(value?: string | Date | null): string {
  const date = parseValidDate(value);
  if (!date) {
    return '';
  }

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Yesterday';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Returns a unique calendar day string (YYYY-MM-DD) for grouping consecutive messages.
 */
export function getDateKey(value?: string | Date | null): string {
  const date = parseValidDate(value);
  if (!date) {
    return '';
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
