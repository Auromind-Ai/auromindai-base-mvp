import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, Zap, Trash2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

export default function RepositorySidebar({
  sidebarOpen,
  setSidebarOpen,
  automations,
  setAutomations,
  selectedItem,
  handleSelectAutomation,
  setDeleteWireModal,
  showToast
}) {
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -450, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -450, opacity: 0 }}
          className="absolute left-4 top-20 bottom-28 w-72 z-[110] bg-[#13131a]/98 backdrop-blur-3xl border border-white/8 rounded-2xl shadow-2xl flex flex-col"
        >
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers size={16} className="text-violet-400" />
              <h2 className="text-xs font-semibold text-zinc-300 tracking-wide">Repository</h2>
            </div>
            <X size={18} className="text-zinc-600 cursor-pointer hover:text-zinc-300 transition" onClick={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            {automations.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectAutomation(item)}
                className={`group px-4 py-3 rounded-xl cursor-pointer transition-all border ${selectedItem?.id === item.id ? 'bg-violet-500/10 border-violet-500/25 shadow-lg' : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/5'}`}
              >
                {/* TOP ROW: icon + name + delete */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedItem?.id === item.id ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-zinc-500'
                  }`}>
                    <Zap size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      selectedItem?.id === item.id ? 'text-white' : 'text-zinc-400'
                    }`}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">Automation Wire</p>
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteWireModal({ open: true, item: item, isDeleting: false });
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 border border-rose-500/20 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* SEGMENTED ACTIVE / INACTIVE TOGGLE */}
                <div
                  className="flex items-center rounded-2xl p-[4px] w-full"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* ACTIVE segment */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (item.status === 'Active') return;
                      const prevStatus = item.status;
                      setAutomations(prev =>
                        prev.map(a => a.id === item.id ? { ...a, status: 'Active' } : a)
                      );
                      try {
                        await api.updateFlowStatus(item.id, 'Active');
                      } catch (err) {
                        setAutomations(prev =>
                          prev.map(a => a.id === item.id ? { ...a, status: prevStatus } : a)
                        );
                        showToast('Failed to update status', 'error');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[14px] text-[11px] font-bold transition-all duration-300"
                    style={item.status === 'Active' ? {
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 3px 12px rgba(16,185,129,0.4)',
                      color: 'white',
                    } : {
                      color: 'rgba(255,255,255,0.28)',
                    }}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      item.status === 'Active' ? 'bg-white/25' : 'bg-white/5'
                    }`}>
                      <CheckCircle2 size={11} style={{ color: item.status === 'Active' ? 'white' : 'rgba(255,255,255,0.3)' }} />
                    </div>
                    Active
                  </button>

                  {/* INACTIVE segment */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (item.status !== 'Active') return;
                      const prevStatus = item.status;
                      setAutomations(prev =>
                        prev.map(a => a.id === item.id ? { ...a, status: 'Inactive' } : a)
                      );
                      try {
                        await api.updateFlowStatus(item.id, 'Inactive');
                      } catch (err) {
                        setAutomations(prev =>
                          prev.map(a => a.id === item.id ? { ...a, status: prevStatus } : a)
                        );
                        showToast('Failed to update status', 'error');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[14px] text-[11px] font-bold transition-all duration-300"
                    style={item.status !== 'Active' ? {
                      background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                      boxShadow: '0 3px 12px rgba(244,63,94,0.4)',
                      color: 'white',
                    } : {
                      color: 'rgba(255,255,255,0.28)',
                    }}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      item.status !== 'Active' ? 'bg-white/25' : 'bg-white/5'
                    }`}>
                      {/* Prohibition circle icon */}
                      <svg
                        width="11" height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ color: item.status !== 'Active' ? 'white' : 'rgba(255,255,255,0.3)' }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    </div>
                    Inactive
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
