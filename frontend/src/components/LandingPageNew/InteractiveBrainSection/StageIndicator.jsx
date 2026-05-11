"use client";

export default function StageIndicator({ stage, isVisible }) {
  if (!isVisible) return null;

  return (
    <>
      {/* Desktop: right side vertical */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex-col items-center space-y-4 hidden md:flex">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`
              rounded-full transition-all duration-500 ease-out
              ${
                stage === s
                  ? "w-3 h-3 bg-purple-500 scale-150 shadow-[0_0_18px_rgba(168,85,247,0.9),0_0_30px_rgba(168,85,247,0.5)]"
                  : stage > s
                  ? "w-2 h-2 bg-purple-300 opacity-60"
                  : "w-2 h-2 bg-gray-300 opacity-30"
              }
            `}
          />
        ))}
        {/* connecting line */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-purple-200 to-transparent"
          style={{ height: "calc(100% - 12px)", zIndex: -1 }}
        />
      </div>

      {/* Mobile: bottom center horizontal */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex md:hidden gap-3 z-50">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`
              rounded-full transition-all duration-500 ease-out
              ${
                stage === s
                  ? "w-3 h-3 bg-purple-500 scale-150 shadow-[0_0_18px_rgba(168,85,247,0.9)]"
                  : stage > s
                  ? "w-2 h-2 bg-purple-300 opacity-60"
                  : "w-2 h-2 bg-gray-300 opacity-30"
              }
            `}
          />
        ))}
      </div>
    </>
  );
}