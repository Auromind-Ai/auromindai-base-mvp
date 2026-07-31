'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Sparkles,
    Square,
    Search,
    FileText,
    Image,
    CheckCircle2,
    ChevronDown,
    Maximize2,
    Minimize2,
    X,
    MessageSquare,
    Paperclip,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function AIChat({ isOpen, onClose, onToggleHistory }) {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chatMode, setChatMode] = useState('New AI chat');
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef(null);
    const lastStopTimeRef = useRef(0);
    const readerRef = useRef(null);

    // Unmount cleanup: abort fetch + cancel reader — ensures no dangling HTTP stream
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (readerRef.current) {
                readerRef.current.cancel().catch(() => {});
                readerRef.current = null;
            }
        };
    }, []);

    const handleStopChat = useCallback(async () => {
        // Debounce: ignore rapid re-clicks within 1 second
        const now = Date.now();
        if (now - lastStopTimeRef.current < 1000) return;
        lastStopTimeRef.current = now;

        // Cancel the ReadableStream reader first (synchronous, immediate)
        if (readerRef.current) {
            readerRef.current.cancel().catch(() => {});
            readerRef.current = null;
        }
        // Abort the underlying HTTP fetch
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setIsLoading(false);
        // Publish CANCEL signal to backend
        try {
            await api.stopChat(null);
        } catch (_) {}
    }, []);

    const SUGGESTED_ACTIONS = [
        { icon: Search, label: 'Search for anything', color: 'text-slate-400' },
        { icon: FileText, label: 'Write meeting agenda', color: 'text-slate-400' },
        { icon: Image, label: 'Analyze PDFs or images', color: 'text-slate-400' },
        { icon: CheckCircle2, label: 'Create a task tracker', badge: 'New', color: 'text-slate-400' }
    ];

    const [modalAlert, setModalAlert] = useState({ open: false, title: '', message: '' });
    const showAlert = useCallback((message, title = "Validation Warning") => {
        setModalAlert({ open: true, title, message });
    }, []);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isStreaming) return;

        if (inputValue.length > 96000) {
            showAlert("Message length exceeds maximum allowed limit of 96000 characters.", "Limit Exceeded");
            return;
        }

        const userMessage = { role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setIsStreaming(true);

        abortControllerRef.current = new AbortController();

        try {
            const res = await api.streamChat({
                message: userMessage.content,
                model: 'auto',
                use_rag: true
            }, abortControllerRef.current.signal);

            if (!res.ok) {
                let errText = "Failed to generate response.";
                try {
                    const errJson = await res.json();
                    if (errJson.detail) {
                        errText = Array.isArray(errJson.detail) ? errJson.detail.map(d => d.msg || d).join(', ') : errJson.detail;
                    }
                } catch (_) {}
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errText}`, isError: true }]);
                setIsLoading(false);
                setIsStreaming(false);
                return;
            }

            const reader = res.body.getReader();
            readerRef.current = reader;  // tracked for cleanup on unmount / stop
            const decoder = new TextDecoder();
            let aiContent = '';
            let sources = [];

            // Add placeholder for AI message
            setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);
            setIsLoading(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.status) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                newMessages[newMessages.length - 1] = { ...lastMsg, status: data.status };
                                return newMessages;
                            });
                        }
                        if (data.content) {
                            aiContent += data.content;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1] = {
                                    role: 'assistant',
                                    content: aiContent,
                                    sources: sources,
                                    status: null
                                };
                                return newMessages;
                            });
                        }
                        if (data.sources) {
                            sources = data.sources;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1].sources = sources;
                                return newMessages;
                            });
                        }
                        if (data.error) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1] = {
                                    role: 'assistant',
                                    content: `Error: ${data.error}`,
                                    isError: true
                                };
                                return newMessages;
                            });
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                // User clicked Stop — partial response already visible, do nothing
                return;
            }
            console.error('Failed to send message:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error. Please check if the backend is running.",
                isError: true
            }]);
        } finally {
            readerRef.current = null;  // reader done — release ref
            setIsLoading(false);
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };


    if (!isOpen) return null;

    return (
        <>
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-transparent z-[999] pointer-events-none"
            >
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute bottom-6 right-6 w-[400px] h-[600px] bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#2f2f2f] flex flex-col pointer-events-auto overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f2f2f] shrink-0">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                            <span className="text-sm font-semibold text-slate-200">{chatMode}</span>
                            <ChevronDown size={16} className="text-slate-500" />
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleHistory}
                                className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                                title="Chat history"
                            >
                                <MessageSquare size={18} className="text-slate-400" />
                            </button>
                            <button className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                                <Maximize2 size={18} className="text-slate-400" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                {/* Empty State */}
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/20">
                                    <Sparkles size={24} className="text-indigo-400" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-100 mb-8">
                                    What magic shall we make happen?
                                </h2>
                                <div className="w-full space-y-2 mb-6">
                                    {SUGGESTED_ACTIONS.map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInputValue(action.label)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left group"
                                        >
                                            <action.icon size={16} className={action.color} />
                                            <span className="text-sm font-medium text-slate-300">
                                                {action.label}
                                            </span>
                                            {action.badge && (
                                                <span className="ml-auto px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded">
                                                    {action.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        {msg.role === 'user' ? (
                                            <div className="bg-[#2a2a2a] text-slate-200 px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="w-full">
                                                {/* Sources indicator */}
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className="text-[10px] font-semibold text-slate-500">Sources:</span>
                                                        {msg.sources.map((source, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-medium rounded border border-indigo-500/20"
                                                            >
                                                                {source.title}
                                                                <span className="text-indigo-300/60">{Math.round(source.score * 100)}%</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Response Content */}
                                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.isError ? 'text-rose-400' : 'text-slate-300'}`}>
                                                    {msg.content || (
                                                        <div className="flex items-center gap-2 text-indigo-400/90 text-xs font-semibold py-1 animate-pulse">
                                                            {msg.status === 'rewriting' && <span>🔍 Rewriting your question...</span>}
                                                            {msg.status === 'tool_deciding' && <span>⚙️ Selecting tools...</span>}
                                                            {msg.status === 'searching' && <span>🌐 Searching the web...</span>}
                                                            {msg.status === 'retrieving' && <span>📚 Reading database sources...</span>}
                                                            {msg.status === 'synthesizing' && <span>🤖 Generating answer...</span>}
                                                            {!msg.status && <span>⚡ Thinking...</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="space-y-3 pt-4 w-full">
                                        <div className="h-3 w-3/4 rounded-full shimmer-container shimmer-bg" />
                                        <div className="h-3 w-1/2 rounded-full shimmer-container shimmer-bg" />
                                        <div className="h-3 w-2/3 rounded-full shimmer-container shimmer-bg" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input Area (Fixed at bottom) */}
                    <div className="p-4 border-t border-[#2f2f2f] bg-[#1e1e1e] shrink-0">
                        <div className="w-full bg-[#151515] rounded-xl border border-indigo-500/30 focus-within:border-indigo-500/50 transition-all">
                            <div className="px-3 pt-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 bg-indigo-500/20 rounded flex items-center justify-center">
                                        <span className="text-[10px] font-black text-indigo-400">@</span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-500 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
                                        Page Context
                                    </span>
                                </div>

                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask, search, or make anything..."
                                    className="w-full bg-transparent text-slate-200 placeholder:text-slate-600 outline-none text-sm pb-2"
                                />
                            </div>

                            <div className="px-3 pb-3 flex items-center justify-between border-t border-[#2a2a2a] pt-2">
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#2a2a2a] transition-colors">
                                        <Paperclip size={12} className="text-slate-500" />
                                        <span className="text-[10px] font-semibold text-slate-400">Auto</span>
                                    </button>
                                </div>
{isStreaming ? (
                                    <button
                                        onClick={handleStopChat}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors bg-rose-600 hover:bg-rose-500"
                                        title="Stop generation"
                                    >
                                        <Square size={10} className="text-white fill-white" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!inputValue.trim()}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${inputValue.trim() ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-[#2a2a2a]'}`}
                                    >
                                        <Sparkles size={12} className={inputValue.trim() ? 'text-white fill-white' : 'text-slate-600'} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
        {/* Custom Project Matching Alert Modal */}
        <AnimatePresence>
            {modalAlert.open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    onClick={() => setModalAlert({ ...modalAlert, open: false })}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-[#121218] border border-purple-500/30 shadow-2xl shadow-purple-950/80 rounded-2xl p-6 text-white overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                                <AlertTriangle size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-100 mb-1">
                                    {modalAlert.title || "Notice"}
                                </h3>
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    {modalAlert.message}
                                </p>
                            </div>
                            <button
                                onClick={() => setModalAlert({ ...modalAlert, open: false })}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setModalAlert({ ...modalAlert, open: false })}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-purple-600/25 transition-all active:scale-95"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
