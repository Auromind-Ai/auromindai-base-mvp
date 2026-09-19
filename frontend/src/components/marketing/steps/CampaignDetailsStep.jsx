'use client';

import React, { useState, useEffect } from 'react';
import { Send, FileText, MessageSquare, ChevronDown, Check } from 'lucide-react';
import QuickTips from '../QuickTips';
import WhatsAppPreview from '../WhatsAppPreview';
import { getTierInfo } from '@/lib/api/marketing';

const CAMPAIGN_TYPES = [
  {
    id: 'Promotional',
    title: 'Promotional',
    subtitle: 'Offers, updates, new products',
    icon: Send,
  },
  {
    id: 'Transactional',
    title: 'Transactional',
    subtitle: 'Order updates, confirmations',
    icon: FileText,
  },
  {
    id: 'Customer Support',
    title: 'Customer Support',
    subtitle: 'Follow-ups, reminders',
    icon: MessageSquare,
  },
];

const CAMPAIGN_GOALS = [
  'Increase sales',
  'Re-engage customers',
  'Promote new feature',
  'Event invitation',
  'Customer feedback & NPS',
];

export default function CampaignDetailsStep({ data, updateData, onNext, onCancel, workspaceId }) {
  const [errors, setErrors] = useState({});
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState([
    {
      id: 'primary_number',
      name: 'Business Number (Primary)',
      phone: '+91 98765 43210',
      verified: true,
    }
  ]);

  useEffect(() => {
    let isMounted = true;
    getTierInfo(workspaceId).then((info) => {
      if (isMounted && info && info.display_phone) {
        const connected = {
          id: info.phone_number_id || 'primary_number',
          name: info.is_connected ? 'Business Number (Primary)' : 'Business Line',
          phone: info.display_phone || '+91 98765 43210',
          verified: true,
        };
        setPhoneNumbers([connected]);
        if (!data.whatsappNumber) {
          updateData({
            whatsappNumber: connected.phone,
            phoneNumberId: connected.id,
          });
        }
      }
    });

    if (!data.whatsappNumber) {
      updateData({
        whatsappNumber: '+91 98765 43210',
        phoneNumberId: 'primary_number',
      });
    }

    if (!data.goal) {
      updateData({ goal: 'Increase sales' });
    }

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const validateAndProceed = () => {
    const errs = {};
    if (!data.name || !data.name.trim()) {
      errs.name = 'Campaign name is required';
    }
    if (!data.type) {
      errs.type = 'Please select a campaign type';
    }
    if (!data.whatsappNumber) {
      errs.whatsappNumber = 'WhatsApp number is required';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onNext();
  };

  const selectedPhone = phoneNumbers.find((n) => n.phone === data.whatsappNumber) || phoneNumbers[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
      {/* Left Column: Form Fields */}
      <div className="lg:col-span-7 xl:col-span-7 space-y-5">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            Campaign Details
          </h3>
          <p className="text-xs sm:text-sm text-[#8c94a6] mt-0.5">
            Give your campaign a name and select the WhatsApp number.
          </p>
        </div>

        {/* 1. Campaign Name */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
            Campaign Name <span className="text-rose-500">*</span>
          </label>

          <input
            type="text"
            maxLength={100}
            value={data.name || ''}
            onChange={(e) => {
              updateData({ name: e.target.value });
              if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
            }}
            placeholder="Diwali Offer 2025"
            className={`w-full px-4 py-3 rounded-xl bg-[#080a12] border text-xs sm:text-sm text-white placeholder-[#586174] outline-none transition-all duration-200 focus:border-[#635BFF] ${
              errors.name ? 'border-rose-500/70' : 'border-[#1b2238]'
            }`}
          />
          <div className="flex items-center justify-between text-[11px] sm:text-xs mt-1">
            {errors.name ? (
              <span className="text-rose-400">{errors.name}</span>
            ) : <span />}
            <span className="text-[#6b768c]">
              {(data.name || '').length}/100
            </span>
          </div>
        </div>

        {/* 2. Campaign Type */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
            Campaign Type
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = (data.type || 'Promotional') === type.id;

              return (
                <div
                  key={type.id}
                  onClick={() => updateData({ type: type.id })}
                  className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between select-none min-h-[96px] ${
                    isSelected
                      ? 'bg-[#16132d] border-[#635BFF] shadow-[0_0_14px_rgba(99,91,255,0.22)]'
                      : 'bg-[#0a0d17] border-[#1b2238] hover:border-[#283250]'
                  }`}
                >
                  <div className="mb-3">
                    <Icon
                      size={17}
                      className={isSelected ? 'text-[#a78bfa]' : 'text-[#8c94a6]'}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-white leading-tight">
                      {type.title}
                    </h4>
                    <p className={`text-[11px] sm:text-xs mt-1 leading-tight ${isSelected ? 'text-[#8c94a6]' : 'text-[#6b768c]'}`}>
                      {type.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. WhatsApp Number Dropdown */}
        <div className="space-y-1.5 relative">
          <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
            WhatsApp Number <span className="text-rose-500">*</span>
          </label>

          <div className="relative">
            <div
              onClick={() => setIsPhoneOpen(!isPhoneOpen)}
              className="w-full px-4 py-3 rounded-xl bg-[#080a12] border border-[#1b2238] hover:border-[#283250] flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#128C7E]/20 flex items-center justify-center text-[#25D366] shrink-0">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.9 11.9 0 0 0 5.86 1.52h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.21-3.52-8.44zm-8.46 17.86h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.92 9.92 0 0 1-1.52-5.23c0-5.48 4.46-9.94 9.94-9.94 2.65 0 5.15 1.03 7.02 2.9 1.88 1.88 2.91 4.37 2.91 7.03 0 5.48-4.46 9.95-9.95 9.95zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.52.07-.79.37-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-semibold text-white block leading-tight">
                    {selectedPhone?.name || 'Business Number (Primary)'}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#8c94a6]">
                    {selectedPhone?.phone || '+91 98765 43210'}
                  </span>
                </div>
              </div>
              <ChevronDown size={15} className={`text-[#8c94a6] transition-transform ${isPhoneOpen ? 'rotate-180' : ''}`} />
            </div>

            {isPhoneOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0f1322] border border-[#1e2740] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150">
                {phoneNumbers.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      updateData({ whatsappNumber: n.phone, phoneNumberId: n.id });
                      setIsPhoneOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      data.whatsappNumber === n.phone
                        ? 'bg-[#635BFF]/20 text-white'
                        : 'hover:bg-[#181f33] text-white/80'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-medium block">{n.name}</span>
                      <span className="text-[10px] text-[#8c94a6]">{n.phone}</span>
                    </div>
                    {data.whatsappNumber === n.phone && (
                      <Check size={14} className="text-[#635BFF]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Campaign Goal (Optional) */}
        <div className="space-y-1.5 relative">
          <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
            Campaign Goal (Optional)
          </label>

          <div
            onClick={() => setIsGoalOpen(!isGoalOpen)}
            className="w-full px-4 py-3 rounded-xl bg-[#080a12] border border-[#1b2238] hover:border-[#283250] flex items-center justify-between cursor-pointer transition-all"
          >
            <span className="text-xs sm:text-sm text-white">
              {data.goal || 'Increase sales'}
            </span>
            <ChevronDown size={15} className={`text-[#8c94a6] transition-transform ${isGoalOpen ? 'rotate-180' : ''}`} />
          </div>

          {isGoalOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0f1322] border border-[#1e2740] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150">
              {CAMPAIGN_GOALS.map((goal) => (
                <div
                  key={goal}
                  onClick={() => {
                    updateData({ goal });
                    setIsGoalOpen(false);
                  }}
                  className={`px-3.5 py-2.5 text-xs sm:text-sm rounded-lg cursor-pointer transition-colors ${
                    data.goal === goal
                      ? 'bg-[#635BFF]/20 text-white font-medium'
                      : 'hover:bg-[#181f33] text-white/80'
                  }`}
                >
                  {goal}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Quick Tips & WhatsApp Preview */}
      <div className="lg:col-span-5 xl:col-span-5 space-y-4">
        <QuickTips
          tips={[
            'Use a clear and relevant campaign name',
            'Choose the right campaign type',
            'Make sure you have added recipients in the next step',
          ]}
        />

        <div className="space-y-2 pt-1">
          <div className="text-xs sm:text-sm font-semibold text-white px-0.5">
            Message Preview
          </div>
          <WhatsAppPreview
            businessName={data.name || 'Your Business'}
            messageText={data.messageBody}
            mediaUrl={data.mediaUrl}
          />
        </div>
      </div>

      {/* Bottom Full-Width Action Buttons */}
      <div className="col-span-12 pt-6 mt-4 border-t border-[#1b2238] flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white/80 bg-[#101424] border border-[#1e263c] hover:bg-[#181e34] hover:text-white transition-all"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={validateAndProceed}
          className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#635BFF] hover:bg-[#5248e8] shadow-[0_0_18px_rgba(99,91,255,0.4)] flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
