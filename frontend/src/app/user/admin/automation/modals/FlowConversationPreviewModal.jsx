import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Timer, X, RotateCcw, Send as SendIcon, CheckCircle2, AlertCircle, Play, ShieldAlert, Cpu, Users } from 'lucide-react';
import { getNodeButtons, formatDelay, evaluateConditionBranch, getNodeBranches } from '../helpers';

export default function FlowConversationPreviewModal({
  isOpen,
  flow,
  loading = false,
  onClose
}) {
  const [messages, setMessages] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [variables, setVariables] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [waitingForButton, setWaitingForButton] = useState(false);
  const [activeButtons, setActiveButtons] = useState([]);
  const [activeQuestionNode, setActiveQuestionNode] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  const chatContainerRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, waitingForInput, waitingForButton]);

  // Interpolate {{variable_name}} in text string
  const interpolate = useCallback((text, vars) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (vars[key] !== undefined && vars[key] !== null) {
        return vars[key];
      }
      return match;
    });
  }, []);

  // Find next connected node from edge graph
  const getNextNode = useCallback((node, targetHandle = null, currentVars = {}) => {
    if (!flow || !flow.edges || !flow.nodes) return null;
    const nodes = flow.nodes;
    const edges = flow.edges;

    // Condition Node Evaluation
    if (node.type === 'action' && node.config?.type === 'condition') {
      const field = node.config?.field || node.config?.variable_name || 'user_reply';
      const operator = node.config?.operator || 'equals';
      const compareValue = node.config?.compare_value || node.config?.value || '';

      const leftVal = currentVars[field] !== undefined ? currentVars[field] : (currentVars['user_reply'] || '');
      const isTrue = evaluateConditionBranch(operator, leftVal, compareValue);

      const targetHandleName = isTrue ? 'true' : 'false';
      const matchingEdge = edges.find(e => 
        e.source === node.id && (
          e.sourceHandle === targetHandleName ||
          e.sourceHandle === `branch-${targetHandleName}`
        )
      );

      if (matchingEdge) {
        return nodes.find(n => n.id === matchingEdge.target) || null;
      }
      // Fallback if no handle specified on edge
      const fallbackEdge = edges.find(e => e.source === node.id);
      return fallbackEdge ? nodes.find(n => n.id === fallbackEdge.target) : null;
    }

    // Button message node or multi-path
    if (targetHandle) {
      const matchingEdge = edges.find(e => 
        e.source === node.id && (
          e.sourceHandle === targetHandle ||
          e.sourceHandle === String(targetHandle)
        )
      );
      if (matchingEdge) {
        return nodes.find(n => n.id === matchingEdge.target) || null;
      }
    }

    // Default single-path outgoing edge
    const outgoingEdge = edges.find(e => e.source === node.id);
    if (outgoingEdge) {
      return nodes.find(n => n.id === outgoingEdge.target) || null;
    }

    return null;
  }, [flow]);

  // Execute step lifecycle for node
  const processNode = useCallback((node, currentVars) => {
    if (!node) {
      setIsCompleted(true);
      return;
    }

    setCurrentNodeId(node.id);
    setStepCount(prev => prev + 1);

    // 1. TRIGGER NODE
    if (node.type === 'trigger') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const next = getNextNode(node, null, currentVars);
        if (next) processNode(next, currentVars);
        else setIsCompleted(true);
      }, 450);
      return;
    }

    const config = node.config || {};
    const actionType = config.type || 'send_msg';

    // 2. SEND MESSAGE NODE
    if (actionType === 'send_msg') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const interpolatedText = interpolate(config.text || config.question || '', currentVars);
        const buttons = getNodeButtons(node);

        const msgObj = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'bot',
          nodeId: node.id,
          text: interpolatedText,
          messageType: config.message_type || 'text',
          mediaUrl: config.media_url,
          delayAmount: config.delay_amount || 0,
          delayUnit: config.delay_unit || 'seconds',
          buttons: buttons
        };

        setMessages(prev => [...prev, msgObj]);

        if (buttons && buttons.length > 0) {
          setWaitingForButton(true);
          setActiveButtons(buttons);
        } else {
          // Auto advance after slight delay
          const delayMs = config.delay_amount ? 500 : 300;
          setTimeout(() => {
            const next = getNextNode(node, null, currentVars);
            if (next) processNode(next, currentVars);
            else setIsCompleted(true);
          }, delayMs);
        }
      }, 450);
      return;
    }

    // 3. ASK QUESTION NODE
    if (actionType === 'ask_question') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const interpolatedQuestion = interpolate(config.question || config.text || 'Please enter your response:', currentVars);
        
        const msgObj = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'bot',
          nodeId: node.id,
          text: interpolatedQuestion,
          messageType: 'ask_question',
          inputType: config.input_type || 'text',
          saveAs: config.save_as || config.variable_name || 'user_reply'
        };

        setMessages(prev => [...prev, msgObj]);
        setWaitingForInput(true);
        setActiveQuestionNode(node);
      }, 450);
      return;
    }

    // 4. DECISION / CONDITION NODE
    if (actionType === 'condition') {
      const next = getNextNode(node, null, currentVars);
      if (next) {
        processNode(next, currentVars);
      } else {
        setIsCompleted(true);
      }
      return;
    }

    // 5. AI / BRAIN QUERY NODE
    if (actionType === 'brain_query') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const agentLabel = config.agent_type ? `${config.agent_type.toUpperCase()} AI` : 'AI';
        
        const msgObj = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'system',
          nodeId: node.id,
          type: 'ai_preview',
          text: `🤖 ${agentLabel} Response Preview — (No request executed during preview)`,
          contextVars: { ...currentVars }
        };

        setMessages(prev => [...prev, msgObj]);

        setTimeout(() => {
          const next = getNextNode(node, null, currentVars);
          if (next) processNode(next, currentVars);
          else setIsCompleted(true);
        }, 500);
      }, 450);
      return;
    }

    // 6. ASSIGN AGENT / HUMAN HANDOFF
    if (actionType === 'assign_agent') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const msgObj = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'system',
          nodeId: node.id,
          type: 'handoff',
          text: '🎧 Conversation transferred to a human agent.'
        };
        setMessages(prev => [...prev, msgObj]);

        setTimeout(() => {
          const next = getNextNode(node, null, currentVars);
          if (next) processNode(next, currentVars);
          else setIsCompleted(true);
        }, 400);
      }, 400);
      return;
    }

    // 7. OTHER SYSTEM / NOTIFICATION / API NODES
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const isApi = actionType.includes('api') || actionType === 'webhook';
      const msgObj = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'system',
        nodeId: node.id,
        type: 'system_pill',
        text: isApi ? '⚡ (API execution skipped in Preview)' : `⚙️ Step: ${node.label || actionType}`
      };
      setMessages(prev => [...prev, msgObj]);

      setTimeout(() => {
        const next = getNextNode(node, null, currentVars);
        if (next) processNode(next, currentVars);
        else setIsCompleted(true);
      }, 350);
    }, 350);

  }, [interpolate, getNextNode]);

  // Start simulation from trigger node
  const startSimulation = useCallback(() => {
    if (!flow || !flow.nodes || flow.nodes.length === 0) return;
    setMessages([]);
    setVariables({});
    setStepCount(0);
    setIsCompleted(false);
    setWaitingForInput(false);
    setWaitingForButton(false);
    setActiveButtons([]);
    setActiveQuestionNode(null);

    const triggerNode = flow.nodes.find(n => n.type === 'trigger') || flow.nodes[0];
    if (triggerNode) {
      processNode(triggerNode, {});
    }
  }, [flow, processNode]);

  useEffect(() => {
    if (isOpen && flow && !loading) {
      startSimulation();
    }
  }, [isOpen, flow, loading, startSimulation]);

  // User input submission for Ask Question node
  const handleInputSubmit = (e) => {
    e?.preventDefault();
    if (!inputVal.trim() || !activeQuestionNode) return;

    const answer = inputVal.trim();
    setInputVal('');
    setWaitingForInput(false);

    const saveKey = activeQuestionNode.config?.save_as || activeQuestionNode.config?.variable_name || 'user_reply';
    const updatedVars = {
      ...variables,
      [saveKey]: answer,
      user_reply: answer
    };
    setVariables(updatedVars);

    // Append user message bubble
    const userMsg = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: answer
    };
    setMessages(prev => [...prev, userMsg]);

    const questionNode = activeQuestionNode;
    setActiveQuestionNode(null);

    // Advance to next node
    setTimeout(() => {
      const next = getNextNode(questionNode, null, updatedVars);
      if (next) processNode(next, updatedVars);
      else setIsCompleted(true);
    }, 300);
  };

  // Button click selection
  const handleButtonClick = (button) => {
    if (!waitingForButton) return;
    setWaitingForButton(false);
    setActiveButtons([]);

    const buttonLabel = button.label || button.value || 'Option';
    const userMsg = {
      id: `user-btn-${Date.now()}`,
      sender: 'user',
      text: buttonLabel
    };
    setMessages(prev => [...prev, userMsg]);

    const currentMsgNode = flow.nodes.find(n => n.id === currentNodeId);
    if (!currentMsgNode) {
      setIsCompleted(true);
      return;
    }

    const handleId = button.value || button.id;
    setTimeout(() => {
      const next = getNextNode(currentMsgNode, handleId, variables);
      if (next) {
        processNode(next, variables);
      } else {
        const fallbackNext = getNextNode(currentMsgNode, null, variables);
        if (fallbackNext) processNode(fallbackNext, variables);
        else setIsCompleted(true);
      }
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="flow-conversation-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xl overflow-hidden font-sans select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-[95%] max-w-[390px] h-[85vh] max-h-[820px] min-h-[500px] flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Phone Frame */}
          <div className="w-full h-full border-[8px] sm:border-[10px] md:border-[12px] border-[#0a0a0a] rounded-[36px] sm:rounded-[44px] md:rounded-[48px] shadow-2xl bg-[#0a0a0a] relative flex flex-col min-h-0 overflow-hidden">
            
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] sm:w-[120px] h-[20px] sm:h-[24px] bg-black rounded-b-2xl z-50 pointer-events-none" />

            {/* Inner App Container */}
            <div className="flex flex-col h-full overflow-hidden rounded-[26px] sm:rounded-[32px] md:rounded-[38px] bg-[#0b141a] relative min-h-0">

              {/* ── Top App Bar Header ── */}
              <div className="bg-[#202c33] px-3.5 sm:px-4 pt-7 sm:pt-8 pb-3 z-40 relative shrink-0 border-b border-white/5 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                        {flow?.name || 'Flow Preview'}
                      </h3>
                      <p className="text-[10px] text-emerald-400 font-semibold tracking-wide">
                        WhatsApp Preview {stepCount > 0 && `• Step ${stepCount}`}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions: Restart & Close */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={startSimulation}
                      title="Restart Preview"
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition active:scale-95"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      title="Close Preview"
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition active:scale-95"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Chat Messages Container ── */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-[#0b141a] custom-scrollbar space-y-3.5 relative"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 text-zinc-400">
                    <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-xs font-semibold">Loading flow graph...</p>
                  </div>
                ) : messages.length === 0 && !isTyping ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
                    <Bot size={28} className="opacity-40" />
                    <p className="text-xs font-medium">Starting conversation simulation...</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-2">
                      {/* Optional Delay Pill */}
                      {msg.delayAmount > 0 && (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 w-fit mx-auto my-1">
                          <Timer size={11} className="text-purple-400 shrink-0" />
                          <span className="text-[10px] font-semibold text-purple-300">
                            {formatDelay(msg.delayAmount, msg.delayUnit) || `Waiting ${msg.delayAmount}s...`}
                          </span>
                        </div>
                      )}

                      {/* 1. BOT MESSAGE BUBBLE */}
                      {msg.sender === 'bot' && (
                        <div className="max-w-[85%] mr-auto space-y-2">
                          {/* Media attachments */}
                          {['image', 'video', 'document'].includes(msg.messageType) && msg.mediaUrl && (
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                              {msg.messageType === 'image' && (
                                <img
                                  src={msg.mediaUrl}
                                  alt="media preview"
                                  className="w-full object-cover max-h-48"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              {msg.messageType === 'video' && (
                                <div className="bg-black/60 h-28 flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-widest gap-2">
                                  <Play size={16} className="text-emerald-400" />
                                  <span>Video Preview</span>
                                </div>
                              )}
                              {msg.messageType === 'document' && (
                                <div className="bg-white/5 px-3 py-2.5 flex items-center gap-2 text-zinc-300 text-xs font-bold truncate">
                                  📄 <span>{msg.mediaUrl.split('/').pop() || 'Attachment.pdf'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Text Bubble */}
                          {msg.text && (
                            <div className="rounded-2xl rounded-tl-sm bg-[#202c33] px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 shadow-md break-words [overflow-wrap:anywhere] leading-relaxed">
                              {msg.text.split('\n').map((line, idx) => (
                                <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                              ))}
                            </div>
                          )}

                          {/* Buttons inside bot message */}
                          {msg.buttons && msg.buttons.length > 0 && waitingForButton && (
                            <div className="space-y-1.5 pt-1">
                              {msg.buttons.map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => handleButtonClick(btn)}
                                  className="w-full rounded-xl border border-emerald-500/30 bg-[#111c22] hover:bg-[#1b3543] px-3.5 py-2.5 text-xs font-bold text-emerald-400 transition text-center shadow-sm active:scale-[0.98]"
                                >
                                  {btn.label || btn.value || 'Option'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. USER REPLY BUBBLE */}
                      {msg.sender === 'user' && (
                        <div className="max-w-[85%] ml-auto">
                          <div className="rounded-2xl rounded-tr-sm bg-[#005c4b] px-3.5 py-2.5 text-xs sm:text-sm text-white shadow-md break-words [overflow-wrap:anywhere] text-right">
                            {msg.text}
                          </div>
                        </div>
                      )}

                      {/* 3. SYSTEM PILL / BADGES */}
                      {msg.sender === 'system' && (
                        <div className="my-2">
                          {msg.type === 'ai_preview' ? (
                            <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200 space-y-1.5 max-w-[90%] mx-auto shadow-sm">
                              <p className="font-bold flex items-center gap-1.5 text-purple-300">
                                {msg.text}
                              </p>
                              {msg.contextVars && Object.keys(msg.contextVars).length > 0 && (
                                <div className="text-[10px] text-purple-300/70 pt-1 border-t border-purple-500/20">
                                  <span className="font-semibold block mb-0.5">Preview Memory Context:</span>
                                  {Object.entries(msg.contextVars).map(([k, v]) => (
                                    <span key={k} className="inline-block mr-2 font-mono bg-purple-900/40 px-1.5 py-0.5 rounded">
                                      {k}: {String(v)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : msg.type === 'handoff' ? (
                            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-xs font-semibold text-amber-300 text-center max-w-[90%] mx-auto">
                              {msg.text}
                            </div>
                          ) : (
                            <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-400 text-center w-fit mx-auto">
                              {msg.text}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* BOT TYPING INDICATOR */}
                {isTyping && (
                  <div className="max-w-[85%] mr-auto">
                    <div className="rounded-2xl rounded-tl-sm bg-[#202c33] px-4 py-3 w-fit shadow-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {/* COMPLETED BADGE */}
                {isCompleted && !isTyping && (
                  <div className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit mx-auto my-4 shadow-sm animate-in fade-in">
                    <CheckCircle2 size={16} />
                    <span>Conversation Completed</span>
                  </div>
                )}
              </div>

              {/* ── Active User Input Bar for Ask Question ── */}
              {waitingForInput && (
                <form
                  onSubmit={handleInputSubmit}
                  className="bg-[#202c33] p-2.5 sm:p-3 border-t border-white/10 flex items-center gap-2 shrink-0 z-40"
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Type your reply..."
                    autoFocus
                    className="flex-1 h-9 px-3.5 bg-[#111c22] border border-white/10 rounded-full text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim()}
                    className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition shrink-0 shadow-md"
                  >
                    <SendIcon size={14} />
                  </button>
                </form>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
