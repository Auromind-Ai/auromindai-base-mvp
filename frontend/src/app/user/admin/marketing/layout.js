'use client';

import React from 'react';

export default function MarketingLayout({ children }) {
  return (
    <div className="w-full min-h-full flex flex-col bg-[var(--notion-bg,#0a0914)] text-white">
      {children}
    </div>
  );
}
