import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Search,
    Pin,
    ChevronsLeft,
    Clock,
    MoreHorizontal
} from 'lucide-react';

export default function ChatSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    onUpdateSession,
    isOpen,
    toggleSidebar
}) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const handleEditClick = (session, e) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title || "New Chat");
    };

    const handleSaveTitle = async (sessionId, e) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            await onUpdateSession(sessionId, editTitle);
        }
        setEditingId(null);
    };

    const handleCancelEdit = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const handleDeleteClick = (sessionId, e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this chat?")) {
            onDeleteSession(sessionId);
        }
    };

    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        return sessions.filter(s =>
            s.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sessions, searchQuery]);

    const groupedSessions = useMemo(() => {
        const groups = {
            Today: [],
            Yesterday: [],
            Older: []
        };

        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        filteredSessions.forEach(session => {
            const date = new Date(session.updated_at || session.created_at);
            if (date.toDateString() === now.toDateString()) {
                groups.Today.push(session);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups.Yesterday.push(session);
            } else {
                groups.Older.push(session);
            }
        });

        return groups;
    }, [filteredSessions]);

    return (
        <>
            {/* Sidebar Container */}
            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                        className={`
                            fixed inset-y-0 left-0 z-50
                            w-[240px] bg-[#0A0A0A] border-r border-white/5
                            flex flex-col shadow-2xl
                            will-change-transform
                        `}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-4 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold text-gray-200">Chat history</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-colors">
                                        <Pin size={16} />
                                    </button>
                                    <button
                                        onClick={toggleSidebar}
                                        className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        onClick={onCreateSession}
                                        className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-colors ml-1"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="p-4 pt-4 pb-2">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search or start new chat"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-transparent focus:border-indigo-500/30 rounded-lg py-2 pl-9 pr-4 text-[13px] text-gray-300 placeholder:text-gray-600 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Session List */}
                            <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2 space-y-6 custom-scrollbar">
                                {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                                    groupSessions.length > 0 && (
                                        <div key={groupName} className="space-y-1">
                                            <h3 className="px-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                {groupName}
                                            </h3>
                                            {groupSessions.map((session) => (
                                                <div
                                                    key={session.id}
                                                    onClick={() => onSelectSession(session.id)}
                                                    className={`
                                                        group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all
                                                        ${currentSessionId === session.id
                                                            ? 'bg-[#1A1A1A] text-white'
                                                            : 'hover:bg-[#1A1A1A] text-gray-500 hover:text-gray-300'
                                                        }
                                                    `}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${currentSessionId === session.id ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-gray-600 group-hover:text-gray-400'}`}>
                                                        <MessageSquare size={16} />
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col">
                                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                            {editingId === session.id ? (
                                                                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="text"
                                                                        value={editTitle}
                                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                                        className="flex-1 bg-gray-800 text-[13px] px-2 py-0.5 rounded border border-gray-600 focus:outline-none focus:border-indigo-500 outline-none"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleSaveTitle(session.id, e);
                                                                            if (e.key === 'Escape') setEditingId(null);
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-[13px] truncate font-medium">{session.title || "New Chat"}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-gray-600 font-medium">
                                                            {(() => {
                                                                const date = new Date(session.updated_at || session.created_at || new Date());
                                                                return isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                            })()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleEditClick(session, e)}
                                                            className="p-1 hover:text-indigo-400 transition-colors"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteClick(session.id, e)}
                                                            className="p-1 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ))}

                                {sessions.length === 0 && (
                                    <div className="text-center text-gray-600 mt-10 px-4">
                                        <Clock size={24} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No chat history found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay for mobile and desktop when sidebar is open */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 pointer-events-auto"
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
