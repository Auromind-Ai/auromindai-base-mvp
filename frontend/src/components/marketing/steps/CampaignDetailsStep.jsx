'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, FileText, MessageSquare, ChevronDown, Check, MessageCircle, ShieldCheck } from 'lucide-react';
import QuickTips from '../QuickTips';
import { getTierInfo } from '@/lib/api/marketing';

// Authentic WhatsApp SVG Icon Component
function WhatsAppLogo({ className = 'w-6 h-6', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.9 11.9 0 0 0 5.86 1.52h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.21-3.52-8.44zm-8.46 17.86h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.92 9.92 0 0 1-1.52-5.23c0-5.48 4.46-9.94 9.94-9.94 2.65 0 5.15 1.03 7.02 2.9 1.88 1.88 2.91 4.37 2.91 7.03 0 5.48-4.46 9.95-9.95 9.95zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.52.07-.79.37-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z" />
    </svg>
  );
}

const CAMPAIGN_TYPES = [
  {
    id: 'Promotional',
    title: 'Promotional',
    subtitle: 'Offers, updates, new products',
    category: 'marketing',
    icon: Send,
  },
  {
    id: 'Transactional',
    title: 'Transactional',
    subtitle: 'Order updates, confirmations',
    category: 'utility',
    icon: FileText,
  },
  {
    id: 'Customer Support',
    title: 'Customer Support',
    subtitle: 'Follow-ups, reminders',
    category: 'utility',
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
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [tierInfo, setTierInfo] = useState(null);
  const [isLoadingPhone, setIsLoadingPhone] = useState(true);

  const goalDropdownRef = useRef(null);
  const phoneDropdownRef = useRef(null);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(event.target)) {
        setIsGoalOpen(false);
      }
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target)) {
        setIsPhoneOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getTierInfo(workspaceId).then((info) => {
      if (!isMounted) return;
      if (info) {
        setTierInfo(info);
        if (info.display_phone && info.is_connected) {
          const connected = {
            id: info.phone_number_id || 'primary_num',
            name: 'Meta Business Line',
            phone: info.display_phone,
            verified: true,
          };
          setPhoneNumbers([connected]);
          updateData({
            whatsappNumber: info.display_phone,
            phoneNumberId: info.phone_number_id || 'primary_num',
          });
        } else {
          setPhoneNumbers([]);
          updateData({ whatsappNumber: '', phoneNumberId: '' });
        }
      }
    }).finally(() => {
      if (isMounted) setIsLoadingPhone(false);
    });

    if (!data.goal) {
      updateData({ goal: 'Increase sales' });
    }

    return () => {
      isMounted = false;
    };
  }, [workspaceId, updateData]);

  const validateAndProceed = () => {
    const errs = {};
    if (!data.name || !data.name.trim()) {
      errs.name = 'Campaign name is required';
    }
    if (!data.type) {
      errs.type = 'Please select a campaign type';
    }
    if (!tierInfo?.is_connected || !data.whatsappNumber) {
      errs.whatsappNumber = 'WhatsApp Business channel is not connected. Please connect your official Meta WhatsApp line in Channels.';
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
            placeholder="e.g. Summer Sale 2026"
            className={`w-full px-4 py-3 rounded-xl bg-[#080a12] border text-xs sm:text-sm text-white placeholder-[#586174] outline-none transition-all duration-200 focus:border-[#814AC8] ${
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
                  onClick={() => updateData({ type: type.id, category: type.category })}
                  className={`p-3.5 sm:p-4 rounded-xl border border-white/[0.07] cursor-pointer transition-all duration-200 flex flex-col justify-between select-none min-h-[96px] ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white'
                      : 'bg-[#0d0e17] hover:border-white/20 text-[#8e95ab] hover:text-white'
                  }`}
                >
                  <div className="mb-3">
                    <Icon
                      size={17}
                      className={isSelected ? 'text-white' : 'text-white/60'}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-white leading-tight">
                      {type.title}
                    </h4>
                    <p className={`text-[11px] sm:text-xs mt-1 leading-tight ${isSelected ? 'text-white/80' : 'text-[#8e95ab]'}`}>
                      {type.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Campaign Goal (Optional) */}
        <div className="space-y-1.5 relative pt-2 sm:pt-3" ref={goalDropdownRef}>
          <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
            Campaign Goal (Optional)
          </label>

          <button
            type="button"
            onClick={() => setIsGoalOpen(!isGoalOpen)}
            className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#080a12] border flex items-center justify-between cursor-pointer transition-all duration-150 text-left outline-none ${
              isGoalOpen
                ? 'border-[#814AC8] shadow-[0_0_15px_rgba(129,74,200,0.25)] ring-1 ring-[#814AC8]/40'
                : 'border-[#1b2238] hover:border-[#2b344d]'
            }`}
          >
            <span className="text-xs sm:text-sm text-white font-normal truncate">
              {data.goal || 'Increase sales'}
            </span>
            <ChevronDown
              size={15}
              className={`text-[#8c94a6] shrink-0 transition-transform duration-200 ${
                isGoalOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {isGoalOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#0d101c]/95 backdrop-blur-xl border border-[#22283d] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1 space-y-0.5 max-h-[116px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
              {CAMPAIGN_GOALS.map((goal) => {
                const isSelected = (data.goal || 'Increase sales') === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => {
                      updateData({ goal });
                      setIsGoalOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg cursor-pointer flex items-center justify-between transition-all text-left ${
                      isSelected
                        ? 'bg-[#814AC8]/25 text-white font-medium border border-[#814AC8]/30 shadow-sm'
                        : 'text-white/80 hover:bg-[#161a2c] hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="truncate">{goal}</span>
                    {isSelected && (
                      <Check size={13} className="text-[#a78bfa] shrink-0 ml-2" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: WhatsApp Sender Number & Quick Tips */}
      <div className="lg:col-span-5 xl:col-span-5 space-y-4">
        {/* WhatsApp Sender Selection */}
        <div className="space-y-2 relative" ref={phoneDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-[#d1d5db] block">
              WhatsApp Sender Number <span className="text-[#814AC8]">*</span>
            </label>
            {tierInfo?.is_connected && selectedPhone && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck size={13} /> Connected &amp; Verified
              </span>
            )}
          </div>

          {isLoadingPhone ? (
            <div className="p-4 rounded-2xl bg-[#0a0c14] border border-[#161a28] flex items-center gap-3 text-xs text-[#8c88a6]">
              <div className="w-4 h-4 border-2 border-[#814AC8] border-t-transparent rounded-full animate-spin" />
              <span>Checking connected WhatsApp business lines...</span>
            </div>
          ) : tierInfo?.is_connected && phoneNumbers.length > 0 ? (
            <div className="relative">
              <div
                onClick={() => phoneNumbers.length > 1 && setIsPhoneOpen(!isPhoneOpen)}
                className={`w-full p-3 sm:p-3.5 rounded-2xl bg-[#0a0c14] border flex items-center justify-between transition-all ${
                  isPhoneOpen
                    ? 'border-[#814AC8] shadow-[0_0_15px_rgba(129,74,200,0.25)]'
                    : 'border-[#161a28] hover:border-[#814AC8]/50'
                } ${phoneNumbers.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#091a14] border border-[#14532d]/60 flex items-center justify-center text-[#25D366] shrink-0 shadow-[0_0_20px_rgba(37,211,102,0.25)]">
                    <WhatsAppLogo size={28} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-white block leading-tight truncate">
                      {selectedPhone?.name || 'Meta Business Connected'}
                    </span>
                    <span className="text-xs text-[#25D366] font-medium mt-0.5 block truncate">
                      {selectedPhone?.phone || data.whatsappNumber}
                    </span>
                  </div>
                </div>
                {phoneNumbers.length > 1 ? (
                  <ChevronDown
                    size={16}
                    className={`text-[#8c88a6] shrink-0 transition-transform duration-200 ${
                      isPhoneOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] border border-emerald-500/30 text-white shrink-0">
                    Active
                  </span>
                )}
              </div>

              {isPhoneOpen && phoneNumbers.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#121026] border border-[#2d2650] rounded-xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  {phoneNumbers.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        updateData({ whatsappNumber: n.phone, phoneNumberId: n.id });
                        setIsPhoneOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-left ${
                        data.whatsappNumber === n.phone
                          ? 'bg-[#814AC8]/20 text-white font-medium'
                          : 'hover:bg-[#1a1638] text-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#091a14] border border-[#14532d]/60 flex items-center justify-center text-[#25D366] shrink-0">
                          <WhatsAppLogo size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium block truncate">{n.name}</span>
                          <span className="text-[10px] text-[#8c88a6] block truncate">{n.phone}</span>
                        </div>
                      </div>
                      {data.whatsappNumber === n.phone && (
                        <Check size={14} className="text-[#814AC8] shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1A0B10] border border-white/10 space-y-3.5 shadow-lg">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#091a14] flex items-center justify-center text-[#25D366] shrink-0 shadow-[0_0_20px_rgba(37,211,102,0.25)]">
                  <WhatsAppLogo size={28} />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-rose-400 tracking-tight">
                    WhatsApp Business Channel Not Connected
                  </h4>
                  <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed font-normal">
                    Official Meta marketing campaigns can only be broadcast from a verified WhatsApp Business Account (WABA). Manual phone number entry is not allowed.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onCancel?.();
                    router.push('/user/admin/channels');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#814AC8] hover:bg-[#703db5] text-white text-xs sm:text-sm font-medium transition-all shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] cursor-pointer active:scale-[0.98]"
                >
                  <WhatsAppLogo size={15} className="text-white" />
                  <span>Connect WhatsApp</span>
                </button>
              </div>
            </div>
          )}
          {errors.whatsappNumber && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.whatsappNumber}</p>
          )}
        </div>

        <QuickTips
          tips={[
            'Use a clear and relevant campaign name',
            'Choose the right campaign type for your audience',
            'Ensure your WhatsApp Business Account is active and verified',
          ]}
        />
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
          disabled={!tierInfo?.is_connected}
          className={`px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white flex items-center gap-2 transition-all active:scale-[0.98] ${
            !tierInfo?.is_connected
              ? 'bg-[#814AC8]/40 text-white/50 cursor-not-allowed'
              : 'bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_18px_rgba(129,74,200,0.4)] cursor-pointer'
          }`}
          title={!tierInfo?.is_connected ? 'Please connect a WhatsApp channel first' : 'Next: Select Audience'}
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
