import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Timer, X } from 'lucide-react';
import { getNodeButtons, formatDelay } from '../helpers';

export default function WhatsAppPreviewModal({
  previewNode,
  setPreviewNode
}) {
  return (
    <AnimatePresence>
      {previewNode && (
        <motion.div
          key="whatsapp-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xl overflow-y-auto"
          onClick={() => setPreviewNode(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-[92%] max-w-[320px] xs:max-w-[340px] sm:max-w-[360px] md:max-w-[390px] h-[82vh] max-h-[85vh] sm:h-[720px] md:h-[800px] min-h-[460px] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-full border-[8px] sm:border-[10px] md:border-[12px] border-[#0a0a0a] rounded-[32px] sm:rounded-[40px] md:rounded-[48px] shadow-2xl bg-[#0a0a0a] relative flex flex-col min-h-0">
              <div className="flex flex-col h-full overflow-hidden rounded-[24px] sm:rounded-[30px] md:rounded-[36px] bg-[#0b141a] relative min-h-0">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] sm:w-[100px] md:w-[120px] h-[18px] sm:h-[22px] md:h-[26px] bg-black rounded-b-xl md:rounded-b-2xl z-50 pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between gap-2 sm:gap-3 bg-[#202c33] px-3 sm:px-4 pt-6 sm:pt-7 md:pt-8 pb-2.5 sm:pb-3 z-40 relative shrink-0">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                    <button type="button" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white sm:w-4 sm:h-4">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    <div className="flex h-8 w-8 sm:h-9 sm:h-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-400/20 shrink-0">
                      <Bot size={16} className="text-emerald-300 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">WhatsApp</p>
                      <p className="text-[9px] sm:text-[10px] uppercase tracking-[1.5px] sm:tracking-[2px] text-zinc-400 truncate">Preview · {previewNode.label}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPreviewNode(null)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition">
                    <X size={14} className="text-white sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0b141a] relative custom-scrollbar space-y-3 sm:space-y-4">
                  {(previewNode.config?.delay_amount || 0) > 0 && (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-violet-500/10 border border-violet-500/20 w-fit mx-auto max-w-[90%]">
                      <Timer size={11} className="text-violet-400 shrink-0 sm:w-3 sm:h-3" />
                      <span className="text-[9px] sm:text-[10px] font-black text-violet-300 truncate">
                        {formatDelay(previewNode.config.delay_amount, previewNode.config.delay_unit)} before this message
                      </span>
                    </div>
                  )}

                  <div className="max-w-[90%] sm:max-w-[85%] ml-auto space-y-3">
                    {['image', 'video', 'document'].includes(previewNode.config?.message_type) && previewNode.config?.media_url && (
                      <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/10">
                        {previewNode.config.message_type === 'image' && (
                          <img src={previewNode.config.media_url} alt="preview" className="w-full object-cover max-h-36 sm:max-h-44 md:max-h-48" onError={(e) => { e.target.style.display='none'; }} />
                        )}
                        {previewNode.config.message_type === 'video' && (
                          <div className="bg-black/40 h-24 sm:h-28 md:h-32 flex items-center justify-center text-zinc-400 text-[11px] sm:text-xs font-bold uppercase tracking-widest">Video Preview</div>
                        )}
                        {previewNode.config.message_type === 'document' && (
                          <div className="bg-white/5 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 flex items-center gap-2.5 sm:gap-3 text-zinc-300 text-xs font-bold truncate">📄 {previewNode.config.media_url.split('/').pop()}</div>
                        )}
                      </div>
                    )}

                    <div className="rounded-2xl sm:rounded-3xl bg-[#202c33] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm leading-5 sm:leading-6 text-zinc-100 shadow-inner break-words [overflow-wrap:anywhere]">
                      {(previewNode.config?.question || previewNode.config?.text)
                        ? (previewNode.config.question || previewNode.config.text)
                            .split('\n').map((line, index) => <p key={index} className={index > 0 ? 'mt-1.5 sm:mt-2' : ''}>{line}</p>)
                        : <p className="text-zinc-500 italic">No message text configured.</p>
                      }
                    </div>

                    {previewNode.config?.message_type === 'button_message' && getNodeButtons(previewNode).length > 0 && (
                      <div className="space-y-1.5 sm:space-y-2 rounded-2xl sm:rounded-3xl border border-[#2a3942] bg-[#111c22] p-2.5 sm:p-3 w-full">
                        {getNodeButtons(previewNode).map((button) => (
                          <button key={button.id} type="button" className="w-full rounded-xl sm:rounded-2xl border border-[#2a3942] bg-[#14222c] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#53bdeb] transition hover:bg-[#1b3543] truncate">
                            {button.label || button.value || 'Button'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
