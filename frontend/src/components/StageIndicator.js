"use client";

export default function StageIndicator({ stage, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center space-y-3 right-3 md:right-[max(1rem,calc((100vw-min(94vw,1260px))/2+14px))] pointer-events-none">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={`
            rounded-full transition-all duration-300
            ${
              stage === s
                ? "bg-purple-400 w-3 h-3 scale-125 ring-2 ring-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                : "bg-white/30 w-2 h-2"
            }
          `}
        />
      ))}
    </div>
  );
}
