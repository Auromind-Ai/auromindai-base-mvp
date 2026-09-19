'use client';

import React, { useState } from 'react';
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
  Info,
  Database,
  Eye,
  Lightbulb,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import DocsStepItem from './DocsStepItem';
import DocumentationScreenshot from './DocumentationScreenshot';
import DocumentationVideo from './DocumentationVideo';
import DocsAlert from './DocsAlert';
import * as Previews from './FeatureUIPreviews';
import DocsDynamicTierMatrix from './DocsDynamicTierMatrix';

function DocsFaqItem({ item, isOpen, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl border bg-[#0c1224] transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xl ${
        isOpen
          ? 'border-violet-500/50 shadow-xl shadow-purple-950/20'
          : 'border-white/[0.08] hover:border-violet-500/40'
      }`}
    >
      <div className="p-4.5 sm:p-5 flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border transition-all ${isOpen ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.04] border-white/10 text-violet-400'}`}>
            <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-snug">
            {item.question}
          </h3>
        </div>
        <div className={`p-1 rounded-lg transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-300' : 'text-zinc-500'}`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.06]">
          <p className="text-xs sm:text-[13px] text-zinc-400 pl-9 leading-relaxed font-normal">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

function DocsFaqSection({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleItem = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-2.5 pt-1">
      {items.map((item, itemIdx) => (
        <DocsFaqItem
          key={itemIdx}
          item={item}
          isOpen={openIndex === itemIdx}
          onToggle={() => toggleItem(itemIdx)}
        />
      ))}
    </div>
  );
}

export default function DynamicSectionRenderer({ sections = [] }) {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-10 sm:space-y-12">
      {sections.map((section, idx) => {
        if (!section || !section.id) return null;

        const sectionId = section.id;
        const sectionTitle = section.title;
        const sectionType = section.type || 'text';
        const UIPreviewComponent = section.uiPreview ? Previews[section.uiPreview] : null;
        const hasMedia = Boolean(section.screenshot || section.video || UIPreviewComponent);
        const mediaPosition = section.mediaPosition || (idx % 2 === 1 ? 'left' : 'right');

        // Helper for 3-part structured data breakdowns
        const renderDataBreakdown = (items) => (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {items.map((item, itemIdx) => (
              <div
                key={itemIdx}
                className="rounded-2xl border border-white/10 bg-[#0c0c16]/90 p-5 space-y-4 hover:border-purple-500/40 transition-all shadow-lg flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                      <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                        {item.title}
                      </h3>
                    </div>
                    {item.subtext && (
                      <p className="text-xs text-zinc-400 mt-1 pl-4">
                        {item.subtext}
                      </p>
                    )}
                  </div>
                  {item.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* 3 Structured Dimensions */}
                <div className="space-y-2.5">
                  {/* Dimension 1: What Data Is It */}
                  {item.whatItIs && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 space-y-1">
                      <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-cyan-400" /> What Data Is It?
                      </span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-5">
                        {item.whatItIs}
                      </p>
                    </div>
                  )}

                  {/* Dimension 2: Visual on Dashboard */}
                  {item.visual && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 space-y-1">
                      <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-violet-400" /> Visual on Dashboard
                      </span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-5">
                        {item.visual}
                      </p>
                    </div>
                  )}

                  {/* Dimension 3: Why It's Helpful */}
                  {item.whyHelpful && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 space-y-1">
                      <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-violet-400" /> Why It&apos;s Helpful
                      </span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-5">
                        {item.whyHelpful}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

        // Content renderer helper
        const renderContent = () => (
          <div className="space-y-4">
            {sectionTitle && (
              <div className="border-b border-white/[0.08] pb-3 mb-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-violet-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{sectionType === 'faq' ? 'Questions & Answers' : sectionType === 'troubleshooting' ? 'Diagnostics & Fixes' : 'Guide Section'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
                  <span>{sectionTitle}</span>
                </h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-normal">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {section.content && (
              <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed space-y-3 font-normal">
                {Array.isArray(section.content) ? (
                  section.content.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))
                ) : (
                  <p>{section.content}</p>
                )}
              </div>
            )}

            {section.bullets && section.bullets.length > 0 && (
              <div className="space-y-2 pt-1 text-xs sm:text-sm text-zinc-300">
                {section.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <span className="leading-relaxed">
                      {typeof b === 'string' ? (
                        b
                      ) : (
                        <>
                          <strong className="text-white font-medium">{b.label}: </strong>
                          <span className="text-zinc-300">{b.text}</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'data-breakdown' && section.items && section.items.length > 0 && (
              renderDataBreakdown(section.items)
            )}

            {sectionType === 'list' && section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 text-xs">
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
                  <div key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'callout' && (
              <div className="rounded-xl border border-[#814AC8]/30 bg-violet-950/20 p-4.5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs sm:text-sm text-white leading-relaxed">
                  <span className="font-semibold block text-white mb-1">
                    {section.calloutTitle || 'Verified Expected Outcome:'}
                  </span>
                  {section.calloutText || section.content}
                </div>
              </div>
            )}

            {(sectionType === 'troubleshooting' || sectionType === 'diagnostics') && section.items && (
              <div className="space-y-4 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#16161a]/95 hover:bg-[#191920] space-y-3 hover:border-violet-500/40 transition-all duration-300 shadow-xl shadow-black/40 backdrop-blur-xl"
                  >
                    <div className="flex items-start gap-3 text-white font-semibold text-sm sm:text-base tracking-tight">
                      <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h3 className="leading-snug pt-0.5">{item.issue || item.problem}</h3>
                    </div>
                    {item.cause && (
                      <p className="text-xs sm:text-[13px] text-zinc-400 pl-11 leading-relaxed font-normal">
                        <strong className="text-violet-300 font-semibold">Root Cause: </strong>
                        {item.cause}
                      </p>
                    )}
                    <p className="text-xs sm:text-[13px] text-zinc-300 pl-11 leading-relaxed font-normal">
                      <strong className="text-violet-400 font-semibold">Resolution: </strong>
                      {item.solution || item.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'faq' && section.items && (
              <DocsFaqSection items={section.items} />
            )}
          </div>
        );

        // Media renderer helper
        const renderMedia = () => (
          <div className="space-y-3">
            {UIPreviewComponent && (
              <div className="rounded-2xl border border-white/10 bg-[#070012] overflow-hidden shadow-2xl">
                <UIPreviewComponent />
              </div>
            )}
            {section.screenshot && (
              <DocumentationScreenshot
                src={section.screenshot.src}
                alt={section.screenshot.alt || `${sectionTitle} preview`}
                caption={section.screenshot.caption}
                annotation={section.screenshot.annotation}
                aspectRatio={section.screenshot.aspectRatio || 'aspect-[16/9]'}
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
              <div className="border-b border-white/[0.08] pb-3 mb-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-violet-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{sectionType === 'faq' ? 'Questions & Answers' : sectionType === 'troubleshooting' ? 'Diagnostics & Fixes' : 'Guide Section'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
                  <span>{sectionTitle}</span>
                </h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-normal">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {section.content && (
              <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed space-y-3 font-normal">
                {Array.isArray(section.content) ? (
                  section.content.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))
                ) : (
                  <p>{section.content}</p>
                )}
              </div>
            )}

            {section.bullets && section.bullets.length > 0 && (
              <div className="space-y-2 pt-1 text-xs sm:text-sm text-zinc-300">
                {section.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <span className="leading-relaxed">
                      {typeof b === 'string' ? (
                        b
                      ) : (
                        <>
                          <strong className="text-white font-medium">{b.label}: </strong>
                          <span className="text-zinc-300">{b.text}</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'data-breakdown' && section.items && section.items.length > 0 && (
              renderDataBreakdown(section.items)
            )}

            {sectionType === 'list' && section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 text-xs">
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
                  <div key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
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

            {(sectionType === 'dynamic-tier-matrix' || (sectionType === 'table' && section.id === 'tier-matrix')) ? (
              <DocsDynamicTierMatrix initialHeaders={section.headers} initialRows={section.rows} />
            ) : sectionType === 'table' && section.headers && section.rows && (
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
              <div className="rounded-xl border border-[#814AC8]/30 bg-violet-950/20 p-4.5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs sm:text-sm text-white leading-relaxed">
                  <span className="font-semibold block text-white mb-1">
                    {section.calloutTitle || 'Verified Expected Outcome:'}
                  </span>
                  {section.calloutText || section.content}
                </div>
              </div>
            )}

            {(sectionType === 'troubleshooting' || sectionType === 'diagnostics') && section.items && (
              <div className="space-y-4 pt-1">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#16161a]/95 hover:bg-[#191920] space-y-3 hover:border-violet-500/40 transition-all duration-300 shadow-xl shadow-black/40 backdrop-blur-xl"
                  >
                    <div className="flex items-start gap-3 text-white font-semibold text-sm sm:text-base tracking-tight">
                      <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h3 className="leading-snug pt-0.5">{item.issue || item.problem}</h3>
                    </div>
                    {item.cause && (
                      <p className="text-xs sm:text-[13px] text-zinc-400 pl-11 leading-relaxed font-normal">
                        <strong className="text-violet-300 font-semibold">Root Cause: </strong>
                        {item.cause}
                      </p>
                    )}
                    <p className="text-xs sm:text-[13px] text-zinc-300 pl-11 leading-relaxed font-normal">
                      <strong className="text-violet-400 font-semibold">Resolution: </strong>
                      {item.solution || item.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sectionType === 'faq' && section.items && (
              <DocsFaqSection items={section.items} />
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
