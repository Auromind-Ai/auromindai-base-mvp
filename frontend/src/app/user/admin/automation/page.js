'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Save, Sparkles, ChevronLeft, Layers, Settings, X, Trash2, Zap, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import api from '@/lib/api';
import { getToken, getWorkspaceIdFromToken, getUser } from '@/lib/auth';

// Component Imports
import DashboardView from './dashboard/DashboardView';
import CanvasGrid from './canvas/CanvasGrid';
import AiMagicBar from './canvas/AiMagicBar';
import NodeInspector from './panels/NodeInspector';
import RepositorySidebar from './panels/RepositorySidebar';
import StepsSidebar from './panels/StepsSidebar';
import WhatsAppPreviewModal from './modals/WhatsAppPreviewModal';
import FlowModals from './modals/FlowModals';

// Helper Imports
import {
  MAX_KEYWORDS,
  sanitizeFlowData,
  validateFlowGraph,
  wouldCreateCycle,
  normalizeButtons,
  createDefaultButton,
  getHandleIdForButton
} from './helpers';

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
  const [infoModal, setInfoModal] = useState({ open: false, title: '', message: '' });
  const [newFlowName, setNewFlowName] = useState('');

  // ─ MODAL & TOAST STATE ─
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
      const btnEl = sourceEl.querySelector(`[data-button-id="${sourceHandle}"]`) || sourceEl.querySelector(`[data-branch-id="${sourceHandle}"]`);
      if (btnEl) {
        const btnRect = btnEl.getBoundingClientRect();
        sy = (btnRect.top + btnRect.height / 2 - gridRect.top) / zoom;
      }
    }

    const tx = (targetRect.left - gridRect.left) / zoom;
    const ty = (targetRect.top + targetRect.height / 2 - gridRect.top) / zoom;

    return { sx, sy, tx, ty };
  }, [zoom, edgeTick, nodes]);

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

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ─ NODE DRAG (native pointer events — no Framer conflict) ─
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
      const activeNode = nodes.find(n => n.id === activeNodeId);
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
         updateNodeConfig(activeNodeId, (config) => {
            const isSupport = agentType === 'support_agent';
            const arrayKey = isSupport ? 'support_entry_ids' : 'sales_entry_ids';
            const updatedArray = [...(config[arrayKey] || []), newEntryId];
            return {
               ...config,
               [arrayKey]: updatedArray,
               entry_ids: updatedArray
            };
         });
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
      const activeNode = nodes.find(n => n.id === activeNodeId);
      const agentType = activeNode?.config?.agent_type || 'sales_agent';
      let collection = 'general';
      if (agentType === 'sales_agent') collection = 'sales';
      else if (agentType === 'support_agent') collection = 'support';
      const data = await api.addTextKnowledge(`Sales Note - ${new Date().toLocaleString()}`, salesManualText, workspace_id, collection);
      const newEntryId = data.entry_id;
      if (newEntryId && activeNodeId) {
         updateNodeConfig(activeNodeId, (config) => {
            const isSupport = agentType === 'support_agent';
            const arrayKey = isSupport ? 'support_entry_ids' : 'sales_entry_ids';
            const updatedArray = [...(config[arrayKey] || []), newEntryId];
            return {
               ...config,
               [arrayKey]: updatedArray,
               entry_ids: updatedArray
            };
         });
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
     updateNodeConfig(activeNodeId, (config) => {
        const agentType = config.agent_type || 'sales_agent';
        const isSupport = agentType === 'support_agent';
        const arrayKey = isSupport ? 'support_entry_ids' : 'sales_entry_ids';
        const updatedArray = (config[arrayKey] || config.entry_ids || []).filter(id => id !== idToRemove);
        return {
           ...config,
           [arrayKey]: updatedArray,
           entry_ids: updatedArray
        };
     });
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
      const activeNode = nodesRef.current.find(n => n.id === activeNodeId);
      const isCond = activeNode?.type === 'action' && activeNode?.config?.type === 'condition';
      if (isCond) {
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
  }, [activeNodeId]);

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
      const isCond = sourceNode?.type === 'action' && sourceNode?.config?.type === 'condition';
      if (isCond) {
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

  if (!isMounted) return null;

  if (currentView === 'dashboard') {
    return (
      <DashboardView
        automations={automations}
        search={search}
        setSearch={setSearch}
        handleSelectAutomation={handleSelectAutomation}
        handleToggleStatus={handleToggleStatus}
        handleDuplicateFlow={handleDuplicateFlow}
        handleDeleteFlow={handleDeleteFlow}
        infoModal={infoModal}
        setInfoModal={setInfoModal}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        newFlowName={newFlowName}
        setNewFlowName={setNewFlowName}
        handleCreateFlowSubmit={handleCreateFlowSubmit}
      />
    );
  }

  const activeNode = nodes.find(n => n.id === activeNodeId);
  const flowValidation = validateFlowGraph(nodes, edges);

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
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1e2a] border border-white/10 hover:border-white/20 text-xs font-medium text-zinc-300 mr-2"
          >
            <Layers size={13} /> Flows List
          </button>
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
      <RepositorySidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        automations={automations}
        setAutomations={setAutomations}
        selectedItem={selectedItem}
        handleSelectAutomation={handleSelectAutomation}
        setDeleteWireModal={setDeleteWireModal}
        showToast={showToast}
      />

      {/* NODE INSPECTOR */}
      <NodeInspector
        activeNode={activeNode}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        updateNode={updateNode}
        updateNodeConfig={updateNodeConfig}
        updateButtonField={updateButtonField}
        addButtonToNode={addButtonToNode}
        removeButtonFromNode={removeButtonFromNode}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        addKeywordToTrigger={addKeywordToTrigger}
        removeKeywordFromTrigger={removeKeywordFromTrigger}
        uploading={uploading}
        uploadError={uploadError}
        uploadProgress={uploadProgress}
        isDragOver={isDragOver}
        previewUrl={previewUrl}
        clearUpload={clearUpload}
        handleFileSelect={handleFileSelect}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        handleSalesFileSelect={handleSalesFileSelect}
        salesManualText={salesManualText}
        setSalesManualText={setSalesManualText}
        handleSalesManualSave={handleSalesManualSave}
        removeSalesEntry={removeSalesEntry}
        handleSalesDrop={handleSalesDrop}
        setDeleteStepModal={setDeleteStepModal}
      />

      {/* CANVAS GRID */}
      <CanvasGrid
        isSpacePressed={isSpacePressed}
        canvasRef={canvasRef}
        gridRef={gridRef}
        zoom={zoom}
        setZoom={setZoom}
        canvasOffset={canvasOffset}
        setCanvasOffset={setCanvasOffset}
        edges={edges}
        nodes={nodes}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        flowValidation={flowValidation}
        setPreviewNode={setPreviewNode}
        stepsOpen={stepsOpen}
        setStepsOpen={setStepsOpen}
        getEdgePoints={getEdgePoints}
        wiringPreview={wiringPreview}
        handleNodePointerDown={handleNodePointerDown}
        handlePortPointerDown={handlePortPointerDown}
        handleCanvasPointerDown={handleCanvasPointerDown}
        handleCanvasPointerMove={handleCanvasPointerMove}
        handleCanvasPointerUp={handleCanvasPointerUp}
        handleWheel={handleWheel}
        nodeHeightsRef={nodeHeightsRef}
        buttonOffsetsRef={buttonOffsetsRef}
      />

      {/* STEPS TEMPLATE SIDEBAR */}
      <StepsSidebar
        stepsOpen={stepsOpen}
        setStepsOpen={setStepsOpen}
      />

      {/* WHATSAPP PREVIEW MODAL */}
      <WhatsAppPreviewModal
        previewNode={previewNode}
        setPreviewNode={setPreviewNode}
      />

      {/* AI MAGIC BAR */}
      <AiMagicBar
        aiInput={aiInput}
        setAiInput={setAiInput}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        error={error}
        setError={setError}
        setNodes={setNodes}
        setEdges={setEdges}
        setCanvasOffset={setCanvasOffset}
        setActiveNodeId={setActiveNodeId}
      />

      {/* FLOW MODALS */}
      <FlowModals
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        setNodes={setNodes}
        setEdges={setEdges}
        setActiveNodeId={setActiveNodeId}
        showToast={showToast}
        automations={automations}
        setAutomations={setAutomations}
        deleteWireModal={deleteWireModal}
        setDeleteWireModal={setDeleteWireModal}
        deleteStepModal={deleteStepModal}
        setDeleteStepModal={setDeleteStepModal}
        createWireModal={createWireModal}
        setCreateWireModal={setCreateWireModal}
        createWireName={createWireName}
        setCreateWireName={setCreateWireName}
        handleCreateNewConfirm={handleCreateNewConfirm}
      />

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
          appearance: none !important;
        }

        select option {
          background-color: #0F1115;
          color: white;
        }
      `}</style>

      {/* ─ TOAST NOTIFICATIONS ─ */}
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

    </div>
  );
}
