import { motion } from 'framer-motion';
import {
  ChevronLeft, Timer, Plus
} from 'lucide-react';
import {
  getIcon, getNodeButtons, getNodeBranches, isMultiPathNode, formatDelay, getHandleIdForButton, isConditionNode
} from '../helpers';

export default function CanvasGrid({
  isSpacePressed,
  canvasRef,
  gridRef,
  zoom,
  canvasOffset,
  edges,
  nodes,
  activeNodeId,
  setActiveNodeId,
  flowValidation,
  setPreviewNode,
  stepsOpen,
  setStepsOpen,
  getEdgePoints,
  wiringPreview,
  handleNodePointerDown,
  handlePortPointerDown,
  handleCanvasPointerDown,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  handleWheel,
  nodeHeightsRef,
  buttonOffsetsRef
}) {
  return (
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
                        <p className="text-[11px] tracking-[1px] text-white/80 mb-2">Trigger messages</p>
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
  );
}
