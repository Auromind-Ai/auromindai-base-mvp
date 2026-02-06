'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    Plus,
    ArrowUp,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Paperclip,
    Globe,
    Wand2,
    Calendar,
    ImageIcon,
    ListTodo,
    Square,
    Copy,
    Pencil,
    Check,
    X,
    ChevronDown,
    Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { getWorkspace } from '@/lib/auth';

// Typewriter Component for AI Responses
const Typewriter = ({ text, onComplete, onUpdate, speed = 4 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const textRef = useRef(text);
    const indexRef = useRef(0);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (indexRef.current < textRef.current.length) {
                const char = textRef.current.charAt(indexRef.current);
                setDisplayedText((prev) => {
                    const next = prev + char;
                    onUpdate?.(next);
                    return next;
                });
                indexRef.current++;
            } else {
                // If it's an assistant message, we only finish if the parent says isStreaming: false
                // But the typewriter itself doesn't know that. 
                // We'll rely on the parent's isStreaming flag to switch off the component.
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, []); // Only start interval once

    return (
        <span>
            {displayedText}
            <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
        </span>
    );
};

export default function AuromindAIPage() {
    // API Configuration - uses environment variable for backend URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel } = useSettings();
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const abortControllerRef = useRef(null);
    const lastTypedTextRef = useRef('');

    // Get workspace ID for RAG
    const workspace = getWorkspace();
    const workspaceId = workspace?.id;

    useEffect(() => {
        setMounted(true);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsLoading(false);
        // Also stop any currently streaming message and truncate its content
        setMessages(prev => prev.map(msg =>
            msg.isStreaming ? { ...msg, content: lastTypedTextRef.current, isStreaming: false } : msg
        ));
        lastTypedTextRef.current = '';
    };

    const handleExecute = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        // Add an empty assistant message that will be filled by the stream
        setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);
        const assistantMsgIndex = messages.length + 1; // +1 for the user message we just added

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    model: selectedModel,
                    workspace_id: workspaceId
                }),
                signal: abortControllerRef.current.signal
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            setIsLoading(false); // Stop "thinking" animation as text starts arriving

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.content) {
                            fullText += data.content;
                            setMessages(prev => prev.map((msg, i) =>
                                i === prev.length - 1 ? { ...msg, content: fullText } : msg
                            ));
                        } else if (data.error) {
                            // Show error message in UI
                            const errorMsg = data.error.includes('429') || data.error.includes('quota')
                                ? "⚠️ API rate limit exceeded. Please wait a moment and try again."
                                : `Error: ${data.error}`;
                            setMessages(prev => prev.map((msg, i) =>
                                i === prev.length - 1 ? { ...msg, content: errorMsg, isError: true, isStreaming: false } : msg
                            ));
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        // If JSON parse fails, might be plain text error
                        if (line.includes('error') || line.includes('Error')) {
                            setMessages(prev => prev.map((msg, i) =>
                                i === prev.length - 1 ? { ...msg, content: `Error: ${line}`, isError: true, isStreaming: false } : msg
                            ));
                            setIsLoading(false);
                            return;
                        }
                    }
                }
            }

            // If we finished but have no content, show an error
            if (!fullText.trim()) {
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: "No response received. Please try again.", isError: true, isStreaming: false } : msg
                ));
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg
                ));
            }
        } finally {
            setIsLoading(false);
            // Mark the last message as finished streaming if it wasn't aborted
            setMessages(prev => prev.map((msg, i) =>
                (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg
            ));
            abortControllerRef.current = null;
        }
    };

    const handleStreamingComplete = (index) => {
        setMessages(prev => prev.map((msg, i) =>
            i === index ? { ...msg, isStreaming: false } : msg
        ));
    };

    const handleCopy = async (text, index) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleEdit = (text, index) => {
        setEditingIndex(index);
        setEditValue(text);
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim() || editingIndex === null) return;

        const newContent = editValue;
        const index = editingIndex;

        // Truncate messages after this point and update this message
        const updatedMessages = messages.slice(0, index);
        updatedMessages.push({ role: 'user', content: newContent });

        // Add empty assistant message
        updatedMessages.push({ role: 'assistant', content: '', isStreaming: true });

        setMessages(updatedMessages);
        setEditingIndex(null);
        setEditValue('');

        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: newContent,
                    model: selectedModel,
                    workspace_id: workspaceId
                }),
                signal: abortControllerRef.current.signal
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            setIsLoading(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.content) {
                            fullText += data.content;
                            setMessages(prev => prev.map((msg, i) =>
                                i === prev.length - 1 ? { ...msg, content: fullText } : msg
                            ));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) { }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg
                ));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) =>
                (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg
            ));
            abortControllerRef.current = null;
        }
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    const handleRegenerate = async (index) => {
        // Regeneration only makes sense for AI responses, but we need the preceding user message
        if (index === 0) return;
        const userMessageIndex = index - 1;
        const userMsg = messages[userMessageIndex].content;

        // Truncate from the assistant message onwards
        const updatedMessages = messages.slice(0, index);

        // Add empty assistant message
        updatedMessages.push({ role: 'assistant', content: '', isStreaming: true });

        setMessages(updatedMessages);

        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    model: selectedModel,
                    workspace_id: workspaceId
                }),
                signal: abortControllerRef.current.signal
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            setIsLoading(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.content) {
                            fullText += data.content;
                            setMessages(prev => prev.map((msg, i) =>
                                i === prev.length - 1 ? { ...msg, content: fullText } : msg
                            ));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) { }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg
                ));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) =>
                (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg
            ));
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleExecute();
        }
    };

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const starterCards = [
        { icon: Sparkles, label: "What's new in Auromind AI" },
        { icon: Calendar, label: "Write meeting agenda" },
        { icon: ImageIcon, label: "Analyze PDFs or images" },
        { icon: ListTodo, label: "Create a task tracker" }
    ];

    return (
        <div className="flex flex-col flex-1 min-h-screen bg-transparent relative pt-6 md:pt-10 overflow-x-hidden">
            <style jsx global>{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                /* Hide scrollbar for IE, Edge and Firefox */
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>

            {/* Settings Button - Top Right */}
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#333] text-[#787878] hover:text-white transition-colors z-40"
            >
                <Settings size={20} />
            </button>

            {/* Hero State */}
            <AnimatePresence>
                {messages.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="flex flex-col items-center justify-center flex-1 px-4 w-full h-full relative z-10"
                    >
                        {/* Content */}
                        <div className="relative z-10 text-center">
                            {/* Magic Icon */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                                className="w-20 h-20 rounded-[24px] bg-[var(--notion-hover)] backdrop-blur-xl border border-[var(--notion-border)] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20 mx-auto group hover:border-indigo-500/30 transition-colors"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[24px]" />
                                <Wand2 size={36} className="text-white relative z-10" strokeWidth={1.5} />
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="text-3xl font-bold text-white mb-3 tracking-tight"
                            >
                                What magic shall we make happen?
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="text-[#8a8a8a] text-[15px] font-medium mb-12"
                            >
                                Your personal business assistant, powered by your data.
                            </motion.p>
                        </div>

                        {/* Large Input Box */}
                        <motion.div
                            layoutId="chat-input-container"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="w-full max-w-2xl mb-8"
                        >
                            <div className="bg-[var(--card)] backdrop-blur-2xl rounded-2xl border border-[var(--notion-border)] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden group focus-within:border-indigo-500/40 transition-all duration-500">
                                <div className="px-5 pt-4 flex items-center justify-between">
                                    <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a] border border-white/5 hover:text-white hover:bg-white/10 transition-all">
                                        <Sparkles size={12} className="text-indigo-400" />
                                        <span>Add context</span>
                                    </button>
                                </div>
                                <div className="px-4 py-3">
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask, search, or make anything..."
                                        rows={2}
                                        className="w-full bg-transparent text-[#e8e8e8] placeholder:text-[#5a5a5a] text-[15px] resize-none outline-none leading-relaxed"
                                        style={{ minHeight: '48px' }}
                                    />
                                </div>
                                <div className="flex items-center justify-between px-4 pb-3 border-t border-[var(--notion-border)] pt-3">
                                    <div className="flex items-center gap-3">
                                        <button className="p-1.5 rounded-md hover:bg-[#333] text-[#5a5a5a] hover:text-[#787878] transition-colors">
                                            <Paperclip size={16} />
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-[#e8e8e8] hover:bg-white/5 transition-colors border border-white/5"
                                            >
                                                {selectedModel === 'auto' ? 'Auto' : selectedModel === 'auromind' ? 'Auromind AI' : 'Gemini'}
                                                <ChevronDown size={12} className={`transition-transform text-[#8a8a8a] ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {isModelDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute top-full mt-2 left-0 w-60 bg-[var(--card)] border border-[var(--notion-border)] rounded-lg shadow-2xl overflow-hidden z-50"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                setSelectedModel('auto');
                                                                setIsModelDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'auto' ? 'bg-[#252525]' : ''}`}
                                                        >
                                                            <Sparkles size={18} className="text-slate-400" />
                                                            <span className="flex-1 text-[14px] font-medium text-[#e8e8e8]">Auto</span>
                                                            {selectedModel === 'auto' && <Check size={16} className="text-indigo-400" />}
                                                        </button>
                                                        <div className="h-px bg-[#333] mx-2" />
                                                        <button
                                                            onClick={() => {
                                                                setSelectedModel('auromind');
                                                                setIsModelDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'auromind' ? 'bg-[#252525]' : ''}`}
                                                        >
                                                            <Sparkles size={18} className="text-indigo-400" />
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <span className="text-[14px] font-medium text-[#e8e8e8]">Auromind AI</span>
                                                                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded">Beta</span>
                                                            </div>
                                                            {selectedModel === 'auromind' && <Check size={16} className="text-indigo-400" />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedModel('gemini');
                                                                setIsModelDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'gemini' ? 'bg-[#252525]' : ''}`}
                                                        >
                                                            <svg className="w-[18px] h-[18px]" viewBox="0 0 32 32" fill="none">
                                                                <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="#4285F4" />
                                                                <path d="M4 16L16 22L28 16L28 10L16 16L4 10L4 16Z" fill="#34A853" />
                                                                <path d="M4 22L16 28L28 22L28 16L16 22L4 16L4 22Z" fill="#FBBC04" />
                                                                <path d="M16 28L28 22L28 16" fill="#EA4335" opacity="0.7" />
                                                            </svg>
                                                            <span className="flex-1 text-[14px] font-medium text-[#e8e8e8]">Gemini</span>
                                                            {selectedModel === 'gemini' && <Check size={16} className="text-indigo-400" />}
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[#5a5a5a] hover:bg-[#333] hover:text-[#787878] transition-colors">
                                            <Globe size={12} />
                                            All sources
                                        </button>
                                    </div>
                                    <button
                                        onClick={isLoading ? handleStop : handleExecute}
                                        disabled={!inputValue.trim() && !isLoading}
                                        className={`w-7 h-7 rounded-sm flex items-center justify-center transition-all ${(inputValue.trim() || isLoading)
                                            ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                            : 'bg-[#333] text-[#5a5a5a]'
                                            }`}
                                    >
                                        {isLoading ? <Square size={12} fill="currentColor" /> : <ArrowUp size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="text-center mt-3 text-[12px] text-[#5a5a5a]">
                                Get better answers from your apps
                            </div>
                        </motion.div>

                        {/* Get Started Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] text-[#787878]">Get started</span>
                                <button className="text-[#787878] hover:text-[#a0a0a0]">
                                    <span className="text-lg">×</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {starterCards.map((card, idx) => {
                                    const Icon = card.icon;
                                    return (
                                        <motion.button
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                                            whileHover={{ y: -4, backgroundColor: "var(--notion-hover)" }}
                                            onClick={() => setInputValue(card.label)}
                                            className="flex flex-col items-center gap-3 p-5 bg-[var(--card)] backdrop-blur-md border border-[var(--notion-border)] rounded-[4px] hover:border-white/20 transition-all flex-1"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1 group-hover:bg-indigo-500/20 transition-colors">
                                                <Icon size={20} className="text-[#8a8a8a] group-hover:text-indigo-400" />
                                            </div>
                                            <span className="text-[12px] font-medium text-[#9b9b9b] text-center leading-tight">
                                                {card.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Messages Area */}
            {messages.length > 0 && (
                <div className="w-full flex flex-col justify-start px-4 md:px-8 flex-1 pb-[240px]">
                    <div className="max-w-2xl mx-auto py-8 w-full">
                        {/* Date Header */}
                        <div className="text-center mb-8">
                            <span className="text-[13px] text-[#787878]">
                                {dateStr} • <span className="text-[#9b9b9b]">Auromind AI</span>
                            </span>
                        </div>

                        {/* Messages */}
                        <div className="space-y-6">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'user' ? (
                                        <div className="group relative ml-auto w-full flex flex-col items-end">
                                            {editingIndex === idx ? (
                                                <div className="w-full max-w-[80%] bg-[#2a2a2a] rounded-2xl p-3 border border-indigo-500/50">
                                                    <textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-full bg-transparent text-[#e8e8e8] text-[15px] outline-none resize-none leading-relaxed"
                                                        rows={Math.max(1, editValue.split('\n').length)}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-3 py-1 rounded-md text-[12px] text-[#787878] hover:bg-[#333] transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="px-3 py-1 rounded-md text-[12px] bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
                                                        >
                                                            Rewrite
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-[var(--notion-hover)] backdrop-blur-xl text-white px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed text-left max-w-[85%] border border-[var(--notion-border)] shadow-xl">
                                                        {msg.content}
                                                    </div>
                                                    {/* User Actions - Copy/Edit */}
                                                    <div className="flex items-center gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleCopy(msg.content, idx)}
                                                            className="p-1 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors"
                                                            title="Copy message"
                                                        >
                                                            {copiedIndex === idx ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(msg.content, idx)}
                                                            className="p-1 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors"
                                                            title="Edit message"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-[80%] text-left">
                                            <div className={`text-[15px] leading-[1.7] whitespace-pre-wrap ${msg.isError ? 'text-orange-400 bg-orange-500/10 px-4 py-3 rounded-xl border border-orange-500/20' : 'text-[#e8e8e8]'}`}>
                                                {msg.isStreaming ? (
                                                    <Typewriter
                                                        text={msg.content}
                                                        onComplete={() => handleStreamingComplete(idx)}
                                                        onUpdate={(typed) => {
                                                            lastTypedTextRef.current = typed;
                                                            scrollToBottom();
                                                        }}
                                                    />
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                            {/* Action Icons - Only show after streaming is complete (or if not streaming) */}
                                            {!msg.isStreaming && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center gap-1 mt-4"
                                                >
                                                    <button
                                                        onClick={() => handleCopy(msg.content, idx)}
                                                        className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors"
                                                        title="Copy response"
                                                    >
                                                        {copiedIndex === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerate(idx)}
                                                        className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors"
                                                        title="Regenerate response"
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                    <button className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors">
                                                        <Plus size={14} />
                                                    </button>
                                                    <button className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors">
                                                        <ThumbsUp size={14} />
                                                    </button>
                                                    <button className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-[#787878] hover:text-[#a0a0a0] transition-colors">
                                                        <ThumbsDown size={14} />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {/* Loading */}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start w-full"
                                >
                                    <div className="w-full max-w-2xl relative overflow-hidden rounded-2xl bg-[var(--card)] backdrop-blur-2xl p-6 border border-[var(--notion-border)] shadow-2xl">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer" />

                                        <div className="flex items-center gap-3 relative z-10 mb-4">
                                            <div className="relative flex h-6 w-6 items-center justify-center">
                                                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-0 rounded-full border border-indigo-500/30 border-t-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 relative z-10 opacity-30">
                                            <div className="h-2 w-3/4 rounded-full bg-white/20 animate-pulse" />
                                            <div className="h-2 w-full rounded-full bg-white/20 animate-pulse delay-75" />
                                            <div className="h-2 w-5/6 rounded-full bg-white/20 animate-pulse delay-150" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area - Sticky at bottom */}
            {messages.length > 0 && (
                <motion.div
                    layoutId="chat-input-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed bottom-0 left-0 md:left-[260px] right-0 bg-gradient-to-t from-[var(--notion-bg)] via-[var(--notion-bg)]/95 to-transparent px-4 md:px-8 pb-8 pt-12 z-20 pointer-events-none"
                >
                    <div className="max-w-2xl mx-auto pointer-events-auto">
                        <div className="bg-[var(--card)] backdrop-blur-2xl rounded-2xl border border-[var(--notion-border)] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden group focus-within:border-indigo-500/40 transition-all duration-500">
                            <div className="px-5 pt-4">
                                <button className="flex items-center gap-1.5 text-[13px] text-[#8a8a8a] hover:text-white transition-colors">
                                    <Sparkles size={14} />
                                    <span>Add context</span>
                                </button>
                            </div>
                            <div className="px-4 py-2">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask, search, or make anything..."
                                    rows={1}
                                    className="w-full bg-transparent text-[#e8e8e8] placeholder:text-[#5a5a5a] text-[15px] resize-none outline-none leading-relaxed"
                                    style={{ minHeight: '24px', maxHeight: '120px' }}
                                />
                            </div>
                            <div className="flex items-center justify-between px-4 pb-3">
                                <div className="flex items-center gap-3">
                                    <button className="p-1.5 rounded-md hover:bg-[#333] text-[#5a5a5a] hover:text-[#787878] transition-colors">
                                        <Paperclip size={16} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[#e8e8e8] hover:bg-[#333] transition-colors"
                                        >
                                            {selectedModel === 'auto' ? 'Auto' : selectedModel === 'auromind' ? 'Auromind AI' : 'Gemini'}
                                            <ChevronDown size={12} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {isModelDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute bottom-full mb-2 left-0 w-60 bg-[#1f1f1f] border border-[#333] rounded-lg shadow-2xl overflow-hidden z-50"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModel('auto');
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'auto' ? 'bg-[#252525]' : ''}`}
                                                    >
                                                        <Sparkles size={18} className="text-slate-400" />
                                                        <span className="flex-1 text-[14px] font-medium text-[#e8e8e8]">Auto</span>
                                                        {selectedModel === 'auto' && <Check size={16} className="text-indigo-400" />}
                                                    </button>
                                                    <div className="h-px bg-[#333] mx-2" />
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModel('auromind');
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'auromind' ? 'bg-[#252525]' : ''}`}
                                                    >
                                                        <Sparkles size={18} className="text-indigo-400" />
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <span className="text-[14px] font-medium text-[#e8e8e8]">Auromind AI</span>
                                                            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded">Beta</span>
                                                        </div>
                                                        {selectedModel === 'auromind' && <Check size={16} className="text-indigo-400" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModel('gemini');
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors text-left ${selectedModel === 'gemini' ? 'bg-[#252525]' : ''}`}
                                                    >
                                                        <svg className="w-[18px] h-[18px]" viewBox="0 0 32 32" fill="none">
                                                            <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="#4285F4" />
                                                            <path d="M4 16L16 22L28 16L28 10L16 16L4 10L4 16Z" fill="#34A853" />
                                                            <path d="M4 22L16 28L28 22L28 16L16 22L4 16L4 22Z" fill="#FBBC04" />
                                                            <path d="M16 28L28 22L28 16" fill="#EA4335" opacity="0.7" />
                                                        </svg>
                                                        <span className="flex-1 text-[14px] font-medium text-[#e8e8e8]">Gemini</span>
                                                        {selectedModel === 'gemini' && <Check size={16} className="text-indigo-400" />}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[#5a5a5a] hover:bg-[#333] hover:text-[#787878] transition-colors">
                                        <Globe size={12} />
                                        All sources
                                    </button>
                                </div>
                                <button
                                    onClick={(isLoading || messages.some(m => m.isStreaming)) ? handleStop : handleExecute}
                                    disabled={!inputValue.trim() && !isLoading && !messages.some(m => m.isStreaming)}
                                    className={`w-7 h-7 rounded-sm flex items-center justify-center transition-all ${(inputValue.trim() || isLoading || messages.some(m => m.isStreaming))
                                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                        : 'bg-[#333] text-[#5a5a5a]'
                                        }`}
                                >
                                    {(isLoading || messages.some(m => m.isStreaming)) ? <Square size={12} fill="currentColor" /> : <ArrowUp size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                }
            `}</style>
        </div>
    );
}
