'use client';

import React from 'react';
import { FileText, Download, Info, PhoneMissed, Play, Pause, Mic, User, Video, CheckCheck } from 'lucide-react';


const FAILED_MEDIA_URLS = new Set();

export default function MessageRenderer({
  content,
  metadata,
  media_url,
  media_type,
  mime_type,
  isMe,
  theme,
  onPreviewMedia,
  timeNode
}) {
  const meta = metadata || {};
  const mediaUrl = media_url || meta.media_url;
  const isExpired = Boolean(meta.media_expired || meta.expired);
  const [hasError, setHasError] = React.useState(() => {
    if (isExpired) return true;
    return mediaUrl ? FAILED_MEDIA_URLS.has(mediaUrl) : false;
  });

  React.useEffect(() => {
    if (isExpired || (mediaUrl && FAILED_MEDIA_URLS.has(mediaUrl))) {
      setHasError(true);
    }
  }, [mediaUrl, isExpired]);

  const handleMediaError = () => {
    if (mediaUrl) FAILED_MEDIA_URLS.add(mediaUrl);
    setHasError(true);
  };

  const messageType = (
    media_type ||
    meta.media_type ||
    meta.message_type ||
    ''
  ).toLowerCase();

  const mimeType = (
      mime_type ||
      meta.mime_type ||
      ''
  ).toLowerCase();
  const buttons = meta.buttons;
  const templateHeader = meta.template_header;
  const templateFooter = meta.template_footer;

  // Nothing to render
  if (!content && !mediaUrl) return null;

  //  0. Business Promotional Message / Unsupported format card ─
  const isUnsupportedMsg =
    meta.is_unsupported ||
    messageType === 'unsupported' ||
    (typeof content === 'string' && (
      content.includes('Business Promotional Message') ||
      content.includes('[Unsupported Message')
    ));

  if (isUnsupportedMsg) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#814AC8]/10 border border-[#814AC8]/25 text-white/90 max-w-[320px] select-none my-1 shadow-sm">
        <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Info size={12} className="text-[#a77bee]" />
        </div>
        <div className="flex flex-col gap-0.5 text-left">
          <span className="text-[12px] font-semibold text-white/90">
            Business Promotional Message
          </span>
          <span className="text-[11px] text-white/60 leading-relaxed">
            Incoming interactive template from another account cannot be displayed on WhatsApp API.
          </span>
        </div>
      </div>
    );
  }

  //  Template layout rendering (header, body, footer, buttons) ─
  if (templateHeader || templateFooter || (buttons && Array.isArray(buttons) && buttons.length > 0)) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        {/* Header */}
        {templateHeader && (
          <div className="text-[12px] font-bold text-white/60 mb-0.5 uppercase tracking-wide">
            {templateHeader}
          </div>
        )}

        {/* Media (if image/video attached to template) */}
        {mediaUrl && (messageType === 'image' || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(mediaUrl)) && (
          !hasError ? (
            <img
              src={mediaUrl}
              alt="header media"
              className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition mb-1"
              onClick={() => onPreviewMedia?.({ type: 'image', url: mediaUrl })}
              onError={handleMediaError}
            />
          ) : (
            <div className="text-[11px] text-zinc-400 italic bg-white/5 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 mb-1">
              📷 Media expired
            </div>
          )
        )}
        {mediaUrl && (messageType === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaUrl)) && (
          <video
            src={mediaUrl}
            controls
            className="max-w-[220px] rounded-xl mb-1"
            onClick={(e) => { e.stopPropagation(); onPreviewMedia?.({ type: 'video', url: mediaUrl }); }}
          />
        )}

    
        {/* Body content */}
        {content && !/^\[(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)\]$/i.test(content.trim()) && (
            <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words">
                {content}
            </p>
        )}

        {/* Footer */}
        {templateFooter && (
          <div className="text-[11px] text-white/50 italic mt-0.5">
            {templateFooter}
          </div>
        )}

        {/* Buttons */}
        {buttons && Array.isArray(buttons) && buttons.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
            {buttons.slice(0, 3).map((btn, i) => {
              const label = typeof btn === 'string' ? btn : (btn.label || btn.title || btn.text || `Option ${i + 1}`);
              const url = typeof btn === 'object' && btn ? btn.url : null;
              if (url) {
                const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium block hover:bg-white/10 transition"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    {label}
                  </a>
                );
              }
              return (
                <button
                  key={i}
                  className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium hover:bg-white/10 transition"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  //  1. Structured media from metadata ─

  if (mediaUrl && (messageType === 'image' || /\.(jpe?g|png|gif|webp|svg|heic)(\?|$)/i.test(mediaUrl))) {
    const hasCaption = Boolean(content && !/^\[(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)\]$/i.test(content.trim()));

    return (
      <div className="relative group overflow-hidden max-w-[340px] sm:max-w-[380px]">
        {!hasError ? (
          <div className="relative overflow-hidden rounded-[6px]">
            <img
              src={mediaUrl}
              alt="image"
              className="w-full max-h-[380px] object-cover cursor-pointer hover:brightness-95 transition-all block rounded-[6px]"
              onClick={() => onPreviewMedia?.({ type: 'image', url: mediaUrl })}
              onError={handleMediaError}
              loading="lazy"
            />
            {!hasCaption && (
              <>
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 via-black/25 to-transparent pointer-events-none rounded-b-[6px]" />
                <div className="absolute bottom-1.5 right-2 z-10 pointer-events-none">
                  {timeNode}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 italic bg-white/5 px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
            📷 Media expired on WhatsApp
          </div>
        )}
        {hasCaption && (
          <div className="pt-2 px-1 pb-0.5 text-[13.5px] text-[#e9edef] leading-relaxed break-words">
            <p className="whitespace-pre-wrap">{content}</p>
            <div className="mt-1 flex justify-end">
              {timeNode}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isAudio =
    messageType === 'audio' ||
    messageType === 'voice' ||
    mimeType.startsWith('audio/') ||
    /\.(mp3|ogg|wav|m4a|aac|opus|webm)(\?|$)/i.test(mediaUrl || '');

  if (mediaUrl && isAudio) {
    return (
      <div className="w-full min-w-[270px] sm:min-w-[320px] max-w-[360px]">
        <WhatsAppAudioMessage
          url={mediaUrl}
          isMe={isMe}
          timeNode={timeNode}
        />
        {content && !/^\[(AUDIO|VOICE)\]$/i.test(content.trim()) && (
          <p className="text-[13px] text-white/80 mt-1.5 px-1 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        )}
      </div>
    );
  }

  if (mediaUrl && (messageType === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaUrl))) {
    const hasCaption = Boolean(content && !/^\[(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)\]$/i.test(content.trim()));

    return (
      <div className="relative group overflow-hidden max-w-[340px] sm:max-w-[380px]">
        {!hasError ? (
          <div className="relative overflow-hidden rounded-[6px] bg-black/40">
            <video
              src={mediaUrl}
              controls
              className="w-full max-h-[380px] rounded-[6px] object-cover block"
              onError={handleMediaError}
            />
            {!hasCaption && (
              <div className="absolute bottom-1.5 right-2 z-10 pointer-events-none">
                {timeNode}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 italic bg-white/5 px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
            🎥 Video expired on WhatsApp
          </div>
        )}
        {hasCaption && (
          <div className="pt-2 px-1 pb-0.5 text-[13.5px] text-[#e9edef] leading-relaxed break-words">
            <p className="whitespace-pre-wrap">{content}</p>
            <div className="mt-1 flex justify-end">
              {timeNode}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mediaUrl && (messageType === 'document' || (!messageType && mediaUrl))) {
    const fileName = meta.file_name || meta.filename || extractFileName(mediaUrl);
    const fileSize = meta.file_size || '';
    return (
      <div>
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl mb-2 hover:opacity-90 transition"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <FileText size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-white block truncate">{fileName}</span>
            {fileSize && <span className="text-[11px] text-white/50">{fileSize}</span>}
          </div>
          <Download size={14} className="text-white/40 shrink-0" />
        </a>
        {content && (
          <p className="text-[12px] text-white/80 whitespace-pre-wrap">{content}</p>
        )}
      </div>
    );
  }

  //  2. Text-based media tag detection (legacy fallback) 

  if (content) {
    const trimmed = content.trim();

    // [IMAGE] url  OR  [IMAGE]: url  OR  [IMAGE]\nurl
    const imageMatch = trimmed.match(/^\[IMAGE\]\s*:?\s*(.+)/s);
    if (imageMatch) {
      const url = imageMatch[1].trim();
      if (isUrl(url)) {
        return (
          <img
            src={url}
            alt="image"
            className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
            onClick={() => onPreviewMedia?.({ type: 'image', url })}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        );
      }
    }

    // [VIDEO] url
    const videoMatch = trimmed.match(/^\[VIDEO\]\s*:?\s*(.+)/s);
    if (videoMatch) {
      const url = videoMatch[1].trim();
      if (isUrl(url)) {
        return (
          <video
            src={url}
            controls
            className="max-w-[220px] rounded-xl"
            onClick={(e) => { e.stopPropagation(); onPreviewMedia?.({ type: 'video', url }); }}
          />
        );
      }
    }

    // [DOCUMENT] url
    const docMatch = trimmed.match(/^\[DOCUMENT\]\s*:?\s*(.+)/s);
    if (docMatch) {
      const url = docMatch[1].trim();
      if (isUrl(url)) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:opacity-90 transition"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <FileText size={18} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-white block truncate">{extractFileName(url)}</span>
            </div>
            <Download size={14} className="text-white/40 shrink-0" />
          </a>
        );
      }
    }
  }

  //  3. Structured button templates from metadata 

  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    const skipText = meta.type === 'interactive' || !!meta.buttons;
    return (
      <>
        {content && !skipText && (
          <p className="text-[13px] text-white leading-relaxed mb-3 whitespace-pre-wrap">{content}</p>
        )}
        <div className="flex flex-col gap-2">
          {buttons.slice(0, 3).map((btn, i) => {
            const label = typeof btn === 'string' ? btn : (btn.label || btn.title || btn.text || `Option ${i + 1}`);
            const url = typeof btn === 'object' && btn ? btn.url : null;
            if (url) {
              const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium block hover:bg-white/10 transition"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {label}
                </a>
              );
            }
            return (
              <button
                key={i}
                className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium hover:bg-white/10 transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  //  4. Text-based button template detection (legacy fallback) 

  if (content && content.includes('\n') && content.includes('[') && content.includes(']')) {
    const lines = content.split('\n');
    const bodyText = lines[0];
    const rest = lines.slice(1).join('');

    // Only parse as buttons if the rest contains [Label] | [Label] pattern
    if (/\[.+?\]/.test(rest) && rest.includes('|')) {
      return (
        <>
          {bodyText && (
            <p className="text-[13px] text-white leading-relaxed mb-3">{bodyText}</p>
          )}
          <div className="flex flex-col gap-2">
            {rest.split('|').map((btn, i) => {
              const label = btn.replace(/\[|\]/g, '').trim();
              if (!label) return null;
              return (
                <button
                  key={i}
                  className="w-full text-center py-2 px-4 rounded-xl text-[13px] font-medium"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      );
    }
  }

  //  5. Default: Plain text 

  const isMediaPlaceholder =
    /^\[(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)\]$/i.test(
      (content || '').trim()
    );

  if (isMediaPlaceholder) {
    return null;
  }

  // 6. Missed Voice Call card (Matching WhatsApp dark UI)
  if (typeof content === 'string' && /missed\s*(voice\s*)?call/i.test(content)) {
    return (
      <div className="flex items-center gap-3 py-1 pr-1 select-none min-w-[220px]">
        <div className="w-10 h-10 rounded-full bg-[#f15c6d]/15 flex items-center justify-center shrink-0 text-[#f15c6d]">
          <PhoneMissed size={20} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[14px] font-semibold text-[#e9edef] leading-snug">Missed voice call</span>
          <span className="text-[12px] text-[#8696a0] leading-tight">Click to call back</span>
        </div>
        {timeNode && (
          <div className="self-end pb-0.5 ml-2 shrink-0">
            {timeNode}
          </div>
        )}
      </div>
    );
  }

  // Helper to autolink URLs with even, inherited color matching WhatsApp text
  const renderFormattedText = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-inherit underline decoration-white/40 hover:opacity-85 break-all cursor-pointer font-normal"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="text-[14.2px] text-inherit leading-[1.42] whitespace-pre-wrap break-words font-normal">
      {renderFormattedText(content)}
      {timeNode}
    </div>
  );
}

//  Helpers ─

function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

function WhatsAppAudioMessage({ url, isMe, timeNode }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const toggleSpeed = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:15';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const waveformBars = [
    5, 7, 10, 16, 20, 24, 18, 12, 7, 9, 14, 20, 26, 22, 16, 10,
    7, 11, 18, 24, 20, 14, 9, 7, 11, 17, 22, 18, 12, 7, 5, 9, 15, 11
  ];

  const progress = duration > 0 ? (currentTime / duration) : 0;
  const activeBarIndex = Math.min(Math.floor(progress * waveformBars.length), waveformBars.length - 1);

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newProgress * duration;
      setCurrentTime(newProgress * duration);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[270px] sm:min-w-[320px] max-w-[360px] select-none font-sans">
      {/* WhatsApp Avatar with Microphone Badge */}
      <div className="relative shrink-0 w-11 h-11 rounded-full bg-[#667781] flex items-center justify-center shadow-sm">
        <User size={22} className="text-[#cfd4d7]" fill="currentColor" />
        <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#00a884] flex items-center justify-center shadow">
          <Mic size={10} className="text-white" strokeWidth={2.5} />
        </span>
      </div>

      {/* Waveform and Play/Time Controls */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2.5">
          {/* WhatsApp Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 active:scale-95 transition-all text-[#8696a0] hover:text-white"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-0.5" />
            )}
          </button>

          {/* Interactive Scrubbable Waveform */}
          <div
            onClick={handleSeek}
            className="flex-1 flex items-center gap-[2.5px] h-7 cursor-pointer relative py-1"
            title="Seek audio"
          >
            {waveformBars.map((height, i) => {
              const isPlayed = i <= activeBarIndex && (isPlaying || currentTime > 0);
              return (
                <div key={i} className="flex items-center justify-center relative flex-1">
                  <span
                    className={`w-[2.5px] rounded-full transition-colors duration-100 ${
                      isPlayed
                        ? 'bg-[#53bdeb]'
                        : isMe
                          ? 'bg-white/40'
                          : 'bg-[#8696a0]'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                  {i === activeBarIndex && (isPlaying || currentTime > 0) && (
                    <span className="absolute w-3 h-3 rounded-full bg-[#53bdeb] shadow-sm pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* WhatsApp Playback Speed Button (1x, 1.5x, 2x) */}
          <button
            type="button"
            onClick={toggleSpeed}
            className="px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/15 text-[10.5px] font-semibold text-white/90 shrink-0 transition-colors"
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Bottom Time and Status Row */}
        <div className="flex items-center justify-between text-[11px] text-[#8696a0] mt-0.5 pl-9 pr-0.5">
          <span className="font-medium text-[#8696a0] text-[11.5px]">
            {formatTime(isPlaying ? currentTime : (duration || 15))}
          </span>
          <div className="flex items-center gap-1">
            {timeNode}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}

function extractFileName(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop();
    return name && name.length > 0 ? decodeURIComponent(name) : 'Document';
  } catch {
    return 'Document';
  }
}
