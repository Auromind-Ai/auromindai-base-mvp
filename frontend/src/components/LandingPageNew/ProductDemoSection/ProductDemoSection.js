'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, BarChart3, Workflow, Send, Activity, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import NeatCTAButton from "@/components/ui/NeatCTAButton";
import { motion, AnimatePresence } from 'framer-motion';

const ProductDemoSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalContainerRef = useRef(null);

  const tabs = [
    {
      id: 0,
      icon: <MessageSquare size={20} />,
      title: 'Unified Inbox',
      desc: 'Cross-platform chat management for WhatsApp, Instagram, and Telegram.',
      badge: 'Real-time Feed',
      accentColor: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20'
    },
    {
      id: 1,
      icon: <BarChart3 size={20} />,
      title: 'Live Analytics',
      desc: 'Real-time conversion metrics and AI resolution rates tracking.',
      badge: 'Live Metrics',
      accentColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20'
    },
    {
      id: 2,
      icon: <Workflow size={20} />,
      title: 'Workflow Logs',
      desc: 'Minute-by-minute automation script histories and action logs.',
      badge: 'Terminal Stream',
      accentColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    }
  ];

  // Simulating terminal log streaming
  const logTemplates = [
    { text: '⚡ Webhook received from Instagram Business API', type: 'info' },
    { text: '🔍 Analyzing user message: "Can I integrate Shopify catalog?"', type: 'info' },
    { text: '🧠 AI Model matched intent: "eCommerce Integration Inquiry" (Confidence: 99.2%)', type: 'success' },
    { text: '📦 Fetching Shopify products database...', type: 'warn' },
    { text: '✉️ Sent reply with Shopify catalog widget in-chat', type: 'success' },
    { text: '⚡ Webhook received from WhatsApp Cloud API', type: 'info' },
    { text: '🔍 Analyzing user message: "Let\'s upgrade to growth tier"', type: 'info' },
    { text: '💳 Redirecting to Stripe billing checkout portal', type: 'warn' },
    { text: '🎉 Conversion tracked: Shopify checkouts updated (+ $49.00/mo MRR)', type: 'success' },
    { text: '✅ Notification dispatched to sales team Slack channel #inbox-alerts', type: 'success' },
    { text: '🔄 Workflow execution completed successfully in 842ms', type: 'success' },
  ];

  useEffect(() => {
    if (activeTab === 2) {
      setTerminalLogs([]);
      let index = 0;
      const interval = setInterval(() => {
        if (index < logTemplates.length) {
          const timestamp = new Date().toLocaleTimeString();
          const newLog = {
            id: index,
            timestamp,
            ...logTemplates[index]
          };
          setTerminalLogs(prev => [...prev, newLog]);
          index++;
        } else {
          // Restart stream after completion
          setTimeout(() => {
            setTerminalLogs([]);
            index = 0;
          }, 3000);
        }
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  return (
    <section id="demo" className="py-24 px-6 bg-[#030303] border-t border-white/[0.05] relative overflow-hidden">
      {/* Background ambient radial glows */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-[#09090D] to-[#050508] rounded-[2.5rem] border border-white/[0.08] p-6 md:p-12 lg:p-16 overflow-hidden relative backdrop-blur-md shadow-2xl">
          {/* Internal diagonal accent */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-600/5 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Interactive Selector */}
            <div className="lg:col-span-6 space-y-8 text-center lg:text-left relative z-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-[0.2em] max-w-max mx-auto lg:mx-0">
                <Sparkles size={12} className="animate-pulse" />
                <span>Command Center</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                Monitor every chat <br />
                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">from one dashboard.</span>
              </h2>
              
              <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                Track ROI, response velocity, and human-handoffs in real-time. Designed to keep growing teams aligned and moving fast.
              </p>

              {/* Interactive Lists */}
              <div className="space-y-4 max-w-lg mx-auto lg:mx-0 text-left">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                        isActive 
                          ? 'bg-white/[0.04] border-white/15 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.15)]' 
                          : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent border-l-2 border-purple-500 pointer-events-none" 
                        />
                      )}

                      <div className="flex gap-4 items-start relative z-10">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                          isActive 
                            ? `${tab.bgColor} ${tab.borderColor} ${tab.accentColor}`
                            : 'bg-white/5 border-white/10 text-white/50 group-hover:text-white group-hover:bg-white/10'
                        }`}>
                          {tab.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-semibold tracking-tight text-base transition-colors ${
                              isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                            }`}>
                              {tab.title}
                            </h4>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? `${tab.bgColor} ${tab.borderColor} ${tab.accentColor}`
                                : 'bg-white/5 border-white/5 text-white/30'
                            }`}>
                              {tab.badge}
                            </span>
                          </div>
                          <p className="text-white/40 text-sm mt-1 leading-relaxed">{tab.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <NeatCTAButton 
                  href="/signup" 
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-white/10 text-center flex items-center justify-center gap-2"
                >
                  Request Dashboard Access
                  <ChevronRight size={16} />
                </NeatCTAButton>
              </div>
            </div>

            {/* Right Column: Visual Mockup Browser */}
            <div className="lg:col-span-6 relative z-10 w-full">
              {/* External Glowing Ring */}
              <div className="absolute inset-0 bg-purple-500/5 rounded-3xl blur-2xl pointer-events-none" />

              {/* Mock Dashboard Visual */}
              <div className="bg-[#0D0D11] rounded-3xl border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-md flex flex-col min-h-[460px]">
                
                {/* Glowing corner overlay inside dashboard */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top browser header bar */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.01]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  
                  {/* Title Bar */}
                  <div className="text-[10px] font-mono tracking-wider text-white/30 uppercase max-w-[180px] truncate">
                    {tabs[activeTab].title.toLowerCase()}.auromind.ai
                  </div>
                  
                  {/* Pulsing Live indicator */}
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-300">Live</span>
                  </div>
                </div>

                {/* Dynamic Content Container */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                  <AnimatePresence mode="wait">
                    {activeTab === 0 && (
                      <motion.div
                        key="inbox"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 flex-1 flex flex-col justify-between"
                      >
                        {/* Inbox Top Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                              SC
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                Sarah Chen
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              </div>
                              <div className="text-[10px] text-white/40">Shopify Checkout • Via WhatsApp</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/25">
                            AI Co-Pilot Active
                          </span>
                        </div>

                        {/* Chat Feed Messages */}
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] py-2 pr-1 scrollbar-thin">
                          <div className="max-w-[80%] bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3">
                            <p className="text-xs text-white/90 leading-relaxed">
                              Hey! Can I integrate my Shopify catalog directly with WhatsApp?
                            </p>
                            <span className="text-[8px] text-white/30 mt-1 block">12:04 PM</span>
                          </div>

                          <div className="max-w-[80%] bg-violet-600/20 border border-violet-500/20 rounded-2xl rounded-tr-none p-3 ml-auto">
                            <p className="text-xs text-white leading-relaxed">
                              Absolutely, Sarah! I can sync your catalog instantly. Would you like me to pull your top products?
                            </p>
                            <span className="text-[8px] text-purple-300/50 mt-1 block">12:04 PM • Bot</span>
                          </div>

                          <div className="max-w-[80%] bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3">
                            <p className="text-xs text-white/90 leading-relaxed">
                              Yes please, show me the bestsellers.
                            </p>
                            <span className="text-[8px] text-white/30 mt-1 block">12:05 PM</span>
                          </div>

                          <div className="max-w-[80%] bg-violet-600/20 border border-violet-500/20 rounded-2xl rounded-tr-none p-3 ml-auto">
                            <div className="flex items-center gap-2 mb-2 p-1.5 bg-black/30 border border-white/5 rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                                🛒
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-white">CloudRunner Sneakers</div>
                                <div className="text-[9px] text-white/40">$129.00 • 3 In Stock</div>
                              </div>
                            </div>
                            <p className="text-xs text-white leading-relaxed">
                              Here is our bestseller! You can click below to checkout securely.
                            </p>
                            <span className="text-[8px] text-purple-300/50 mt-1 block">12:05 PM • Bot</span>
                          </div>
                        </div>

                        {/* Input Box */}
                        <div className="relative mt-2 border-t border-white/5 pt-3">
                          <input 
                            type="text" 
                            disabled 
                            autoComplete="off"
                            placeholder="AI assistant is typing..." 
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white/50 focus:outline-none pr-10 font-sans"
                            suppressHydrationWarning
                          />
                          <div className="absolute right-3 top-6 flex items-center gap-1.5">
                            <span className="flex gap-1 items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 1 && (
                      <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5 flex-1 flex flex-col justify-between"
                      >
                        {/* Analytics Top Row Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between h-[110px]">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Conversion Rate</span>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+3.2%</span>
                            </div>
                            <div>
                              <div className="text-2xl font-extrabold text-white tracking-tight">24.8%</div>
                              <span className="text-[9px] text-white/30 mt-1 block">vs 21.6% last week</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 w-[78%]" />
                            </div>
                          </div>

                          <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between h-[110px]">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Resolution Rate</span>
                              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">98.4% CSAT</span>
                            </div>
                            <div>
                              <div className="text-2xl font-extrabold text-white tracking-tight">87.4%</div>
                              <span className="text-[9px] text-white/30 mt-1 block">Resolved by AI instantly</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[87%]" />
                            </div>
                          </div>
                        </div>

                        {/* Chart Preview */}
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex-1 flex flex-col justify-between min-h-[160px]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Conversations Overview</span>
                            <div className="flex gap-2">
                              <span className="text-[8px] text-white/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> AI Solved
                              </span>
                              <span className="text-[8px] text-white/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Human
                              </span>
                            </div>
                          </div>

                          {/* SVG Chart */}
                          <div className="flex-1 relative w-full h-[100px] flex items-end">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Glowing path area */}
                              <path 
                                d="M0 35 C10 25, 20 15, 30 20 C40 25, 50 8, 60 12 C70 16, 80 5, 90 2 C100 0, 100 35, 0 35 Z" 
                                fill="url(#chartGlow)"
                              />
                              {/* Main Line */}
                              <motion.path 
                                d="M0 35 C10 25, 20 15, 30 20 C40 25, 50 8, 60 12 C70 16, 80 5, 90 2 C100 0" 
                                fill="none" 
                                stroke="#8B5CF6" 
                                strokeWidth="1.5"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                              />
                              {/* Secondary Line */}
                              <motion.path 
                                d="M0 35 C10 32, 20 28, 30 30 C40 29, 50 22, 60 25 C70 20, 80 18, 90 15 C100 12" 
                                fill="none" 
                                stroke="#06B6D4" 
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.2, ease: "easeInOut" }}
                              />
                            </svg>
                          </div>
                          
                          {/* Chart Labels */}
                          <div className="flex justify-between text-[8px] text-white/30 font-mono mt-2 pt-2 border-t border-white/[0.03]">
                            <span>09:00 AM</span>
                            <span>12:00 PM</span>
                            <span>03:00 PM</span>
                            <span>06:00 PM</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 2 && (
                      <motion.div
                        key="logs"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 flex-1 flex flex-col justify-between"
                      >
                        {/* Terminal Window */}
                        <div className="bg-[#050507] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col min-h-[300px] max-h-[300px] overflow-hidden">
                          {/* Terminal Header */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                            <span className="text-[9px] font-mono text-white/40 flex items-center gap-1.5">
                              <Activity size={10} className="text-emerald-400 animate-pulse" />
                              auromind-runtime-v1.4.log
                            </span>
                            <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                              STREAMING
                            </span>
                          </div>

                          {/* Terminal output */}
                          <div 
                            ref={terminalContainerRef}
                            className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[10px] leading-relaxed scrollbar-thin pr-1 text-left"
                          >
                            {terminalLogs.length === 0 ? (
                              <div className="text-white/20 italic text-[10px]">Initializing log listener...</div>
                            ) : (
                              terminalLogs.map((log) => (
                                <div key={log.id} className="flex gap-2 items-start">
                                  <span className="text-white/20 select-none">[{log.timestamp}]</span>
                                  <span className={
                                    log.type === 'success' ? 'text-emerald-400' :
                                    log.type === 'warn' ? 'text-amber-400' : 'text-white/80'
                                  }>
                                    {log.text}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDemoSection;