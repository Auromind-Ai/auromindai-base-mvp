import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Sparkles, AlertCircle, X } from 'lucide-react';
import api from '@/lib/api';
import UpgradeModal from '@/components/UpgradeModal';

export default function AiMagicBar({
  aiInput,
  setAiInput,
  isGenerating,
  setIsGenerating,
  error,
  setError,
  setNodes,
  setEdges,
  setCanvasOffset,
  setActiveNodeId
}) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleGenerateAI = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.generateAIFlow(aiInput);
      if (data.nodes && data.nodes.length > 0) {
        setNodes(data.nodes);
        setEdges(data.edges || []);
        setCanvasOffset({ x: 0, y: 0 });
        setActiveNodeId(null);
        setTimeout(() => setActiveNodeId(data.nodes[0].id), 100);
      } else {
        setError("AI returned invalid format. Try a different prompt.");
      }
    } catch (e) {
      console.warn('[AI Generation Handler]:', e?.message || e);
      const errStr = String(e?.message || e?.data?.detail || e?.data?.message || e).toLowerCase();
      const isQuotaOrLimit = e?.status === 402 || 
        e?.data?.error === 'billing_error' ||
        errStr.includes('insufficient quota') || 
        errStr.includes('upgrade your plan') || 
        errStr.includes('upgrade plan') || 
        errStr.includes('insufficient credits') || 
        errStr.includes('quota exceeded') || 
        errStr.includes('enable overages');
      if (isQuotaOrLimit) {
        setShowUpgradeModal(true);
      } else {
        setError(e?.data?.detail || e?.data?.message || e.message || "Failed to connect to AI engine.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] landscape:max-md:bottom-2 md:absolute md:bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-[84%] md:w-[72%] lg:w-[60%] max-w-[580px] z-[150] pointer-events-auto">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-violet-600/20 rounded-2xl sm:rounded-[24px] md:rounded-[28px] opacity-0 blur-xl group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
          <div className="relative bg-[#13131a]/98 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-[20px] md:rounded-[24px] px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 flex items-center gap-2 sm:gap-3 md:gap-3.5 shadow-2xl">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shadow-violet-600/20 transition-all flex-shrink-0 ${isGenerating ? 'animate-spin bg-violet-500' : 'bg-[#814AC8]'}`}>
              {isGenerating ? <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />}
            </div>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
              placeholder="Describe wire logic to AI and get the solution..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 font-normal placeholder:truncate"
            />
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || !aiInput}
              className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-4.5 md:py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all rounded-lg sm:rounded-xl text-white text-[11px] sm:text-xs font-semibold shadow-md shadow-violet-600/30 disabled:opacity-30 flex-shrink-0 whitespace-nowrap"
            >
              {isGenerating ? 'Synthesizing...' : 'New Wire'}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-[-52px] sm:top-[-58px] left-0 right-0 p-2 sm:p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 backdrop-blur-xl"
            >
              <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-rose-500 truncate">{error}</span>
              <X size={13} className="ml-auto cursor-pointer text-rose-400 flex-shrink-0" onClick={() => setError(null)} />
            </motion.div>
          )}
        </div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  );
}
