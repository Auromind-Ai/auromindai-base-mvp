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
  className = '',
}) {
  return (
    <div
      className={`rounded-3xl border border-white/15 bg-[#07080E]/95 hover:bg-[#090B14] hover:border-emerald-500/40 p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 group shadow-2xl shadow-black/80 hover:shadow-emerald-950/20 hover:-translate-y-1 relative overflow-hidden backdrop-blur-md ${className}`}
    >
      {/* Ambient hover top gradient line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/60 to-transparent transition-all duration-500" />

      {/* TOP: Image / Visual Showcase (NO internal border around the image) */}
      <div className="w-full relative overflow-hidden rounded-2xl mb-5">
        {imageSrc ? (
          <div className="relative w-full overflow-hidden rounded-2xl flex items-center justify-center">
            <Image
              src={imageSrc}
              alt={title}
              width={1200}
              height={675}
              className="w-full h-auto object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.015]"
              priority
            />
            {/* Smooth bottom opacity gradient fade for seamless transition */}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#07080E] via-[#07080E]/30 to-transparent pointer-events-none" />
          </div>
        ) : (
          PreviewComponent && (
            <div className="w-full rounded-2xl bg-[#030306]/90 p-2 sm:p-3 overflow-hidden relative">
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
                  <span className="font-mono text-xs font-bold text-violet-300 bg-violet-500/15 px-2.5 py-0.5 rounded-lg border border-violet-500/30 shadow-sm">
                    {number}
                  </span>
                )}
                {category && (
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {category}
                  </span>
                )}
              </div>

              {badge && (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 shadow-sm font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Feature Title */}
          <h3 className="text-xl sm:text-2xl font-medium text-white group-hover:text-emerald-200 transition-colors tracking-tight">
            {title}
          </h3>

          {/* Description with Opacity styling for high readability */}
          <p className="text-sm sm:text-base text-zinc-300/80 group-hover:text-zinc-200/90 transition-colors mt-3 leading-relaxed font-[10px]">
            {description}
          </p>
        </div>

        {/* View Feature Documentation Link at bottom ONLY */}
        <div className="pt-4 mt-5 flex items-center justify-between">
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-all group/btn"
          >
            <span>View feature documentation</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
          </Link>

          <span className="text-[10px] text-white/60 group-hover:text-zinc-400 transition-colors">
            Docs &bull; Blueprint
          </span>
        </div>
      </div>
    </div>
  );
}
