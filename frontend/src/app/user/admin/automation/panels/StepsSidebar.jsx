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
          className="absolute left-14 top-1/2 -translate-y-1/2 z-[90] w-[280px] backdrop-blur-3xl rounded-2xl overflow-hidden"
          style={{
            background: '#0e0e1a',
            border: '1.5px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
        >
          {/* ── Header ── */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <h3 className="text-[15px] font-bold text-white">Steps</h3>
            <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
              Drag and drop steps to build your automation
            </p>
          </div>

          <div className="px-4 py-4 space-y-5">

            {/* ── Trigger ── */}
            <div>
              <p className="text-[13px] font-semibold text-white/90 mb-2.5">Trigger</p>
              <div
                className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid rgba(16,185,129,0.35)';
                  e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                  e.currentTarget.style.background = '#161622';
                }}
              >
                {/* Green circle icon */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1.5px solid rgba(16,185,129,0.3)',
                  }}
                >
                  <MessageSquare size={19} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white leading-tight">Trigger Message</p>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                    Starts the flow when user send<br />the message
                  </p>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div>
              <p className="text-[13px] font-semibold text-white/90 mb-2.5">Actions</p>
              <div className="space-y-2.5">

                {/* Reply Message — purple filled */}
                <div
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)';
                    e.currentTarget.style.background = 'rgba(139,92,246,0.07)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = '#161622';
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                      boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                    }}
                  >
                    <Send size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">Reply Message</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
                  </div>
                </div>

                {/* Configuration — dark circle */}
                <div
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = '#161622';
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: '#1e1e2e',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <Settings size={18} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">Configuration</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
                  </div>
                </div>

                {/* AI Generation — purple filled */}
                <div
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                  style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)';
                    e.currentTarget.style.background = 'rgba(139,92,246,0.07)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = '#161622';
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                      boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                    }}
                  >
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">AI Generation</p>
                    <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
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
