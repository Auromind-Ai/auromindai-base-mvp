'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Zap, MessageSquare, Users, Clock,
  CheckCircle2, Play, Save, MoreHorizontal, Sparkles,
  ChevronDown, ArrowDown, Shield, Bot, Send, UserPlus,
  Tag, Bell, Wand2, X, Split, Activity, MousePointer2, Trash2,
  Menu, ChevronLeft, Layers, Terminal, Cpu, Globe, Maximize,
  Settings, Database, Cloud, AlertCircle, Eye, EyeOff, Monitor,
  ZoomIn, ZoomOut
} from 'lucide-react';
import api from '@/lib/api';

const TRIGGERS = [
  { id: 'new_lead', label: 'New Lead', icon: UserPlus, color: 'text-blue-400' },
  { id: 'msg_recv', label: 'Message Received', icon: MessageSquare, color: 'text-indigo-400' },
  { id: 'flow_done', label: 'Flow Done', icon: Zap, color: 'text-amber-400' },
  { id: 'no_reply', label: 'Inactivity', icon: Clock, color: 'text-rose-400' },
];

const ACTIONS = [
  { id: 'send_msg', label: 'Send Message', icon: Send },
  { id: 'assign_agent', label: 'Assign Agent', icon: Users },
  { id: 'brain_query', label: 'Brain Query', icon: Sparkles },
  { id: 'move_stage', label: 'Move Deal', icon: Split },
  { id: 'notification', label: 'Notify', icon: Bell },
];

