'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Timer, Plus, Play, Upload, AlertCircle, Trash2, Bot,
  CheckCircle2, Sparkles, MessageSquare, HelpCircle, Filter, Split,
  ChevronRight, FileText, ArrowRight, Info, Check, Layers, Zap,
  Clock, Target, Briefcase, LifeBuoy, Link2, Unlink, CornerDownRight,
  Sliders, Eye, ShieldAlert, Cpu
} from 'lucide-react';
import {
  MAX_KEYWORDS,
  DEFAULT_MESSAGE_TYPE,
  MAX_BUTTONS,
  getNodeButtons,
  isMultiPathNode,
  isConditionNode,
  getNodeBranches,
  getHandleIdForButton,
  normalizeButtons,
  createDefaultButton,
  formatVariableName,
  formatDelay,
  getIcon
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
  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeNodeId) {
        setActiveNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNodeId, setActiveNodeId]);

  if (!activeNode) return null;

  const isTrigger = activeNode.type === 'trigger';
  const isAction = activeNode.type === 'action';
  const actionType = activeNode.config?.type || 'send_msg';
  const messageType = activeNode.config?.message_type || DEFAULT_MESSAGE_TYPE;
  const currentKeywords = activeNode.config?.keywords || [];
  const delayAmount = activeNode.config?.delay_amount || 0;
  const delayUnit = activeNode.config?.delay_unit || 'minutes';
  const delayLabel = formatDelay(delayAmount, delayUnit);

  // Determine current node icon and theme
  const getNodeTheme = () => {
    if (isTrigger) {
      return {
        name: 'Trigger Step',
        subName: 'Message Received Trigger',
        icon: Zap,
        iconBg: 'bg-gradient-to-r from-[#064e3b]/80 via-[#063327]/60 to-[#02130e]',
        glowColor: 'rgba(16, 185, 129, 0.15)',
        accentColor: '#10b981',
      };
    }
    if (actionType === 'brain_query') {
      return {
        name: 'AI Agent Step',
        subName: 'Intelligent AI Reply (Brain)',
        icon: Sparkles,
        iconBg: 'bg-gradient-to-r from-[#1e1b4b]/80 via-[#17143a]/60 to-[#080714]',
        glowColor: 'rgba(99, 102, 241, 0.15)',
        accentColor: '#6366f1',
      };
    }
    if (actionType === 'condition') {
      return {
        name: 'Decision Step',
        subName: 'Conditional Branch Logic',
        icon: Filter,
        iconBg: 'bg-gradient-to-r from-[#3b2a08]/80 via-[#261b05]/60 to-[#0d0902]',
        glowColor: 'rgba(245, 158, 11, 0.15)',
        accentColor: '#f59e0b',
      };
    }
    if (actionType === 'ask_question') {
      return {
        name: 'Question Step',
        subName: 'Ask User & Wait for Reply',
        icon: HelpCircle,
        iconBg: 'bg-gradient-to-r from-[#082f49]/80 via-[#062235]/60 to-[#020b12]',
        glowColor: 'rgba(14, 165, 233, 0.15)',
        accentColor: '#0ea5e9',
      };
    }
    return {
      name: 'Action Step',
      subName: 'Send WhatsApp Message',
      icon: MessageSquare,
      iconBg: 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40',
      glowColor: 'rgba(129, 74, 200, 0.15)',
      accentColor: '#814AC8',
    };
  };

  const theme = getNodeTheme();
  const HeaderIcon = theme.icon;

  // Handle switching action type
  const handleActionTypeChange = (newType) => {
    const labelMap = {
      send_msg: 'Send Message',
      brain_query: 'AI Reply',
      assign_agent: 'Assign Agent',
      ask_question: 'Ask Question',
      condition: 'Decision',
      move_stage: 'Move Deal',
      notification: 'Notify'
    };

    if (newType === 'condition') {
      updateNode(activeNodeId, (node) => ({
        ...node,
        label: 'Decision',
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
      if (activeNode.config?.type === 'condition') {
        setEdges((prev) => prev.filter((e) => !(e.source === activeNodeId && e.sourceHandle)));
      }
      updateNode(activeNodeId, (node) => ({
        ...node,
        label: labelMap[newType] || 'New Step',
        config: { ...(node.config || {}), type: newType }
      }));
    }
  };

  // Handle Message Type change
  const handleMessageTypeChange = (nextType) => {
    updateNodeConfig(activeNodeId, (config) => ({
      ...config,
      message_type: nextType,
      buttons: nextType === 'button_message'
        ? normalizeButtons(config.buttons?.length ? config.buttons : [createDefaultButton(0)])
        : [],
    }));
    if (nextType !== 'button_message') {
      setEdges((prev) => prev.filter((edge) => edge.source !== activeNodeId || !edge.sourceHandle));
    }
  };

  // Connected standard outgoing edge
  const directOutgoingEdge = edges.find((e) => e.source === activeNodeId && !e.sourceHandle);
  const connectedTargetNode = directOutgoingEdge
    ? nodes.find((n) => n.id === directOutgoingEdge.target)
    : null;

  return (
    <AnimatePresence>
      {activeNodeId && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-auto">
          {/* BACKGROUND OVERLAY: Lightly blurred & dimmed flow canvas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => {
              // Intentionally prevent accidental backdrop click dismissals
              e.stopPropagation();
            }}
            className="absolute inset-0 bg-black/65 backdrop-blur-[5px]"
          />

          {/* CENTER MODAL */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-[92vw] sm:w-[88vw] md:w-[85vw] lg:w-[80vw] max-w-5xl max-h-[88vh] bg-[#0E0F17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(129,74,200,0.12)] flex flex-col overflow-hidden text-left"
          >
            {/* ── 1. MODAL HEADER ── */}
            <div className="px-5 sm:px-7 py-4 border-b border-white/10 flex items-center justify-between bg-[#12131D]/90 backdrop-blur-md">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/15 text-white shrink-0 ${theme.iconBg}`}
                  style={{ boxShadow: `0 0 20px ${theme.glowColor}` }}
                >
                  <HeaderIcon size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                      {theme.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ID: #{activeNode.id}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-medium text-white truncate tracking-tight mt-0.5">
                    {activeNode.label || 'Step Configuration'}
                  </h2>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveNodeId(null)}
                  title="Close Configuration (ESC)"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── 2. SCROLLABLE CONTENT BODY ── */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6 custom-scrollbar bg-[#0E0F17]">
              
              {/* TOP ROW: Step Label & Common Renaming */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                      <span>Step Name</span>
                      <span className="text-violet-400 text-[10px] uppercase font-bold tracking-widest">(Flow Label)</span>
                    </label>
                    <p className="text-[11px] text-zinc-400">Descriptive name visible on canvas and logs</p>
                  </div>
                  <input
                    value={activeNode.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === activeNodeId ? { ...n, label: val } : n))
                      );
                    }}
                    placeholder="e.g. Welcome Message, Qualification, Order Confirmation..."
                    className="w-full sm:w-80 bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40 transition placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* ── TRIGGER CONFIGURATION ── */}
              {isTrigger && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Event & Match Settings */}
                  <div className="lg:col-span-5 space-y-5">
                    <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                        <Zap size={15} />
                        <span>Trigger Settings</span>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Trigger Event
                        </label>
                        <select
                          value={activeNode.config?.event || 'msg_recv'}
                          disabled
                          className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-not-allowed opacity-80"
                        >
                          <option value="msg_recv">Message Received</option>
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-1">Triggers automatically when a WhatsApp message arrives.</p>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Match Strategy
                        </label>
                        <select
                          value={activeNode.config?.match_type || 'word_match'}
                          onChange={(e) => updateNodeConfig(activeNodeId, { match_type: e.target.value })}
                          className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="word_match">Word Match (Recommended)</option>
                          <option value="contains">Contains anywhere</option>
                          <option value="exact">Exact Match</option>
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {activeNode.config?.match_type === 'exact'
                            ? 'Trigger requires an exact phrase match.'
                            : activeNode.config?.match_type === 'contains'
                            ? 'Trigger matches if the keyword appears anywhere in the message.'
                            : 'Trigger matches whole words cleanly.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Keywords */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Filter Keywords
                          </label>
                          <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            {currentKeywords.length} / {MAX_KEYWORDS}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addKeywordToTrigger(activeNodeId);
                            }
                          }}
                          placeholder="Type keyword (e.g. hi, pricing, start) & press Enter..."
                          className="flex-1 bg-[#0F101A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-emerald-500/60 transition shadow-inner placeholder:text-zinc-600"
                        />
                        <button
                          onClick={() => addKeywordToTrigger(activeNodeId)}
                          disabled={currentKeywords.length >= MAX_KEYWORDS || !keywordInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={16} />
                          <span>Add</span>
                        </button>
                      </div>

                      {/* Keyword Tags */}
                      {currentKeywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {currentKeywords.map((keyword) => (
                            <div
                              key={keyword}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shadow-sm"
                            >
                              <span className="text-xs font-semibold">{keyword}</span>
                              <button
                                onClick={() => removeKeywordFromTrigger(activeNodeId, keyword)}
                                className="text-emerald-400/70 hover:text-rose-400 transition"
                                title="Remove keyword"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-amber-500/25 bg-amber-500/10 p-4">
                          <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            No keywords configured
                          </p>
                          <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
                            This trigger will fire on <span className="font-semibold text-white">ALL incoming messages</span> unless you add specific keyword filters.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACTION CONFIGURATION ── */}
              {isAction && (
                <div className="space-y-6">
                  {/* Action Selector Bar + Delay Setting Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* Action Type Selector */}
                    <div className="lg:col-span-8 p-4 sm:p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3">
                      <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                        Action Type
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'send_msg', label: 'Send Message', icon: MessageSquare, color: 'text-white', activeBg: 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 border-white/20 ring-1 ring-violet-500/30' },
                          { id: 'brain_query', label: 'AI Reply', icon: Sparkles, color: 'text-white', activeBg: 'bg-gradient-to-r from-[#1e1b4b]/80 via-[#17143a]/60 to-[#080714] border-white/20 ring-1 ring-indigo-500/30' },
                          { id: 'ask_question', label: 'Ask Question', icon: HelpCircle, color: 'text-white', activeBg: 'bg-gradient-to-r from-[#082f49]/80 via-[#062235]/60 to-[#020b12] border-white/20 ring-1 ring-sky-500/30' },
                          { id: 'condition', label: 'Decision', icon: Filter, color: 'text-white', activeBg: 'bg-gradient-to-r from-[#3b2a08]/80 via-[#261b05]/60 to-[#0d0902] border-white/20 ring-1 ring-amber-500/30' },
                        ].map((item) => {
                          const isSelected = actionType === item.id;
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleActionTypeChange(item.id)}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? `${item.activeBg} text-white shadow-md`
                                  : 'bg-[#0F101A] border-white/5 text-zinc-400 hover:text-white hover:border-white/15'
                              }`}
                            >
                              <ItemIcon size={18} className={isSelected ? item.color : 'text-zinc-400'} />
                              <span className="text-center truncate w-full">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delay / Wait Timer */}
                    <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3">
                      <div className="flex items-center gap-2">
                        <Timer size={15} className="text-violet-400" />
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Delay Before Step
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={delayUnit === 'hours' ? 72 : delayUnit === 'minutes' ? 1440 : 86400}
                          value={delayAmount}
                          onChange={(e) =>
                            updateNodeConfig(activeNodeId, { delay_amount: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-20 bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white text-center outline-none focus:border-violet-500/60"
                        />
                        <select
                          value={delayUnit}
                          onChange={(e) => updateNodeConfig(activeNodeId, { delay_unit: e.target.value })}
                          className="flex-1 bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-violet-500/60 cursor-pointer"
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </div>
                      {delayAmount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium">
                          <Clock size={12} className="text-violet-400 shrink-0" />
                          <span>Waits {delayAmount} {delayUnit} before executing</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 2A. SEND MESSAGE CONFIGURATION ── */}
                  {actionType === 'send_msg' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Message Format & Uploads */}
                      <div className="lg:col-span-5 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                            Message Format
                          </label>
                          <select
                            value={messageType}
                            onChange={(e) => handleMessageTypeChange(e.target.value)}
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-violet-500/60 cursor-pointer"
                          >
                            <option value="text">Text Message</option>
                            <option value="button_message">Interactive Button Message</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                            <option value="document">Document / PDF</option>
                          </select>

                          {/* If Button Message: Variable Name */}
                          {messageType === 'button_message' && (
                            <div className="pt-2 border-t border-white/5 space-y-2">
                              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                Save Selection In Variable
                              </label>
                              <input
                                type="text"
                                value={activeNode.config?.variable_name || ''}
                                onChange={(e) =>
                                  updateNodeConfig(activeNodeId, {
                                    variable_name: formatVariableName(e.target.value),
                                  })
                                }
                                placeholder="e.g. selected_service, user_plan..."
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 placeholder:text-zinc-600"
                              />
                              <p className="text-[10px] text-zinc-400">
                                Clicked button label is stored in{' '}
                                <span className="text-violet-400 font-semibold">
                                  &#123;&#123;{activeNode.config?.variable_name || 'variable_name'}&#125;&#125;
                                </span>
                              </p>
                            </div>
                          )}

                          {/* Media Upload Dropzone */}
                          {['image', 'video', 'document'].includes(messageType) && (
                            <div className="pt-2 border-t border-white/5 space-y-3">
                              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                Media File
                              </label>
                              <div
                                className={`relative border-2 border-dashed rounded-2xl p-5 transition-all text-center ${
                                  isDragOver
                                    ? 'border-violet-400 bg-violet-500/10'
                                    : 'border-white/15 bg-white/[0.02] hover:border-white/30'
                                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                              >
                                {activeNode.config?.media_url ? (
                                  <div className="space-y-3">
                                    {previewUrl && messageType === 'image' && (
                                      <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full max-h-36 object-cover rounded-xl border border-white/10"
                                      />
                                    )}
                                    {messageType === 'video' && (
                                      <div className="flex items-center justify-center w-full h-28 bg-black/40 rounded-xl border border-white/10">
                                        <Play size={36} className="text-violet-400" />
                                      </div>
                                    )}
                                    {messageType === 'document' && (
                                      <div className="flex items-center justify-center w-full h-24 bg-white/5 rounded-xl border border-white/10">
                                        <FileText size={36} className="text-violet-400" />
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between pt-1">
                                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                                        <CheckCircle2 size={15} />
                                        <span>File attached</span>
                                      </div>
                                      <button
                                        onClick={clearUpload}
                                        className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                                      >
                                        Replace
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                                      <Upload size={18} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-white">
                                        {isDragOver ? 'Drop file here' : 'Drag & drop media file'}
                                      </p>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">
                                        JPG, PNG, MP4, PDF (max 10MB)
                                      </p>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*,video/*,application/pdf"
                                      onChange={handleFileSelect}
                                      className="hidden"
                                      id="modal-media-upload"
                                      disabled={uploading}
                                    />
                                    <label
                                      htmlFor="modal-media-upload"
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                    >
                                      <Upload size={13} />
                                      <span>Browse File</span>
                                    </label>
                                  </div>
                                )}

                                {uploading && (
                                  <div className="absolute inset-0 bg-black/75 rounded-2xl flex flex-col items-center justify-center p-4">
                                    <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mb-2" />
                                    <p className="text-xs text-white font-medium">Uploading...</p>
                                    {uploadProgress > 0 && (
                                      <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 max-w-[140px]">
                                        <div
                                          className="bg-violet-400 h-1.5 rounded-full transition-all"
                                          style={{ width: `${uploadProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {uploadError && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                                  <AlertCircle size={15} className="shrink-0" />
                                  <span>{uploadError}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Message Content & Buttons */}
                      <div className="lg:col-span-7 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                            {['image', 'video'].includes(messageType) ? 'Caption (Optional)' : 'Message Text'}
                          </label>
                          <textarea
                            value={activeNode.config?.text || ''}
                            onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                            rows={messageType === 'button_message' ? 3 : 5}
                            placeholder="Type your WhatsApp reply message here. Use {{variable_name}} for dynamic data..."
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-violet-500/60 transition shadow-inner placeholder:text-zinc-600 resize-y"
                          />

                          {/* Button Items Configuration */}
                          {messageType === 'button_message' && (
                            <div className="pt-3 border-t border-white/5 space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white uppercase tracking-wider">
                                  Interactive Buttons ({getNodeButtons(activeNode).length}/{MAX_BUTTONS})
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addButtonToNode(activeNodeId)}
                                  disabled={getNodeButtons(activeNode).length >= MAX_BUTTONS}
                                  className="px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 disabled:opacity-40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus size={14} />
                                  <span>Add Button</span>
                                </button>
                              </div>

                              <div className="space-y-3">
                                {getNodeButtons(activeNode).map((button, index) => (
                                  <div
                                    key={button.id}
                                    className="rounded-xl border border-white/10 bg-[#0F101A] p-3.5 space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
                                        Button #{index + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeButtonFromNode(activeNodeId, button.id)}
                                        className="text-zinc-500 hover:text-rose-400 p-1 transition cursor-pointer"
                                        title="Remove Button"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                                          Button Label
                                        </label>
                                        <input
                                          value={button.label}
                                          onChange={(e) =>
                                            updateButtonField(activeNodeId, button.id, 'label', e.target.value)
                                          }
                                          placeholder="e.g. Speak to Sales"
                                          className="w-full bg-[#141522] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                                          Payload Value
                                        </label>
                                        <input
                                          value={button.value}
                                          onChange={(e) =>
                                            updateButtonField(activeNodeId, button.id, 'value', e.target.value)
                                          }
                                          placeholder="e.g. speak_sales"
                                          className="w-full bg-[#141522] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60"
                                        />
                                      </div>
                                    </div>

                                    {/* Target Node Connector for this button */}
                                    <div className="pt-2 border-t border-white/5">
                                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                        Target Step When Tapped
                                      </label>
                                      <select
                                        value={button.target || ''}
                                        onChange={(e) => {
                                          const newTarget = e.target.value;
                                          setEdges((prev) => {
                                            const filtered = prev.filter(
                                              (edge) =>
                                                !(
                                                  edge.source === activeNodeId &&
                                                  edge.sourceHandle === button.value
                                                )
                                            );
                                            if (newTarget) {
                                              return [
                                                ...filtered,
                                                {
                                                  id: `e-${activeNodeId}-${button.value}-${newTarget}`,
                                                  source: activeNodeId,
                                                  sourceHandle: button.value,
                                                  target: newTarget,
                                                },
                                              ];
                                            }
                                            return filtered;
                                          });
                                          updateButtonField(
                                            activeNodeId,
                                            button.id,
                                            'target',
                                            newTarget || null
                                          );
                                        }}
                                        className="w-full bg-[#141522] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                                      >
                                        <option value="">-- Connect to next step --</option>
                                        {nodes
                                          .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                          .map((n) => (
                                            <option key={n.id} value={n.id}>
                                              {n.label} (ID: #{n.id})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next Step Connection (Standard single-path) */}
                          {messageType !== 'button_message' && (
                            <div className="pt-3 border-t border-white/5 space-y-2">
                              <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                                Next Step Connection
                              </label>
                              {connectedTargetNode ? (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 border border-violet-500/25">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <CornerDownRight size={16} className="text-white shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-white font-medium uppercase tracking-wider">
                                        Flow continues to:
                                      </p>
                                      <p className="text-xs font-medium text-white truncate">
                                        {connectedTargetNode.label} (ID: #{connectedTargetNode.id})
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setEdges((prev) =>
                                        prev.filter((e) => e.source !== activeNodeId)
                                      )
                                    }
                                    className="px-2.5 py-1.5 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] hover:bg-gradient-to-r hover:from-[#5c0a0a]/90 hover:via-[#3a0505]/70 hover:to-[#140303] text-white border border-rose-500/20 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Unlink size={13} />
                                    <span>Unlink</span>
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    setEdges((prev) => [
                                      ...prev,
                                      {
                                        id: `e-${activeNodeId}-default-${e.target.value}`,
                                        source: activeNodeId,
                                        sourceHandle: null,
                                        target: e.target.value,
                                      },
                                    ]);
                                  }}
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 outline-none focus:border-violet-500/60 cursor-pointer"
                                >
                                  <option value="">-- Connect to next flow step --</option>
                                  {nodes
                                    .filter(
                                      (n) =>
                                        n.id !== activeNodeId &&
                                        n.type !== 'trigger' &&
                                        !edges.some((e) => e.source === activeNodeId && e.target === n.id)
                                    )
                                    .map((n) => (
                                      <option key={n.id} value={n.id}>
                                        {n.label} (ID: #{n.id})
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 2B. AI REPLY (BRAIN QUERY) CONFIGURATION ── */}
                  {actionType === 'brain_query' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Agent Persona & Options */}
                      <div className="lg:col-span-5 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                            Agent Type
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'lead_agent', label: 'Lead Qualifier', emoji: '🎯', desc: 'Collects contact info, requirements & budget' },
                              { value: 'sales_agent', label: 'Sales Rep', emoji: '💼', desc: 'Answers pricing, product questions & demos' },
                              { value: 'support_agent', label: 'Support Agent', emoji: '🛟', desc: 'Resolves technical issues & knowledge queries' },
                            ].map(({ value, label, emoji, desc }) => {
                              const isSelected = (activeNode.config?.agent_type || 'lead_agent') === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => updateNodeConfig(activeNodeId, { agent_type: value })}
                                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-[#1e1b4b]/80 via-[#17143a]/60 to-[#080714] border-indigo-500/60 text-white ring-1 ring-indigo-500/30'
                                      : 'bg-[#0F101A] border-white/5 text-white/50 hover:border-white/20'
                                  }`}
                                >
                                  <span className="text-xl">{emoji}</span>
                                  <span className="truncate w-full text-center">{label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Business Type */}
                          {activeNode.config?.agent_type !== 'support_agent' && (
                            <div className="pt-2 border-t border-white/5">
                              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                                Industry / Domain
                              </label>
                              <select
                                value={activeNode.config?.business_type || 'saas'}
                                onChange={(e) => updateNodeConfig(activeNodeId, { business_type: e.target.value })}
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
                              >
                                <option value="saas">SaaS / Software</option>
                                <option value="ecommerce">E-Commerce</option>
                                <option value="healthcare">Healthcare</option>
                                <option value="education">Education</option>
                                <option value="real_estate">Real Estate</option>
                                <option value="finance">Finance</option>
                                <option value="other">General / Other</option>
                              </select>
                            </div>
                          )}

                          {/* Options Checkboxes */}
                          {activeNode.config?.agent_type !== 'support_agent' && (
                            <div className="pt-2 border-t border-white/5 space-y-3">
                              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                Agent Capabilities
                              </label>
                              {[
                                { key: 'enable_demo_booking', label: 'Enable Demo Booking' },
                                ...(activeNode.config?.agent_type === 'sales_agent'
                                  ? [{ key: 'payment_enabled', label: 'Enable Payment Link' }]
                                  : []),
                              ].map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                  <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(activeNode.config?.[key])}
                                      onChange={() =>
                                        updateNodeConfig(activeNodeId, { [key]: !activeNode.config?.[key] })
                                      }
                                      className="w-4 h-4 rounded border-white/20 bg-[#0F101A] text-indigo-500 focus:ring-indigo-500/40 cursor-pointer"
                                    />
                                    <span className="text-xs text-zinc-200 font-medium">{label}</span>
                                  </label>
                                  {key === 'payment_enabled' && activeNode.config?.[key] && (
                                    <div className="pl-6">
                                      <input
                                        type="text"
                                        value={activeNode.config?.payment_link || ''}
                                        onChange={(e) =>
                                          updateNodeConfig(activeNodeId, { payment_link: e.target.value })
                                        }
                                        placeholder="Paste Stripe/Razorpay payment link..."
                                        className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Lead Fields or Knowledge Base Upload */}
                      <div className="lg:col-span-7 space-y-5">
                        {/* Lead Agent: Fields */}
                        {(activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type) && (
                          <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3">
                            <label className="text-xs font-bold text-white uppercase tracking-wider block">
                              Required Lead Qualifier Fields
                            </label>
                            <p className="text-[11px] text-zinc-400">
                              Comma-separated list of information the AI agent will converse to collect.
                            </p>
                            <textarea
                              value={activeNode.config?.lead_fields || ''}
                              onChange={(e) => updateNodeConfig(activeNodeId, { lead_fields: e.target.value })}
                              placeholder="e.g. full name, business email, monthly budget, timeline"
                              rows={4}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/60 placeholder:text-zinc-600 resize-none"
                            />
                          </div>
                        )}

                        {/* Sales or Support Agent: Knowledge Base */}
                        {['sales_agent', 'support_agent'].includes(activeNode.config?.agent_type) && (
                          <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                            <div>
                              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                                {activeNode.config?.agent_type === 'support_agent'
                                  ? 'Support Knowledge & FAQs'
                                  : 'Product Knowledge & Documentation'}
                              </label>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                Upload documents or paste text. The AI answers queries strictly based on this context.
                              </p>
                            </div>

                            {/* Dropzone */}
                            <div
                              className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                                isDragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 hover:border-white/30'
                              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleSalesDrop}
                            >
                              <div className="space-y-2">
                                <Upload size={22} className="text-indigo-400 mx-auto" />
                                <p className="text-xs text-white font-medium">Drag & drop document (.pdf, .txt, .docx, .md)</p>
                                <input
                                  type="file"
                                  accept=".pdf,.txt,.docx,.md"
                                  onChange={handleSalesFileSelect}
                                  className="hidden"
                                  id="modal-sales-file-upload"
                                  disabled={uploading}
                                />
                                <label
                                  htmlFor="modal-sales-file-upload"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <Upload size={12} />
                                  <span>Browse File</span>
                                </label>
                              </div>
                              {uploading && (
                                <div className="absolute inset-0 bg-black/75 rounded-2xl flex items-center justify-center">
                                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>

                            {/* Manual Text Knowledge Editor */}
                            {activeNode.config?.agent_type === 'sales_agent' && (
                              <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                  Or Add Quick Notes / Pricing FAQ
                                </label>
                                <textarea
                                  value={salesManualText}
                                  onChange={(e) => setSalesManualText(e.target.value)}
                                  placeholder="Type pricing tiers, refund policy, feature list, or custom notes..."
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500/60 outline-none resize-none h-20"
                                />
                                <div className="flex justify-end">
                                  <button
                                    onClick={handleSalesManualSave}
                                    disabled={uploading || !salesManualText.trim()}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                                  >
                                    {uploading ? 'Saving...' : 'Save Knowledge Note'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Render Attached Knowledge IDs */}
                            {(activeNode.config?.entry_ids || []).length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                  Attached Knowledge Sources
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {(activeNode.config?.entry_ids || []).map((id) => (
                                    <div
                                      key={id}
                                      className="flex items-center gap-2 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-lg text-indigo-300 text-xs"
                                    >
                                      <span>Doc #{id.substring(0, 8)}</span>
                                      <button
                                        onClick={() => removeSalesEntry(id)}
                                        className="hover:text-rose-400 transition"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Next Step Connection for AI Agent */}
                        <div className="p-4 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-2">
                          <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                            Next Step Connection
                          </label>
                          {connectedTargetNode ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#1e1b4b]/80 via-[#17143a]/60 to-[#080714] border border-indigo-500/25">
                              <div className="flex items-center gap-2 min-w-0">
                                <CornerDownRight size={16} className="text-white shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-white font-medium uppercase tracking-wider">
                                    Flow continues to:
                                  </p>
                                  <p className="text-xs font-semibold text-white truncate">
                                    {connectedTargetNode.label} (ID: #{connectedTargetNode.id})
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))
                                }
                                className="px-2.5 py-1.5 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] hover:bg-gradient-to-r hover:from-[#5c0a0a]/90 hover:via-[#3a0505]/70 hover:to-[#140303] text-white border border-rose-500/20 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                              >
                                <Unlink size={13} />
                                <span>Unlink</span>
                              </button>
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                setEdges((prev) => [
                                  ...prev,
                                  {
                                    id: `e-${activeNodeId}-default-${e.target.value}`,
                                    source: activeNodeId,
                                    sourceHandle: null,
                                    target: e.target.value,
                                  },
                                ]);
                              }}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 outline-none focus:border-indigo-500/60 cursor-pointer"
                            >
                              <option value="">-- Connect to next flow step --</option>
                              {nodes
                                .filter(
                                  (n) =>
                                    n.id !== activeNodeId &&
                                    n.type !== 'trigger' &&
                                    !edges.some((e) => e.source === activeNodeId && e.target === n.id)
                                )
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} (ID: #{n.id})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 2C. ASK QUESTION CONFIGURATION ── */}
                  {actionType === 'ask_question' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Input Type, Required, Timeout */}
                      <div className="lg:col-span-5 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                            Question Response Settings
                          </label>

                          <div>
                            <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                              Expected Input Type
                            </label>
                            <select
                              value={activeNode.config?.input_type || 'text'}
                              onChange={(e) =>
                                updateNodeConfig(activeNodeId, { input_type: e.target.value })
                              }
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-sky-500/60 cursor-pointer"
                            >
                              <option value="text">Text (Any message)</option>
                              <option value="email">Email Address</option>
                              <option value="number">Numeric value</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                            <div>
                              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                Timeout (Mins)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={1440}
                                value={activeNode.config?.timeout_minutes ?? 60}
                                onChange={(e) =>
                                  updateNodeConfig(activeNodeId, {
                                    timeout_minutes: Math.max(1, parseInt(e.target.value, 10) || 60),
                                  })
                                }
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white text-center outline-none focus:border-sky-500/60"
                              />
                            </div>
                            <div className="flex flex-col justify-end">
                              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-[#0F101A] cursor-pointer hover:bg-white/5 transition">
                                <input
                                  type="checkbox"
                                  checked={activeNode.config?.required ?? true}
                                  onChange={(e) =>
                                    updateNodeConfig(activeNodeId, { required: e.target.checked })
                                  }
                                  className="w-4 h-4 rounded border-white/20 bg-transparent text-sky-500 focus:ring-sky-500/40 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-white">Required</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Question Prompt & Variable */}
                      <div className="lg:col-span-7 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
                            <HelpCircle size={16} className="text-sky-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-sky-200/90 leading-relaxed">
                              Flow pauses and waits for the customer&apos;s reply before executing the next connected step.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1.5">
                              Question Text Prompt
                            </label>
                            <textarea
                              rows={3}
                              value={activeNode.config?.question ?? activeNode.config?.text ?? ''}
                              placeholder="e.g. What is your email address or company size?"
                              onChange={(e) =>
                                updateNodeConfig(activeNodeId, {
                                  question: e.target.value,
                                  text: e.target.value,
                                })
                              }
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-sky-500/60 transition shadow-inner placeholder:text-zinc-600 resize-none"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                              Save Answer In Variable
                            </label>
                            <input
                              type="text"
                              value={activeNode.config?.variable_name || ''}
                              onChange={(e) =>
                                updateNodeConfig(activeNodeId, {
                                  variable_name: formatVariableName(e.target.value),
                                })
                              }
                              placeholder="e.g. user_email, company_size..."
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-sky-500/60 placeholder:text-zinc-600"
                            />
                          </div>

                          {/* Next Step Connection */}
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                              Next Step Connection
                            </label>
                            {connectedTargetNode ? (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#082f49]/80 via-[#062235]/60 to-[#020b12] border border-sky-500/25">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CornerDownRight size={16} className="text-sky-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-white font-medium uppercase tracking-wider">
                                      Flow continues to:
                                    </p>
                                    <p className="text-xs font-semibold text-white truncate">
                                      {connectedTargetNode.label} (ID: #{connectedTargetNode.id})
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))
                                  }
                                  className="px-2.5 py-1.5 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] hover:bg-gradient-to-r hover:from-[#5c0a0a]/90 hover:via-[#3a0505]/70 hover:to-[#140303] text-white border border-rose-500/20 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Unlink size={13} />
                                  <span>Unlink</span>
                                </button>
                              </div>
                            ) : (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  setEdges((prev) => [
                                    ...prev,
                                    {
                                      id: `e-${activeNodeId}-default-${e.target.value}`,
                                      source: activeNodeId,
                                      sourceHandle: null,
                                      target: e.target.value,
                                    },
                                  ]);
                                }}
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 outline-none focus:border-sky-500/60 cursor-pointer"
                              >
                                <option value="">-- Connect to next flow step --</option>
                                {nodes
                                  .filter(
                                    (n) =>
                                      n.id !== activeNodeId &&
                                      n.type !== 'trigger' &&
                                      !edges.some((e) => e.source === activeNodeId && e.target === n.id)
                                  )
                                  .map((n) => (
                                    <option key={n.id} value={n.id}>
                                      {n.label} (ID: #{n.id})
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 2D. DECISION / IF-ELSE CONDITION CONFIGURATION ── */}
                  {actionType === 'condition' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Logic Rule Setup */}
                      <div className="lg:col-span-6 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                            <Filter size={15} />
                            <span>Condition Logic Rule</span>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                              Condition Field
                            </label>
                            <select
                              value={activeNode.config?.field || 'user_input'}
                              onChange={(e) => updateNodeConfig(activeNodeId, { field: e.target.value })}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500/60 cursor-pointer"
                            >
                              <option value="user_input">User Input (Last Message)</option>
                              <option value="user_reply">User Reply (from Ask Question)</option>
                              <option value="user_name">User Name</option>
                              <option value="user_email">User Email</option>
                              <option value="last_ai_response">Last AI Response</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                                Operator
                              </label>
                              <select
                                value={activeNode.config?.operator || 'equals'}
                                onChange={(e) => updateNodeConfig(activeNodeId, { operator: e.target.value })}
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60 cursor-pointer"
                              >
                                <option value="equals">Equals (==)</option>
                                <option value="not_equals">Not Equals (!=)</option>
                                <option value="contains">Contains</option>
                                <option value="is_empty">Is Empty</option>
                                <option value="greater_than">Greater Than (&gt;)</option>
                                <option value="less_than">Less Than (&lt;)</option>
                              </select>
                            </div>

                            {activeNode.config?.operator !== 'is_empty' && (
                              <div>
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                                  Compare Value
                                </label>
                                <input
                                  value={activeNode.config?.compare_value || ''}
                                  onChange={(e) =>
                                    updateNodeConfig(activeNodeId, { compare_value: e.target.value })
                                  }
                                  placeholder="e.g. yes, pricing, 100..."
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/60"
                                />
                              </div>
                            )}
                          </div>

                          {/* Live logic evaluation preview */}
                          <div className="p-3 rounded-xl border border-amber-500/20 bg-gradient-to-r from-[#3b2a08]/80 via-[#261b05]/60 to-[#0d0902">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-white mb-1">
                              Live Logic Rule Preview
                            </p>
                            <p className="text-xs text-zinc-200">
                              IF <span className="text-amber-300 font-semibold">{activeNode.config?.field || 'user_input'}</span>{' '}
                              <span className="text-white">{(activeNode.config?.operator || 'equals').replace('_', ' ')}</span>{' '}
                              {activeNode.config?.operator !== 'is_empty' && (
                                <span className="text-emerald-300 font-semibold">&quot;{activeNode.config?.compare_value || '...'}&quot;</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Branch Target Selectors */}
                      <div className="lg:col-span-6 space-y-5">
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <label className="text-xs font-bold text-white uppercase tracking-wider block">
                            Branch Routing Steps
                          </label>

                          {/* If True Branch */}
                          <div className="p-4 rounded-xl border border-white/20 bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08]" />
                              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                                If True (Condition Matches)
                              </span>
                            </div>
                            <select
                              value={
                                getNodeBranches(activeNode).find((b) => b.value === 'true')?.target || ''
                              }
                              onChange={(e) => {
                                const newTarget = e.target.value;
                                setEdges((prev) =>
                                  prev.filter(
                                    (edge) =>
                                      !(edge.source === activeNodeId && edge.sourceHandle === 'true')
                                  )
                                );
                                if (newTarget) {
                                  setEdges((prev) => [
                                    ...prev,
                                    {
                                      id: `e-${activeNodeId}-true-${newTarget}`,
                                      source: activeNodeId,
                                      sourceHandle: 'true',
                                      target: newTarget,
                                    },
                                  ]);
                                }
                                updateNodeConfig(activeNodeId, (config) => ({
                                  ...config,
                                  branches: (config.branches || getNodeBranches(activeNode)).map((b) =>
                                    b.value === 'true' ? { ...b, target: newTarget || null } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/60 cursor-pointer"
                            >
                              <option value="">-- Select step when TRUE --</option>
                              {nodes
                                .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} (ID: #{n.id})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* If False Branch */}
                          <div className="p-4 rounded-xl border border-white/20 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202]" />
                              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                                If False (Condition Fails)
                              </span>
                            </div>
                            <select
                              value={
                                getNodeBranches(activeNode).find((b) => b.value === 'false')?.target || ''
                              }
                              onChange={(e) => {
                                const newTarget = e.target.value;
                                setEdges((prev) =>
                                  prev.filter(
                                    (edge) =>
                                      !(edge.source === activeNodeId && edge.sourceHandle === 'false')
                                  )
                                );
                                if (newTarget) {
                                  setEdges((prev) => [
                                    ...prev,
                                    {
                                      id: `e-${activeNodeId}-false-${newTarget}`,
                                      source: activeNodeId,
                                      sourceHandle: 'false',
                                      target: newTarget,
                                    },
                                  ]);
                                }
                                updateNodeConfig(activeNodeId, (config) => ({
                                  ...config,
                                  branches: (config.branches || getNodeBranches(activeNode)).map((b) =>
                                    b.value === 'false' ? { ...b, target: newTarget || null } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500/60 cursor-pointer"
                            >
                              <option value="">-- Select step when FALSE --</option>
                              {nodes
                                .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} (ID: #{n.id})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 3. MODAL FOOTER ── */}
            <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-white/10 bg-[#12131D]/95 flex items-center justify-between gap-3">
              <div>
                {activeNode.type !== 'trigger' && (
                  <button
                    type="button"
                    onClick={() => setDeleteStepModal({ open: true, nodeId: activeNodeId })}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] hover:bg-gradient-to-r hover:from-[#5a0a0a]/90 hover:via-[#350505]/70 hover:to-[#120202] text-rose-300 border border-rose-500/25 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Trash2 size={14} className="text-white" />
                    <span>Delete Step</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#814AC8] to-[#9d5de8] hover:from-[#723bb3] hover:to-[#8c4ed6] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-violet-600/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={16} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
