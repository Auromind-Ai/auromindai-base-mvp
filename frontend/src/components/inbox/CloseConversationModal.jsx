'use client';

export default function CloseConversationModal({ isOpen, onClose, onConfirm, loading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#111119] border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">

        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Close Conversation?</h2>
            <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">
              This conversation will be removed from active inbox.
            </p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            Conversation history will be preserved and accessible through filters.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-transparent border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95"
          >
            {loading ? 'Closing...' : 'Close Conversation'}
          </button>
        </div>

      </div>
    </div>
  );
}
