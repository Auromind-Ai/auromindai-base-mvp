'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Zap, MessageSquare, Users,
  CheckCircle2, Play, Save, MoreHorizontal, Sparkles,
  ChevronDown, ArrowDown, Shield, Bot, Send,
  Tag, Bell, Wand2, X, Split, Activity, MousePointer2, Trash2,
  Menu, ChevronLeft, Layers, Terminal, Cpu, Globe, Maximize,
  Settings, Database, Cloud, AlertCircle, Eye, EyeOff, Monitor,
  ZoomIn, ZoomOut, Upload, Timer, HelpCircle, FileText
} from 'lucide-react';
import api from '@/lib/api';
import { getToken, getWorkspaceIdFromToken, getUser } from '@/lib/auth';
import AskQuestionConfig from '@/components/AskQuestionConfig';


const MAX_BUTTONS = 3;
const DEFAULT_MESSAGE_TYPE = 'text';
const MAX_KEYWORDS = 10;

const TRIGGERS = [
  { id: 'msg_recv', label: 'Message Received', icon: MessageSquare, color: 'text-indigo-400' },
];

const ACTIONS = [
  { id: 'send_msg', label: 'Send Message', icon: Send },
  { id: 'assign_agent', label: 'Assign Agent', icon: Users },
  { id: 'brain_query', label: 'Brain Query', icon: Sparkles },
  { id: 'ask_question',  label: 'Ask Question',  icon: HelpCircle },
  { id: 'condition',     label: 'Decision',      icon: Filter },
  { id: 'move_stage', label: 'Move Deal', icon: Split },
  { id: 'notification', label: 'Notify', icon: Bell },
];

const getIcon = (type) => {
  const all = [...TRIGGERS, ...ACTIONS, { id: 'condition', icon: Filter }, { id: 'trigger', icon: Zap }];
  return all.find(i => i.id === type)?.icon || Bot;
};

const createDefaultButton = (index) => ({
  id: `button-${Date.now()}-${index}`,
  label: `Option ${index + 1}`,
  value: `option_${index + 1}`,
  target: null,
});

const normalizeButtons = (buttons = []) =>
  buttons.slice(0, MAX_BUTTONS).map((button, index) => ({
    id: button.id || `button-${index}`,
    label: button.label || '',
    value: button.value || '',
    target: button.target || null,
  }));

const getNodeButtons = (node) => {
  const config = node?.config || {};
  const messageType = config.message_type || DEFAULT_MESSAGE_TYPE;
  if (config.type !== 'send_msg' || !['button', 'button_message'].includes(messageType)) {
    return [];
  }
  return normalizeButtons(config.buttons || []);
};

const isButtonMessageNode = (node) => getNodeButtons(node).length > 0;

const isConditionNode = (node) => {
  const config = node?.config || {};
  return node?.type === 'action' && config.type === 'condition';
};

const getNodeBranches = (node) => {
  if (!isConditionNode(node)) return [];
  const config = node?.config || {};
  const branches = config.branches || [];
  if (branches.length >= 2) return branches;
  // Ensure at least true/false branches
  return [
    { id: 'branch-true', label: 'If True', value: 'true', target: null },
    { id: 'branch-false', label: 'If False', value: 'false', target: null },
  ];
};

const isMultiPathNode = (node) => isButtonMessageNode(node) || isConditionNode(node);

const getHandleIdForButton = (button, index) => button.value || button.id || `button-${index}`;

const buildOutgoingMap = (edges = []) => edges.reduce((acc, edge) => {
  if (!acc[edge.source]) acc[edge.source] = [];
  acc[edge.source].push(edge);
  return acc;
}, {});

const formatDelay = (amount, unit) => {
  if (!amount || amount === 0) return null;
  let u = unit;
  if (unit === 'hours') u = amount === 1 ? 'hr' : 'hrs';
  else if (unit === 'minutes') u = amount === 1 ? 'min' : 'mins';
  else if (unit === 'seconds') u = amount === 1 ? 'sec' : 'secs';
  return `${amount} ${u} delay`;
};

// Normalize trigger types: convert unsupported types to msg_recv
const normalizeTriggerType = (triggerType) => {
  const SUPPORTED_TRIGGERS = ['msg_recv'];
  return SUPPORTED_TRIGGERS.includes(triggerType) ? triggerType : 'msg_recv';
};

