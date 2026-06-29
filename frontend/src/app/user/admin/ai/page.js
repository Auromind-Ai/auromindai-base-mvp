'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Sparkles,
    Plus,
    ArrowUp,
    Send,
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
    Menu,
    ArrowUpRight,
    Zap,
    LayoutDashboard,
    BrainCircuit,
    Inbox,
    Users,
    GitBranch,
    BarChart2,
    Bell,
    MessageSquare,
    //  NEW: scroll-to-bottom arrow 
    ChevronDown as ArrowDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import ChatSidebar from '@/components/ChatSidebar';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import ReactMarkdown from "react-markdown";
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

//  Typewriter (unchanged) 
const Typewriter = ({ text, onComplete, onUpdate, speed = 4 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const textRef = useRef(text);
    const indexRef = useRef(0);
    useEffect(() => { textRef.current = text; }, [text]);
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (indexRef.current < textRef.current.length) {
                const char = textRef.current.charAt(indexRef.current);
                setDisplayedText(prev => {
                    const next = prev + char;
                    onUpdate?.(next);
                    return next;
                });
                indexRef.current++;
            }
        }, speed);
        return () => clearInterval(intervalId);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <span>
            {displayedText}
            <span className="inline-block w-1.5 h-4 bg-purple-400 ml-1 animate-pulse align-middle" />
        </span>
    );
};

