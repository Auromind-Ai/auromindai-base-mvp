import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Timer, Plus, Play, Upload, AlertCircle, Trash2, Bot, CheckCircle2
} from 'lucide-react';
import AskQuestionConfig from '@/components/AskQuestionConfig';
import {
  MAX_KEYWORDS, DEFAULT_MESSAGE_TYPE, MAX_BUTTONS,
  getNodeButtons, isMultiPathNode, isConditionNode, getNodeBranches,
  getHandleIdForButton, normalizeButtons, createDefaultButton
} from '../helpers';

export default function NodeInspector({
  activeNode,
  activeNodeId,
  setActiveNodeId,
  nodes,
  setNodes,
  edges,
  setEdges,
  updateNode,
  updateNodeConfig,
  updateButtonField,
  addButtonToNode,
  removeButtonFromNode,
  keywordInput,
  setKeywordInput,
  addKeywordToTrigger,
  removeKeywordFromTrigger,
  uploading,
  uploadError,
  uploadProgress,
  isDragOver,
  previewUrl,
  clearUpload,
  handleFileSelect,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleSalesFileSelect,
  salesManualText,
  setSalesManualText,
  handleSalesManualSave,
  removeSalesEntry,
  handleSalesDrop,
  setDeleteStepModal
}) {
  return (
    <AnimatePresence>
      {activeNode && (
        <motion.aside
          initial={{ x: 450, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 450, opacity: 0 }}
          className="absolute right-3 top-51 bottom-0 max-h-[85vh] w-[360px] z-[120] bg-[#15161C] border border-[#22252D] rounded-[20px] shadow-2xl flex flex-col overflow-hidden text-left"
        >
          <div className="px-5 py-2 border-b border-white/5 flex items-center justify-between bg-[#13131a]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
                <Settings size={15} className="text-violet-400" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Configuration</h2>
            </div>
            <button
              onClick={() => setActiveNodeId(null)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center transition"
            >
              <X size={14} className="text-zinc-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-5 custom-scrollbar">
            <section>
              <label className="text-[12px] font-regular text-white/65 tracking-wider block mb-2">New Label</label>
              <input
                value={activeNode.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes(prev => prev.map(n => n.id === activeNodeId ? { ...n, label: val } : n));
                }}
                className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition placeholder:text-zinc-600"
              />
            </section>

            {activeNode.type === 'trigger' && (
              <>
                <section>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Trigger Event</label>
                  <select
                    value={activeNode.config?.event || 'msg_recv'}
                    onChange={(e) => updateNodeConfig(activeNodeId, { event: e.target.value })}
                    className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                    style={{ backgroundColor: "#140D1F", color: "white" }}
                    disabled
                  >
                    <option value="msg_recv">Message Received</option>
                  </select>
                </section>

                {activeNode.config?.event === 'msg_recv' && (
                  <>
                    <section>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Match Strategy</label>
                      <select
                        value={activeNode.config?.match_type || 'word_match'}
                        onChange={(e) => updateNodeConfig(activeNodeId, { match_type: e.target.value })}
                        className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                        style={{ backgroundColor: "#140D1F", color: "white" }}
                      >
                        <option value="exact">Exact Match</option>
                        <option value="contains">Contains (anywhere)</option>
                        <option value="word_match">Word Match (recommended)</option>
                      </select>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Keywords</label>
                        <span className="text-[10px] text-zinc-500">{(activeNode.config?.keywords || []).length}/{MAX_KEYWORDS}</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeywordToTrigger(activeNodeId); } }}
                          placeholder="e.g., hi, hello, hey"
                          className="flex-1 bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                        />
                        <button
                          onClick={() => addKeywordToTrigger(activeNodeId)}
                          disabled={(activeNode.config?.keywords || []).length >= MAX_KEYWORDS || !keywordInput.trim()}
                          className="px-4 py-3 rounded-2xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 disabled:opacity-40 text-sm font-black"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(activeNode.config?.keywords || []).map(keyword => (
                          <div key={keyword} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <span className="text-xs font-bold text-indigo-300">{keyword}</span>
                            <button onClick={() => removeKeywordFromTrigger(activeNodeId, keyword)} className="text-indigo-400 hover:text-rose-400 transition">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {(activeNode.config?.keywords || []).length === 0 && (
                        <div className="rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/10 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[2px] text-amber-300">No keywords configured</p>
                          <p className="mt-1 text-[10px] text-amber-200">This trigger will fire on ALL messages. Add keywords to filter.</p>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}

            {activeNode.type === 'action' && (
              <>
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Timer size={14} className="text-violet-400" />
                    <label className="text-[12px] font-regular text-white/65 tracking-widest">Delay Before This Step</label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={activeNode.config?.delay_unit === 'hours' ? 72 : activeNode.config?.delay_unit === 'minutes' ? 1440 : 86400}
                      value={activeNode.config?.delay_amount || 0}
                      onChange={(e) => updateNodeConfig(activeNodeId, { delay_amount: parseInt(e.target.value) || 0 })}
                      className="w-24 bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500/50 transition shadow-inner"
                    />
                    <select
                      value={activeNode.config?.delay_unit || 'minutes'}
                      onChange={(e) => updateNodeConfig(activeNodeId, { delay_unit: e.target.value })}
                      className="flex-1 bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                      style={{ backgroundColor: "#1a1a24", color: "white" }}
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                  {(activeNode.config?.delay_amount || 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Timer size={12} className="text-violet-400" />
                      <span className="text-[10px] font-black text-violet-300">
                        Wait {activeNode.config.delay_amount} {activeNode.config.delay_unit} before sending
                      </span>
                    </div>
                  )}
                </section>
                <section>
                  <label className="text-[12px] font-regular text-white/65 tracking-wider block mb-2">Action Type</label>
                  <select
                    value={activeNode.config?.type || 'send_msg'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const labelMap = { send_msg: 'Send Message', brain_query: 'AI Reply', assign_agent: 'Assign Agent', ask_question: 'Ask Question', condition: 'If / Else', move_stage: 'Move Deal', notification: 'Notify' };
                      if (newType === 'condition') {
                        updateNode(activeNodeId, (node) => ({
                          ...node,
                          label: 'If / Else',
                          config: {
                            ...(node.config || {}),
                            type: 'condition',
                            field: 'user_input',
                            operator: 'equals',
                            compare_value: '',
                            branches: [
                              { id: 'branch-true', label: 'If True', value: 'true', target: null },
                              { id: 'branch-false', label: 'If False', value: 'false', target: null },
                            ],
                          },
                        }));
                      } else {
                        // Clear condition branches + edges when switching away
                        if (activeNode.config?.type === 'condition') {
                          setEdges(prev => prev.filter(e => !(e.source === activeNodeId && e.sourceHandle)));
                        }
                        updateNode(activeNodeId, (node) => ({ ...node, label: labelMap[newType] || 'New Step', config: { ...(node.config || {}), type: newType } }));
                      }
                    }}
                    className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                    style={{ backgroundColor: "#140D1F", color: "white" }}
                  >
                    <option value="send_msg">Send Message</option>
                    <option value="brain_query">AI Reply (Brain)</option>
                    <option value="ask_question">Ask Question</option>
                    <option value="condition">Decision</option>
                  </select>
                </section>

                {activeNode.config?.type === 'send_msg' && (
                  <>
                    <section>
                      <label className="text-[12px] font-regular text-white/65 tracking-wider block mb-2">Message Type</label>
                      <select
                        value={activeNode.config?.message_type || DEFAULT_MESSAGE_TYPE}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          updateNodeConfig(activeNodeId, (config) => ({
                            ...config, message_type: nextType,
                            buttons: nextType === 'button_message' ? normalizeButtons(config.buttons?.length ? config.buttons : [createDefaultButton(0)]) : [],
                          }));
                          if (nextType !== 'button_message') setEdges(prev => prev.filter(edge => edge.source !== activeNodeId || !edge.sourceHandle));
                        }}
                        className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                          style={{ backgroundColor: "#1a1a24", color: "white" }}
                      >
                        <option value="text">Text Message</option>
                        <option value="button_message">Button Message</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="document">Document / PDF</option>
                      </select>
                    </section>

                    {['image', 'video', 'document'].includes(activeNode.config?.message_type) && (
                      <section>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Media Upload</label>
                        <div
                          className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${isDragOver ? 'border-indigo-400 bg-indigo-400/10' : 'border-white/20 hover:border-white/40'} ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        >
                          {activeNode.config?.media_url ? (
                            <div className="space-y-4">
                              {previewUrl && activeNode.config.message_type === 'image' && (
                                <img src={previewUrl} alt="Preview" className="w-full max-h-32 object-cover rounded-lg" />
                              )}
                              {activeNode.config.message_type === 'video' && (
                                <div className="flex items-center justify-center w-full h-32 bg-black/20 rounded-lg"><Play size={48} className="text-white/60" /></div>
                              )}
                              {activeNode.config.message_type === 'document' && (
                                <div className="flex items-center justify-center w-full h-32 bg-white/5 rounded-lg"><span className="text-4xl">📄</span></div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 size={16} className="text-emerald-400" />
                                  <span className="text-xs text-emerald-400">Uploaded successfully</span>
                                </div>
                                <button onClick={clearUpload} className="text-xs text-zinc-400 hover:text-white transition-colors">Replace</button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-4">
                              <div className="flex flex-col items-center gap-2">
                                <Upload size={32} className="text-white/40" />
                                <div>
                                  <p className="text-sm text-white/80">{isDragOver ? 'Drop your file here' : 'Drag & drop your file here'}</p>
                                  <p className="text-xs text-white/40 mt-1">or click to browse</p>
                                </div>
                              </div>
                              <input type="file" accept="image/*,video/*,application/pdf" onChange={handleFileSelect} className="hidden" id="file-upload" disabled={uploading} />
                              <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors text-sm">
                                <Upload size={16} /> Browse Files
                              </label>
                              <p className="text-xs text-white/40">Supports JPG, PNG, MP4, PDF (max 10MB)</p>
                            </div>
                          )}
                          {uploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                              <div className="text-center space-y-2">
                                <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-sm text-white">Uploading...</p>
                                {uploadProgress > 0 && (
                                  <div className="w-full bg-white/20 rounded-full h-2">
                                    <div className="bg-indigo-400 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {uploadError && (
                          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle size={16} className="text-rose-400" />
                              <p className="text-xs text-rose-400">{uploadError}</p>
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {['image', 'video'].includes(activeNode.config?.message_type) && (
                      <section>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Caption (optional)</label>
                        <textarea
                          value={activeNode.config?.text || ''}
                          onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                          rows={2} placeholder="Image caption..."
                          className="w-full resize-none bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                        />
                      </section>
                    )}

                    {(!activeNode.config?.message_type || ['text', 'button_message'].includes(activeNode.config?.message_type)) && (
                      <section>
                        <label className="text-[12px] font-regular text-white/65 tracking-wider block mb-2">Message Text</label>
                        <textarea
                          value={activeNode.config?.text || ''}
                          onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                          rows={4} placeholder="Add your message"
                          className="w-full resize-none bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                        />
                      </section>
                    )}

                    {(activeNode.config?.message_type || DEFAULT_MESSAGE_TYPE) === 'button_message' && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Buttons</label>
                          <button
                            onClick={() => addButtonToNode(activeNodeId)}
                            disabled={getNodeButtons(activeNode).length >= MAX_BUTTONS}
                            className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest"
                          >
                            Add Button
                          </button>
                        </div>
                        {getNodeButtons(activeNode).map((button, index) => (
                          <div key={button.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[2px] text-zinc-500">Button {index + 1}</span>
                              <button onClick={() => removeButtonFromNode(activeNodeId, button.id)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <input
                              value={button.label}
                              onChange={(e) => updateButtonField(activeNodeId, button.id, 'label', e.target.value)}
                              placeholder="Button label"
                              className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                            />
                            <input
                              value={button.value}
                              onChange={(e) => updateButtonField(activeNodeId, button.id, 'value', e.target.value)}
                              placeholder="payload value"
                              className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                            />
                            <div className="rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.04] px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[2px] text-indigo-300">Target Node</p>
                              <select
                                value={button.target || ''}
                                 className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer mt-2"
                                  style={{ backgroundColor: "#1a1a24", color: "white" }}
                               onChange={(e) => {
                                  const newTarget = e.target.value;
                                  setEdges(prev => {
                                    const filtered = prev.filter(
                                      edge => !(edge.source === activeNodeId && edge.sourceHandle === button.value)
                                    );
                                    if (newTarget) {
                                      return [...filtered, {
                                        id: `e-${activeNodeId}-${button.value}-${newTarget}`,
                                        source: activeNodeId,
                                        sourceHandle: button.value,
                                        target: newTarget
                                      }];
                                    }
                                    return filtered;
                                  });
                                  updateButtonField(activeNodeId, button.id, 'target', newTarget || null);
                                }}
                              >
                                <option value="">Not connected</option>
                                {nodes
                                  .filter(n => n.id !== activeNodeId && n.type !== 'trigger')
                                  .map(n => (
                                    <option key={n.id} value={n.id}>
                                      {n.label}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </section>
                    )}
                  </>
                )}

               {activeNode.config?.type === 'brain_query' && (
                  <>
                    <section>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Agent Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'lead_agent',    label: 'Lead',    emoji: '🎯', comingSoon: false },
                          { value: 'sales_agent',   label: 'Sales',   emoji: '💼', comingSoon: false  },
                          { value: 'support_agent', label: 'Support', emoji: '🛟', comingSoon: false  },
                        ].map(({ value, label, emoji, comingSoon }) => {
                          const isSelected = (activeNode.config?.agent_type || 'lead_agent') === value;
                          return (
                            <div key={value} className="relative">
                              <button
                                data-no-drag
                                disabled={comingSoon}
                                onClick={() => !comingSoon && updateNodeConfig(activeNodeId, { agent_type: value })}
                                className={`w-full flex flex-col items-center gap-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all
                                  ${comingSoon
                                    ? 'bg-white/[0.02] border-white/5 text-zinc-600 cursor-not-allowed opacity-60'
                                    : isSelected
                                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/30'
                                      : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                              >
                                <span className="text-lg">{emoji}</span>
                                {label}
                                {comingSoon && (
                                  <span className="text-[8px] font-semibold text-yellow-400/80 normal-case tracking-normal">
                                    Coming Soon
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[10px] text-zinc-600 font-medium">
                        {activeNode.config?.agent_type === 'sales_agent'   && 'Answers pricing, features, demos using your knowledge base.'}
                        {activeNode.config?.agent_type === 'support_agent' && 'Handles issues, complaints, policy queries.'}
                        {(!activeNode.config?.agent_type || activeNode.config?.agent_type === 'lead_agent') && 'Collects name, requirement, budget, contact.'}
                      </p>
                    </section>

                    {activeNode.config?.agent_type !== 'support_agent' && (
                      <section>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Business Type</label>
                        <select
                          value={activeNode.config?.business_type || 'saas'}
                          onChange={(e) => updateNodeConfig(activeNodeId, { business_type: e.target.value })}
                          className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                          style={{ backgroundColor: "#140D1F", color: "white" }}
                        >
                          <option value="saas">SaaS</option>
                          <option value="ecommerce">E-Commerce</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="real_estate">Real Estate</option>
                          <option value="finance">Finance</option>
                          <option value="other">Other</option>
                        </select>
                      </section>
                    )}

                    {(activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type) && (
                      <section>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Lead Fields</label>
                        <textarea
                          value={activeNode.config?.lead_fields || ''}
                          onChange={(e) => updateNodeConfig(activeNodeId, { lead_fields: e.target.value })}
                          placeholder="name, email, phone, budget"
                          rows={3}
                          className="w-full resize-none bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition shadow-inner placeholder:text-zinc-600"
                        />
                      </section>
                    )}

                    {activeNode.config?.agent_type !== 'support_agent' && (
                      <section className="space-y-3">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Options</label>
                        {[
                          { key: 'enable_demo_booking', label: 'Enable Demo Booking' },
                          ...(activeNode.config?.agent_type === 'sales_agent' ? [{ key: 'payment_enabled', label: 'Enable Payment' }] : [])
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group" data-no-drag>
                              <div
                                onClick={() => updateNodeConfig(activeNodeId, { [key]: !activeNode.config?.[key] })}
                                className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                                  activeNode.config?.[key]
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'bg-[#140D1F] border-[#2B2C33] group-hover:border-indigo-500/50'
                                }`}
                              >
                                {activeNode.config?.[key] && (
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <span
                                onClick={() => updateNodeConfig(activeNodeId, { [key]: !activeNode.config?.[key] })}
                                className="text-sm text-white/80 group-hover:text-white transition"
                              >
                                {label}
                              </span>
                            </label>
                            {key === 'payment_enabled' && activeNode.config?.[key] && (
                              <div className="pl-8" data-no-drag>
                                <input
                                  type="text"
                                  value={activeNode.config?.payment_link || ''}
                                  onChange={(e) => updateNodeConfig(activeNodeId, { payment_link: e.target.value })}
                                  placeholder="Paste payment link here"
                                  className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none placeholder:text-zinc-600"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    )}

                    {['sales_agent', 'support_agent'].includes(activeNode.config?.agent_type) && (
                      <section className="space-y-4 pt-4 border-t border-white/5">
                        <label className="text-[12px] font-semibold text-white tracking-wider block">
                          {activeNode.config?.agent_type === 'support_agent' ? 'Support Documents & Knowledge' : 'Product Details & Knowledge'}
                        </label>
                        <p className="text-[10px] text-zinc-500 mb-2">Upload documents or manually add details. The AI will strictly answer from this context.</p>
                        
                        {/* File Upload Zone */}
                        <div
                          className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${isDragOver ? 'border-indigo-400 bg-indigo-400/10' : 'border-white/20 hover:border-white/40'} ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleSalesDrop}
                        >
                           <div className="text-center space-y-4">
                              <div className="flex flex-col items-center gap-2">
                                <Upload size={24} className="text-white/40" />
                                <div>
                                  <p className="text-xs text-white/80">{isDragOver ? 'Drop your file here' : 'Drag & drop document'}</p>
                                </div>
                              </div>
                              <input type="file" accept=".pdf,.txt,.docx,.md" onChange={handleSalesFileSelect} className="hidden" id="sales-file-upload" disabled={uploading} />
                              <label htmlFor="sales-file-upload" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors text-xs">
                                <Upload size={14} /> Browse
                              </label>
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                  <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            )}
                        </div>

                        {/* Manual Text Entry */}
                        {activeNode.config?.agent_type === 'sales_agent' && (
                          <div>
                             <textarea
                               value={salesManualText}
                               onChange={(e) => setSalesManualText(e.target.value)}
                               placeholder="Or manually type product details, features, and pricing here..."
                               className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 outline-none resize-none h-24"
                             />
                             <div className="flex justify-end mt-2">
                                <button
                                  onClick={handleSalesManualSave}
                                  disabled={uploading || !salesManualText.trim()}
                                  className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-500/30 transition disabled:opacity-50"
                                >
                                  {uploading ? 'Saving...' : 'Save Text'}
                                </button>
                             </div>
                          </div>
                        )}

                        {/* Render attached entry IDs if any */}
                        {(activeNode.config?.entry_ids || []).length > 0 && (
                          <div className="space-y-2 mt-4">
                             <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Attached Knowledge</label>
                             {(activeNode.config?.entry_ids || []).map((id) => (
                                <div key={id} className="flex items-center justify-between px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                   <span className="text-xs text-indigo-300 font-mono truncate max-w-[200px]">Doc {id.substring(0,8)}</span>
                                   <button onClick={() => removeSalesEntry(id)} className="text-rose-400 hover:text-rose-300 p-1">
                                      <X size={14} />
                                   </button>
                                </div>
                             ))}
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}

                {activeNode.config?.type === 'ask_question' && (
                  <AskQuestionConfig node={activeNode} updateNodeConfig={updateNodeConfig} />
                )}

                {activeNode.config?.type === 'condition' && (
                  <>
                    <section>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Condition Field</label>
                      <select
                        value={activeNode.config?.field || 'user_input'}
                        onChange={(e) => updateNodeConfig(activeNodeId, { field: e.target.value })}
                        className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                        style={{ backgroundColor: "#1a1a24", color: "white" }}
                      >
                        <option value="user_input">User Input (last message)</option>
                        <option value="user_name">User Name</option>
                        <option value="user_email">User Email</option>
                        <option value="last_ai_response">Last AI Response</option>
                        <option value="user_reply">User Reply (ask_question)</option>
                      </select>
                    </section>

                    <section>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Operator</label>
                      <select
                        value={activeNode.config?.operator || 'equals'}
                        onChange={(e) => updateNodeConfig(activeNodeId, { operator: e.target.value })}
                        className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                        style={{ backgroundColor: "#1a1a24", color: "white" }}
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="is_empty">Is Empty</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>
                    </section>

                    {activeNode.config?.operator !== 'is_empty' && (
                      <section>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Compare Value</label>
                        <input
                          value={activeNode.config?.compare_value || ''}
                          onChange={(e) => updateNodeConfig(activeNodeId, { compare_value: e.target.value })}
                          placeholder="Value to compare against..."
                          className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition placeholder:text-zinc-600"
                        />
                      </section>
                    )}

                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block">Branch Connections</label>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-[2px] text-emerald-400">If True</span>
                        </div>
                        <select
                          value={getNodeBranches(activeNode).find(b => b.value === 'true')?.target || ''}
                          onChange={(e) => {
                            const newTarget = e.target.value;
                            setEdges(prev => prev.filter(edge => !(edge.source === activeNodeId && edge.sourceHandle === 'true')));
                            if (newTarget) {
                              setEdges(prev => [...prev, { id: `e-${activeNodeId}-true-${newTarget}`, source: activeNodeId, sourceHandle: 'true', target: newTarget }]);
                            }
                            updateNodeConfig(activeNodeId, (config) => ({
                              ...config,
                              branches: (config.branches || getNodeBranches(activeNode)).map(b => b.value === 'true' ? { ...b, target: newTarget || null } : b),
                            }));
                          }}
                          className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                          style={{ backgroundColor: "#140D1F", color: "white" }}
                        >
                          <option value="">Not connected</option>
                          {nodes.filter(n => n.id !== activeNodeId && n.type !== 'trigger').map(n => (
                            <option key={n.id} value={n.id}>{n.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-[2px] text-rose-400">If False</span>
                        </div>
                        <select
                          value={getNodeBranches(activeNode).find(b => b.value === 'false')?.target || ''}
                          onChange={(e) => {
                            const newTarget = e.target.value;
                            setEdges(prev => prev.filter(edge => !(edge.source === activeNodeId && edge.sourceHandle === 'false')));
                            if (newTarget) {
                              setEdges(prev => [...prev, { id: `e-${activeNodeId}-false-${newTarget}`, source: activeNodeId, sourceHandle: 'false', target: newTarget }]);
                            }
                            updateNodeConfig(activeNodeId, (config) => ({
                              ...config,
                              branches: (config.branches || getNodeBranches(activeNode)).map(b => b.value === 'false' ? { ...b, target: newTarget || null } : b),
                            }));
                          }}
                          className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-lg px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                          style={{ backgroundColor: "#140D1F", color: "white" }}
                        >
                          <option value="">Not connected</option>
                          {nodes.filter(n => n.id !== activeNodeId && n.type !== 'trigger').map(n => (
                            <option key={n.id} value={n.id}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                    </section>

                    <section className="p-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/5">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-indigo-400 mb-1">Condition Preview</p>
                      <p className="text-xs text-zinc-300 font-mono">
                        IF <span className="text-indigo-300">{activeNode.config?.field || 'user_input'}</span>{' '}
                        <span className="text-amber-300">{(activeNode.config?.operator || 'equals').replace('_', ' ')}</span>{' '}
                        {activeNode.config?.operator !== 'is_empty' && <span className="text-emerald-300">&quot;{activeNode.config?.compare_value || '...'}&quot;</span>}
                      </p>
                    </section>
                  </>
                )}

                {activeNode.type === 'action' && !isMultiPathNode(activeNode) && (
                  <section className="border-t border-white/5 pt-6 mt-2 pb-2">
                    <label className="text-[12px] font-regular text-white/65 tracking-wider block mb-2">Next Step Connection</label>
                    {edges.find(e => e.source === activeNodeId && !e.sourceHandle) ? (
                      <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 shadow-inner">
                        <div>
                          <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold mb-1">Connected To</p>
                          <p className="text-sm font-bold text-white truncate w-40">
                            {nodes.find(n => n.id === edges.find(e => e.source === activeNodeId && !e.sourceHandle)?.target)?.label || 'Unknown Node'}
                          </p>
                        </div>
                        <button
                          onClick={() => setEdges(prev => prev.filter(e => e.source !== activeNodeId))}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-4">
                        <p className="text-[11px] text-white/65 mb-3 font-medium">Select an existing step to connect this node to.</p>
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setEdges(prev => [...prev, {
                              id: `e-${activeNodeId}-default-${e.target.value}`,
                              source: activeNodeId,
                              sourceHandle: null,
                              target: e.target.value
                            }]);
                          }}
                          className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none cursor-pointer"
                        >
                          <option value="">-- Link to existing step --</option>
                         {nodes.filter(n =>
                            n.id !== activeNodeId &&
                            n.type !== 'trigger' &&
                            !edges.some(e => e.source === activeNodeId && e.target === n.id)
                          ).map(n => (
                            <option key={n.id} value={n.id}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>

          {activeNode.type !== 'trigger' && (
            <div className="px-5 py-4 border-t border-white/5">
              <button
                onClick={() => {
                  setDeleteStepModal({ open: true, nodeId: activeNodeId });
                }}
                className="w-full py-3 bg-[#27101A] hover:bg-rose-500/20 text-[#ffffff] hover:text-rose-300 transition-all rounded-xl text-xs font-medium border border-[#501527] border-[0.2px]"
              >
                Delete step
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
