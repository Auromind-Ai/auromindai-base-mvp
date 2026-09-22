/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import {
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  Sparkles,
  Smile,
  Paperclip,
  Camera,
  Mic,
  CornerDownLeft,
  CheckCheck,
} from 'lucide-react';

export default function WhatsAppPreview({
  businessName = 'Your Business',
  messageText = '',
  variables = {},
  mediaUrl = null,
  mediaName = 'Attachment',
  timestamp = '9:41 AM',
  buttons = [],
  headerText = '',
  footerText = '',
}) {
  const renderInterpolatedText = () => {
    if (!messageText || !messageText.trim()) {
      return (
        <div className="space-y-2 text-[12.5px] leading-relaxed text-[#111b21]">
          <p>Hi {'{{name}}'},</p>
          <p>✨ Welcome to <span className="font-semibold text-[#111b21]">{businessName || 'our store'}</span>! Check out our latest deals and offers.</p>
          <p>Tap below to get started! 🎁</p>
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
      ...variables,
    };

    Object.keys(defaults).forEach((k) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      result = result.replace(reg, defaults[k]);
    });

    return (
      <div className="whitespace-pre-line text-[12.5px] sm:text-[13px] leading-relaxed text-[#111b21] break-words [overflow-wrap:anywhere]">
        {result}
      </div>
    );
  };

  return (
    <div className="w-full flex justify-center items-center">
      {/* Real Mobile Phone Frame */}
      <div className="relative w-full max-w-[310px] sm:max-w-[335px] rounded-[44px] bg-[#0c0d12] p-[9px] sm:p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1)] border-[3px] border-[#27272a]/70 select-none">
        
        {/* Inner Phone Screen */}
        <div className="relative w-full rounded-[36px] overflow-hidden bg-[#ECE5DD] flex flex-col shadow-inner border border-black/10">
          
          {/* Top Status Bar with Dynamic Island */}
          <div className="bg-[#005d4b] text-white pt-2.5 px-5 pb-1 flex items-center justify-between z-20 relative">
            <span className="text-[11px] font-semibold tracking-tight text-white/95">9:05</span>
            
            {/* Dynamic Island Capsule */}
            <div className="w-[82px] h-[18px] bg-black rounded-full shadow-inner flex items-center justify-end pr-2 gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#1a1a1a] border border-[#333]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0a2e1d]" />
            </div>

            {/* Status Icons */}
            <div className="flex items-center gap-1.5 text-white/90">
              {/* Signal bars */}
              <svg width="12" height="9" viewBox="0 0 17 12" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx="0.7" />
                <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.7" />
                <rect x="9" y="3" width="3" height="9" rx="0.7" />
                <rect x="13.5" y="0" width="3" height="12" rx="0.7" />
              </svg>
              {/* Wi-Fi */}
              <svg width="11" height="9" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4.24-2.83a6 6 0 018.48 0 .75.75 0 001.06-1.06 7.5 7.5 0 00-10.6 0 .75.75 0 001.06 1.06zm-2.12-2.12a9 9 0 0112.72 0 .75.75 0 001.06-1.06 10.5 10.5 0 00-14.84 0 .75.75 0 001.06 1.06z" />
              </svg>
              {/* Battery */}
              <div className="w-4.5 h-2.5 border border-white/80 rounded-[2.5px] p-[1px] flex items-center">
                <div className="h-full w-4/5 bg-white rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* Real WhatsApp Header Bar */}
          <div className="bg-[#005d4b] text-white px-3 py-2 flex items-center justify-between gap-1.5 shadow-sm z-10">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <ChevronLeft size={18} className="text-white shrink-0 -ml-1 cursor-pointer hover:opacity-80" />
              
              {/* Avatar with Online indicator */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] border border-white/20 flex items-center justify-center text-white shadow-sm">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25D366] ring-2 ring-[#005d4b]" />
              </div>

              {/* Business Name & Status */}
              <div className="min-w-0 flex-1 pl-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[12.5px] font-bold text-white truncate leading-tight">
                    {businessName || 'SunGlow'}
                  </span>
                  {/* Verified Green Badge */}
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#25D366] text-black text-[8px] font-black shrink-0">
                    ✓
                  </span>
                </div>
                <span className="text-[10px] text-white/85 font-normal block leading-tight mt-0.5">
                  Online
                </span>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-2.5 text-white/90 shrink-0 pr-0.5">
              <Video size={15} className="cursor-pointer hover:opacity-80" />
              <Phone size={14} className="cursor-pointer hover:opacity-80" />
              <MoreVertical size={15} className="cursor-pointer hover:opacity-80" />
            </div>
          </div>

          {/* WhatsApp Chat Canvas */}
          <div 
            className="flex-1 p-2.5 sm:p-3 flex flex-col justify-start min-h-[420px] max-h-[470px] overflow-y-auto custom-scrollbar relative"
            style={{
              backgroundColor: '#ECE5DD',
              backgroundImage: `radial-gradient(#d6cdc3 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          >
            {/* Optional Media Header */}
            {mediaUrl && (
              <div className="mb-2 max-w-[92%] rounded-xl overflow-hidden shadow-sm border border-black/5 bg-white p-1">
                <img src={mediaUrl} alt={mediaName || 'Media'} className="w-full h-28 object-cover rounded-lg" />
              </div>
            )}

            {/* Incoming Message Bubble */}
            <div className="max-w-[94%] self-start space-y-1">
              {/* White Chat Card */}
              <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-black/[0.04] relative space-y-1.5">
                {headerText && (
                  <p className="text-[12px] font-bold text-[#111b21] pb-0.5 border-b border-black/5">
                    {headerText}
                  </p>
                )}

                {/* Body Text */}
                {renderInterpolatedText()}

                {footerText && (
                  <p className="text-[10px] text-[#667781] pt-0.5">
                    {footerText}
                  </p>
                )}

                {/* Timestamp & Double Checkmarks */}
                <div className="flex items-center justify-end gap-1 text-[9.5px] text-[#667781] pt-0.5 select-none">
                  <span>{timestamp}</span>
                  <CheckCheck size={13} className="text-[#53bdeb]" />
                </div>
              </div>

              {/* Action / Quick Reply Buttons */}
              {Array.isArray(buttons) && buttons.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  {buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl py-2 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)] border border-black/[0.05] flex items-center justify-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-[#008069] cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      <CornerDownLeft size={12} className="text-[#008069] shrink-0" />
                      <span className="truncate">{btn.text || btn.label || btn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Real WhatsApp Bottom Input Bar */}
          <div className="bg-[#f0f2f5] px-2 py-1.5 flex items-center gap-1.5 border-t border-black/5 z-10">
            {/* Input Capsule */}
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xs">
              <Smile size={16} className="text-[#8696a0] shrink-0 cursor-pointer hover:text-[#54656f]" />
              <span className="text-[11px] text-[#8696a0] flex-1 truncate">Message</span>
              <Paperclip size={15} className="text-[#8696a0] shrink-0 cursor-pointer hover:text-[#54656f] -rotate-45" />
              <Camera size={15} className="text-[#8696a0] shrink-0 cursor-pointer hover:text-[#54656f]" />
            </div>

            {/* Circular Voice / Mic Button */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm shrink-0 cursor-pointer hover:bg-[#008f72] transition-colors">
              <Mic size={15} className="text-white" />
            </div>
          </div>

          {/* iPhone Bottom Home Bar */}
          <div className="bg-[#f0f2f5] pb-1.5 flex justify-center items-center">
            <div className="w-24 h-1 bg-black/30 rounded-full" />
          </div>

        </div>
      </div>
    </div>
  );
}
