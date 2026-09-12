'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function FeatureDiscoveryCard({
  number,
  title,
  category,
  description,
  href,
  imageSrc,
  previewComponent: PreviewComponent,
  badge,
  priority = false,
  className = '',
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[#07080E]/95 p-5 sm:p-6 flex flex-col justify-between shadow-2xl shadow-black/80 group relative overflow-hidden backdrop-blur-md ${className}`}
    >
      {/* TOP: Image / Visual Showcase (NO internal border around the image) */}
      <div className="w-full relative overflow-hidden rounded-2xl mb-5">
        {imageSrc ? (
          <div className="relative w-full aspect-[16/10] overflow-hidden rounded-2xl flex items-center justify-center">
            <Image
              src={imageSrc}
              alt={title}
              width={1200}
              height={675}
              className="w-full h-auto object-contain rounded-2xl"
              priority={priority}
            />
            {/* Smooth bottom opacity gradient fade for seamless transition */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#07080E] via-[#07080E]/30 to-transparent pointer-events-none z-10" />
          </div>
        ) : (
          PreviewComponent && (
            <div className="w-full aspect-[16/10] rounded-2xl bg-[#030306]/90 p-2 sm:p-3 overflow-hidden relative flex items-center justify-center">
              <PreviewComponent />
            </div>
          )
        )}
      </div>

      {/* BOTTOM: Title, Opacity-styled Description & View Feature Documentation Link */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Optional Category & Number for preview cards without image */}
          {(number || category || badge) && !imageSrc && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {number && (
                  <span className="text-xs font-bold text-violet-300 bg-violet-500/15 px-2.5 py-0.5 rounded-lg border border-violet-500/30 shadow-sm">
                    {number}
                  </span>
                )}
                {category && (
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {category}
                  </span>
                )}
              </div>

              {badge && (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Feature Title */}
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {/* View Feature Documentation Link at bottom ONLY */}
        <div className="pt-3 mt-4 flex items-center justify-between">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-all"
          >
            <span>View feature documentation</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
          </Link>

          <span className="text-[10px] text-white/50 group-hover:text-zinc-500 transition-colors">
            Docs &bull; Blueprint
          </span>
        </div>
      </div>
    </div>
  );
}