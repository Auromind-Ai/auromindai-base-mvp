'use client';

import React from 'react';

export default function MarketingLayout({ children }) {
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#07080d] text-white">
      {children}
    </div>
  );
}
