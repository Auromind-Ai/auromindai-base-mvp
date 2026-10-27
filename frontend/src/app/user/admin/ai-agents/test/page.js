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
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

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
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sourcesUsed, setSourcesUsed] = useState([]);
  const messagesEndRef = useRef(null);

  // Load agents
  useEffect(() => {
    let isMounted = true;
    async function fetchAgents() {
      if (!workspaceId) return;
      try {
        setLoadingAgents(true);
        const res = await api.getAgents(workspaceId);
        if (isMounted) {
          const list = res.agents || [];
          setAgents(list);
          if (list.length > 0) {
            const target = list.find((a) => a.id === agentIdParam) || list[0];
            setSelectedAgent(target);
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

  // Set initial welcome message when agent is loaded
  useEffect(() => {
    if (selectedAgent && messages.length === 0) {
      const bizName = selectedAgent?.business_name || selectedAgent?.name || 'our company';
      const initialGreeting =
        selectedAgent.agent_type === 'sales_assistant'
          ? `Hi! 👋 Welcome to ${bizName}. How can I help you find the right product or offer today?`
          : `Hello! 👋 How can I assist you with ${bizName} today?`;

      setMessages([
        {
          id: 'welcome',
          sender: 'agent',
          text: initialGreeting,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [selectedAgent]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Send message handler
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsSending(true);

    try {
      const payload = {
        agent_id: selectedAgent?.id,
        channel: selectedChannel,
        message: text,
        conversation_history: messages.map((m) => ({
          sender: m.sender,
          text: m.text,
        })),
      };

      const res = await api.testAgentChat(payload, workspaceId);

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: res.reply || 'Thank you for your message! How else may I assist you?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: 'Sorry, I encountered an issue processing this test message. Please verify your configuration.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSourcesUsed([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b13] text-white">
      {/* Header */}
      <header className="px-8 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#080d16]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/ai-agents"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Back to AI Agents"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Test Your Agent</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold uppercase tracking-wider">
                Sandbox Test
              </span>
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
      <div className="flex-1 max-w-6xl w-full mx-auto px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Selectors & Scenarios */}
        <div className="lg:col-span-4 space-y-5">
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
                      setMessages([]);
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
                  label: 'WhatsApp',
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
                  id: 'website',
                  label: 'Website Chat',
                  color: 'hover:border-indigo-500/40',
                  activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30',
                  icon: <Globe size={15} />,
                },
                {
                  id: 'gmail',
                  label: 'Gmail',
                  color: 'hover:border-red-500/40',
                  activeBg: 'bg-red-600 text-white shadow-lg shadow-red-900/30',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  ),
                },
                {
                  id: 'calendar',
                  label: 'Calendar',
                  color: 'hover:border-amber-500/40',
                  activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-900/30',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
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
        </div>

        {/* Right Column: Chat Testing Window */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl bg-[#0c1220]/90 border border-white/[0.08] shadow-2xl overflow-hidden min-h-[560px]">
          {/* Chat Window Top Bar */}
          <div className="px-5 py-3.5 bg-[#0e1424] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/40">
                <Bot size={18} />
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
              <span className="text-[10px] text-zinc-400 capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                Channel: {selectedChannel}
              </span>
              <button
                type="button"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Chat Message Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar bg-[#080d16]/40">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                      isUser
                        ? selectedChannel === 'whatsapp'
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-purple-600 text-white rounded-tr-none'
                        : 'bg-[#151c2e] text-zinc-100 rounded-tl-none border border-white/[0.08]'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? 'text-white/70' : 'text-zinc-500'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
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
          <div className="p-3 bg-[#0e1424] border-t border-white/10 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Attach file (simulation)"
              >
                <Paperclip size={16} />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#151c2e] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all cursor-pointer disabled:opacity-40 shrink-0 ${
                  selectedChannel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/30'
                }`}
              >
                <Send size={15} />
              </button>
            </form>

            {/* Disclaimer Label */}
            <div className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
              <span>This is a test environment. Responses are generated based on your current agent configuration.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
