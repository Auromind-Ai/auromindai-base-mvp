'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import TwoFactorSetupModal    from '@/components/TwoFactorSetupModal';
import TwoFactorDisableModal  from '@/components/TwoFactorDisableModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import {
  User,
  Settings,
  Bell,
  Globe,
  Users,
  Shield,
  ChevronRight,
  ChevronLeft,
  Info,
  AlertTriangle,
  RefreshCw,
  Monitor,
  Smartphone,
  Lock,
  MapPin,
  Ban,
  Loader2,
  ShieldAlert
} from 'lucide-react';

// ─ Nav Config 

const NAV_SECTIONS = [
  {
    title: 'General',
    items: [
      { id: 'my-account', label: 'My Account', icon: <User size={15} /> },
      { id: 'preferences', label: 'Preferences', icon: <Settings size={15} /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'security', label: 'Security', icon: <Shield size={15} /> },
      { id: 'about', label: 'About', icon: <Info size={15} /> },
    ],
  },
];

// ─ Toggle Component 

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0
        w-12 h-[26px] rounded-full
        transition-all duration-300 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070012]
        ${checked ? 'bg-violet-600 shadow-[0_0_12px_rgba(124,58,237,0.5)]' : 'bg-zinc-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block w-[20px] h-[20px] rounded-full bg-white shadow-md
          transform transition-transform duration-300 ease-in-out
          ${checked ? 'translate-x-[24px]' : 'translate-x-[3px]'}
        `}
      />
    </button>
  );
}

// ─ Timezone Helpers ─

function getTimezoneOffset(tz) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = fmt.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    if (!offsetPart) return { label: tz, offset: 0 };
    const raw = offsetPart.value; // e.g. "GMT+5:30" or "GMT-4" or "GMT"
    if (raw === 'GMT' || raw === 'UTC') return { label: `(GMT+00:00) ${tz}`, offset: 0 };
    const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return { label: `(GMT) ${tz}`, offset: 0 };
    const sign = match[1] === '+' ? 1 : -1;
    const h = parseInt(match[2], 10);
    const m = parseInt(match[3] || '0', 10);
    const totalMin = sign * (h * 60 + m);
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return {
      label: `(GMT${match[1]}${hStr}:${mStr}) ${tz}`,
      offset: totalMin,
    };
  } catch {
    return { label: tz, offset: 0 };
  }
}

// Static fallback list for browsers without Intl.supportedValuesOf
const FALLBACK_TIMEZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
  'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo', 'America/Toronto',
  'America/Vancouver', 'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dhaka',
  'Asia/Dubai', 'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong', 'Asia/Istanbul',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Kolkata',
  'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Riyadh', 'Asia/Seoul',
  'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran',
  'Asia/Tokyo', 'Atlantic/Reykjavik', 'Australia/Melbourne', 'Australia/Perth',
  'Australia/Sydney', 'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin',
  'Europe/Brussels', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul',
  'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow',
  'Europe/Oslo', 'Europe/Paris', 'Europe/Prague', 'Europe/Rome',
  'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam', 'Pacific/Honolulu',
  'US/Alaska', 'US/Central', 'US/Eastern', 'US/Mountain', 'US/Pacific', 'UTC',
];

function buildTimezoneList() {
  let zones;
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = FALLBACK_TIMEZONES;
  }
  const items = zones.map((tz) => {
    const { label, offset } = getTimezoneOffset(tz);
    return { value: tz, label, offset };
  });
  items.sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label));
  return items;
}

// Build once at module level
const TIMEZONE_OPTIONS = buildTimezoneList();

// ─ Timezone Dropdown Component 

function TimezoneDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = search
    ? TIMEZONE_OPTIONS.filter((tz) =>
        tz.label.toLowerCase().includes(search.toLowerCase()) ||
        tz.value.toLowerCase().includes(search.toLowerCase())
      )
    : TIMEZONE_OPTIONS;

  const selectedLabel =
    TIMEZONE_OPTIONS.find((tz) => tz.value === value)?.label || value || 'Select timezone';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          shrink-0 h-10 px-4 rounded-xl text-sm font-medium
          bg-white/5 border border-white/10
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
          whitespace-nowrap text-left
          flex items-center gap-2 min-w-[220px] max-w-[340px]
          ${disabled
            ? 'opacity-50 cursor-not-allowed text-zinc-500'
            : 'text-zinc-200 hover:bg-white/10 active:scale-[0.98] cursor-pointer'
          }
        `}
      >
        <span className="truncate flex-1">{selectedLabel}</span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div
          className="
            absolute right-0 top-full mt-2 z-50
            w-[360px] max-h-[320px]
            rounded-xl border border-white/10
            bg-[#0d0520]/95 backdrop-blur-xl
            shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(124,58,237,0.1)]
            flex flex-col overflow-hidden
          "
        >
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <input
              type="text"
              autoFocus
              placeholder="Search timezone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full h-9 px-3 rounded-lg
                bg-white/5 border border-white/10
                text-sm text-white placeholder:text-zinc-500
                focus:outline-none focus:border-violet-500
                transition-colors
              "
            />
          </div>
          {/* Options */}
          <div className="overflow-y-auto flex-1 py-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500 text-center">No timezones found</p>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  onClick={() => {
                    onChange(tz.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm
                    transition-colors duration-150
                    ${tz.value === value
                      ? 'bg-violet-600/20 text-violet-300'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  {tz.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─ Preferences Section ─

function PreferencesSection() {
  const [autoTimezone, setAutoTimezone] = useState(false);
  const [weekStart, setWeekStart] = useState('Mon');

  const [timezone, setTimezone] = useState('');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  //  Load saved preferences on mount ─
  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      try {
        const { default: api } = await import('@/lib/api');
        const prefs = await api.getPreferences();
        if (cancelled) return;

        if (prefs.timezone && !prefs.timezone_auto) {
          // Saved manual timezone
          setTimezone(prefs.timezone);
          setAutoTimezone(false);
        } else if (prefs.timezone && prefs.timezone_auto) {
          // Saved auto timezone — re-detect in case user moved
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(detected);
          setAutoTimezone(true);
          // Persist detected value if changed
          if (detected !== prefs.timezone) {
            api.updatePreferences({ timezone: detected, timezone_auto: true }).catch(() => {});
          }
        } else {
          // First-time user: no timezone saved → default to auto-detect
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(detected);
          setAutoTimezone(true);
          // Save immediately so it's persisted for next load
          api.updatePreferences({ timezone: detected, timezone_auto: true }).catch(() => {});
        }
      } catch {
        // API error (e.g. not logged in) — fallback to browser TZ
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detected);
        setAutoTimezone(true);
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, []);

  //  Toggle handler ─
  const handleAutoTimezone = async (val) => {
    setAutoTimezone(val);
    try {
      const { default: api } = await import('@/lib/api');
      if (val) {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detected);
        await api.updatePreferences({ timezone: detected, timezone_auto: true });
      } else {
        await api.updatePreferences({ timezone_auto: false });
      }
    } catch {
      // Silently handle API errors
    }
  };

  //  Dropdown change handler ─
  const handleTimezoneChange = async (tz) => {
    setTimezone(tz);
    try {
      const { default: api } = await import('@/lib/api');
      await api.updatePreferences({ timezone: tz, timezone_auto: false });
    } catch {
      // Silently handle API errors
    }
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-regular tracking-tight text-white">
          My Account
        </h1>
        <p className="mt-1.5 text-sm text-white/65">
          Manage your account settings and security
        </p>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Appearance Card */}
      <section
        className="
          mb-6 rounded-2xl border border-[rgba(157,157,157,0.43)]
          bg-[#070012] overflow-hidden
          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        "
      >
        <div className="mx-0">
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-5
            "
          >
            <div>
              <p className="text-[15px] font-semibold text-white">Appearance</p>
              <p className="mt-0.5 text-[13px] text-white/65">
                Customize how auromind looks on your device.
              </p>
            </div>
            <button
              type="button"
              className="
                shrink-0 h-10 px-4 rounded-xl text-sm font-medium text-zinc-200
                bg-white/5 border border-white/10
                hover:bg-white/10 active:scale-95
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                whitespace-nowrap
              "
            >
              Use system setting
            </button>
          </div>
        </div>
      </section>

      {/* Language & Time */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white tracking-tight">
          Language &amp; Time
        </h2>
      </div>

      <section
        className="
          rounded-2xl border border-[rgba(157,157,157,0.43)]
          bg-[#070012] overflow-hidden
          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        "
      >
        <div className="mx-0 rounded-xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden">

          {/* Language row — UNTOUCHED */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
              border-b border-[rgba(157,157,157,0.43)]
            "
          >
            <div>
              <p className="text-[15px] font-medium text-white">Language</p>
              <p className="mt-0.5 text-[13px] text-white/65">
                Change the language used in the user interface.
              </p>
            </div>
            <button
              type="button"
              className="
                shrink-0 h-10 px-4 rounded-xl text-sm font-medium text-zinc-200
                bg-white/5 border border-white/10
                hover:bg-white/10 active:scale-95
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
              "
            >
              English
            </button>
          </div>

          {/* Time zone row — NOW A SEARCHABLE DROPDOWN */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
              border-b border-[rgba(157,157,157,0.43)]
            "
          >
            <div>
              <p className="text-[15px] font-medium text-white">Time zone</p>
              <p className="mt-0.5 text-[13px] text-white/65">
                Set your time zone for accurate scheduling and notifications.
              </p>
            </div>
            {prefsLoaded ? (
              <TimezoneDropdown
                value={timezone}
                onChange={handleTimezoneChange}
                disabled={autoTimezone}
              />
            ) : (
              <span className="text-sm text-zinc-500 animate-pulse">Detecting...</span>
            )}
          </div>

          {/* Auto timezone row */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
              border-b border-[rgba(157,157,157,0.43)]
            "
          >
            <div>
              <p className="text-[15px] font-medium text-white">
                Set time zone automatically using your location
              </p>
              <p className="mt-0.5 text-[13px] text-white/65">
                Reminders, notifications and emails are delivered based on your time zone.
              </p>
            </div>
            <div className="shrink-0">
              <Toggle checked={autoTimezone} onChange={handleAutoTimezone} />
            </div>
          </div>

          {/* Week starts on row — UNTOUCHED */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
            "
          >
            <div className="sm:max-w-[240px]">
              <p className="text-[15px] font-medium text-white">Week starts on</p>
              <p className="mt-0.5 text-[13px] text-white/65">
                Choose the first day of your work
              </p>
            </div>
            {/* Day selector — wraps on mobile */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setWeekStart(day)}
                  className={`
                    h-9 px-3 rounded-lg text-xs font-medium
                    transition-all duration-200 active:scale-95
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                    ${
                      weekStart === day
                        ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]'
                        : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10'
                    }
                  `}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

// ─ Notifications Section ─

function NotificationsSection() {
  const [notifs, setNotifs] = useState({
    productUpdates: false,
    securityAlerts: false,
    aiAgentEvents: false,
    workflowAlerts: false,
    leadsAlerts: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadPrefs() {
      try {
        const prefs = await api.getPreferences();
        if (active && prefs) {
          setNotifs({
            productUpdates: prefs.productUpdates ?? false,
            securityAlerts: prefs.securityAlerts ?? false,
            aiAgentEvents: prefs.aiAgentEvents ?? false,
            workflowAlerts: prefs.workflowAlerts ?? false,
            leadsAlerts: prefs.leadsAlerts ?? false,
          });
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadPrefs();
    return () => {
      active = false;
    };
  }, []);

  const toggleNotif = async (key) => {
    const newValue = !notifs[key];
    setNotifs((prev) => ({ ...prev, [key]: newValue }));
    try {
      await api.updatePreferences({ [key]: newValue });
    } catch (err) {
      console.error(`Failed to update notification preference ${key}:`, err);
      // Revert
      setNotifs((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  const notifItems = [
    {
      key: 'productUpdates',
      label: 'Product Updates',
      desc: 'Notify me about new features and improvements.',
    },
    {
      key: 'securityAlerts',
      label: 'Security Alerts',
      desc: 'Notify me about important security activities.',
    },
    {
      key: 'aiAgentEvents',
      label: 'AI Agent Events',
      desc: 'Notify me about AI replies generating and escalations.',
    },
    {
      key: 'workflowAlerts',
      label: 'Workflow Alerts',
      desc: 'Notify me when workflow completed or failed.',
    },
    {
      key: 'leadsAlerts',
      label: 'Leads Alerts',
      desc: 'Notify me when new lead captured, qualified, updated.',
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Notifications
        </h1>
        <p className="mt-1.5 text-sm text-white/65">
          Manage how and when you receive notifications across all channels and automations.
        </p>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Notification Preferences card */}
      <section
        className="
          rounded-2xl border border-[rgba(157,157,157,0.43)]
          bg-[#070012] p-6
          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        "
      >
        <h2 className="mb-5 text-base font-semibold text-white tracking-tight">
          Notification Preferences
        </h2>

        <div className="rounded-xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden">
          {notifItems.map((item, idx) => (
            <div
              key={item.key}
              className={`
                flex flex-col sm:flex-row sm:items-center justify-between
                gap-3 px-5 py-4
                ${idx < notifItems.length - 1 ? 'border-b border-[rgba(157,157,157,0.43)]' : ''}
              `}
            >
              <div>
                <p className="text-[15px] font-medium text-white">{item.label}</p>
                <p className="mt-0.5 text-[13px] text-white/65">{item.desc}</p>
              </div>
              <div className="shrink-0">
                <Toggle
                  checked={notifs[item.key]}
                  onChange={() => toggleNotif(item.key)}
                  disabled={loading}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─ Placeholder sections 

function PlaceholderSection({ title, desc }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">{desc}</p>
      </div>
      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />
      <div className="flex items-center justify-center h-48 rounded-2xl border border-dashed border-[rgba(157,157,157,0.43)] bg-[#070012] text-zinc-500 text-sm">
        Content coming soon…
      </div>
    </div>
  );
}

// ─ People Section 

function PeopleSection() {
  const [search, setSearch] = useState('');

  const people = [
    { name: 'Diana Rose', email: 'diana04478@gmail.com', lead: 'Premium Lead',  leadColor: 'bg-[#4B2580] text-white', status: 'Active', statusColor: 'bg-green-500/20 text-green-300 border-green-500/30',  channel: 'Instagram', joined: '29 April 2025' },
    { name: 'Diana Rose', email: 'diana04478@gmail.com', lead: 'High priority', leadColor: 'bg-[#7B1A2E] text-white', status: 'Closed', statusColor: 'bg-red-500/20 text-red-300 border-red-500/30',       channel: 'WhatsApp',  joined: '10 June 2026' },
    { name: 'Diana Rose', email: 'diana04478@gmail.com', lead: 'Interested',    leadColor: 'bg-[#145A32] text-white', status: 'Active', statusColor: 'bg-green-500/20 text-green-300 border-green-500/30',  channel: 'Twilio',    joined: '22 Sep 2025' },
    { name: 'Diana Rose', email: 'diana04478@gmail.com', lead: 'Premium Lead',  leadColor: 'bg-[#4B2580] text-white', status: 'Closed', statusColor: 'bg-red-500/20 text-red-300 border-red-500/30',       channel: 'Instagram', joined: '10 June 2026' },
    { name: 'Diana Rose', email: 'diana04478@gmail.com', lead: 'High priority', leadColor: 'bg-[#7B1A2E] text-white', status: 'Active', statusColor: 'bg-green-500/20 text-green-30OTHING', channel: 'Instagram', joined: '10 June 2026' },
  ];

  const filtered = people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">People</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Manage how and when you receive notifications across all channels and automations.
        </p>
      </div>

      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Card */}
      <section className="rounded-2xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">

        {/* Search + Filter */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(157,157,157,0.43)]">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            type="button"
            className="h-9 px-4 rounded-lg text-sm font-medium text-zinc-200 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all duration-200 focus:outline-none"
          >
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(157,157,157,0.43)]">
                {['People', 'Lead', 'Status', 'Channel', 'Joined On'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-medium text-white/80 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((person, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-white/[0.03] ${idx < filtered.length - 1 ? 'border-b border-[rgba(157,157,157,0.2)]' : ''}`}
                >
                  {/* Person */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-900 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{person.name}</p>
                        <p className="text-white/65 text-xs">{person.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Lead */}
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${person.leadColor}`}>
                      {person.lead}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${person.statusColor}`}>
                      {person.status}
                    </span>
                  </td>
                  {/* Channel */}
                  <td className="px-5 py-3 text-white text-sm">{person.channel}</td>
                  {/* Joined */}
                  <td className="px-5 py-3 text-zinc-400 text-sm whitespace-nowrap">{person.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─ Security Section 

function SecuritySection() {
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingDetail, setViewingDetail] = useState('active_sessions'); // 'active_sessions', 'login_activity', 'blocked_devices'
  const [activeView, setActiveView] = useState(null); // null | 'sessions' | 'login-activity' | 'blocked-devices'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summ, sess] = await Promise.all([
        api.getSecuritySummary(),
        api.getSessions(),
      ]);
      setSummary(summ);
      setSessions(sess);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load security summary and active sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevoke = async (sessionId) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) return;
    try {
      setActionLoading(sessionId);
      setError(null);
      await api.revokeSession(sessionId);
      setSuccessMessage('Session successfully revoked.');
      setTimeout(() => setSuccessMessage(null), 4000);
      
      // Refresh
      const sess = await api.getSessions();
      const summ = await api.getSecuritySummary();
      setSessions(sess);
      setSummary(summ);
    } catch (err) {
      setError('Failed to revoke session. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (sessionId) => {
    if (!confirm('Are you sure you want to block this device? You will not be able to log in from this device until it is unblocked.')) return;
    try {
      setActionLoading(sessionId);
      setError(null);
      await api.blockSession(sessionId);
      setSuccessMessage('Device has been blocked successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Refresh
      const sess = await api.getSessions();
      const summ = await api.getSecuritySummary();
      setSessions(sess);
      setSummary(summ);
    } catch (err) {
      setError('Failed to block device. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (sessionId) => {
    try {
      setActionLoading(sessionId);
      setError(null);
      await api.unblockSession(sessionId);
      setSuccessMessage('Device unblocked successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Refresh
      const sess = await api.getSessions();
      const summ = await api.getSecuritySummary();
      setSessions(sess);
      setSummary(summ);
    } catch (err) {
      setError('Failed to unblock device. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter lists
  const activeSessions = sessions.filter(s => !s.is_blocked);
  const blockedSessions = sessions.filter(s => s.is_blocked);

  // Security score color label helper
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Security</h1>
          <p className="mt-1.5 text-[14px] text-white/65">
            Manage account access, monitor login activity, and keep your account protected.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white/90 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition duration-200"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="mb-6 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Inline Messages */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <ShieldAlert className="mt-0.5 shrink-0 text-rose-500" size={16} />
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <Shield className="mt-0.5 shrink-0 text-emerald-500" size={16} />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Animate Transitions between Grid and Detail view */}
      <AnimatePresence mode="wait">
        {activeView === null ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/[0.08] bg-[#070012] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
          >
            {/* Row 1: Active Sessions */}
            <div
              onClick={() => {
                setActiveView('sessions');
                setViewingDetail('active_sessions');
              }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition duration-200"
            >
              <div>
                <p className="text-[16px] font-medium text-white">Active Sessions</p>
                <p className="mt-0.5 text-[13px] text-white/65">View and manage devices currently logged into your account.</p>
              </div>
              <p className="shrink-0 text-sm font-medium whitespace-nowrap text-zinc-300">
                {loading ? '...' : `${activeSessions.length} Devices Active`}
              </p>
            </div>

            {/* Row 2: Recent Login Activity */}
            <div
              onClick={() => {
                setActiveView('login-activity');
                setViewingDetail('login_activity');
              }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition duration-200"
            >
              <div>
                <p className="text-[16px] font-medium text-white">Recent Login Activity</p>
                <p className="mt-0.5 text-[13px] text-white/65">Track recent sign-ins, locations, and login attempts.</p>
              </div>
              <p className="shrink-0 text-sm font-medium whitespace-nowrap text-zinc-300">
                {loading ? '...' : summary?.last_login_activity ? `Last Login ${summary.last_login_activity}` : 'No activity'}
              </p>
            </div>

            {/* Row 3: Blocked Devices */}
            <div
              onClick={() => {
                setActiveView('blocked-devices');
                setViewingDetail('blocked_devices');
              }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.02] transition duration-200"
            >
              <div>
                <p className="text-[16px] font-medium text-white">Blocked Devices</p>
                <p className="mt-0.5 text-[13px] text-white/65">Manage devices that are restricted from accessing your account.</p>
              </div>
              <p className="shrink-0 text-sm font-medium whitespace-nowrap text-zinc-300">
                {loading ? '...' : `${blockedSessions.length} Devices Blocked`}
              </p>
            </div>

            {/* Row 4: Security Score */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="text-[16px] font-medium text-white">Security Score</p>
                <p className="mt-0.5 text-[13px] text-white/65">Measure your account&apos;s overall security strength and protection level.</p>
              </div>
              <p className={`shrink-0 text-sm font-medium whitespace-nowrap ${loading ? 'text-zinc-300' : getScoreColor(summary?.security_score)}`}>
                {loading ? '...' : (summary?.security_score_label || '')}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Back Navigation Bar */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActiveView(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-white transition duration-200"
              >
                <ChevronLeft size={13} />
                Back
              </button>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-xs text-white/50 font-medium">
                Security &gt; {activeView === 'sessions' && 'Active Sessions'}
                {activeView === 'login-activity' && 'Recent Login Activity'}
                {activeView === 'blocked-devices' && 'Blocked Devices'}
              </span>
            </div>

            {/* Detailed Tables */}
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-md overflow-hidden shadow-2xl">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/50 text-sm gap-3">
                  <RefreshCw size={24} className="animate-spin text-violet-400" />
                  Loading security details...
                </div>
              ) : (
                <div>
                  {/* Tab title/header inside table container */}
                  <div className="px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">
                      {viewingDetail === 'active_sessions' && 'Active Sessions & Devices'}
                      {viewingDetail === 'login_activity' && 'Recent Login History'}
                      {viewingDetail === 'blocked_devices' && 'Blocked Devices & IPs'}
                    </h2>
                    <span className="text-[12px] text-white/45 font-medium bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                      {viewingDetail === 'active_sessions' && `${activeSessions.length} total`}
                      {viewingDetail === 'login_activity' && `${activeSessions.length} sessions logged`}
                      {viewingDetail === 'blocked_devices' && `${blockedSessions.length} restricted`}
                    </span>
                  </div>

                  {/* Content list */}
                  {viewingDetail === 'active_sessions' && (
                    <div className="divide-y divide-white/[0.08]">
                      {activeSessions.length === 0 ? (
                        <div className="py-12 text-center text-white/45 text-sm">No active sessions found.</div>
                      ) : (
                        activeSessions.map((session) => (
                          <div key={session.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-white/[0.01] transition duration-200">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 shrink-0 text-violet-400">
                                {session.device_info.toLowerCase().includes('phone') || session.device_info.toLowerCase().includes('android') || session.device_info.toLowerCase().includes('iphone') ? (
                                  <Smartphone size={20} />
                                ) : (
                                  <Monitor size={20} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="text-sm font-semibold text-white">{session.device_info}</h4>
                                  {session.is_current && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      Current Session
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/50 mt-1 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Lock size={12} />
                                    {session.ip_address}
                                  </span>
                                  {session.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin size={12} />
                                      {session.location}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>Last active: {new Date(session.last_activity_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Session Actions */}
                            <div className="flex items-center gap-2 self-start md:self-auto">
                              {session.is_current ? (
                                <span className="text-xs text-white/30 italic">Active on current window</span>
                              ) : (
                                <>
                                  <button
                                    disabled={actionLoading === session.id}
                                    onClick={() => handleRevoke(session.id)}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08] hover:text-white transition duration-200 disabled:opacity-50"
                                  >
                                    {actionLoading === session.id ? 'Processing...' : 'Revoke'}
                                  </button>
                                  <button
                                    disabled={actionLoading === session.id}
                                    onClick={() => handleBlock(session.id)}
                                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 hover:text-rose-200 transition duration-200 disabled:opacity-50"
                                  >
                                    <Ban size={12} />
                                    Block Device
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* NOTE: No GET /api/user/login-activity endpoint exists in backend. 
                      We fall back to using active sessions data from api.getSessions() sorted by creation date. 
                      Consequently, this list will only contain current active sessions, and not revoked or expired ones. */}
                  {viewingDetail === 'login_activity' && (
                    <div className="p-5">
                      {activeSessions.length === 0 ? (
                        <div className="py-12 text-center text-white/45 text-sm">No activity records found.</div>
                      ) : (
                        <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6 py-2">
                          {activeSessions.map((session, idx) => (
                            <div key={session.id} className="relative">
                              {/* Dot */}
                              <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 border border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                              <div>
                                <h4 className="text-sm font-semibold text-white">
                                  Successful Login: {session.device_info}
                                </h4>
                                <p className="text-xs text-white/50 mt-1">
                                  IP Address: {session.ip_address} {session.location ? `(${session.location})` : ''}
                                </p>
                                <span className="inline-block mt-2 text-[10px] font-semibold text-white/40 bg-white/[0.04] border border-white/5 px-2 py-0.5 rounded-full">
                                  Started: {new Date(session.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {viewingDetail === 'blocked_devices' && (
                    <div className="divide-y divide-white/[0.08]">
                      {blockedSessions.length === 0 ? (
                        <div className="py-16 text-center text-white/45 text-sm flex flex-col items-center justify-center gap-3">
                          <Shield size={32} className="text-white/20" />
                          <p>No blocked devices or restricted IP addresses found.</p>
                        </div>
                      ) : (
                        blockedSessions.map((session) => (
                          <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-white/[0.01] transition duration-200">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0 text-rose-400">
                                <Ban size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-white">{session.device_info}</h4>
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                    Blocked
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                                  <span>IP: {session.ip_address}</span>
                                  <span>•</span>
                                  <span>Blocked on: {new Date(session.last_activity_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              disabled={actionLoading === session.id}
                              onClick={() => handleUnblock(session.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 border border-violet-500 rounded-xl hover:bg-violet-500 hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] transition duration-200 disabled:opacity-50 shrink-0"
                            >
                              {actionLoading === session.id ? 'Processing...' : 'Unblock Device'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─ About Section ─

function AboutSection() {
  const [aboutData, setAboutData] = useState({
    platform_version: 'Loading...',
    release_date: 'Loading...',
    copyright: 'Loading...',
    last_updated: 'Loading...'
  });

  useEffect(() => {
    let active = true;
    api.getAboutSettings().then((data) => {
      if (active && data) {
        setAboutData(data);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  const items = [
    {
      label: 'Platform Version',
      desc: 'Current version of the website',
      value: aboutData.platform_version || 'v2.4.1',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Release Date',
      desc: 'When this version was released',
      value: aboutData.release_date || 'June 05, 2026',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Copyright',
      desc: 'All rights reserved',
      value: aboutData.copyright || '@2026 Auromind',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Last Updated',
      desc: 'Last updated date & time',
      value: aboutData.last_updated || 'June 05, 2026, 10:30 AM',
      valueColor: 'text-zinc-300',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">About</h1>
        <p className="mt-1.5 text-[14px] text-white/65">
          Customize your dashboard experience and application settings.
        </p>
      </div>

      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Card */}
      <section className="rounded-2xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="rounded-xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden mx-0">
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 ${idx < items.length - 1 ? 'border-b border-[rgba(157,157,157,0.43)]' : ''}`}
            >
              <div>
                <p className="text-[16px] font-medium text-white">{item.label}</p>
                <p className="mt-0.5 text-[13px] text-white/65">{item.desc}</p>
              </div>
              <p className={`shrink-0 text-sm font-medium whitespace-nowrap ${item.valueColor}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─ My Account Section 

function MyAccountSection({
  preferredName,
  handleNameChange,
  handleNameSubmit,
  userEmail,
  userInitial,
  twoFactorEnabled,
  twoFactorLoading,
  handleTwoFactorToggle,
  handleChangeEmail,
  handleAddPassword,
  handleDeleteAccount,

  deletionScheduledAt,
  onCancelDeletion,
  cancelDelLoading,
}) {
  return (
    <div className="pb-6">

      {/*  Pending Deletion Banner  */}
        {deletionScheduledAt && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-xl border border-red-500/30 bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Account scheduled for deletion</p>
                <p className="mt-0.5 text-xs text-white/60">
                  Your account will be permanently deleted on{' '}
                  <span className="text-white/80 font-medium">
                    {new Date(deletionScheduledAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                  . Log in and cancel before this date to restore your account.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelDeletion}
              disabled={cancelDelLoading}
              className="
                shrink-0 h-9 px-4 rounded-xl text-xs font-semibold text-white
                bg-red-600 hover:bg-red-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all active:scale-95
                flex items-center gap-2
              "
            >
              {cancelDelLoading
                ? <Loader2 size={13} className="animate-spin" />
                : 'Cancel Deletion'}
            </button>
          </div>
        )}
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          My Account
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Manage your account settings and security
        </p>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px w-full bg-[rgba(124,58,237,0.15)]" />

      {/* Profile Card */}
      <section
        className="
          mb-6 rounded-2xl border border-[rgba(157,157,157,0.43)]
          bg-[#070012] p-6
          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        "
      >
        <h2 className="mb-5 text-base font-semibold text-white tracking-tight">
          Account
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div
            className="
              flex items-center justify-center
              w-[72px] h-[72px] md:w-[88px] md:h-[88px]
              rounded-full shrink-0
              bg-gradient-to-br from-violet-500 to-purple-900
              text-white text-2xl md:text-3xl font-bold
              shadow-[0_0_24px_rgba(124,58,237,0.4)]
              select-none
            "
            aria-label={`Avatar for ${preferredName}`}
          >
            {userInitial}
          </div>

          {/* Name field */}
          <div className="flex-1 w-full sm:max-w-sm">
            <label
              htmlFor="preferred-name"
              className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-widest"
            >
              Preferred name
            </label>
            <input
              id="preferred-name"
              type="text"
              value={preferredName}
              onChange={handleNameChange}
              className="
                w-full h-[42px] rounded-xl px-3.5
                bg-[#0B021A] text-white text-sm
                border border-[rgba(157,157,157,0.43)]
                placeholder:text-zinc-600
                focus:outline-none focus:border-violet-500
                focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
                transition-all duration-200
              "
              placeholder="Your name"
            />
            
          </div>
        </div>
      </section>

      {/* Account Security Card */}
      <section
        className="
          rounded-2xl border border-[rgba(157,157,157,0.43)]
          bg-[#070012] overflow-hidden
          shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        "
      >
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Account Security
          </h2>
        </div>

        <div className="mx-6 mb-6 rounded-xl border border-[rgba(157,157,157,0.43)] bg-[#070012] overflow-hidden">

          {/* Email row */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
              border-b border-[rgba(157,157,157,0.43)]
            "
          >
            <div>
              <p className="text-sm font-medium text-white">Email</p>
              <p className="mt-0.5 text-xs text-white/65">{userEmail}</p>
            </div>
          </div>

          {/* Two-step verification row */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-4
              border-b border-[rgba(157,157,157,0.43)]
            "
          >
            <div>
              <p className="text-sm font-medium text-white">
                Two-step verification
              </p>
              <p className="mt-0.5 text-xs text-white/65">
                Add an additional layer of security to your account.
              </p>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={twoFactorEnabled}
                onChange={handleTwoFactorToggle}
                disabled={twoFactorLoading}
              />
            </div>
          </div>

          {/* Delete Account row — removed border-t overlap, uses rounded bottom naturally */}
          <div
            className="
              flex flex-col sm:flex-row sm:items-center justify-between
              gap-4 px-5 py-5
              bg-red-950/10
            "
          >
            <div>
              <p className="text-sm font-semibold text-[#B91C1C]">
                Delete Account
              </p>
              <p className="mt-0.5 text-xs text-white/65">
                Permanently delete your account and all associated data from our workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="
                shrink-0 h-10 px-4 rounded-xl text-sm font-medium
                text-[#B91C1C] bg-black/80 border border-red-500/30
                hover:bg-red-500/20 active:scale-95
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
              "
            >
              Delete my account
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}

// ─ Main Component 

export default function SettingsContent({ email }) {
  const { user, logout } = useAuth();
  console.log('=== SETTINGS DEBUG ===', { user, email });
  const [activeSection, setActiveSection] = useState('my-account');
  const [preferredName, setPreferredName] = useState('User');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [settingsToast, setSettingsToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cancelDelLoading, setCancelDelLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.full_name) setPreferredName(user.full_name);
  }, [user]);

  useEffect(() => {
    if (user?.two_factor_enabled !== undefined) {
      setTwoFactorEnabled(user.two_factor_enabled);
    }
  }, [user]);

  const userInitial = preferredName?.charAt(0)?.toUpperCase() ?? 'U';

  const handleNameChange = (e) => setPreferredName(e.target.value);
  const handleChangeEmail = () => {};
  const handleAddPassword = () => {};
  const handleDeleteAccount = () => setShowDeleteModal(true);

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.requestAccountDeletion();
      setShowDeleteModal(false);
      // Cookie is cleared by backend; clear frontend state and redirect
      showToast('success', 'Account scheduled for deletion. You have been logged out.');
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err) {
      showToast('error', err.message || 'Failed to schedule deletion. Please try again.');
      setDeleteLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelDelLoading(true);
    try {
      await api.cancelAccountDeletion();
      await refreshUser();
      showToast('success', 'Account deletion cancelled. Your account is fully restored.');
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel deletion. Please try again.');
    } finally {
      setCancelDelLoading(false);
    }
  };
  const showToast = (type, msg) => {
      setSettingsToast({ type, msg });
      setTimeout(() => setSettingsToast(null), 4000);
  };

  const handleNameSubmit = async () => {
    if (preferredName && preferredName.trim() !== user?.full_name) {
      try {
        await api.updateProfile({ full_name: preferredName.trim() });
        showToast('success', 'Name updated successfully.');
      } catch (err) {
        showToast('error', 'Failed to update name.');
      }
    }
  };

  const handleTwoFactorToggle = async (val) => {
      if (val) {
          setTwoFactorLoading(true);
          try {
              const data = await api.setup2FA();
              setSetupData(data);
              setShowSetupModal(true);
          } catch (err) {
              showToast('error', err.message || 'Failed to start setup. Please try again.');
          } finally {
              setTwoFactorLoading(false);
          }
      } else {
          setShowDisableModal(true);
      }
  };

  const activeLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeSection)?.label ?? '';

  const renderContent = () => {
    switch (activeSection) {
      case 'my-account':
        return (
          <MyAccountSection
              preferredName={preferredName}
              handleNameChange={handleNameChange}
              handleNameSubmit={handleNameSubmit}
              userEmail={user?.email || ''}
              userInitial={userInitial}
              twoFactorEnabled={twoFactorEnabled}
              handleTwoFactorToggle={handleTwoFactorToggle}
              handleChangeEmail={handleChangeEmail}
              handleAddPassword={handleAddPassword}
              handleDeleteAccount={handleDeleteAccount}

              deletionScheduledAt={user?.deletion_scheduled_at}
              onCancelDeletion={handleCancelDeletion}
              cancelDelLoading={cancelDelLoading}
          />
        );
      case 'preferences':
        return <PreferencesSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'security':
        return <SecuritySection />;
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full font-sans text-white">
      <div className="w-full h-full flex flex-col">

        {/*  Outer card wrapper  */}
        <div
          className="
            flex flex-col lg:flex-row gap-0
            rounded-3xl overflow-hidden
            flex-1 min-h-0
            border border-[rgba(157,157,157,0.43)]
            bg-[#070012]
            shadow-[0_0_60px_rgba(124,58,237,0.08)]
          "
        >

          {/* ════════════════════════════════════════
              MOBILE: top bar with section name + hamburger
          ════════════════════════════════════════ */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[rgba(157,157,157,0.43)] bg-[#070012]">
            <span className="text-sm font-semibold text-white">{activeLabel}</span>
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex flex-col gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
              aria-label="Toggle navigation"
            >
              <span
                className={`block w-5 h-0.5 bg-zinc-300 transition-transform duration-200 ${sidebarOpen ? 'translate-y-1.5 rotate-45' : ''}`}
              />
              <span
                className={`block w-5 h-0.5 bg-zinc-300 transition-opacity duration-200 ${sidebarOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`block w-5 h-0.5 bg-zinc-300 transition-transform duration-200 ${sidebarOpen ? '-translate-y-1.5 -rotate-45' : ''}`}
              />
            </button>
          </div>

          {/* ════════════════════════════════════════
              LEFT SIDEBAR
          ════════════════════════════════════════ */}
          
            <aside
              className={`
                lg:w-[220px] lg:min-w-[220px] lg:shrink-0
                lg:block
                border-b lg:border-b-0 border-[rgba(157,157,157,0.43)]
                bg-[#070012] p-3
                ${sidebarOpen ? 'block' : 'hidden'}
                lg:!block
              `}
            >
              {/*  Sidebar Card Wrapper  */}
              <div
                className="
                  rounded-2xl border border-[rgba(157,157,157,0.43)]
                  bg-[#070012] p-4
                  h-full min-h-full
                "
              >
                {NAV_SECTIONS.map((section) => (
                  <div key={section.title} className="mb-6 last:mb-0">
                    <p className="mb-2 px-3 text-[14px] font-semibold text-white/90">
                      {section.title}
                    </p>
                    <nav className="flex flex-col gap-0.5">
                      {section.items.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSection(item.id);
                              setSidebarOpen(false);
                            }}
                            className={`
                              group flex items-center gap-3 w-full rounded-xl px-3 py-2.5
                              text-sm font-medium text-left
                              transition-all duration-200
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                              ${
                                isActive
                                  ? 'bg-[rgba(124,58,237,0.18)] text-white'
                                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                              }
                            `}
                          >
                            <span
                              className={`
                                flex items-center justify-center w-5 h-5 shrink-0
                                transition-colors duration-200
                                ${isActive ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'}
                              `}
                            >
                              {item.icon}
                            </span>
                            <span className="flex-1">{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </aside>

          {/* ════════════════════════════════════════
              RIGHT CONTENT AREA
          ════════════════════════════════════════ */}
          <main className="flex-1 bg-[#070012] p-5 sm:p-6 md:p-8 lg:p-10 min-w-0 min-h-0 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/*  Toast  */}
      {settingsToast && (
          <div className={`
              fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium
              shadow-lg border backdrop-blur-sm
              ${settingsToast.type === 'success'
                  ? 'bg-green-500/20 border-green-500/30 text-green-300'
                  : 'bg-red-500/20  border-red-500/30  text-red-300'}
          `}>
              {settingsToast.msg}
          </div>
      )}

      {/*  Setup Modal  */}
      {showSetupModal && setupData && (
          <TwoFactorSetupModal
              setupData={setupData}
              onSuccess={() => {
                  setShowSetupModal(false);
                  setSetupData(null);
                  setTwoFactorEnabled(true);
                  showToast('success', 'Two-step verification enabled.');
              }}
              onClose={() => {
                  setShowSetupModal(false);
                  setSetupData(null);
              }}
          />
      )}

      {/*  Disable Modal  */}
      {showDisableModal && (
          <TwoFactorDisableModal
              onSuccess={() => {
                  setShowDisableModal(false);
                  setTwoFactorEnabled(false);
                  showToast('success', 'Two-step verification disabled.');
              }}
              onClose={() => setShowDisableModal(false)}
          />
      )}

      {showDeleteModal && (
          <DeleteAccountModal
              userEmail={user?.email || ''}
              loading={deleteLoading}
              onConfirm={handleConfirmDelete}
              onClose={() => {
                  if (!deleteLoading) setShowDeleteModal(false);
              }}
          />
      )}
    </div>
  );
}