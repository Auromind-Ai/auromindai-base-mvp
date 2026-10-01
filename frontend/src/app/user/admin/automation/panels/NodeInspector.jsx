'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Timer, Plus, Play, Upload, AlertCircle, Trash2, Bot,
  CheckCircle2, Sparkles, MessageSquare, HelpCircle, Filter, Split,
  ChevronRight, ChevronDown, FileText, ArrowRight, Info, Check, Layers, Zap,
  Clock, Target, Briefcase, LifeBuoy, Link2, Unlink, CornerDownRight,
  Sliders, Eye, ShieldAlert, Cpu, Search, Smile, Paperclip, Code,
  GripVertical, ExternalLink, Headphones, User, Building, DollarSign,
  CheckCheck
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

// Standard System & CRM Variables
const VARIABLE_CATEGORIES = [
  {
    id: 'contact',
    name: 'Contact',
    icon: User,
    items: [
      { label: 'First Name', token: 'customer_name', preview: 'Rahul' },
      { label: 'Last Name', token: 'last_name', preview: 'Sharma' },
      { label: 'Phone', token: 'phone', preview: '+91 98765 43210' },
      { label: 'Email', token: 'email', preview: 'rahul@example.com' },
    ],
  },
  {
    id: 'company',
    name: 'Company',
    icon: Building,
    items: [
      { label: 'Company Name', token: 'company_name', preview: 'Orbion Tech' },
      { label: 'Industry', token: 'industry', preview: 'Software' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: Briefcase,
    items: [
      { label: 'Lead Status', token: 'lead_status', preview: 'New' },
      { label: 'Lifecycle Stage', token: 'lifecycle_stage', preview: 'Qualified' },
      { label: 'Deal Value', token: 'deal_value', preview: '$2,500' },
    ],
  },
];

const QUICK_EMOJIS = ['👋', '😊', '🔥', '✨', '🚀', '💬', '📞', '📍', '❤️', '👍'];
const POPULAR_EMOJIS = QUICK_EMOJIS;

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
  // Reference to active text area for inserting variables / emojis
  const messageInputRef = useRef(null);
  const followUpInputRef = useRef(null);
  const questionInputRef = useRef(null);
  const activeTextareaRef = useRef(null);
  const followUpTextareaRef = useRef(null);

  // Variable panel state
  const [varSearch, setVarSearch] = useState('');
  const [openCategories, setOpenCategories] = useState({
    contact: true,
    company: true,
    crm: true,
    custom: true,
  });
  const [copiedVarToast, setCopiedVarToast] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiStage, setActiveEmojiStage] = useState(null);
  const [activeTextarea, setActiveTextarea] = useState('message'); // 'message' | 'followup' | 'question' | 'followup-N'

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

  const isTrigger = activeNode?.type === 'trigger';
  const isAction = activeNode?.type === 'action';
  const actionType = activeNode?.config?.type || 'send_msg';
  const messageType = activeNode?.config?.message_type || DEFAULT_MESSAGE_TYPE;
  const currentKeywords = activeNode?.config?.keywords || [];
  const delayAmount = activeNode?.config?.delay_amount || 0;
  const delayUnit = activeNode?.config?.delay_unit || 'minutes';
  const timeoutAmount = activeNode?.config?.timeout_amount ?? (activeNode?.config?.wait_timeout || 30);
  const timeoutUnit = activeNode?.config?.timeout_unit ?? 'seconds';
  const timeoutAction = activeNode?.config?.timeout_action ?? 'send_followup';
  const waitForResponse = activeNode?.config?.wait_for_response ?? true;
  const followUpText = activeNode?.config?.follow_up_message || '';
  const currentButtons = activeNode ? getNodeButtons(activeNode) : [];

  const timeoutsList = useMemo(() => {
    if (Array.isArray(activeNode?.config?.timeouts) && activeNode.config.timeouts.length > 0) {
      return activeNode.config.timeouts;
    }
    return [
      {
        id: 'timeout-1',
        timeout_amount: activeNode?.config?.timeout_amount ?? 30,
        timeout_unit: activeNode?.config?.timeout_unit ?? 'seconds',
        timeout_action: activeNode?.config?.timeout_action ?? 'send_followup',
        follow_up_message: activeNode?.config?.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊",
      }
    ];
  }, [
    activeNode?.config?.timeouts,
    activeNode?.config?.timeout_amount,
    activeNode?.config?.timeout_unit,
    activeNode?.config?.timeout_action,
    activeNode?.config?.follow_up_message
  ]);

  const updateTimeoutStage = useCallback((index, updates) => {
    updateNodeConfig(activeNodeId, (config = {}) => {
      const currentList = Array.isArray(config.timeouts) && config.timeouts.length > 0
        ? [...config.timeouts]
        : [
            {
              id: 'timeout-1',
              timeout_amount: config.timeout_amount ?? 30,
              timeout_unit: config.timeout_unit ?? 'seconds',
              timeout_action: config.timeout_action ?? 'send_followup',
              follow_up_message: config.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊",
            }
          ];

      const updated = currentList.map((t, idx) => (idx === index ? { ...t, ...updates } : t));
      const first = updated[0] || {};
      return {
        ...config,
        timeouts: updated,
        timeout_amount: first.timeout_amount ?? 30,
        timeout_unit: first.timeout_unit ?? 'seconds',
        timeout_action: first.timeout_action ?? 'send_followup',
        follow_up_message: first.follow_up_message ?? '',
      };
    });
  }, [activeNodeId, updateNodeConfig]);

  const addTimeoutStage = useCallback(() => {
    updateNodeConfig(activeNodeId, (config = {}) => {
      const currentList = Array.isArray(config.timeouts) && config.timeouts.length > 0
        ? [...config.timeouts]
        : [
            {
              id: 'timeout-1',
              timeout_amount: config.timeout_amount ?? 30,
              timeout_unit: config.timeout_unit ?? 'seconds',
              timeout_action: config.timeout_action ?? 'send_followup',
              follow_up_message: config.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊",
            }
          ];

      const nextIdx = currentList.length + 1;
      const newStage = {
        id: `timeout-${nextIdx}`,
        timeout_amount: nextIdx === 2 ? 60 : 30,
        timeout_unit: 'seconds',
        timeout_action: 'send_followup',
        follow_up_message: nextIdx === 2
          ? "No problem! You can contact us anytime when you're ready."
          : "Just checking in again!",
      };
      return {
        ...config,
        timeouts: [...currentList, newStage],
      };
    });
  }, [activeNodeId, updateNodeConfig]);

  const removeTimeoutStage = useCallback((index) => {
    updateNodeConfig(activeNodeId, (config = {}) => {
      const currentList = Array.isArray(config.timeouts) ? [...config.timeouts] : [];
      if (currentList.length <= 1) return config;
      const updated = currentList.filter((_, idx) => idx !== index);
      const first = updated[0] || {};
      return {
        ...config,
        timeouts: updated,
        timeout_amount: first.timeout_amount ?? 30,
        timeout_unit: first.timeout_unit ?? 'seconds',
        timeout_action: first.timeout_action ?? 'send_followup',
        follow_up_message: first.follow_up_message ?? '',
      };
    });
  }, [activeNodeId, updateNodeConfig]);

  const previewButtons = useMemo(() => {
    if (!activeNode) return [];
    const configured = getNodeButtons(activeNode);
    if (configured.length > 0) return configured;
    if (messageType === 'button_message') {
      return [
        { id: 'b1', label: 'Book Demo', value: 'demo' },
        { id: 'b2', label: 'View Pricing', value: 'pricing' },
        { id: 'b3', label: 'Talk to Sales', value: 'sales' }
      ];
    }
    return [];
  }, [activeNode, messageType]);

  // Scan flow for any dynamically defined variables (e.g. from ask_question or button_message)
  const flowDynamicVariables = useMemo(() => {
    const vars = [];
    (nodes || []).forEach(n => {
      if (n.config?.variable_name && n.config.variable_name.trim()) {
        vars.push({
          token: n.config.variable_name.trim(),
          label: `${n.label || 'Step'} Output`,
          category: 'flow',
        });
      }
    });
    return vars;
  }, [nodes]);

  // Filtered variables for search
  const filteredCategories = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    if (!q) return VARIABLE_CATEGORIES;

    return VARIABLE_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item => item.label.toLowerCase().includes(q) || item.token.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [varSearch]);

  const filteredDynamicVars = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    if (!q) return flowDynamicVariables;
    return flowDynamicVariables.filter(
      item => item.label.toLowerCase().includes(q) || item.token.toLowerCase().includes(q)
    );
  }, [flowDynamicVariables, varSearch]);

  const toggleCategory = (catId) => {
    setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Insert variable into active textarea & copy to clipboard
  const handleInsertVariable = (token) => {
    const tokenStr = `{{${token}}}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(tokenStr);
      }
    } catch (err) {}

    if (activeTextarea.startsWith('followup-')) {
      const stageIdx = parseInt(activeTextarea.replace('followup-', ''), 10);
      if (!isNaN(stageIdx)) {
        const stage = timeoutsList[stageIdx] || {};
        const currentVal = stage.follow_up_message || '';
        updateTimeoutStage(stageIdx, { follow_up_message: currentVal + tokenStr });
      }
    } else if (activeTextarea === 'followup') {
      const stage = timeoutsList[0] || {};
      const currentVal = stage.follow_up_message || activeNode?.config?.follow_up_message || '';
      updateTimeoutStage(0, { follow_up_message: currentVal + tokenStr });
    } else if (activeTextarea === 'question' || actionType === 'ask_question') {
      const el = questionInputRef.current || activeTextareaRef.current;
      let currentVal = activeNode?.config?.question ?? activeNode?.config?.text ?? '';
      if (el) {
        const start = el.selectionStart ?? currentVal.length;
        const end = el.selectionEnd ?? currentVal.length;
        const updated = currentVal.substring(0, start) + tokenStr + currentVal.substring(end);
        updateNodeConfig(activeNodeId, { question: updated, text: updated });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
        }, 0);
      } else {
        updateNodeConfig(activeNodeId, { question: currentVal + tokenStr, text: currentVal + tokenStr });
      }
    } else {
      const el = messageInputRef.current || activeTextareaRef.current;
      let currentVal = activeNode?.config?.text ?? '';
      if (el) {
        const start = el.selectionStart ?? currentVal.length;
        const end = el.selectionEnd ?? currentVal.length;
        const updated = currentVal.substring(0, start) + tokenStr + currentVal.substring(end);
        updateNodeConfig(activeNodeId, { text: updated });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
        }, 0);
      } else {
        updateNodeConfig(activeNodeId, { text: currentVal + tokenStr });
      }
    }

    setCopiedVarToast(token);
    setTimeout(() => setCopiedVarToast(null), 2500);
  };

  // Insert emoji into active textarea
  const handleInsertEmoji = (emoji) => {
    if (activeTextarea.startsWith('followup-')) {
      const stageIdx = parseInt(activeTextarea.replace('followup-', ''), 10);
      if (!isNaN(stageIdx)) {
        const stage = timeoutsList[stageIdx] || {};
        const currentVal = stage.follow_up_message || '';
        updateTimeoutStage(stageIdx, { follow_up_message: currentVal + emoji });
      }
    } else if (activeTextarea === 'followup') {
      const stage = timeoutsList[0] || {};
      const currentVal = stage.follow_up_message || activeNode?.config?.follow_up_message || '';
      updateTimeoutStage(0, { follow_up_message: currentVal + emoji });
    } else if (activeTextarea === 'question' || actionType === 'ask_question') {
      const el = questionInputRef.current || activeTextareaRef.current;
      let currentVal = activeNode?.config?.question ?? activeNode?.config?.text ?? '';
      if (el) {
        const start = el.selectionStart ?? currentVal.length;
        const end = el.selectionEnd ?? currentVal.length;
        const updated = currentVal.substring(0, start) + emoji + currentVal.substring(end);
        updateNodeConfig(activeNodeId, { question: updated, text: updated });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
      } else {
        updateNodeConfig(activeNodeId, { question: currentVal + emoji, text: currentVal + emoji });
      }
    } else {
      const el = messageInputRef.current || activeTextareaRef.current;
      let currentVal = activeNode?.config?.text ?? '';
      if (el) {
        const start = el.selectionStart ?? currentVal.length;
        const end = el.selectionEnd ?? currentVal.length;
        const updated = currentVal.substring(0, start) + emoji + currentVal.substring(end);
        updateNodeConfig(activeNodeId, { text: updated });
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
      } else {
        updateNodeConfig(activeNodeId, { text: currentVal + emoji });
      }
    }
    setShowEmojiPicker(false);
  };

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

  // Live preview text formatter (replaces {{customer_name}} with preview sample)
  const previewFormattedText = useMemo(() => {
    let raw = activeNode?.config?.text || '';
    if (actionType === 'ask_question') {
      raw = activeNode?.config?.question || activeNode?.config?.text || 'What is your query?';
    }
    if (!raw.trim()) {
      return 'Welcome to OrbionAgents! How can we help you today?';
    }
    return raw;
  }, [activeNode?.config?.text, activeNode?.config?.question, actionType]);

  // Connected standard outgoing edge
  const directOutgoingEdge = edges?.find((e) => e.source === activeNodeId && !e.sourceHandle);
  const connectedTargetNode = directOutgoingEdge
    ? nodes?.find((n) => n.id === directOutgoingEdge.target)
    : null;

  return (
    <AnimatePresence>
      {activeNode && activeNodeId && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-auto">
          {/* Light backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActiveNodeId(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
          />

          {/* MAIN MODAL CONTAINER (Matching Image Layout) */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="relative z-10 w-[95vw] max-w-6xl max-h-[92vh] bg-[#0E0F17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(129,74,200,0.12)] flex flex-col overflow-hidden text-left select-text cursor-auto"
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          >
            {/* ── 1. MODAL TOP HEADER ── */}
            <div className="px-6 py-4 border-b border-white/10 bg-[#12131D]/95 backdrop-blur-md space-y-3 select-text">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white flex items-center justify-center shadow-md shadow-violet-600/25 shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                      Edit Step
                    </h2>
                    <p className="text-xs text-white/60">
                      Configure this step and set how it works in your automation flow.
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  title="Close (ESC)"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ACTION TYPE SELECTOR TABS (Matching Image: Send Message, Ai Reply, Ask Question, Decision) */}
              {isAction && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'send_msg', label: 'Send Message', icon: MessageSquare },
                    { id: 'brain_query', label: 'Ai Reply', icon: Sparkles },
                    { id: 'ask_question', label: 'Ask Question', icon: HelpCircle },
                    { id: 'condition', label: 'Decision', icon: Split },
                  ].map((item) => {
                    const isSelected = actionType === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleActionTypeChange(item.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#814AC8] text-white border-violet-500/60 shadow-lg shadow-violet-600/30'
                            : 'bg-[#13141F] border-white/5 text-zinc-400 hover:text-white hover:border-white/15'
                        }`}
                      >
                        <ItemIcon size={15} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 2. MODAL BODY (TWO COLUMN LAYOUT) ── */}
            <div
              className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-[#0E0F17] select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* LEFT COLUMN: STEP CONFIGURATION (SECTIONS 1, 2, 3) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                  
                  {/* Step Label Renaming Input */}
                  <div className="p-3.5 rounded-xl bg-[#141522] border border-white/10 flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-zinc-300 shrink-0">
                      Step Label:
                    </label>
                    <input
                      value={activeNode.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === activeNodeId ? { ...n, label: val } : n))
                        );
                      }}
                      placeholder="e.g. Send Message, Welcome Step..."
                      className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
                    />
                  </div>

                  {/* Delay Before This Step (When Action Node) */}
                  {isAction && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#141522] border border-white/10 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Timer size={14} className="text-violet-400" />
                        <label className="text-xs font-semibold text-zinc-300">
                          Delay Before This Step
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="number"
                          min={0}
                          max={delayUnit === 'hours' ? 72 : delayUnit === 'minutes' ? 1440 : 86400}
                          value={delayAmount}
                          onChange={(e) =>
                            updateNodeConfig(activeNodeId, {
                              delay_amount: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-24 bg-[#0F101A] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white text-center outline-none focus:border-violet-500/60"
                        />
                        <select
                          value={delayUnit}
                          onChange={(e) =>
                            updateNodeConfig(activeNodeId, { delay_unit: e.target.value })
                          }
                          className="flex-1 bg-[#0F101A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </div>
                      {delayAmount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium">
                          <Timer size={12} className="text-violet-400 shrink-0" />
                          <span>
                            Wait {delayAmount} {delayUnit} before sending
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASE A: SEND MESSAGE ACTION */}
                  {isAction && actionType === 'send_msg' && (
                    <>
                      {/* Message Type Selector Row (Right below Step Label) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-2.5">
                        <label className="text-xs font-semibold text-zinc-300 block">
                          Message Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'text', label: 'Text Message', icon: MessageSquare },
                            { id: 'button_message', label: 'Button Message', icon: Layers },
                            { id: 'image', label: 'Image', icon: Eye },
                            { id: 'video', label: 'Video', icon: Play },
                            { id: 'document', label: 'Document / PDF', icon: FileText },
                          ].map((tab) => {
                            const isSelected = messageType === tab.id;
                            const TabIcon = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleMessageTypeChange(tab.id)}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 border-violet-500/60 text-white font-semibold shadow-md'
                                    : 'bg-[#0F101A] border-white/15 text-zinc-400 hover:text-white hover:border-white/15'
                                }`}
                              >
                                <TabIcon size={14} className={isSelected ? 'text-violet-400' : 'text-zinc-500'} />
                                <span className="truncate">{tab.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 1. If Text Message: Show Message Content */}
                      {messageType === 'text' && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-medium shrink-0">
                                1
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-white tracking-wide">
                                  Message Content
                                </h3>
                                <p className="text-xs text-white/60">
                                  Write the message you want to send to the customer.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (messageInputRef.current) {
                                  messageInputRef.current.focus();
                                } else if (activeTextareaRef.current) {
                                  activeTextareaRef.current.focus();
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Plus size={13} />
                              <span>Insert Variable</span>
                            </button>
                          </div>

                          {/* Message Textarea Container */}
                          <div className="rounded-xl border border-white/10 bg-[#0F101A] p-3 space-y-2 focus-within:border-violet-500/50 transition">
                            <textarea
                              ref={(el) => {
                                messageInputRef.current = el;
                                activeTextareaRef.current = el;
                              }}
                              onFocus={() => setActiveTextarea('message')}
                              value={activeNode.config?.text || ''}
                              onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                              rows={4}
                              placeholder="Hi {{customer_name}} 👋&#10;&#10;Welcome to OrbionAgents!&#10;How can we help you today?"
                              className="w-full bg-transparent border-0 text-sm text-white outline-none resize-none placeholder:text-zinc-600 leading-relaxed custom-scrollbar"
                            />

                            {/* Textarea Bottom Toolbar */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/5 relative">
                              <div className="flex items-center gap-1">
                                {/* Emoji Button */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                                    title="Add Emoji"
                                  >
                                    <Smile size={15} />
                                  </button>
                                  {showEmojiPicker && (
                                    <div className="absolute left-0 bottom-8 z-50 p-2 rounded-xl bg-[#141522] border border-white/10 shadow-xl flex items-center gap-1.5 flex-wrap w-56">
                                      {QUICK_EMOJIS.map(emoji => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => handleInsertEmoji(emoji)}
                                          className="w-7 h-7 rounded hover:bg-white/10 text-base flex items-center justify-center cursor-pointer transition"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Variable Token Button */}
                                <button
                                  type="button"
                                  onClick={() => handleInsertVariable('customer_name')}
                                  className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
                                  title="Quick Variable"
                                >
                                  &#123;&#125;
                                </button>
                              </div>

                              {/* Character Count */}
                              <div className="text-[11px] text-zinc-500">
                                {(activeNode.config?.text || '').length}/1024
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. If Button Message: Show Message Content & Buttons (Maximum 3) */}
                      {messageType === 'button_message' && (
                        <>
                          <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                  1
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-white tracking-wide">
                                    Message Content
                                  </h3>
                                  <p className="text-xs text-zinc-400">
                                    Write the message that appears above the interactive buttons.
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (messageInputRef.current) {
                                    messageInputRef.current.focus();
                                  } else if (activeTextareaRef.current) {
                                    activeTextareaRef.current.focus();
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <Plus size={13} />
                                <span>Insert Variable</span>
                              </button>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-[#0F101A] p-3 space-y-2 focus-within:border-violet-500/50 transition">
                              <textarea
                                ref={(el) => {
                                  messageInputRef.current = el;
                                  activeTextareaRef.current = el;
                                }}
                                onFocus={() => setActiveTextarea('message')}
                                value={activeNode.config?.text || ''}
                                onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                                rows={3}
                                placeholder="Hi {{customer_name}} 👋&#10;&#10;Please select an option below:"
                                className="w-full bg-transparent border-0 text-sm text-white outline-none resize-none placeholder:text-zinc-600 leading-relaxed custom-scrollbar"
                              />
                              <div className="flex items-center justify-between pt-2 border-t border-white/5 relative">
                                <div className="flex items-center gap-1">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                      className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                                      title="Add Emoji"
                                    >
                                      <Smile size={15} />
                                    </button>
                                    {showEmojiPicker && (
                                      <div className="absolute left-0 bottom-8 z-50 p-2 rounded-xl bg-[#141522] border border-white/10 shadow-xl flex items-center gap-1.5 flex-wrap w-56">
                                        {QUICK_EMOJIS.map(emoji => (
                                          <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => handleInsertEmoji(emoji)}
                                            className="w-7 h-7 rounded hover:bg-white/10 text-base flex items-center justify-center cursor-pointer transition"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertVariable('customer_name')}
                                    className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
                                    title="Quick Variable"
                                  >
                                    &#123;&#125;
                                  </button>
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {(activeNode.config?.text || '').length}/1024
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-medium shrink-0">
                                2
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-white tracking-wide">
                                  Buttons (Maximum 3)
                                </h3>
                                <p className="text-xs text-zinc-400">
                                  Add interactive buttons for customer to choose.
                                </p>
                              </div>
                            </div>

                            {/* Variable Store for Button Selection */}
                            <div className="p-3 rounded-xl bg-[#0F101A] border border-white/5 space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-400 block">
                                Save Selection As (Optional Variable)
                              </label>
                              <input
                                type="text"
                                value={activeNode.config?.variable_name || ''}
                                onChange={(e) =>
                                  updateNodeConfig(activeNodeId, {
                                    variable_name: formatVariableName(e.target.value),
                                  })
                                }
                                placeholder="e.g. requirement, selected_option..."
                                className="w-full bg-[#141522] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
                              />
                              <p className="text-[10px] text-zinc-500">
                                Tapped button label will be saved in{' '}
                                <span className="text-violet-400 font-semibold">
                                  &#123;&#123;{activeNode.config?.variable_name || 'variable_name'}&#125;&#125;
                                </span>
                              </p>
                            </div>

                            {/* Button Rows List */}
                            <div className="space-y-2.5">
                              {currentButtons.map((button, index) => (
                                <div
                                  key={button.id}
                                  className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-[#0F101A]"
                                >
                                  <GripVertical size={16} className="text-zinc-600 shrink-0" />
                                  <input
                                    value={button.label}
                                    onChange={(e) =>
                                      updateButtonField(activeNodeId, button.id, 'label', e.target.value)
                                    }
                                    placeholder={`Button ${index + 1}`}
                                    className="flex-1 bg-[#141522] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
                                  />
                                  <div className="w-44 shrink-0">
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
                                        updateButtonField(activeNodeId, button.id, 'target', newTarget || null);
                                      }}
                                      className="w-full bg-[#141522] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                                    >
                                      <option value="">Go to Flow...</option>
                                      {nodes
                                        .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                        .map((n) => (
                                          <option key={n.id} value={n.id}>
                                            {n.label}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeButtonFromNode(activeNodeId, button.id)}
                                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition cursor-pointer shrink-0"
                                    title="Delete Button"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* + Add Button (Max 3) */}
                            <button
                              type="button"
                              onClick={() => addButtonToNode(activeNodeId)}
                              disabled={currentButtons.length >= MAX_BUTTONS}
                              className="w-full py-2.5 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-white disabled:opacity-40 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Add Button (Max 3)</span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* 3. If Image / Video / Document: Show Media File Upload */}
                      {['image', 'video', 'document'].includes(messageType) && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-medium shrink-0">
                              1
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white tracking-wide">
                                Media File Upload ({messageType === 'document' ? 'Document / PDF' : messageType.toUpperCase()})
                              </h3>
                              <p className="text-xs text-zinc-400">
                                Upload {messageType === 'document' ? 'document/PDF' : messageType} to send to the customer on WhatsApp.
                              </p>
                            </div>
                          </div>

                          <div
                            className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                              isDragOver
                                ? 'border-violet-400 bg-violet-500/10'
                                : 'border-white/10 bg-[#0F101A] hover:border-white/20'
                            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                          >
                            {activeNode.config?.media_url ? (
                              <div className="space-y-3">
                                {(previewUrl || activeNode.config?.media_url) && messageType === 'image' && (
                                  <img
                                    src={previewUrl || activeNode.config?.media_url}
                                    alt="Preview"
                                    className="w-full max-h-48 object-cover rounded-lg border border-white/10"
                                  />
                                )}
                                {(previewUrl || activeNode.config?.media_url) && messageType === 'video' && (
                                  <div className="rounded-lg overflow-hidden border border-white/10 bg-black/60">
                                    <video
                                      src={previewUrl || activeNode.config?.media_url}
                                      controls
                                      className="w-full max-h-48 rounded-lg"
                                      playsInline
                                    />
                                  </div>
                                )}
                                {messageType === 'document' && (
                                  <div className="flex items-center justify-center w-full h-24 bg-white/5 rounded-lg">
                                    <FileText size={36} className="text-violet-400" />
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                                    <CheckCircle2 size={15} />
                                    <span>Media uploaded successfully</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={clearUpload}
                                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload size={24} className="text-violet-400 mx-auto" />
                                <p className="text-xs font-medium text-white">
                                  {isDragOver ? 'Drop file here' : `Drag & drop ${messageType} file or browse`}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {messageType === 'image' && 'Supports JPG, PNG (max 10MB)'}
                                  {messageType === 'video' && 'Supports MP4 (max 16MB)'}
                                  {messageType === 'document' && 'Supports PDF, DOCX (max 10MB)'}
                                </p>
                                <input
                                  type="file"
                                  accept={messageType === 'image' ? 'image/*' : messageType === 'video' ? 'video/*' : 'application/pdf'}
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  id="quick-file-upload"
                                  disabled={uploading}
                                />
                                <label
                                  htmlFor="quick-file-upload"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                                >
                                  <Upload size={13} />
                                  <span>Browse Files</span>
                                </label>
                              </div>
                            )}
                            {uploading && (
                              <div className="absolute inset-0 bg-black/75 rounded-xl flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>

                          {uploadError && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                              <AlertCircle size={14} />
                              <span>{uploadError}</span>
                            </div>
                          )}

                          {/* Caption for Image/Video/Document */}
                          <div className="space-y-1.5 pt-2 border-t border-white/5">
                            <label className="text-xs font-semibold text-zinc-400 block">
                              Caption (Optional)
                            </label>
                            <textarea
                              ref={(el) => {
                                messageInputRef.current = el;
                                activeTextareaRef.current = el;
                              }}
                              onFocus={() => setActiveTextarea('message')}
                              value={activeNode.config?.text || ''}
                              onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                              rows={2}
                              placeholder="Write a caption..."
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-violet-500/60 resize-none"
                            />
                            <div className="flex justify-end text-[10px] text-zinc-500">
                              {(activeNode.config?.text || '').length}/1024
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Single Path Next Step Connection */}
                      {messageType !== 'button_message' && (
                        <div className="p-4 rounded-xl bg-[#141522] border border-white/10 space-y-2">
                          <label className="text-xs font-semibold text-zinc-300 block">
                            Next Step Connection
                          </label>
                          {connectedTargetNode ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F101A] border border-violet-500/30">
                              <div className="flex items-center gap-2 min-w-0">
                                <CornerDownRight size={15} className="text-violet-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                                    Connected To:
                                  </p>
                                  <p className="text-xs font-semibold text-white truncate">
                                    {connectedTargetNode.label}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))
                                }
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                              >
                                Unlink
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-violet-500/60 cursor-pointer"
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
                                    {n.label}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      )}

                      {/* ── SECTION 3: WAIT FOR CUSTOMER RESPONSE ── */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                        {/* Section 3 Header with Toggle */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                              3
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white tracking-wide">
                                Wait for Customer Response
                              </h3>
                              <p className="text-xs text-zinc-400">
                                Continue the flow based on whether the customer replies or not.
                              </p>
                            </div>
                          </div>

                          {/* ON/OFF Switch */}
                          <button
                            type="button"
                            onClick={() =>
                              updateNodeConfig(activeNodeId, {
                                wait_for_response: !waitForResponse,
                              })
                            }
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                              waitForResponse ? 'bg-[#814AC8]' : 'bg-white/10'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                                waitForResponse ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {waitForResponse && (
                          <div className="space-y-4 pt-1">
                            {/* Stage 0 (First Timeout) */}
                            {(() => {
                              const stage0 = timeoutsList[0] || {
                                timeout_amount: timeoutAmount,
                                timeout_unit: timeoutUnit,
                                timeout_action: timeoutAction,
                                follow_up_message: followUpMessage,
                              };
                              const stage0Amount = stage0.timeout_amount ?? 30;
                              const stage0Unit = stage0.timeout_unit ?? 'seconds';
                              const stage0Action = stage0.timeout_action ?? 'send_followup';
                              const stage0Message = stage0.follow_up_message ?? '';

                              return (
                                <div className="space-y-3">
                                  {/* Timeout Row */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 font-medium">Timeout</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={stage0Unit === 'hours' ? 72 : stage0Unit === 'minutes' ? 1440 : 86400}
                                      value={stage0Amount}
                                      onChange={(e) =>
                                        updateTimeoutStage(0, {
                                          timeout_amount: parseInt(e.target.value, 10) || 30,
                                        })
                                      }
                                      className="w-20 bg-[#0F101A] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white text-center outline-none focus:border-violet-500/60"
                                    />
                                    <select
                                      value={stage0Unit}
                                      onChange={(e) =>
                                        updateTimeoutStage(0, { timeout_unit: e.target.value })
                                      }
                                      className="bg-[#0F101A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                                    >
                                      <option value="seconds">Seconds</option>
                                      <option value="minutes">Minutes</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>

                                  {/* Branch 1: If customer replies (Green Box) */}
                                  <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-[#0b1f18] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] text-white flex items-center justify-center border-white/20 shrink-0">
                                      <MessageSquare size={16} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-white">If customer replies</h4>
                                      <p className="text-[11px] text-white/80">Continue to next step (Cancel all pending timeouts)</p>
                                    </div>
                                  </div>

                                  {/* Branch 2: If no reply (Timeout Box) */}
                                  <div className="p-3.5 rounded-xl border border-rose-500/25 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] border border-white/20 text-white flex items-center justify-center shrink-0">
                                          <Clock size={16} />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-semibold text-white">If no reply (Timeout)</h4>
                                        </div>
                                      </div>

                                      <select
                                        value={stage0Action}
                                        onChange={(e) =>
                                          updateTimeoutStage(0, { timeout_action: e.target.value })
                                        }
                                        className="bg-[#140606] border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs text-rose-200 outline-none cursor-pointer"
                                      >
                                        <option value="send_followup">Send a follow-up message</option>
                                        <option value="end_flow">End Flow</option>
                                      </select>
                                    </div>

                                    {stage0Action === 'send_followup' && (
                                      <div className="relative rounded-xl border border-white/10 bg-[#0F101A] focus-within:border-rose-500/50 transition overflow-hidden">
                                        <textarea
                                          ref={(el) => {
                                            followUpInputRef.current = el;
                                            followUpTextareaRef.current = el;
                                          }}
                                          onFocus={() => setActiveTextarea('followup-0')}
                                          value={stage0Message}
                                          onChange={(e) =>
                                            updateTimeoutStage(0, { follow_up_message: e.target.value })
                                          }
                                          rows={2}
                                          placeholder="Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊"
                                          className="w-full bg-transparent p-3 text-xs font-medium text-white outline-none placeholder:text-zinc-600 resize-none"
                                        />
                                        <div className="px-3 py-1.5 border-t border-white/5 bg-[#12131D]/80 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 relative">
                                            <button
                                              type="button"
                                              onClick={() => setActiveEmojiStage(activeEmojiStage === 0 ? null : 0)}
                                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                                              title="Add Emoji"
                                            >
                                              <Smile size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveTextarea('followup-0');
                                                handleInsertVariable('customer_name');
                                              }}
                                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                                              title="Insert customer name"
                                            >
                                              &#123; &#125;
                                            </button>

                                            {activeEmojiStage === 0 && (
                                              <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#181926] border border-white/15 shadow-xl grid grid-cols-5 gap-1.5 z-30">
                                                {QUICK_EMOJIS.map((emoji) => (
                                                  <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => {
                                                      updateTimeoutStage(0, { follow_up_message: stage0Message + emoji });
                                                      setActiveEmojiStage(null);
                                                    }}
                                                    className="w-7 h-7 text-sm rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          <span className="text-[10px] text-zinc-500 font-mono">
                                            {stage0Message.length}/1024
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Subsequent Timeouts (Timeout #2, #3, etc.) */}
                            {timeoutsList.slice(1).map((stage, idx) => {
                              const stageIdx = idx + 1;
                              const stageAmount = stage.timeout_amount ?? 60;
                              const stageUnit = stage.timeout_unit ?? 'seconds';
                              const stageAction = stage.timeout_action ?? 'send_followup';
                              const stageMessage = stage.follow_up_message ?? '';

                              return (
                                <div
                                  key={stage.id || `timeout-${stageIdx}`}
                                  className="p-3.5 rounded-xl border border-rose-500/25 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] space-y-3"
                                >
                                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-rose-500/20">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                        <Clock size={13} />
                                      </div>
                                      <span className="text-xs font-bold text-rose-300">Timeout #{stageIdx + 1}</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => removeTimeoutStage(stageIdx)}
                                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400/70 hover:text-rose-300 transition cursor-pointer"
                                      title="Remove this timeout"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>

                                  {/* Wait Duration */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 font-medium">Wait</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={stageUnit === 'hours' ? 72 : stageUnit === 'minutes' ? 1440 : 86400}
                                      value={stageAmount}
                                      onChange={(e) =>
                                        updateTimeoutStage(stageIdx, {
                                          timeout_amount: parseInt(e.target.value, 10) || 30,
                                        })
                                      }
                                      className="w-20 bg-[#0F101A] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white text-center outline-none focus:border-violet-500/60"
                                    />
                                    <select
                                      value={stageUnit}
                                      onChange={(e) =>
                                        updateTimeoutStage(stageIdx, { timeout_unit: e.target.value })
                                      }
                                      className="bg-[#0F101A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                                    >
                                      <option value="seconds">Seconds</option>
                                      <option value="minutes">Minutes</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>

                                  {/* If no reply */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-rose-300">If no reply</span>
                                      <select
                                        value={stageAction}
                                        onChange={(e) =>
                                          updateTimeoutStage(stageIdx, { timeout_action: e.target.value })
                                        }
                                        className="bg-[#140606] border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs text-rose-200 outline-none cursor-pointer"
                                      >
                                        <option value="send_followup">Send a follow-up message</option>
                                        <option value="end_flow">End Flow</option>
                                      </select>
                                    </div>

                                    {stageAction === 'send_followup' && (
                                      <div className="relative rounded-xl border border-white/10 bg-[#0F101A] focus-within:border-rose-500/50 transition overflow-hidden">
                                        <textarea
                                          onFocus={() => setActiveTextarea(`followup-${stageIdx}`)}
                                          value={stageMessage}
                                          onChange={(e) =>
                                            updateTimeoutStage(stageIdx, { follow_up_message: e.target.value })
                                          }
                                          rows={2}
                                          placeholder="No problem! You can contact us anytime."
                                          className="w-full bg-transparent p-3 text-xs font-medium text-white outline-none placeholder:text-zinc-600 resize-none"
                                        />
                                        <div className="px-3 py-1.5 border-t border-white/5 bg-[#12131D]/80 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 relative">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setActiveEmojiStage(activeEmojiStage === stageIdx ? null : stageIdx)
                                              }
                                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                                            >
                                              <Smile size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveTextarea(`followup-${stageIdx}`);
                                                handleInsertVariable('customer_name');
                                              }}
                                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                                            >
                                              &#123; &#125;
                                            </button>

                                            {activeEmojiStage === stageIdx && (
                                              <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#181926] border border-white/15 shadow-xl grid grid-cols-5 gap-1.5 z-30">
                                                {QUICK_EMOJIS.map((emoji) => (
                                                  <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => {
                                                      updateTimeoutStage(stageIdx, {
                                                        follow_up_message: stageMessage + emoji,
                                                      });
                                                      setActiveEmojiStage(null);
                                                    }}
                                                    className="w-7 h-7 text-sm rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          <span className="text-[10px] text-zinc-500 font-mono">
                                            {stageMessage.length}/1024
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Another Timeout Button */}
                            {timeoutsList.length < 5 && (
                              <button
                                type="button"
                                onClick={addTimeoutStage}
                                className="px-3.5 py-2 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus size={14} />
                                <span>Add Another Timeout</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* CASE B: AI REPLY (BRAIN QUERY) ACTION */}
                  {isAction && actionType === 'brain_query' && (
                    <div className="space-y-5">
                      {/* Section 1: Persona */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            1
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white tracking-wide">
                              AI Agents
                            </h3>
                            <p className="text-xs text-white/60">
                              Choose the role and expertise of the AI assistant.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { value: 'lead_agent', label: 'Lead Qualifier', emoji: '🎯' },
                            { value: 'sales_agent', label: 'Sales Rep', emoji: '💼' },
                            { value: 'support_agent', label: 'Support Agent', emoji: '🛟' },
                          ].map(({ value, label, emoji }) => {
                            const isSelected = (activeNode.config?.agent_type || 'lead_agent') === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateNodeConfig(activeNodeId, { agent_type: value })}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 border-white/20 text-white ring-1 ring-violet-500/40'
                                    : 'bg-[#0F101A] border-white/5 text-zinc-400 hover:border-white/20'
                                }`}
                              >
                                <span className="text-xl">{emoji}</span>
                                <span className="truncate w-full text-center">{label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Industry / Business Type */}
                        {activeNode.config?.agent_type !== 'support_agent' && (
                          <div className="pt-2 border-t border-white/5 space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 block">
                              Industry / Business Domain
                            </label>
                            <select
                              value={activeNode.config?.business_type || 'saas'}
                              onChange={(e) => updateNodeConfig(activeNodeId, { business_type: e.target.value })}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
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

                        {/* Options */}
                        {activeNode.config?.agent_type !== 'support_agent' && (
                          <div className="pt-2 border-t border-white/5 space-y-3">
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
                                    className="w-4 h-4 rounded border-white/20 bg-[#0F101A] text-violet-500 focus:ring-violet-500/40 cursor-pointer"
                                  />
                                  <span className="text-xs text-zinc-200 font-medium">{label}</span>
                                </label>
                                {key === 'payment_enabled' && activeNode.config?.[key] && (
                                  <input
                                    type="text"
                                    value={activeNode.config?.payment_link || ''}
                                    onChange={(e) =>
                                      updateNodeConfig(activeNodeId, { payment_link: e.target.value })
                                    }
                                    placeholder="Paste Stripe / Razorpay payment link..."
                                    className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 ml-6"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Knowledge Base or Lead Fields */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            2
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white tracking-wide">
                              {activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type
                                ? 'Lead Qualifier Fields'
                                : 'Knowledge Base & Documents'}
                            </h3>
                            <p className="text-xs text-white/60">
                              {activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type
                                ? 'Specify fields the AI agent will collect from the user.'
                                : 'Upload knowledge documents or type quick FAQ details.'}
                            </p>
                          </div>
                        </div>

                        {/* Lead Agent Textarea */}
                        {(activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type) && (
                          <textarea
                            value={activeNode.config?.lead_fields || ''}
                            onChange={(e) => updateNodeConfig(activeNodeId, { lead_fields: e.target.value })}
                            placeholder="name, email, phone, budget, company"
                            rows={3}
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500/60 placeholder:text-zinc-600 resize-none"
                          />
                        )}

                        {/* Sales / Support Documents Upload */}
                        {['sales_agent', 'support_agent'].includes(activeNode.config?.agent_type) && (
                          <div className="space-y-3">
                            <div
                              className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                                isDragOver ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/20'
                              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleSalesDrop}
                            >
                              <div className="space-y-1.5">
                                <Upload size={18} className="text-violet-400 mx-auto" />
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
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <Upload size={12} />
                                  <span>Browse File</span>
                                </label>
                              </div>
                            </div>

                            {/* Manual Text */}
                            {activeNode.config?.agent_type === 'sales_agent' && (
                              <div className="space-y-2">
                                <textarea
                                  value={salesManualText}
                                  onChange={(e) => setSalesManualText(e.target.value)}
                                  placeholder="Type pricing tiers, refund policy, feature FAQ..."
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-violet-500/60 outline-none resize-none h-16"
                                />
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={handleSalesManualSave}
                                    disabled={uploading || !salesManualText.trim()}
                                    className="px-3 py-1 bg-[#814AC8] hover:bg-[#6a3bb8] text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                                  >
                                    {uploading ? 'Saving...' : 'Save Notes'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Attached Entries */}
                            {(activeNode.config?.entry_ids || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                {(activeNode.config?.entry_ids || []).map((id) => (
                                  <div
                                    key={id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-300 text-xs"
                                  >
                                    <span>Doc #{id.substring(0, 8)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeSalesEntry(id)}
                                      className="hover:text-rose-400 transition"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CASE C: ASK QUESTION ACTION */}
                  {isAction && actionType === 'ask_question' && (
                    <div className="space-y-5">
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            1
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                              Question Prompt & Variable
                            </h3>
                            <p className="text-xs text-zinc-400">
                              Flow pauses and waits for customer answer before proceeding.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-400 block">
                            Question Prompt
                          </label>
                          <textarea
                            ref={(el) => {
                              questionInputRef.current = el;
                              activeTextareaRef.current = el;
                            }}
                            onFocus={() => setActiveTextarea('question')}
                            rows={3}
                            value={activeNode.config?.question ?? activeNode.config?.text ?? ''}
                            placeholder="e.g. What is your email address or company size?"
                            onChange={(e) =>
                              updateNodeConfig(activeNodeId, {
                                question: e.target.value,
                                text: e.target.value,
                              })
                            }
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500/60 resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400 block">
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
                            placeholder="e.g. user_email, budget_range..."
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-violet-500/60"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                          <div>
                            <label className="text-xs font-semibold text-zinc-400 block mb-1">
                              Input Type
                            </label>
                            <select
                              value={activeNode.config?.input_type || 'text'}
                              onChange={(e) =>
                                updateNodeConfig(activeNodeId, { input_type: e.target.value })
                              }
                              className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                            >
                              <option value="text">Text (Any message)</option>
                              <option value="email">Email Address</option>
                              <option value="number">Numeric value</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-zinc-400 block mb-1">
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASE D: DECISION / CONDITION ACTION  */}
                  {isAction && actionType === 'condition' && (
                    <div className="space-y-5">
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            1
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                              Condition Logic Rule
                            </h3>
                            <p className="text-xs text-zinc-400">
                              Evaluate customer reply or variable to branch flow.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-zinc-400 block mb-1">
                              Condition Field
                            </label>
                            <select
                              value={activeNode.config?.field || 'user_input'}
                              onChange={(e) => updateNodeConfig(activeNodeId, { field: e.target.value })}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                            >
                              <option value="user_input">User Input (Last Message)</option>
                              <option value="user_name">User Name</option>
                              <option value="user_email">User Email</option>
                              <option value="last_ai_response">Last AI Response</option>
                              <option value="user_reply">User Reply (from Ask Question)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                                Operator
                              </label>
                              <select
                                value={activeNode.config?.operator || 'equals'}
                                onChange={(e) => updateNodeConfig(activeNodeId, { operator: e.target.value })}
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60 cursor-pointer"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="is_empty">Is Empty</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                              </select>
                            </div>
                            {activeNode.config?.operator !== 'is_empty' && (
                              <div>
                                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                                  Compare Value
                                </label>
                                <input
                                  value={activeNode.config?.compare_value || ''}
                                  onChange={(e) =>
                                    updateNodeConfig(activeNodeId, { compare_value: e.target.value })
                                  }
                                  placeholder="Value..."
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500/60"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branch Targets */}
                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <label className="text-xs font-semibold text-zinc-300 block">
                            Branch Connections
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* If True */}
                            <div className="p-3 rounded-xl border border-white/20 bg-gradient-to-r from-[#063b27]/80 via-[#032418]/60 to-[#020c08] space-y-1.5">
                              <span className="text-xs font-semibold text-white">If True (Match)</span>
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
                                className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500/60 cursor-pointer"
                              >
                                <option value="">Select step...</option>
                                {nodes
                                  .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                  .map((n) => (
                                    <option key={n.id} value={n.id}>
                                      {n.label}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* If False */}
                            <div className="p-3 rounded-xl border border-white/20 bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] space-y-1.5">
                              <span className="text-xs font-semibold text-white">If False (Fail)</span>
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
                                className="w-full bg-[#0F101A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-rose-500/60 cursor-pointer"
                              >
                                <option value="">Select step...</option>
                                {nodes
                                  .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                  .map((n) => (
                                    <option key={n.id} value={n.id}>
                                      {n.label}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASE E: TRIGGER NODE CONFIGURATION */}
                  {isTrigger && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          ⚡
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            Trigger Event & Keywords
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Configure how and when this automation flow triggers.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">
                            Trigger Event
                          </label>
                          <select
                            value={activeNode.config?.event || 'msg_recv'}
                            disabled
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none opacity-80"
                          >
                            <option value="msg_recv">Message Received</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">
                            Match Strategy
                          </label>
                          <select
                            value={activeNode.config?.match_type || 'word_match'}
                            onChange={(e) => updateNodeConfig(activeNodeId, { match_type: e.target.value })}
                            className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500/60 cursor-pointer"
                          >
                            <option value="word_match">Word Match (Recommended)</option>
                            <option value="contains">Contains anywhere</option>
                            <option value="exact">Exact Match</option>
                          </select>
                        </div>
                      </div>

                      {/* Keywords input */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-zinc-400 block">
                            Keywords Filter ({currentKeywords.length}/{MAX_KEYWORDS})
                          </label>
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
                            placeholder="Type keyword (e.g. hi, pricing, start) and press Enter..."
                            className="flex-1 bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500/60"
                          />
                          <button
                            type="button"
                            onClick={() => addKeywordToTrigger(activeNodeId)}
                            disabled={currentKeywords.length >= MAX_KEYWORDS || !keywordInput.trim()}
                            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
                          >
                            Add
                          </button>
                        </div>

                        {currentKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {currentKeywords.map((kw) => (
                              <div
                                key={kw}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs"
                              >
                                <span>{kw}</span>
                                <button
                                  type="button"
                                  onClick={() => removeKeywordFromTrigger(activeNodeId, kw)}
                                  className="text-emerald-400 hover:text-rose-400 transition"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                            No keywords configured. Trigger fires on ALL incoming messages.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: MESSAGE PREVIEW & VARIABLES */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                  
                  {/* ── TOP RIGHT: MESSAGE PREVIEW ── */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold text-white tracking-wide">
                          Message Preview
                        </h3>
                        <Info size={13} className="text-zinc-500" />
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 -mt-1">
                      This is how the message will look to your customers.
                    </p>

                    {/* WhatsApp-Style Dark Chat Screen */}
                    <div className="rounded-xl border border-white/10 bg-[#0B141A] p-3 space-y-2.5 min-h-[170px] flex flex-col justify-end">
                      {/* Sent WhatsApp Bubble */}
                      <div className="self-end max-w-[92%] rounded-xl rounded-tr-none bg-[#005C4B] p-3 text-white shadow-md space-y-1.5">
                        {/* Media Preview inside bubble if attached */}
                        {(previewUrl || activeNode.config?.media_url) && messageType === 'image' && (
                          <img
                            src={previewUrl || activeNode.config?.media_url}
                            alt="Media Preview"
                            className="w-full max-h-36 object-cover rounded-lg"
                          />
                        )}
                        {(previewUrl || activeNode.config?.media_url) && messageType === 'video' ? (
                          <div className="rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            <video
                              src={previewUrl || activeNode.config?.media_url}
                              controls
                              className="w-full max-h-36 rounded-lg"
                              playsInline
                            />
                          </div>
                        ) : messageType === 'video' ? (
                          <div className="flex items-center justify-center w-full h-20 bg-black/40 rounded-lg">
                            <Play size={24} className="text-white/80" />
                          </div>
                        ) : null}
                        {messageType === 'document' && (
                          <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg text-xs">
                            <FileText size={16} className="text-white/80" />
                            <span className="truncate">
                              {activeNode.config?.media_url ? activeNode.config.media_url.split('/').pop() : 'Document.pdf'}
                            </span>
                          </div>
                        )}

                        {/* Formatted Text */}
                        <p className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words">
                          {previewFormattedText}
                        </p>

                        {/* Timestamp & Double Checkmarks */}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-0.5">
                          <span>11:45 AM</span>
                          <CheckCheck size={13} className="text-[#53bdeb]" />
                        </div>
                      </div>

                      {/* WhatsApp Buttons Stack (Below Bubble) */}
                      {messageType === 'button_message' && currentButtons.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {currentButtons.map((btn, i) => (
                            <div
                              key={btn.id || i}
                              className="w-full py-2 px-3 rounded-lg bg-[#182229] hover:bg-[#202C33] border border-white/10 text-xs font-semibold text-[#53BDEB] text-center transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span>{btn.label || `Option ${i + 1}`}</span>
                              <ExternalLink size={12} className="opacity-70" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BOTTOM RIGHT: VARIABLES ACCORDION ── */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#141522] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold text-white tracking-wide">
                          Variables
                        </h3>
                        <Info size={13} className="text-zinc-500" />
                      </div>
                    </div>
                    <p className="text-[11px] text-white/60 -mt-1">
                      Click to insert variables into your message.
                    </p>

                    {/* Search Variables Input */}
                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type="text"
                        value={varSearch}
                        onChange={(e) => setVarSearch(e.target.value)}
                        placeholder="Search variables..."
                        className="w-full bg-[#0F101A] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60 placeholder:text-zinc-600"
                      />
                    </div>

                    {/* Variable Categories List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                      {filteredCategories.map((cat) => {
                        const CatIcon = cat.icon;
                        const isOpen = openCategories[cat.id] ?? true;
                        return (
                          <div
                            key={cat.id}
                            className="rounded-xl border border-white/5 bg-[#0F101A] overflow-hidden"
                          >
                            {/* Category Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <CatIcon size={14} className="text-violet-400" />
                                <span>{cat.name}</span>
                              </div>
                              <ChevronDown
                                size={14}
                                className={`text-zinc-500 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {/* Category Items */}
                            {isOpen && (
                              <div className="p-2 pt-0 space-y-1">
                                {cat.items.map((item) => (
                                  <button
                                    key={item.token}
                                    type="button"
                                    onClick={() => handleInsertVariable(item.token)}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-xs transition group cursor-pointer text-left"
                                  >
                                    <span className="text-zinc-300 group-hover:text-white font-medium">
                                      {item.label}
                                    </span>
                                    <span className="text-[11px] text-violet-400/90 group-hover:text-violet-300">
                                      &#123;&#123;{item.token}&#125;&#125;
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Custom Dynamic Flow Variables */}
                      {filteredDynamicVars.length > 0 && (
                        <div className="rounded-xl border border-white/5 bg-[#0F101A] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleCategory('custom')}
                            className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Code size={14} className="text-emerald-400" />
                              <span>Flow Variables</span>
                            </div>
                            <ChevronDown
                              size={14}
                              className={`text-zinc-500 transition-transform ${
                                openCategories.custom ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {openCategories.custom && (
                            <div className="p-2 pt-0 space-y-1">
                              {filteredDynamicVars.map((item) => (
                                <button
                                  key={item.token}
                                  type="button"
                                  onClick={() => handleInsertVariable(item.token)}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-xs transition group cursor-pointer text-left"
                                >
                                  <span className="text-zinc-300 group-hover:text-white font-medium">
                                    {item.label}
                                  </span>
                                  <span className="text-[11px] text-emerald-400/90 group-hover:text-emerald-300">
                                    &#123;&#123;{item.token}&#125;&#125;
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Copied/Inserted Toast Feedback */}
                    {copiedVarToast && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                        <Check size={13} />
                        <span>Inserted &#123;&#123;{copiedVarToast}&#125;&#125; into message</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* ── 3. MODAL FOOTER (Matching Image: Delete Step on left, Cancel & Save Step on right) ── */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#12131D]/95 flex items-center justify-between gap-3">
              <div>
                {activeNode.type !== 'trigger' && (
                  <button
                    type="button"
                    onClick={() => setDeleteStepModal({ open: true, nodeId: activeNodeId })}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3b0606]/80 via-[#240303]/60 to-[#0c0202] hover:bg-gradient-to-r hover:from-[#5a0a0a]/90 hover:via-[#350505]/70 hover:to-[#120202] text-white border border-[#501527] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Delete Step</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#814AC8] hover:bg-[#723bb3] text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={15} />
                  <span>Save Step</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
