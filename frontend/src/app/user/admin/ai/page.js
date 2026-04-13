'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    Check,
    X,
    ChevronDown,
    History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { getWorkspace, authHeader } from '@/lib/auth';
import ChatSidebar from '@/components/ChatSidebar';
import api from '@/lib/api';


const MODELS = [
  { id: "auto", name: "✨ Auto", plan: "free" },
  { id: "groq", name: "⚡ Fast (Groq)", plan: "free" },
  { id: "sonnet", name: "🧠 Smart (Sonnet)", plan: "free" },
  { id: "opus", name: "🧪 Deep (Opus)", plan: "pro" },
  { id: "gemini_flash", name: "💡 Flash (Gemini)", plan: "pro" }
];

export default function AuromindAIPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const router = useRouter();

    const [userPlan, setUserPlan] = useState("free"); 
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel } = useSettings();
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    
    const getModelName = () => {
        const model = MODELS.find(m => m.id === selectedModel);
        return model ? model.name : "✨ Auto";
    };

    const handleModelSelect = (model) => {
        const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);
        if (model.plan === "pro" && !hasPremiumAccess) {
            setShowUpgradeModal(true); 
            setIsModelDropdownOpen(false);
            return;
        }

        setSelectedModel(model.id);
        setIsModelDropdownOpen(false);
    };

    const messagesEndRef = useRef(null);
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const plusRef = useRef(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const abortControllerRef = useRef(null);
    const lastTypedTextRef = useRef('');

    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const [chatMode, setChatMode] = useState("auto"); 
    const [source, setSource] = useState("internal_web"); 
    const [isModeOpen, setIsModeOpen] = useState(false);
    const [isSourceOpen, setIsSourceOpen] = useState(false);

    const workspace = getWorkspace();
    const workspaceId = workspace?.id;

    // Fetch Actual User Plan
    useEffect(() => {
        if (workspaceId) {
            const checkPlan = async () => {
                try {
                    const res = await api.getBillingStatus(workspaceId);
                    setUserPlan(res.current_plan || "free");
                } catch (error) {
                    console.error("Failed to check plan:", error);
                }
            };
            checkPlan();
        }
    }, [workspaceId]);
    useEffect(() => {
        const currentModelObj = MODELS.find(m => m.id === selectedModel);
        const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);
        
        if (currentModelObj?.plan === "pro" && !hasPremiumAccess) {
            setSelectedModel("auto"); 
        }
    }, [userPlan, selectedModel, setSelectedModel]);
    const sendFeedback = async (type, msg, idx) => {
        try {
            const userMessage = messages[idx - 1]?.content || "";
            await fetch(`${API_URL}/feedback`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", ...authHeader()
                },
                body: JSON.stringify({
                    query: msg.meta?.query || userMessage,
                    answer: msg.content,
                    feedback: type,
                    rewritten_query: msg.meta?.rewritten_query,
                    tool: msg.meta?.tool,
                    model: msg.meta?.model,
                    latency_ms: msg.meta?.latency_ms,
                    confidence_score: msg.meta?.confidence_score,
                    source: msg.meta?.source,
                    session_id: currentSessionId
                }),
            });
            setMessages(prev => prev.map((m, i) => i === idx ? { ...m, voted: true } : m));
        } catch (err) {
            console.error("❌ Feedback error:", err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".model-dropdown")) setIsModelDropdownOpen(false);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        setMounted(true);
        sessionStorage.setItem("ai_active", "true");
        if (typeof window !== 'undefined') {
            const token = sessionStorage.getItem('token');
            if (!token) window.location.href = '/login';
        }
        return () => sessionStorage.removeItem("ai_active");
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (plusRef.current && !plusRef.current.contains(event.target)) {
                setIsPlusOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (workspaceId && mounted) loadSessions();
    }, [workspaceId, mounted]);

    const loadSessions = async () => {
        setIsInitializing(true);
        try {
            const data = await api.getChatSessions(workspaceId);
            setSessions(data);
            const wasInsideAI = sessionStorage.getItem("ai_active");
            if (data.length > 0 && wasInsideAI) {
                setCurrentSessionId(data[0].id);
            } else {
                setIsInitializing(false);
            }
        } catch (err) {
            console.error("Failed to load sessions:", err);
        } finally {
            setSessionsLoaded(true);
        }
    };

    useEffect(() => {
        if (!currentSessionId) {
            setIsInitializing(false);
            return;
        }
        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const history = await api.getSessionMessages(currentSessionId);
                setMessages(history.map(m => ({ role: m.role, content: m.content, isStreaming: false })));
            } catch (err) {
                console.error("Failed to load session messages:", err);
                setMessages([{ role: 'assistant', content: "Failed to load chat history.", isError: true }]);
            } finally {
                setIsLoading(false);
                setIsInitializing(false);
            }
        };
        fetchMessages();
    }, [currentSessionId]);

    const handleSelectSession = async (sessionId) => {
        setCurrentSessionId(sessionId);
        setIsLoading(true);
        setMessages([]);
        try {
            const history = await api.getSessionMessages(sessionId);
            setMessages(history.map(m => ({ role: m.role, content: m.content, isStreaming: false })));
        } catch (err) {
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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStop = () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setIsLoading(false);
        setMessages(prev => prev.map(msg =>
            msg.isStreaming ? { ...msg, content: lastTypedTextRef.current, isStreaming: false } : msg
        ));
        lastTypedTextRef.current = '';
    };

    const handleExecute = async () => {
        if ((!inputValue.trim() && !attachedFile) || isLoading) return;
        const startTime = Date.now();
        const userMsg = inputValue;
        setInputValue('');
        setAttachedFile(null); 
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);
        
        abortControllerRef.current = new AbortController();

        try {
            let activeSessionId = currentSessionId;
            if (!activeSessionId) {
                try {
                    const newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    const newSession = await api.createChatSession(newTitle || "New Chat", workspaceId);
                    setSessions(prev => [newSession, ...prev]);
                    setCurrentSessionId(newSession.id);
                    activeSessionId = newSession.id;
                } catch (sErr) {}
            } else {
                const currentSession = sessions.find(s => s.id === activeSessionId);
                if (currentSession && (currentSession.title === "New Chat" || messages.length === 2)) { 
                    const newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    handleUpdateSession(activeSessionId, newTitle);
                }
            }
            
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    message: userMsg,
                    model: selectedModel,
                    workspace_id: workspaceId,
                    use_rag: true,
                    document_id: lastUploadedId, 
                    chat_mode: chatMode,
                    source: source,
                    session_id: activeSessionId
                }),
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) {
                const text = await res.text();
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: `Error: ${text || res.status}`, isError: true, isStreaming: false } : msg
                ));
                setIsLoading(false);
                return;
            }

            setAttachedFile(null); 
            setLastUploadedId(null); 

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
                        if (data.content || data.meta) {
                                if (data.content) fullText += data.content; 
                                setMessages(prev => prev.map((msg, i) =>
                                    i === prev.length - 1 ? {
                                        ...msg,
                                        content: data.content ? msg.content + data.content : msg.content,
                                        meta: (data.meta && typeof data.meta === "object" && Object.keys(data.meta).length > 0)
                                            ? { ...data.meta, latency_ms: Date.now() - startTime }
                                            : msg.meta
                                    } : msg
                                ));
                        } else if (data.error) {
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

            if (!fullText.trim()) {
                setMessages(prev => prev.map((msg, i) =>
                    i === prev.length - 1 ? { ...msg, content: "No response received. Please try again.", isError: true, isStreaming: false } : msg
                ));
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
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

    const handleCopy = async (text, index) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
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

    const [attachedFile, setAttachedFile] = useState(null);
    const [lastUploadedId, setLastUploadedId] = useState(null); 

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
            'text/plain', 'text/markdown'
        ];

        const isTypeAllowed = allowedTypes.includes(file.type) ||
            file.name.endsWith('.csv') || file.name.endsWith('.md') ||
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (!isTypeAllowed && file.type) { 
            setMessages(prev => [...prev, { role: 'assistant', content: "I support PDF, Excel, CSV, Docs, and Images.", isError: true }]);
            e.target.value = ''; 
            return;
        }

        e.target.value = '';
        setIsUploading(true);
        try {
            setAttachedFile({ name: file.name, type: file.type });
            if (!workspaceId) throw new Error("Workspace ID not found. Please refresh the page.");
            
            const apiLib = await import('@/lib/api').then(mod => mod.default);
            const uploadResponse = await apiLib.uploadDocument(file, workspaceId);

            if (uploadResponse && uploadResponse.entry_id) {
                setLastUploadedId(uploadResponse.entry_id);
            }
        } catch (err) {
            setAttachedFile(null);
            let errorMessage = err.message;
            if (errorMessage.includes("Could not validate credentials") || errorMessage.includes("401")) {
                errorMessage = "Authentication failed. Please log in again.";
            }
            setMessages(prev => [...prev, { role: 'assistant', content: `Failed to upload file: ${errorMessage}`, isError: true, isStreaming: false }]);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim() || editingIndex === null) return;

        const newContent = editValue;
        const index = editingIndex;

        const updatedMessages = messages.slice(0, index);
        updatedMessages.push({ role: 'user', content: newContent });
        updatedMessages.push({ role: 'assistant', content: '', isStreaming: true });

        setMessages(updatedMessages);
        setEditingIndex(null);
        setEditValue('');
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    message: newContent,
                    model: selectedModel,
                    workspace_id: workspaceId
                }),
                signal: abortControllerRef.current.signal
            });
            
            if (!res.ok) {
                const text = await res.text();
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: `Error: ${text || res.status}`, isError: true, isStreaming: false } : msg));
                setIsLoading(false);
                return;
            }
            
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
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: fullText } : msg));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) { }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg));
            abortControllerRef.current = null;
        }
    };

    const handleRegenerate = async (index) => {
        if (index === 0) return;
        const userMsg = messages[index - 1].content;
        const updatedMessages = messages.slice(0, index);
        updatedMessages.push({ role: 'assistant', content: '', isStreaming: true });
        setMessages(updatedMessages);
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                 headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ message: userMsg, model: selectedModel, workspace_id: workspaceId }),
                signal: abortControllerRef.current.signal
            });
            
            if (!res.ok) {
                const text = await res.text();
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: `Error: ${text || res.status}`, isError: true, isStreaming: false } : msg));
                setIsLoading(false);
                return;
            }
            
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
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: fullText } : msg));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) { }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg));
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleExecute();
        }
    };

    const starterCards = [
        { icon: Sparkles, label: "What's new in Auromind AI" },
        { icon: Calendar, label: "Write meeting agenda" },
        { icon: ImageIcon, label: "Analyze PDFs or images" },
        { icon: ListTodo, label: "Create a task tracker" }
    ];

    function formatAssistantMessage(text) {
        if (!text) return text;
        if (/\n?\d+\.\s/.test(text)) return text;
        const sentences = text.split(/(?<=\.)\s+/);
        if (sentences.length > 2) return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n\n");
        return text;
    }

    return (
        <div className="flex bg-[#050505] h-screen text-white overflow-hidden font-sans">
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
                </div>

                <div className="flex flex-col flex-1 bg-transparent relative overflow-hidden">
                    <style jsx global>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
                    `}</style>

                    <main className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
                        <AnimatePresence mode="wait">
                            {isInitializing ? (
                                <div className="flex items-center justify-center min-h-[80vh] text-gray-500">Loading...</div>
                            ) : messages.length === 0 ? (
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

                                    <motion.div layoutId="chat-input-container" className="w-full max-w-2xl">
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
                                    <div className="flex flex-col gap-2 w-full py-8">
                                        {messages.map((msg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex flex-col w-full group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                            >
                                                {msg.role === 'user' ? (
                                                    <div className="bg-[#1e1e1e] text-[#efefef] rounded-2xl px-4 py-2 max-w-[85%] border border-white/[0.03] shadow-sm">
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
                                                                    <button onClick={() => { setEditingIndex(null); setEditValue(''); }} className="text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
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
                                                        <div className={`text-[16px] leading-[1.2] text-[#d4d4d4] max-w-none px-1 ${msg.isError ? 'text-red-400' : ''}`}>
                                                            {msg.isStreaming && msg.content === '' ? (
                                                                <div className="flex items-center gap-3 text-gray-500 py-2">
                                                                    <div className="relative w-4 h-4">
                                                                        <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                                                                        <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                                                                    </div>
                                                                    <span className="text-sm font-medium tracking-tight">Gathering insights...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="assistant-message-content whitespace-pre-line">
                                                                    {formatAssistantMessage(msg.content)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!msg.isStreaming && (
                                                            <div className="flex items-center gap-1 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                <button onClick={() => handleCopy(msg.content, idx)} className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
                                                                    {copiedIndex === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                </button>
                                                                <button onClick={() => handleRegenerate(idx)} className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                                <button onClick={() => sendFeedback("up", msg, idx)} className="p-1.5 rounded-md hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors">
                                                                    <ThumbsUp size={14} />
                                                                </button>
                                                                <button onClick={() => sendFeedback("down", msg, idx)} className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                                                                    <ThumbsDown size={14} />
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
                        </div>
                    </main>

                    {messages.length > 0 && (
                    <div className="absolute bottom-0 w-full z-30">
                        <div className="flex justify-center pb-8 pt-10 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="w-full max-w-3xl px-4 pointer-events-auto"
                        >
                                <div className="bg-[#111111] rounded-2xl border border-white/10 shadow-2xl focus-within:border-indigo-500/40 transition-all duration-300">
                                    <div ref={plusRef} className="relative flex items-center px-4 py-3 gap-2">

                                        <button
                                            onClick={() => setIsPlusOpen(!isPlusOpen)}
                                            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>

                                        <div className="relative model-dropdown">
                                            <button
                                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                                className="px-2 py-1 rounded-md text-xs bg-white/5 text-gray-300 hover:bg-white/10"
                                            >
                                                {getModelName()}
                                            </button>

                                           {isModelDropdownOpen && (
                                                    <div className="absolute bottom-10 left-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl w-52 p-2 z-50">
                                                        {MODELS.map((model) => {
                                                      
                                                            const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);

                                                            return (
                                                                <button
                                                                    key={model.id}
                                                                    onClick={() => handleModelSelect(model)}
                                                                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"
                                                                >
                                                                    <span>{model.name}</span>
                                                                    
                                                             
                                                                    {model.plan === "pro" && !hasPremiumAccess && (
                                                                        <span className="text-yellow-400 text-xs">🔒</span>
                                                                    )}
                                                                    
                                                                    {selectedModel === model.id && (
                                                                        <span className="text-green-400">✓</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                        </div>

                                        {isPlusOpen && (
                                            <div className="absolute bottom-14 left-4 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl w-44 p-2 z-50">
                                                <button
                                                    onClick={() => { fileInputRef.current?.click(); setIsPlusOpen(false); }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"
                                                >
                                                    <Paperclip size={16} /> Attach File
                                                </button>
                                                <button
                                                    onClick={() => setIsPlusOpen(false)}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"
                                                >
                                                    <Globe size={16} /> Search
                                                </button>
                                            </div>
                                        )}

                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Reply to Auromind..."
                                            className="flex-1 bg-transparent text-gray-100 placeholder:text-gray-600 text-[15px] resize-none outline-none leading-relaxed px-3"
                                            rows={1}
                                        />

                                        <button
                                            onClick={handleExecute}
                                            disabled={!inputValue.trim() || isLoading}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                                inputValue.trim() ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-gray-700'
                                            }`}
                                        >
                                            {isLoading ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
                                        </button>

                                    </div>
                                </div>
                            </motion.div>
                        </div>
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

            {/* 🔥 UPGRADE MODAL 🔥 */}
            <AnimatePresence>
                {showUpgradeModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setShowUpgradeModal(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center mt-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/30">
                                    <Sparkles size={32} className="text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Unlock Pro Models</h3>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Get access to Gemini Flash, Claude Opus, and advanced reasoning capabilities. Upgrade your workspace to Pro.
                                </p>

                                <div className="flex w-full gap-3">
                                    <button 
                                        onClick={() => setShowUpgradeModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm"
                                    >
                                        Maybe Later
                                    </button>
                                    <button 
                                        onClick={() => router.push('/user/admin/billing/payment?source=chat')} 
                                        className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors font-medium text-sm shadow-lg shadow-indigo-500/25"
                                    >
                                        Upgrade Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}