'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Smile,
  ChevronDown,
  Copy,
  Check,
  FileText,
  Download,
  X,
  Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function getCurrentTimeStr() {
  try {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return new Date().toLocaleTimeString();
  }
}

function getUniqueId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const SCENARIOS = [
  { id: 'product', label: 'Product enquiry', text: 'Hi 👋 Do you have this product in stock?' },
  { id: 'pricing', label: 'Pricing question', text: 'How much does your service cost and what are the pricing tiers?' },
  { id: 'order', label: 'Order status', text: 'Can you check the current tracking status of order #94821?' },
  { id: 'refund', label: 'Return & refund', text: 'What is your return policy and how do I claim a refund?' },
  { id: 'meeting', label: 'Book a meeting', text: 'I want to schedule a product demo with your team tomorrow.' },
  { id: 'custom', label: 'Custom question', text: 'Tell me about the unique features and advantages of your company.' },
];

export default function TestAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#070b13] text-zinc-400 text-xs">
        <Loader2 size={24} className="animate-spin text-purple-500 mr-2" />
        <span>Loading test sandbox...</span>
      </div>
    }>
      <TestAgentContent />
    </Suspense>
  );
}

function TestAgentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentIdParam = searchParams?.get('agentId');
  const { workspaceId, user } = useAuth();

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [selectedChannel, setSelectedChannel] = useState('whatsapp'); // 'whatsapp' | 'instagram' | 'website'
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyMessage = (id, textToCopy) => {
    if (!textToCopy) return;
    try {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn("Failed to copy message:", e);
    }
  };
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sourcesUsed, setSourcesUsed] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isImage = file.type.startsWith('image/');
      setSelectedFilePreview({
        file,
        url: isImage ? URL.createObjectURL(file) : null,
        type: isImage ? 'image' : 'document',
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      });
      e.target.value = '';
    }
  };

  const handleClearSelectedFile = () => {
    if (selectedFilePreview?.url) {
      try { URL.revokeObjectURL(selectedFilePreview.url); } catch (_) {}
    }
    setSelectedFile(null);
    setSelectedFilePreview(null);
  };

  // Load agents
  useEffect(() => {
    let isMounted = true;
    async function fetchAgents() {
      if (!workspaceId) return;
      try {
        setLoadingAgents(true);
        const res = await api.getAgents(workspaceId);
        if (isMounted) {
          const list = (res.agents || []).filter(
            (a) => !a.is_draft && a.status?.toLowerCase() !== 'draft'
          );
          setAgents(list);
          if (list.length > 0) {
            const target = list.find((a) => a.id === agentIdParam) || list[0];
            setSelectedAgent(target);
            const bizName = target?.business_name || target?.name || 'our company';
            const initialGreeting =
              target?.agent_type === 'sales_assistant'
                ? `Hi! 👋 Welcome to ${bizName}. How can I help you find the right product or offer today?`
                : `Hello! 👋 How can I assist you with ${bizName} today?`;
            setMessages([
              {
                id: 'welcome',
                sender: 'agent',
                text: initialGreeting,
                time: getCurrentTimeStr(),
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch agents for testing:", err);
      } finally {
        if (isMounted) setLoadingAgents(false);
      }
    }
    fetchAgents();
    return () => { isMounted = false; };
  }, [workspaceId, agentIdParam]);



  // Scroll to bottom when messages update inside chat container
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isSending]);

  // Send message handler with file upload support
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend !== null ? textToSend : inputText).trim();
    if ((!text && !selectedFile) || isSending || isUploadingMedia) return;

    let mediaData = null;
    const fileToUpload = selectedFile;
    const previewToKeep = selectedFilePreview;

    if (fileToUpload) {
      setIsUploadingMedia(true);
      try {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        const wsQuery = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
        const uploadEndpoint = typeof window !== 'undefined' && window.location.hostname.endsWith('orbionagents.com')
          ? `https://api.orbionagents.com/upload${wsQuery}`
          : `/api/upload${wsQuery}`;
        const uploadRes = await api.post(uploadEndpoint, formData);
        mediaData = {
          url: uploadRes.url,
          type: uploadRes.file_type || (fileToUpload.type.startsWith('image/') ? 'image' : 'document'),
          name: uploadRes.filename || fileToUpload.name,
          size: previewToKeep?.size || '',
          mimeType: uploadRes.mime_type || fileToUpload.type,
        };
      } catch (uploadErr) {
        console.error("Failed to upload file to server, using client preview fallback:", uploadErr);
        mediaData = {
          url: previewToKeep?.url,
          type: previewToKeep?.type || (fileToUpload.type.startsWith('image/') ? 'image' : 'document'),
          name: fileToUpload.name,
          size: previewToKeep?.size || '',
        };
      } finally {
        setIsUploadingMedia(false);
      }
    }

    const userMsg = {
      id: getUniqueId('user'),
      sender: 'user',
      text,
      mediaUrl: mediaData?.url,
      mediaType: mediaData?.type,
      fileName: mediaData?.name,
      fileSize: mediaData?.size,
      time: getCurrentTimeStr(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === null) setInputText('');
    handleClearSelectedFile();
    setIsSending(true);

    try {
      const payload = {
        agent_id: selectedAgent?.id,
        channel: selectedChannel,
        message: text || (mediaData ? `[${(mediaData.type || 'FILE').toUpperCase()}]` : ''),
        conversation_history: messages.map((m) => ({
          sender: m.sender,
          text: m.text || '',
          media_url: m.mediaUrl || null,
        })),
        media_url: mediaData?.url || null,
        media_type: mediaData?.type || null,
        filename: mediaData?.name || null,
        file_size: mediaData?.size || null,
      };

      const res = await api.testAgentChat(payload, workspaceId);

      const agentMsg = {
        id: getUniqueId('agent'),
        sender: 'agent',
        text: res.reply || 'Thank you for your message! How else may I assist you?',
        time: getCurrentTimeStr(),
        modelUsed: res.model_used,
        executionTime: res.execution_time_ms,
      };

      setMessages((prev) => [...prev, agentMsg]);
      if (res.sources_used?.length) {
        setSourcesUsed(res.sources_used);
      }
    } catch (err) {
      console.error("Test message failed:", err);
      const errorMsg = {
        id: getUniqueId('err'),
        sender: 'agent',
        text: 'Sorry, I encountered an issue processing this test message. Please verify your configuration.',
        time: getCurrentTimeStr(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Reset conversation handler
  const handleResetConversation = () => {
    const bizName = selectedAgent?.business_name || selectedAgent?.name || 'our company';
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'agent',
        text: `Hi! 👋 Conversation reset. How can I assist you with ${bizName}?`,
        time: getCurrentTimeStr(),
      },
    ]);
    setSourcesUsed([]);
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-[100dvh] overflow-hidden bg-[#070b13] text-white">
      {/* Header */}
      <header className="px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#080d16]/80 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/ai-agents"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Back to AI Agents"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Test Your Agent
            </h1>
            <p className="text-xs text-zinc-400">
              Try different scenarios to see how your agent responds in real-time.
            </p>
          </div>
        </div>

        {/* Reset Conversation Button */}
        <button
          type="button"
          onClick={handleResetConversation}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Reset Conversation</span>
        </button>
      </header>

      {/* Main Grid: Left Controls, Right Chat Interface */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        {/* Left Column: Selectors & Scenarios */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {/* Agent Selector Card */}
          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Active Agent
            </label>
            {loadingAgents ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading agents...</span>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-xs text-zinc-400 py-1">
                No agents created yet.{' '}
                <Link href="/ai-agents/create" className="text-purple-400 underline font-medium">
                  Create one now
                </Link>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedAgent?.id || ''}
                  onChange={(e) => {
                    const found = agents.find((a) => a.id === e.target.value);
                    if (found) {
                      setSelectedAgent(found);
                      const bizName = found?.business_name || found?.name || 'our company';
                      const initialGreeting =
                        found?.agent_type === 'sales_assistant'
                          ? `Hi! 👋 Welcome to ${bizName}. How can I help you find the right product or offer today?`
                          : `Hello! 👋 How can I assist you with ${bizName} today?`;
                      setMessages([
                        {
                          id: 'welcome',
                          sender: 'agent',
                          text: initialGreeting,
                          time: getCurrentTimeStr(),
                        },
                      ]);
                      setSourcesUsed([]);
                    }
                  }}
                  className="w-full bg-[#121927] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.business_name || 'Orbion'})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Channel Selector */}
          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Select Channel
            </label>
            <div className="space-y-1.5">
              {[
                {
                  id: 'whatsapp',
                  label: 'WhatsApp Business',
                  color: 'hover:border-emerald-500/40',
                  activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  ),
                },
                {
                  id: 'instagram',
                  label: 'Instagram',
                  color: 'hover:border-pink-500/40',
                  activeBg: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-pink-900/30',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  ),
                },
                {
                  id: 'twilio',
                  label: 'Twilio SMS',
                  color: 'hover:border-red-500/40',
                  activeBg: 'bg-red-600 text-white shadow-lg shadow-red-900/30',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  ),
                },
              ].map((ch) => {
                const isActive = selectedChannel === ch.id;
                const isEnabledOnAgent = Boolean(selectedAgent?.channels_config?.[ch.id]?.enabled);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      isActive
                        ? `${ch.activeBg} border-transparent`
                        : `bg-[#101726] text-zinc-300 border-white/10 ${ch.color}`
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{ch.icon}</span>
                      <span>{ch.label}</span>
                    </div>
                    {isEnabledOnAgent ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-normal">
                        Enabled
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-normal">
                        Not configured
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sample Scenarios */}
          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Sample Scenarios
            </label>
            <div className="space-y-1">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSendMessage(sc.text)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-left group cursor-pointer"
                >
                  <span>{sc.label}</span>
                  <span className="text-zinc-500 group-hover:text-purple-400 transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sources Used Badge if any */}
          {sourcesUsed.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Knowledge Sources Consulted</span>
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sourcesUsed.map((s, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat Testing Window */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 rounded-2xl bg-[#0c1220]/90 border border-white/[0.08] shadow-2xl overflow-hidden">
          {/* Chat Window Top Bar */}
          <div className="px-5 py-3 bg-[#0e1424] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/40 overflow-hidden relative border border-purple-400/20 shrink-0">
                {selectedAgent?.avatar_url ? (
                  <img src={selectedAgent.avatar_url} alt={selectedAgent.name} className="w-full h-full object-cover" />
                ) : (
                  <Bot size={18} />
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">
                  {selectedAgent?.business_name || selectedAgent?.name || 'AI Assistant'}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Business Account • Active Test</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 capitalize px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                Channel: {selectedChannel}
              </span>
            </div>
          </div>

          {/* Chat Message Scroll Area */}
          <div ref={chatScrollContainerRef} className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4 custom-scrollbar bg-[#080d16]/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {isUser ? (
                    /* User Message Bubble */
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                        selectedChannel === 'whatsapp'
                          ? 'bg-[#005c4b] text-white rounded-tr-sm'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                      }`}
                    >
                      {/* Image Preview */}
                      {msg.mediaUrl && msg.mediaType === 'image' && (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black/20">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.fileName || 'Uploaded image'}
                            className="max-w-full max-h-60 rounded-xl object-contain cursor-pointer hover:opacity-95 transition"
                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                          />
                        </div>
                      )}

                      {/* Document / File Preview */}
                      {msg.mediaUrl && msg.mediaType !== 'image' && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 mb-2 transition-colors group/doc"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-medium text-white truncate">{msg.fileName || 'Document'}</p>
                            {msg.fileSize && <p className="text-[10px] text-white/60">{msg.fileSize}</p>}
                          </div>
                          <Download size={13} className="text-white/60 group-hover/doc:text-white shrink-0" />
                        </a>
                      )}

                      {msg.text && !/^\[(IMAGE|DOCUMENT|FILE)\]$/i.test(msg.text.trim()) && (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}

                      <div className="text-[9px] mt-1.5 text-white/70 text-right">
                        {msg.time}
                      </div>
                    </div>
                  ) : (
                    /* AI Agent Response Bubble (Rich Markdown like AI Workspace) */
                    <div className="flex items-start gap-2.5 max-w-[85%] group">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0 mt-0.5 border border-purple-400/20">
                        {selectedAgent?.avatar_url ? (
                          <img src={selectedAgent.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Bot size={14} />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[11px] font-semibold text-white">
                            {selectedAgent?.business_name || selectedAgent?.name || 'AI Assistant'}
                          </span>
                        </div>

                        <div
                          className={`px-4 py-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-lg ${
                            msg.isError
                              ? 'bg-rose-950/60 text-rose-200 border border-rose-500/30'
                              : 'bg-[#121927] text-zinc-100 border border-white/[0.08]'
                          }`}
                        >
                          <div className="assistant-message-content leading-relaxed text-zinc-100 text-[13px]">
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 border-b border-white/10 pb-1" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1 border-b border-white/10 pb-0.5" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-white mt-2 mb-1" {...props} />,
                                h4: ({ node, ...props }) => <h4 className="text-xs font-semibold text-white mt-1.5 mb-0.5" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-2 leading-relaxed text-zinc-100 last:mb-0" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1 text-zinc-100" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-zinc-100" {...props} />,
                                li: ({ node, ...props }) => <li className="leading-relaxed text-zinc-100" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                em: ({ node, ...props }) => <em className="italic text-purple-200" {...props} />,
                                code: ({ node, ...props }) => (
                                  <code className="bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-300" {...props} />
                                ),
                                pre: ({ node, ...props }) => (
                                  <pre className="bg-[#0b101c] p-3 rounded-xl overflow-x-auto text-xs border border-white/10 my-2 text-zinc-200 font-mono" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-2 border-purple-500 pl-3 italic text-zinc-300 my-2" {...props} />
                                ),
                                a: ({ node, ...props }) => (
                                  <a className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors" target="_blank" rel="noreferrer" {...props} />
                                ),
                                hr: ({ node, ...props }) => <hr className="border-t border-white/10 my-3" {...props} />,
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 text-[10px] text-zinc-500">
                            <span>{msg.executionTime ? `⚡ ${msg.executionTime}ms` : ''}</span>
                            <div className="flex items-center gap-2">
                              <span>{msg.time}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="p-1 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                                title="Copy message"
                              >
                                {copiedId === msg.id ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isSending && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#151c2e] text-zinc-400 text-xs w-28 rounded-tl-none border border-white/[0.08]">
                <Loader2 size={13} className="animate-spin text-purple-400" />
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input */}
          <div className="p-3 bg-[#0e1424] border-t border-white/10 space-y-2 shrink-0">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment preview if selected */}
            {selectedFilePreview && (
              <div className="p-2 px-3 rounded-xl bg-[#151c2e] border border-white/10 inline-flex items-center gap-3 max-w-full shadow-lg mb-2">
                {selectedFilePreview.type === 'image' && selectedFilePreview.url ? (
                  <img
                    src={selectedFilePreview.url}
                    alt="attachment"
                    className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <FileText size={18} />
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-2 text-left">
                  <p className="text-xs text-white font-medium truncate max-w-[200px]">
                    {selectedFilePreview.name}
                  </p>
                  <p className="text-[10px] text-zinc-400">{selectedFilePreview.size}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedFile}
                  className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                title="Attach image or document"
              >
                <Paperclip size={16} />
              </button>

              <input
                type="text"
                placeholder={selectedFilePreview ? "Add a message or press enter to send..." : "Type a message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#151c2e] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || isSending || isUploadingMedia}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all cursor-pointer disabled:opacity-40 shrink-0 ${
                  selectedChannel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/30'
                }`}
              >
                {isUploadingMedia ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>

            {/* Disclaimer Label */}
            <div className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
              <span>This is a test environment. Responses are generated based on your current agent configuration.</span>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
