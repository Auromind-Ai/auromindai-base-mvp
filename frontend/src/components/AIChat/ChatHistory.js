'use client';

import { useState, useEffect } from 'react';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function ChatHistory({ isOpen, onClose, onSelectSession }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const fetchSessions = async () => {
            setIsLoading(true);
            try {
                const res = await api.getChatSessions();
                setSessions(res || []);
            } catch (err) {
                console.error("Failed to load chat history sessions:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSessions();
    }, [isOpen]);

    const filteredSessions = sessions.filter(s =>
        !searchQuery || (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-80 bg-[#1a1a1a] border-r border-[#2f2f2f] z-[1000] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-4 border-b border-[#2f2f2f]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-200">Chat history</h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                            <Plus size={16} className="text-slate-500 rotate-45" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full pl-9 pr-3 py-2 bg-[#151515] border border-[#2f2f2f] rounded-lg text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-500/30"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {isLoading ? (
                        <div className="p-4 text-xs text-slate-500 text-center animate-pulse">Loading history...</div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 text-center">No chat sessions found.</div>
                    ) : (
                        <div className="space-y-1">
                            {filteredSessions.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => onSelectSession && onSelectSession(chat.id)}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left group"
                                >
                                    <MessageSquare size={14} className="text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-indigo-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-300 truncate">
                                            {chat.title || 'Untitled Chat'}
                                        </div>
                                        <div className="text-[10px] text-slate-600">
                                            {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : ''}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
