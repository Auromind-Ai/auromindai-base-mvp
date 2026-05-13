'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

const SaaSMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      while (true) {
        setStep(0);
        await new Promise(r => setTimeout(r, 1000));
        setStep(1);
        await new Promise(r => setTimeout(r, 2000));
        setStep(2);
        await new Promise(r => setTimeout(r, 1500));
        setStep(3);
        await new Promise(r => setTimeout(r, 2500));
        setStep(4);
        await new Promise(r => setTimeout(r, 4000));
      }
    };
    sequence();
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-square lg:aspect-video flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-white/5 blur-[120px] rounded-full scale-90" />

      <div className="relative w-full h-full flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {/* Main Dashboard Frame */}
          <motion.div
            key="dashboard-frame"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 glass-panel bg-black/60 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            {/* Mock Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">System Live</span>
              </div>
            </div>

            {/* Mock Content */}
            <div className="flex-1 p-10 space-y-10">
              <div className="h-4 w-1/4 bg-white/10 rounded-full" />
              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white/[0.03] rounded-3xl border border-white/5 p-4 flex flex-col justify-end gap-2">
                    <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                    <div className="h-4 w-full bg-white/5 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="h-40 bg-white/[0.02] rounded-3xl border border-white/5" />
            </div>
          </motion.div>

          {/* Floating Interaction Sequence */}
          <div key="interaction-sequence" className="relative z-10 w-full max-w-sm flex flex-col gap-4">
            {step >= 1 && (
              <motion.div
                key="msg-1"
                initial={{ opacity: 0, x: 30, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className="self-end px-6 py-4 bg-purple-600 text-white rounded-[2rem] rounded-tr-sm shadow-2xl text-sm font-medium"
              >
                Hi! I need help automating my sales.
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="self-start px-6 py-4 bg-white/5 backdrop-blur-2xl rounded-[2rem] flex gap-2 border border-white/10"
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                    className="w-2 h-2 rounded-full bg-purple-400"
                  />
                ))}
              </motion.div>
            )}

            {step >= 3 && (
              <motion.div
                key="msg-2"
                initial={{ opacity: 0, x: -30, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className="self-start px-6 py-4 bg-[#1A1A1A] border border-white/10 text-white rounded-[2rem] rounded-tl-sm shadow-2xl text-sm"
              >
                Analyzing requirements... Auromind AI is ready to scale your WhatsApp conversions.
              </motion.div>
            )}

            {step >= 4 && (
              <motion.div
                key="status-card"
                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-[80%] left-1/2 -translate-x-1/2 w-72 p-6 bg-white text-black rounded-[2rem] shadow-[0_20px_50px_rgba(168,85,247,0.2)] flex items-center gap-4 border border-purple-500/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest leading-none mb-1">Growth Status</p>
                  <p className="text-lg font-bold">Scaling Active</p>
                </div>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SaaSMockup;