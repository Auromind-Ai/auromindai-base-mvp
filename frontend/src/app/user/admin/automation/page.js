'use client';

import { Poppins } from 'next/font/google';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Zap, MessageSquare, Users,
  CheckCircle2, Play, Save, MoreHorizontal, Sparkles,
  ChevronDown, ArrowDown, Shield, Bot, Send,
  Tag, Bell, Wand2, X, Split, Activity, MousePointer2, Trash2, RotateCw,
  Menu, ChevronLeft, Layers, Terminal, Cpu, Globe, Maximize,
  Settings, Database, Cloud, AlertCircle, Eye, EyeOff, Monitor,
  ZoomIn, ZoomOut, Upload, Timer, HelpCircle, FileText, Pencil,
  Brain, LayoutDashboard, BrainCircuit, BarChart2, GitBranch, Inbox
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
import FlowConversationPreviewModal from './modals/FlowConversationPreviewModal';
import FlowModals from './modals/FlowModals';

// Helper Imports
import {
  MAX_BUTTONS,
  MAX_KEYWORDS,
  sanitizeFlowData,
  validateFlowGraph,
  wouldCreateCycle,
  normalizeButtons,
  createDefaultButton,
  getHandleIdForButton,
  isConditionNode,
  isButtonMessageNode
} from './helpers';

