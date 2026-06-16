'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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
  Info,
  AlertTriangle,
} from 'lucide-react';

// ─── Nav Config ───────────────────────────────────────────────────────────────

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
      { id: 'people', label: 'People', icon: <Users size={15} /> },
      { id: 'security', label: 'Security', icon: <Shield size={15} /> },
      { id: 'about', label: 'About', icon: <Info size={15} /> },
    ],
  },
];

// ─── Toggle Component ─────────────────────────────────────────────────────────

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

// ─── Preferences Section ──────────────────────────────────────────────────────

function PreferencesSection() {
  const [autoTimezone, setAutoTimezone] = useState(false);
  const [weekStart, setWeekStart] = useState('Mon');

  const [timezone, setTimezone] = useState('');
  const [timezoneLabel, setTimezoneLabel] = useState('Detecting...');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const m = String(Math.abs(offset) % 60).padStart(2, '0');
    const cityName = tz.split('/').pop().replace(/_/g, ' ');
    setTimezoneLabel(`(GMT${sign}${h}:${m}) ${cityName}`);
  }, []);

  const handleAutoTimezone = (val) => {
    setAutoTimezone(val);
    if (val) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const m = String(Math.abs(offset) % 60).padStart(2, '0');
      const cityName = tz.split('/').pop().replace(/_/g, ' ');
      setTimezoneLabel(`(GMT${sign}${h}:${m}) ${cityName}`);
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

          {/* Language row */}
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

          {/* Time zone row */}
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
              {timezoneLabel}
            </button>
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

          {/* Week starts on row */}
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

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection() {
  const [notifs, setNotifs] = useState({
    reminders: false,
    productUpdates: false,
    securityAlerts: false,
    aiAgentEvents: false,
    workflowAlerts: false,
    leadsAlerts: false,
  });

  const toggleNotif = (key) =>
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  const notifItems = [
    {
      key: 'reminders',
      label: 'Reminders',
      desc: 'Notify me about upcoming events .',
    },
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
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Placeholder sections ─────────────────────────────────────────────────────

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

// ─── People Section ───────────────────────────────────────────────────────────

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

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const items = [
    {
      label: 'Active Sessions',
      desc: 'View and manage devices currently logged into your account.',
      value: '3 Devices Active',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Recent Login Activity',
      desc: 'Track recent sign-ins, locations, and login attempts.',
      value: 'Last Login 2 hours ago',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Blocked Devices',
      desc: 'Manage devices that are restricted from accessing your account.',
      value: '0 Devices Blocked',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Security Score',
      desc: "Measure your account's overall security strength and protection level.",
      value: 'Strong',
      valueColor: 'text-green-400',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Security</h1>
        <p className="mt-1.5 text-[14px] text-white/65">
          Manage account access, monitor login activity, and keep your account protected.
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

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  const items = [
    {
      label: 'Platform Version',
      desc: 'Current version of the website',
      value: 'v2.4.1',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Release Date',
      desc: 'When this version was released',
      value: 'June 05, 2026',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Copyright',
      desc: 'All rights reserved',
      value: '@2026 Auromind',
      valueColor: 'text-zinc-300',
    },
    {
      label: 'Last Updated',
      desc: 'Last updated date & time',
      value: 'June 05, 2026, 10:30 AM',
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

// ─── My Account Section ───────────────────────────────────────────────────────

function MyAccountSection({
  preferredName,
  handleNameChange,
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

      {/* ── Pending Deletion Banner ── */}
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
            <button
              type="button"
              className="
                mt-2 text-xs text-violet-400 hover:text-violet-300
                transition-colors duration-200 underline-offset-2 hover:underline
              "
            >
              Create your portrait
            </button>
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

// ─── Main Component ───────────────────────────────────────────────────────────

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
      case 'people':
        return <PeopleSection />;
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

        {/* ── Outer card wrapper ── */}
        <div
          className="
            flex flex-col xl:flex-row gap-0
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
          <div className="xl:hidden flex items-center justify-between px-4 py-3 border-b border-[rgba(157,157,157,0.43)] bg-[#070012]">
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
                xl:w-[240px] xl:min-w-[240px] xl:shrink-0
                xl:block
                border-b xl:border-b-0 border-[rgba(157,157,157,0.43)]
                bg-[#070012] p-3
                ${sidebarOpen ? 'block' : 'hidden'}
                xl:!block
              `}
            >
              {/* ── Sidebar Card Wrapper ── */}
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

      {/* ── Toast ── */}
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

      {/* ── Setup Modal ── */}
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

      {/* ── Disable Modal ── */}
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