// Sanitize flow data to ensure all trigger types are supported
const sanitizeFlowData = (flow) => {
  if (!flow) return flow;

  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  // Identify which nodes are multi-path (button or condition)
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const multiPathNodeIds = new Set(
    nodes
      .filter(node => isMultiPathNode(node))
      .map(n => n.id)
  );

  // For non-multi-path nodes: strip sourceHandle + keep only ONE outgoing edge
  const seenSources = new Set();
  const sanitizedEdges = edges.reduce((acc, edge) => {
    if (multiPathNodeIds.has(edge.source)) {
      // Multi-path nodes can have multiple sourceHandle edges — keep as-is
      acc.push(edge);
    } else {
      // Non-multi-path nodes: only ONE outgoing edge, no sourceHandle
      if (!seenSources.has(edge.source)) {
        seenSources.add(edge.source);
        acc.push({ ...edge, sourceHandle: null });
      }
      // Extra edges from the same source are dropped silently
    }
    return acc;
  }, []);

  return {
    ...flow,
    trigger_type: normalizeTriggerType(flow.trigger_type),
    nodes: nodes.map(node => {
      if (node.type === 'trigger' && node.config?.event) {
        return {
          ...node,
          config: { ...node.config, event: normalizeTriggerType(node.config.event) },
        };
      }
      return node;
    }),
    edges: sanitizedEdges,
  };
};
const validateFlowGraph = (nodes = [], edges = []) => {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const triggerNodes = nodes.filter((node) => node.type === 'trigger');
  const reachableNodeIds = new Set();
  const reachableEdgeIds = new Set();
  const disconnectedNodeIds = [];
  const outgoingMap = buildOutgoingMap(edges);

  if (triggerNodes.length === 0) {
    errors.push('A flow must include exactly one trigger.');
  } else if (triggerNodes.length > 1) {
    errors.push('Only one trigger is allowed per flow.');
  }

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Connection ${edge.id} points to a missing node.`);
    }
    if (edge.source === edge.target) {
      errors.push(`Connection ${edge.id} cannot point back to the same node.`);
    }
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (targetNode?.type === 'trigger') {
      errors.push(`Connection ${edge.id} cannot target the trigger.`);
    }
  });
 
  if (triggerNodes.length === 1) {
    const [triggerNode] = triggerNodes;
    if (nodes.length > 1 && !(outgoingMap[triggerNode.id] || []).length) {
      errors.push('The trigger must have at least one outgoing connection.');
    }
    const queue = [triggerNode.id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (reachableNodeIds.has(currentId)) continue;
      reachableNodeIds.add(currentId);
      (outgoingMap[currentId] || []).forEach((edge) => {
        reachableEdgeIds.add(edge.id);
        if (!reachableNodeIds.has(edge.target)) queue.push(edge.target);
      });
    }
  }

  nodes.forEach((node) => {
    if (node.type === 'action' && node.config?.type === 'send_msg') {
      const text = node.config?.text || '';
      const msgType = node.config?.message_type || 'text';
      const isMediaType = ['image', 'video', 'document'].includes(msgType);
      if (!isMediaType && !text.trim()) {
        errors.push(`Node "${node.label || node.id}" has no message text. Please add text before saving.`);
      }
      if (isMediaType && !(node.config?.media_url || '').trim()) {
        errors.push(`Node "${node.label || node.id}" has no media URL. Please add a URL before saving.`);
      }
      if (msgType === 'button_message') {
        const buttons = node.config?.buttons || [];
        if (buttons.length === 0) errors.push(`Node "${node.label || node.id}" is a button message but has no buttons.`);
        buttons.forEach((btn, i) => {
          if (!btn.label?.trim()) errors.push(`Button ${i + 1} in "${node.label}" has no label.`);
          if (!btn.value?.trim()) errors.push(`Button ${i + 1} in "${node.label}" has no value.`);
          if (!btn.target) errors.push(`Button "${btn.label || i + 1}" in "${node.label}" is not connected to any node.`);
        });
      }
    }

    const outgoingEdges = outgoingMap[node.id] || [];
    if (!outgoingEdges.length) return;

    if (!isMultiPathNode(node) && outgoingEdges.some((edge) => edge.sourceHandle)) {
      errors.push(`Node "${node.label || node.id}" uses branching but is not a button or condition node.`);
    }

    if (isConditionNode(node)) {
      const handles = new Set(outgoingEdges.filter(e => e.sourceHandle).map(e => e.sourceHandle));
      if (!handles.has('true') || !handles.has('false')) {
        errors.push(`Condition node "${node.label || node.id}" must have both "true" and "false" branches connected.`);
      }
    }
  });

  // Check for disconnected or unreachable nodes
  nodes.forEach((node) => {
    if (node.type === 'trigger') return;

    const isConnected = edges.some(
      (edge) => edge.source === node.id || edge.target === node.id
    );

    if (!isConnected) {
      disconnectedNodeIds.push(node.id);
    } else if (triggerNodes.length === 1 && !reachableNodeIds.has(node.id)) {
      disconnectedNodeIds.push(node.id);
    }
  });

  const uniqueDisconnectedNodeIds = [...new Set(disconnectedNodeIds)];
  if (uniqueDisconnectedNodeIds.length > 0) {
    const pluralSuffix = uniqueDisconnectedNodeIds.length > 1 ? 's are' : ' is';
    warnings.push(`${uniqueDisconnectedNodeIds.length} node${pluralSuffix} disconnected or unreachable from the trigger.`);
    errors.push('Every node must be connected to the trigger path before saving.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    reachableNodeIds,
    reachableEdgeIds,
    disconnectedNodeIds: new Set(uniqueDisconnectedNodeIds),
  };
};

export default function AutomationCanvas() {
  const [automations, setAutomations] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewNode, setPreviewNode] = useState(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [salesManualText, setSalesManualText] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');

  // ─── MODAL & TOAST STATE ───
  const [toasts, setToasts] = useState([]);
  const [deleteWireModal, setDeleteWireModal] = useState({ open: false, item: null, isDeleting: false });
  const [deleteStepModal, setDeleteStepModal] = useState({ open: false, nodeId: null });
  const [createWireModal, setCreateWireModal] = useState(false);
  const [createWireName, setCreateWireName] = useState('');

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const canvasOffsetRef = useRef(canvasOffset);
  useEffect(() => { canvasOffsetRef.current = canvasOffset; }, [canvasOffset]);

  const [wiringPreview, setWiringPreview] = useState(null);
  const wiringRef = useRef(null);
  const wireMoveListenerRef = useRef(null);
  const wireUpListenerRef = useRef(null);

  useEffect(() => () => {
    if (wireMoveListenerRef.current) {
      window.removeEventListener('pointermove', wireMoveListenerRef.current);
    }
    if (wireUpListenerRef.current) {
      window.removeEventListener('pointerup', wireUpListenerRef.current);
    }
    wiringRef.current = null;
  }, []);

  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const nodeHeightsRef = useRef({});
  const buttonOffsetsRef = useRef({});

  const [edgeTick, setEdgeTick] = useState(0);
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setEdgeTick(t => t + 1));
    return () => cancelAnimationFrame(id);
  }, [nodes, edges, zoom]);

  const getEdgePoints = useCallback((sourceNode, targetNode, sourceHandle) => {
    if (!gridRef.current) return null;
    const gridEl = gridRef.current;
    const sourceEl = gridEl.querySelector(`[data-node-id="${sourceNode.id}"]`);
    const targetEl = gridEl.querySelector(`[data-node-id="${targetNode.id}"]`);
    if (!sourceEl || !targetEl) return null;

    const gridRect = gridEl.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    let sx = (sourceRect.right - gridRect.left) / zoom;
    let sy = (sourceRect.top + sourceRect.height / 2 - gridRect.top) / zoom;

    if (sourceHandle) {
      // Check both button handles and condition branch handles
      const btnEl = sourceEl.querySelector(`[data-button-id="${sourceHandle}"]`) || sourceEl.querySelector(`[data-branch-id="${sourceHandle}"]`);
      if (btnEl) {
        const btnRect = btnEl.getBoundingClientRect();
        sy = (btnRect.top + btnRect.height / 2 - gridRect.top) / zoom;
      }
    }

    const tx = (targetRect.left - gridRect.left) / zoom;
    const ty = (targetRect.top + targetRect.height / 2 - gridRect.top) / zoom;

    return { sx, sy, tx, ty };
  }, [zoom, edgeTick,nodes]);

  useEffect(() => {
    setIsMounted(true);
    fetchFlows();
    const handleKeyDown = (e) => { if (e.code === 'Space') setIsSpacePressed(true); };
    const handleKeyUp = (e) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    }, []);
    const fetchFlows = async () => {
      try {
        const data = await api.getFlows();
      console.log('fetchFlows received:', data?.length, data);
      if (Array.isArray(data)) {
        const sanitizedFlows = data.map(sanitizeFlowData);
        setAutomations(sanitizedFlows);
        
        // Retrieve last selected flow ID from localStorage
        const savedId = localStorage.getItem("selected_wire_id");
        let itemToSelect = null;
        if (savedId) {
          itemToSelect = sanitizedFlows.find(a => a.id === savedId);
        }
        if (!itemToSelect && sanitizedFlows.length > 0) {
          itemToSelect = sanitizedFlows[0];
        }
        
        if (itemToSelect) {
          handleSelectAutomation(itemToSelect);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleSelectAutomation = async (item) => {
    if (!item) return;
    try {
      const freshItem = await api.getFlowById(item.id);
      const sanitizedItem = sanitizeFlowData(freshItem);
      setSelectedItem(sanitizedItem);
      setNodes(sanitizedItem.nodes || []);
      setEdges(sanitizedItem.edges || []);
      setActiveNodeId(null);
      setCanvasOffset({ x: 0, y: 0 });
      setZoom(1);
      setCurrentView('canvas');
      
      // Persist selection across page refreshes
      localStorage.setItem("selected_wire_id", item.id);
    } catch (e) {
      console.error("Failed to load flow config from API, falling back to local data:", e);
      const sanitizedItem = sanitizeFlowData(item);
      setSelectedItem(sanitizedItem);
      setNodes(sanitizedItem.nodes || []);
      setEdges(sanitizedItem.edges || []);
      setActiveNodeId(null);
      setCanvasOffset({ x: 0, y: 0 });
      setZoom(1);
      setCurrentView('canvas');
    }
  };

  const handleToggleStatus = async (flow) => {
    const newStatus = flow.status === 'Active' ? 'Draft' : 'Active';
    try {
      const updated = await api.saveFlow({
        id: flow.id,
        name: flow.name,
        trigger_type: flow.trigger_type || 'msg_recv',
        nodes: flow.nodes || [],
        edges: flow.edges || [],
        status: newStatus
      });
      setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
      if (selectedItem?.id === flow.id) {
        setSelectedItem(updated);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update status: " + e.message);
    }
  };

  const handleDuplicateFlow = async (flow) => {
    try {
      const newFlow = await api.saveFlow({
        name: `Copy of ${flow.name}`,
        trigger_type: flow.trigger_type || 'msg_recv',
        nodes: flow.nodes || [],
        edges: flow.edges || [],
        status: 'Draft'
      });
      setAutomations(prev => [...prev, newFlow]);
      alert(`Flow duplicated successfully as "Copy of ${flow.name}"!`);
    } catch (e) {
      console.error(e);
      alert("Failed to duplicate flow: " + e.message);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (!confirm("Are you sure you want to delete this flow? This action cannot be undone.")) return;
    try {
      await api.deleteFlow(flowId);
      setAutomations(prev => prev.filter(a => a.id !== flowId));
      if (selectedItem?.id === flowId) {
        setSelectedItem(null);
        setCurrentView('dashboard');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete flow: " + e.message);
    }
  };

  const handleCreateFlowSubmit = async () => {
    if (!newFlowName.trim()) return;
    try {
      const newFlow = await api.saveFlow({
        name: newFlowName.trim(),
        trigger_type: 'msg_recv',
        nodes: [
          { 
            id: '1', 
            type: 'trigger', 
            label: 'Init Trigger', 
            position: { x: 250, y: 200 }, 
            config: { event: 'msg_recv', match_type: 'word_match', keywords: [] } 
          }
        ],
        edges: [],
        status: 'Active'
      });
      setAutomations(prev => [...prev, newFlow]);
      setNewFlowName('');
      setIsCreateModalOpen(false);
      handleSelectAutomation(newFlow);
    } catch (e) {
      console.error(e);
      alert("Failed to create flow: " + e.message);
    }
  };

  // Keep zoom in a ref so node drag closure always reads latest zoom
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ─── NODE DRAG (native pointer events — no Framer conflict) ───
  const handleNodePointerDown = useCallback((e, nodeId) => {
    if (e.target.closest?.('[data-no-drag]')) return;
    e.stopPropagation();
    e.preventDefault();

    setActiveNodeId(nodeId);

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    let startX = 0;
    let startY = 0;
    setNodes(prev => {
      const n = prev.find(n => n.id === nodeId);
      if (n) { startX = n.position.x; startY = n.position.y; }
      return prev;
    });

    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startClientX) / zoomRef.current;
      const dy = (moveEvent.clientY - startClientY) / zoomRef.current;
      setNodes(current => current.map(n =>
        n.id !== nodeId ? n : { ...n, position: { x: startX + dx, y: startY + dy } }
      ));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const handleFitView = useCallback(() => {
    if (!nodes.length || !canvasRef.current) {
      setCanvasOffset({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const NODE_W = 224;
    const NODE_H = 180;

    const minX = Math.min(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxX = Math.max(...nodes.map(n => n.position.x)) + NODE_W;
    const maxY = Math.max(...nodes.map(n => n.position.y)) + NODE_H;

    const flowW = maxX - minX || NODE_W;
    const flowH = maxY - minY || NODE_H;

    const padding = 140;
    const newZoom = Math.min(
      Math.max(Math.min((rect.width - padding * 2) / flowW, (rect.height - padding * 2) / flowH), 0.4),
      1.2
    );

    // center the flow in viewport
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setCanvasOffset({
      x: rect.width / (2 * newZoom) - centerX,
      y: rect.height / (2 * newZoom) - centerY,
    });
  }, [nodes]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError("File size must be less than 10MB"); return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) { setUploadError("Only JPG, PNG, MP4, and PDF files are allowed"); return; }
    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target.result);
        reader.readAsDataURL(file);
      } else { setPreviewUrl(null); }
      const data = await api.uploadFile(file);
      setUploadProgress(100);
      let detectedType = "document";
      if (file.type.startsWith("image")) detectedType = "image";
      else if (file.type.startsWith("video")) detectedType = "video";
      updateNodeConfig(activeNodeId, { media_url: data.url, message_type: detectedType });
    } catch (err) {
      setUploadError(err.message || "Upload failed");
      setPreviewUrl(null);
    } finally { setUploading(false); setUploadProgress(0); }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  };
  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) handleFileUpload(file); };
  const clearUpload = () => { setPreviewUrl(null); setUploadError(null); updateNodeConfig(activeNodeId, { media_url: null }); };

  const handleSalesFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const workspace_id = getWorkspaceIdFromToken();
      const agentType = activeNode?.config?.agent_type || 'sales_agent';
      let data;
      if (agentType === 'sales_agent') {
        data = await api.uploadSalesDocument(file, workspace_id);
      } else if (agentType === 'support_agent') {
        data = await api.uploadSupportDocument(file, workspace_id);
      } else {
        data = await api.uploadDocument(file, workspace_id, 'general');
      }
      const newEntryId = data.entry_id;
      if (newEntryId && activeNodeId) {
         updateNodeConfig(activeNodeId, (config) => ({
            ...config,
            entry_ids: [...(config.entry_ids || []), newEntryId]
         }));
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSalesFileSelect = (e) => { const file = e.target.files[0]; if (file) handleSalesFileUpload(file); };
  const handleSalesDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSalesFileUpload(file);
  };
  
  const handleSalesManualSave = async () => {
    if (!salesManualText.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const workspace_id = getWorkspaceIdFromToken();
      const agentType = activeNode?.config?.agent_type || 'sales_agent';
      let collection = 'general';
      if (agentType === 'sales_agent') collection = 'sales';
      else if (agentType === 'support_agent') collection = 'support';
      const data = await api.addTextKnowledge(`Sales Note - ${new Date().toLocaleString()}`, salesManualText, workspace_id, collection);
      const newEntryId = data.entry_id;
      if (newEntryId && activeNodeId) {
         updateNodeConfig(activeNodeId, (config) => ({
            ...config,
            entry_ids: [...(config.entry_ids || []), newEntryId]
         }));
         setSalesManualText(''); 
      }
    } catch (err) {
      console.error(err);
      setUploadError('Text save failed');
    } finally {
      setUploading(false);
    }
  };

  const removeSalesEntry = (idToRemove) => {
     if (!activeNodeId) return;
     updateNodeConfig(activeNodeId, (config) => ({
        ...config,
        entry_ids: (config.entry_ids || []).filter(id => id !== idToRemove)
     }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    const validation = validateFlowGraph(nodes, edges);
    if (!validation.isValid) { setError(validation.errors[0]); return; }
    setIsSaving(true);
    try {
      const sanitizedNodes = nodes.map(node => {
        if (node.type === 'action' && node.config?.type === 'send_msg') {
          return { ...node, config: { ...node.config, message_type: node.config.message_type || 'text', mode: node.config.mode || 'manual' } };
        }
        return node;
      });
      const payload = {
        id: selectedItem.id,
        name: selectedItem.name,
        trigger_type: selectedItem.trigger_type || 'msg_recv',
        nodes: sanitizedNodes,
        edges,
        status: selectedItem.status || 'Active'
      };
      console.log("Saving Wire Payload:", JSON.stringify(payload, null, 2));
      const saved = await api.saveFlow(payload);
      const sanitizedSaved = sanitizeFlowData(saved);
      setAutomations(prev => prev.map(a => 
        a.id === sanitizedSaved.id ? sanitizedSaved : a
      ));
      setSelectedItem(sanitizedSaved);
      setNodes(sanitizedSaved.nodes || sanitizedNodes);
      setEdges(sanitizedSaved.edges || edges);
      showToast("Wire synced and saved! 🚀", "success");
    } catch (e) { console.error(e); setError('Save failed: ' + e.message); }
    finally { setIsSaving(false); }
  };

  const handleCreateNew = () => {
    setCreateWireName('');
    setCreateWireModal(true);
  };

  const handleCreateNewConfirm = async (name) => {
    setCreateWireModal(false);
    try {
      const newFlow = await api.saveFlow({
        name, trigger_type: 'msg_recv',
        nodes: [{ id: '1', type: 'trigger', label: 'Init Trigger', position: { x: 200, y: 200 }, config: { event: 'msg_recv', match_type: 'word_match', keywords: [] } }],
        edges: [], status: 'Active'
      });
      setAutomations([...automations, newFlow]);
      handleSelectAutomation(newFlow);
      setActiveNodeId('1');
      showToast(`Wire "${name}" created!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to create wire', 'error');
    }
  };

  const updateNode = (nodeId, updater) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      return typeof updater === 'function' ? updater(node) : { ...node, ...updater };
    }));
  };

  const updateNodeConfig = (nodeId, updater) => {
    updateNode(nodeId, (node) => {
      const nextConfig = typeof updater === 'function' ? updater(node.config || {}) : { ...(node.config || {}), ...updater };
      return { ...node, config: nextConfig };
    });
  };

  const updateButtonField = (nodeId, buttonId, field, value) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      const buttons = normalizeButtons(node.config?.buttons || []).map(button => button.id === buttonId ? { ...button, [field]: value } : button);
      const nextButtons = buttons.map((button, index) => ({ ...button, target: buttons[index].target || null }));
      return { ...node, config: { ...node.config, buttons: nextButtons } };
    }));
    if (field === 'value') {
      setEdges(prev => prev.map(edge => {
        if (edge.source !== nodeId || edge.sourceHandle !== buttonId) return edge;
        return { ...edge, sourceHandle: value || buttonId };
      }));
    }
  };

  const addButtonToNode = (nodeId) => {
    updateNodeConfig(nodeId, (config) => ({
      ...config, message_type: 'button_message',
      buttons: [...normalizeButtons(config.buttons || []), createDefaultButton(normalizeButtons(config.buttons || []).length)].slice(0, MAX_BUTTONS),
    }));
  };

  const removeButtonFromNode = (nodeId, buttonId) => {
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node;
      const nextButtons = normalizeButtons(node.config?.buttons || []).filter(button => button.id !== buttonId);
      return { ...node, config: { ...node.config, buttons: nextButtons } };
    }));
    setEdges(prev => prev.filter(edge => !(edge.source === nodeId && (edge.sourceHandle === buttonId || edge.sourceHandle?.startsWith(`${buttonId}:`)))));
  };

  const syncButtonTarget = (nodeId, sourceHandle, targetId) => {
    updateNodeConfig(nodeId, (config) => ({
      ...config,
      buttons: normalizeButtons(config.buttons || []).map((button, index) => {
        const handleId = getHandleIdForButton(button, index);
        if (handleId !== sourceHandle && button.id !== sourceHandle) return button;
        return { ...button, target: targetId };
      }),
    }));
  };

  // Canvas pan — native pointer events (no Framer conflict)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const handleCanvasPointerDown = useCallback((e) => {
    if (e.target.closest?.('[data-node-id]')) return;
    if (e.target.closest?.('[data-steps-panel]')) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { x: canvasOffset.x, y: canvasOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [canvasOffset]);

  const handleCanvasPointerMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    const dx = (e.clientX - panStartRef.current.x) / zoom;
    const dy = (e.clientY - panStartRef.current.y) / zoom;
    setCanvasOffset({
      x: panOffsetStartRef.current.x + dx,
      y: panOffsetStartRef.current.y + dy,
    });
  }, [zoom]);

  const handleCanvasPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleDeleteEdge = (edgeId) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    if (edge.sourceHandle) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (isConditionNode(sourceNode)) {
        updateNodeConfig(edge.source, (config) => ({
          ...config,
          branches: (config.branches || []).map(branch =>
            branch.value === edge.sourceHandle ? { ...branch, target: null } : branch
          ),
        }));
      } else {
        updateNodeConfig(edge.source, (config) => ({
          ...config,
          buttons: normalizeButtons(config.buttons || []).map(button => {
            const handleId = getHandleIdForButton(button);
            if (handleId === edge.sourceHandle) return { ...button, target: null };
            return button;
          }),
        }));
      }
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const scaleFactor = 1.1;
      const newZoom = delta > 0 ? Math.min(zoom * scaleFactor, 2) : Math.max(zoom / scaleFactor, 0.4);
      if (newZoom !== zoom) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX / zoom) - canvasOffset.x;
        const worldY = (mouseY / zoom) - canvasOffset.y;
        setZoom(newZoom);
        setCanvasOffset({ x: (mouseX / newZoom) - worldX, y: (mouseY / newZoom) - worldY });
      }
    } else {
      setCanvasOffset(prev => ({ x: prev.x - (e.deltaX / zoom), y: prev.y - (e.deltaY / zoom) }));
    }
  };

  const getCanvasPointFromClient = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomRef.current - canvasOffsetRef.current.x,
      y: (clientY - rect.top) / zoomRef.current - canvasOffsetRef.current.y,
    };
  }, []);

  const getPortAnchorPoint = useCallback((sourceId, sourceHandle = null) => {
    if (!gridRef.current) return null;
    const sourceEl = gridRef.current.querySelector(`[data-node-id="${sourceId}"]`);
    if (!sourceEl) return null;

    const gridRect = gridRef.current.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    let x = (sourceRect.right - gridRect.left) / zoomRef.current;
    let y = (sourceRect.top + sourceRect.height / 2 - gridRect.top) / zoomRef.current;

    if (sourceHandle) {
      const handleEl =
        sourceEl.querySelector(`[data-button-id="${sourceHandle}"]`) ||
        sourceEl.querySelector(`[data-branch-id="${sourceHandle}"]`);
      if (handleEl) {
        const handleRect = handleEl.getBoundingClientRect();
        y = (handleRect.top + handleRect.height / 2 - gridRect.top) / zoomRef.current;
      }
    }

    return { x, y };
  }, []);

  const createNodeFromPort = useCallback((sourceId, sourceHandle = null, targetOffsetY = 0, position = null) => {
    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (!sourceNode) {
      setError('Unable to create the next step from this node.');
      return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    const newNode = {
      id,
      type: 'action',
      label: 'New Step',
      position: position || { x: sourceNode.position.x + 350, y: sourceNode.position.y + targetOffsetY },
      config: { type: 'send_msg', message_type: 'text', text: '', mode: 'manual', delay_amount: 0, delay_unit: 'minutes' },
    };

    setNodes((prev) => [...prev, newNode]);
    setEdges((prev) => [...prev, {
      id: `e-${sourceId}-${sourceHandle || 'default'}-${id}`,
      source: sourceId,
      sourceHandle,
      target: id,
    }]);

    if (sourceHandle) {
      if (isConditionNode(sourceNode)) {
        updateNodeConfig(sourceId, (config) => ({
          ...config,
          branches: (config.branches || []).map((branch) =>
            branch.value === sourceHandle ? { ...branch, target: id } : branch
          ),
        }));
      } else {
        syncButtonTarget(sourceId, sourceHandle, id);
      }
    }

    setActiveNodeId(id);
  }, []);

  const connectPortToNode = useCallback((sourceId, sourceHandle = null, targetId) => {
    if (sourceId === targetId) {
      setError('A node cannot connect to itself.');
      return false;
    }

    const targetNode = nodesRef.current.find((node) => node.id === targetId);
    if (!targetNode || targetNode.type === 'trigger') {
      setError('Connect this output to a valid action node.');
      return false;
    }

    if (wouldCreateCycle(sourceId, targetId, edgesRef.current)) {
      setError('This connection would create a loop in the flow.');
      return false;
    }

    setEdges((prev) => {
      const nextEdges = prev.filter(
        (edge) => !(edge.source === sourceId && (edge.sourceHandle || null) === (sourceHandle || null))
      );
      return [...nextEdges, {
        id: `e-${sourceId}-${sourceHandle || 'default'}-${targetId}`,
        source: sourceId,
        sourceHandle,
        target: targetId,
      }];
    });

    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (sourceHandle) {
      if (isConditionNode(sourceNode)) {
        updateNodeConfig(sourceId, (config) => ({
          ...config,
          branches: (config.branches || []).map((branch) =>
            branch.value === sourceHandle ? { ...branch, target: targetId } : branch
          ),
        }));
      } else {
        syncButtonTarget(sourceId, sourceHandle, targetId);
      }
    }

    setActiveNodeId(targetId);
    return true;
  }, []);

  const handlePortPointerDown = useCallback((e, sourceId, sourceHandle = null, targetOffsetY = 0) => {
    e.preventDefault();
    e.stopPropagation();

    const existingEdge = edgesRef.current.find(
      (edge) => edge.source === sourceId && (edge.sourceHandle || null) === (sourceHandle || null)
    );
    if (existingEdge) {
      setError('This output is already connected. Remove the existing path before adding another.');
      return;
    }

    const startPoint = getPortAnchorPoint(sourceId, sourceHandle) || getCanvasPointFromClient(e.clientX, e.clientY);
    if (!startPoint) {
      setError('Unable to start wiring from this port.');
      return;
    }

    const nextWire = {
      sourceId,
      sourceHandle,
      targetOffsetY,
      startPoint,
      currentPoint: startPoint,
      hasMoved: false,
    };

    wiringRef.current = nextWire;
    setWiringPreview(nextWire);
    setActiveNodeId(sourceId);

    if (wireMoveListenerRef.current) {
      window.removeEventListener('pointermove', wireMoveListenerRef.current);
    }
    if (wireUpListenerRef.current) {
      window.removeEventListener('pointerup', wireUpListenerRef.current);
    }

    const handleWireMove = (moveEvent) => {
      if (!wiringRef.current) return;
      const point = getCanvasPointFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!point) return;
      const updatedWire = { ...wiringRef.current, currentPoint: point, hasMoved: true };
      wiringRef.current = updatedWire;
      setWiringPreview(updatedWire);
    };

    const handleWireUp = (upEvent) => {
      if (!wiringRef.current) return;

      const wire = wiringRef.current;
      wiringRef.current = null;
      setWiringPreview(null);
      window.removeEventListener('pointermove', handleWireMove);
      window.removeEventListener('pointerup', handleWireUp);
      wireMoveListenerRef.current = null;
      wireUpListenerRef.current = null;

      const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest?.('[data-node-id]');
      const targetId = dropTarget?.getAttribute('data-node-id');
      if (targetId && targetId !== wire.sourceId) {
        if (connectPortToNode(wire.sourceId, wire.sourceHandle, targetId)) {
          return;
        }
      }

      const dropPoint = getCanvasPointFromClient(upEvent.clientX, upEvent.clientY);
      createNodeFromPort(
        wire.sourceId,
        wire.sourceHandle,
        wire.targetOffsetY,
        wire.hasMoved && dropPoint ? dropPoint : null
      );
    };

    wireMoveListenerRef.current = handleWireMove;
    wireUpListenerRef.current = handleWireUp;
    window.addEventListener('pointermove', handleWireMove);
    window.addEventListener('pointerup', handleWireUp);
  }, [connectPortToNode, createNodeFromPort, getCanvasPointFromClient, getPortAnchorPoint]);

  const wouldCreateCycle = (sourceId, targetId, currentEdges) => {
    const visited = new Set();
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === sourceId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        currentEdges.filter(e => e.source === current).forEach(e => queue.push(e.target));
      }
    }
    return false;
  };

  const addKeywordToTrigger = (nodeId) => {
    if (!keywordInput.trim()) return;
    const keyword = keywordInput.trim().toLowerCase();
    updateNodeConfig(nodeId, (config) => {
      const currentKeywords = config.keywords || [];
      if (currentKeywords.includes(keyword) || currentKeywords.length >= MAX_KEYWORDS) return config;
      return { ...config, keywords: [...currentKeywords, keyword] };
    });
    setKeywordInput('');
  };

  const removeKeywordFromTrigger = (nodeId, keyword) => {
    updateNodeConfig(nodeId, (config) => ({ ...config, keywords: (config.keywords || []).filter(k => k !== keyword) }));
  };

  const activeNode = nodes.find(n => n.id === activeNodeId);
  const flowValidation = validateFlowGraph(nodes, edges);

  if (!isMounted) return null;

  if (currentView === 'dashboard') {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            

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
                        strokeDasharray={`${Math.min((automations.filter(a => a.status === 'Active').length / 5) * 100, 100)}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-xs font-bold text-white">
                      {Math.min(Math.round((automations.filter(a => a.status === 'Active').length / 5) * 100), 100)}%
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-black text-white tracking-tight leading-none">
                      {automations.filter(a => a.status === 'Active').length} <span className="text-xs font-bold text-white/40">/ 5</span>
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Flows Active</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50 font-medium">
                  <span>Total Quota: 5 Flows</span>
                  <span>•</span>
                  <span>AI Enabled: {automations.filter(a => a.nodes?.some(n => n.type === 'action' && n.config?.type === 'brain_query')).length}</span>
                </div>
              </div>
              
              <button 
                onClick={() => alert("Purchase limits feature is mock-only in test workspace.")}
                className="w-full mt-4 py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl border border-white/10 shadow-md relative z-10"
              >
                Purchase More Flows
              </button>
            </div>

            {/* AI Messages Card */}
            <div className="bg-[#13131a]/60 border border-white/[0.06] rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-sm font-bold text-white mb-1">AI Messages</h3>
                <h4 className="text-xs font-bold text-white/80 mb-2">Purchase AI Messages for Bot Builder</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Boost your flows with advanced intelligence. Only ₹8,500 per 7,000 messages.
                </p>
              </div>

              <button 
                onClick={() => alert("Message purchase feature is mock-only in test workspace.")}
                className="w-full mt-6 py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl border border-white/10 shadow-md relative z-10"
              >
                Purchase Messages
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
              onClick={() => setIsCreateModalOpen(true)}
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
                          {flow.status === 'Active' && (
                            <span className="text-[10px] text-amber-500 font-bold ml-2.5">Testing only</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDuplicateFlow(flow)}
                              title="Duplicate Flow"
                              className="p-2 text-white/30 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all"
                            >
                              <Layers size={14} />
                            </button>
                            <button
                              onClick={() => handleSelectAutomation(flow)}
                              title="Open Wire Editor"
                              className="p-2 text-white/30 hover:text-purple-400 hover:bg-purple-500/5 rounded-lg transition-all"
                            >
                              <MousePointer2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteFlow(flow.id)}
                              title="Delete Flow"
                              className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
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
      </div>
    );
  }

  return (
    <div className={`${zenMode ? 'fixed inset-0 z-[200]' : 'relative w-full h-screen'} bg-[#0d0d12] text-zinc-200 overflow-hidden font-sans select-none border-t border-white/5`}>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/5 blur-[200px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-violet-600/5 blur-[200px] rounded-full" />
      </div>

      {/* FLOATING HEADER */}
      <header className="absolute top-5 left-0 right-0 h-[82px] z-[100] flex items-center justify-center px-4 bg-[#13131a] border-b border-white/5 shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 my-2 rounded-2xl border border-white/15 bg-white/[0.03] w-[1479px] mx-auto gap-0">
         
          {/* LEFT: Flows button + title */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedItem(null);
                setCurrentView('dashboard');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all mr-2"
            >
              <ChevronLeft size={14} />
              <span>Flows</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#814AC8] flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semiBold text-white tracking-widest leading-none mb-2">Agentic Orchestrator</span>
              <span className="text-[12px] font-medium text-white/75 leading-none">{selectedItem?.name || "Untitled Wire"}</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="w-px h-8 bg-white/10 mx-2" />

          {/* RIGHT: actions */}
          <div className="flex items-center gap-2">
          <button
            onClick={() => setZenMode(!zenMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-medium ${zenMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-[#1e1e2a] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'}`}
          >
            {zenMode ? <EyeOff size={13} /> : <Eye size={13} />}
            {zenMode ? 'Exit Zen' : 'Zen mode'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedItem || !flowValidation.isValid}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1e2a] border border-white/10 hover:border-white/20 disabled:opacity-40 transition text-xs font-medium text-zinc-300"
          >
            <Save size={13} /> {isSaving ? 'Syncing...' : 'Sync Wire'}
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#814AC8] hover:bg-violet-500 transition text-xs font-semibold text-white shadow-lg shadow-violet-600/30"
          >
            <Plus size={15} /> New Wire
          </button>
          </div>
        </div>
      </header>

      {/* FLOW HEALTH BAR */}
      <div className="absolute top-26 left-0 right-0 z-[95]">
        <div className="bg-[#13131a] border-b border-white/5 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-Regular text-white tracking-widest">Flow Health</span>
            <span className="text-[12px] text-white/80">
              Execution preview reaches {flowValidation.reachableNodeIds.size} of {nodes.length} node{nodes.length === 1 ? '' : 's'}.
            </span>
            <div className={`ml-auto px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${flowValidation.isValid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
              {flowValidation.isValid ? 'Ready to save' : 'Validation required'}
            </div>
          </div>
          {flowValidation.errors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {flowValidation.errors.map((item, index) => (
                <div key={`error-${index}`} className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-300">{item}</div>
              ))}
            </div>
          )}
          {flowValidation.warnings.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {flowValidation.warnings.map((item, index) => (
                <div key={`warning-${index}`} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">{item}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ZOOM CONTROLS */}
      <div className="absolute right-4 bottom-32 z-50 flex flex-col gap-1.5 bg-[#13131a]/95 border border-white/8 rounded-xl p-2 shadow-lg">
        <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition text-zinc-300 text-sm font-bold">+</button>
        <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition text-zinc-300 text-sm font-bold">−</button>
        <div className="text-center text-[9px] text-zinc-500 py-0.5">{Math.round(zoom * 100)}%</div>
        <button onClick={handleFitView} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition text-zinc-400 text-xs">⬚</button>
      </div>

      {/* REPO SIDEBAR */}
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

      {/* NODE INSPECTOR */}
      <AnimatePresence>
        {activeNode && (
          <motion.aside
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 450, opacity: 0 }}
            className="absolute right-3 top-51 bottom-0 max-h-[85vh] w-[360px] z-[120] bg-[#15161C] border border-[#22252D] rounded-[20px] shadow-2xl flex flex-col overflow-hidden"
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

                                      const filteredEdges = edgesRef.current.filter(
                                        edge => !(edge.source === activeNodeId && edge.sourceHandle === button.value)
                                      );


                                      setEdges(filteredEdges);

                                      if (newTarget) {
                                        setEdges(prev => [...prev, {
                                          id: `e-${activeNodeId}-${button.value}-${newTarget}`,
                                          source: activeNodeId,
                                          sourceHandle: button.value,
                                          target: newTarget
                                        }]);
                                      }

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
                            { value: 'support_agent', label: 'Support', emoji: '🛟', comingSoon: true  },
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

                      {activeNode.config?.agent_type !== 'sales_agent' && (
                        <section>
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Custom Prompt <span className="text-zinc-700">(optional)</span></label>
                          <textarea
                            value={activeNode.config?.prompt || ''}
                            onChange={(e) => updateNodeConfig(activeNodeId, { prompt: e.target.value })}
                            placeholder="Override AI behavior for this step..."
                            className="w-full bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-4 py-3 text-sm text-white"
                            rows={3}
                          />
                        </section>
                      )}
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

                      {activeNode.config?.agent_type !== 'sales_agent' && (
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
                      {activeNode.config?.agent_type === 'sales_agent' && (
                        <section className="space-y-4 pt-4 border-t border-white/5">
                          <label className="text-[12px] font-semibold text-white tracking-wider block">Product Details & Knowledge</label>
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

                          {/* Render attached entry IDs if any */}
                          {(activeNode.config?.entry_ids || []).length > 0 && (
                            <div className="space-y-2 mt-4">
                               <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Attached Knowledge</label>
                               {(activeNode.config?.entry_ids || []).map((id, index) => (
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
                          {activeNode.config?.operator !== 'is_empty' && <span className="text-emerald-300">"{activeNode.config?.compare_value || '...'}"</span>}
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

                  {/* <section className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                      <Bot size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Managed</span>
                    </div>
                    <p className="text-[11px] text-white/65 font-medium leading-relaxed italic">The Agent is automatically optimizing the parameters for this '{activeNode.label}' gateway. Manual tuning enabled after deploy.</p>
                  </section> */}
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

      {/* CANVAS */}
      <section
        className={`absolute inset-0 z-10 ${isSpacePressed ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ top: flowValidation.errors.length > 0 || flowValidation.warnings.length > 0 ? '80px' : '48px' }}
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onClick={(e) => {
          if (e.target.closest('[data-steps-panel]')) return;
          setActiveNodeId(null);
          setStepsOpen(false);
        }}
      >

        {/* STEPS TOGGLE BUTTON */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[90]" data-steps-panel="true">
          <button
            onClick={(e) => { e.stopPropagation(); setStepsOpen(!stepsOpen); }}
            className="w-8 h-8 rounded-full bg-[#13131a] border border-white/10 flex items-center justify-center shadow-lg hover:border-white/20 transition"
          >
            <ChevronLeft
              size={16}
              className={`text-violet-400 transition-transform duration-300 ${stepsOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {stepsOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              data-steps-panel="true"
              className="absolute left-14 top-1/2 -translate-y-1/2 z-[90] w-[280px] backdrop-blur-3xl rounded-2xl overflow-hidden"
              style={{
                background: '#0e0e1a',
                border: '1.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              }}
            >
              {/* ── Header ── */}
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                <h3 className="text-[15px] font-bold text-white">Steps</h3>
                <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                  Drag and drop steps to build your automation
                </p>
              </div>

              <div className="px-4 py-4 space-y-5">

                {/* ── Trigger ── */}
                <div>
                  <p className="text-[13px] font-semibold text-white/90 mb-2.5">Trigger</p>
                  <div
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                    style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = '1px solid rgba(16,185,129,0.35)';
                      e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                      e.currentTarget.style.background = '#161622';
                    }}
                  >
                    {/* Green circle icon */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(16,185,129,0.12)',
                        border: '1.5px solid rgba(16,185,129,0.3)',
                      }}
                    >
                      <MessageSquare size={19} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">Trigger Message</p>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                        Starts the flow when user send<br />the message
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div>
                  <p className="text-[13px] font-semibold text-white/90 mb-2.5">Actions</p>
                  <div className="space-y-2.5">

                    {/* Reply Message — purple filled */}
                    <div
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                      style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)';
                        e.currentTarget.style.background = 'rgba(139,92,246,0.07)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                        e.currentTarget.style.background = '#161622';
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                          boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                        }}
                      >
                        <Send size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white leading-tight">Reply Message</p>
                        <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
                      </div>
                    </div>

                    {/* Configuration — dark circle */}
                    <div
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                      style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                        e.currentTarget.style.background = '#161622';
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: '#1e1e2e',
                          border: '1.5px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Settings size={18} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white leading-tight">Configuration</p>
                        <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
                      </div>
                    </div>

                    {/* AI Generation — purple filled */}
                    <div
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                      style={{ background: '#161622', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)';
                        e.currentTarget.style.background = 'rgba(139,92,246,0.07)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                        e.currentTarget.style.background = '#161622';
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                          boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
                        }}
                      >
                        <Sparkles size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white leading-tight">AI Generation</p>
                        <p className="text-[11px] text-white/60 mt-0.5">Sends a message back to user</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute w-full h-full">
          <div
            ref={gridRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `scale(${zoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: '0 0',
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
              backgroundSize: `28px 28px`,
            }}
          >
            {/* SVG EDGES */}
<svg className="absolute inset-0 w-[8000px] h-[8000px] top-[-4000px] left-[-4000px] pointer-events-none">
  <g transform="translate(4000, 4000)">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L0,8 L8,4 z" fill="#7c3aed" />
      </marker>
    </defs>
    {edges.map(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return null;
      const pts = getEdgePoints(source, target, edge.sourceHandle);
      if (!pts) return null;
      const { sx, sy, tx, ty } = pts;
      const curve = Math.min(Math.abs(tx - sx) * 0.5, 150);
      const d = `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
      const isPreviewEdge = flowValidation.reachableEdgeIds.has(edge.id);
      return (
        <g key={edge.id}>
          <path d={d} fill="none" stroke={isPreviewEdge ? "#7c3aed" : "#4a4a6a"} strokeWidth={isPreviewEdge ? "2" : "1.5"} strokeOpacity={isPreviewEdge ? "0.9" : "0.5"} strokeDasharray={isPreviewEdge ? "0" : "6 4"} markerEnd="url(#arrow)" />
          {isPreviewEdge && (
            <circle r="3" fill="#a78bfa">
              <animateMotion dur="2.5s" repeatCount="indefinite" path={d} />
            </circle>
          )}
        </g>
      );
    })}
    {wiringPreview && (() => {
      const { startPoint, currentPoint } = wiringPreview;
      const curve = Math.min(Math.abs(currentPoint.x - startPoint.x) * 0.5, 150);
      const d = `M ${startPoint.x} ${startPoint.y} C ${startPoint.x + curve} ${startPoint.y}, ${currentPoint.x - curve} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
      return (
        <g key="wiring-preview">
          <path d={d} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="6 4" strokeOpacity="0.95" markerEnd="url(#arrow)" />
          <circle cx={currentPoint.x} cy={currentPoint.y} r="4" fill="#c4b5fd" />
        </g>
      );
    })()}
  </g>
</svg>

            {/* NODES */}
            <div className="absolute inset-0">
              {nodes.map(node => {
                const Icon = getIcon(node.type === 'trigger' ? (node.config?.event || 'trigger') : (node.config?.type || 'action'));
                const isActive = activeNodeId === node.id;
                const isPreviewNode = flowValidation.reachableNodeIds.has(node.id);
                const isDisconnectedNode = flowValidation.disconnectedNodeIds.has(node.id);
                const nodeButtons = getNodeButtons(node);
                const nodeBranches = getNodeBranches(node);
                const delayLabel = formatDelay(node.config?.delay_amount, node.config?.delay_unit);

                return (
                  <motion.div
                    key={node.id}
                    data-node-id={node.id}
                    ref={(el) => { if (el) nodeHeightsRef.current[node.id] = el.offsetHeight; }}
                    onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                    onClick={(e) => { e.stopPropagation(); setActiveNodeId(node.id); }}
                    style={{
                      position: 'absolute',
                      left: node.position.x,
                      top: node.position.y,
                    }}
                    animate={{ scale: isActive ? 1.05 : 1, zIndex: isActive ? 100 : 10 }}
                    className={`w-52 pointer-events-auto bg-[#0f0f18] backdrop-blur-xl border rounded-2xl p-5 shadow-2xl cursor-grab active:cursor-grabbing transition-colors duration-300 ${isActive ? 'border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.15)]' : isDisconnectedNode ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : node.type === 'trigger'
                      ? 'border-[#71D7A3] shadow-[2px_2px_14px_-4px_#71D7A3]'
                      : 'border-[#814AC8] shadow-[2px_2px_15px_-2px_#814AC8]'}`}
                  >
                    {delayLabel && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 whitespace-nowrap">
                        <Timer size={10} className="text-violet-400" />
                        <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">{delayLabel}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${node.type === 'trigger' ? 'bg-[#71D7A3]/15 text-[#71D7A3]' : 'bg-[#814AC8]/15 text-[#814AC8]'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate leading-none mb-1">{node.label}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{node.type}</p>
                      </div>
                    </div>

                    <div className="h-px w-full bg-white/5 mb-4" />

                    {isDisconnectedNode && (
                      <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[2px] text-amber-200">
                        Disconnected node
                      </div>
                    )}

                    {/* TRIGGER NODE: keyword tags + green preview button */}
                      {node.type === 'trigger' && (
                        <>
                          {/* Keyword tags display */}
                          <div className="mb-3 bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-3 py-2.5">
                            <p className="text-[11px] tracking-[1px] text-White/80 mb-2">Trigger messages</p>
                            {(node.config?.keywords || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(node.config.keywords).map(kw => (
                                  <span key={kw} className="px-3 py-1.5 rounded-xl bg-[#1A1025] border border-[#2B2C33] border-[0.5px] text-[10px] text-white/70 font-medium shadow-inner">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-white/60 ">No keywords — fires on all messages</p>
                            )}
                          </div>
                          {/* Green preview button */}
                          <button
                            data-no-drag
                            onClick={(e) => { e.stopPropagation(); setPreviewNode(node); }}
                            className="w-full rounded-xl border border-[#71D7A3] bg-[#140D1F] px-3 py-2.5 text-xs font-semibold text-white text-center hover:bg-[#140D1F]/80 transition"
                          >
                            Preview
                          </button>
                        </>
                      )}

                      {/* ACTION NODE: message text preview + purple preview button */}
                      {node.type === 'action' && !isMultiPathNode(node) && (
                        <>
                          {/* Message text preview */}
                          <div className="mb-3">
                            <div className="bg-[#140D1F] border border-[#2B2C33] border-[0.5px] rounded-2xl px-3 py-2.5">
                              <p className="text-[11px] tracking-[1px] text-white mb-2">
                                {node.config?.type === 'brain_query' ? 'AI Reply' :
                                node.config?.type === 'ask_question' ? 'Question' : 'Reply Message'}
                              </p>
                              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 min-h-[1.5rem]">
                                {node.config?.text || node.config?.question ||
                                <span className="italic text-zinc-600">No message yet</span>}
                              </p>
                            </div>
                          </div>
                          {/* Purple preview button */}
                          <button
                            data-no-drag
                            onClick={(e) => { e.stopPropagation(); setPreviewNode(node); }}
                            className="w-full rounded-xl border border-[#814AC8] bg-[#140D1F] px-3 py-2.5 text-xs font-semibold text-white text-center hover:bg-[#140D1F]/80 transition"
                          >
                            Preview
                          </button>
                        </>
                      )}

                      {/* MULTI-PATH NODES (button/condition): remove badge, show preview button at bottom */}

                    {nodeButtons.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {nodeButtons.map((button, index) => (
                          <div
                            key={button.id}
                            data-button-id={getHandleIdForButton(button, index)}
                            ref={(el) => {
                              if (el) {
                                if (!buttonOffsetsRef.current[node.id]) buttonOffsetsRef.current[node.id] = {};
                                buttonOffsetsRef.current[node.id][button.id] = el.offsetTop + el.offsetHeight / 2;
                              }
                            }}
                            className="relative rounded-2xl border border-white/10 bg-white/5 px-3 py-2 pr-10"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-zinc-500">{button.label || `Button ${index + 1}`}</p>
                            <p className="text-[10px] text-zinc-400">{button.value || 'Missing value'}</p>
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                              <motion.div
                                whileHover={{ scale: 1.3, rotate: 90 }}
                                data-no-drag
                                onPointerDown={(e) => handlePortPointerDown(e, node.id, getHandleIdForButton(button, index), (index + 1) * 80)}
                                className="w-5 h-5 bg-indigo-500 rounded-full border-[3px] border-[#020408] shadow-[0_0_14px_rgba(99,102,241,0.55)] cursor-crosshair flex items-center justify-center"
                              >
                                <Plus size={9} className="text-white" />
                              </motion.div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {nodeButtons.length > 0 && (
                      <button
                        data-no-drag
                        onClick={(e) => { e.stopPropagation(); setPreviewNode(node); }}
                        className="w-full rounded-xl border border-[#814AC8] bg-[#140D1F] px-3 py-2.5 text-xs font-semibold text-white text-center hover:bg-[#140D1F]/80 transition mb-4"
                      >
                        Preview
                      </button>
                    )}

                    {nodeBranches.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {/* Condition summary */}
                        <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 px-3 py-2 mb-2">
                          <p className="text-[9px] font-black uppercase tracking-[2px] text-indigo-400 mb-1">Condition</p>
                          <p className="text-[10px] text-zinc-300 font-mono truncate">
                            IF {node.config?.field || 'user_input'} {(node.config?.operator || 'equals').replace('_', ' ')} {node.config?.operator !== 'is_empty' ? `"${node.config?.compare_value || '...'}"` : ''}
                          </p>
                        </div>
                        {nodeBranches.map((branch, index) => (
                          <div
                            key={branch.id || branch.value}
                            data-branch-id={branch.value}
                            className="relative rounded-2xl border border-white/10 bg-white/5 px-3 py-2 pr-10"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${branch.value === 'true' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                              <p className={`text-[10px] font-black uppercase tracking-[2px] ${branch.value === 'true' ? 'text-emerald-400' : 'text-rose-400'}`}>{branch.label}</p>
                            </div>
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                              <motion.div
                                whileHover={{ scale: 1.3, rotate: 90 }}
                                data-no-drag
                                onPointerDown={(e) => handlePortPointerDown(e, node.id, branch.value, (index + 1) * 80)}
                                className={`w-5 h-5 rounded-full border-[3px] border-[#020408] cursor-crosshair flex items-center justify-center ${branch.value === 'true' ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]' : 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.55)]'}`}
                              >
                                <Plus size={9} className="text-white" />
                              </motion.div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isConditionNode(node) && (
                      <button
                        data-no-drag
                        onClick={(e) => { e.stopPropagation(); setPreviewNode(node); }}
                        className="w-full rounded-xl border border-[#814AC8] bg-[#140D1F] px-3 py-2.5 text-xs font-semibold text-white text-center hover:bg-[#140D1F]/80 transition mt-1"
                      >
                        Preview
                      </button>
                    )}


                    {nodeButtons.length === 0 && nodeBranches.length === 0 && (
                      <motion.div
                        whileHover={{ scale: 1.6, rotate: 90 }}
                        data-no-drag
                        onPointerDown={(e) => handlePortPointerDown(e, node.id)}
                        className={`absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-violet-500 rounded-full border-[3px] border-[#0d0d12] shadow-[0_0_12px_rgba(139,92,246,0.5)] cursor-crosshair z-20 flex items-center justify-center group/port ${isActive ? 'scale-125' : ''}`}
                      >
                        <Plus size={10} className="text-white opacity-0 group-hover/port:opacity-100 transition-opacity" />
                      </motion.div>
                    )}

                    {node.type !== 'trigger' && (
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#2a2a3a] rounded-full border-[3px] border-[#0d0d12]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP PREVIEW MODAL */}
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

      {/* AI MAGIC BAR */}
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
              onClick={async () => {
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
                  } else { setError("AI returned invalid format. Try a different prompt."); }
                } catch (e) { console.error(e); setError(e.message || "Failed to connect to AI engine."); }
                finally { setIsGenerating(false); }
              }}
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

      <AnimatePresence>
        {nodes.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center space-y-4 opacity-20">
              <Bot size={56} className="mx-auto text-zinc-500 animate-pulse" />
              <p className="text-xs font-medium text-zinc-600 tracking-widest uppercase">Canvas Initialized · Run Magic Wire</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
        select {
          background-color: #0F1115 !important;
          color: white !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 12px center !important;
          padding-right: 36px !important;
        }

        select option {
          background-color: #0F1115;
          color: white;
        }
 
      `}</style>

      {/* ─── TOAST NOTIFICATIONS ─── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl text-sm font-semibold ${
                toast.type === 'success'
                  ? 'bg-[#0c1c14]/95 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
                  : 'bg-[#1c0c0c]/95 border-rose-500/30 text-rose-300 shadow-rose-500/10'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {toast.message}
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 opacity-50 hover:opacity-100 transition">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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

    </div>
  );
}
