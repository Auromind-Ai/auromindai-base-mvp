'use client';

import { useRef } from 'react';
import { CheckCircle2, Clock, AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_PROMISES = [
  { id: 1, customer: 'Raj Enterprises', promise: 'Send revised proposal by Friday', deadline: 'Tomorrow', status: 'pending' },
  { id: 2, customer: 'Tech Solutions Ltd', promise: 'Follow up on implementation timeline', deadline: 'In 3 days', status: 'pending' },
  { id: 3, customer: 'Global Corp', promise: 'Share case study PDF', deadline: 'Yesterday', status: 'overdue' },
  { id: 4, customer: 'StartupX', promise: 'Schedule demo call', deadline: 'Completed', status: 'fulfilled' },
];

export default function PromisesPage() {

  const scrollRef = useRef(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 600, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen w-full">

  {/* BACKGROUND IMAGE */}
  <div
    className="fixed inset-0 -z-50 bg-center bg-cover bg-no-repeat"
    style={{
      backgroundImage: "url('/images/Meeting3_Background.png')"
    }}
  />

  {/* DARK OVERLAY */}
  {/* <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />  Background with cards*/} 
  <div className="fixed inset-0 -z-40 bg-black/20" />

  {/* CONTENT WRAPPER */}
  <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">
          Founder Assistant
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Keeps your commitments from slipping.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-10">

        <div className="rounded-xl p-4 sm:p-5 lg:p-6 border border-amber-500/20 bg-black/40 backdrop-blur-sm transition hover:border-white/20">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-400" size={18}/>
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl text-white font-semibold">6</div>
              <div className="text-xs text-neutral-400 uppercase">Due Soon</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 sm:p-5 lg:p-6 border border-red-500/20 bg-black/40 backdrop-blur-sm transition hover:border-white/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400" size={18}/>
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl text-white font-semibold">1</div>
              <div className="text-xs text-neutral-400 uppercase">Overdue</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 sm:p-5 lg:p-6 border border-emerald-500/20 bg-black/40 backdrop-blur-sm transition hover:border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={18}/>
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl text-white font-semibold">12</div>
              <div className="text-xs text-neutral-400 uppercase">Fulfilled</div>
            </div>
          </div>
        </div>

      </div>

      {/* Promise Cards Section */}
      <div className="relative">

        {/* Left Scroll Button */}
        <button
          onClick={scrollLeft}
          className="hidden lg:block absolute -left-10 top-1/2 -translate-y-1/2 z-10
          bg-[#1c1c1c] border border-white/10 p-2 rounded-full hover:bg-[#2a2a2a]"
        >
          <ChevronLeft size={18}/>
        </button>

        {/* Cards Container */}
        <div
          ref={scrollRef}
          className="lg:overflow-x-auto scroll-smooth no-scrollbar"
        >

          <div className="grid grid-cols-1 lg:grid-flow-col lg:auto-cols-[calc((100%-48px)/3)] gap-4 lg:gap-6">

            {MOCK_PROMISES.map((promise) => (

              <motion.div
                key={promise.id}
                whileHover={{ y: -4 }}
                className={`relative min-h-[260px] sm:min-h-[320px] lg:min-h-[460px] rounded-xl p-4 sm:p-5 lg:p-6 border flex flex-col h-full overflow-hidden
                bg-black/40 backdrop-blur-sm
                transition-all
                hover:border-white/20 hover:shadow-[0_0_60px_rgba(59,130,246,0.15)]

                ${promise.status === 'overdue'
                    ? 'border-red-500/30'
                    : 'border-white/10'}
                `}
                >

            {/* INNER GLOW BACKGROUND */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                    "radial-gradient(420px circle at 110% -10%, rgba(59,130,246,0.32), rgba(0,0,0,0) 65%)"
                }}
                />

            {/* CARD CONTENT */}
            <div className="relative flex flex-col h-full">

                {/* Header */}
                <div className="flex justify-between mb-3">
                <h3 className="text-sm sm:text-base text-white font-semibold">
                    {promise.customer}
                </h3>

                <span className={`text-[10px] px-2 py-1 rounded-full
                ${promise.status === 'pending' && 'bg-amber-500/10 text-amber-400'}
                ${promise.status === 'overdue' && 'bg-red-500/10 text-red-400'}
                ${promise.status === 'fulfilled' && 'bg-emerald-500/10 text-emerald-400'}
                `}>
                    {promise.status}
                </span>
                </div>

                {/* Promise Text */}
                <p className="text-xs sm:text-sm text-neutral-400 mb-3">
                {promise.promise}
                </p>

                {/* Deadline */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
                <Calendar size={12}/>
                {promise.deadline}
                </div>

                {/* Button */}
                {promise.status !== 'fulfilled' && (
                <button className="mt-auto w-full text-[11px] sm:text-xs py-1.5 sm:py-2 rounded-lg
                bg-neutral-800 hover:bg-neutral-700 border border-white/10">
                    Mark as Fulfilled
                </button>
                )}
            </div>
            </motion.div>
            ))}
          </div>
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={scrollRight}
          className="hidden lg:block absolute -right-10 top-1/2 -translate-y-1/2 z-10
          bg-[#1c1c1c] border border-white/10 p-2 rounded-full hover:bg-[#2a2a2a]"
        >
          <ChevronRight size={18}/>
        </button>

      </div>
      </div>
    </div>
  );
}