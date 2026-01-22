'use client';

import React, { useMemo } from 'react';

const GalaxyBackground = () => {
    // Generate star positions once for performance
    const stars = useMemo(() => {
        return [...Array(100)].map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: Math.random() * 2 + 1,
            delay: `${Math.random() * 10}s`,
            duration: `${5 + Math.random() * 10}s`,
        }));
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
            {/* Rotating Black Hole Vortex Illusion */}
            <div
                className="absolute inset-[-50%] opacity-60 mix-blend-screen"
                style={{
                    animation: 'slow-rotate 120s linear infinite',
                    background: `
                        radial-gradient(circle at 50% 50%, 
                            transparent 0%, 
                            transparent 20%, 
                            #1e1b4b 35%, 
                            #4c1d95 45%, 
                            #c026d3 55%, 
                            #0891b2 70%, 
                            transparent 100%
                        )
                    `
                }}
            />

            {/* Accent Gradients for Flowing Nebula feel */}
            <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-[radial-gradient(circle_at_70%_30%,#1e1b4b_0%,transparent_70%)] opacity-40 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[70%] h-[70%] bg-[radial-gradient(circle_at_30%_70%,#4c1d95_0%,transparent_70%)] opacity-30 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Central Singularity Static Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] min-w-[300px] min-h-[300px]">
                {/* Event Horizon Glow */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-[100px]" />
                {/* The Singularity itself */}
                <div className="absolute inset-[15%] rounded-full bg-black shadow-[0_0_80px_rgba(76,29,149,0.3)]" />
            </div>

            {/* Shimmering Star Field */}
            <div className="absolute inset-0">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full bg-white/40"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            animation: `cosmic-twinkle ${star.duration} ease-in-out ${star.delay} infinite`,
                        }}
                    />
                ))}
            </div>

            {/* Overall Atmospheric Grain / Noise (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150 contrast-150" />
        </div>
    );
};

export default GalaxyBackground;
