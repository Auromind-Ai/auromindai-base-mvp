'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, FastForward, Film } from 'lucide-react';

export default function DocsVideoPlayer({ video }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onLoadedMetadata = () => setDuration(v.duration);
    const onEnded = () => setIsPlaying(false);

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const time = parseFloat(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  };

  const changeSpeed = (rate) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const handleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) {
      v.requestFullscreen();
    } else if (v.webkitRequestFullscreen) {
      v.webkitRequestFullscreen();
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="my-8 rounded-2xl border border-violet-500/25 bg-[#090A10] overflow-hidden shadow-2xl shadow-violet-950/20 group">
      {/* Video Title Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#814AC8]/20 border border-[#814AC8]/40 flex items-center justify-center">
            <Film className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">{video.title}</h4>
            <span className="text-[11px] text-zinc-400">Duration: {video.duration || 'Video Walkthrough'}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
          Official Walkthrough
        </span>
      </div>

      {/* Video Container */}
      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />

        {/* Big Play Overlay (when paused) */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute w-16 h-16 rounded-full bg-[#814AC8]/90 hover:bg-[#814AC8] text-white flex items-center justify-center shadow-xl shadow-black/60 transition-all hover:scale-105 border border-white/20"
            aria-label="Play video"
          >
            <Play className="w-7 h-7 ml-1 fill-white" />
          </button>
        )}
      </div>

      {/* Controls Bar */}
      <div className="px-4 py-3 bg-[#0c0d14] border-t border-white/10 flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#814AC8]"
          />
          <span className="text-xs text-zinc-400 font-mono w-10">{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-200 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-200 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded text-xs font-mono font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-[#161722] border border-white/15 rounded-lg shadow-xl py-1 z-30 flex flex-col min-w-[70px]">
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => changeSpeed(r)}
                      className={`px-3 py-1 text-xs text-left hover:bg-white/10 font-mono ${
                        playbackRate === r ? 'text-[#814AC8] font-bold' : 'text-zinc-300'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-200 hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Caption footer */}
      {video.caption && (
        <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/5 text-xs text-zinc-400 italic">
          💡 <strong className="text-zinc-300 not-italic">Video Walkthrough:</strong> {video.caption}
        </div>
      )}
    </div>
  );
}
