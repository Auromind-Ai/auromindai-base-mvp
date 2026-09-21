'use client';

import React, { useState } from 'react';
import {
  Send,
  Calendar as CalendarIcon,
  Clock,
  Globe,
  ChevronDown,
  Info,
  CheckCircle2,
  Users,
  AlertCircle
} from 'lucide-react';
import ProTip from '../ProTip';
import QuietHours from '../QuietHours';
import DatePickerPopover from '../DatePickerPopover';
import TimePickerPopover from '../TimePickerPopover';
import {
  isFutureSchedule,
  getDefaultFutureSchedule,
  formatTimeDisplay
} from '@/lib/campaignScheduleUtils';

const TIMEZONES = [
  '(GMT+05:30) Asia/Kolkata (IST)',
  '(GMT+00:00) UTC',
  '(GMT-05:00) America/New_York (EST)',
  '(GMT-08:00) America/Los_Angeles (PST)',
  '(GMT+04:00) Asia/Dubai (GST)',
  '(GMT+08:00) Asia/Singapore (SGT)',
];

const SENDING_RATES = [
  { rate: 50, label: '50 messages per minute' },
  { rate: 100, label: '100 messages per minute' },
  { rate: 200, label: '200 messages per minute' },
  { rate: 500, label: '500 messages per minute' },
];

