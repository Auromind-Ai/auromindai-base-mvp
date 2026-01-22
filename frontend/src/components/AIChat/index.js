'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AIChat from './AIChat';
import ChatHistory from './ChatHistory';

export default function GlobalAIChat() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 w-12 h-12 bg-[#1e1e1e] border border-[#2f2f2f] rounded-xl shadow-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-all z-[998] group"
                title="Open AI Assistant"
            >
                <Sparkles size={20} className="text-indigo-400" />
            </button>

            {/* Chat History Sidebar */}
            <ChatHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />

            {/* AI Chat Modal */}
            <AIChat
                isOpen={isChatOpen}
                onClose={() => {
                    setIsChatOpen(false);
                    setIsHistoryOpen(false);
                }}
                onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
            />
        </>
    );
}
