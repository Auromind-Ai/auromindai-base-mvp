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
  Users
} from 'lucide-react';
import ProTip from '../ProTip';
import QuietHours from '../QuietHours';

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
  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const [sendType, setSendType] = useState(data.sendType || 'Send Now'); // 'Send Now' | 'Schedule for Later'
  const [dateVal, setDateVal] = useState(data.scheduleDate || todayFormatted);
  const [timeVal, setTimeVal] = useState(data.scheduleTime || '10:00 AM');
  const [timezone, setTimezone] = useState(data.timezone || '(GMT+05:30) Asia/Kolkata (IST)');
  const [isTzOpen, setIsTzOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);

  const [sendGradually, setSendGradually] = useState(data.sendGradually ?? true);
  const [sendingRate, setSendingRate] = useState(data.sendingRate || 100);
  const [skipInvalid, setSkipInvalid] = useState(data.skipInvalid ?? true);
  const [stopOnFailure, setStopOnFailure] = useState(data.stopOnFailure ?? false);
  const [quietHours, setQuietHours] = useState(data.quietHours ?? true);

  const totalRecipients = data.recipientsCount || 0;
  const validRecipients = data.validRecipients || 0;
  const invalidRecipients = data.invalidRecipients || 0;

  // Calculate estimated completion time
  const calculateEstimatedDuration = () => {
    const minutes = Math.ceil(totalRecipients / (sendingRate || 100));
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (hours > 0) {
      return `${hours} hr ${remainingMins} min`;
    }
    return `${minutes} min`;
  };

  const handleProceed = () => {
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Column (7 cols): Scheduling Configuration */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Schedule Your Campaign
          </h3>
          <p className="text-xs text-[#8c88a6] mt-0.5">
            Choose when you want to send your WhatsApp messages.
          </p>
        </div>

        {/* Send Now vs Schedule for Later Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Send Now */}
          <div
            onClick={() => setSendType('Send Now')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
              sendType === 'Send Now'
                ? 'bg-[#1a0f2e] border-[#814AC8] shadow-[0_0_16px_rgba(129,74,200,0.25)]'
                : 'bg-[#0f0e1c] border-[#251f42] hover:border-[#382f61] hover:bg-[#141226]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  sendType === 'Send Now' ? 'bg-[#814AC8] text-white' : 'bg-[#1a1636] text-[#8c88a6]'
                }`}
              >
                <Send size={15} />
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  sendType === 'Send Now'
                    ? 'border-[#814AC8] bg-[#814AC8]'
                    : 'border-[#382f61] bg-[#141228]'
                }`}
              >
                {sendType === 'Send Now' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Send Now</h4>
              <p className="text-[10px] text-[#8c88a6] mt-0.5 leading-snug">
                Start sending your campaign immediately after confirmation.
              </p>
            </div>
          </div>

          {/* Schedule for Later */}
          <div
            onClick={() => setSendType('Schedule for Later')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
              sendType === 'Schedule for Later'
                ? 'bg-[#1a0f2e] border-[#814AC8] shadow-[0_0_16px_rgba(129,74,200,0.25)]'
                : 'bg-[#0f0e1c] border-[#251f42] hover:border-[#382f61] hover:bg-[#141226]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  sendType === 'Schedule for Later'
                    ? 'bg-[#814AC8] text-white'
                    : 'bg-[#1a1636] text-[#8c88a6]'
                }`}
              >
                <CalendarIcon size={15} />
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  sendType === 'Schedule for Later'
                    ? 'border-[#814AC8] bg-[#814AC8]'
                    : 'border-[#382f61] bg-[#141228]'
                }`}
              >
                {sendType === 'Schedule for Later' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Schedule for Later</h4>
              <p className="text-[10px] text-[#8c88a6] mt-0.5 leading-snug">
                Choose a date and time to send your campaign.
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time Selectors */}
        {sendType === 'Schedule for Later' && (
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-semibold text-white">
              Select Date & Time
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#D4D4D4]">
                  Date <span className="text-[#814AC8]">*</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0e1c] border border-[#251f42] text-xs text-white">
                  <CalendarIcon size={14} className="text-[#814AC8] shrink-0" />
                  <input
                    type="text"
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    className="bg-transparent w-full text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#D4D4D4]">
                  Time <span className="text-[#814AC8]">*</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0e1c] border border-[#251f42] text-xs text-white">
                  <Clock size={14} className="text-[#814AC8] shrink-0" />
                  <input
                    type="text"
                    value={timeVal}
                    onChange={(e) => setTimeVal(e.target.value)}
                    className="bg-transparent w-full text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Timezone Selector */}
            <div className="space-y-1 relative">
              <label className="text-xs font-medium text-[#D4D4D4]">
                Timezone
              </label>
              <div
                onClick={() => setIsTzOpen(!isTzOpen)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] cursor-pointer text-xs text-white transition-all"
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-[#8c88a6] shrink-0" />
                  <span>{timezone}</span>
                </div>
                <ChevronDown size={14} className={`text-[#8c88a6] transition-transform ${isTzOpen ? 'rotate-180' : ''}`} />
              </div>

              {isTzOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto">
                  {TIMEZONES.map((tz) => (
                    <div
                      key={tz}
                      onClick={() => {
                        setTimezone(tz);
                        setIsTzOpen(false);
                      }}
                      className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                        timezone === tz ? 'bg-[#814AC8]/20 text-white font-semibold' : 'text-[#D4D4D4] hover:bg-[#1a1638]'
                      }`}
                    >
                      {tz}
                    </div>
                  ))}
                </div>
              )}
              <span className="text-[10px] text-[#6d688c] block mt-1">
                Campaign will be sent in your local timezone
              </span>
            </div>
          </div>
        )}

        {/* Sending Preferences */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-white">
            Sending Preferences
          </h4>

          <div className="space-y-2.5">
            {/* 1. Send gradually */}
            <div className="p-3 rounded-xl bg-[#0f0e1c] border border-[#251f42] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendGradually}
                    onChange={(e) => setSendGradually(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-white block">
                      Send gradually
                    </span>
                    <span className="text-[10px] text-[#8c88a6]">
                      Spread messages over time to appear more natural
                    </span>
                  </div>
                </label>
              </div>

              {sendGradually && (
                <div className="relative pl-6 pt-1">
                  <div
                    onClick={() => setIsRateOpen(!isRateOpen)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-[#141228] border border-[#2d2650] flex items-center justify-between text-xs text-white cursor-pointer hover:border-[#814AC8]"
                  >
                    <span>{sendingRate} messages per minute</span>
                    <ChevronDown size={13} className="text-[#8c88a6]" />
                  </div>

                  {isRateOpen && (
                    <div className="absolute top-full left-6 mt-1 w-64 bg-[#141228] border border-[#2d2650] rounded-lg shadow-2xl p-1 z-30">
                      {SENDING_RATES.map((r) => (
                        <div
                          key={r.rate}
                          onClick={() => {
                            setSendingRate(r.rate);
                            setIsRateOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs rounded cursor-pointer ${
                            sendingRate === r.rate ? 'bg-[#814AC8]/20 text-white font-medium' : 'text-[#D4D4D4] hover:bg-[#1f1a3b]'
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
            <div className="p-3 rounded-xl bg-[#0f0e1c] border border-[#251f42]">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                />
                <div>
                  <span className="text-xs font-medium text-white block">
                    Skip invalid numbers
                  </span>
                  <span className="text-[10px] text-[#8c88a6]">
                    Automatically skip invalid or unreachable numbers
                  </span>
                </div>
              </label>
            </div>

            {/* 3. Stop on high failure rate */}
            <div className="p-3 rounded-xl bg-[#0f0e1c] border border-[#251f42]">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stopOnFailure}
                  onChange={(e) => setStopOnFailure(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                />
                <div>
                  <span className="text-xs font-medium text-white block">
                    Stop on high failure rate
                  </span>
                  <span className="text-[10px] text-[#8c88a6]">
                    Pause sending if failure rate exceeds 10%
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#251f42]/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9da3ae] bg-[#121024] border border-[#251f42] hover:text-white hover:border-[#3d3363] transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] flex items-center gap-1.5 transition-all"
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Right Column (5 cols): Estimated Schedule Timeline + ProTip + Quiet Hours */}
      <div className="lg:col-span-5 space-y-4">
        {/* Estimated Schedule Card */}
        <div className="rounded-xl bg-[#0f0e1c] border border-[#251f42] p-5 text-xs">
          <h4 className="font-semibold text-white text-sm mb-4">
            Estimated Schedule
          </h4>

          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#251f42]">
            {/* Start Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <CalendarIcon size={13} />
              </div>
              <div>
                <span className="text-[10px] text-[#8c88a6] uppercase font-semibold tracking-wider block">
                  Campaign will start on
                </span>
                <span className="text-xs font-bold text-white">
                  {dateVal} at {timeVal} (IST)
                </span>
              </div>
            </div>

            {/* Estimated Completion Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Send size={13} />
              </div>
              <div>
                <span className="text-[10px] text-[#8c88a6] uppercase font-semibold tracking-wider block">
                  Estimated completion
                </span>
                <span className="text-xs font-bold text-white block">
                  ~ {calculateEstimatedDuration()} after start
                </span>
                <span className="text-[10px] text-[#7f7a9c]">
                  Based on {totalRecipients.toLocaleString()} messages at {sendingRate}/min ({calculateEstimatedDuration()})
                </span>
              </div>
            </div>

            {/* Recipients Event */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Users size={13} />
              </div>
              <div>
                <span className="text-[10px] text-[#8c88a6] uppercase font-semibold tracking-wider block">
                  Total recipients
                </span>
                <span className="text-sm font-bold text-white block leading-tight">
                  {totalRecipients.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#8c88a6] block mt-0.5">
                  Valid numbers: {validRecipients.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-400/80">
                  Invalid numbers: {invalidRecipients.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip Card */}
        <ProTip message="For better deliverability, we recommend sending messages gradually instead of all at once." />

        {/* Quiet Hours Card */}
        <QuietHours enabled={quietHours} onChange={setQuietHours} />
      </div>
    </div>
  );
}
