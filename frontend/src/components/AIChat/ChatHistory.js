'use client';

import { useState } from 'react';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatHistory({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');

    const CHAT_HISTORY = [
        {
            section: 'Today',
            chats: [
                { id: 1, title: 'Greeting', time: '1m ago' }
            ]
        },
        {
            section: 'Past week',
            chats: [
                { id: 2, title: 'New features in Notion AI', time: 'Jul 2' }
            ]
        }
    ];

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
                    {CHAT_HISTORY.map((section, i) => (
                        <div key={i} className="mb-6">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2 px-2">
                                {section.section}
                            </div>
                            <div className="space-y-1">
                                {section.chats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left group"
                                    >
                                        <MessageSquare size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-300 truncate">
                                                {chat.title}
                                            </div>
                                            <div className="text-xs text-slate-600">
                                                {chat.time}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
