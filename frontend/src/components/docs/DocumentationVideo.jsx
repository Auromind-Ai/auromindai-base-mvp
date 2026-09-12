'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Film, Sparkles, Maximize, Maximize2, X } from 'lucide-react';

export default function DocumentationVideo({
  video,
  url,
  fallbackUrl,
  title,
  duration,
  caption,
  poster,
  asGif = false,
  objectFit = 'cover',
  aspectRatio = 'aspect-[16/9]',
  className = '',
}) {
  const videoData = video || { url, fallbackUrl, title, duration, caption, poster };
  const hasVideoUrl = !!(videoData.url || url);

  const [isPlaying, setIsPlaying] = useState(asGif ? true : false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const playPromiseRef = useRef(null);

  const safePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;

    try {
      const promise = vid.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            // AbortError is expected when pause() interrupts an in-flight play()
            // NotAllowedError is expected when browser blocks autoplay
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
              console.warn('Video playback warning:', err);
            }
            setIsPlaying(false);
          })
          .finally(() => {
            playPromiseRef.current = null;
          });
      } else {
        setIsPlaying(true);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.warn('Video play exception:', err);
      }
      setIsPlaying(false);
    }
  };

  const safePause = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        })
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
    } else {
      try {
        vid.pause();
      } catch (_) {}
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (asGif && videoRef.current) {
      safePlay();
    }
    return () => {
      safePause();
    };
  }, [asGif]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const togglePlay = (e) => {
    e?.stopPropagation?.();
    if (!videoRef.current) return;
    if (isPlaying) {
      safePause();
    } else {
      safePlay();
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation?.();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restartVideo = (e) => {
    e?.stopPropagation?.();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    safePlay();
  };

  const openFullscreen = (e) => {
    e?.stopPropagation?.();
    safePause();
    setIsExpanded(true);
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
    const container = containerRef.current || videoRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (videoRef.current?.webkitEnterFullscreen) {
      videoRef.current.webkitEnterFullscreen();
    }
  };

  // GIF Mode: Continuous looping animated preview with responsive sizing and full-screen theater mode
  if (hasVideoUrl && asGif) {
    return (
      <div className={`w-full ${className}`}>
        <div
          ref={containerRef}
          onClick={() => setIsExpanded(true)}
          className="relative w-full rounded-2xl overflow-hidden border border-white/15 bg-[#090A10] shadow-2xl group select-none cursor-pointer aspect-[1548/686] flex items-center justify-center"
        >
          <video
            ref={videoRef}
            src={videoData.url}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-contain block rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]"
          />

          {/* Hover overlay with Expand badge */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="px-3 py-1.5 rounded-xl bg-black/80 text-xs text-white flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-xl">
              <Maximize2 className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
              <span className="font-medium">Click for Full Screen Preview</span>
            </span>
          </div>

          {/* Top-Right Quick Expand Button */}
          <div className="absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 transition-all text-xs font-medium shadow-lg hover:border-violet-400/60 cursor-pointer"
              aria-label="Expand to Fullscreen"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-violet-300" />
              <span className="text-[11px] font-medium hidden sm:inline">Full Screen</span>
            </button>
          </div>
        </div>

        {videoData.caption && (
          <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
            <span>{videoData.caption}</span>
          </p>
        )}

        {/* EXPANDED FULLSCREEN THEATER LIGHTBOX MODAL FOR GIF */}
        {isExpanded && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
          >
            {/* Top Bar with Title & Close button */}
            <div
              className="w-full max-w-7xl flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-white z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Full Screen Preview
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-md sm:max-w-xl">
                  {videoData.title || 'Workflow Orchestration Walkthrough'}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 hidden sm:inline">Press ESC to close</span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 border border-white/15 text-xs font-medium cursor-pointer"
                  aria-label="Close expanded video"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Expanded Video Container */}
            <div
              className="relative w-full max-w-7xl max-h-[85vh] h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-full max-h-[80vh] relative rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl flex items-center justify-center">
                <video
                  src={videoData.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              </div>

              {videoData.caption && (
                <p className="mt-3 text-xs sm:text-sm text-zinc-400 text-center max-w-3xl">
                  {videoData.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If a real video URL is provided, render active player
  if (hasVideoUrl) {
    const effectiveUrl = videoData.url || url;
    const effectiveFallback = videoData.fallbackUrl || fallbackUrl;

    return (
      <div className={`space-y-2.5 ${className}`}>
        <div
          ref={containerRef}
          onClick={togglePlay}
          className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/95 shadow-2xl aspect-[16/9] group cursor-pointer select-none"
        >
          <video
            ref={videoRef}
            src={effectiveUrl}
            poster={videoData.poster}
            muted={isMuted}
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain bg-black"
          >
            {effectiveUrl && (
              <source
                src={effectiveUrl}
                type={effectiveUrl.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}
              />
            )}
            {effectiveFallback && (
              <source
                src={effectiveFallback}
                type={effectiveFallback.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}
              />
            )}
            Your browser does not support HTML5 video playback.
          </video>

          {/* Overlay Gradient (only visible on hover or when paused) */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          />

          {/* Center Play Button Overlay when paused */}
          {!isPlaying && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#814AC8]/90 hover:bg-[#9255dd] text-white flex items-center justify-center shadow-xl shadow-purple-950/60 transition-transform hover:scale-110 active:scale-95 z-10"
              aria-label="Play tutorial video"
            >
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </button>
          )}

          {/* Top Title & Full Screen Button Overlay */}
          <div
            className={`absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between text-xs text-white/90 pointer-events-none transition-opacity duration-300 z-20 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 font-semibold text-[11px] text-violet-300">
                Tutorial
              </span>
              <span className="font-medium drop-shadow truncate max-w-[200px] sm:max-w-xs">
                {videoData.title || 'Video Walkthrough'}
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {videoData.duration && (
                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-zinc-300">
                  {videoData.duration}
                </span>
              )}
              {/* Top-right Quick Full Screen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openFullscreen(e);
                }}
                className="px-2.5 py-1 rounded-xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 hover:border-violet-400 text-white flex items-center gap-1.5 transition-all text-xs font-semibold shadow-xl cursor-pointer"
                title="Expand to Full Screen"
                aria-label="Expand to Full Screen"
              >
                <Maximize2 className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-[11px] font-medium hidden sm:inline">Full Screen</span>
              </button>
            </div>
          </div>

          {/* Bottom Custom Controls Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>
              <button
                onClick={restartVideo}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white cursor-pointer"
                aria-label="Restart video"
                title="Restart video"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                title={isMuted ? 'Unmute sound' : 'Mute sound'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] text-zinc-400 hidden sm:inline">Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium hidden sm:inline">Sound On</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-mono hidden sm:inline">
                HD 1080p
              </span>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white cursor-pointer"
                aria-label="Native Fullscreen"
                title="Native Fullscreen"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={openFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-violet-300 hover:text-white cursor-pointer"
                title="Expand to Fullscreen Theater Modal"
                aria-label="Expand to Fullscreen Theater Modal"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="text-[11px] font-mono">Full Screen</span>
              </button>
            </div>
          </div>
        </div>

        {videoData.caption && (
          <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span>{videoData.caption}</span>
          </p>
        )}

        {/* EXPANDED THEATER / LIGHTBOX MODAL */}
        {isExpanded && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
          >
            {/* Top Bar with Title & Close button */}
            <div
              className="w-full max-w-6xl flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-white z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Walkthrough Video
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-md sm:max-w-xl">
                  {videoData.title || 'Official Video Walkthrough'}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 hidden sm:inline">Press ESC to close</span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 border border-white/15 text-xs font-medium"
                  aria-label="Close expanded video"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Expanded Video Container */}
            <div
              className="relative w-full max-w-6xl max-h-[80vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full relative rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl aspect-[16/9]">
                <video
                  poster={videoData.poster}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                >
                  {effectiveUrl && (
                    <source
                      src={effectiveUrl}
                      type={effectiveUrl.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}
                    />
                  )}
                  {effectiveFallback && (
                    <source
                      src={effectiveFallback}
                      type={effectiveFallback.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}
                    />
                  )}
                  Your browser does not support HTML5 video playback.
                </video>
              </div>

              {videoData.caption && (
                <p className="mt-3 text-xs sm:text-sm text-zinc-400 text-center max-w-3xl">
                  {videoData.caption}
                </p>
              )}
            </div>
          </div>
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
            <Film className="w-3 h-3 text-violet-400" aria-hidden="true" />
            <span>Video Tutorial</span>
          </span>
        </div>

        {videoData.duration && (
          <div className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-400">
            {videoData.duration}
          </div>
        )}

        {/* Center Play Indicator */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/15 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:scale-105 group-hover:border-violet-500/50 group-hover:bg-[#814AC8]/20 transition-all duration-300 shadow-xl">
            <Play className="w-6 h-6 fill-current translate-x-0.5 opacity-80" aria-hidden="true" />
          </div>
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-ping opacity-20 pointer-events-none" />
        </div>

        {/* Text Content */}
        <div className="space-y-1.5 max-w-md px-4">
          <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {videoData.title || 'Product Video Walkthrough'}
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {videoData.caption ||
              'A guided step-by-step video demonstration will appear here.'}
          </p>
        </div>

        {/* Bottom Status Indicator */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-violet-400/70" aria-hidden="true" />
          <span>Walkthrough Tutorial</span>
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