const getIcon = (type) => {
    const all = [...TRIGGERS, ...ACTIONS, {id: 'condition', icon: Filter}, {id: 'trigger', icon: Zap}];
    return all.find(i => i.id === type)?.icon || Bot;
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
  
  // Canvas State (Pan & Zoom)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  // Nodes and Edges
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  const canvasRef = useRef(null);

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
        const data = await api.get('/automation/flows');
        if (Array.isArray(data)) {
            setAutomations(data);
            if (data.length > 0 && !selectedItem) {
                handleSelectAutomation(data[0]);
            }
        }
    } catch (e) { console.error(e); }
  };

  const handleSelectAutomation = (item) => {
    setSelectedItem(item);
    setNodes(item.nodes || []);
    setEdges(item.edges || []);
    setActiveNodeId(null);
    setCanvasOffset({ x: 0, y: 0 }); 
    setZoom(1);
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
        const saved = await api.post('/automation/flows', {
            id: selectedItem.id,
            name: selectedItem.name,
            trigger_type: selectedItem.trigger_type || 'msg_recv',
            nodes: nodes,
            edges: edges,
            status: selectedItem.status || 'Active'
        });
        setAutomations(prev => prev.map(a => a.id === saved.id ? saved : a));
        setSelectedItem(saved);
        alert("Wire synched and saved! 🚀");
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleCreateNew = async () => {
    const name = prompt("Name your wire:");
    if (!name) return;
    try {
        const newFlow = await api.post('/automation/flows', {
            name,
            trigger_type: 'msg_recv',
            nodes: [{ id: '1', type: 'trigger', label: 'Init Trigger', position: { x: 200, y: 200 }, config: {} }],
            edges: [],
            status: 'Active'
        });
        setAutomations([...automations, newFlow]);
        handleSelectAutomation(newFlow);
        setActiveNodeId('1');
    } catch (e) { console.error(e); }
  };

  const handleNodeDrag = (id, info) => {
    setNodes(prev => prev.map(node => {
        if (node.id === id) {
            return {
                ...node,
                position: { 
                    x: node.position.x + (info.delta.x / zoom), 
                    y: node.position.y + (info.delta.y / zoom) 
                }
            };
        }
        return node;
    }));
  };

  const handleCanvasPan = (e, info) => {
    setCanvasOffset(prev => ({
        x: prev.x + (info.delta.x / zoom),
        y: prev.y + (info.delta.y / zoom)
    }));
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleFactor = 1.1;
        const newZoom = delta > 0 ? Math.min(zoom * scaleFactor, 2) : Math.max(zoom / scaleFactor, 0.4);
        
        if (newZoom !== zoom) {
            // Zoom at mouse position
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX / zoom) - canvasOffset.x;
            const worldY = (mouseY / zoom) - canvasOffset.y;

            const newOffsetX = (mouseX / newZoom) - worldX;
            const newOffsetY = (mouseY / newZoom) - worldY;

            setZoom(newZoom);
            setCanvasOffset({ x: newOffsetX, y: newOffsetY });
        }
    } else {
        // Regular pan
        setCanvasOffset(prev => ({
            x: prev.x - (e.deltaX / zoom),
            y: prev.y - (e.deltaY / zoom)
        }));
    }
  };

  const handlePortClick = (e, sourceId) => {
    e.stopPropagation();
    const id = Math.random().toString(36).substr(2, 9);
    const sourceNode = nodes.find(n => n.id === sourceId);
    const newNode = {
        id, type: 'action', label: 'New Step', 
        position: { x: sourceNode.position.x + 350, y: sourceNode.position.y },
        config: { type: 'send_msg' }
    };
    setNodes([...nodes, newNode]);
    setEdges([...edges, { id: `e-${sourceId}-${id}`, source: sourceId, target: id }]);
    setActiveNodeId(id);
  };

  const handleAddNode = (type) => {
    const id = Math.random().toString(36).substr(2, 9);
    const action = ACTIONS.find(a => a.id === type);
    const newNode = {
        id, type: 'action', label: action?.label || 'New Step',
        position: { x: 400 - canvasOffset.x, y: 300 - canvasOffset.y },
        config: { type }
    };
    setNodes([...nodes, newNode]);
    setActiveNodeId(id);
  };

  const handleGenerateAI = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.post('/automation/generate-flow', { prompt: aiInput });
      if (data.nodes) {
        setNodes(data.nodes);
        setEdges(data.edges || []);
        setCanvasOffset({ x: 0, y: 0 });
        if (data.nodes.length > 0) setActiveNodeId(data.nodes[0].id);
      } else {
        setError("AI returned invalid format. Try a different prompt.");
      }
    } catch (e) { 
      console.error(e);
      setError(e.message || "Failed to connect to AI engine. Is the backend running?");
    }
    finally { setIsGenerating(false); }
  };

  const activeNode = nodes.find(n => n.id === activeNodeId);

  if (!isMounted) return null;

  return (
    <div className={`${zenMode ? 'fixed inset-0 z-[200]' : 'relative w-full h-screen'} bg-[#020408] text-zinc-200 overflow-hidden font-sans select-none border-t border-white/5`}>
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[150px] rounded-full" />
      </div>

      {/* FLOATING HEADER */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[1400px] h-14 z-[100] flex items-center justify-between px-6 bg-[#0F1115]/70 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition ${sidebarOpen ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-white/5 text-indigo-400'}`}
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-indigo-500/20 shadow-lg">
                <Cpu size={18} className="text-white" />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Agentic Orchestrator</span>
                <span className="text-sm font-bold text-white tracking-tight leading-none">{selectedItem?.name || "Untitled Wire"}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Zen Mode Toggle */}
           <button 
             onClick={() => setZenMode(!zenMode)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${zenMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
           >
              {zenMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {zenMode ? 'Exit Zen' : 'Zen Mode'}
           </button>

           <button 
             onClick={handleSave}
             disabled={isSaving || !selectedItem}
             className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition text-[10px] font-black uppercase tracking-widest shadow-lg"
           >
             <Save size={14} /> {isSaving ? 'Syncing...' : 'Sync Wire'}
           </button>
           <button 
             onClick={handleCreateNew}
             className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/40"
           >
             <Plus size={16} /> New Wire
           </button>
        </div>
      </header>

      {/* COLLAPSIBLE REPO SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: -450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -450, opacity: 0 }}
            className={`absolute left-6 top-24 bottom-24 w-80 z-[110] bg-[#0A0B0F]/95 backdrop-blur-3xl border border-white/5 rounded-[32px] shadow-3xl flex flex-col`}
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-indigo-400" />
                <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[2px]">Repository</h2>
              </div>
              <X size={20} className="text-zinc-600 cursor-pointer hover:text-white transition" onClick={() => setSidebarOpen(false)} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
                {automations.map(item => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSelectAutomation(item)}
                    className={`group p-4 rounded-3xl cursor-pointer transition-all border ${
                      selectedItem?.id === item.id 
                      ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-xl' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${selectedItem?.id === item.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/40 text-zinc-500'}`}>
                            <Zap size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black truncate uppercase tracking-tight ${selectedItem?.id === item.id ? 'text-white' : 'text-zinc-400'}`}>{item.name}</p>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Active Wire</p>
                        </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* NODE INSPECTOR (Floating Sidebar) */}
      <AnimatePresence>
        {activeNode && (
          <motion.aside
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 450, opacity: 0 }}
            className="absolute right-6 top-24 bottom-24 w-80 z-[120] bg-[#0A0B0F]/95 backdrop-blur-3xl border border-white/5 rounded-[32px] shadow-3xl flex flex-col overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <Settings size={18} className="text-indigo-400" />
                    <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[2px]">Configuration</h2>
                </div>
                <X size={20} className="text-zinc-600 cursor-pointer hover:text-white" onClick={() => setActiveNodeId(null)} />
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <section>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-3">Step Label</label>
                    <input 
                        value={activeNode.label}
                        onChange={(e) => {
                            const val = e.target.value;
                            setNodes(prev => prev.map(n => n.id === activeNodeId ? { ...n, label: val } : n));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition shadow-inner"
                    />
                </section>

                <section>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-3">Gateway Logic</label>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            {(() => { const Icon = getIcon(activeNode.config?.type || activeNode.type); return <Icon size={18} className="text-indigo-400"/>; })()}
                        </div>
                        <div>
                            <p className="text-xs font-black text-white uppercase tracking-tight">{activeNode.type}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{activeNode.config?.type?.replace('_', ' ') || 'Universal'}</p>
                        </div>
                    </div>
                </section>

                <section className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <Bot size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">AI Managed</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">The Agent is automatically optimizing the parameters for this '{activeNode.label}' gateway. Manual tuning enabled after deploy.</p>
                </section>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5">
                <button 
                  onClick={() => {
                      if (!confirm("Delete this step?")) return;
                      setNodes(prev => prev.filter(n => n.id !== activeNodeId));
                      setEdges(prev => prev.filter(e => e.source !== activeNodeId && e.target !== activeNodeId));
                      setActiveNodeId(null);
                  }}
                  className="w-full py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all rounded-2xl text-[10px] font-black uppercase tracking-[2px] border border-rose-500/20"
                >
                    Delete Step
                </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING ACTION LIBRARY (Far Right) */}
      <div className={`absolute right-6 top-24 bottom-24 flex flex-col gap-3 z-50 transition-opacity duration-300 ${activeNodeId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-[#0A0B0F]/60 backdrop-blur-3xl border border-white/5 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
          <div className="py-2 text-center text-[7px] font-black text-zinc-700 uppercase tracking-[2px] border-b border-white/5 mb-1">Components</div>
          {ACTIONS.map(action => (
            <button 
                key={action.id}
                onClick={() => handleAddNode(action.id)}
                className="w-12 h-12 rounded-xl bg-white/5 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center text-zinc-400 group relative"
            >
                <action.icon size={20} />
                <motion.span 
                   initial={{ opacity: 0, x: 20 }}
                   whileHover={{ opacity: 1, x: 0 }}
                   className="absolute right-16 px-4 py-2 bg-[#0A0B0F] text-[9px] font-black text-white rounded-xl shadow-2xl border border-white/10 whitespace-nowrap uppercase tracking-widest pointer-events-none"
                >
                    {action.label}
                </motion.span>
            </button>
          ))}
        </div>
        
        <div className="mt-auto bg-[#0A0B0F]/60 backdrop-blur-2xl border border-white/5 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
           <button 
             onClick={() => { setCanvasOffset({x:0, y:0}); setZoom(1); }}
             className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-500 group relative"
           >
              <Maximize size={20}/>
              <span className="absolute right-16 px-3 py-2 bg-black text-[9px] font-bold text-white rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap uppercase tracking-widest pointer-events-none">Recenter</span>
           </button>
           <button 
             onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
             className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-500 group relative"
           >
              <ZoomIn size={20}/>
              <span className="absolute right-16 px-3 py-2 bg-black text-[9px] font-bold text-white rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap uppercase tracking-widest pointer-events-none">Zoom In</span>
           </button>
           <button 
             onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))}
             className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-500 group relative"
           >
              <ZoomOut size={20}/>
              <span className="absolute right-16 px-3 py-2 bg-black text-[9px] font-bold text-white rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap uppercase tracking-widest pointer-events-none">Zoom Out</span>
           </button>
           <div className="h-10 flex items-center justify-center text-[10px] font-black text-zinc-600 bg-white/5 rounded-lg">
              {Math.round(zoom * 100)}%
           </div>
           <button className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-500"><Monitor size={20}/></button>
        </div>
      </div>

      {/* MAIN CANVAS */}
      <motion.section 
        className={`absolute inset-0 z-10 ${isSpacePressed ? 'cursor-grabbing' : 'cursor-default'}`} 
        ref={canvasRef}
        onWheel={handleWheel}
        onClick={() => setActiveNodeId(null)}
      >
        {/* Infinite Background Pan Layer */}
        <motion.div
            drag
            dragMomentum={false}
            onDrag={handleCanvasPan}
            className="absolute w-[20000px] h-[20000px] top-[-10000px] left-[-10000px]"
            style={{ cursor: isSpacePressed ? 'grabbing' : 'grab' }}
        >
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                    transform: `scale(${zoom}) translate(${canvasOffset.x + 10000/zoom}px, ${canvasOffset.y + 10000/zoom}px)`,
                    transformOrigin: '0 0',
                    // PRO DUAL-GRID SYSTEM
                    backgroundImage: `
                        radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1.5px, transparent 0),
                        linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                        linear-gradient(rgba(99, 102, 241, 0.01) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.01) 1px, transparent 1px)
                    `,
                    backgroundSize: `
                        ${100}px ${100}px,
                        ${100}px ${100}px,
                        ${100}px ${100}px,
                        ${20}px ${20}px,
                        ${20}px ${20}px
                    `,
                }}
            >
            {/* CONNECTIONS layer */}
            <svg className="absolute inset-0 w-[8000px] h-[8000px] top-[-4000px] left-[-4000px]">
               <g transform="translate(4000, 4000)">
                   <defs>
                      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                          <path d="M0,0 L0,8 L8,4 z" fill="#6366f1" />
                      </marker>
                   </defs>
                   {edges.map(edge => {
                      const source = nodes.find(n => n.id === edge.source);
                      const target = nodes.find(n => n.id === edge.target);
                      if (!source || !target) return null;
                      const sx = source.position.x + 224;
                      const sy = source.position.y + 44;
                      const tx = target.position.x;
                      const ty = target.position.y + 44;
                      const curve = 100;
                      const d = `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
                      return (
                          <g key={edge.id}>
                            <path d={d} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeOpacity="0.15" markerEnd="url(#arrow)" />
                            <motion.circle 
                                animate={{ offsetDistance: ["0%", "100%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                r="4" fill="#818cf8"
                                style={{ offsetPath: `path("${d}")`, filter: 'drop-shadow(0 0 8px #6366f1)' }} 
                            />
                          </g>
                      );
                   })}
               </g>
            </svg>

            {/* NODES layer */}
            <div className="absolute inset-0">
              {nodes.map(node => {
                const Icon = getIcon(node.type === 'trigger' ? (node.config?.type || 'trigger') : (node.config?.type || 'action'));
                const isActive = activeNodeId === node.id;
                
                return (
                  <motion.div
                      key={node.id}
                      drag
                      dragMomentum={false}
                      onDrag={(e, info) => handleNodeDrag(node.id, info)}
                      onClick={(e) => { e.stopPropagation(); setActiveNodeId(node.id); }}
                      style={{ x: node.position.x, y: node.position.y }}
                      animate={{ 
                          scale: isActive ? 1.05 : 1,
                          zIndex: isActive ? 100 : 10
                      }}
                      className={`absolute w-56 pointer-events-auto bg-[#12141C]/95 backdrop-blur-3xl border rounded-[40px] p-6 shadow-3xl cursor-grab active:cursor-grabbing transition-all duration-300 ${isActive ? 'border-indigo-500 ring-[10px] ring-indigo-500/10 shadow-indigo-500/30' : 'border-white/5 hover:border-white/20'}`}
                  >
                      <div className="flex items-center gap-4 mb-5">
                          <div className={`w-12 h-12 rounded-[20px] shadow-inner flex items-center justify-center ${node.type === 'trigger' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              <Icon size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-black text-white truncate leading-none uppercase tracking-tight mb-1">{node.label}</h3>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[2px]">{node.type}</p>
                          </div>
                      </div>
                      
                      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-5" />
                      
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[1px]">Operational</span>
                          </div>
                          <button className="p-2 hover:bg-white/5 rounded-xl transition text-zinc-700 hover:text-white">
                             <MoreHorizontal size={14} />
                          </button>
                      </div>
                      
                      {/* OUTPUT PORT */}
                      <motion.div 
                          whileHover={{ scale: 1.6, rotate: 90 }}
                          onClick={(e) => handlePortClick(e, node.id)}
                          className={`absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-500 rounded-full border-[4px] border-[#020408] shadow-[0_0_20px_rgba(99,102,241,0.6)] cursor-crosshair z-20 flex items-center justify-center group/port ${isActive ? 'scale-125' : ''}`}
                      >
                          <Plus size={10} className="text-white opacity-0 group-hover/port:opacity-100 transition-opacity" />
                      </motion.div>
                      
                      {/* INPUT PORT */}
                      {node.type !== 'trigger' && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-800 rounded-full border-[3.5px] border-[#020408]" />
                      )}
                  </motion.div>
                );
              })}
            </div>
            </div>
        </motion.div>
      </motion.section>

      {/* MAGIC WIRE DOCK (Fixed Bottom) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[850px] z-[150]">
         <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-[36px] opacity-10 blur-3xl group-hover:opacity-30 transition-all duration-1000" />
            <div className="relative bg-[#0F1115]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] p-4 flex items-center gap-6 shadow-3xl">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/20 transition-all ${isGenerating ? 'animate-spin bg-indigo-500' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'}`}>
                    {isGenerating ? <Activity size={32} /> : <Sparkles size={32} />}
                </div>
                <input 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
                    placeholder="Describe your wire logic: 'If lead is vip, send ai personal video and slack sales'..."
                    className="flex-1 bg-transparent border-none outline-none text-lg text-zinc-100 placeholder:text-zinc-700 font-bold tracking-tight"
                />
                <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiInput}
                    className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-[24px] text-white text-[12px] font-black uppercase tracking-[2px] shadow-2xl shadow-indigo-600/40 disabled:opacity-30"
                >
                    {isGenerating ? 'Synthesizing...' : 'Magic Wire'}
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
              <div className="text-center space-y-6 opacity-30">
                  <Bot size={80} className="mx-auto text-zinc-500 animate-pulse" />
                  <p className="text-sm font-black text-zinc-600 uppercase tracking-[6px]">Canvas Initialized | Run Magic Wire</p>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
      `}</style>
    </div>
  );
}