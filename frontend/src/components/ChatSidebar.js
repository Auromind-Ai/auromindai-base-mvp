import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ChevronsLeft,
    Edit2,
    Trash2,
    Pin,
    Plus,
    MoreHorizontal,
    X
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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);

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

    const handleDeleteClick = (sessionId, e) => {
        e.stopPropagation();
        setSessionToDelete(sessionId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;

        await onDeleteSession(sessionToDelete);

        setShowDeleteModal(false);
        setSessionToDelete(null);
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setSessionToDelete(null);
    };

    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        return sessions.filter(s =>
            s.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sessions, searchQuery]);

    // Split into Pinned and Recent
    const { pinnedSessions, recentSessions } = useMemo(() => {
        return {
            pinnedSessions: filteredSessions.filter(s => s.pinned),
            recentSessions: filteredSessions.filter(s => !s.pinned),
        };
    }, [filteredSessions]);

    const formatTime = (session) => {
        const date = new Date(session.updated_at || session.created_at || new Date());
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
                        className="fixed inset-y-0 left-0 md:left-[320px] z-50 w-full md:w-[340px] flex flex-col shadow-2xl will-change-transform bg-[#0f0f13]"
                    >
                        <div className="flex flex-col h-full">

                            {/*  Header: Chat history + close/new  */}
                            <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleSidebar}
                                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/[0.15] text-gray-400 hover:text-white hover:border-white/30 transition-all bg-transparent"
                                        title="Close"
                                    >
                                        <X size={16} />
                                    </button>
                                    <h2 className="text-[20px] font-bold text-white tracking-tight">
                                        Chat history
                                    </h2>
                                </div>
                                <button
                                    onClick={onCreateSession}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/[0.15] text-gray-400 hover:text-white hover:border-white/30 transition-all bg-transparent"
                                    title="New Chat"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/*  Search  */}
                            <div className="px-4 pb-4 flex-shrink-0">
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09]"
                                >
                                    <Search size={14} className="flex-shrink-0 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search or start new chat"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-[13px] outline-none w-full text-gray-300"
                                        onFocus={e => e.target.placeholder = ''}
                                        onBlur={e => e.target.placeholder = 'Search or start new chat'}
                                    />
                                </div>
                            </div>

                            {/*  Scrollable content  */}
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5 [scrollbar-width:none]">

                                {/*  PINNED section  */}
                                {pinnedSessions.length > 0 && (
                                    <div>
                                        <p className="text-[13px] font-semibold mb-3 text-gray-400">
                                            Pinned
                                        </p>
                                        <div className="space-y-2.5">
                                            {pinnedSessions.map((session) => (
                                                <SessionCard
                                                    key={session.id}
                                                    session={session}
                                                    isActive={currentSessionId === session.id}
                                                    isEditing={editingId === session.id}
                                                    editTitle={editTitle}
                                                    setEditTitle={setEditTitle}
                                                    onSelect={() => onSelectSession(session.id)}
                                                    onEdit={(e) => handleEditClick(session, e)}
                                                    onSave={(e) => handleSaveTitle(session.id, e)}
                                                    onCancelEdit={() => setEditingId(null)}
                                                    onDelete={(e) => handleDeleteClick(session.id, e)}
                                                    formatTime={() => formatTime(session)}
                                                    standalone
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/*  RECENT section  */}
                                {recentSessions.length > 0 && (
                                    <div>
                                        <p className="text-[13px] font-semibold mb-3 text-[#e2dad7]">
                                            Recent
                                        </p>
                                        {/* All recent cards in ONE container with dividers */}
                                        <div
                                            className="rounded-xl overflow-hidden border border-white/[0.09] bg-white/[0.025]"
                                        >
                                            {recentSessions.map((session, idx) => (
                                                <div key={session.id}>
                                                    {idx !== 0 && (
                                                        <div className="h-px bg-white/[0.07] mx-3.5" />
                                                    )}
                                                    <SessionCard
                                                        session={session}
                                                        isActive={currentSessionId === session.id}
                                                        isEditing={editingId === session.id}
                                                        editTitle={editTitle}
                                                        setEditTitle={setEditTitle}
                                                        onSelect={() => onSelectSession(session.id)}
                                                        onEdit={(e) => handleEditClick(session, e)}
                                                        onSave={(e) => handleSaveTitle(session.id, e)}
                                                        onCancelEdit={() => setEditingId(null)}
                                                        onDelete={(e) => handleDeleteClick(session.id, e)}
                                                        formatTime={() => formatTime(session)}
                                                        standalone={false}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {sessions.length === 0 && (
                                    <div className="text-center mt-14 px-4">
                                        <p className="text-[12px] text-gray-600">No chat history found</p>
                                    </div>
                                )}
                            </div>


                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-y-0 left-0 md:left-[320px] right-0 z-40 pointer-events-auto bg-black/50 backdrop-blur-sm"
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-md rounded-2xl bg-[#0f0f13] border border-white/10 p-6 shadow-2xl"
                    >
                        <h3 className="text-lg font-semibold text-white">
                        Delete Chat
                        </h3>

                        <p className="mt-2 text-sm text-gray-400">
                        Are you sure you want to delete this conversation?
                        This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={cancelDelete}
                            className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                        >
                            Delete
                        </button>
                        </div>
                    </motion.div>
                    </motion.div>
                )}
                </AnimatePresence>
        </>
    );
}

/* ─
   Reusable Session Card
─ */
function SessionCard({
    session,
    isActive,
    isEditing,
    editTitle,
    setEditTitle,
    onSelect,
    onEdit,
    onSave,
    onCancelEdit,
    onDelete,
    formatTime,
    standalone
}) {
    const [showMenu, setShowMenu] = useState(false);

    const cardClasses = standalone
        ? `border rounded-xl ${
            isActive
                ? 'border-white/[0.18] bg-white/[0.06]'
                : 'border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.05]'
          }`
        : `${
            isActive
                ? 'bg-white/[0.05]'
                : 'bg-transparent hover:bg-white/[0.035]'
          }`;

    return (
        <div
            className={`relative group/card cursor-pointer transition-all ${cardClasses}`}
            onClick={onSelect}
            onMouseLeave={() => setShowMenu(false)}
        >
            <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 text-[13px] px-2 py-0.5 rounded outline-none bg-white/10 border border-white/20 text-gray-200"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSave(e);
                                    if (e.key === 'Escape') onCancelEdit();
                                }}
                            />
                        </div>
                    ) : (
                        <p
                            className="text-[14px] font-medium truncate flex-1 leading-snug text-white"
                        >
                            {session.title || 'New Chat'}
                        </p>
                    )}
                    <span
                        className="text-[11px] flex-shrink-0 mt-0.5 text-gray-500"
                    >
                        {formatTime()}
                    </span>
                </div>
                <p
                    className="text-[12px] truncate mt-0.5 leading-snug text-gray-500"
                >
                    {session.preview || session.last_message || ''}
                </p>
            </div>

            {/* Three dots / Edit & Delete menu */}
            <div className="absolute right-2 bottom-1.5 z-20 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {showMenu ? (
                    <div className="flex items-center gap-1 bg-[#1a1a24] border border-white/10 rounded-md p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                        <button
                            onClick={(e) => {
                                onEdit(e);
                                setShowMenu(false);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button
                            onClick={(e) => {
                                onDelete(e);
                                setShowMenu(false);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowMenu(true)}
                        className="p-1 rounded-md text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover/card:opacity-100"
                    >
                        <MoreHorizontal size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}