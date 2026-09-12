'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

export default function DocsHeroVideoCard({
  src = '/videos/docs.mov',
  title = 'OrbionAgents Platform Tour',
  className = '',
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      if (vid.duration) {
        setProgress((vid.currentTime / vid.duration) * 100);
        setCurrentTime(formatTime(vid.currentTime));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(formatTime(vid.duration));
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('play', handlePlay);
    vid.addEventListener('pause', handlePause);

    // Initial autoplay attempt (muted allows autoplay in modern browsers)
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('play', handlePlay);
      vid.removeEventListener('pause', handlePause);
    };
  }, [src]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play().catch(console.warn);
    } else {
      vid.pause();
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    e?.stopPropagation();
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekPercent = Math.max(0, Math.min(1, clickX / rect.width));
    vid.currentTime = seekPercent * vid.duration;
  };

  const handleFullscreen = (e) => {
    e?.stopPropagation();
    const container = containerRef.current || videoRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(console.warn);
    } else if (container.requestFullscreen) {
      container.requestFullscreen().catch(console.warn);
    } else if (videoRef.current?.webkitEnterFullscreen) {
      videoRef.current.webkitEnterFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-[75%] mx-auto relative rounded-2xl border border-white/15 bg-[#0c1224] shadow-2xl shadow-black/80 overflow-hidden group select-none transition-all ${className}`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden flex items-center justify-center bg-black/40">

        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          autoPlay
          loop
          preload="auto"
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        >
          <source src={src} type="video/mp4" />
          <source src={src} type="video/quicktime" />
          Your browser does not support the video tag.
        </video>

        {/* Ambient video edge vignette */}
        <div
          onClick={togglePlay}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"
        />

        {/* Top Header Badge Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-300 font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Documentation Tour</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-violet-400" />
              )}
            </button>

            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Fullscreen"
              aria-label="Expand to fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Play Button Overlay (visible when paused) */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#814AC8] to-[#9d4edd] text-white flex items-center justify-center shadow-2xl shadow-purple-950 border border-white/20 transition-transform duration-300 hover:scale-110">
              <Play className="w-6 h-6 sm:w-7 h-7 fill-white translate-x-0.5 text-white" />
            </div>
          </div>
        )}

        {/* Bottom Floating Scrubber & Controls */}
        <div
          className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-opacity duration-300 z-20 flex flex-col gap-2 ${
            isHovered || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Bar */}
          <div
            onClick={handleSeek}
            className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
          >
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 hover:text-white transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="p-1 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-violet-400" />
                )}
              </button>

              <span className="text-[11px] text-zinc-400">
                {currentTime} / {duration}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              className="p-1 hover:text-white transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
