'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function FeatureDiscoveryCard({
  number,
  title,
  category,
  description,
  href,
  previewComponent: PreviewComponent,
  badge,
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/40 p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 group shadow-lg shadow-black/40 hover:-translate-y-1 ${className}`}
    >
      <div>
        {/* Card Header: Number & Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-bold text-violet-400/80 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
            {number}
          </span>
          {badge ? (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {badge}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {category}
            </span>
          )}
        </div>

        {/* Feature Title */}
        <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-violet-300 transition-colors">
          {title}
        </h3>

        {/* Short Description */}
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Visual Product Preview Area */}
        <div className="mt-4 mb-5">
          {PreviewComponent && <PreviewComponent />}
        </div>
      </div>

      {/* Card Action / Footer Link */}
      <div className="pt-3 border-t border-white/5">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 group-hover:text-violet-300 group-hover:translate-x-1 transition-all"
        >
          <span>Explore feature documentation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
