'use client';

import React, { useState, useEffect } from 'react';
import { Send, FileText, MessageSquare, ChevronDown, Check, Sparkles, MessageCircle, ShieldCheck } from 'lucide-react';
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
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [tierInfo, setTierInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getTierInfo(workspaceId).then((info) => {
      if (isMounted && info) {
        setTierInfo(info);
        if (info.display_phone) {
          const connected = {
            id: info.phone_number_id || 'primary_num',
            name: info.is_connected ? 'Meta Business Connected' : 'Business Line',
            phone: info.display_phone,
            verified: info.is_connected ?? true,
          };
          setPhoneNumbers([connected]);
          if (!data.whatsappNumber) {
            updateData({
              whatsappNumber: info.display_phone,
              phoneNumberId: info.phone_number_id || 'primary_num',
            });
          }
        }
      }
    });
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Column: Form Fields */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Campaign Details
          </h3>
          <p className="text-xs text-[#8c88a6] mt-0.5">
            Give your campaign a name and select the WhatsApp number.
          </p>
        </div>

        {/* 1. Campaign Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#D4D4D4]">
              Campaign Name <span className="text-[#814AC8]">*</span>
            </label>
            <span className="text-[11px] text-[#6d688c]">
              {(data.name || '').length}/100
            </span>
          </div>

          <input
            type="text"
            maxLength={100}
            value={data.name || ''}
            onChange={(e) => {
              updateData({ name: e.target.value });
              if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
            }}
            placeholder="e.g. Summer Promo 2026, New Feature Announcement..."
            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0f0e1c] border text-xs sm:text-sm text-white placeholder-[#585375] outline-none transition-all duration-200 focus:border-[#814AC8] focus:ring-1 focus:ring-[#814AC8]/50 ${
              errors.name ? 'border-rose-500/70' : 'border-[#251f42]'
            }`}
          />
          {errors.name && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>
          )}
        </div>

        {/* 2. Campaign Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#D4D4D4] block">
            Campaign Type
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = data.type === type.id;

              return (
                <div
                  key={type.id}
                  onClick={() => updateData({ type: type.id })}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none ${
                    isSelected
                      ? 'bg-[#1a0f2e] border-[#814AC8] shadow-[0_0_16px_rgba(129,74,200,0.25)]'
                      : 'bg-[#0f0e1c] border-[#251f42] hover:border-[#382f61] hover:bg-[#141226]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#814AC8] text-white'
                          : 'bg-[#1a1636] text-[#8c88a6]'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#814AC8] flex items-center justify-center text-white text-[10px]">
                        ✓
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      {type.title}
                    </h4>
                    <p className="text-[10px] text-[#7f7a9c] mt-0.5 leading-snug">
                      {type.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. WhatsApp Number Dropdown / Input */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#D4D4D4] block">
              WhatsApp Number <span className="text-[#814AC8]">*</span>
            </label>
            {selectedPhone && selectedPhone.verified && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck size={12} /> Connected
              </span>
            )}
          </div>

          {phoneNumbers.length > 0 ? (
            <div className="relative">
              <div
                onClick={() => setIsPhoneOpen(!isPhoneOpen)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
                    <MessageCircle size={14} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-white block leading-tight">
                      {selectedPhone?.name || 'Primary WhatsApp Line'}
                    </span>
                    <span className="text-[11px] text-[#8c88a6]">
                      {selectedPhone?.phone || data.whatsappNumber}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-[#8c88a6] transition-transform ${isPhoneOpen ? 'rotate-180' : ''}`} />
              </div>

              {isPhoneOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  {phoneNumbers.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        updateData({ whatsappNumber: n.phone, phoneNumberId: n.id });
                        setIsPhoneOpen(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        data.whatsappNumber === n.phone
                          ? 'bg-[#814AC8]/20 text-white'
                          : 'hover:bg-[#1a1638] text-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <div>
                          <span className="text-xs font-medium block">{n.name}</span>
                          <span className="text-[10px] text-[#8c88a6]">{n.phone}</span>
                        </div>
                      </div>
                      {data.whatsappNumber === n.phone && (
                        <Check size={14} className="text-[#814AC8]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#141026] border border-[#2d244d] flex items-start gap-2.5">
                <MessageCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="text-amber-300 font-medium">No Meta WhatsApp API number connected</p>
                  <p className="text-[#8c88a6] text-[11px]">
                    Connect your official WhatsApp Business number in Channels or enter your sender phone below.
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={data.whatsappNumber || ''}
                onChange={(e) => {
                  updateData({ whatsappNumber: e.target.value, phoneNumberId: e.target.value });
                  if (errors.whatsappNumber) setErrors((prev) => ({ ...prev, whatsappNumber: null }));
                }}
                placeholder="e.g. +91 98401 23456"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0f0e1c] border text-xs sm:text-sm text-white placeholder-[#585375] outline-none transition-all duration-200 focus:border-[#814AC8] focus:ring-1 focus:ring-[#814AC8]/50 ${
                  errors.whatsappNumber ? 'border-rose-500/70' : 'border-[#251f42]'
                }`}
              />
            </div>
          )}
          {errors.whatsappNumber && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.whatsappNumber}</p>
          )}
        </div>

        {/* 4. Campaign Goal (Optional) */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-medium text-[#D4D4D4] block">
            Campaign Goal (Optional)
          </label>

          <div
            onClick={() => setIsGoalOpen(!isGoalOpen)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0e1c] border border-[#251f42] hover:border-[#382f61] flex items-center justify-between cursor-pointer transition-all"
          >
            <span className="text-xs text-white">
              {data.goal || 'Increase sales'}
            </span>
            <ChevronDown size={16} className={`text-[#8c88a6] transition-transform ${isGoalOpen ? 'rotate-180' : ''}`} />
          </div>

          {isGoalOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {CAMPAIGN_GOALS.map((goal) => (
                <div
                  key={goal}
                  onClick={() => {
                    updateData({ goal });
                    setIsGoalOpen(false);
                  }}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                    data.goal === goal
                      ? 'bg-[#814AC8]/20 text-white font-medium'
                      : 'hover:bg-[#1a1638] text-[#D4D4D4]'
                  }`}
                >
                  {goal}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#251f42]/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9da3ae] bg-[#121024] border border-[#251f42] hover:text-white hover:border-[#3d3363] transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={validateAndProceed}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] flex items-center gap-1.5 transition-all"
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Right Column: Quick Tips & WhatsApp Preview */}
      <div className="lg:col-span-5 space-y-4">
        <QuickTips
          tips={[
            'Use a clear and relevant campaign name',
            'Choose the right campaign type',
            'Make sure you have added recipients in the next step',
          ]}
        />

        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8c88a6] px-1">
            Message Preview
          </div>
          <WhatsAppPreview
            businessName={data.name || 'Your Business'}
            messageText={data.messageBody}
            mediaUrl={data.mediaUrl}
          />
        </div>
      </div>
    </div>
  );
}
