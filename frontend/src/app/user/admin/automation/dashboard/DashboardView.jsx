import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Sparkles, Layers, MousePointer2, Trash2, CheckCircle2, X
} from 'lucide-react';
import { getUser, getWorkspaceIdFromToken } from '@/lib/auth';
import api from '@/lib/api';
import Script from 'next/script';

export default function DashboardView({
  automations,
  search,
  setSearch,
  handleSelectAutomation,
  handleToggleStatus,
  handleDuplicateFlow,
  handleDeleteFlow,
  infoModal,
  setInfoModal,
  isCreateModalOpen,
  setIsCreateModalOpen,
  newFlowName,
  setNewFlowName,
  handleCreateFlowSubmit,
  customModal,
  setCustomModal,
  flowQuota,
  fetchFlowQuota
}) {
  const [isPurchaseFlowModalOpen, setIsPurchaseFlowModalOpen] = useState(false);
  const [reachedLimitWarning, setReachedLimitWarning] = useState(false);

  const handleCreateFlowClick = () => {
    const isUnlimited = flowQuota?.total === -1;
    const limit = isUnlimited ? Infinity : (flowQuota?.total ?? 5);
    const existingFlowsCount = automations.length;

    if (existingFlowsCount >= limit) {
      setReachedLimitWarning(true);
      setIsPurchaseFlowModalOpen(true);
    } else {
      setReachedLimitWarning(false);
      setIsCreateModalOpen(true);
    }
  };
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [packOptions, setPackOptions] = useState([
    { id: 'flow_5', flows: 5, price: 999, label: '5 Flows' },
    { id: 'flow_10', flows: 10, price: 1799, label: '10 Flows' },
    { id: 'flow_25', flows: 25, price: 3999, label: '25 Flows' }
  ]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const options = await api.getFlowPackOptions();
        setPackOptions(options);
      } catch (e) {
        console.error("Failed to load flow pack options:", e);
      }
    };
    fetchOptions();
  }, []);

  const handlePurchaseFlowPack = async (pack) => {
    const wsId = getWorkspaceIdFromToken();
    if (!wsId) {
      setCustomModal({
        open: true,
        title: 'Error',
        message: 'Workspace context missing.',
        confirmText: 'Dismiss',
        isConfirm: false,
        confirmColor: 'bg-rose-600 hover:bg-rose-500',
        onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
      });
      return;
    }

    if (!window.Razorpay) {
      setCustomModal({
        open: true,
        title: 'Error',
        message: 'Razorpay checkout is loading. Please retry in a few seconds.',
        confirmText: 'Dismiss',
        isConfirm: false,
        confirmColor: 'bg-rose-600 hover:bg-rose-500',
        onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const res = await api.initiateFlowPackPurchase(wsId, pack.pack_id || pack.id);
      const orderData = res.data ?? res;

      api.openRazorpayCheckout({
        orderData,
        name: 'Auromind',
        description: `Flow Pack - ${pack.name || pack.label}`,
        handler: async (response) => {
          setIsProcessingPayment(true);
          try {
            const verifyPayload = {
              workspace_id: wsId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              provider: 'razorpay'
            };
            await api.verifyFlowPackPayment(verifyPayload);

            setIsPurchaseFlowModalOpen(false);

            setCustomModal({
              open: true,
              title: 'Purchase Successful',
              message: `✅ Successfully purchased ${pack.name || pack.label}! Your quota has been updated.`,
              confirmText: 'Done',
              isConfirm: false,
              confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
              onConfirm: () => {
                setCustomModal(prev => ({ ...prev, open: false }));
                if (reachedLimitWarning) {
                  setIsCreateModalOpen(true);
                  setReachedLimitWarning(false);
                }
              }
            });

            if (fetchFlowQuota) {
              await fetchFlowQuota();
            }
          } catch (verifyErr) {
            console.error('[FLOW PACK PURCHASE] Verification failed:', verifyErr);
            setCustomModal({
              open: true,
              title: 'Verification Failed',
              message: '⚠️ Payment was successful but verification failed. Please contact support.',
              confirmText: 'Dismiss',
              isConfirm: false,
              confirmColor: 'bg-rose-600 hover:bg-rose-500',
              onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
            });
          } finally {
            setIsProcessingPayment(false);
          }
        },
        ondismiss: () => {
          setIsProcessingPayment(false);
        }
      });
    } catch (err) {
      console.error('[FLOW PACK PURCHASE] Error:', err);
      setCustomModal({
        open: true,
        title: 'Purchase Failed',
        message: `⚠️ Failed to initiate purchase: ${err.message || 'Unknown error'}`,
        confirmText: 'Dismiss',
        isConfirm: false,
        confirmColor: 'bg-rose-600 hover:bg-rose-500',
        onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
      });
      setIsProcessingPayment(false);
    }
  };

  const usedActive = automations.filter(a => a.status === 'Active').length;
  const planBase = flowQuota?.plan_base || 5;
  const purchasedFlows = flowQuota?.purchased || 0;
  const isUnlimited = flowQuota?.total === -1;
  const totalLimit = isUnlimited ? '∞' : (flowQuota?.total || 5);
  const percentage = isUnlimited ? 100 : Math.round((usedActive / (flowQuota?.total || 5)) * 100);
  const filteredAutomations = automations.filter(flow =>
    (flow.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const currentUser = getUser();

  return (
    <div className="min-h-screen bg-[#0d0d12] text-zinc-200 p-4 sm:p-6 md:p-8 font-sans overflow-y-auto select-text text-left relative">
      {/* Background ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/5 blur-[220px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] bg-violet-600/5 blur-[220px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 relative z-10">
        
        {/* Top Cards Row */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Active Flows Card */}
          <div className="bg-[#13131a]/60 border border-white/[0.06] rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
            <div className="relative z-10 w-full">
              <h3 className="text-sm font-bold text-white mb-4">Active Flows</h3>
              
              {/* Circular Progress Indicator */}
              <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-white/[0.03]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#814AC8]"
                      strokeWidth="3.5"
                      strokeDasharray={`${Math.min(percentage, 100)}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-xs font-bold text-white">
                    {isUnlimited ? '∞' : `${Math.min(percentage, 100)}%`}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">
                    {usedActive} <span className="text-xs font-bold text-white/40">/ {totalLimit}</span>
                  </div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Flows Active</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50 font-medium">
                <span>Plan: {planBase} | Purchased: +{purchasedFlows} | Total: {totalLimit}</span>
                <span>•</span>
                <span>AI Enabled: {automations.filter(a => a.nodes?.some(n => n.type === 'action' && n.config?.type === 'brain_query')).length}</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setReachedLimitWarning(false);
                setIsPurchaseFlowModalOpen(true);
              }}
              className="w-full max-w-xs mx-auto mt-4 py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl border border-white/10 shadow-md relative z-10"
            >
              Purchase More Flows
            </button>
          </div>
        </div>

        {/* Search bar and Create Flow button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search by flow name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-[#13131a]/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all shadow-sm font-sans"
            />
          </div>
          
          <button
            onClick={handleCreateFlowClick}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-[#814AC8] hover:bg-[#723bb3] active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-650/20 w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Create Flow</span>
          </button>
        </div>

        {/* Tabs bar */}
        <div className="border-b border-white/10 flex flex-wrap gap-6 text-xs font-bold text-white/40 pt-2">
          <button className="pb-3 text-purple-400 border-b-2 border-purple-500 flex items-center gap-1 font-extrabold">
            Your Flows
          </button>
          <button className="pb-3 hover:text-white/70 flex items-center gap-1.5 transition-colors">
            Templates
            <span className="bg-[#10b981] text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none">NEW</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-[#13131a]/40 border border-white/5 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#171722]/30 text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                  <th className="px-6 py-4">Flow Name</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] text-xs font-medium text-white/70">
                {filteredAutomations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center text-white/30 italic font-normal">
                      No flows found. Click &quot;Create Flow&quot; to build your first automation.
                    </td>
                  </tr>
                ) : (
                  filteredAutomations.map((flow) => (
                    <tr key={flow.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <span 
                          onClick={() => handleSelectAutomation(flow)}
                          className="font-bold text-white hover:text-purple-450 cursor-pointer transition-colors"
                        >
                          {flow.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/40 font-mono text-[11px]">
                        {currentUser?.email || 'zixcommerce'}
                      </td>
                      <td className="px-6 py-4">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={flow.status === 'Active'}
                            onChange={() => handleToggleStatus(flow)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#814AC8]" />
                        </label>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDuplicateFlow(flow)}
                            title="Duplicate Flow"
                            className="p-2 text-zinc-400 opacity-60 hover:opacity-100 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
                          >
                            <Layers size={14} />
                          </button>
                          <button
                            onClick={() => handleSelectAutomation(flow)}
                            title="Open Wire Editor"
                            className="p-2 text-zinc-400 opacity-60 hover:opacity-100 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
                          >
                            <MousePointer2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFlow(flow.id)}
                            title="Delete Flow"
                            className="p-2 text-[#ef4444] opacity-60 hover:opacity-100 hover:text-red-400 transition-all duration-300 rounded-lg hover:bg-red-550/5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>

      {/* ─── INFO / PURCHASE MODAL ─── */}
      <AnimatePresence>
        {infoModal.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInfoModal({ open: false, title: '', message: '' })}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#13131a] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 text-left"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#814AC8]/15 border border-[#814AC8]/30 flex items-center justify-center mb-4">
                <Sparkles size={22} className="text-[#814AC8]" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">{infoModal.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-6">{infoModal.message}</p>

              <button
                onClick={() => setInfoModal({ open: false, title: '', message: '' })}
                className="w-full py-2.5 px-4 bg-[#814AC8] hover:bg-[#723bb3] active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Naming / Creation Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#13131a] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 text-left"
            >
              <h3 className="text-base font-bold text-white mb-1">Create New Flow</h3>
              <p className="text-xs text-white/40 mb-6 font-medium">Enter a descriptive name for your flow.</p>
              
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider ml-0.5">Flow Name</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="e.g., Lead Qualification Flow"
                  className="w-full h-11 px-3 bg-black/35 border border-white/8 rounded-xl text-xs text-white outline-none focus:border-purple-500/50 focus:bg-[#151522]/30 transition-all font-sans"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFlowSubmit(); }}
                />
              </div>
              
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 text-white/60 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFlowSubmit}
                  disabled={!newFlowName.trim()}
                  className="px-5 py-2.5 bg-[#814AC8] hover:bg-[#723bb3] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Create Flow
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CUSTOM ACTION / CONFIRM MODAL ─── */}
      <AnimatePresence>
        {customModal?.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!customModal.isConfirm) {
                  setCustomModal(prev => ({ ...prev, open: false }));
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#13131a] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 text-left"
            >
              <h3 className="text-base font-bold text-white mb-2">{customModal.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-6">{customModal.message}</p>

              <div className="flex items-center justify-end gap-2.5">
                {customModal.isConfirm && (
                  <button
                    onClick={() => setCustomModal(prev => ({ ...prev, open: false }))}
                    className="px-4 py-2.5 border border-white/10 hover:bg-white/5 text-white/60 rounded-xl text-xs font-bold transition-all"
                  >
                    {customModal.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (customModal.onConfirm) {
                      customModal.onConfirm();
                    } else {
                      setCustomModal(prev => ({ ...prev, open: false }));
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-white ${customModal.confirmColor || 'bg-[#814AC8] hover:bg-[#723bb3]'}`}
                >
                  {customModal.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PURCHASE FLOW PACKS MODAL ─── */}
      <AnimatePresence>
        {isPurchaseFlowModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isProcessingPayment) setIsPurchaseFlowModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#13131a] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-2xl w-full relative z-10 text-left"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Purchase Flow Packs</h3>
                  <p className="text-xs text-white/40 mt-1">Upgrade your workspace quota by buying additional flows.</p>
                </div>
                <button
                  disabled={isProcessingPayment}
                  onClick={() => setIsPurchaseFlowModalOpen(false)}
                  className="p-1 text-white/40 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {reachedLimitWarning && (
                <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-start gap-3 animate-fade-in">
                  <div className="p-1 bg-purple-500/20 rounded-lg text-purple-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Flow Limit Reached</h4>
                    <p className="text-xs text-white/70 mt-0.5">
                      You've reached your Flow limit. Purchase additional Flow Packs to continue creating automations.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid of options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {packOptions.map((pack) => (
                  <div
                    key={pack.id}
                    className="bg-[#0e0e12]/80 border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 group relative overflow-hidden"
                  >
                    {pack.badge && (
                      <div className="absolute top-0 right-0 bg-[#814AC8] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-xl uppercase tracking-wider">
                        {pack.badge}
                      </div>
                    )}
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-purple-400 transition-colors">
                        {pack.name || pack.label}
                      </h4>
                      <div className="text-2xl font-black text-white leading-tight">
                        ₹{pack.price.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2">
                        Adds +{pack.flows_count || pack.flows} flows to quota
                      </p>
                      {pack.description && (
                        <p className="text-[10px] text-zinc-500 mt-1.5 leading-normal">
                          {pack.description}
                        </p>
                      )}
                    </div>

                    <button
                      disabled={isProcessingPayment}
                      onClick={() => handlePurchaseFlowPack(pack)}
                      className="w-full mt-5 py-2 px-3 bg-white/5 hover:bg-[#814AC8] hover:text-white transition-all text-zinc-300 text-xs font-bold rounded-xl border border-white/10 active:scale-[0.98]"
                    >
                      Buy Pack
                    </button>
                  </div>
                ))}
              </div>

              {isProcessingPayment && (
                <div className="flex items-center justify-center gap-2.5 py-2.5 border-t border-white/5 text-xs text-white/50 font-medium">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                  <span>Processing purchase transaction...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    </div>
  );
}