export default function ScheduleStep({ data, updateData, onNext, onBack }) {
  const defaultFuture = getDefaultFutureSchedule();
  const initialDate = data.scheduleDate || defaultFuture.date;
  const initialTime =
    data.scheduleTime && isFutureSchedule(initialDate, data.scheduleTime)
      ? data.scheduleTime
      : defaultFuture.time;

  const [sendType, setSendType] = useState(data.sendType || 'Send Now'); // 'Send Now' | 'Schedule for Later'
  const [dateVal, setDateVal] = useState(initialDate);
  const [timeVal, setTimeVal] = useState(initialTime);
  const [timezone, setTimezone] = useState(data.timezone || '(GMT+05:30) Asia/Kolkata (IST)');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTzOpen, setIsTzOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);

  // Future-time validation: If scheduled for later, must be strictly greater than current time
  const isScheduleValid = sendType === 'Send Now' || isFutureSchedule(dateVal, timeVal);

  const [sendGradually, setSendGradually] = useState(data.sendGradually ?? true);
  const [sendingRate, setSendingRate] = useState(data.sendingRate || 100);
  const [skipInvalid, setSkipInvalid] = useState(data.skipInvalid ?? true);
  const [stopOnFailure, setStopOnFailure] = useState(data.stopOnFailure ?? true);
  const [quietHours, setQuietHours] = useState(data.quietHours ?? true);

  const totalRecipients = data.recipientsCount || 0;
  const validRecipients = data.validRecipients || 0;
  const invalidRecipients = data.invalidRecipients || 0;

  const portfolioRemainingToday = data.portfolioRemainingToday !== undefined ? data.portfolioRemainingToday : null;
  const isWhatsAppConnected = data.isWhatsAppConnected ?? true;
  const isQuotaExceeded = isWhatsAppConnected && portfolioRemainingToday !== null && validRecipients > portfolioRemainingToday;
  const sendingToday = portfolioRemainingToday !== null ? Math.max(0, Math.min(validRecipients, portfolioRemainingToday)) : validRecipients;
  const sendingTomorrow = portfolioRemainingToday !== null ? Math.max(0, validRecipients - sendingToday) : 0;

  // Calculate estimated completion time
  const calculateEstimatedDuration = () => {
    if (isQuotaExceeded) {
      if (portfolioRemainingToday === 0) {
        return 'Tomorrow (All held for 24h reset)';
      }
      return '2 Days (Split across Meta 24h limit)';
    }
    if (!sendGradually) {
      return '< 1 min (Fast dispatch)';
    }
    const minutes = Math.ceil(totalRecipients / (sendingRate || 100));
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (hours > 0) {
      return `${hours} hr ${remainingMins} min`;
    }
    return `${minutes} min`;
  };

  const handleSelectScheduleForLater = () => {
    setSendType('Schedule for Later');
    if (!isFutureSchedule(dateVal, timeVal)) {
      const def = getDefaultFutureSchedule();
      setDateVal(def.date);
      setTimeVal(def.time);
    }
  };

  const handleProceed = () => {
    if (sendType === 'Schedule for Later' && !isScheduleValid) {
      return;
    }
    updateData({
      sendType,
      scheduleDate: dateVal,
      scheduleTime: timeVal,
      timezone,
      sendGradually,
      sendingRate,
      skipInvalid,
      stopOnFailure,
      quietHours,
    });
    onNext();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
      {/* Left Column (7 cols): Scheduling Configuration */}
      <div className="lg:col-span-7 xl:col-span-7 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">
            Schedule Your Campaign
          </h3>
          <p className="text-xs sm:text-sm text-[#c4c0db] mt-1 font-normal">
            Choose when you want to send your WhatsApp messages.
          </p>
        </div>

        {/* Send Now vs Schedule for Later Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Send Now */}
          <div
            onClick={() => setSendType('Send Now')}
            className={`p-4 rounded-xl border border-white/[0.07] cursor-pointer transition-all duration-200 flex flex-col justify-between select-none min-h-[105px] ${
              sendType === 'Send Now'
                ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white'
                : 'bg-[#0d0e17] hover:border-white/20 text-[#8e95ab] hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Send
                size={18}
                className={sendType === 'Send Now' ? 'text-white' : 'text-white/60'}
              />
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  sendType === 'Send Now'
                    ? 'border-white bg-[#814AC8]'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {sendType === 'Send Now' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-white leading-tight">
                Send Now
              </h4>
              <p className={`text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal ${sendType === 'Send Now' ? 'text-white/90' : 'text-[#c4c0db]'}`}>
                Start sending your campaign immediately after confirmation.
              </p>
            </div>
          </div>

          {/* Schedule for Later */}
          <div
            onClick={() => setSendType('Schedule for Later')}
            className={`p-4 rounded-xl border border-white/[0.07] cursor-pointer transition-all duration-200 flex flex-col justify-between select-none min-h-[105px] ${
              sendType === 'Schedule for Later'
                ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white'
                : 'bg-[#0d0e17] hover:border-white/20 text-[#8e95ab] hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <CalendarIcon
                size={18}
                className={sendType === 'Schedule for Later' ? 'text-white' : 'text-white/60'}
              />
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  sendType === 'Schedule for Later'
                    ? 'border-white bg-[#814AC8]'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {sendType === 'Schedule for Later' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-white leading-tight">
                Schedule for Later
              </h4>
              <p className={`text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal ${sendType === 'Schedule for Later' ? 'text-white/90' : 'text-[#c4c0db]'}`}>
                Choose a date and time to send your campaign.
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time Selectors */}
        {sendType === 'Schedule for Later' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white">
                Select Date & Time
              </h4>
              <span className="text-[10px] text-[#8c88a6]">
                Choose any date and time in the future
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date Picker */}
              <div className="space-y-1 relative">
                <label className="text-xs font-medium text-[#D4D4D4] flex items-center justify-between">
                  <span>
                    Date <span className="text-[#814AC8]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8c88a6]">Click to select</span>
                </label>
                <div
                  onClick={() => {
                    setIsDateOpen(!isDateOpen);
                    setIsTimeOpen(false);
                    setIsTzOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0f0e1c] border transition-all cursor-pointer select-none ${
                    !isScheduleValid
                      ? 'border-rose-500/60 hover:border-rose-400 bg-rose-500/[0.04]'
                      : 'border-[#251f42] hover:border-[#814AC8]/80 hover:bg-[#131126]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-white">
                    <CalendarIcon size={14} className="text-[#814AC8] shrink-0" />
                    <span className="font-medium">{dateVal}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-[#8c88a6] transition-transform ${isDateOpen ? 'rotate-180 text-white' : ''}`}
                  />
                </div>

                {isDateOpen && (
                  <DatePickerPopover
                    selectedDate={dateVal}
                    onSelect={(newDate) => {
                      setDateVal(newDate);
                      setIsDateOpen(false);
                    }}
                    onClose={() => setIsDateOpen(false)}
                  />
                )}
              </div>

              {/* Time Picker */}
              <div className="space-y-1 relative">
                <label className="text-xs font-medium text-[#D4D4D4] flex items-center justify-between">
                  <span>
                    Time <span className="text-[#814AC8]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8c88a6]">Click to select</span>
                </label>
                <div
                  onClick={() => {
                    setIsTimeOpen(!isTimeOpen);
                    setIsDateOpen(false);
                    setIsTzOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0f0e1c] border transition-all cursor-pointer select-none ${
                    !isScheduleValid
                      ? 'border-rose-500/60 hover:border-rose-400 bg-rose-500/[0.04]'
                      : 'border-[#251f42] hover:border-[#814AC8]/80 hover:bg-[#131126]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-white">
                    <Clock size={14} className="text-[#814AC8] shrink-0" />
                    <span className="font-medium">{timeVal}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-[#8c88a6] transition-transform ${isTimeOpen ? 'rotate-180 text-white' : ''}`}
                  />
                </div>

                {isTimeOpen && (
                  <TimePickerPopover
                    selectedTime={timeVal}
                    selectedDate={dateVal}
                    onSelect={(newTime) => {
                      setTimeVal(newTime);
                      setIsTimeOpen(false);
                    }}
                    onClose={() => setIsTimeOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* Validation Alert for past date/time */}
            {!isScheduleValid && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block text-rose-200">
                    Scheduled time must be in the future
                  </span>
                  <span className="text-[11px] text-rose-300/80 mt-0.5 block leading-normal">
                    You cannot schedule a campaign in the past. Current time is{' '}
                    <strong className="text-white">{formatTimeDisplay(new Date())}</strong>. Please select a time after current time.
                  </span>
                </div>
              </div>
            )}

            {/* Timezone Selector */}
            <div className="space-y-1.5 relative">
              <label className="text-xs sm:text-sm font-normal text-[#e4e4e7]">
                Timezone
              </label>
              <div
                onClick={() => setIsTzOpen(!isTzOpen)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#080a12] border border-[#1b2238] hover:border-[#283250] cursor-pointer text-xs sm:text-sm text-white transition-all font-normal"
              >
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-[#c4c0db] shrink-0" />
                  <span>{timezone}</span>
                </div>
                <ChevronDown size={14} className={`text-[#c4c0db] transition-transform ${isTzOpen ? 'rotate-180' : ''}`} />
              </div>

              {isTzOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0f1322] border border-[#1e2740] rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto">
                  {TIMEZONES.map((tz) => (
                    <div
                      key={tz}
                      onClick={() => {
                        setTimezone(tz);
                        setIsTzOpen(false);
                      }}
                      className={`px-3 py-2 text-xs sm:text-sm rounded-lg cursor-pointer transition-colors ${
                        timezone === tz ? 'bg-[#814AC8]/20 text-white font-medium' : 'text-white/90 hover:bg-[#181f33]'
                      }`}
                    >
                      {tz}
                    </div>
                  ))}
                </div>
              )}
              <span className="text-xs text-[#a1a1aa] block mt-1 font-normal">
                Campaign will be sent in your local timezone
              </span>
            </div>
          </div>
        )}

        {/* Sending Preferences */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs sm:text-sm font-medium text-white">
            Sending Preferences
          </h4>

          <div className="space-y-2.5">
            {/* 1. Send gradually */}
            <div className="p-3.5 rounded-xl bg-[#0a0d17] border border-[#1b2238] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendGradually}
                    onChange={(e) => setSendGradually(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-medium text-white block">
                      Send gradually
                    </span>
                    <span className="text-xs text-[#c4c0db] mt-0.5 block font-normal leading-relaxed">
                      Spread messages over time to appear more natural
                    </span>
                  </div>
                </label>
              </div>

              {sendGradually && (
                <div className="relative pl-7 pt-1">
                  <div
                    onClick={() => setIsRateOpen(!isRateOpen)}
                    className="w-full sm:w-64 px-3 py-2 rounded-lg bg-[#080a12] border border-[#1b2238] flex items-center justify-between text-xs sm:text-sm text-white cursor-pointer hover:border-[#814AC8] font-normal"
                  >
                    <span>{sendingRate} messages per minute</span>
                    <ChevronDown size={14} className="text-[#c4c0db]" />
                  </div>

                  {isRateOpen && (
                    <div className="absolute top-full left-7 mt-1 w-64 bg-[#0f1322] border border-[#1e2740] rounded-lg shadow-2xl p-1 z-30">
                      {SENDING_RATES.map((r) => (
                        <div
                          key={r.rate}
                          onClick={() => {
                            setSendingRate(r.rate);
                            setIsRateOpen(false);
                          }}
                          className={`px-3 py-2 text-xs sm:text-sm rounded cursor-pointer ${
                            sendingRate === r.rate ? 'bg-[#814AC8]/20 text-white font-medium' : 'text-white/90 hover:bg-[#181f33]'
                          }`}
                        >
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Skip invalid numbers */}
            <div className="p-3.5 rounded-xl bg-[#0a0d17] border border-[#1b2238]">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                />
                <div>
                  <span className="text-xs sm:text-sm font-medium text-white block">
                    Skip invalid numbers
                  </span>
                  <span className="text-xs text-[#c4c0db] mt-0.5 block font-normal leading-relaxed">
                    Automatically skip invalid or unreachable numbers
                  </span>
                </div>
              </label>
            </div>

            {/* 3. Stop on high failure rate */}
            <div className="p-3.5 rounded-xl bg-[#0a0d17] border border-[#1b2238]">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stopOnFailure}
                  onChange={(e) => setStopOnFailure(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                />
                <div>
                  <span className="text-xs sm:text-sm font-medium text-white block">
                    Stop on high failure rate
                  </span>
                  <span className="text-xs text-[#c4c0db] mt-0.5 block font-normal leading-relaxed">
                    Pause sending if failure rate exceeds 10%
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (5 cols): Estimated Schedule Timeline + ProTip + Quiet Hours */}
      <div className="lg:col-span-5 xl:col-span-5 space-y-4">
        {/* Estimated Schedule Card */}
        <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-5 text-xs sm:text-sm">
          <h4 className="font-medium text-white text-sm sm:text-base mb-4">
            Estimated Schedule
          </h4>

          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#1b2238]">
            {/* Start Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                sendType === 'Send Now'
                  ? 'bg-blue-500/15 border-sky-500/30 text-sky-400'
                  : isScheduleValid
                  ? 'bg-purple-500/15 border-purple-500/30 text-[#C49FE0]'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <CalendarIcon size={13} />
              </div>
              <div>
                <span className="text-xs text-[#c4c0db] font-medium block">
                  Campaign will start on
                </span>
                <span className={`text-xs font-bold block ${!isScheduleValid && sendType !== 'Send Now' ? 'text-rose-400' : 'text-white'}`}>
                  {sendType === 'Send Now'
                    ? 'Immediately upon launch'
                    : isScheduleValid
                    ? `${dateVal} at ${timeVal} (IST)`
                    : `${dateVal} at ${timeVal} (Past time!)`}
                </span>
                {!isScheduleValid && sendType !== 'Send Now' && (
                  <span className="text-[10px] text-rose-400/90 block mt-0.5">
                    Requires a future time to proceed
                  </span>
                )}
              </div>
            </div>

            {/* Estimated Completion Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Send size={14} />
              </div>
              <div>
                <span className="text-xs text-[#c4c0db] font-medium block">
                  Estimated completion
                </span>
                <span className={`text-xs sm:text-sm font-medium mt-0.5 block ${isQuotaExceeded ? 'text-amber-300' : 'text-white'}`}>
                  ~ {calculateEstimatedDuration()}
                </span>
                <span className="text-xs text-[#a1a1aa] font-normal block mt-0.5">
                  {isQuotaExceeded ? (
                    portfolioRemainingToday === 0
                      ? `All ${validRecipients.toLocaleString()} msgs held until Meta 24h limit resets tomorrow`
                      : `${sendingToday.toLocaleString()} msgs sent today · ${sendingTomorrow.toLocaleString()} msgs sent tomorrow`
                  ) : sendGradually ? (
                    `Based on ${totalRecipients.toLocaleString()} messages at ${sendingRate}/min`
                  ) : (
                    `Direct blast dispatch (Safe 40 msgs/sec throughput)`
                  )}
                </span>
              </div>
            </div>

            {/* Recipients Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-[#814AC8]/15 border border-[#814AC8]/30 flex items-center justify-center text-[#a78bfa] shrink-0 mt-0.5">
                <Users size={14} />
              </div>
              <div>
                <span className="text-xs text-[#c4c0db] font-medium block">
                  Total recipients
                </span>
                <span className="text-sm sm:text-base font-semibold text-white block leading-tight mt-0.5">
                  {totalRecipients.toLocaleString()}
                </span>
                <span className="text-xs text-[#c4c0db] block mt-1 font-normal">
                  Valid numbers: {validRecipients.toLocaleString()}
                </span>
                <span className="text-xs text-amber-300 font-normal block mt-0.5">
                  Invalid numbers: {invalidRecipients.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip Card */}
        <ProTip message="Keep Send gradually, Quiet hours, and Auto-stop on failure turned on to prevent WhatsApp bans, avoid spam reports, and ensure maximum delivery." />

        {/* Quiet Hours Card */}
        <QuietHours enabled={quietHours} onChange={setQuietHours} />
      </div>

      {/* Bottom Full-Width Action Buttons */}
      <div className="col-span-12 pt-6 mt-4 border-t border-[#1b2238] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white/80 bg-[#101424] border border-[#1e263c] hover:bg-[#181e34] hover:text-white transition-all"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_18px_rgba(129,74,200,0.4)] flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
