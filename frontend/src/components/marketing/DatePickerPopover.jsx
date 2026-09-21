'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  parseScheduleDateTime,
  formatDateDisplay,
  MONTH_FULL,
} from '@/lib/campaignScheduleUtils';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePickerPopover({ selectedDate, onSelect, onClose }) {
  const popoverRef = useRef(null);

  // Parse initial selected date or default to today
  const initialDate = parseScheduleDateTime(selectedDate, '12:00 PM') || new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

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

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Navigation handlers
  const canGoPrevMonth =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (!canGoPrevMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const chosen = new Date(viewYear, viewMonth, day, 12, 0, 0, 0);
    onSelect(formatDateDisplay(chosen));
    onClose();
  };

  const isSelected = (day) => {
    return (
      initialDate.getFullYear() === viewYear &&
      initialDate.getMonth() === viewMonth &&
      initialDate.getDate() === day
    );
  };

  const isToday = (day) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const isDayInPast = (day) => {
    const dayDate = new Date(viewYear, viewMonth, day, 0, 0, 0, 0);
    return dayDate.getTime() < today.getTime();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1.5 z-40 w-72 rounded-2xl bg-[#0f0e1f] border border-[#2d2650] shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-4 text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month & Navigation Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-white tracking-wide">
          {MONTH_FULL[viewMonth]} {viewYear}
        </h4>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              canGoPrevMonth
                ? 'hover:bg-[#1e193d] text-[#a8a3c2] hover:text-white cursor-pointer'
                : 'text-[#443d63] opacity-40 cursor-not-allowed'
            }`}
            title={canGoPrevMonth ? 'Previous month' : 'Cannot select past months'}
          >
            <ChevronLeft size={14} />
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#1e193d] text-[#a8a3c2] hover:text-white transition-all cursor-pointer"
            title="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {DAY_LABELS.map((day) => (
          <span key={day} className="text-[10px] font-semibold text-[#6e6894]">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty cells before day 1 */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const past = isDayInPast(day);
          const selected = isSelected(day);
          const todayCell = isToday(day);

          return (
            <button
              key={day}
              type="button"
              disabled={past}
              onClick={() => handleSelectDay(day)}
              className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all select-none ${
                selected
                  ? 'bg-[#814AC8] text-white font-bold shadow-[0_0_14px_rgba(129,74,200,0.6)]'
                  : past
                  ? 'text-[#4d4768] opacity-35 cursor-not-allowed line-through'
                  : todayCell
                  ? 'text-white border border-[#814AC8]/70 hover:bg-[#1e193d] cursor-pointer'
                  : 'text-[#d6d3e6] hover:bg-[#1e193d] hover:text-white cursor-pointer'
              }`}
              title={past ? 'Past date cannot be selected' : todayCell ? 'Today' : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer info note */}
      <div className="mt-3 pt-2.5 border-t border-[#251f42] flex items-center justify-between text-[10px] text-[#787299]">
        <span>Click any date to select</span>
        <button
          type="button"
          onClick={() => {
            onSelect(formatDateDisplay(new Date()));
            onClose();
          }}
          className="text-[#9d63e0] hover:text-[#b682f2] font-medium transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
}
