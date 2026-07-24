'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  const bgRows = [
    { text: 'ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404', offset: '-translate-x-12' },
    { text: 'PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND', offset: 'translate-x-4' },
    { text: 'ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404', offset: '-translate-x-12' },
    { text: 'PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND', offset: 'translate-x-4' },
    { text: 'ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404', offset: '-translate-x-12' },
    { text: 'PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND', offset: 'translate-x-4' },
    { text: 'ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404', offset: '-translate-x-12' },
    { text: 'PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND PAGE NOT FOUND', offset: 'translate-x-4' },
    { text: 'ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404 ERROR 404', offset: '-translate-x-12' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white flex items-center justify-center overflow-hidden font-['Poppins',sans-serif] selection:bg-white selection:text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* Background Typography Grid */}
      <div 
        className="fixed inset-0 pointer-events-none select-none z-0 flex flex-col justify-around overflow-hidden py-2"
        aria-hidden="true"
      >
        {bgRows.map((row, i) => (
          <div
            key={i}
            className={`whitespace-nowrap font-bold text-4xl sm:text-6xl md:text-7xl lg:text-[85px] tracking-widest leading-none text-[#814AC824] ${row.offset}`}
          >
            {row.text}
          </div>
        ))}
      </div>

      {/* Main Centered Content */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto">
        {/* Main 404 Heading */}
        <h1 className="text-8xl sm:text-[130px] md:text-[170px] lg:text-[200px] font-bold text-white tracking-tight leading-none mb-3 sm:mb-4 select-none">
          404
        </h1>

        {/* Description Text */}
        <p className="text-xs sm:text-sm md:text-base text-white/70 max-w-[280px] sm:max-w-md font-normal mb-6 sm:mb-7 leading-relaxed">
          We couldn't find the page you were looking for. Let's get you back on track.
        </p>

        {/* Action Button with Premium Hover Animation */}
        <Link
          href="/"
          className="group relative inline-flex items-center justify-center px-6 sm:px-7 py-2.5 sm:py-3 rounded-full border border-white/70 bg-transparent text-white text-[10px] sm:text-xs font-semibold tracking-widest uppercase transition-all duration-300 ease-out hover:bg-white hover:text-black hover:border-white hover:scale-105 hover:shadow-[0_0_25px_rgba(129,74,200,0.45)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
        >
          <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">
            BACK TO HOME
          </span>
        </Link>
      </main>
    </div>
  );
}
