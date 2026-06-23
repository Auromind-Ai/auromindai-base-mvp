"use client";

export default function StageIndicator({ stage, isVisible }) {
    if (!isVisible) return null; 
        return (
            <div
                className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center space-y-3"
                style={{
                    right: window.innerWidth < 768 
                    ? "12px" 
                    : "calc((100vw - min(88vw, 1280px)) / 2 + 24px)",
                }}
                >
                {[1, 2, 3, 4].map((s) => (
                    <div
                    key={s}
                    className={`
                        rounded-full transition-all duration-400
                        ${
                        stage === s
                            ? "bg-white w-2.5 h-2.5 scale-125"
                            : "bg-white/35 w-2 h-2"
                        }
                    `}
                    style={
                      stage === s
                        ? { boxShadow: "0 0 8px 2px rgba(255,255,255,0.55)" }
                        : {}
                    }
                    />
                ))}
            </div>
        );
    }