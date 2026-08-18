'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';

/**
 * Shared message renderer for Omni Inbox and Leads CRM.
 *
 * Media detection priority:
 *   1. metadata.media_url + metadata.message_type  (structured — preferred)
 *   2. [IMAGE] / [VIDEO] / [DOCUMENT] text tags     (legacy fallback)
 *
 * Button detection priority:
 *   1. metadata.buttons array                       (structured — preferred)
 *   2. Inline [Button1] | [Button2] text format     (legacy fallback)
 */
export default function MessageRenderer({
  content,
  metadata,
  media_url,
  media_type,
  mime_type,
  isMe,
  theme,
  onPreviewMedia
}) {
  const meta = metadata || {};
  const mediaUrl = media_url || meta.media_url;
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
          <img
            src={mediaUrl}
            alt="header media"
            className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition mb-1"
            onClick={() => onPreviewMedia?.({ type: 'image', url: mediaUrl })}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
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

  if (mediaUrl && (messageType === 'image' || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(mediaUrl))) {
    return (
      <div>
        <img
          src={mediaUrl}
          alt="image"
          className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
          onClick={() => onPreviewMedia?.({ type: 'image', url: mediaUrl })}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {content && !/^\[(IMAGE|AUDIO|VOICE|VIDEO|DOCUMENT)\]$/i.test(content.trim()) && (
            <p className="text-[13px] text-white/80 mt-2 leading-relaxed whitespace-pre-wrap">
                {content}
            </p>
        )}
      </div>
    );
  }

  const isAudio =
    messageType === 'audio' ||
    messageType === 'voice' ||
    mimeType.startsWith('audio/') ||
    /\.(mp3|ogg|wav|m4a|aac|opus)(\?|$)/i.test(mediaUrl || '');

  if (mediaUrl && isAudio) {
    return (
      <div className="max-w-[320px]">
        <WhatsAppAudioMessage
          url={mediaUrl}
          isMe={isMe}
        />

        {content &&
          !/^\[(AUDIO|VOICE)\]$/i.test(content.trim()) && (
            <p className="text-[13px] text-white/80 mt-2 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          )}
      </div>
    );
  }

  if (mediaUrl && (messageType === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaUrl))) {
    return (
      <div>
        <video
          src={mediaUrl}
          controls
          className="max-w-[220px] rounded-xl"
          onClick={(e) => { e.stopPropagation(); onPreviewMedia?.({ type: 'video', url: mediaUrl }); }}
        />
        {content && (
          <p className="text-[13px] text-white/80 mt-2 leading-relaxed whitespace-pre-wrap">{content}</p>
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

  return (
    <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </p>
  );
}

//  Helpers ─

function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

function WhatsAppAudioMessage({ url, isMe }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
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

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl min-w-[260px] max-w-[320px] ${
        isMe
          ? 'bg-white/10'
          : 'bg-white/[0.06]'
      }`}
    >
      {/* Play button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white text-black hover:scale-105 transition-transform"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? (
          <span className="text-sm font-bold">Ⅱ</span>
        ) : (
          <span className="text-sm font-bold ml-0.5">▶</span>
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[3px] h-8">
          {Array.from({ length: 32 }).map((_, index) => {
            const barProgress = (index / 31) * 100;
            const active = barProgress <= progress;

            const heights = [
              8, 14, 20, 11, 17, 24, 13, 19,
              27, 15, 22, 12, 25, 18, 28, 14,
              21, 10, 26, 17, 23, 13, 20, 28,
              15, 24, 11, 19, 26, 14, 21, 17
            ];

            return (
              <span
                key={index}
                className={`w-[3px] rounded-full transition-all ${
                  active
                    ? 'bg-emerald-400'
                    : 'bg-white/30'
                }`}
                style={{
                  height: `${heights[index]}px`
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-white/60">
            {formatTime(currentTime)}
          </span>

          <span className="text-[10px] text-white/60">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Hidden native audio */}
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
