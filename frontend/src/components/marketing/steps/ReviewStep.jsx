'use client';

import React, { useState } from 'react';
import {
  Send,
  Users,
  MessageSquare,
  Calendar as CalendarIcon,
  Edit2,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import WhatsAppPreview from '../WhatsAppPreview';

export default function ReviewStep({ data, onEditStep, onLaunch, onBack, isLaunching }) {
  const [confirmedPolicy, setConfirmedPolicy] = useState(true);
  const [viewMode, setViewMode] = useState('whatsapp');
  const [error, setError] = useState('');

  const handleConfirmLaunch = () => {
    if (!confirmedPolicy) {
      setError('Please accept WhatsApp Business Policy confirmation before launching.');
      return;
    }
    setError('');
    onLaunch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          Review Your Campaign
        </h3>
        <p className="text-xs text-[#8c88a6] mt-0.5">
          Please review all the details before launching your campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (7 cols): Summary Cards */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Campaign Details */}
          <div className="p-4 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#251f42]/70 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#814AC8]/20 flex items-center justify-center text-[#C49FE0]">
                  <Send size={14} />
                </div>
                <h4 className="text-xs font-semibold text-white">
                  Campaign Details
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(1)}
                className="text-xs text-[#814AC8] hover:text-[#a772eb] font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className="text-[#8c88a6]">Campaign Name</span>
              <span className="text-white font-medium text-right sm:text-left">{data.name || 'Untitled Campaign'}</span>

              <span className="text-[#8c88a6]">Campaign Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.type || 'Promotional'}</span>

              <span className="text-[#8c88a6]">WhatsApp Number</span>
              <span className="text-white font-medium text-right sm:text-left">{data.whatsappNumber || 'Not configured'}</span>

              <span className="text-[#8c88a6]">Campaign Goal</span>
              <span className="text-white font-medium text-right sm:text-left">{data.goal || 'General Announcements'}</span>
            </div>
          </div>

          {/* Card 2: Audience */}
          <div className="p-4 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#251f42]/70 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Users size={14} />
                </div>
                <h4 className="text-xs font-semibold text-white">
                  Audience
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="text-xs text-[#814AC8] hover:text-[#a772eb] font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className="text-[#8c88a6]">Audience Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.audienceType || 'Existing Contacts'}</span>

              <span className="text-[#8c88a6]">Contact List</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.audienceListName || 'Custom Audience'} ({(data.recipientsCount || 0).toLocaleString()} contacts)
              </span>

              <span className="text-[#8c88a6]">Valid Numbers</span>
              <span className="text-emerald-400 font-medium text-right sm:text-left">
                {(data.validRecipients || 0).toLocaleString()} ({data.recipientsCount > 0 ? ((data.validRecipients / data.recipientsCount) * 100).toFixed(1) : '0.0'}%)
              </span>

              <span className="text-[#8c88a6]">Invalid / Opted-out</span>
              <span className="text-amber-400 font-medium text-right sm:text-left">
                {(data.invalidRecipients || 0).toLocaleString()} ({data.recipientsCount > 0 ? ((data.invalidRecipients / data.recipientsCount) * 100).toFixed(1) : '0.0'}%)
              </span>

              <span className="text-[#8c88a6]">Estimated Cost</span>
              <span className="text-emerald-400 font-semibold text-right sm:text-left">
                {data.estimatedCost ? `₹${Number(data.estimatedCost).toFixed(2)}` : `~ ${(data.validRecipients || 0).toLocaleString()} messages`}
              </span>
            </div>
          </div>

          {/* Card 3: Message */}
          <div className="p-4 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#251f42]/70 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-[#C49FE0]">
                  <MessageSquare size={14} />
                </div>
                <h4 className="text-xs font-semibold text-white">
                  Template
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(3)}
                className="text-xs text-[#814AC8] hover:text-[#a772eb] font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className="text-[#8c88a6]">Content Type</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.templateName ? `Template (${data.templateName})` : 'Template Message'}
              </span>

              <span className="text-[#8c88a6]">Message Preview</span>
              <span className="text-[#D4D4D4] font-medium text-right sm:text-left truncate max-w-[220px]">
                {data.messageBody?.slice(0, 45) ? data.messageBody.slice(0, 45) + (data.messageBody.length > 45 ? '...' : '') : 'No message content'}
              </span>

              <span className="text-[#8c88a6]">Media</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.mediaUrl ? (data.mediaName || '1 attachment') : 'None'}
              </span>

              <span className="text-[#8c88a6]">Variables</span>
              <span className="text-[#C49FE0] text-[11px] text-right sm:text-left">
                {data.messageBody ? ([...new Set(data.messageBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [])].join(', ') || 'None') : 'None'}
              </span>
            </div>
          </div>

          {/* Card 4: Schedule */}
          <div className="p-4 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#251f42]/70 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                  <CalendarIcon size={14} />
                </div>
                <h4 className="text-xs font-semibold text-white">
                  Schedule
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(4)}
                className="text-xs text-[#814AC8] hover:text-[#a772eb] font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className="text-[#8c88a6]">Send Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.sendType || 'Send Now'}</span>

              <span className="text-[#8c88a6]">Date & Time</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.sendType === 'Send Now' ? 'Immediate dispatch upon launch' : `${data.scheduleDate || 'Today'} at ${data.scheduleTime || '10:00 AM'} (IST)`}
              </span>

              <span className="text-[#8c88a6]">Timezone</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.timezone || 'Asia/Kolkata (IST)'}
              </span>

              <span className="text-[#8c88a6]">Sending Preferences</span>
              <span className="text-white font-medium text-right sm:text-left">
                {(() => {
                  const prefs = [];
                  if (data.sendGradually) {
                    prefs.push(`Gradual (${data.sendingRate || 100}/min)`);
                  } else {
                    prefs.push('Immediate blast');
                  }
                  if (data.skipInvalid) {
                    prefs.push('Skip invalid');
                  } else {
                    prefs.push('Attempt all');
                  }
                  if (data.stopOnFailure) {
                    prefs.push('Circuit breaker (10%)');
                  }
                  if (data.quietHours) {
                    prefs.push('Quiet hours (10 PM - 8 AM)');
                  }
                  return prefs.join(', ');
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): WhatsApp Preview with View Switcher */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-white">
              Message Preview
            </span>

            <div className="px-2.5 py-1 rounded-lg bg-[#141228] border border-[#2d2650] text-[11px] text-[#C49FE0] flex items-center gap-1 cursor-pointer">
              <span>WhatsApp View</span>
              <ChevronDown size={12} />
            </div>
          </div>

          <WhatsAppPreview
            businessName={data.name || 'Your Business'}
            messageText={data.messageBody}
            mediaUrl={data.mediaUrl}
          />
        </div>
      </div>

      {/* Confirmation & Bottom Action Bar */}
      <div className="pt-5 border-t border-[#251f42] space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#141026] border border-purple-500/20">
          <input
            type="checkbox"
            id="policy-agree"
            checked={confirmedPolicy}
            onChange={(e) => {
              setConfirmedPolicy(e.target.checked);
              if (error) setError('');
            }}
            className="w-4 h-4 mt-0.5 rounded bg-[#1a1636] border-[#382f61] text-[#814AC8] accent-[#814AC8] cursor-pointer"
          />
          <label htmlFor="policy-agree" className="text-xs text-[#a8a3c2] cursor-pointer select-none">
            I confirm that this campaign complies with{' '}
            <span className="text-[#814AC8] underline font-medium">WhatsApp&apos;s Business Policy</span> and guidelines.
          </label>
        </div>

        {data.isBalanceSufficient === false && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-400 shrink-0" />
            <span>
              Notice: Your current WCC wallet available balance may be below the full escrow required for this campaign. Please ensure your wallet has sufficient funds.
            </span>
          </div>
        )}

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9da3ae] bg-[#121024] border border-[#251f42] hover:text-white hover:border-[#3d3363] transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleConfirmLaunch}
            disabled={isLaunching}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_25px_rgba(129,74,200,0.5)] hover:shadow-[0_0_30px_rgba(129,74,200,0.7)] flex items-center gap-2 transition-all disabled:opacity-60"
          >
            {isLaunching ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Launching Campaign...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Launch Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
