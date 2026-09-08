'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Film, Sparkles } from 'lucide-react';

export default function DocumentationVideo({
  video,
  url,
  title,
  duration,
  caption,
  poster,
  className = '',
}) {
  const videoData = video || { url, title, duration, caption, poster };
  const hasVideoUrl = !!videoData.url;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  // If a real video URL is provided, render active player
  if (hasVideoUrl) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl aspect-[16/9] group">
          <video
            ref={videoRef}
            src={videoData.url}
            poster={videoData.poster}
            muted={isMuted}
            playsInline
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

          {/* Center Play Button Overlay when paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#814AC8]/90 hover:bg-[#9255dd] text-white flex items-center justify-center shadow-xl shadow-purple-950/60 transition-transform hover:scale-110 active:scale-95"
              aria-label="Play tutorial video"
            >
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </button>
          )}

          {/* Top Title Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 font-semibold text-[11px] text-violet-300">
                Tutorial
              </span>
              <span className="font-medium truncate max-w-sm drop-shadow">
                {videoData.title || 'Video Walkthrough'}
              </span>
            </div>
            {videoData.duration && (
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 font-mono text-[11px] text-zinc-300">
                {videoData.duration}
              </span>
            )}
          </div>

          {/* Bottom Custom Controls Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>
              <button
                onClick={restartVideo}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white"
                aria-label="Restart video"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">HD 1080p</span>
          </div>
        </div>

        {videoData.caption && (
          <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span>{videoData.caption}</span>
          </p>
        )}
      </div>
    );
  }

  // Intentional, production-grade video placeholder when video is coming soon
  return (
    <div className={`space-y-2.5 ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#07080D]/90 aspect-[16/9] flex flex-col items-center justify-center p-6 text-center shadow-2xl group select-none hover:border-violet-500/30 transition-all"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(129, 74, 200, 0.08) 0%, transparent 70%)',
        }}
      >
        {/* Architectural geometric grid background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Top Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300">
            <Film className="w-3 h-3 text-violet-400" />
            <span>Video Tutorial Slot</span>
          </span>
        </div>

        {videoData.duration && (
          <div className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-400">
            ~{videoData.duration} planned
          </div>
        )}

        {/* Center Play Indicator */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/15 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:scale-105 group-hover:border-violet-500/50 group-hover:bg-[#814AC8]/20 transition-all duration-300 shadow-xl">
            <Play className="w-6 h-6 fill-current translate-x-0.5 opacity-80" />
          </div>
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-ping opacity-20 pointer-events-none" />
        </div>

        {/* Text Content */}
        <div className="space-y-1.5 max-w-md px-4">
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {videoData.title || 'Product Video Walkthrough'}
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {videoData.caption ||
              'A guided step-by-step video demonstration of this workflow will appear here.'}
          </p>
        </div>

        {/* Bottom Status Indicator */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-violet-400/70" />
          <span>Interactive walkthrough recording in production</span>
        </div>
      </div>

      {videoData.caption && (
        <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
          <span>{videoData.caption}</span>
        </p>
      )}
    </div>
  );
}
