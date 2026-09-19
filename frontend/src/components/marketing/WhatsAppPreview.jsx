'use client';

import React from 'react';
import {
  Phone,
  MoreVertical,
  ChevronLeft,
  CheckCheck,
  Sparkles,
  Info,
  ExternalLink,
  ShoppingBag,
  Image as ImageIcon
} from 'lucide-react';

export default function WhatsAppPreview({
  businessName = 'Your Business',
  messageText = '',
  variables = {},
  mediaUrl = null,
  mediaName = 'Diwali Offer',
  timestamp = '10:30 AM',
  interactiveButtons = [],
  title = 'Message Preview',
  showInfo = true,
  viewMode = 'whatsapp'
}) {
  // Interpolate variables like {{name}} -> "Arjun", {{coupon_code}} -> "DIWALI50", etc.
  const renderInterpolatedText = () => {
    if (!messageText) {
      return (
        <div className="space-y-2">
          <p>Hi <span className="text-[#a78bfa] font-medium">Arjun</span>,</p>
          <p>✨ This Diwali, get up to <span className="font-semibold text-white">50% OFF</span> on our exclusive collection! 🎁</p>
          <p>Shop now and make this festive season brighter with OrbionAgents.</p>
          <p className="text-[#9da3ae] text-[10px]">Shop now: https://yourwebsite.com</p>
        </div>
      );
    }

    let result = messageText;
    const defaults = {
      name: 'Arjun',
      phone: '+91 98765 43210',
      email: 'arjun@example.com',
      coupon_code: 'DIWALI50',
      website: 'https://yourwebsite.com',
      company: 'OrbionAgents',
      ...variables
    };

    // Replace {{key}} or {{1}}, {{2}} with preview values
    Object.keys(defaults).forEach((k) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      result = result.replace(reg, defaults[k]);
    });
    result = result.replace(/\{\{\s*1\s*\}\}/g, defaults.name || 'Arjun');
    result = result.replace(/\{\{\s*2\s*\}\}/g, defaults.coupon_code || 'DIWALI50');
    result = result.replace(/\{\{\s*3\s*\}\}/g, defaults.website || 'https://yourwebsite.com');

    return (
      <div className="whitespace-pre-line text-[11px] leading-relaxed text-[#e5e7eb]">
        {result}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Phone Mockup Wrapper */}
      <div className="w-full max-w-[320px] sm:max-w-[340px] rounded-[32px] bg-[#090812] border-2 border-[#2b2447] shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300">
        {/* Status Bar */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between text-[11px] text-[#9ca3af] font-medium tracking-tight">
          <span>9:41</span>
          <div className="w-16 h-4 bg-black/80 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-4 h-2.5 border border-[#9ca3af] rounded-[2px] p-[1px]">
              <div className="h-full w-3/4 bg-[#9ca3af] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* WhatsApp App Header */}
        <div className="bg-[#121024] px-3.5 py-2.5 flex items-center justify-between border-b border-[#251f3d]">
          <div className="flex items-center gap-2">
            <ChevronLeft size={16} className="text-[#a5b4fc] shrink-0 cursor-pointer" />
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#814AC8] to-[#4338ca] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-[#121024]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-white tracking-tight">
                  {businessName}
                </span>
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#22c55e] text-black text-[9px] font-black">
                  ✓
                </span>
              </div>
              <span className="text-[9px] text-[#8c88a6] block">
                Business Account
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#a5b4fc]">
            <Phone size={14} className="cursor-pointer hover:text-white transition-colors" />
            <MoreVertical size={14} className="cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>

        {/* Chat Screen Canvas */}
        <div className="min-h-[300px] max-h-[360px] p-3.5 flex flex-col justify-between bg-[#080710] bg-[radial-gradient(#1e1a38_1px,transparent_1px)] [background-size:16px_16px] overflow-y-auto custom-scrollbar">
          {/* Date separator */}
          <div className="text-center my-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#18152e] text-[#8c88a6] text-[9px] font-medium border border-[#2b2447]">
              Today
            </span>
          </div>

          {/* WhatsApp Message Bubble */}
          <div className="max-w-[94%] bg-[#15122b] border border-[#2d2650] rounded-2xl rounded-tl-none p-3 shadow-md space-y-2 relative">
            {/* Optional Attached Media Card */}
            {(mediaUrl || mediaName) && (
              <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#200e3b] via-[#3c1361] to-[#1d0b38] border border-[#4d2f7a] p-3 text-center shadow-inner relative group">
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="text-[10px] uppercase tracking-widest text-[#facc15] font-bold">
                    Happy Diwali
                  </div>
                  <div className="text-base font-black text-white tracking-tight my-0.5">
                    FLAT 50% OFF
                  </div>
                  <button className="mt-1 px-3 py-0.5 bg-[#facc15] text-[#1c1917] rounded-md text-[10px] font-bold shadow hover:bg-yellow-400">
                    Shop Now
                  </button>
                </div>
              </div>
            )}

            {/* Interpolated Body Text */}
            {renderInterpolatedText()}

            {/* Timestamp and Read Status */}
            <div className="flex items-center justify-end gap-1 text-[9px] text-[#8c88a6] pt-1">
              <span>{timestamp}</span>
              <CheckCheck size={12} className="text-[#38bdf8]" />
            </div>
          </div>
        </div>

        {/* WhatsApp Mobile Input Footer Bar */}
        <div className="bg-[#121024] px-3 py-2 border-t border-[#251f3d] flex items-center gap-2">
          <div className="flex-1 bg-[#1a1636] rounded-full px-3 py-1.5 text-[10px] text-[#6d688c]">
            Message...
          </div>
          <div className="w-6 h-6 rounded-full bg-[#814AC8] flex items-center justify-center text-white text-xs">
            ➤
          </div>
        </div>
      </div>
    </div>
  );
}
