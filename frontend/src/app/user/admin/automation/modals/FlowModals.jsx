import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Zap, Plus } from 'lucide-react';
import api from '@/lib/api';
import { normalizeButtons } from '../helpers';

export default function FlowModals({
  selectedItem,
  setSelectedItem,
  setNodes,
  setEdges,
  setActiveNodeId,
  showToast,
  automations,
  setAutomations,
  deleteWireModal,
  setDeleteWireModal,
  deleteStepModal,
  setDeleteStepModal,
  createWireModal,
  setCreateWireModal,
  createWireName,
  setCreateWireName,
  handleCreateNewConfirm
}) {
  return (
    <>
      {/* ─── DELETE WIRE CONFIRM MODAL ─── */}
      <AnimatePresence>
        {deleteWireModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteWireModal.isDeleting && setDeleteWireModal({ open: false, item: null, isDeleting: false })} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-[#0f0f18] border border-purple-500/30 rounded-3xl p-8 w-[420px] shadow-2xl shadow-purple-500/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
                <Trash2 size={24} className="text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Delete Wire</h3>
              <p className="text-sm text-zinc-400 text-center mb-1">
                Delete <span className="text-white font-semibold">"{deleteWireModal.item?.name}"</span> wire?
              </p>
              <p className="text-xs text-zinc-500 text-center mb-8">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteWireModal({ open: false, item: null, isDeleting: false })}
                  disabled={deleteWireModal.isDeleting}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleteWireModal(prev => ({ ...prev, isDeleting: true }));
                    try {
                      await api.deleteFlow(deleteWireModal.item.id);
                      const deletedId = deleteWireModal.item.id;
                      setAutomations(prev => prev.filter(a => a.id !== deletedId));
                      if (selectedItem?.id === deletedId) {
                        setSelectedItem(null);
                        setNodes([]);
                        setEdges([]);
                      }
                      showToast('Wire deleted successfully', 'success');
                      setDeleteWireModal({ open: false, item: null, isDeleting: false });
                    } catch (err) {
                      console.error(err);
                      showToast('Failed to delete wire', 'error');
                      setDeleteWireModal(prev => ({ ...prev, isDeleting: false }));
                    }
                  }}
                  disabled={deleteWireModal.isDeleting}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition shadow-lg shadow-rose-600/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {deleteWireModal.isDeleting && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  )}
                  {deleteWireModal.isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DELETE STEP CONFIRM MODAL ─── */}
      <AnimatePresence>
        {deleteStepModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteStepModal({ open: false, nodeId: null })} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-[#0f0f18] border border-purple-500/30 rounded-3xl p-8 w-[380px] shadow-2xl shadow-purple-500/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Trash2 size={24} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Delete Step</h3>
              <p className="text-sm text-zinc-400 text-center mb-8">Remove this step from the flow?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteStepModal({ open: false, nodeId: null })}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const nodeIdToDelete = deleteStepModal.nodeId;
                    setNodes(prev => prev.filter(n => n.id !== nodeIdToDelete));
                    setEdges(prev => prev.filter(e => e.source !== nodeIdToDelete && e.target !== nodeIdToDelete));
                    setNodes(prev => prev.map(node => ({
                      ...node,
                      config: {
                        ...node.config,
                        buttons: normalizeButtons(node.config?.buttons || []).map(button => button.target === nodeIdToDelete ? { ...button, target: null } : button),
                        branches: (node.config?.branches || []).map(branch => branch.target === nodeIdToDelete ? { ...branch, target: null } : branch),
                      },
                    })));
                    setActiveNodeId(null);
                    setDeleteStepModal({ open: false, nodeId: null });
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition shadow-lg shadow-rose-600/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CREATE WIRE MODAL ─── */}
      <AnimatePresence>
        {createWireModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateWireModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-[#0f0f18] border border-purple-500/30 rounded-3xl p-8 w-[420px] shadow-2xl shadow-purple-500/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                <Zap size={24} className="text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-6">Create New Wire</h3>
              <input
                type="text"
                value={createWireName}
                onChange={(e) => setCreateWireName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && createWireName.trim()) handleCreateNewConfirm(createWireName.trim()); }}
                placeholder="Enter wire name..."
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateWireModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (createWireName.trim()) handleCreateNewConfirm(createWireName.trim()); }}
                  disabled={!createWireName.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#814AC8] hover:bg-violet-500 text-white text-sm font-semibold transition shadow-lg shadow-violet-600/30 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Create Wire
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
