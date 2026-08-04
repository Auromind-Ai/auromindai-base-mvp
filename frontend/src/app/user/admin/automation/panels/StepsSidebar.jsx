import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MessageSquare, Send, Settings, Sparkles } from 'lucide-react';

export default function StepsSidebar({
  stepsOpen,
  setStepsOpen
}) {
  return (
    <AnimatePresence>
      {stepsOpen && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          data-steps-panel="true"
          className="absolute left-12 sm:left-14 top-1/2 -translate-y-1/2 z-[90] w-[210px] sm:w-[280px] max-h-[75vh] sm:max-h-none overflow-y-auto backdrop-blur-3xl rounded-xl sm:rounded-2xl custom-scrollbar"
          style={{
            background: '#0e0e1a',
            border: '1.5px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* ── Header ── */}
          <div className="px-3.5 pt-3.5 pb-2.5 sm:px-5 sm:pt-5 sm:pb-4 border-b border-white/[0.06]">
            <h3 className="text-[13px] sm:text-[15px] font-bold text-white">Steps</h3>
            <p className="text-[10px] sm:text-[11px] text-white/60 mt-0.5 leading-snug">
              Drag and drop steps to build your automation
            </p>
          </div>

          <div className="px-3 py-3 space-y-3 sm:px-4 sm:py-4 sm:space-y-5">

            {/* ── Trigger ── */}
            <div>
              <p className="text-[11px] sm:text-[13px] font-semibold text-white/90 mb-1.5 sm:mb-2.5">Trigger</p>
              <div
                className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl cursor-default"
                style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Green circle icon */}
                <div
                  className="w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1.5px solid rgba(16,185,129,0.3)',
                  }}
                >
                  <MessageSquare className="w-4 h-4 sm:w-[19px] sm:h-[19px] text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-[13px] font-semibold text-white leading-tight">Trigger Message</p>
                  <p className="text-[9.5px] sm:text-[11px] text-white/60 mt-0.5 leading-tight sm:leading-snug">
                    Starts the flow when user sends message
                  </p>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div>
              <p className="text-[11px] sm:text-[13px] font-semibold text-white/90 mb-1.5 sm:mb-2.5">Actions</p>
              <div className="space-y-2 sm:space-y-2.5">

                {/* Reply Message — purple filled */}
                <div
                  className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl cursor-default"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                      boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                    }}
                  >
                    <Send className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-[13px] font-semibold text-white leading-tight">Reply Message</p>
                    <p className="text-[9.5px] sm:text-[11px] text-white/60 mt-0.5 leading-tight">Sends a message back</p>
                  </div>
                </div>

                {/* Configuration — dark circle */}
                <div
                  className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl cursor-default"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: '#1e1e2e',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-[13px] font-semibold text-white leading-tight">Configuration</p>
                    <p className="text-[9.5px] sm:text-[11px] text-white/60 mt-0.5 leading-tight">Sends a message back</p>
                  </div>
                </div>

                {/* AI Generation — purple filled */}
                <div
                  className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl cursor-default"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                      boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-[13px] font-semibold text-white leading-tight">AI Generation</p>
                    <p className="text-[9.5px] sm:text-[11px] text-white/60 mt-0.5 leading-tight">Sends a message back</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
