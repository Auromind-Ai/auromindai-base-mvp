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
export default function MessageRenderer({ content, metadata, isMe, theme, onPreviewMedia }) {
  const meta = metadata || {};
  const mediaUrl = meta.media_url;
  const messageType = meta.message_type;
  const buttons = meta.buttons;

  // Nothing to render
  if (!content && !mediaUrl) return null;

  // ── 1. Structured media from metadata ────────────────────────────

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
        {content && (
          <p className="text-[13px] text-white/80 mt-2 leading-relaxed whitespace-pre-wrap">{content}</p>
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

  if (mediaUrl && (messageType === 'document' || messageType === 'audio' || (!messageType && mediaUrl))) {
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

  // ── 2. Text-based media tag detection (legacy fallback) ──────────

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

  // ── 3. Structured button templates from metadata ─────────────────

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

  // ── 4. Text-based button template detection (legacy fallback) ────

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

  // ── 5. Default: Plain text ──────────────────────────────────────

  return (
    <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </p>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function isUrl(str) {
  return /^https?:\/\//i.test(str);
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
