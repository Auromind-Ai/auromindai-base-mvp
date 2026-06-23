import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Sparkles, AlertCircle, X } from 'lucide-react';
import api from '@/lib/api';

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
      console.error(e);
      setError(e.message || "Failed to connect to AI engine.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] max-w-[760px] z-[150]">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-violet-600/20 rounded-[28px] opacity-0 blur-2xl group-hover:opacity-100 transition-all duration-700" />
        <div className="relative bg-[#13131a]/98 backdrop-blur-2xl border border-white/8 rounded-[24px] px-4 py-3 flex items-center gap-4 shadow-2xl">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20 transition-all flex-shrink-0 ${isGenerating ? 'animate-spin bg-violet-500' : 'bg-[#814AC8]'}`}>
            {isGenerating ? <Activity size={20} /> : <Sparkles size={20} />}
          </div>
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
            placeholder="Describe your wire logic to AI and get the solution..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 font-normal"
          />
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating || !aiInput}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all rounded-xl text-white text-xs font-semibold shadow-lg shadow-violet-600/30 disabled:opacity-30 flex-shrink-0"
          >
            {isGenerating ? 'Synthesizing...' : 'New Wire'}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-[-60px] left-0 right-0 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <AlertCircle size={16} className="text-rose-500" />
            <span className="text-xs font-bold text-rose-500">{error}</span>
            <X size={14} className="ml-auto cursor-pointer text-rose-400" onClick={() => setError(null)} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
