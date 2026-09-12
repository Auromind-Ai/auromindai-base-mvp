import { CheckCircle2, MousePointer } from 'lucide-react';
import DocumentationScreenshot from './DocumentationScreenshot';

export default function DocsStepItem({ step, totalSteps }) {
  return (
    <div className="relative pl-14 pb-12 last:pb-2 group">
      {/* Vertical line connecting steps */}
      {step.step < totalSteps && (
        <div className="absolute left-[21px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-[#814AC8]/80 via-violet-500/30 to-white/10" />
      )}

      {/* Step Badge */}
      <div className="absolute left-0 top-0.5 w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#814AC8]/30 to-[#a855f7]/20 border border-[#814AC8]/60 text-white font-extrabold text-sm flex items-center justify-center shadow-xl shadow-purple-950/50">
        {step.step}
      </div>

      {/* Content */}
      <div className="space-y-3.5">
        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>{step.title}</span>
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-3">
            <p className="text-sm text-zinc-300 leading-relaxed font-normal">
              {step.instruction}
            </p>

            {step.uiElements && step.uiElements.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
                  <MousePointer className="w-3.5 h-3.5 text-violet-400 shrink-0" aria-hidden="true" />
                  <span>UI Elements &amp; Actions:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {step.uiElements.map((el, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] text-zinc-200 border border-white/10 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <DocumentationScreenshot
              src={step.screenshot?.src || (typeof step.screenshot === 'string' ? step.screenshot : null)}
              alt={step.screenshot?.alt || `${step.title} interface capture`}
              caption={step.screenshot?.caption || `${step.title}: Interface preview`}
              stepNumber={step.step}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

