'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Timer, Plus, Play, Upload, AlertCircle, Trash2, Bot,
  CheckCircle2, Sparkles, MessageSquare, HelpCircle, Filter, Split,
  ChevronRight, ChevronDown, FileText, ArrowRight, Info, Check, Layers, Zap,
  Clock, Target, Briefcase, LifeBuoy, Link2, Unlink, CornerDownRight,
  Sliders, Eye, ShieldAlert, Cpu, Search, Smile, Paperclip, Code,
  GripVertical, ExternalLink, Headphones, User, Building2, Copy
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

const VARIABLE_CATEGORIES = [
  {
    id: 'contact',
    name: 'Contact',
    icon: User,
    items: [
      { label: 'First Name', token: 'customer_name', previewVal: 'Rahul' },
      { label: 'Last Name', token: 'last_name', previewVal: 'Sharma' },
      { label: 'Phone', token: 'phone', previewVal: '+91 98765 43210' },
      { label: 'Email', token: 'email', previewVal: 'rahul@example.com' },
    ],
  },
  {
    id: 'company',
    name: 'Company',
    icon: Building2,
    items: [
      { label: 'Company Name', token: 'company_name', previewVal: 'Orbion Inc' },
      { label: 'Industry', token: 'industry', previewVal: 'Software / SaaS' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: Briefcase,
    items: [
      { label: 'Lead Status', token: 'lead_status', previewVal: 'Qualified' },
      { label: 'Lifecycle Stage', token: 'lifecycle_stage', previewVal: 'Opportunity' },
      { label: 'Deal Value', token: 'deal_value', previewVal: '$1,200' },
    ],
  },
];

const POPULAR_EMOJIS = ['👋', '😊', '🔥', '👍', '🚀', '❤️', '💡', '📞', '💬', '🤖', '⭐', '🎉', '💼', '🎯', '✨', '🤝'];

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

  // Variables search & category open state
  const [varSearch, setVarSearch] = useState('');
  const [openCategories, setOpenCategories] = useState({
    contact: true,
    company: true,
    crm: true,
    custom: true
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFollowUpEmoji, setShowFollowUpEmoji] = useState(false);
  const [activeEmojiStage, setActiveEmojiStage] = useState(null);
  const [activeTextarea, setActiveTextarea] = useState('message'); // 'message' | 'followup' | 'question' | 'followup-N'
  const [copiedVar, setCopiedVar] = useState(null);

  const messageInputRef = useRef(null);
  const followUpInputRef = useRef(null);
  const questionInputRef = useRef(null);

  const toggleCategory = (id) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Dynamic flow variables collection
  const dynamicVariables = useMemo(() => {
    const list = [];
    (nodes || []).forEach(n => {
      if (n.config?.variable_name) {
        list.push({
          label: `Saved in ${n.label || n.id}`,
          token: n.config.variable_name,
          previewVal: 'sample_value'
        });
      }
    });
    return list;
  }, [nodes]);

  // Filtered variables list
  const filteredCategories = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    return VARIABLE_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.token.toLowerCase().includes(q)
      )
    })).filter(cat => cat.items.length > 0 || !q);
  }, [varSearch]);

  const filteredDynamicVars = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    return dynamicVariables.filter(item =>
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.token.toLowerCase().includes(q)
    );
  }, [dynamicVariables, varSearch]);

  const isTrigger = activeNode?.type === 'trigger';
  const isAction = activeNode?.type === 'action';
  const actionType = activeNode?.config?.type || 'send_msg';
  const messageType = activeNode?.config?.message_type || DEFAULT_MESSAGE_TYPE;
  const currentKeywords = activeNode?.config?.keywords || [];
  const delayAmount = activeNode?.config?.delay_amount || 0;
  const delayUnit = activeNode?.config?.delay_unit || 'minutes';
  const delayLabel = formatDelay(delayAmount, delayUnit);

  // Wait for customer response state
  const waitForResponseEnabled = activeNode?.config?.wait_for_response !== false;
  const timeoutAmount = activeNode?.config?.timeout_amount ?? 30;
  const timeoutUnit = activeNode?.config?.timeout_unit ?? 'seconds';
  const timeoutAction = activeNode?.config?.timeout_action ?? 'send_followup';
  const followUpMessage = activeNode?.config?.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊";

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
    const currentList = Array.isArray(activeNode?.config?.timeouts) && activeNode.config.timeouts.length > 0
      ? [...activeNode.config.timeouts]
      : [
          {
            id: 'timeout-1',
            timeout_amount: activeNode?.config?.timeout_amount ?? 30,
            timeout_unit: activeNode?.config?.timeout_unit ?? 'seconds',
            timeout_action: activeNode?.config?.timeout_action ?? 'send_followup',
            follow_up_message: activeNode?.config?.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊",
          }
        ];

    const updated = currentList.map((t, idx) => (idx === index ? { ...t, ...updates } : t));
    const first = updated[0] || {};
    updateNodeConfig(activeNodeId, {
      timeouts: updated,
      timeout_amount: first.timeout_amount ?? 30,
      timeout_unit: first.timeout_unit ?? 'seconds',
      timeout_action: first.timeout_action ?? 'send_followup',
      follow_up_message: first.follow_up_message ?? '',
    });
  }, [activeNode?.config, activeNodeId, updateNodeConfig]);

  const addTimeoutStage = useCallback(() => {
    const currentList = Array.isArray(activeNode?.config?.timeouts) && activeNode.config.timeouts.length > 0
      ? [...activeNode.config.timeouts]
      : [
          {
            id: 'timeout-1',
            timeout_amount: activeNode?.config?.timeout_amount ?? 30,
            timeout_unit: activeNode?.config?.timeout_unit ?? 'seconds',
            timeout_action: activeNode?.config?.timeout_action ?? 'send_followup',
            follow_up_message: activeNode?.config?.follow_up_message ?? "Just checking if you'd like me to share more details about OrbionAgents? Let me know if you have any questions! 😊",
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
    const updated = [...currentList, newStage];
    updateNodeConfig(activeNodeId, {
      timeouts: updated,
    });
  }, [activeNode?.config, activeNodeId, updateNodeConfig]);

  const removeTimeoutStage = useCallback((index) => {
    const currentList = Array.isArray(activeNode?.config?.timeouts)
      ? [...activeNode.config.timeouts]
      : [];
    if (currentList.length <= 1) return;
    const updated = currentList.filter((_, idx) => idx !== index);
    const first = updated[0] || {};
    updateNodeConfig(activeNodeId, {
      timeouts: updated,
      timeout_amount: first.timeout_amount ?? 30,
      timeout_unit: first.timeout_unit ?? 'seconds',
      timeout_action: first.timeout_action ?? 'send_followup',
      follow_up_message: first.follow_up_message ?? '',
    });
  }, [activeNode?.config, activeNodeId, updateNodeConfig]);

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

  if (!activeNode) return null;

  // Insert variable into active textarea
  const handleInsertVariable = (token) => {
    const tokenStr = `{{${token}}}`;

    if (activeTextarea.startsWith('followup-')) {
      const stageIdx = parseInt(activeTextarea.replace('followup-', ''), 10);
      if (!isNaN(stageIdx)) {
        const stage = timeoutsList[stageIdx] || {};
        const currentVal = stage.follow_up_message || '';
        updateTimeoutStage(stageIdx, { follow_up_message: currentVal + tokenStr });
      }
    } else if (activeTextarea === 'followup') {
      const stage = timeoutsList[0] || {};
      const currentVal = stage.follow_up_message || activeNode.config?.follow_up_message || '';
      updateTimeoutStage(0, { follow_up_message: currentVal + tokenStr });
    } else if (activeTextarea === 'question' || actionType === 'ask_question') {
      let targetRef = questionInputRef;
      let currentVal = activeNode.config?.question ?? activeNode.config?.text ?? '';
      const el = targetRef.current;
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
      let targetRef = messageInputRef;
      let currentVal = activeNode.config?.text ?? '';
      const el = targetRef.current;
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

    setCopiedVar(token);
    setTimeout(() => setCopiedVar(null), 1800);
  };

  const handleInsertEmoji = (emoji, isFollowUp = false) => {
    const configKey = isFollowUp ? 'follow_up_message' : (actionType === 'ask_question' ? 'question' : 'text');
    const targetRef = isFollowUp ? followUpInputRef : (actionType === 'ask_question' ? questionInputRef : messageInputRef);
    const currentVal = isFollowUp
      ? (activeNode.config?.follow_up_message ?? '')
      : (actionType === 'ask_question' ? (activeNode.config?.question ?? activeNode.config?.text ?? '') : (activeNode.config?.text ?? ''));

    const el = targetRef.current;
    if (el) {
      const start = el.selectionStart ?? currentVal.length;
      const end = el.selectionEnd ?? currentVal.length;
      const updated = currentVal.substring(0, start) + emoji + currentVal.substring(end);
      if (configKey === 'question') {
        updateNodeConfig(activeNodeId, { question: updated, text: updated });
      } else {
        updateNodeConfig(activeNodeId, { [configKey]: updated });
      }
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      if (configKey === 'question') {
        updateNodeConfig(activeNodeId, { question: currentVal + emoji, text: currentVal + emoji });
      } else {
        updateNodeConfig(activeNodeId, { [configKey]: currentVal + emoji });
      }
    }
    if (isFollowUp) setShowFollowUpEmoji(false);
    else setShowEmojiPicker(false);
  };

  // Determine current node icon and theme
  const getNodeTheme = () => {
    if (isTrigger) {
      return {
        name: 'Trigger Step',
        subName: 'Message Received Trigger',
        icon: Zap,
        iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        glowColor: 'rgba(16, 185, 129, 0.15)',
        accentColor: '#10b981',
      };
    }
    if (actionType === 'brain_query') {
      return {
        name: 'AI Reply',
        subName: 'Intelligent AI Agent Reply (Brain)',
        icon: Sparkles,
        iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        glowColor: 'rgba(99, 102, 241, 0.15)',
        accentColor: '#6366f1',
      };
    }
    if (actionType === 'condition') {
      return {
        name: 'Decision',
        subName: 'Conditional Branch Logic',
        icon: Split,
        iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        glowColor: 'rgba(245, 158, 11, 0.15)',
        accentColor: '#f59e0b',
      };
    }
    if (actionType === 'ask_question') {
      return {
        name: 'Ask Question',
        subName: 'Ask User & Wait for Reply',
        icon: HelpCircle,
        iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        glowColor: 'rgba(14, 165, 233, 0.15)',
        accentColor: '#0ea5e9',
      };
    }
    return {
      name: 'Send Message',
      subName: 'Send WhatsApp Message',
      icon: MessageSquare,
      iconBg: 'bg-[#814AC8]/25 text-[#a87ff3] border-violet-500/30',
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

  // Dynamic preview text resolution
  const renderPreviewText = () => {
    let raw = '';
    if (actionType === 'send_msg') {
      raw = activeNode.config?.text || 'Hi {{customer_name}} 👋\n\nWelcome to OrbionAgents!\nHow can we help you today?';
    } else if (actionType === 'ask_question') {
      raw = activeNode.config?.question || activeNode.config?.text || 'Hi {{customer_name}}, what is your email address or business goal?';
    } else if (actionType === 'brain_query') {
      const agentType = activeNode.config?.agent_type || 'lead_agent';
      if (agentType === 'sales_agent') {
        raw = 'Hello {{customer_name}}! I would be delighted to explain our plans, pricing tiers, and arrange a custom live walkthrough.';
      } else if (agentType === 'support_agent') {
        raw = 'Hello! I am your AI Support Assistant. How can I assist you with your setup or troubleshooting today?';
      } else {
        raw = 'Hi {{customer_name}}! Thanks for reaching out to OrbionAgents. Could you share your company name and timeline?';
      }
    } else if (actionType === 'condition') {
      raw = `[Decision Step]: Evaluating {{${activeNode.config?.field || 'user_input'}}} ${activeNode.config?.operator || 'equals'} "${activeNode.config?.compare_value || 'yes'}"`;
    }

    // Replace variable tags with realistic preview values
    return raw
      .replace(/\{\{customer_name\}\}/gi, 'Rahul')
      .replace(/\{\{first_name\}\}/gi, 'Rahul')
      .replace(/\{\{last_name\}\}/gi, 'Sharma')
      .replace(/\{\{phone\}\}/gi, '+91 98765 43210')
      .replace(/\{\{email\}\}/gi, 'rahul@example.com')
      .replace(/\{\{company_name\}\}/gi, 'Orbion Inc')
      .replace(/\{\{industry\}\}/gi, 'SaaS')
      .replace(/\{\{lead_status\}\}/gi, 'Qualified')
      .replace(/\{\{lifecycle_stage\}\}/gi, 'Opportunity')
      .replace(/\{\{deal_value\}\}/gi, '$1,200');
  };

  return (
    <AnimatePresence>
      {activeNodeId && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-auto">
          {/* BACKGROUND OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
          />

          {/* CENTER MODAL */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-[95vw] sm:w-[92vw] lg:w-[90vw] max-w-6xl max-h-[92vh] bg-[#0E0F17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(129,74,200,0.15)] flex flex-col overflow-hidden text-left"
          >
            {/* ── 1. MODAL HEADER (Matching image layout) ── */}
            <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-white/10 bg-[#12131D]/95">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-violet-500/30 bg-[#814AC8]/20 text-[#a87ff3] shrink-0"
                    style={{ boxShadow: '0 0 20px rgba(129,74,200,0.2)' }}
                  >
                    <HeaderIcon size={20} className="text-[#c084fc]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                      Edit Step
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure this step and set how it works in your automation flow.
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setActiveNodeId(null)}
                  title="Close Configuration (ESC)"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ACTION TYPE SELECTOR TABS (Send Message, AI Reply, Ask Question, Decision) */}
              {isAction && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                  {[
                    { id: 'send_msg', label: 'Send Message', icon: MessageSquare },
                    { id: 'brain_query', label: 'AI Reply', icon: Sparkles },
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-[#814AC8] text-white shadow-lg shadow-violet-600/30'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
                        }`}
                      >
                        <ItemIcon size={15} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 2. SCROLLABLE CONTENT BODY (TWO COLUMNS) ── */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 custom-scrollbar bg-[#0E0F17]">
              
              {/* Optional Step Name Field */}
              <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-[#141522]/90 border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Step Name:</span>
                  <span className="text-[11px] text-zinc-400">(Flow Canvas Label)</span>
                </div>
                <input
                  value={activeNode.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === activeNodeId ? { ...n, label: val } : n))
                    );
                  }}
                  placeholder="e.g. Welcome Message, Qualification..."
                  className="w-full sm:w-80 bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white font-medium outline-none focus:border-violet-500/60 transition placeholder:text-zinc-600"
                />
              </div>

              {/* ── TRIGGER CONFIGURATION VIEW ── */}
              {isTrigger ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Keywords */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white uppercase tracking-wider">
                            Filter Keywords
                          </label>
                          <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            {currentKeywords.length} / {MAX_KEYWORDS}
                          </span>
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
                            placeholder="Type keyword & press Enter..."
                            className="flex-1 bg-[#0F101A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-emerald-500/60 transition placeholder:text-zinc-600"
                          />
                          <button
                            onClick={() => addKeywordToTrigger(activeNodeId)}
                            disabled={currentKeywords.length >= MAX_KEYWORDS || !keywordInput.trim()}
                            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={16} />
                            <span>Add</span>
                          </button>
                        </div>

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
                                  className="text-emerald-400/70 hover:text-rose-400 transition cursor-pointer"
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
                </div>
              ) : (
                /* ── ACTION STEP TWO-COLUMN LAYOUT (As in Image) ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* ─────────────────── LEFT COLUMN (Step Content) ─────────────────── */}
                  <div className="lg:col-span-7 xl:col-span-7 space-y-5 min-w-0">
                    
                    {/* ═══ 1. SEND MESSAGE CONFIGURATION ═══ */}
                    {actionType === 'send_msg' && (
                      <div className="space-y-5">
                        
                        {/* ── SECTION 1: Message Content ── */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                1
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-white">Message Content</h3>
                                <p className="text-[11px] text-zinc-400">Write the message you want to send to the customer.</p>
                              </div>
                            </div>

                            {/* + Insert Variable Quick Button */}
                            <button
                              type="button"
                              onClick={() => {
                                handleInsertVariable('customer_name');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={13} className="text-violet-400" />
                              <span>Insert Variable</span>
                            </button>
                          </div>

                          {/* Message Textarea Container */}
                          <div className="relative rounded-xl border border-white/10 bg-[#0F101A] focus-within:border-[#814AC8]/60 transition overflow-hidden">
                            <textarea
                              ref={messageInputRef}
                              onFocus={() => setActiveTextarea('message')}
                              value={activeNode.config?.text || ''}
                              onChange={(e) => updateNodeConfig(activeNodeId, { text: e.target.value })}
                              rows={4}
                              placeholder="Hi {{customer_name}} 👋&#10;&#10;Welcome to OrbionAgents!&#10;How can we help you today?"
                              className="w-full bg-transparent p-4 text-sm font-medium text-white outline-none placeholder:text-zinc-600 resize-none"
                            />

                            {/* Textarea Bottom Toolbar */}
                            <div className="px-4 py-2 border-t border-white/5 bg-[#12131D]/80 flex items-center justify-between">
                              <div className="flex items-center gap-2 relative">
                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker(prev => !prev)}
                                  title="Add Emoji"
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                                >
                                  <Smile size={16} />
                                </button>
                                <label
                                  htmlFor="modal-media-upload-icon"
                                  title="Attach Media"
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                                >
                                  <Paperclip size={16} />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleInsertVariable('customer_name')}
                                  title="Insert Variable"
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                                >
                                  &#123; &#125;
                                </button>

                                {/* Emoji Quick Picker Popover */}
                                {showEmojiPicker && (
                                  <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#181926] border border-white/15 shadow-xl grid grid-cols-8 gap-1.5 z-30">
                                    {POPULAR_EMOJIS.map(emoji => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleInsertEmoji(emoji, false)}
                                        className="w-7 h-7 text-sm rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <span className="text-[11px] text-zinc-500 font-mono">
                                {(activeNode.config?.text || '').length}/1024
                              </span>
                            </div>
                          </div>

                          {/* Hidden File Input for Paperclip */}
                          <input
                            type="file"
                            accept="image/*,video/*,application/pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="modal-media-upload-icon"
                            disabled={uploading}
                          />

                          {/* Message Type Selector Buttons */}
                          <div className="space-y-2 pt-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                              Message Type
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {[
                                { id: 'text', label: 'Text Message', icon: MessageSquare },
                                { id: 'button_message', label: 'Button Message', icon: Sliders },
                                { id: 'image', label: 'Image', icon: Upload },
                                { id: 'video', label: 'Video', icon: Play },
                                { id: 'document', label: 'Document / PDF', icon: FileText },
                              ].map(t => {
                                const isSelected = messageType === t.id;
                                const TIcon = t.icon;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleMessageTypeChange(t.id)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-[11px] font-medium transition cursor-pointer truncate ${
                                      isSelected
                                        ? 'bg-[#814AC8]/20 border-violet-500/50 text-white font-semibold ring-1 ring-violet-500/30'
                                        : 'bg-[#0F101A] border-white/5 text-zinc-400 hover:text-white hover:border-white/15'
                                    }`}
                                  >
                                    <TIcon size={14} className={isSelected ? 'text-violet-400' : 'text-zinc-500'} />
                                    <span className="truncate">{t.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Media Upload Dropzone if Image / Video / Document */}
                          {['image', 'video', 'document'].includes(messageType) && (
                            <div className="pt-2 border-t border-white/5 space-y-3">
                              <div
                                className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
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
                                  <div className="space-y-2">
                                    <Upload size={18} className="mx-auto text-violet-400" />
                                    <p className="text-xs font-semibold text-white">Drag & drop media file</p>
                                    <p className="text-[10px] text-zinc-400">JPG, PNG, MP4, PDF (max 10MB)</p>
                                    <input
                                      type="file"
                                      accept="image/*,video/*,application/pdf"
                                      onChange={handleFileSelect}
                                      className="hidden"
                                      id="modal-media-upload-body"
                                      disabled={uploading}
                                    />
                                    <label
                                      htmlFor="modal-media-upload-body"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                                    >
                                      <Upload size={13} />
                                      <span>Browse File</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* If Button Message: Save in variable */}
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
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-violet-500/60 placeholder:text-zinc-600"
                              />
                            </div>
                          )}
                        </div>

                        {/* ── SECTION 2: Buttons (Maximum 3) ── */}
                        {messageType === 'button_message' ? (
                          <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  2
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-white">
                                    Buttons (Maximum {MAX_BUTTONS})
                                  </h3>
                                  <p className="text-[11px] text-zinc-400">Add interactive buttons for customer to choose.</p>
                                </div>
                              </div>
                            </div>

                            {/* Button List Rows */}
                            <div className="space-y-2.5">
                              {getNodeButtons(activeNode).map((button, index) => (
                                <div
                                  key={button.id}
                                  className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-[#0F101A]"
                                >
                                  <GripVertical size={16} className="text-zinc-500 shrink-0 cursor-grab" />
                                  
                                  {/* Button Label Input */}
                                  <input
                                    value={button.label}
                                    onChange={(e) =>
                                      updateButtonField(activeNodeId, button.id, 'label', e.target.value)
                                    }
                                    placeholder={`Button #${index + 1} Label`}
                                    className="flex-1 min-w-0 bg-[#141522] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white outline-none focus:border-violet-500/60"
                                  />

                                  {/* Target Step Selector */}
                                  <div className="relative w-44 shrink-0">
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
                                      <option value="">Go to Flow / Step</option>
                                      {nodes
                                        .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                        .map((n) => (
                                          <option key={n.id} value={n.id}>
                                            {n.label} (ID: #{n.id})
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => removeButtonFromNode(activeNodeId, button.id)}
                                    className="p-2 text-zinc-500 hover:text-rose-400 transition cursor-pointer shrink-0 rounded-lg hover:bg-white/5"
                                    title="Remove Button"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add Button Row */}
                            {getNodeButtons(activeNode).length < MAX_BUTTONS && (
                              <button
                                type="button"
                                onClick={() => addButtonToNode(activeNodeId)}
                                className="w-full py-2.5 rounded-xl border border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5 hover:bg-violet-500/10 text-xs font-semibold text-violet-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Plus size={14} />
                                <span>Add Button (Max {MAX_BUTTONS})</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Standard Next Step Connection */
                          <div className="p-4 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                              Next Step Connection
                            </label>
                            {connectedTargetNode ? (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/10 border border-violet-500/25">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CornerDownRight size={16} className="text-violet-400 shrink-0" />
                                  <p className="text-xs font-medium text-white truncate">
                                    Flow continues to: <span className="font-semibold text-violet-300">{connectedTargetNode.label}</span>
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))
                                  }
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
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

                        {/* ── SECTION 3: Wait for Customer Response ── */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#814AC8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                3
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-white">Wait for Customer Response</h3>
                                <p className="text-[11px] text-zinc-400">Continue the flow based on whether the customer replies or not.</p>
                              </div>
                            </div>

                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={waitForResponseEnabled}
                                onChange={(e) =>
                                  updateNodeConfig(activeNodeId, { wait_for_response: e.target.checked })
                                }
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#814AC8]"></div>
                            </label>
                          </div>

                          {waitForResponseEnabled && (
                            <div className="space-y-4 pt-2">
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
                                        max={86400}
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
                                      </select>
                                    </div>

                                    {/* Branch 1: If customer replies (Green Box) */}
                                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-[#06241b]/70 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                          <MessageSquare size={14} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-emerald-300">If customer replies</p>
                                          <p className="text-[10px] text-emerald-400/80">Continue to next step (Cancel all pending timeouts)</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Branch 2: If no reply (Red / Timeout Box) */}
                                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-[#240c0c]/70 space-y-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                            <Clock size={14} />
                                          </div>
                                          <span className="text-xs font-semibold text-rose-300">If no reply (Timeout)</span>
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
                                            ref={followUpInputRef}
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
                                              >
                                                <Smile size={14} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleInsertVariable('customer_name')}
                                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                                              >
                                                &#123; &#125;
                                              </button>

                                              {activeEmojiStage === 0 && (
                                                <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#181926] border border-white/15 shadow-xl grid grid-cols-8 gap-1.5 z-30">
                                                  {POPULAR_EMOJIS.map((emoji) => (
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
                                    className="p-3.5 rounded-xl border border-rose-500/30 bg-[#240c0c]/70 space-y-3"
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
                                        max={86400}
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
                                                onClick={() => handleInsertVariable('customer_name')}
                                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                                              >
                                                &#123; &#125;
                                              </button>

                                              {activeEmojiStage === stageIdx && (
                                                <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#181926] border border-white/15 shadow-xl grid grid-cols-8 gap-1.5 z-30">
                                                  {POPULAR_EMOJIS.map((emoji) => (
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
                                  className="text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer pt-1"
                                >
                                  <Plus size={14} />
                                  <span>Add Another Timeout</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ═══ 2. AI REPLY (BRAIN QUERY) CONFIGURATION ═══ */}
                    {actionType === 'brain_query' && (
                      <div className="space-y-5">
                        {/* Section 1: Agent Persona */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              1
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white">AI Agent Persona</h3>
                              <p className="text-[11px] text-zinc-400">Select how the AI assistant will converse with customers.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
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
                                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-500/20 border-indigo-500/60 text-white ring-1 ring-indigo-500/30'
                                      : 'bg-[#0F101A] border-white/5 text-zinc-400 hover:border-white/20'
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
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500/60 cursor-pointer"
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

                          {/* Capabilities */}
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            {[
                              { key: 'enable_demo_booking', label: 'Enable Demo Booking' },
                              ...(activeNode.config?.agent_type === 'sales_agent'
                                ? [{ key: 'payment_enabled', label: 'Enable Payment Link' }]
                                : []),
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
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
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Knowledge Base or Lead Fields */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              2
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white">
                                {activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type
                                  ? 'Lead Qualifier Fields'
                                  : 'Knowledge Base & FAQs'}
                              </h3>
                            </div>
                          </div>

                          {(activeNode.config?.agent_type === 'lead_agent' || !activeNode.config?.agent_type) ? (
                            <textarea
                              value={activeNode.config?.lead_fields || ''}
                              onChange={(e) => updateNodeConfig(activeNodeId, { lead_fields: e.target.value })}
                              placeholder="e.g. full name, business email, monthly budget, timeline"
                              rows={3}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/60 placeholder:text-zinc-600 resize-none"
                            />
                          ) : (
                            <div className="space-y-3">
                              <div
                                className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition ${
                                  isDragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 hover:border-white/30'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleSalesDrop}
                              >
                                <Upload size={18} className="text-indigo-400 mx-auto mb-1" />
                                <p className="text-xs text-white font-medium">Drag & drop document (.pdf, .txt, .docx)</p>
                                <input
                                  type="file"
                                  accept=".pdf,.txt,.docx,.md"
                                  onChange={handleSalesFileSelect}
                                  className="hidden"
                                  id="modal-sales-file-upload-2"
                                  disabled={uploading}
                                />
                                <label
                                  htmlFor="modal-sales-file-upload-2"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer mt-2"
                                >
                                  <span>Browse File</span>
                                </label>
                              </div>

                              {activeNode.config?.agent_type === 'sales_agent' && (
                                <div className="space-y-2">
                                  <textarea
                                    value={salesManualText}
                                    onChange={(e) => setSalesManualText(e.target.value)}
                                    placeholder="Type pricing tiers, refund policy, feature list notes..."
                                    className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500/60 outline-none resize-none h-16"
                                  />
                                  <button
                                    onClick={handleSalesManualSave}
                                    disabled={uploading || !salesManualText.trim()}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                                  >
                                    Save Note
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Section 3: Next Step Connection */}
                        <div className="p-4 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-2">
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                            Next Step Connection
                          </label>
                          {connectedTargetNode ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                              <div className="flex items-center gap-2 min-w-0">
                                <CornerDownRight size={16} className="text-indigo-400 shrink-0" />
                                <p className="text-xs font-semibold text-white truncate">
                                  Flow continues to: {connectedTargetNode.label}
                                </p>
                              </div>
                              <button
                                onClick={() => setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/60 cursor-pointer"
                            >
                              <option value="">-- Connect to next flow step --</option>
                              {nodes
                                .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} (ID: #{n.id})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ═══ 3. ASK QUESTION CONFIGURATION ═══ */}
                    {actionType === 'ask_question' && (
                      <div className="space-y-5">
                        {/* Section 1: Question Prompt */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                1
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-white">Question Prompt</h3>
                                <p className="text-[11px] text-zinc-400">Ask the customer a question and collect their reply.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInsertVariable('customer_name')}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={13} className="text-sky-400" />
                              <span>Insert Variable</span>
                            </button>
                          </div>

                          <div className="relative rounded-xl border border-white/10 bg-[#0F101A] focus-within:border-sky-500/60 transition overflow-hidden">
                            <textarea
                              ref={questionInputRef}
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
                              className="w-full bg-transparent p-3 text-sm font-medium text-white outline-none placeholder:text-zinc-600 resize-none"
                            />
                            <div className="px-3 py-1.5 border-t border-white/5 bg-[#12131D]/80 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleInsertVariable('customer_name')}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer font-mono text-xs"
                              >
                                &#123; &#125;
                              </button>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {(activeNode.config?.question ?? activeNode.config?.text ?? '').length}/1024
                              </span>
                            </div>
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-sky-500/60 placeholder:text-zinc-600"
                            />
                          </div>
                        </div>

                        {/* Section 2: Response Settings */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              2
                            </div>
                            <h3 className="text-sm font-semibold text-white">Validation & Timeout</h3>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                Input Type
                              </label>
                              <select
                                value={activeNode.config?.input_type || 'text'}
                                onChange={(e) =>
                                  updateNodeConfig(activeNodeId, { input_type: e.target.value })
                                }
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500/60 cursor-pointer"
                              >
                                <option value="text">Text (Any message)</option>
                                <option value="email">Email Address</option>
                                <option value="number">Numeric value</option>
                              </select>
                            </div>
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
                          </div>
                        </div>

                        {/* Next Step Connection */}
                        <div className="p-4 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-2">
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                            Next Step Connection
                          </label>
                          {connectedTargetNode ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/25">
                              <div className="flex items-center gap-2 min-w-0">
                                <CornerDownRight size={16} className="text-sky-400 shrink-0" />
                                <p className="text-xs font-semibold text-white truncate">
                                  Flow continues to: {connectedTargetNode.label}
                                </p>
                              </div>
                              <button
                                onClick={() => setEdges((prev) => prev.filter((e) => e.source !== activeNodeId))}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-zinc-300 outline-none focus:border-sky-500/60 cursor-pointer"
                            >
                              <option value="">-- Connect to next flow step --</option>
                              {nodes
                                .filter((n) => n.id !== activeNodeId && n.type !== 'trigger')
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} (ID: #{n.id})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ═══ 4. DECISION / IF-ELSE CONDITION CONFIGURATION ═══ */}
                    {actionType === 'condition' && (
                      <div className="space-y-5">
                        {/* Section 1: Condition Logic Rule */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              1
                            </div>
                            <h3 className="text-sm font-semibold text-white">Condition Logic Rule</h3>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                              Condition Field
                            </label>
                            <select
                              value={activeNode.config?.field || 'user_input'}
                              onChange={(e) => updateNodeConfig(activeNodeId, { field: e.target.value })}
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500/60 cursor-pointer"
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
                                className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500/60 cursor-pointer"
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
                                  className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500/60"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 2: Branch Routing Steps */}
                        <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              2
                            </div>
                            <h3 className="text-sm font-semibold text-white">Branch Routing</h3>
                          </div>

                          {/* If True Branch */}
                          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-[#06241b]/70 space-y-2">
                            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                              If True (Condition Matches)
                            </span>
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/60 cursor-pointer"
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
                          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-[#240c0c]/70 space-y-2">
                            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider block">
                              If False (Condition Fails)
                            </span>
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
                              className="w-full bg-[#0F101A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500/60 cursor-pointer"
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
                    )}
                  </div>

                  {/* ─────────────────── RIGHT COLUMN (Message Preview & Variables) ─────────────────── */}
                  <div className="lg:col-span-5 xl:col-span-5 space-y-5 min-w-0 sticky top-0">
                    
                    {/* ═══ CARD 1: MESSAGE PREVIEW ═══ */}
                    <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">Message Preview</h3>
                          <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition cursor-help" />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 -mt-1">
                        This is how the message will look to your customers.
                      </p>

                      {/* WhatsApp Mockup Preview Screen */}
                      <div className="p-4 rounded-2xl bg-[#090B10] border border-white/10 shadow-inner relative overflow-hidden space-y-2.5">
                        
                        {/* WhatsApp Message Bubble */}
                        <div className="p-3.5 rounded-2xl rounded-tr-xs bg-[#005c4b]/90 border border-emerald-500/25 text-white shadow-md space-y-2 max-w-[96%] ml-auto">
                          
                          {/* Attached Media Preview */}
                          {['image', 'video', 'document'].includes(messageType) && (
                            <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10">
                              {previewUrl && messageType === 'image' ? (
                                <img src={previewUrl} alt="Attached" className="w-full max-h-32 object-cover" />
                              ) : messageType === 'image' ? (
                                <div className="p-4 text-center text-xs text-zinc-400">🖼️ Image Attached</div>
                              ) : messageType === 'video' ? (
                                <div className="p-4 text-center text-xs text-zinc-400">▶️ Video Message</div>
                              ) : (
                                <div className="p-4 text-center text-xs text-zinc-400">📄 PDF Document</div>
                              )}
                            </div>
                          )}

                          {/* Message Body Text */}
                          <div className="text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed">
                            {renderPreviewText()}
                          </div>

                          {/* Timestamp & Double Checkmarks */}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70 pt-0.5">
                            <span>11:45 AM</span>
                            <span className="text-sky-300 text-[11px]">✓✓</span>
                          </div>
                        </div>

                        {/* Interactive Buttons (Below Bubble) */}
                        {previewButtons.length > 0 && (
                          <div className="space-y-1.5 max-w-[96%] ml-auto">
                            {previewButtons.map((btn, idx) => (
                              <div
                                key={btn.id || idx}
                                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1F2C34]/90 hover:bg-[#2A3942] border border-white/10 text-xs font-semibold text-sky-400 shadow-sm transition"
                              >
                                <span className="truncate">{btn.label || `Option ${idx + 1}`}</span>
                                {idx === 2 ? (
                                  <Headphones size={13} className="text-zinc-400 shrink-0" />
                                ) : (
                                  <ExternalLink size={13} className="text-zinc-400 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ═══ CARD 2: VARIABLES ═══ */}
                    <div className="p-5 rounded-2xl bg-[#141522]/90 border border-white/8 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">Variables</h3>
                          <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition cursor-help" />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 -mt-1">
                        Click to insert variables into your message.
                      </p>

                      {/* Variable Search Bar */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={varSearch}
                          onChange={(e) => setVarSearch(e.target.value)}
                          placeholder="Search variables..."
                          className="w-full bg-[#0F101A] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-violet-500/60 placeholder:text-zinc-600 transition"
                        />
                      </div>

                      {/* Variable Groups Accordions */}
                      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {filteredCategories.map(cat => {
                          const isOpen = openCategories[cat.id] ?? true;
                          const CatIcon = cat.icon;
                          return (
                            <div key={cat.id} className="rounded-xl border border-white/5 bg-[#0F101A] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <CatIcon size={14} className="text-violet-400" />
                                  <span>{cat.name}</span>
                                </div>
                                <ChevronDown
                                  size={14}
                                  className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                />
                              </button>

                              {isOpen && (
                                <div className="p-2 pt-0 space-y-1">
                                  {cat.items.map(item => (
                                    <button
                                      key={item.token}
                                      type="button"
                                      onClick={() => handleInsertVariable(item.token)}
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-xs transition group cursor-pointer text-left"
                                    >
                                      <span className="text-zinc-300 group-hover:text-white font-medium">
                                        {item.label}
                                      </span>
                                      <span className="font-mono text-[11px] text-violet-400/80 group-hover:text-violet-300">
                                        &#123;&#123;{item.token}&#125;&#125;
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Flow Custom Variables */}
                        {filteredDynamicVars.length > 0 && (
                          <div className="rounded-xl border border-white/5 bg-[#0F101A] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleCategory('custom')}
                              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Code size={14} className="text-emerald-400" />
                                <span>Flow Variables</span>
                              </div>
                              <ChevronDown
                                size={14}
                                className={`text-zinc-500 transition-transform ${openCategories.custom ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {openCategories.custom && (
                              <div className="p-2 pt-0 space-y-1">
                                {filteredDynamicVars.map(item => (
                                  <button
                                    key={item.token}
                                    type="button"
                                    onClick={() => handleInsertVariable(item.token)}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-xs transition group cursor-pointer text-left"
                                  >
                                    <span className="text-zinc-300 group-hover:text-white font-medium">
                                      {item.label}
                                    </span>
                                    <span className="font-mono text-[11px] text-emerald-400/80 group-hover:text-emerald-300">
                                      &#123;&#123;{item.token}&#125;&#125;
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Insertion Confirmation Toast */}
                      {copiedVar && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                          <Check size={13} />
                          <span>Inserted &#123;&#123;{copiedVar}&#125;&#125; into active message</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 3. MODAL FOOTER (Matching Image: Delete Step on left, Cancel & Save Step on right) ── */}
            <div className="px-5 sm:px-7 py-4 border-t border-white/10 bg-[#12131D]/95 flex items-center justify-between gap-3">
              <div>
                {activeNode.type !== 'trigger' && (
                  <button
                    type="button"
                    onClick={() => setDeleteStepModal({ open: true, nodeId: activeNodeId })}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-zinc-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
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
