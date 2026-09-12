"use client";

import { useState } from "react";

import { Camera, Maximize2, X, Layers } from "lucide-react";

export default function DocumentationScreenshot({
  src,
  alt = "Product screenshot",
  caption,
  stepNumber,
  annotation,
  aspectRatio = "aspect-[16/9]",
  objectFit = "contain",
  className = "",
  frameClassName = "",
  frameless = false,
  showLabel = false,
  scrollPreview,
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);

  // If src changed from parent, reset fallbackSrc and error during render
  if (src !== lastSrc) {
    setLastSrc(src);
    setFallbackSrc(null);
    setHasError(false);
  }

  const currentSrc = fallbackSrc || src;

  const handleImageError = () => {
    if (!fallbackSrc && src) {
      if (src.includes('/images/docs/')) {
        setFallbackSrc(src.replace('/images/docs/', '/images/Docs/'));
      } else if (src.includes('/images/Docs/')) {
        setFallbackSrc(src.replace('/images/Docs/', '/images/docs/'));
      } else {
        setHasError(true);
      }
    } else {
      setHasError(true);
    }
  };

  // If a real screenshot exists, render the image directly
  // with optional scroll preview and lightbox support.
  if (currentSrc && !hasError) {
    const defaultFrameStyle = frameless
      ? "border-0 rounded-none bg-transparent shadow-none"
      : "border border-white/10 bg-[#090A10] shadow-lg hover:border-violet-500/40";

    return (
      <figure className={`space-y-2 group ${className}`}>
        {showLabel && (
          <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-violet-300">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            Screenshot{" "}
            <span className="font-normal text-zinc-400">· Click to expand</span>
          </div>
        )}
        <div
          data-screenshot-label
          className="hidden items-center gap-2 px-1 text-[11px] font-semibold text-violet-300"
        >
          <Camera
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />

          Screenshot{" "}

          <span className="font-normal text-zinc-400">
            · Click to expand
          </span>
        </div>

        <div
          data-screenshot-frame={frameless ? undefined : ''}
          style={
            scrollPreview
              ? {
                  overflowY: "auto",
                  overflowX: "hidden",
                }
              : undefined
          }
          className={`relative overflow-hidden ${defaultFrameStyle} ${frameless ? '' : 'rounded-xl'} ${frameClassName} ${aspectRatio} cursor-pointer transition-all ${
            scrollPreview
              ? ""
              : "flex items-center justify-center"
          }`}
          onClick={() => setIsLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsLightboxOpen(true);
            }
          }}
          aria-label={`Expand ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={alt}
            onError={handleImageError}
            width={scrollPreview?.width}
            height={scrollPreview?.height}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
            className={
              scrollPreview
                ? `w-full h-auto ${
                    objectFit === "contain"
                      ? "object-contain"
                      : "object-cover"
                  }`
                : `w-full h-full ${
                    objectFit === "contain"
                      ? "object-contain"
                      : "object-cover"
                  } group-hover:scale-[1.01] transition-transform duration-300`
            }
          />

          {!scrollPreview && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1.5 backdrop-blur-sm border border-white/10">
                <Maximize2
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                />

                <span>Expand Preview</span>
              </span>
            </div>
          )}

          {stepNumber && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#814AC8] text-[11px] font-semibold text-white shadow-md pointer-events-none">
              Step {stepNumber}
            </div>
          )}

          {annotation && (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-medium text-violet-300 border border-violet-500/20 backdrop-blur-sm">
              {annotation}
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

            <div
              className="relative max-w-5xl w-full max-h-[85vh] h-full flex flex-col items-center justify-center"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="relative w-full max-h-[80vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSrc}
                  alt={alt}
                  onError={handleImageError}
                  className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
                />
              </div>

              {caption && (
                <p className="mt-3 text-xs sm:text-sm text-zinc-300 font-normal text-center">
                  {caption}
                </p>
              )}
            </div>
          </div>
        )}
      </figure>
    );
  }

  // Intentional, production-grade placeholder container
  // when media is not yet available.
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
              <span className="ml-2 text-[10px] text-zinc-400 font-semibold">
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
          <Camera
            className="w-4 h-4 text-violet-400/80"
            aria-hidden="true"
          />
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px]  bg-white/5 border border-white/10 text-zinc-400">
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