const getNodeDefaultHeight = (node) => {
  if (!node) return 228;
  if (isConditionNode(node)) return 300;
  if (isButtonMessageNode(node)) {
    const btnCount = (node.config?.buttons || []).length;
    return 180 + btnCount * 48;
  }
  if (node.type === 'trigger') {
    return (node.config?.keywords || []).length > 0 ? 247 : 205;
  }
  return 228;
};

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

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
  const [customModal, setCustomModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
    isConfirm: true,
    onConfirm: null,
  });
  const [flowQuota, setFlowQuota] = useState({ plan_base: 5, purchased: 0, total: 5, used: 0 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // ─ MOBILE & TOUCH RESPONSIVE STATES ─
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [tabletMenuOpen, setTabletMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('canvas');
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showLandscapePrompt, setShowLandscapePrompt] = useState(true);

  // ─ MODAL & TOAST STATE ─
  const [toasts, setToasts] = useState([]);
  const [deleteWireModal, setDeleteWireModal] = useState({ open: false, item: null, isDeleting: false });
  const [deleteStepModal, setDeleteStepModal] = useState({ open: false, nodeId: null });
  const [createWireModal, setCreateWireModal] = useState(false);
  const [createWireName, setCreateWireName] = useState('');
  const [previewFlowModal, setPreviewFlowModal] = useState({ open: false, flow: null, loading: false });

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ─ CAPABILITY DETECTION & ORIENTATION MANAGEMENT ─
  useEffect(() => {
    const checkCapabilities = () => {
      if (typeof window === 'undefined') return;
      const hasTouch = window.matchMedia('(pointer: coarse)').matches || 
                       window.matchMedia('(hover: none)').matches || 
                       Boolean('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const portrait = window.matchMedia('(orientation: portrait)').matches || 
                       (window.innerHeight > window.innerWidth && hasTouch);
      setIsTouchDevice(hasTouch);
      setIsPortrait(portrait);
    };

    checkCapabilities();

    const mqlPointer = window.matchMedia?.('(pointer: coarse)');
    const mqlOrientation = window.matchMedia?.('(orientation: portrait)');

    const handleMediaChange = () => checkCapabilities();
    const handleResize = () => checkCapabilities();

    if (mqlPointer?.addEventListener) {
      mqlPointer.addEventListener('change', handleMediaChange);
      mqlOrientation?.addEventListener('change', handleMediaChange);
    } else {
      window.addEventListener('orientationchange', handleMediaChange);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (mqlPointer?.removeEventListener) {
        mqlPointer.removeEventListener('change', handleMediaChange);
        mqlOrientation?.removeEventListener('change', handleMediaChange);
      } else {
        window.removeEventListener('orientationchange', handleMediaChange);
      }
      window.removeEventListener('resize', handleResize);
      // Safe exit path: unlock screen orientation when navigating away from Automation
      try {
        if (screen.orientation?.unlock) {
          screen.orientation.unlock();
        } else if (screen.unlockOrientation) {
          screen.unlockOrientation();
        }
      } catch (e) {}
    };
  }, []);

  const handleRequestLandscape = useCallback(async () => {
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
        showToast('Switched to landscape mode!', 'success');
      } else if (screen.lockOrientation) {
        screen.lockOrientation('landscape');
        showToast('Switched to landscape mode!', 'success');
      } else {
        showToast('Please rotate your device horizontally for landscape mode', 'info');
      }
    } catch (err) {
      console.log('Orientation lock not supported by device/browser:', err);
      showToast('Please rotate your device horizontally for landscape mode', 'info');
    }
  }, [showToast]);

  const handlePreviewFlow = async (flow) => {
    if (!flow || !flow.id) return;
    setPreviewFlowModal({ open: true, flow: null, loading: true });
    try {
      const fresh = await api.getFlowById(flow.id);
      setPreviewFlowModal({ open: true, flow: sanitizeFlowData(fresh), loading: false });
    } catch (err) {
      console.error('Failed to fetch fresh flow for preview:', err);
      setPreviewFlowModal({ open: true, flow: sanitizeFlowData(flow), loading: false });
      showToast("Couldn't refresh — showing last known version of this flow.", 'error');
    }
  };

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
  const wireCancelListenerRef = useRef(null);

  useEffect(() => () => {
    if (wireMoveListenerRef.current) {
      window.removeEventListener('pointermove', wireMoveListenerRef.current);
    }
    if (wireUpListenerRef.current) {
      window.removeEventListener('pointerup', wireUpListenerRef.current);
    }
    if (wireCancelListenerRef.current) {
      window.removeEventListener('pointercancel', wireCancelListenerRef.current);
    }
    wiringRef.current = null;
  }, []);

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

  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const nodeHeightsRef = useRef({});
  const buttonOffsetsRef = useRef({});

  const [edgeTick, setEdgeTick] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setEdgeTick(t => t + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [nodes.length, edges.length]);

  const getEdgePoints = useCallback((sourceNode, targetNode, sourceHandle) => {
    if (!sourceNode || !targetNode) return null;

    const sourceHeight = nodeHeightsRef.current[sourceNode.id] || getNodeDefaultHeight(sourceNode);
    const targetHeight = nodeHeightsRef.current[targetNode.id] || getNodeDefaultHeight(targetNode);

    const sx = (sourceNode.position?.x || 0) + 208;
    let sy = (sourceNode.position?.y || 0) + sourceHeight / 2;

    if (sourceHandle) {
      const nodeOffsets = buttonOffsetsRef.current[sourceNode.id];
      const offset = nodeOffsets?.[sourceHandle]
        ?? nodeOffsets?.[`branch-${sourceHandle}`]
        ?? (typeof sourceHandle === 'string' ? nodeOffsets?.[sourceHandle.replace('branch-', '')] : undefined);

      if (typeof offset === 'number') {
        sy = (sourceNode.position?.y || 0) + offset;
      } else if (gridRef.current) {
        const sourceEl = gridRef.current.querySelector(`[data-node-id="${sourceNode.id}"]`);
        if (sourceEl) {
          const btnEl =
            sourceEl.querySelector(`[data-button-id="${sourceHandle}"]`) ||
            sourceEl.querySelector(`[data-branch-id="${sourceHandle}"]`) ||
            (typeof sourceHandle === 'string' ? sourceEl.querySelector(`[data-branch-id="${sourceHandle.replace('branch-', '')}"]`) : null);
          if (btnEl) {
            const calculatedOffset = btnEl.offsetTop + btnEl.offsetHeight / 2;
            if (!buttonOffsetsRef.current[sourceNode.id]) buttonOffsetsRef.current[sourceNode.id] = {};
            buttonOffsetsRef.current[sourceNode.id][sourceHandle] = calculatedOffset;
            sy = (sourceNode.position?.y || 0) + calculatedOffset;
          }
        }
      }

      // Initial frame algebraic fallback before DOM ref measurement:
      if (typeof offset !== 'number') {
        if (sourceHandle === 'true' || sourceHandle === 'branch-true') {
          sy = (sourceNode.position?.y || 0) + 168;
        } else if (sourceHandle === 'false' || sourceHandle === 'branch-false') {
          sy = (sourceNode.position?.y || 0) + 214;
        } else if (sourceNode.config?.buttons) {
          const btnIndex = (sourceNode.config.buttons || []).findIndex(
            (b, idx) => b.id === sourceHandle || b.value === sourceHandle || getHandleIdForButton(b, idx) === sourceHandle
          );
          if (btnIndex >= 0) {
            sy = (sourceNode.position?.y || 0) + 145 + btnIndex * 48;
          }
        }
      }
    }

    const tx = (targetNode.position?.x || 0);
    const ty = (targetNode.position?.y || 0) + targetHeight / 2;

    return { sx, sy, tx, ty };
  }, [edgeTick]);

  const fetchFlowQuota = useCallback(async () => {
    const wsId = getWorkspaceIdFromToken();
    if (!wsId) return;
    try {
      const quota = await api.getFlowQuota(wsId);
      setFlowQuota(quota);
    } catch (e) {
      console.error("Failed to fetch flow quota:", e);
    }
  }, []);

  async function fetchFlows(shouldSelectCanvas = false) {
    try {
      const data = await api.getFlows();
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
          try {
            const freshItem = await api.getFlowById(itemToSelect.id);
            const sanitizedItem = sanitizeFlowData(freshItem);
            setSelectedItem(sanitizedItem);
            setNodes(sanitizedItem.nodes || []);
            setEdges(sanitizedItem.edges || []);
          } catch (e) {
            const sanitizedItem = sanitizeFlowData(itemToSelect);
            setSelectedItem(sanitizedItem);
            setNodes(sanitizedItem.nodes || []);
            setEdges(sanitizedItem.edges || []);
          }
          if (shouldSelectCanvas) {
            setCurrentView('canvas');
          }
        }
      }
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    fetchFlows(false);
    fetchFlowQuota();
    const handleKeyDown = (e) => { if (e.code === 'Space') setIsSpacePressed(true); };
    const handleKeyUp = (e) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFlowQuota]);

  async function handleSelectAutomation(item) {
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
  }

  const handleToggleStatus = async (flow) => {
    const newStatus = flow.status === 'Active' ? 'Draft' : 'Active';

    const performToggle = async () => {
      try {
        const updated = await api.updateFlowStatus(flow.id, newStatus);
        const sanitizedUpdated = sanitizeFlowData(updated);
        setAutomations(prev => prev.map(a => a.id === sanitizedUpdated.id ? sanitizedUpdated : a));
        if (selectedItem?.id === flow.id) {
          setSelectedItem(sanitizedUpdated);
        }
        fetchFlowQuota();
        showToast(`Flow status updated to ${newStatus}!`, "success");
      } catch (e) {
        console.error(e);
        setCustomModal({
          open: true,
          title: 'Status Update Failed',
          message: 'Failed to update status: ' + (e.message || 'Unknown error'),
          confirmText: 'Dismiss',
          isConfirm: false,
          confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
          onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
        });
      }
    };

    if (newStatus === 'Active') {
      setCustomModal({
        open: true,
        title: 'Deploy Flow',
        message: `Are you sure you want to deploy and activate the flow "${flow.name}"? This will enable automated triggers.`,
        confirmText: 'Deploy',
        cancelText: 'Cancel',
        confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
        isConfirm: true,
        onConfirm: () => {
          setCustomModal(prev => ({ ...prev, open: false }));
          performToggle();
        }
      });
    } else {
      setCustomModal({
        open: true,
        title: 'Deactivate Flow',
        message: `Are you sure you want to pause and deactivate the flow "${flow.name}"? Active executions will stop.`,
        confirmText: 'Deactivate',
        cancelText: 'Cancel',
        confirmColor: 'bg-zinc-700 hover:bg-zinc-650 text-white border border-white/10',
        isConfirm: true,
        onConfirm: () => {
          setCustomModal(prev => ({ ...prev, open: false }));
          performToggle();
        }
      });
    }
  };

  const handleDuplicateFlow = async (flow) => {
    const performDuplicate = async () => {
      try {
        const newFlow = await api.saveFlow({
          name: `Copy of ${flow.name}`,
          trigger_type: flow.trigger_type || 'msg_recv',
          nodes: flow.nodes || [],
          edges: flow.edges || [],
          status: 'Draft'
        });
        setAutomations(prev => [...prev, newFlow]);
        fetchFlowQuota();
        setCustomModal({
          open: true,
          title: 'Flow Duplicated',
          message: `Flow duplicated successfully as "Copy of ${flow.name}"!`,
          confirmText: 'Done',
          isConfirm: false,
          confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
          onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
        });
      } catch (e) {
        console.error(e);
        setCustomModal({
          open: true,
          title: 'Duplication Failed',
          message: 'Failed to duplicate flow: ' + e.message,
          confirmText: 'Dismiss',
          isConfirm: false,
          confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
          onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
        });
      }
    };

    setCustomModal({
      open: true,
      title: 'Duplicate Flow',
      message: `Are you sure you want to duplicate "${flow.name}"?`,
      confirmText: 'Duplicate',
      cancelText: 'Cancel',
      confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
      isConfirm: true,
      onConfirm: () => {
        setCustomModal(prev => ({ ...prev, open: false }));
        performDuplicate();
      }
    });
  };

  const handleDeleteFlow = async (flowId) => {
    const flow = automations.find(a => a.id === flowId);
    const flowName = flow ? flow.name : 'this flow';

    const performDelete = async () => {
      try {
        await api.deleteFlow(flowId);
        setAutomations(prev => prev.filter(a => a.id !== flowId));
        if (selectedItem?.id === flowId) {
          setSelectedItem(null);
          setCurrentView('dashboard');
        }
        fetchFlowQuota();
      } catch (e) {
        console.error(e);
        setCustomModal({
          open: true,
          title: 'Deletion Failed',
          message: 'Failed to delete flow: ' + e.message,
          confirmText: 'Dismiss',
          isConfirm: false,
          confirmColor: 'bg-rose-600 hover:bg-rose-500',
          onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
        });
      }
    };

    setCustomModal({
      open: true,
      title: 'Delete Flow',
      message: `Are you sure you want to delete the flow "${flowName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      isConfirm: true,
      onConfirm: () => {
        setCustomModal(prev => ({ ...prev, open: false }));
        performDelete();
      }
    });
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
      fetchFlowQuota();
    } catch (e) {
      console.error(e);
      setCustomModal({
        open: true,
        title: 'Creation Failed',
        message: 'Failed to create flow: ' + e.message,
        confirmText: 'Dismiss',
        isConfirm: false,
        confirmColor: 'bg-[#814AC8] hover:bg-[#723bb3]',
        onConfirm: () => setCustomModal(prev => ({ ...prev, open: false }))
      });
    }
  };

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ─ DETERMINISTIC GESTURE STATE MACHINE ─
  // States: 'IDLE' | 'PENDING_LONG_PRESS' | 'MOUSE_NODE_DOWN' | 'NODE_DRAGGING' | 'CANVAS_PANNING' | 'PINCH_ZOOMING' | 'CANCELLED'
  const gestureStateRef = useRef('IDLE');
  const activePointersRef = useRef(new Map());
  const longPressTimerRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const nodeSessionRef = useRef({
    nodeId: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    startNodeX: 0,
    startNodeY: 0,
    startTime: 0,
    maxDist: 0,
  });

  const panSessionRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const pinchSessionRef = useRef({
    initialDist: 0,
    initialZoom: 1,
    initialOffsetX: 0,
    initialOffsetY: 0,
    initialCenter: { x: 0, y: 0 },
  });

  const dragRafIdRef = useRef(null);
  const pendingDragPosRef = useRef(null);
  const pendingPanPosRef = useRef(null);

  const applyPendingDrag = useCallback(() => {
    dragRafIdRef.current = null;
    if (pendingDragPosRef.current) {
      const { nodeId, newX, newY } = pendingDragPosRef.current;
      pendingDragPosRef.current = null;
      setNodes(prev => prev.map(n =>
        n.id !== nodeId ? n : {
          ...n,
          position: { x: newX, y: newY },
        }
      ));
    }
    if (pendingPanPosRef.current) {
      const { newOffsetX, newOffsetY } = pendingPanPosRef.current;
      pendingPanPosRef.current = null;
      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    }
  }, []);

  const cleanupAllGestures = useCallback(() => {
    if (dragRafIdRef.current) {
      cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }
    pendingDragPosRef.current = null;
    pendingPanPosRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    activePointersRef.current.clear();
    gestureStateRef.current = 'IDLE';
    setDraggingNodeId(null);
  }, []);

  const initPinchMode = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setDraggingNodeId(null);

    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2) return;

    const [p1, p2] = pointers;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    gestureStateRef.current = 'PINCH_ZOOMING';
    pinchSessionRef.current = {
      initialDist: Math.max(dist, 10),
      initialZoom: zoomRef.current || 1,
      initialOffsetX: canvasOffsetRef.current.x,
      initialOffsetY: canvasOffsetRef.current.y,
      initialCenter: { x: midX, y: midY },
    };
  }, []);

  const handleNodePointerDown = useCallback((e, nodeId) => {
    if (e.target.closest?.('[data-no-drag]')) return;
    wasDraggingRef.current = false;
    e.stopPropagation();

    const pointerType = e.pointerType || 'mouse';
    const isTouch = pointerType === 'touch' || pointerType === 'pen';

    activePointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      type: pointerType,
      targetType: 'node',
      targetId: nodeId,
    });

    if (activePointersRef.current.size >= 2) {
      initPinchMode();
      return;
    }

    const node = nodesRef.current.find(n => n.id === nodeId);
    const startNodeX = node ? node.position.x : 0;
    const startNodeY = node ? node.position.y : 0;

    nodeSessionRef.current = {
      nodeId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX,
      startNodeY,
      startTime: Date.now(),
      maxDist: 0,
    };

    if (isTouch) {
      gestureStateRef.current = 'PENDING_LONG_PRESS';
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = setTimeout(() => {
        if (gestureStateRef.current !== 'PENDING_LONG_PRESS') return;
        if (activePointersRef.current.size !== 1) return;

        gestureStateRef.current = 'NODE_DRAGGING';
        setDraggingNodeId(nodeId);

        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
          }
        } catch (err) {}
      }, 450);
    } else {
      gestureStateRef.current = 'MOUSE_NODE_DOWN';
    }
  }, [initPinchMode]);

  const handleCanvasPointerDown = useCallback((e) => {
    if (e.target.closest?.('[data-node-id]')) return;
    if (e.target.closest?.('[data-steps-panel]')) return;

    const pointerType = e.pointerType || 'mouse';

    activePointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      type: pointerType,
      targetType: 'canvas',
      targetId: null,
    });

    if (activePointersRef.current.size >= 2) {
      initPinchMode();
      return;
    }

    gestureStateRef.current = 'CANVAS_PANNING';
    panSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: canvasOffsetRef.current.x,
      startOffsetY: canvasOffsetRef.current.y,
    };
  }, [initPinchMode]);

  const handleGlobalPointerMove = useCallback((e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;

    const ptr = activePointersRef.current.get(e.pointerId);
    activePointersRef.current.set(e.pointerId, {
      ...ptr,
      x: e.clientX,
      y: e.clientY,
    });

    const state = gestureStateRef.current;

    // PINCH ZOOMING
    if (state === 'PINCH_ZOOMING' && activePointersRef.current.size >= 2) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentMidX = (p1.x + p2.x) / 2;
      const currentMidY = (p1.y + p2.y) / 2;

      const { initialDist, initialZoom, initialOffsetX, initialOffsetY, initialCenter } = pinchSessionRef.current;

      if (initialDist > 0 && canvasRef.current) {
        const scaleFactor = currentDist / initialDist;
        const newZoom = Math.min(Math.max(initialZoom * scaleFactor, 0.4), 2.0);

        const rect = canvasRef.current.getBoundingClientRect();
        const initMidCanvasX = initialCenter.x - rect.left;
        const initMidCanvasY = initialCenter.y - rect.top;
        const curMidCanvasX = currentMidX - rect.left;
        const curMidCanvasY = currentMidY - rect.top;

        const worldX = (initMidCanvasX / initialZoom) - initialOffsetX;
        const worldY = (initMidCanvasY / initialZoom) - initialOffsetY;

        const newOffsetX = (curMidCanvasX / newZoom) - worldX;
        const newOffsetY = (curMidCanvasY / newZoom) - worldY;

        setZoom(newZoom);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      }
      return;
    }

    // PENDING LONG PRESS (Mobile touch on node, waiting 450ms)
    if (state === 'PENDING_LONG_PRESS') {
      const { startX, startY } = nodeSessionRef.current;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      nodeSessionRef.current.maxDist = Math.max(nodeSessionRef.current.maxDist || 0, dist);

      if (dist > 18) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        gestureStateRef.current = 'CANCELLED';
      }
      return;
    }

    // CANCELLED (Finger moved before 450ms)
    if (state === 'CANCELLED') {
      const { startX, startY } = nodeSessionRef.current;
      if (startX && startY) {
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        nodeSessionRef.current.maxDist = Math.max(nodeSessionRef.current.maxDist || 0, dist);
      }
      return;
    }

    // NODE DRAGGING (active touch drag or active mouse drag)
    if (state === 'NODE_DRAGGING') {
      wasDraggingRef.current = true;
      const { nodeId, startX, startY, startNodeX, startNodeY } = nodeSessionRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const currentZoom = zoomRef.current || 1;

      pendingDragPosRef.current = {
        nodeId,
        newX: startNodeX + dx / currentZoom,
        newY: startNodeY + dy / currentZoom,
      };

      if (!dragRafIdRef.current) {
        dragRafIdRef.current = requestAnimationFrame(applyPendingDrag);
      }
      return;
    }

    // MOUSE NODE DOWN (Desktop mouse on node)
    if (state === 'MOUSE_NODE_DOWN') {
      const { nodeId, startX, startY, startNodeX, startNodeY } = nodeSessionRef.current;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      nodeSessionRef.current.maxDist = Math.max(nodeSessionRef.current.maxDist || 0, dist);

      if (dist > 4) {
        wasDraggingRef.current = true;
        gestureStateRef.current = 'NODE_DRAGGING';
        setDraggingNodeId(nodeId);
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const currentZoom = zoomRef.current || 1;

        pendingDragPosRef.current = {
          nodeId,
          newX: startNodeX + dx / currentZoom,
          newY: startNodeY + dy / currentZoom,
        };

        if (!dragRafIdRef.current) {
          dragRafIdRef.current = requestAnimationFrame(applyPendingDrag);
        }
      }
      return;
    }

    // CANVAS PANNING (1 finger or mouse on empty canvas)
    if (state === 'CANVAS_PANNING') {
      const { startX, startY, startOffsetX, startOffsetY } = panSessionRef.current;
      const currentZoom = zoomRef.current || 1;
      const dx = (e.clientX - startX) / currentZoom;
      const dy = (e.clientY - startY) / currentZoom;

      pendingPanPosRef.current = {
        newOffsetX: startOffsetX + dx,
        newOffsetY: startOffsetY + dy,
      };

      if (!dragRafIdRef.current) {
        dragRafIdRef.current = requestAnimationFrame(applyPendingDrag);
      }
      return;
    }
  }, [applyPendingDrag]);

  const handleGlobalPointerUp = useCallback((e) => {
    activePointersRef.current.delete(e.pointerId);

    if (dragRafIdRef.current) {
      cancelAnimationFrame(dragRafIdRef.current);
      applyPendingDrag();
    }

    const state = gestureStateRef.current;

    if (activePointersRef.current.size >= 2) {
      initPinchMode();
      return;
    }

    if (state === 'PINCH_ZOOMING') {
      gestureStateRef.current = 'IDLE';
      return;
    }

    const now = Date.now();
    const nodeSession = nodeSessionRef.current;
    const elapsed = nodeSession?.startTime ? (now - nodeSession.startTime) : Infinity;
    const maxDist = nodeSession?.maxDist || 0;

    // Check if this was a quick tap on a node:
    // Released quickly (< 400ms) with small movement (<= 18px):
    const isQuickTap = (state === 'PENDING_LONG_PRESS' || state === 'CANCELLED' || state === 'MOUSE_NODE_DOWN') &&
                       elapsed < 400 && maxDist <= 18 && Boolean(nodeSession?.nodeId);

    if (isQuickTap) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      lastTapTimeRef.current = now;
      setActiveNodeId(nodeSession.nodeId);
      gestureStateRef.current = 'IDLE';
      return;
    }

    if (state === 'PENDING_LONG_PRESS') {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (nodeSession?.nodeId) {
        lastTapTimeRef.current = now;
        setActiveNodeId(nodeSession.nodeId);
      }
      gestureStateRef.current = 'IDLE';
      return;
    }

    if (state === 'MOUSE_NODE_DOWN') {
      if (nodeSession?.nodeId && maxDist <= 4) {
        lastTapTimeRef.current = now;
        setActiveNodeId(nodeSession.nodeId);
      }
      gestureStateRef.current = 'IDLE';
      return;
    }

    if (state === 'NODE_DRAGGING') {
      setDraggingNodeId(null);
      gestureStateRef.current = 'IDLE';
      setTimeout(() => { wasDraggingRef.current = false; }, 300);
      return;
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setDraggingNodeId(null);
    gestureStateRef.current = 'IDLE';
  }, [initPinchMode, applyPendingDrag]);

  const handleNodeClick = useCallback((e, nodeId) => {
    if (e.target.closest?.('[data-no-drag]')) return;
    if (wasDraggingRef.current || draggingNodeId) return;
    e.stopPropagation();
    lastTapTimeRef.current = Date.now();
    setActiveNodeId(nodeId);
  }, [draggingNodeId]);

  const handleCanvasClick = useCallback((e) => {
    if (e.target.closest?.('[data-steps-panel]')) return;
    if (e.target.closest?.('[data-node-id]')) return;
    if (Date.now() - lastTapTimeRef.current < 450) return;
    setActiveNodeId(null);
    setStepsOpen(false);
  }, []);

  useEffect(() => {
    const onMove = (e) => handleGlobalPointerMove(e);
    const onUp = (e) => handleGlobalPointerUp(e);
    const onCancel = (e) => {
      activePointersRef.current.delete(e.pointerId);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setDraggingNodeId(null);
      if (activePointersRef.current.size === 0) {
        gestureStateRef.current = 'IDLE';
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanupAllGestures();
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp, cleanupAllGestures]);

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

  const handleCanvasPointerMove = handleGlobalPointerMove;
  const handleCanvasPointerUp = handleGlobalPointerUp;

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

    if (sourceNode.type === 'action' && sourceNode.config?.type === 'brain_query') {
      const msg = 'AI Reply must be the final step. No steps can be added after AI Reply.';
      setError(msg);
      showToast(msg, 'error');
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
  }, [activeNodeId, showToast]);

  const connectPortToNode = useCallback((sourceId, sourceHandle = null, targetId) => {
    if (sourceId === targetId) {
      setError('A node cannot connect to itself.');
      return false;
    }

    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (sourceNode?.type === 'action' && sourceNode.config?.type === 'brain_query') {
      const msg = 'AI Reply must be the final step. No steps can be added after AI Reply.';
      setError(msg);
      showToast(msg, 'error');
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
  }, [showToast]);

  const handlePortPointerDown = useCallback((e, sourceId, sourceHandle = null, targetOffsetY = 0) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceNode = nodesRef.current.find((node) => node.id === sourceId);
    if (sourceNode?.type === 'action' && sourceNode.config?.type === 'brain_query') {
      const msg = 'AI Reply must be the final step. No steps can be added after AI Reply.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

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

    const cleanupWiring = () => {
      wiringRef.current = null;
      setWiringPreview(null);
      if (wireMoveListenerRef.current) {
        window.removeEventListener('pointermove', wireMoveListenerRef.current);
        wireMoveListenerRef.current = null;
      }
      if (wireUpListenerRef.current) {
        window.removeEventListener('pointerup', wireUpListenerRef.current);
        wireUpListenerRef.current = null;
      }
      if (wireCancelListenerRef.current) {
        window.removeEventListener('pointercancel', wireCancelListenerRef.current);
        wireCancelListenerRef.current = null;
      }
    };

    if (wireMoveListenerRef.current) {
      window.removeEventListener('pointermove', wireMoveListenerRef.current);
    }
    if (wireUpListenerRef.current) {
      window.removeEventListener('pointerup', wireUpListenerRef.current);
    }
    if (wireCancelListenerRef.current) {
      window.removeEventListener('pointercancel', wireCancelListenerRef.current);
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
      cleanupWiring();

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

    const handleWireCancel = () => {
      cleanupWiring();
    };

    wireMoveListenerRef.current = handleWireMove;
    wireUpListenerRef.current = handleWireUp;
    wireCancelListenerRef.current = handleWireCancel;
    window.addEventListener('pointermove', handleWireMove);
    window.addEventListener('pointerup', handleWireUp);
    window.addEventListener('pointercancel', handleWireCancel);
  }, [connectPortToNode, createNodeFromPort, getCanvasPointFromClient, getPortAnchorPoint, showToast]);

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

  const activeNode = useMemo(() => nodes.find(n => n.id === activeNodeId), [nodes, activeNodeId]);

  const nodeStructureKey = useMemo(() => {
    return nodes.map(n => `${n.id}:${n.type}:${n.config?.type || ''}:${(n.config?.buttons || []).length}:${(n.config?.branches || []).length}`).join('|');
  }, [nodes]);

  const flowValidation = useMemo(() => {
    return validateFlowGraph(nodes, edges);
  }, [nodeStructureKey, edges, nodes]);

  if (!isMounted) return null;

  if (currentView === 'dashboard') {
    return (
      <>
        <DashboardView
          automations={automations}
          search={search}
          setSearch={setSearch}
          handleSelectAutomation={handleSelectAutomation}
          handleToggleStatus={handleToggleStatus}
          handleDuplicateFlow={handleDuplicateFlow}
          handleDeleteFlow={handleDeleteFlow}
          handlePreviewFlow={handlePreviewFlow}
          infoModal={infoModal}
          setInfoModal={setInfoModal}
          isCreateModalOpen={isCreateModalOpen}
          setIsCreateModalOpen={setIsCreateModalOpen}
          newFlowName={newFlowName}
          setNewFlowName={setNewFlowName}
          handleCreateFlowSubmit={handleCreateFlowSubmit}
          customModal={customModal}
          setCustomModal={setCustomModal}
          flowQuota={flowQuota}
          fetchFlowQuota={fetchFlowQuota}
        />
        <FlowConversationPreviewModal
          isOpen={previewFlowModal.open}
          flow={previewFlowModal.flow}
          loading={previewFlowModal.loading}
          onClose={() => setPreviewFlowModal({ open: false, flow: null, loading: false })}
        />
      </>
    );
  }

  return (
    <div className={`${poppins.className} ${zenMode ? 'fixed inset-0 z-[200]' : 'relative w-full h-screen'} bg-[#0d0d12] text-zinc-200 overflow-hidden select-none border-t border-white/5`} style={{ fontFamily: "'Poppins', sans-serif" }}>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/5 blur-[200px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-violet-600/5 blur-[200px] rounded-full" />
      </div>

      {/* LANDSCAPE PROMPT BANNER FOR MOBILE/TABLET TOUCH IN PORTRAIT */}
      <AnimatePresence>
        {showLandscapePrompt && isTouchDevice && isPortrait && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 md:top-20 inset-x-3 sm:inset-x-auto sm:right-4 z-[140] max-w-md mx-auto bg-[#141520]/95 border border-violet-500/35 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
              <RotateCw size={16} className="text-violet-400 animate-spin-slow" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-tight">Switch to Landscape Mode</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleRequestLandscape}
                className="px-3 py-1.5 rounded-xl bg-[#814AC8] hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap active:scale-95 cursor-pointer"
              >
                Use Landscape
              </button>
              <button
                onClick={() => setShowLandscapePrompt(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Dismiss Landscape Suggestion"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP HEADER (>1024px) */}
      {!zenMode ? (
        <header className="hidden lg:flex absolute top-5 left-0 right-0 h-[82px] z-[100] items-center justify-center px-4 bg-[#13131a] border-b border-white/5 shadow-xl">
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
                {isEditingName ? (
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => {
                      if (tempName.trim()) {
                        const updatedName = tempName.trim();
                        setSelectedItem(prev => ({ ...prev, name: updatedName }));
                        setAutomations(prev => prev.map(a => a.id === selectedItem?.id ? { ...a, name: updatedName } : a));
                      }
                      setIsEditingName(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (tempName.trim()) {
                          const updatedName = tempName.trim();
                          setSelectedItem(prev => ({ ...prev, name: updatedName }));
                          setAutomations(prev => prev.map(a => a.id === selectedItem?.id ? { ...a, name: updatedName } : a));
                        }
                        setIsEditingName(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingName(false);
                      }
                    }}
                    className="bg-black/35 border border-white/10 rounded px-2 py-0.5 text-[12px] font-medium text-white outline-none focus:border-purple-500/50 w-48 font-sans"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1.5 group/name">
                    <span className="text-[12px] font-medium text-white/75 leading-none">{selectedItem?.name || "Untitled Wire"}</span>
                    <button
                      onClick={() => {
                        setTempName(selectedItem?.name || "Untitled Wire");
                        setIsEditingName(true);
                      }}
                      className="p-1 opacity-0 group-hover/name:opacity-100 hover:text-white transition-opacity text-white/40"
                      title="Rename Flow"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>

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
                onClick={() => setZenMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-medium bg-[#1e1e2a] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                <Eye size={13} />
                Zen mode
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
      ) : (
        <div className="hidden lg:flex absolute top-5 right-6 z-[100] items-center">
          <button
            onClick={() => setZenMode(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/40 bg-indigo-500/20 text-indigo-300 transition-all text-xs font-medium shadow-lg hover:bg-indigo-500/30 cursor-pointer"
          >
            <EyeOff size={13} />
            Exit Zen
          </button>
        </div>
      )}

      {/* TABLET HEADER (768px - 1024px) */}
      {!zenMode ? (
        <header className="hidden md:flex lg:hidden absolute top-0 left-0 right-0 h-16 z-[100] items-center justify-between px-4 bg-[#13131a] border-b border-white/10 shadow-xl">
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
            <div className="w-8 h-8 rounded-xl bg-[#814AC8] flex items-center justify-center shadow-md">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wider">Agentic Orchestrator</span>
              <span className="text-[11px] font-medium text-white/60 truncate max-w-[140px]">{selectedItem?.name || "Untitled Wire"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1e2a] border border-white/10 text-xs text-zinc-300"
            >
              <Layers size={13} /> Flows List
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#814AC8] text-xs font-semibold text-white"
            >
              <Plus size={14} /> New Wire
            </button>
            <div className="relative">
              <button
                onClick={() => setTabletMenuOpen(!tabletMenuOpen)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300"
              >
                <MoreHorizontal size={18} />
              </button>
              {tabletMenuOpen && (
                <div className="absolute right-0 top-10 w-44 bg-[#161622] border border-white/15 rounded-xl shadow-2xl p-1.5 z-[150] space-y-1">
                  <button
                    onClick={() => { setZenMode(true); setTabletMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg text-left"
                  >
                    <Eye size={14} /> Zen mode
                  </button>
                  <button
                    onClick={() => { handleSave(); setTabletMenuOpen(false); }}
                    disabled={isSaving || !selectedItem || !flowValidation.isValid}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 rounded-lg text-left disabled:opacity-40"
                  >
                    <Save size={14} /> Sync Wire
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      ) : (
        <div className="hidden md:flex lg:hidden absolute top-4 right-4 z-[100] items-center">
          <button
            onClick={() => setZenMode(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all shadow-lg hover:bg-indigo-500/30 cursor-pointer"
          >
            <EyeOff size={13} /> Exit Zen
          </button>
        </div>
      )}

      {/* MOBILE HEADER (<768px) */}
      {!zenMode ? (
        <header className="flex md:hidden items-center justify-between px-4 py-2.5 bg-[#0E0F15] border-b border-white/10 relative z-[100] h-14">
          {/* Left: Flows button */}
          <button
            onClick={() => {
              setSelectedItem(null);
              setCurrentView('dashboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all"
          >
            <ChevronLeft size={14} />
            <span>Flows</span>
          </button>

          {/* Center: Agentic Orchestrator + Wire Name */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-[#814AC8] flex items-center justify-center">
                <Sparkles size={11} className="text-white" />
              </div>
              <span className="text-xs font-bold text-white tracking-wider">Agentic Orchestrator</span>
            </div>
            <span className="text-[11px] font-medium text-white/60 truncate max-w-[150px] mt-0.5">
              {selectedItem?.name || "Untitled Wire"}
            </span>
          </div>

          {/* Right: Three-dot Menu (⋮) */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
            aria-label="More Options"
          >
            <MoreHorizontal size={18} />
          </button>
        </header>
      ) : (
        <div className="flex md:hidden items-center justify-end px-4 py-3 absolute top-0 right-0 z-[100]">
          <button
            onClick={() => setZenMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all shadow-lg cursor-pointer"
          >
            <EyeOff size={13} />
            <span>Exit Zen</span>
          </button>
        </div>
      )}

      {/* DESKTOP/TABLET FLOW HEALTH BAR */}
      {!zenMode && (
        <div className="hidden md:block absolute top-20 lg:top-26 left-0 right-0 z-[95]">
          <div className="bg-[#13131a] border-b border-white/5 px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-Regular text-white tracking-widest">Flow Health</span>
              <span className="text-[12px] text-white/80">
                Execution preview reaches {flowValidation.reachableNodeIds.size} of {nodes.length} node{nodes.length === 1 ? '' : 's'}.
              </span>
              <div className="ml-auto flex items-center gap-2 text-xs font-medium select-none">
                <span className={`w-2 h-2 rounded-full ${flowValidation.isValid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={flowValidation.isValid ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {flowValidation.isValid ? 'Ready to save' : 'Validation required'}
                </span>
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
      )}

      {/* MOBILE FLOW HEALTH CARD (<768px) */}
      {!zenMode && (
        <div className="block md:hidden relative z-[95] bg-[#13131a] border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-white tracking-wider">Flow Health</span>
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${flowValidation.isValid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={flowValidation.isValid ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {flowValidation.isValid ? 'Ready to save' : 'Validation required'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-white/70">
            Execution preview reaches {flowValidation.reachableNodeIds.size} of {nodes.length} node{nodes.length === 1 ? '' : 's'}.
          </p>
          {flowValidation.errors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {flowValidation.errors.map((item, index) => (
                <div key={`mob-err-${index}`} className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">{item}</div>
              ))}
            </div>
          )}
          {flowValidation.warnings.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {flowValidation.warnings.map((item, index) => (
                <div key={`mob-warn-${index}`} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">{item}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ZOOM CONTROLS */}
      <div className="absolute right-4 bottom-36 md:bottom-32 z-50 flex flex-col gap-1.5 bg-[#13131a]/95 border border-white/8 rounded-xl p-2 shadow-lg">
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
        draggingNodeId={draggingNodeId}
        flowValidation={flowValidation}
        setPreviewNode={setPreviewNode}
        stepsOpen={stepsOpen}
        setStepsOpen={setStepsOpen}
        getEdgePoints={getEdgePoints}
        wiringPreview={wiringPreview}
        handleNodePointerDown={handleNodePointerDown}
        handleNodeClick={handleNodeClick}
        handlePortPointerDown={handlePortPointerDown}
        handleCanvasPointerDown={handleCanvasPointerDown}
        handleCanvasPointerMove={handleCanvasPointerMove}
        handleCanvasPointerUp={handleCanvasPointerUp}
        handleCanvasClick={handleCanvasClick}
        handleWheel={handleWheel}
        nodeHeightsRef={nodeHeightsRef}
        buttonOffsetsRef={buttonOffsetsRef}
        zenMode={zenMode}
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

      {/* FLOW CONVERSATION PREVIEW MODAL */}
      <FlowConversationPreviewModal
        isOpen={previewFlowModal.open}
        flow={previewFlowModal.flow}
        loading={previewFlowModal.loading}
        onClose={() => setPreviewFlowModal({ open: false, flow: null, loading: false })}
      />

      {/* AI MAGIC BAR */}
      {!zenMode && (
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
      )}

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

      {/* MORE MENU BOTTOM SHEET (<768px) */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[210] md:hidden"
            />
            <motion.div
              initial={{ y: 250 }}
              animate={{ y: 0 }}
              exit={{ y: 250 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[220] bg-[#14151C] border-t border-white/15 rounded-t-[24px] p-5 shadow-2xl space-y-2 md:hidden"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 text-center text-white/70">
                Actions Menu
              </h3>

              <button
                onClick={() => {
                  setSidebarOpen(!sidebarOpen);
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition"
              >
                <Layers size={16} className="text-violet-400" />
                <span>Flow List</span>
              </button>

              <button
                onClick={() => {
                  setZenMode(!zenMode);
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition"
              >
                {zenMode ? <EyeOff size={16} className="text-indigo-400" /> : <Eye size={16} className="text-indigo-400" />}
                <span>{zenMode ? 'Exit Zen Mode' : 'Zen Mode'}</span>
              </button>

              <button
                onClick={() => {
                  handleSave();
                  setMoreMenuOpen(false);
                }}
                disabled={isSaving || !selectedItem || !flowValidation.isValid}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition disabled:opacity-40"
              >
                <Save size={16} className="text-emerald-400" />
                <span>{isSaving ? 'Syncing...' : 'Sync Wire'}</span>
              </button>

              <button
                onClick={() => {
                  handleCreateNew();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#814AC8] text-xs font-semibold text-white hover:bg-violet-500 transition shadow-lg"
              >
                <Plus size={16} />
                <span>New Wire</span>
              </button>

              <button
                onClick={() => setMoreMenuOpen(false)}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-white text-center font-medium mt-2"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM NAVIGATION BAR (<768px in portrait) */}
      <nav className="flex md:hidden landscape:hidden fixed bottom-0 inset-x-0 z-[160] bg-[#0E0F15]/95 backdrop-blur-2xl border-t border-white/10 px-6 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] items-center justify-around">
        <button
          onClick={() => {
            setMobileTab('canvas');
            setCurrentView('canvas');
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            mobileTab === 'canvas' ? 'text-[#814AC8]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sparkles size={18} />
          <span>Canvas</span>
        </button>

        <button
          onClick={() => {
            setMobileTab('flows');
            setSidebarOpen(true);
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            mobileTab === 'flows' ? 'text-[#814AC8]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Layers size={18} />
          <span>Flows</span>
        </button>

        <button
          onClick={() => {
            setMobileTab('more');
            setMoreMenuOpen(true);
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            mobileTab === 'more' ? 'text-[#814AC8]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </nav>

      <style jsx global>{`
        body, button, input, select, textarea, div, span, p, h1, h2, h3, h4, h5, h6 {
          font-family: 'Poppins', sans-serif !important;
        }
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
