'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Camera, Maximize2, X, Layers } from 'lucide-react';

export default function DocumentationScreenshot({
  src,
  alt = 'Product screenshot',
  caption,
  stepNumber,
  annotation,
  aspectRatio = 'aspect-[16/9]',
  className = '',
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // If a real screenshot exists, render the image container with optional lightbox
  if (src) {
    return (
      <figure className={`space-y-2 group ${className}`}>
        <div
          className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#090A10] ${aspectRatio} cursor-pointer shadow-lg hover:border-violet-500/40 transition-all`}
          onClick={() => setIsLightboxOpen(true)}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
            className="object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="px-2.5 py-1 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1.5 backdrop-blur-sm border border-white/10">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand</span>
            </span>
          </div>

          {stepNumber && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#814AC8] text-[11px] font-bold text-white shadow-md">
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
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-contain"
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
            'radial-gradient(circle at 50% 50%, rgba(129, 74, 200, 0.04) 0%, transparent 60%)',
        }}
      >
        {/* Subtle architectural grid lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Step Badge */}
        {stepNumber && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300">
            Step {stepNumber} Visual Slot
          </div>
        )}

        {annotation && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-medium text-violet-300">
            {annotation}
          </div>
        )}

        <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3 shadow-md">
          <Camera className="w-5 h-5 text-violet-400/80" />
        </div>

        <div className="space-y-1 max-w-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
            Interface Preview Slot
          </span>
          <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
            {caption || 'Product screen recording & interface capture will appear here.'}
          </p>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-400">
            <Layers className="w-3 h-3 text-violet-400" />
            <span>High-DPI Slot Ready</span>
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
