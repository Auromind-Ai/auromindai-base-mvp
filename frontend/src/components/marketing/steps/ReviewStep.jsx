'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Users,
  MessageSquare,
  Calendar as CalendarIcon,
  Edit2,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  ChevronDown,
  AlertTriangle,
  Info,
  Coins,
  ArrowRight
} from 'lucide-react';
import WhatsAppPreview from '../WhatsAppPreview';
import { isFutureSchedule } from '@/lib/campaignScheduleUtils';

export default function ReviewStep({ data, onEditStep, onLaunch, onBack, isLaunching }) {
  const router = useRouter();
  const [confirmedPolicy, setConfirmedPolicy] = useState(false);
  const [viewMode, setViewMode] = useState('whatsapp');
  const [error, setError] = useState('');

  const isScheduleValid = data.sendType !== 'Schedule for Later' || isFutureSchedule(data.scheduleDate, data.scheduleTime);

  const previewMessage = React.useMemo(() => {
    let text = data.messageBody || '';
    const sampleRecipient = (data?.recipients && data.recipients.length > 0) ? data.recipients[0] : null;

    if (data.variableMapping && typeof data.variableMapping === 'object') {
      Object.entries(data.variableMapping).forEach(([k, v]) => {
        const tag = `{{${k}}}`;
        let sample = tag;
        if (v?.source === 'custom') {
          sample = v.customValue || `[Value ${k}]`;
        } else {
          const colName = v?.source;
          if (sampleRecipient) {
            sample =
              sampleRecipient?.variables?.[colName] ||
              sampleRecipient?.variables?.[colName?.toLowerCase()] ||
              sampleRecipient?.[colName] ||
              (colName?.toLowerCase().includes('name') ? (sampleRecipient?.recipient_name || sampleRecipient?.name) : null) ||
              (colName?.toLowerCase().includes('phone') ? (sampleRecipient?.phone_number || sampleRecipient?.phone) : null) ||
              `[${colName}]`;
          } else {
            sample = `[${colName}]`;
          }
        }
        text = text.split(tag).join(sample);
      });
    }
    return text;
  }, [data.messageBody, data.variableMapping, data.recipients]);

  const handleConfirmLaunch = () => {
    if (!isScheduleValid) {
      setError('The scheduled date and time is in the past. Please click "Edit" on Schedule to select a future time.');
      return;
    }
    if (!confirmedPolicy) {
      setError('Please accept WhatsApp Business Policy confirmation before launching.');
      return;
    }
    if (data.isBalanceSufficient === false) {
      setError('Upgrade Required: Your current WCC wallet available balance is below the required escrow. Please recharge your WhatsApp credits to launch.');
      return;
    }
    setError('');
    onLaunch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">
          Review Your Campaign
        </h3>
        <p className="text-xs sm:text-sm text-white/70 mt-1 font-normal">
          Please review all the details before launching your campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (5 cols): WhatsApp Preview (Non-scrolling / Sticky) */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-0 self-start space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs sm:text-sm font-medium text-white">
              Message Preview
            </span>
          </div>

          <WhatsAppPreview
            businessName={data.name || 'Your Business'}
            messageText={previewMessage}
            mediaUrl={data.mediaUrl}
            mediaName={data.mediaName}
            buttons={data.templateButtons || data.buttons || []}
            headerText={data.headerText}
            footerText={data.footerText}
          />
        </div>

        {/* Right Column (7 cols): Summary Cards (Scrollable) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Card 1: Campaign Details */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0a0d17] border border-[#1b2238] hover:border-[#283250] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2238] mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#2c144e] flex items-center justify-center text-white">
                  <Send size={15} />
                </div>
                <h4 className="text-sm sm:text-base font-medium text-white">
                  Campaign Details
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(1)}
                className="text-xs sm:text-sm text-[#C49FE0] hover:text-white font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-xs sm:text-sm">
              <span className="text-white/70 font-normal">Campaign Name</span>
              <span className="text-white font-medium text-right sm:text-left">{data.name || 'Untitled Campaign'}</span>

              <span className="text-white/70 font-normal">Campaign Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.type || 'Promotional'}</span>

              <span className="text-white/70 font-normal">WhatsApp Number</span>
              <span className="text-white font-medium text-right sm:text-left">{data.whatsappNumber || 'Not configured'}</span>

              <span className="text-white/70 font-normal">Campaign Goal</span>
              <span className="text-white font-medium text-right sm:text-left">{data.goal || 'General Announcements'}</span>
            </div>
          </div>

          {/* Card 2: Audience */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0a0d17] border border-[#1b2238] hover:border-[#283250] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2238] mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#073824] flex items-center justify-center text-white">
                  <Users size={15} />
                </div>
                <h4 className="text-sm sm:text-base font-medium text-white">
                  Audience
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="text-xs sm:text-sm text-[#C49FE0] hover:text-white font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-xs sm:text-sm pb-4 border-b border-[#1b2238]">
              <span className="text-white/70 font-normal">Audience Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.audienceType || 'Existing Contacts'}</span>

              <span className="text-white/70 font-normal">Contact List</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.audienceListName || 'Custom Audience'} ({(data.recipientsCount || 0).toLocaleString()} contacts)
              </span>

              <span className="text-white/70 font-normal">Valid Numbers</span>
              <span className="text-emerald-400 font-medium text-right sm:text-left">
                {(data.validRecipients || 0).toLocaleString()} ({data.recipientsCount > 0 ? ((data.validRecipients / data.recipientsCount) * 100).toFixed(1) : '0.0'}%)
              </span>

              <span className="text-white/70 font-normal">Invalid / Opted-out</span>
              <span className="text-amber-300 font-medium text-right sm:text-left">
                {(data.invalidRecipients || 0).toLocaleString()} ({data.recipientsCount > 0 ? ((data.invalidRecipients / data.recipientsCount) * 100).toFixed(1) : '0.0'}%)
              </span>
            </div>

            {/* Estimated Cost Section */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5">
                  Estimated Cost <Info size={13} className="text-white/90" />
                </span>
                <span className="text-xs text-white/70 font-normal">
                  ₹{Number(data.ratePerMessage || 1.25).toFixed(2)} / msg
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#080a12] border border-[#1b2238]">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#25D366]/20 flex items-center justify-center text-white shrink-0">
                    <MessageSquare size={13} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white">
                    ~ {(data.validRecipients ?? 3).toLocaleString()} messages
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {data.estimatedCost !== undefined && data.estimatedCost !== null
                    ? `₹${Number(data.estimatedCost).toFixed(2)}`
                    : `₹${((data.validRecipients ?? 3) * (data.ratePerMessage || 1.25)).toFixed(2)}`}
                </span>
              </div>

              {/* Meta 24h Quota */}
              <div className="flex items-center justify-between text-xs text-white/70 px-1 pt-1 font-normal">
                <span>Meta 24h Quota:</span>
                {data.isWhatsAppConnected === false ? (
                  <span className="text-[#814AC8] font-medium">
                    0 remaining (Not Connected)
                  </span>
                ) : data.portfolioRemainingToday !== null && data.portfolioRemainingToday !== undefined ? (
                  <span className="text-white/80 font-medium">
                    {Number(data.portfolioRemainingToday).toLocaleString()} remaining
                  </span>
                ) : (
                  <span className="text-white/80 font-medium">
                    9,996 remaining
                  </span>
                )}
              </div>

              {/* Settlement note */}
              <p className="text-xs text-[#a1a1aa] leading-relaxed pt-1 font-normal">
                Final cost settled atomically upon Meta delivery receipt. Unused escrow is refunded instantly.
              </p>
            </div>
          </div>

          {/* Card 3: Message */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0a0d17] border border-[#1b2238] hover:border-[#283250] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2238] mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#2c144e] flex items-center justify-center text-white">
                  <MessageSquare size={15} />
                </div>
                <h4 className="text-sm sm:text-base font-medium text-white">
                  Template
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(3)}
                className="text-xs sm:text-sm text-[#C49FE0] hover:text-white font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-xs sm:text-sm">
              <span className="text-white/70 font-normal">Content Type</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.templateName ? `Template (${data.templateName})` : 'Template Message'}
              </span>

              <span className="text-white/70 font-normal">Message Preview</span>
              <span className="text-white font-medium text-right sm:text-left truncate max-w-[220px]">
                {data.messageBody?.slice(0, 45) ? data.messageBody.slice(0, 45) + (data.messageBody.length > 45 ? '...' : '') : 'No message content'}
              </span>

              <span className="text-white/70 font-normal">Media</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.mediaUrl ? (data.mediaName || '1 attachment') : 'None'}
              </span>

              <span className="text-[#8c88a6]">Variables Mapped</span>
              <span className="text-[#C49FE0] text-[11px] text-right sm:text-left font-medium">
                {data.variableMapping && Object.keys(data.variableMapping).length > 0
                  ? Object.entries(data.variableMapping)
                      .map(([k, v]) => `{{${k}}} → ${v?.source === 'custom' ? (v?.customValue ? `"${v.customValue}"` : 'Custom Text') : v?.source}`)
                      .join(', ')
                  : (data.messageBody ? ([...new Set(data.messageBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [])].join(', ') || 'None') : 'None')}
              </span>
            </div>
          </div>

          {/* Card 4: Schedule */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0a0d17] border border-[#1b2238] hover:border-[#283250] transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2238] mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#2c144e] flex items-center justify-center text-white">
                  <CalendarIcon size={15} />
                </div>
                <h4 className="text-sm sm:text-base font-medium text-white">
                  Schedule
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(4)}
                className="text-xs sm:text-sm text-[#C49FE0] hover:text-white font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-xs sm:text-sm">
              <span className="text-white/70 font-normal">Send Type</span>
              <span className="text-white font-medium text-right sm:text-left">{data.sendType || 'Send Now'}</span>

              <span className="text-[#8c88a6]">Date & Time</span>
              <span className={`font-medium text-right sm:text-left ${!isScheduleValid ? 'text-rose-400' : 'text-white'}`}>
                {data.sendType === 'Send Now'
                  ? 'Immediate dispatch upon launch'
                  : isScheduleValid
                  ? `${data.scheduleDate || 'Today'} at ${data.scheduleTime || '10:00 AM'} (IST)`
                  : `${data.scheduleDate} at ${data.scheduleTime} (Past time - Click Edit to fix)`}
              </span>

              <span className="text-white/70 font-normal">Timezone</span>
              <span className="text-white font-medium text-right sm:text-left">
                {data.timezone || 'Asia/Kolkata (IST)'}
              </span>

              <span className="text-white/70 font-normal">Sending Preferences</span>
              <span className="text-white font-medium text-right sm:text-left leading-relaxed">
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
      </div>

      {/* Confirmation & Bottom Action Bar */}
      <div className="pt-6 border-t border-[#1b2238] space-y-4">
        <div className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-[#0a0d17] border transition-all ${
          error && !confirmedPolicy ? 'border-rose-500/50 bg-rose-950/10' : 'border-[#814AC8]/25'
        }`}>
          <input
            type="checkbox"
            id="policy-agree"
            checked={confirmedPolicy}
            onChange={(e) => {
              setConfirmedPolicy(e.target.checked);
              if (error) setError('');
            }}
            className="w-4 h-4 mt-0.5 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
          />
          <label htmlFor="policy-agree" className="text-xs sm:text-sm text-[#e4e4e7] select-none font-normal leading-relaxed">
            I confirm that this campaign complies with{' '}
            <a
              href="https://whatsappbusiness.com/policy/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#C49FE0] underline font-medium hover:text-white transition-colors"
            >
              WhatsApp&apos;s Business Policy
            </a>{' '}
            and guidelines.
          </label>
        </div>

        {data.isBalanceSufficient === false && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#2A0D14]/90 via-[#1e0a12]/80 to-[#0d0408] border border-rose-500/40 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-normal shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <AlertTriangle size={16} />
              </div>
              <div className="space-y-1">
                <div className="text-rose-300 font-semibold flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>Upgrade Required</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Insufficient Balance
                  </span>
                </div>
                <p className="text-white/80 text-xs leading-relaxed">
                  <span className="text-amber-400 font-medium">Notice:</span> Your current WCC wallet available balance may be below the full escrow required for this campaign. Please ensure your wallet has sufficient funds.
                  {data.shortfall > 0 && (
                    <span className="block mt-0.5 text-rose-300 font-medium">
                      Shortfall: ₹{Number(data.shortfall).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/user/admin/credits?tab=wcc')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-[0.98] self-start sm:self-center cursor-pointer"
            >
              <Coins size={14} />
              <span>Recharge WhatsApp Credits</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-400 font-medium flex items-center gap-2 animate-in fade-in duration-150">
            <AlertTriangle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white/80 bg-[#101424] border border-[#1e263c] hover:bg-[#181e34] hover:text-white transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleConfirmLaunch}
            disabled={isLaunching}
            className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.45)] hover:shadow-[0_0_28px_rgba(129,74,200,0.65)] flex items-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
          >
            {isLaunching ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Launching Campaign...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Launch Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
