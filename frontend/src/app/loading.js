export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] select-none pointer-events-auto">
      <style>{`
        @keyframes loading-progress {
          0% { width: 0%; }
          100% { width: 90%; }
        }
        @keyframes loading-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes loading-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes loading-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        @keyframes loading-fade-up {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 0.8; transform: translateY(0); }
        }
        .animate-progress {
          animation: loading-progress 1.5s ease-out forwards;
        }
        .animate-spin-fast {
          animation: loading-spin 0.8s linear infinite;
        }
        .animate-spin-reverse {
          animation: loading-spin-reverse 2.2s linear infinite;
        }
        .animate-pulse-scale {
          animation: loading-pulse-scale 1.6s ease-in-out infinite;
        }
        .animate-fade-up {
          animation: loading-fade-up 0.5s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style>

      {/* Top glowing progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(124,58,237,0.8)] animate-progress" />

      {/* Centered neat loader container */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Inner ring */}
          <div className="absolute w-12 h-12 border-2 border-white/5 border-t-violet-500 rounded-full animate-spin-fast" />

          {/* Outer floating blur ring */}
          <div className="absolute w-16 h-16 border border-indigo-500/20 rounded-full blur-[2px] animate-spin-reverse" />

          {/* Logo center dot */}
          <div className="w-2.5 h-2.5 bg-violet-400 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.8)] animate-pulse-scale" />
        </div>

        {/* Loading text */}
        <div className="flex items-center gap-1.5 animate-fade-up">
          <span className="text-white/60 text-[10px] font-mono uppercase tracking-[0.25em] font-medium">
            Orbionagents
          </span>
          <span className="text-violet-400 text-[10px] font-mono uppercase tracking-[0.25em] font-bold">
            AI
          </span>
        </div>
      </div>
    </div>
  );
}
