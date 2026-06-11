import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ChevronsLeft,
    Edit2,
    Trash2,
    Pin
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
                        className="fixed inset-y-0 left-[320px] z-50 w-[340px] flex flex-col shadow-2xl will-change-transform"
                        style={{ background: '#0f0f13' }}
                    >
                        <div className="flex flex-col h-full">

                            {/* ── Header: Chat history + share icon ── */}
                            <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
                                <h2 className="text-[20px] font-bold text-white tracking-tight">
                                    Chat history
                                </h2>
                                <button
                                    onClick={toggleSidebar}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/[0.15] text-gray-400 hover:text-white hover:border-white/30 transition-all"
                                    style={{ background: 'transparent' }}
                                >
                                    {/* Star / bookmark icon matching screenshot */}
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </button>
                            </div>

                            {/* ── Search ── */}
                            <div className="px-4 pb-4 flex-shrink-0">
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.09)'
                                    }}
                                >
                                    <Search size={14} className="flex-shrink-0" style={{ color: '#6b7280' }} />
                                    <input
                                        type="text"
                                        placeholder="Search or start new chat"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-[13px] outline-none w-full"
                                        style={{ color: '#d1d5db' }}
                                        onFocus={e => e.target.placeholder = ''}
                                        onBlur={e => e.target.placeholder = 'Search or start new chat'}
                                    />
                                </div>
                            </div>

                            {/* ── Scrollable content ── */}
                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5" style={{ scrollbarWidth: 'none' }}>

                                {/* ── PINNED section ── */}
                                {pinnedSessions.length > 0 && (
                                    <div>
                                        <p className="text-[13px] font-semibold mb-3" style={{ color: '#9ca3af' }}>
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

                                {/* ── RECENT section ── */}
                                {recentSessions.length > 0 && (
                                    <div>
                                        <p className="text-[13px] font-semibold mb-3" style={{ color: '#9ca3af' }}>
                                            Recent
                                        </p>
                                        {/* All recent cards in ONE container with dividers */}
                                        <div
                                            className="rounded-xl overflow-hidden"
                                            style={{
                                                border: '1px solid rgba(255,255,255,0.09)',
                                                background: 'rgba(255,255,255,0.025)'
                                            }}
                                        >
                                            {recentSessions.map((session, idx) => (
                                                <div key={session.id}>
                                                    {idx !== 0 && (
                                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 14px' }} />
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
                                        <p className="text-[12px]" style={{ color: '#4b5563' }}>No chat history found</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Bottom: Log out ── */}
                            <div
                                className="flex-shrink-0 px-5 py-4"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <button
                                    onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
                                    className="text-[13px] transition-colors"
                                    style={{ color: '#6b7280' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                                >
                                    Log out
                                </button>
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
                        className="fixed inset-y-0 left-[320px] right-0 z-40 pointer-events-auto"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

/* ─────────────────────────────────────────
   Reusable Session Card
───────────────────────────────────────── */
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
    const baseCardStyle = standalone
        ? {
            border: `1px solid ${isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)'}`,
            background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
        }
        : {
            background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
        };

    return (
        <div
            className="relative group/card cursor-pointer transition-all"
            style={baseCardStyle}
            onClick={onSelect}
            onMouseEnter={e => {
                if (!isActive && !standalone) e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                if (!isActive && standalone) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={e => {
                if (!isActive && !standalone) e.currentTarget.style.background = 'transparent';
                if (!isActive && standalone) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
        >
            <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 text-[13px] px-2 py-0.5 rounded outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#e5e7eb'
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSave(e);
                                    if (e.key === 'Escape') onCancelEdit();
                                }}
                            />
                        </div>
                    ) : (
                        <p
                            className="text-[14px] font-bold truncate flex-1 leading-snug"
                            style={{ color: '#ffffff' }}
                        >
                            {session.title || 'New Chat'}
                        </p>
                    )}
                    <span
                        className="text-[11px] flex-shrink-0 mt-0.5"
                        style={{ color: '#6b7280' }}
                    >
                        {formatTime()}
                    </span>
                </div>
                <p
                    className="text-[12px] truncate mt-0.5 leading-snug"
                    style={{ color: '#6b7280' }}
                >
                    {session.preview || session.last_message || ''}
                </p>
            </div>

            {/* Edit / Delete on hover */}
            <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1 rounded-md transition-colors"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#d1d5db'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                >
                    <Edit2 size={11} />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1 rounded-md transition-colors"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                >
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
}