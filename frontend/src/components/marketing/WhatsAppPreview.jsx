'use client';

import React from 'react';
import {
  Phone,
  MoreVertical,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

export default function WhatsAppPreview({
  businessName = 'Your Business',
  messageText = '',
  variables = {},
  mediaUrl = null,
  mediaName = 'Attachment',
  timestamp = '9:41 AM',
}) {
  const renderInterpolatedText = () => {
    if (!messageText || !messageText.trim()) {
      return (
        <div className="space-y-2 text-[11px] leading-relaxed text-white/90">
          <p>Hi {'{{name}}'},</p>
          <p>✨ This Diwali, get up to <span className="font-semibold text-white">50% OFF</span> on our exclusive collection! 🎁</p>
          <p>Shop now and make this festival brighter with OrbionAgents.</p>
        </div>
      );
    }

    let result = messageText;
    const defaults = {
      name: '{{name}}',
      phone: '+91 90000 00000',
      email: 'john@example.com',
      coupon_code: 'SAVE10',
      website: 'https://yourstore.com',
      company: 'Your Business',
      ...variables
    };

    Object.keys(defaults).forEach((k) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      result = result.replace(reg, defaults[k]);
    });

    return (
      <div className="whitespace-pre-line text-[11px] leading-relaxed text-white/90">
        {result}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col">
      {/* Phone Mockup Wrapper */}
      <div className="w-full rounded-[22px] bg-[#070912] border-2 border-[#1c233a] p-3 shadow-2xl overflow-hidden transition-all duration-200">
        {/* Status Bar */}
        <div className="px-2 pt-1 pb-2 flex items-center justify-between text-[10px] text-white/60 font-medium tracking-tight">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-2.5 fill-current text-white/60" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.53-.93C9.36 20.65 10.64 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
            </svg>
            <div className="w-4 h-2 border border-white/60 rounded-[2px] p-[1px]">
              <div className="h-full w-3/4 bg-white/80 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* WhatsApp App Header */}
        <div className="bg-[#0f1322] rounded-xl px-2.5 py-2 flex items-center justify-between border border-[#1b2238] mb-2.5">
          <div className="flex items-center gap-2">
            <ChevronLeft size={14} className="text-white/60 shrink-0 cursor-pointer" />
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-[#635BFF]/30 border border-[#635BFF]/40 flex items-center justify-center text-white text-xs font-bold">
                <Sparkles size={11} className="text-[#a78bfa]" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-white tracking-tight">
                  {businessName || 'Your Business'}
                </span>
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#22c55e] text-black text-[8px] font-black">
                  ✓
                </span>
              </div>
              <span className="text-[9px] text-[#8c94a6] block">
                Business Account
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-white/60">
            <Phone size={12} className="cursor-pointer hover:text-white" />
            <MoreVertical size={12} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Chat Screen Canvas */}
        <div className="p-2.5 flex flex-col justify-between bg-[#080a14] rounded-xl border border-[#151b2e] min-h-[170px]">
          {/* WhatsApp Message Bubble */}
          <div className="bg-[#131929] border border-[#1e2740] rounded-2xl rounded-tl-sm p-3.5 shadow-sm space-y-2 relative max-w-[95%]">
            {/* Body Text */}
            {renderInterpolatedText()}

            {/* Timestamp */}
            <div className="flex items-center justify-end text-[9px] text-[#717b96] pt-0.5">
              <span>{timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
