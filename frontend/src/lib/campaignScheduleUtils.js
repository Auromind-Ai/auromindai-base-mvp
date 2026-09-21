// Utility functions for Campaign Scheduling, Date/Time Parsing, and Future-Time Validation

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Parses any date string and time string into a valid local JavaScript Date.
 * Supports "Sep 21, 2026", "2026-09-21", "21-09-2026", etc.
 * Supports "10:00 AM", "11:45 PM", "14:30", etc.
 */
export function parseScheduleDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  let year, month, day;

  if (typeof dateStr === 'string' && dateStr.includes(',')) {
    // Format: "Sep 21, 2026"
    const cleaned = dateStr.replace(',', '');
    const parts = cleaned.trim().split(/\s+/);
    if (parts.length >= 3) {
      const mIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === parts[0].slice(0, 3).toLowerCase());
      if (mIdx !== -1) month = mIdx;
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
    // Format: "2026-09-21" or "21-09-2026"
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    }
  }

  if (year === undefined || month === undefined || month === -1 || isNaN(day)) {
    const fallback = new Date(`${dateStr} ${timeStr || ''}`);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  let hour = 10;
  let minute = 0;
  if (timeStr) {
    const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (match) {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      const meridiem = match[3] ? match[3].toUpperCase() : null;
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
    }
  }

  const d = new Date(year, month, day, hour, minute, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true if the scheduled date and time is strictly in the future (> Date.now()).
 */
export function isFutureSchedule(dateStr, timeStr) {
  const dt = parseScheduleDateTime(dateStr, timeStr);
  if (!dt) return false;
  return dt.getTime() > Date.now();
}

/**
 * Checks if the given date string corresponds to today's local date.
 */
export function isDateToday(dateStr) {
  const dt = parseScheduleDateTime(dateStr, '12:00 PM');
  if (!dt) return false;
  const now = new Date();
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  );
}

/**
 * Formats a Date object to "Sep 21, 2026"
 */
export function formatDateDisplay(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats a Date object to "hh:mm AM/PM"
 */
export function formatTimeDisplay(date) {
  if (!date || isNaN(date.getTime())) return '';
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = String(minutes).padStart(2, '0');
  const hrStr = String(hours).padStart(2, '0');
  return `${hrStr}:${minStr} ${ampm}`;
}

/**
 * Generates a default future schedule (1 hour ahead of current time, rounded to next 5 mins).
 */
export function getDefaultFutureSchedule() {
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000);
  const remainder = future.getMinutes() % 5;
  if (remainder !== 0) {
    future.setMinutes(future.getMinutes() + (5 - remainder));
  }
  future.setSeconds(0, 0);
  return {
    date: formatDateDisplay(future),
    time: formatTimeDisplay(future),
  };
}

/**
 * Parses time string into { hour12, minute, ampm }
 */
export function parseTimeToComponents(timeStr) {
  let hour12 = 12;
  let minute = 0;
  let ampm = 'PM';

  if (!timeStr) return { hour12, minute, ampm };

  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    minute = parseInt(match[2], 10);
    if (isNaN(minute) || minute < 0) minute = 0;
    if (minute > 59) minute = 59;

    if (match[3]) {
      ampm = match[3].toUpperCase();
      hour12 = h;
    } else {
      // 24-hour format
      ampm = h >= 12 ? 'PM' : 'AM';
      hour12 = h % 12 || 12;
    }
  }

  if (hour12 < 1) hour12 = 1;
  if (hour12 > 12) hour12 = 12;

  return { hour12, minute, ampm };
}

/**
 * Formats { hour12, minute, ampm } into "hh:mm AM/PM"
 */
export function formatComponentsToTime(hour12, minute, ampm) {
  const hr = String(hour12).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${hr}:${min} ${ampm}`;
}

export { MONTH_NAMES, MONTH_FULL };
