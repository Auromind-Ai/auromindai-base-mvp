'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Sliders, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import DocsStepItem from './DocsStepItem';
import DocumentationScreenshot from './DocumentationScreenshot';
import DocumentationVideo from './DocumentationVideo';
import DocsAlert from './DocsAlert';

export default function DynamicSectionRenderer({ sections = [] }) {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-16">
      {sections.map((section, idx) => {
        if (!section || !section.id) return null;

        const sectionId = section.id;
        const sectionTitle = section.title;
        const sectionType = section.type || 'text';
        const hasMedia = Boolean(section.screenshot || section.video);
        const mediaPosition = section.mediaPosition || (idx % 2 === 1 ? 'left' : 'right');

        // Content renderer helper
        const renderContent = () => (
          <div className="space-y-4">
            {sectionTitle && (
              <div className="border-b border-white/10 pb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true" />
                  <span>{sectionTitle}</span>
                </h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {section.content && (
              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-3 font-normal">
                {Array.isArray(section.content) ? (
                  section.content.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))
                ) : (
                  <p>{section.content}</p>
                )}
              </div>
            )}

            {sectionType === 'list' && section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 font-mono text-xs">
                      {itemIdx + 1}
                    </div>
                    <div>
                      {typeof item === 'string' ? (
                        <span className="text-xs sm:text-sm text-zinc-200">{item}</span>
                      ) : (
                        <>
                          <strong className="text-xs sm:text-sm font-semibold text-white block">
                            {item.title}
                          </strong>
                          <span className="text-xs text-zinc-400 leading-relaxed block mt-0.5">
                            {item.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(sectionType === 'checklist' || sectionType === 'prerequisites') && section.items && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-2.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  {section.checklistTitle || 'Requirements & Prerequisites:'}
                </span>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'callout' && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4.5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
                  <span className="font-semibold block text-emerald-300 mb-1">
                    {section.calloutTitle || 'Verified Expected Outcome:'}
                  </span>
                  {section.calloutText || section.content}
                </div>
              </div>
            )}
          </div>
        );

        // Media renderer helper
        const renderMedia = () => (
          <div className="space-y-3">
            {section.screenshot && (
              <DocumentationScreenshot
                src={section.screenshot.src}
                alt={section.screenshot.alt || `${sectionTitle} preview`}
                caption={section.screenshot.caption}
                annotation={section.screenshot.annotation}
              />
            )}
            {section.video && (
              <DocumentationVideo
                video={section.video}
                title={section.video.title || sectionTitle}
                duration={section.video.duration}
                caption={section.video.caption}
              />
            )}
          </div>
        );

        // If this section has media, use the alternating 2-column zig-zag grid!
        if (hasMedia) {
          return (
            <section key={sectionId || idx} id={sectionId} className="scroll-mt-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className={`lg:col-span-6 ${mediaPosition === 'left' ? 'order-1 lg:order-2' : 'order-1'}`}>
                  {renderContent()}
                </div>
                <div className={`lg:col-span-6 ${mediaPosition === 'left' ? 'order-2 lg:order-1' : 'order-2'}`}>
                  {renderMedia()}
                </div>
              </div>
            </section>
          );
        }

        // Full width for non-media sections (tables, steps, diagnostics, etc.)
        return (
          <section key={sectionId || idx} id={sectionId} className="space-y-4 scroll-mt-24">
            {sectionTitle && (
              <div className="border-b border-white/10 pb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true" />
                  <span>{sectionTitle}</span>
                </h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {section.content && (
              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-3 font-normal">
                {Array.isArray(section.content) ? (
                  section.content.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))
                ) : (
                  <p>{section.content}</p>
                )}
              </div>
            )}

            {sectionType === 'list' && section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 font-mono text-xs">
                      {itemIdx + 1}
                    </div>
                    <div>
                      {typeof item === 'string' ? (
                        <span className="text-xs sm:text-sm text-zinc-200">{item}</span>
                      ) : (
                        <>
                          <strong className="text-xs sm:text-sm font-semibold text-white block">
                            {item.title}
                          </strong>
                          <span className="text-xs text-zinc-400 leading-relaxed block mt-0.5">
                            {item.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(sectionType === 'checklist' || sectionType === 'prerequisites') && section.items && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-2.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  {section.checklistTitle || 'Requirements & Prerequisites:'}
                </span>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'steps' && section.steps && (
              <div className="space-y-4 pt-2">
                {section.steps.map((step) => (
                  <DocsStepItem
                    key={step.step}
                    step={step}
                    totalSteps={section.steps.length}
                  />
                ))}
              </div>
            )}

            {sectionType === 'table' && section.headers && section.rows && (
              <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.01]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-white/[0.04] border-b border-white/10 text-zinc-300 font-semibold">
                    <tr>
                      {section.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-400">
                    {section.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 font-sans">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sectionType === 'callout' && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4.5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
                  <span className="font-semibold block text-emerald-300 mb-1">
                    {section.calloutTitle || 'Verified Expected Outcome:'}
                  </span>
                  {section.calloutText || section.content}
                </div>
              </div>
            )}

            {(sectionType === 'troubleshooting' || sectionType === 'diagnostics') && section.items && (
              <div className="space-y-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5"
                  >
                    <div className="flex items-start gap-2 text-amber-300 font-semibold text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
                      <span>{item.issue || item.problem}</span>
                    </div>
                    {item.cause && (
                      <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
                        <strong className="text-zinc-300 font-medium">Root Cause: </strong>
                        {item.cause}
                      </p>
                    )}
                    <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                      <strong className="text-emerald-400 font-medium">Resolution: </strong>
                      {item.solution || item.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'faq' && section.items && (
              <div className="space-y-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-4 rounded-xl border border-white/10 bg-slate-900/40 space-y-2"
                  >
                    <div className="flex items-start gap-2 text-white font-semibold text-xs sm:text-sm">
                      <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-violet-400" aria-hidden="true" />
                      <span>{item.question}</span>
                    </div>
                    <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'tips' && section.items && (
              <div className="space-y-2 pt-1">
                {section.items.map((tip, tipIdx) => (
                  <DocsAlert key={tipIdx} type="tip">
                    {tip}
                  </DocsAlert>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
