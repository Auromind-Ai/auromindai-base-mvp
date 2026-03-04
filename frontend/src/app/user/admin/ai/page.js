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
    Settings,
    Clock,
    Search,
    History,
    Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { getWorkspace } from '@/lib/auth';
import ChatSidebar from '@/components/ChatSidebar';
import api from '@/lib/api';

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

    // Chat History State
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const abortControllerRef = useRef(null);
    const lastTypedTextRef = useRef('');

    // File Upload Ref
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    // Chat Modes & Source
    const [chatMode, setChatMode] = useState("auto"); // auto, brain_only, web_only
    const [source, setSource] = useState("internal_web"); // internal, internal_web (Default to recommended)
    const [isModeOpen, setIsModeOpen] = useState(false);
    const [isSourceOpen, setIsSourceOpen] = useState(false);


    // Get workspace ID for RAG
    const workspace = getWorkspace();
    const workspaceId = workspace?.id;

    useEffect(() => {
        setMounted(true);
        // Check authentication
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login'; // Redirect if no token
            }
        }
    }, []);

    // Load sessions on mount
    useEffect(() => {
        if (workspaceId && mounted) {
            loadSessions();
        }
    }, [workspaceId, mounted]);

    const loadSessions = async () => {
        try {
            const data = await api.getChatSessions(workspaceId);
            setSessions(data);

            // Auto-select latest session if none selected
            if (!currentSessionId && data.length > 0) {
                handleSelectSession(data[0].id);
            }
        } catch (err) {
            console.error("Failed to load sessions:", err);
        }
    };

    const handleSelectSession = async (sessionId) => {
        if (sessionId === currentSessionId) return;

        setCurrentSessionId(sessionId);
        setIsLoading(true);
        setMessages([]); // Clear current messages while loading

        try {
            const history = await api.getSessionMessages(sessionId);
            setMessages(history.map(m => ({
                role: m.role,
                content: m.content,
                isStreaming: false
            })));
        } catch (err) {
            console.error("Failed to load session messages:", err);
            setMessages([{ role: 'assistant', content: "Failed to load chat history.", isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSession = async () => {
        try {
            const newSession = await api.createChatSession("New Chat", workspaceId);
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
        } catch (err) {
            console.error("Failed to create session:", err);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            await api.deleteChatSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    };

    const handleUpdateSession = async (sessionId, title) => {
        try {
            await api.updateChatSession(sessionId, title);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
        } catch (err) {
            console.error("Failed to update session:", err);
        }
    };

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
        if ((!inputValue.trim() && !attachedFile) || isLoading) return;

        const userMsg = inputValue;
        setInputValue('');
        setAttachedFile(null); // Clear attached file preview
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        // Add an empty assistant message that will be filled by the stream
        setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);
        const assistantMsgIndex = messages.length + 1; // +1 for the user message we just added

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            // Auto-create session if none exists
            let activeSessionId = currentSessionId;
            if (!activeSessionId) {
                try {
                    const newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    const newSession = await api.createChatSession(newTitle || "New Chat", workspaceId);
                    setSessions(prev => [newSession, ...prev]);
                    setCurrentSessionId(newSession.id);
                    activeSessionId = newSession.id;
                } catch (sErr) {
                    console.error("Session creation failed:", sErr);
                }
            } else {
                // Auto-update title if it's the first message or title is still generic
                const currentSession = sessions.find(s => s.id === activeSessionId);
                if (currentSession && (currentSession.title === "New Chat" || messages.length === 2)) { // length is 2 because we just added user + assistant placeholder
                    const newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    handleUpdateSession(activeSessionId, newTitle);
                }
            }

            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    model: selectedModel,
                    workspace_id: workspaceId,
                    use_rag: true,
                    document_id: lastUploadedId, // Pass the uploaded file ID
                    chat_mode: chatMode,
                    source: source,
                    session_id: activeSessionId // Pass session ID for persistence
                }),
                signal: abortControllerRef.current.signal
            });

            // Clear the specific document context after sending
            setAttachedFile(null); // Clear attached file preview
            setLastUploadedId(null); // Clear ID so subsequent messages don't force-context it

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

    // Attached File State
    const [attachedFile, setAttachedFile] = useState(null);
    const [lastUploadedId, setLastUploadedId] = useState(null); // Track uploaded file ID for context

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Strict File Validation
        // Strict File Validation
        const allowedTypes = [
            'application/pdf',
            'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
            'text/plain', 'text/markdown'
        ];

        // Check if type is allowed (some systems might not set type correctly for custom extensions, so we trust backend validation as fallback if type is empty but extension is valid)
        // ideally we should also check extension

        // Simplified check
        // if (!allowedTypes.includes(file.type)) { 
        //    ... 
        // }

        // Let's rely on the backend for strict type checking and `accept` for UI guidance. 
        // But to keep consistency with existing logic, we expand the list.

        const isTypeAllowed = allowedTypes.includes(file.type) ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls');

        if (!isTypeAllowed && file.type) { // Only block if we are sure it's wrong type
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I support PDF, Excel, CSV, Docs, and Images.",
                isError: true
            }]);
            e.target.value = ''; // Reset input
            return;
        }

        // Reset input
        e.target.value = '';

        setIsUploading(true);
        try {
            // Optimistic UI: Show file as attached immediately (preview)
            setAttachedFile({ name: file.name, type: file.type });

            // Upload to backend using the API library
            if (!workspaceId) {
                throw new Error("Workspace ID not found. Please refresh the page.");
            }
            const api = await import('@/lib/api').then(mod => mod.default);
            // Capture response which includes entry_id
            const uploadResponse = await api.uploadDocument(file, workspaceId);

            if (uploadResponse && uploadResponse.entry_id) {
                console.log("File uploaded, ID:", uploadResponse.entry_id);
                setLastUploadedId(uploadResponse.entry_id);
            }

            // Note: We no longer add a "Using file..." message to the chat history here.
            // The file shows as a preview chip instead.

        } catch (err) {
            console.error("Upload failed:", err);
            // If upload fails, remove the preview and show error
            setAttachedFile(null);

            let errorMessage = err.message;
            if (errorMessage.includes("Could not validate credentials") || errorMessage.includes("401")) {
                errorMessage = "Authentication failed. Please log in again.";
                // Optionally redirect to login
                // window.location.href = '/login'; 
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Failed to upload file: ${errorMessage}`,
                isError: true,
                isStreaming: false
            }]);
        } finally {
            setIsUploading(false);
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
        <div className="flex bg-[#050505] min-h-screen text-white overflow-hidden font-sans">
            <ChatSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onCreateSession={handleCreateSession}
                onDeleteSession={handleDeleteSession}
                onUpdateSession={handleUpdateSession}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className={`flex-1 flex flex-col relative overflow-hidden`}>
                {/* Header / Top Bar */}
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#050505] z-40">
                    <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-all flex items-center justify-center border border-transparent hover:border-white/10"
                            >
                                <History size={16} />
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
                            <span className="text-sm font-medium text-gray-300 truncate max-w-[150px]">
                                {workspace?.name || 'Workspace'}
                            </span>
                            <ChevronDown size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col flex-1 bg-transparent relative overflow-x-hidden overflow-y-auto custom-scrollbar no-scrollbar">
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
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 5px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #1f2937;
                            border-radius: 10px;
                        }
                    `}</style>

                    <main className="flex-1 flex flex-col">
                        <AnimatePresence mode="wait">
                            {messages.length === 0 ? (
                                <motion.div
                                    key="hero"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className="flex flex-col items-center justify-center min-h-[80vh] px-4 w-full relative z-10"
                                >
                                    <div className="text-center">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                                            className="w-20 h-20 rounded-[24px] bg-[#111111] backdrop-blur-xl border border-white/10 flex items-center justify-center mb-8 shadow-2xl mx-auto group hover:border-indigo-500/30 transition-colors"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[24px]" />
                                            <Wand2 size={36} className="text-white relative z-10" strokeWidth={1.5} />
                                        </motion.div>

                                        <motion.h1
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3, duration: 0.5 }}
                                            className="text-4xl font-bold text-white mb-3 tracking-tight"
                                        >
                                            What magic shall we make happen?
                                        </motion.h1>

                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4, duration: 0.5 }}
                                            className="text-gray-500 text-[16px] mb-12"
                                        >
                                            Your personal business assistant, powered by your data.
                                        </motion.p>
                                    </div>

                                    <motion.div
                                        layoutId="chat-input-container"
                                        className="w-full max-w-2xl"
                                    >
                                        <div className="bg-[#111111] rounded-2xl border border-white/10 shadow-2xl group focus-within:border-indigo-500/40 transition-all duration-500 overflow-hidden">
                                            <div className="px-5 pt-4">
                                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-[12px] font-medium text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                                                    <Sparkles size={13} />
                                                    <span>Add Context</span>
                                                </button>
                                            </div>
                                            <div className="px-5 py-3">
                                                {attachedFile && (
                                                    <div className="flex items-center gap-2 mb-3 bg-white/5 p-2 rounded-xl w-fit border border-white/5">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[10px]">
                                                            {attachedFile.type.startsWith('image/') ? <ImageIcon size={16} /> : 'DOC'}
                                                        </div>
                                                        <div className="flex flex-col pr-2">
                                                            <span className="text-[12px] text-gray-200 font-medium truncate max-w-[150px]">{attachedFile.name}</span>
                                                            <span className="text-[10px] text-gray-500 uppercase tracking-tight">Ready to analyze</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setAttachedFile(null)}
                                                            className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                <textarea
                                                    value={inputValue}
                                                    onChange={(e) => setInputValue(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Ask anything..."
                                                    className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 text-[16px] resize-none outline-none leading-relaxed min-h-[80px]"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-5 pb-4 border-t border-white/5 pt-3">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isUploading}
                                                        className={`p-1 text-gray-500 hover:text-gray-300 transition-colors ${isUploading ? 'animate-pulse' : ''}`}
                                                    >
                                                        <Paperclip size={18} />
                                                    </button>

                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] text-gray-400 hover:bg-white/5 cursor-pointer">
                                                        <Globe size={14} />
                                                        <span>All sources</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleExecute}
                                                    disabled={!inputValue.trim() || isLoading}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-gray-700'}`}
                                                >
                                                    <ArrowUp size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Starter Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 w-full max-w-3xl">
                                        {starterCards.map((card, i) => (
                                            <button
                                                key={i}
                                                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all text-left group"
                                                onClick={() => setInputValue(card.label)}
                                            >
                                                <card.icon size={18} className="text-gray-500 group-hover:text-indigo-400 mb-3 transition-colors" />
                                                <span className="text-[13px] text-gray-400 group-hover:text-gray-200 transition-colors">{card.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="chat-flow"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 pt-4 pb-32"
                                >
                                    <div className="flex flex-col gap-8 w-full py-8">
                                        {messages.map((msg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex flex-col w-full group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                            >
                                                {msg.role === 'user' ? (
                                                    <div className="bg-[#1e1e1e] text-[#efefef] rounded-2xl px-5 py-3.5 max-w-[85%] border border-white/[0.03] shadow-sm">
                                                        {editingIndex === idx ? (
                                                            <div className="flex flex-col gap-3 min-w-[300px]">
                                                                <textarea
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="bg-transparent border-none outline-none resize-none w-full text-[15px] leading-relaxed"
                                                                    rows={3}
                                                                    autoFocus
                                                                />
                                                                <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                                                                    <button onClick={handleCancelEdit} className="text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
                                                                    <button onClick={handleSaveEdit} className="text-xs bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-md text-white font-medium transition-colors">Save & Submit</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full pl-2">
                                                        <div className="flex items-center gap-2.5 mb-4 px-1">
                                                            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                                <Wand2 size={13} className="text-white" />
                                                            </div>
                                                            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Auromind AI</span>
                                                            {msg.isStreaming && (
                                                                <span className="flex gap-1 h-3 items-center ml-2">
                                                                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-[16px] leading-relaxed text-[#d4d4d4] prose prose-invert max-w-none px-1 ${msg.isError ? 'text-red-400' : ''}`}>
                                                            {msg.isStreaming && msg.content === '' ? (
                                                                <div className="flex items-center gap-3 text-gray-500 py-2">
                                                                    <div className="relative w-4 h-4">
                                                                        <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                                                                        <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                                                                    </div>
                                                                    <span className="text-sm font-medium tracking-tight">Gathering insights...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="assistant-message-content">
                                                                    {msg.content}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!msg.isStreaming && (
                                                            <div className="flex items-center gap-1 mt-6 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                <button
                                                                    onClick={() => handleCopy(msg.content, idx)}
                                                                    className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                                                                    title="Copy to clipboard"
                                                                >
                                                                    {copiedIndex === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRegenerate(idx)}
                                                                    className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                                                                    title="Regenerate response"
                                                                >
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div ref={messagesEndRef} className="h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>

                    {/* Floating Sticky Input (when messages exist) */}
                    {messages.length > 0 && (
                        <div className="fixed bottom-0 left-0 lg:left-0 right-0 pointer-events-none flex justify-center pb-8 pt-10 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent z-30">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className={`w-full max-w-2xl px-4 pointer-events-auto`}
                            >
                                <div className="bg-[#111111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-indigo-500/40 transition-all duration-300">
                                    <div className="px-5 py-3">
                                        {attachedFile && (
                                            <div className="flex items-center gap-2 mb-2 bg-white/5 p-2 rounded-xl w-fit border border-white/5">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[9px]">
                                                    {attachedFile.type.startsWith('image/') ? <ImageIcon size={14} /> : 'DOC'}
                                                </div>
                                                <span className="text-[12px] text-gray-300 truncate max-w-[120px]">{attachedFile.name}</span>
                                                <button onClick={() => setAttachedFile(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                                            </div>
                                        )}
                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Reply to Auromind..."
                                            className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 text-[15px] resize-none outline-none leading-relaxed min-h-[44px] max-h-[150px] custom-scrollbar py-1"
                                            rows={1}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between px-5 pb-3 pt-1 border-t border-white/5 bg-[#141414]/50">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                                                title="Attach file"
                                            >
                                                <Paperclip size={18} />
                                            </button>
                                            <div className="text-[12px] text-gray-500 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
                                                <Globe size={14} />
                                                <span className="font-medium">Search</span>
                                            </div>
                                            <div className="text-[12px] text-gray-500 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
                                                <Sparkles size={14} />
                                                <span className="font-medium">{selectedModel === 'auto' ? 'Auto' : 'Pro'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleExecute}
                                            disabled={!inputValue.trim() || isLoading}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-gray-700'}`}
                                        >
                                            {isLoading ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
            />
        </div>
    );
}
