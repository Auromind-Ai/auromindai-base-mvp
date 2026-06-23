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
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xl"
          onClick={() => setPreviewNode(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-[390px] h-[800px] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-full border-[12px] border-[#0a0a0a] rounded-[48px] shadow-2xl bg-[#0a0a0a] relative">
              <div className="flex flex-col h-full overflow-hidden rounded-[36px] bg-[#0b141a] relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-b-3xl z-50"></div>
                <div className="flex items-center justify-between gap-4 bg-[#202c33] px-4 py-3 h-16 z-40 relative">
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20">
                      <Bot size={20} className="text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">WhatsApp</p>
                      <p className="text-[10px] uppercase tracking-[2px] text-zinc-400">Preview · {previewNode.label}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPreviewNode(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <X size={16} className="text-white" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#0b141a] relative">
                  {(previewNode.config?.delay_amount || 0) > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 w-fit mx-auto">
                      <Timer size={12} className="text-violet-400" />
                      <span className="text-[10px] font-black text-violet-300">
                        {formatDelay(previewNode.config.delay_amount, previewNode.config.delay_unit)} before this message
                      </span>
                    </div>
                  )}

                  <div className="max-w-[85%] ml-auto">
                    {['image', 'video', 'document'].includes(previewNode.config?.message_type) && previewNode.config?.media_url && (
                      <div className="mb-3 rounded-2xl overflow-hidden border border-white/10">
                        {previewNode.config.message_type === 'image' && (
                          <img src={previewNode.config.media_url} alt="preview" className="w-full object-cover max-h-48" onError={(e) => { e.target.style.display='none'; }} />
                        )}
                        {previewNode.config.message_type === 'video' && (
                          <div className="bg-black/40 h-32 flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-widest">Video Preview</div>
                        )}
                        {previewNode.config.message_type === 'document' && (
                          <div className="bg-white/5 px-4 py-3 flex items-center gap-3 text-zinc-300 text-xs font-bold">📄 {previewNode.config.media_url.split('/').pop()}</div>
                        )}
                      </div>
                    )}
                    <div className="mb-4 rounded-3xl bg-[#202c33] px-4 py-3 text-sm leading-6 text-zinc-100 shadow-inner">
                      {(previewNode.config?.question || previewNode.config?.text)
                        ? (previewNode.config.question || previewNode.config.text)
                            .split('\n').map((line, index) => <p key={index} className={index > 0 ? 'mt-2' : ''}>{line}</p>)
                        : <p className="text-zinc-500 italic">No message text configured.</p>
                      }
                    </div>
                    {previewNode.config?.message_type === 'button_message' && getNodeButtons(previewNode).length > 0 && (
                      <div className="space-y-2 rounded-3xl border border-[#2a3942] bg-[#111c22] p-3 max-w-[280px]">
                        {getNodeButtons(previewNode).map((button) => (
                          <button key={button.id} type="button" className="w-full rounded-2xl border border-[#2a3942] bg-[#14222c] px-4 py-3 text-sm font-bold text-[#53bdeb] transition hover:bg-[#1b3543]">
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