//  Helpers (unchanged) ─
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}
const GET_STARTED_CARDS = [
    {
        icon: BrainCircuit,
        label: "What is new in aura AI?",
        description: "Discover the latest updates and features.",
        gradient: "from-purple-600 to-indigo-600",
        cardBg: "linear-gradient(180deg, rgba(7,0,18,0.92) 0%, rgba(7,0,18,0.96) 72%, rgba(101,75,204,0.28) 100%)",
        borderColor: "rgba(101,75,204,0.18)",
    },
    {
        icon: Calendar,
        label: "Writing meeting agenda",
        description: "Create a professional agenda in seconds.",
        gradient: "from-emerald-500 to-teal-600",
        cardBg: "linear-gradient(180deg, rgba(7,0,18,0.92) 0%, rgba(7,0,18,0.96) 72%, rgba(26,117,90,0.28) 100%)",
        borderColor: "rgba(26,117,90,0.18)",
    },
    {
        icon: ImageIcon,
        label: "Analyze PDFs or images",
        description: "Extract key insights from your documents.",
        gradient: "from-orange-500 to-amber-600",
        cardBg: "linear-gradient(180deg, rgba(7,0,18,0.92) 0%, rgba(7,0,18,0.96) 72%, rgba(130,73,38,0.28) 100%)",
        borderColor: "rgba(130,73,38,0.18)",
    },
    {
        icon: ListTodo,
        label: "Broadcast",
        description: "Organize tasks and track progress easily.",
        gradient: "from-blue-500 to-cyan-600",
        cardBg: "linear-gradient(180deg, rgba(7,0,18,0.92) 0%, rgba(7,0,18,0.96) 72%, rgba(34,67,130,0.28) 100%)",
        borderColor: "rgba(34,67,130,0.18)",
    }
];
const DEFAULT_MODELS = [
    { id: "auto",         name: "✨ Auto",             plan: "free" },
    { id: "groq",         name: "⚡ Fast (Groq)",       plan: "free" },
    { id: "sonnet",       name: "🧠 Smart (Sonnet)",    plan: "free" },
    { id: "opus",         name: "🧪 Deep (Opus)",       plan: "pro"  },
    { id: "gemini_flash", name: "💡 Flash (Gemini)",    plan: "pro"  },
];
const SOURCE_OPTIONS = [
    { value: "internal_web", label: "All Sources", icon: Globe },
    { value: "vector_db", label: "Documents", icon: Paperclip },
    { value: "direct_storage", label: "Email", icon: Inbox },
    { value: "web_search", label: "Web Search", icon: Search },
];
//  Page ─
export default function AuromindAIPage() {
    const [models, setModels] = useState(DEFAULT_MODELS);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [feedbackMap, setFeedbackMap] = useState({}); 
    const { isSettingsOpen, setIsSettingsOpen, selectedModel, setSelectedModel } = useSettings();
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const plusRef = useRef(null);
    const [isInitializing, setIsInitializing] = useState(false);
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
    const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);
    const [lastUploadedId, setLastUploadedId] = useState(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const scrollContainerRef = useRef(null);
    const skipNextSessionFetchRef = useRef(false);
    const { user, workspaces, workspaceId } = useAuth();
    const workspace = workspaces?.find(w => w.id === workspaceId) || null;
    const router = useRouter();
    const [userPlan, setUserPlan] = useState("free");
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const getModelName = () => {
        const model = models.find(m => m.id === selectedModel);
        return model ? model.name : "✨ Auto";
    };
    const getSourceLabel = () => {
        const src = SOURCE_OPTIONS.find(s => s.value === source);
        return src ? src.label : "All Sources";
    };
    const handleModelSelect = (model) => {
        const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);
        if (model.plan === "pro" && !hasPremiumAccess) {
            setShowUpgradeModal(true);
            setIsModelDropdownOpen(false);
            return;
        }
        if (model.id === "groq" && attachedFile && attachedFile.type.startsWith("image/")) {
            setAttachedFile(null);
            setMessages(prev => [...prev, { role: 'assistant', content: "Switched to Groq. Attached image removed as Groq does not support image analysis.", isError: true }]);
        }
        setSelectedModel(model.id);
        setIsModelDropdownOpen(false);
    };
    //  loadSessions: don't auto-restore last session (always show hero) 
    const loadSessions = useCallback(async () => {
        try {
            const data = await api.getChatSessions(workspaceId);
            setSessions(data);
            // Reload-ல் last active session restore பண்ணு
            const savedSessionId = sessionStorage.getItem("last_session_id");
            if (savedSessionId && data.find(s => s.id === savedSessionId)) {
                setCurrentSessionId(savedSessionId);
                // currentSessionId useEffect தானா messages fetch பண்ணும்
            }
        } catch (err) {
            console.error("Failed to load sessions:", err);
        } finally {
            setSessionsLoaded(true);
        }
    }, [workspaceId]);
    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
        sessionStorage.setItem("ai_active", "true");
        return () => { sessionStorage.removeItem("ai_active"); };
    }, []);
    useEffect(() => {
        function handleClickOutside(event) {
            if (plusRef.current && !plusRef.current.contains(event.target)) setIsPlusOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".model-dropdown")) setIsModelDropdownOpen(false);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);
    useEffect(() => {
        const handleSourceClickOutside = (e) => {
            if (!e.target.closest(".source-dropdown")) setIsSourceDropdownOpen(false);
        };
        document.addEventListener("click", handleSourceClickOutside);
        return () => document.removeEventListener("click", handleSourceClickOutside);
    }, []);
    useEffect(() => {
        if (workspaceId && mounted) loadSessions();
    }, [workspaceId, mounted, loadSessions]);
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
        const fetchModels = async () => {
            try {
                const res = await api.getChatModels();
                if (res && Array.isArray(res)) {
                    const mapped = res.map(m => {
                        let plan = "free";
                        if (m.id === "opus" || m.id === "premium" || m.id === "expert" || m.id === "smart") {
                            plan = "pro";
                        }
                        return {
                            id: m.id,
                            name: m.name,
                            plan: plan
                        };
                    });
                    setModels(mapped);
                }
            } catch (err) {
                console.error("Failed to fetch dynamic chat models:", err);
            }
        };
        fetchModels();
    }, []);

    useEffect(() => {
        const currentModelObj = models.find(m => m.id === selectedModel);
        const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);
        if (currentModelObj?.plan === "pro" && !hasPremiumAccess) {
            setSelectedModel("auto");
        }
    }, [userPlan, selectedModel, setSelectedModel, models]);
    // FIX 3: currentSessionId effect — only fetch if we deliberately selected one
    useEffect(() => {
        if (!currentSessionId) return;
        if (skipNextSessionFetchRef.current) {
            skipNextSessionFetchRef.current = false;
            return;
        }
        const fetchMessages = async () => {
            setIsInitializing(true);
            try {
                const history = await api.getSessionMessages(currentSessionId);
                setMessages(history.map(m => ({ role: m.role, content: m.content, isStreaming: false })));
            } catch (err) {
                console.error("Failed to load session messages:", err);
                setMessages([{ role: 'assistant', content: "Failed to load chat history.", isError: true }]);
            } finally {
                setIsInitializing(false);
            }
        };
        fetchMessages();
    }, [currentSessionId]);
    const handleSelectSession = async (sessionId) => {
        setCurrentSessionId(sessionId);
        sessionStorage.setItem("last_session_id", sessionId);
        setIsSidebarOpen(false);
        setIsInitializing(true);
        setMessages([]);
        try {
            const history = await api.getSessionMessages(sessionId);
            setMessages(history.map(m => ({ role: m.role, content: m.content, isStreaming: false })));
        } catch (err) {
            setMessages([{ role: 'assistant', content: "Failed to load chat history.", isError: true }]);
        } finally {
            setIsInitializing(false);
        }
    };
    const handleCreateSession = async () => {
        setCurrentSessionId(null);
        sessionStorage.removeItem("last_session_id");
        setMessages([]);
        setInputValue('');
        setAttachedFile(null);
        setIsSidebarOpen(false);
    };
    const handleDeleteSession = async (sessionId) => {
        try {
            await api.deleteChatSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (err) { console.error("Failed to delete session:", err); }
    };
    const handleUpdateSession = async (sessionId, title) => {
        try {
            await api.updateChatSession(sessionId, title);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
        } catch (err) { console.error("Failed to update session:", err); }
    };
    //  FIX 6: Scroll-to-bottom — only auto-scroll when already near bottom 
    const scrollToBottom = useCallback((force = false) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (force || distFromBottom < 180) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);
    // Auto-scroll on new messages (only if near bottom)
    useEffect(() => {
        scrollToBottom(false);
    }, [messages, scrollToBottom]);
    //  NEW: Scroll detection for floating button ─
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            setShowScrollBottom(distFromBottom > 180);
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [messages.length]); // re-attach when chat view appears
    const handleStop = () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setIsLoading(false);
        setMessages(prev => prev.map(msg => msg.isStreaming ? { ...msg, content: lastTypedTextRef.current, isStreaming: false } : msg));
        lastTypedTextRef.current = '';
    };
    const handleExecute = async () => {
        if ((!inputValue.trim() && !attachedFile) || isLoading) return;
        if (selectedModel === "groq" && attachedFile && attachedFile.type.startsWith("image/")) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Groq model does not support image analysis. Please switch to Gemini or Claude.", isError: true }]);
            return;
        }
        const userMsg = inputValue;
        const attachedImgUrl = attachedFile?.type?.startsWith('image/') ? attachedFile.url : null;
        setInputValue('');
        setAttachedFile(null);
        setMessages(prev => [...prev, { role: 'user', content: userMsg, imageUrl: attachedImgUrl }]);
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
                    skipNextSessionFetchRef.current = true;
                    setCurrentSessionId(newSession.id);
                    sessionStorage.setItem("last_session_id", newSession.id);
                    activeSessionId = newSession.id;
                } catch (sErr) { console.error("Session creation failed:", sErr); }
            } else {
                const currentSession = sessions.find(s => s.id === activeSessionId);
                if (currentSession && (currentSession.title === "New Chat" || messages.length === 2)) {
                    const newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
                    handleUpdateSession(activeSessionId, newTitle);
                }
            }
            const res = await api.streamChat({
                message: userMsg,
                model: selectedModel,
                use_rag: true,
                document_id: lastUploadedId,
                chat_mode: chatMode,
                source: source,
                session_id: activeSessionId
            }, abortControllerRef.current.signal);
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
                        if (data.content) {
                            fullText = fullText + data.content;
                            const captured = fullText;
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: captured } : msg));
                        } else if (data.error) {
                            const errorMsg = data.error.includes('429') || data.error.includes('quota')
                                ? "⚠️ API rate limit exceeded. Please wait a moment and try again."
                                : `Error: ${data.error}`;
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: errorMsg, isError: true, isStreaming: false } : msg));
                            setIsLoading(false); return;
                        }
                    } catch (e) {
                        if (line.includes('error') || line.includes('Error')) {
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: `Error: ${line}`, isError: true, isStreaming: false } : msg));
                            setIsLoading(false); return;
                        }
                    }
                }
            }
            if (!fullText.trim()) {
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "No response received. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } catch (err) {
            if (err.name === 'AbortError') { console.log('Fetch aborted'); }
            else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg));
            abortControllerRef.current = null;
            // Force scroll to bottom after send
            setTimeout(() => scrollToBottom(true), 80);
        }
    };
    const handleStreamingComplete = (index) => {
        setMessages(prev => prev.map((msg, i) => i === index ? { ...msg, isStreaming: false } : msg));
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
        } catch (err) { console.error('Failed to copy text: ', err); }
    };

    const handleFeedback = (index, type) => {
        setFeedbackMap(prev => ({
            ...prev,
            [index]: prev[index] === type ? null : type  // toggle off if same
        }));
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (selectedModel === "groq" && file.type.startsWith("image/")) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Groq model does not support image analysis. Please switch to Gemini or Claude.", isError: true }]);
            e.target.value = '';
            return;
        }
        const allowedTypes = ['application/pdf','image/png','image/jpeg','image/jpg','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','text/plain','text/markdown'];
        const isTypeAllowed = allowedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.md') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        if (!isTypeAllowed && file.type) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I support PDF, Excel, CSV, Docs, and Images.", isError: true }]);
            e.target.value = ''; return;
        }
        e.target.value = '';
        setIsUploading(true);
        try {
            const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
            setAttachedFile({ name: file.name, type: file.type, url: objectUrl });
            if (!workspaceId) throw new Error("Workspace ID not found. Please refresh the page.");
            const apiModule = await import('@/lib/api').then(mod => mod.default);
            const uploadResponse = await apiModule.uploadDocument(file, workspaceId);
            if (uploadResponse && uploadResponse.entry_id) setLastUploadedId(uploadResponse.entry_id);
        } catch (err) {
            console.error("Upload failed:", err);
            setAttachedFile(null);
            let errorMessage = err.message;
            if (errorMessage.includes("Could not validate credentials") || errorMessage.includes("401")) errorMessage = "Authentication failed. Please log in again.";
            setMessages(prev => [...prev, { role: 'assistant', content: `Failed to upload file: ${errorMessage}`, isError: true, isStreaming: false }]);
        } finally {
            setIsUploading(false);
        }
    };
    const handleEdit = (text, index) => { setEditingIndex(index); setEditValue(text); };
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
            const res = await api.streamChat({
                message: newContent,
                model: selectedModel
            }, abortControllerRef.current.signal);
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
                            fullText = fullText + data.content;
                            const captured = fullText;
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: captured } : msg));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') { console.log('Fetch aborted'); }
            else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg));
            abortControllerRef.current = null;
        }
    };
    const handleCancelEdit = () => { setEditingIndex(null); setEditValue(''); };
    const handleRegenerate = async (index) => {
        if (index === 0) return;
        const userMsg = messages[index - 1].content;
        const updatedMessages = messages.slice(0, index);
        updatedMessages.push({ role: 'assistant', content: '', isStreaming: true });
        setMessages(updatedMessages);
        setIsLoading(true);
        abortControllerRef.current = new AbortController();
        try {
            const res = await api.streamChat({
                message: userMsg,
                model: selectedModel
            }, abortControllerRef.current.signal);
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
                            fullText = fullText + data.content;
                            const captured = fullText;
                            setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: captured } : msg));
                            lastTypedTextRef.current = fullText;
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') { console.log('Fetch aborted'); }
            else {
                console.error(err);
                setMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, content: "Error connecting to Auromind. Please try again.", isError: true, isStreaming: false } : msg));
            }
        } finally {
            setIsLoading(false);
            setMessages(prev => prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant') ? { ...msg, isStreaming: false } : msg));
            abortControllerRef.current = null;
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute(); }
    };
    function formatAssistantMessage(text) {
        if (!text) return text;
        if (/\n?\d+\.\s/.test(text)) return text;
        const sentences = text.split(/(?<=\.)\s+/);
        if (sentences.length > 2) return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n\n");
        return text;
    }
    const greeting = getGreeting();
    const userName = user?.full_name || user?.name || 'User';
    const isChatStarted = messages.length > 0 || isInitializing;

    //  RENDER ─
    return (
        <div className={`${poppins.className} flex bg-[#0a0a0f] h-screen text-white overflow-hidden`}>
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
            {/* Main content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="flex flex-col flex-1 bg-transparent relative overflow-hidden">
                    {/* Fixed History Button — always visible when sidebar is closed */}
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="absolute top-4 left-4 z-40 p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-all flex items-center justify-center border border-transparent hover:border-white/10"
                            title="Chat History"
                        >
                            <History size={16} />
                        </button>
                    )}
                    <style jsx global>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d2d3a; border-radius: 10px; }
                        .starter-card:hover { box-shadow: 0 0 28px rgba(139, 92, 246, 0.18); }
                        .ai-input-box:focus-within {
                            box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.4), 0 8px 40px rgba(88, 28, 235, 0.15);
                            border-color: rgba(139, 92, 246, 0.4) !important;
                        }
                    `}</style>
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {/*  Scrollable area — shared ref for scroll detection  */}
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar"
                        >
                            <AnimatePresence mode="wait">
                                {/*  HERO SCREEN (messages === 0 and not initializing)  */}
                                {!isChatStarted ? (
                                    <motion.div
                                        key="hero"
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 16 }}
                                        exit={{ opacity: 0, y: -16 }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="flex flex-col items-center w-full px-4 pt-16 pb-32 md:pt-32 relative z-10"
                                    >
                                        {/* Greeting */}
                                        <motion.h1
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15, duration: 0.5 }}
                                            className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-2 text-white"
                                        >
                                            {greeting},{' '}
                                            <span
                                                style={{
                                                    background: "linear-gradient(180deg, #A855F7 0%, #FFFFFF 100%)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                }}
                                            >
                                                {userName}
                                            </span>
                                        </motion.h1>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.25, duration: 0.5 }}
                                            className="text-gray-400 text-base mb-10 text-center"
                                        >
                                            Let&apos;s get things done. What would you like to accomplish today?
                                        </motion.p>
                                        {/* Prompt Input */}
                                        <motion.div layoutId="chat-input-container" className="w-full max-w-4xl">
                                            <div className="ai-input-box bg-[#070012] rounded-2xl border border-purple-300/30 shadow-2xl transition-all duration-300 overflow-hidden">
                                                <div className="px-5 py-4">
                                                    {attachedFile && (
                                                        <div className="flex items-center gap-2 mb-3 bg-white/5 p-2 rounded-xl w-fit border border-white/10">
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                                                                {attachedFile.type.startsWith('image/') && attachedFile.url ? (
                                                                    <img src={attachedFile.url} alt="thumbnail" className="w-full h-full object-cover" />
                                                                ) : attachedFile.type.startsWith('image/') ? (
                                                                    <ImageIcon size={16} />
                                                                ) : (
                                                                    'DOC'
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col pr-2">
                                                                <span className="text-[12px] text-gray-200 font-medium truncate max-w-[150px]">{attachedFile.name}</span>
                                                                <span className="text-[10px] text-gray-500 uppercase tracking-tight">Ready to analyze</span>
                                                            </div>
                                                            <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <textarea
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Ask me Anything..."
                                                        className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 text-[15px] resize-none outline-none leading-relaxed min-h-[80px]"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={isUploading}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-gray-400 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all ${isUploading ? 'animate-pulse' : ''}`}
                                                        >
                                                            <Plus size={14} />
                                                            <span>Add</span>
                                                        </button>
                                                        <div className="relative source-dropdown">
                                                            <button
                                                                onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] hover:bg-white/5 border hover:border-white/20 transition-all ${source !== 'internal_web' ? 'text-purple-300 border-purple-500/25 bg-purple-600/10' : 'text-gray-400 border-white/10'}`}
                                                            >
                                                                <Globe size={14} />
                                                                <span>{getSourceLabel()}</span>
                                                                <ChevronDown size={12} className={`transition-transform duration-200 ${isSourceDropdownOpen ? 'rotate-180' : ''}`} />
                                                            </button>
                                                            {isSourceDropdownOpen && (
                                                                <div className="absolute bottom-10 left-0 bg-[#12121c] border border-white/10 rounded-xl shadow-xl w-48 p-2 z-50">
                                                                    {SOURCE_OPTIONS.map((opt) => (
                                                                        <button
                                                                            key={opt.value}
                                                                            onClick={() => { setSource(opt.value); setIsSourceDropdownOpen(false); }}
                                                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left"
                                                                        >
                                                                            <opt.icon size={14} className="text-gray-400" />
                                                                            <span>{opt.label}</span>
                                                                            {source === opt.value && (
                                                                                <span className="ml-auto text-purple-400 text-xs">✓</span>
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleExecute}
                                                        disabled={!inputValue.trim() || isLoading}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${inputValue.trim() ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/40 hover:bg-purple-600 hover:scale-110 hover:shadow-purple-500/50 hover:rotate-12' : 'bg-purple-900/40 text-purple-700'}`}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                        {/* Get started cards */}
                                        <div className="w-full max-w-4xl mt-10">
                                            <p className="text-[13px] font-medium text-gray-400 mb-4">Get started with</p>
                                            <div className="grid grid-cols-2 md:flex md:flex-row md:gap-5 gap-5">
                                                {GET_STARTED_CARDS.map((card, i) => (
                                                    <motion.button
                                                        key={i}
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                                                        onClick={() => setInputValue(card.label)}
                                                        className="starter-card relative flex flex-col justify-between
                                                            p-4 rounded-2xl border border-white/20
                                                            transition-all duration-300 text-left group overflow-hidden
                                                            min-h-[180px] md:min-h-[220px]"
                                                        style={{ background: card.cardBg, backgroundColor: 'rgba(7,0,18,0.7)' }}
                                                    >
                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                                                            style={{ background: card.cardBg }} />
                                                        <div className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-3`}>
                                                            <card.icon size={19} className="text-white" />
                                                        </div>
                                                        <div className="relative z-10 flex-1">
                                                            <p className="text-[15px] font-medium text-gray-200 mb-1 leading-snug">{card.label}</p>
                                                            <p className="text-[13px] text-white/60 leading-snug">{card.description}</p>
                                                        </div>
                                                        <div className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-600/30 group-hover:border-purple-500/40 transition-all">
                                                            <ArrowUpRight size={20} className="text-white/70 group-hover:text-purple-300 transition-colors group-hover:rotate-45 transition-all duration-300" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /*  CHAT SCREEN  */
                                    <motion.div
                                        key="chat-flow"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 pt-4 pb-36"
                                    >
                                        {/* Initializing spinner (session load) */}
                                        {isInitializing ? (
                                            <div className="flex items-center justify-center py-20 text-gray-500 text-sm gap-3">
                                                <div className="relative w-4 h-4">
                                                    <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
                                                    <div className="absolute inset-0 border-2 border-transparent border-t-purple-500 rounded-full animate-spin" />
                                                </div>
                                                Loading conversation...
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 w-full py-8">
                                                {messages.map((msg, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`flex flex-col w-full group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                                    >
                                                        {msg.role === 'user' ? (
                                                            <div className="bg-[#814AC8] text-[#efefef] rounded-2xl px-4 py-2.5 max-w-[85%] border border-purple-500/10 shadow-sm">
                                                                {editingIndex === idx ? (
                                                                    <div className="flex flex-col gap-3 min-w-[300px]">
                                                                        <textarea
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            className="bg-transparent border-none outline-none resize-none w-full text-[15px] leading-relaxed"
                                                                            rows={3}
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                                                                            <button onClick={handleCancelEdit} className="text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
                                                                            <button onClick={handleSaveEdit} className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-md text-white font-medium transition-colors">Save &amp; Submit</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                     <div className="flex flex-col gap-2">
                                                                         {msg.imageUrl && (
                                                                             <img
                                                                                 src={msg.imageUrl}
                                                                                 alt="Uploaded attachment"
                                                                                 className="max-w-[250px] max-h-[250px] rounded-lg object-cover border border-white/15"
                                                                             />
                                                                         )}
                                                                         {msg.content && <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>}
                                                                     </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full pl-2">
                                                                <div className="flex items-center gap-2.5 mb-3 px-1">
                                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                                                                        <Wand2 size={12} className="text-white" />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Auromind AI</span>
                                                                    {msg.isStreaming && (
                                                                        <span className="flex gap-1 h-3 items-center ml-2">
                                                                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className={`text-[15px] leading-[1.75] text-[#d4d4d4] max-w-none px-1 ${msg.isError ? 'text-red-400' : ''}`}>
                                                                    {msg.isStreaming && msg.content === '' ? (
                                                                        <div className="flex items-center gap-3 text-gray-500 py-2">
                                                                            <div className="relative w-4 h-4">
                                                                                <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
                                                                                <div className="absolute inset-0 border-2 border-transparent border-t-purple-500 rounded-full animate-spin" />
                                                                            </div>
                                                                            <span className="text-sm font-medium tracking-tight">Gathering insights...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="assistant-message-content font-medium leading-relaxed text-white/95 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:text-inherit">
                                                                            <ReactMarkdown
                                                                                components={{
                                                                                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-white mt-8 mb-4 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-white mt-6 mb-3 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-white mt-5 mb-2.5 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    h4: ({ node, ...props }) => <h4 className="text-lg font-bold text-white mt-4 mb-2 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    h5: ({ node, ...props }) => <h5 className="text-base font-bold text-white mt-3.5 mb-1.5 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    h6: ({ node, ...props }) => <h6 className="text-sm font-bold text-white mt-3 mb-1 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props} />,
                                                                                    p: ({ node, children, ...props }) => {
                                                                                        const childrenArray = React.Children.toArray(children);
                                                                                        const isBoldHeading = childrenArray.length === 1 && 
                                                                                                              React.isValidElement(childrenArray[0]) && 
                                                                                                              (childrenArray[0].props?.node?.tagName === 'strong' || childrenArray[0].type === 'strong');
                                                                                        if (isBoldHeading) {
                                                                                            return <h3 className="text-xl font-bold text-white mt-6 mb-3 border-t border-white/50 pt-6 first:mt-0 first:border-t-0 first:pt-0" {...props}>{children}</h3>;
                                                                                        }
                                                                                        return <p className="mb-4 leading-relaxed text-white/75 last:mb-0" {...props}>{children}</p>;
                                                                                    },
                                                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-white/75" {...props} />,
                                                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-white/75" {...props} />,
                                                                                    li: ({ node, ...props }) => <li className="leading-relaxed text-white/75" {...props} />,
                                                                                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                                                                    code: ({ node, ...props }) => <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white" {...props} />,
                                                                                    pre: ({ node, ...props }) => <pre className="bg-white/5 p-4 rounded-lg overflow-x-auto font-mono text-sm border border-white/10 my-4 text-white" {...props} />,
                                                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic my-4 text-white/75" {...props} />,
                                                                                    hr: ({ node, ...props }) => <hr className="border-t border-white/50 my-6" {...props} />,
                                                                                }}
                                                                            >
                                                                                {msg.content}
                                                                            </ReactMarkdown>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!msg.isStreaming && (
                                                                    <div className="flex items-center gap-1.5 mt-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                                                                        {/* ── Copy ── */}
                                                                        <button
                                                                            onClick={() => handleCopy(msg.content, idx)}
                                                                            className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                                                                            title="Copy"
                                                                        >
                                                                            {copiedIndex === idx
                                                                                ? <Check size={14} className="text-green-500" />
                                                                                : <Copy size={14} />}
                                                                        </button>

                                                                        {/* ── Regenerate ── */}
                                                                        <button
                                                                            onClick={() => handleRegenerate(idx)}
                                                                            className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                                                                            title="Regenerate"
                                                                        >
                                                                            <RotateCcw size={14} />
                                                                        </button>

                                                                        {/* ── Divider ── */}
                                                                        <div className="w-px h-4 bg-white/10 mx-0.5" />

                                                                        {/* ── Like ── */}
                                                                        <button
                                                                            onClick={() => handleFeedback(idx, 'like')}
                                                                            title="Good response"
                                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-200
                                                                                ${feedbackMap[idx] === 'like'
                                                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10'
                                                                                    : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:border-white/10 hover:text-gray-300'
                                                                                }`}
                                                                        >
                                                                            <ThumbsUp
                                                                                size={13}
                                                                                className={feedbackMap[idx] === 'like' ? 'fill-emerald-400' : ''}
                                                                            />
                                                                            {feedbackMap[idx] === 'like' && (
                                                                                <span className="text-emerald-400">Helpful</span>
                                                                            )}
                                                                        </button>

                                                                        {/* ── Dislike ── */}
                                                                        <button
                                                                            onClick={() => handleFeedback(idx, 'dislike')}
                                                                            title="Bad response"
                                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-200
                                                                                ${feedbackMap[idx] === 'dislike'
                                                                                    ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-sm shadow-red-500/10'
                                                                                    : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:border-white/10 hover:text-gray-300'
                                                                                }`}
                                                                        >
                                                                            <ThumbsDown
                                                                                size={13}
                                                                                className={feedbackMap[idx] === 'dislike' ? 'fill-red-400' : ''}
                                                                            />
                                                                            {feedbackMap[idx] === 'dislike' && (
                                                                                <span className="text-red-400">Not helpful</span>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} className="h-4" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </main>
                    {/*  Floating bottom input (chat mode only)  */}
                    {isChatStarted && (
                        <div className="absolute bottom-0 w-full z-30">
                            <AnimatePresence>
                                {showScrollBottom && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={{ duration: 0.18 }}
                                        className="flex justify-center mb-3"
                                    >
                                        <button
                                            onClick={() => scrollToBottom(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12121c] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-[12px] font-medium shadow-lg transition-all hover:bg-white/5"
                                        >
                                            <ChevronDown size={14} />
                                            Scroll to latest
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="flex justify-center pb-8 pt-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-full max-w-3xl px-4 pointer-events-auto"
                                >
                                    <div className="ai-input-box bg-[#12121c] rounded-2xl border border-white/10 shadow-2xl transition-all duration-300">
                                        {attachedFile && (
                                            <div className="px-5 pt-4">
                                                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl w-fit border border-white/10">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                                                        {attachedFile.type.startsWith('image/') && attachedFile.url ? (
                                                            <img src={attachedFile.url} alt="thumbnail" className="w-full h-full object-cover" />
                                                        ) : attachedFile.type.startsWith('image/') ? (
                                                            <ImageIcon size={16} />
                                                        ) : (
                                                            'DOC'
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-[12px] text-gray-200 font-medium truncate max-w-[150px]">{attachedFile.name}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-tight">Ready to analyze</span>
                                                    </div>
                                                    <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={plusRef} className="relative flex items-center px-4 py-3 gap-2">
                                            <button
                                                onClick={() => setIsPlusOpen(!isPlusOpen)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            {/* Model Selector */}
                                            <div className="relative model-dropdown flex-shrink-0">
                                                <button
                                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                                    className="px-2 py-1 rounded-md text-xs bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                                                >
                                                    {getModelName()}
                                                </button>
                                                {isModelDropdownOpen && (
                                                    <div className="absolute bottom-10 left-0 bg-[#12121c] border border-white/10 rounded-xl shadow-xl w-52 p-2 z-50">
                                                        {models.map((model) => {
                                                            const hasPremiumAccess = ["pro", "enterprise"].includes(userPlan);
                                                            return (
                                                                <button
                                                                    key={model.id}
                                                                    onClick={() => handleModelSelect(model)}
                                                                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                                                                >
                                                                    <span>{model.name}</span>
                                                                    {model.plan === "pro" && !hasPremiumAccess && (
                                                                        <span className="text-yellow-400 text-xs">🔒</span>
                                                                    )}
                                                                    {selectedModel === model.id && (
                                                                        <span className="text-purple-400 text-xs">✓</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Source Selector */}
                                            <div className="relative source-dropdown flex-shrink-0">
                                                <button
                                                    onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all border ${
                                                        source !== 'internal_web'
                                                            ? 'text-purple-300 border-purple-500/25 bg-purple-600/10'
                                                            : 'bg-white/5 text-gray-300 border-transparent hover:bg-white/10'
                                                    }`}
                                                >
                                                    {(() => {
                                                        const SelectedSourceIcon = SOURCE_OPTIONS.find(s => s.value === source)?.icon || Globe;
                                                        return <SelectedSourceIcon size={12} className={source !== 'internal_web' ? 'text-purple-300' : 'text-gray-400'} />;
                                                    })()}
                                                    <span>{getSourceLabel()}</span>
                                                    <ChevronDown size={10} className={`transition-transform duration-200 ${isSourceDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isSourceDropdownOpen && (
                                                    <div className="absolute bottom-10 left-0 bg-[#12121c] border border-white/10 rounded-xl shadow-xl w-48 p-2 z-50">
                                                        {SOURCE_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => {
                                                                    setSource(opt.value);
                                                                    setIsSourceDropdownOpen(false);
                                                                }}
                                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                                                             >
                                                                <opt.icon size={14} className="text-gray-400" />
                                                                <span>{opt.label}</span>
                                                                {source === opt.value && (
                                                                    <span className="ml-auto text-purple-400 text-xs">✓</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {isPlusOpen && (
                                                <div className="absolute bottom-14 left-4 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl w-44 p-2 z-50">
                                                    <button onClick={() => { fileInputRef.current?.click(); setIsPlusOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg font-medium">
                                                        <Paperclip size={16} />Attach File
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
                                                onClick={isLoading ? handleStop : handleExecute}
                                                disabled={!inputValue.trim() && !isLoading}
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${inputValue.trim() || isLoading ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500' : 'bg-white/5 text-gray-700'}`}
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
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
            />
            {/* Upgrade Modal */}
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
                            className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
                        >
                            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <div className="flex flex-col items-center text-center mt-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
                                    <Sparkles size={32} className="text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Unlock Pro Models</h3>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Get access to Gemini Flash, Claude Opus, and advanced reasoning capabilities. Upgrade your workspace to Pro.
                                </p>
                                <div className="flex w-full gap-3">
                                    <button onClick={() => setShowUpgradeModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm">
                                        Maybe Later
                                    </button>
                                    <button onClick={() => router.push('/user/admin/billing/payment?source=chat')} className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors font-medium text-sm shadow-lg shadow-purple-600/25">
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