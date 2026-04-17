"use client";

export default function StageIndicator({ stage, isVisible }) {
    if (!isVisible) return null; 
        return (
            <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center space-y-4">

                {/* DOTS */}
                {[1, 2, 3, 4].map((s) => (
                    <div
                    key={s}
                    className={`
                        w-3 h-3 rounded-full transition-all duration-300
                        ${
                        stage === s
                            ? "bg-blue-500 scale-150 shadow-[0_0_12px_#3b82f6]"
                            : "bg-gray-300 opacity-40"
                        }
                    `}
                    />
                ))}
            </div>
        );
    }
