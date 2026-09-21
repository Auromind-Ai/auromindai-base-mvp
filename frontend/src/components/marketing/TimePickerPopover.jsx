'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, AlertCircle } from 'lucide-react';
import {
  parseTimeToComponents,
  formatComponentsToTime,
  isFutureSchedule,
  formatTimeDisplay,
} from '@/lib/campaignScheduleUtils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'];

export default function TimePickerPopover({ selectedTime, selectedDate, onSelect, onClose }) {
  const popoverRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  const initial = parseTimeToComponents(selectedTime || '12:00 PM');
  const [hour, setHour] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState(initial.ampm);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Auto-scroll selected hour and minute into view on initial open
  useEffect(() => {
    const timer = setTimeout(() => {
      const selectedHourEl = hourListRef.current?.querySelector('[data-selected="true"]');
      if (selectedHourEl) {
        selectedHourEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const selectedMinuteEl = minuteListRef.current?.querySelector('[data-selected="true"]');
      if (selectedMinuteEl) {
        selectedMinuteEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const formattedTime = formatComponentsToTime(hour, minute, ampm);
  const isFuture = isFutureSchedule(selectedDate, formattedTime);
  const nowFormatted = formatTimeDisplay(new Date());

  const handleApply = () => {
    onSelect(formattedTime);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 sm:right-0 sm:left-auto mt-1.5 z-40 w-72 sm:w-80 rounded-2xl bg-[#0f0e1f] border border-[#2d2650] shadow-[0_16px_48px_rgba(0,0,0,0.9)] p-4 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#251f42] mb-3">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-[#814AC8]" />
          <h4 className="text-xs font-bold text-white tracking-wide">
            Select Time
          </h4>
        </div>

        {/* Selected Time Display Pill */}
        <div className="flex items-center gap-1 bg-[#141228] px-2.5 py-1 rounded-xl border border-[#2d2650]">
          <span className="text-xs font-bold text-white tracking-wider">
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-[#a874e6]">
            {ampm}
          </span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 text-center mb-1.5">
        <span className="text-[10px] font-semibold text-[#8c88a6] uppercase tracking-wider">
          Hour
        </span>
        <span className="text-[10px] font-semibold text-[#8c88a6] uppercase tracking-wider">
          Minute
        </span>
        <span className="text-[10px] font-semibold text-[#8c88a6] uppercase tracking-wider">
          AM / PM
        </span>
      </div>

      {/* 3-Column Scroll Area */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#0b0a17] border border-[#221c3b]">
        {/* Column 1: Hours (01 - 12) */}
        <div
          ref={hourListRef}
          className="h-48 overflow-y-auto space-y-1 p-1 pr-1.5 custom-scrollbar"
        >
          {HOURS.map((h) => {
            const isSelected = hour === h;
            return (
              <button
                key={h}
                type="button"
                data-selected={isSelected}
                onClick={() => setHour(h)}
                className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#814AC8] text-white font-bold shadow-[0_0_12px_rgba(129,74,200,0.6)]'
                    : 'text-[#a8a3c2] hover:text-white hover:bg-[#181433]'
                }`}
              >
                {String(h).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Column 2: Minutes (00 - 59) */}
        <div
          ref={minuteListRef}
          className="h-48 overflow-y-auto space-y-1 p-1 pr-1.5 custom-scrollbar border-x border-[#221c3b]"
        >
          {MINUTES.map((m) => {
            const isSelected = minute === m;
            return (
              <button
                key={m}
                type="button"
                data-selected={isSelected}
                onClick={() => setMinute(m)}
                className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#814AC8] text-white font-bold shadow-[0_0_12px_rgba(129,74,200,0.6)]'
                    : 'text-[#a8a3c2] hover:text-white hover:bg-[#181433]'
                }`}
              >
                {String(m).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Column 3: AM / PM */}
        <div className="h-48 flex flex-col justify-center space-y-2 p-1">
          {PERIODS.map((p) => {
            const isSelected = ampm === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmpm(p)}
                className={`w-full py-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#814AC8] text-white shadow-[0_0_14px_rgba(129,74,200,0.6)]'
                    : 'bg-[#141228] text-[#a8a3c2] hover:text-white hover:bg-[#1e193d] border border-[#251f42]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Status Indicator */}
      <div className="mt-3 pt-2.5 border-t border-[#251f42]">
        {isFuture ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            <Check size={13} className="shrink-0" />
            <span>Valid future time ({formattedTime})</span>
          </div>
        ) : (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-400 font-medium bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/25">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>
              Past time! Must be after current time ({nowFormatted})
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs text-[#8c88a6] hover:text-white hover:bg-[#181432] transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_14px_rgba(129,74,200,0.4)] transition-all cursor-pointer"
        >
          Set Time
        </button>
      </div>
    </div>
  );
}
