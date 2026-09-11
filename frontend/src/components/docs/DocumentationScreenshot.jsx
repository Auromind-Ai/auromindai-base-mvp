"use client";

import { useState } from 'react';
import { Camera, Maximize2, X, Layers } from 'lucide-react';

export default function DocumentationScreenshot({
  src,
  alt = "Product screenshot",
  caption,
  stepNumber,
  annotation,
  aspectRatio = 'aspect-[16/9]',
  objectFit = 'cover',
  className = '',
  scrollPreview,
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // If a real screenshot exists, render the image directly without a box border
  if (src) {
    return (
      <figure className={`space-y-2 group ${className}`}>
        <div
          data-screenshot-label
          className="hidden items-center gap-2 px-1 text-[11px] font-semibold text-violet-300"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />
          Screenshot{" "}
          <span className="font-normal text-zinc-400">· Click to expand</span>
        </div>
        <div
          data-screenshot-frame
          style={
            scrollPreview
              ? { overflowY: "auto", overflowX: "hidden" }
              : undefined
          }
          className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#090A10] ${aspectRatio} cursor-pointer shadow-lg hover:border-violet-500/40 transition-all flex items-center justify-center`}
          onClick={() => setIsLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsLightboxOpen(true)}
          aria-label={`Expand ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={scrollPreview?.width}
            height={scrollPreview?.height}
            className={
              scrollPreview
                ? "w-full h-auto"
                : `w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-[1.01] transition-transform duration-300`
            }
          />
          {!scrollPreview && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1.5 backdrop-blur-sm border border-white/10">
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Expand Preview</span>
              </span>
            </div>
          )}

          {stepNumber && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#814AC8] text-[11px] font-bold text-white shadow-md pointer-events-none">
              Step {stepNumber}
            </div>
          )}
        </div>

        {caption && (
          <figcaption className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
            <span>{caption}</span>
          </figcaption>
        )}

        {/* Lightbox Modal */}
        {isLightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-5xl w-full max-h-[85vh] h-full flex flex-col items-center justify-center">
              <div className="relative w-full max-h-[80vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
                />
              </div>
              {caption && (
                <p className="mt-3 text-sm text-zinc-300 font-medium text-center">
                  {caption}
                </p>
              )}
            </div>
          </div>
        )}
      </figure>
    );
  }

  // Intentional, production-grade placeholder container when media is not yet available
  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#090A10]/80 ${aspectRatio} flex flex-col items-center justify-center p-6 text-center shadow-inner hover:border-violet-500/30 transition-all select-none`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(129, 74, 200, 0.04) 0%, transparent 60%)",
        }}
      >
        {/* Subtle architectural grid lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Window Chrome Header */}
        <div className="absolute top-0 inset-x-0 h-8 bg-white/[0.03] border-b border-white/10 px-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/40" />
            <span className="w-2 h-2 rounded-full bg-amber-500/40" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
            {stepNumber && (
              <span className="ml-2 text-[10px] font-mono text-zinc-400 font-semibold">
                Step {stepNumber}
              </span>
            )}
          </div>
          {annotation && (
            <span className="text-[10px] font-medium text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
              {annotation}
            </span>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-2 mt-4 shadow-md">
          <Camera className="w-4 h-4 text-violet-400/80" aria-hidden="true" />
        </div>

        <div className="space-y-1 max-w-sm px-4">
          <span className="text-xs font-semibold text-zinc-200 block">
            {alt || "Interface Preview"}
          </span>
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {caption ||
              "Console interface configuration and live state preview."}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-400">
            <Layers className="w-3 3-4 text-violet-400" aria-hidden="true" />
            <span>Product Console</span>
          </span>
        </div>
      </div>

      {caption && (
        <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
          <span>{caption}</span>
        </p>
      )}
    </div>
  );
}
