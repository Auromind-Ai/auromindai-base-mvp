import { CheckCircle2, MousePointer } from 'lucide-react';
import DocumentationScreenshot from './DocumentationScreenshot';

export default function DocsStepItem({ step, totalSteps }) {
  return (
    <div className="relative pl-12 pb-10 last:pb-2 group">
      {/* Vertical line connecting steps */}
      {step.step < totalSteps && (
        <div className="absolute left-[19px] top-9 bottom-0 w-0.5 bg-gradient-to-b from-[#814AC8]/60 to-white/10" />
      )}

      {/* Step Badge */}
      <div className="absolute left-0 top-0.5 w-10 h-10 rounded-xl bg-[#814AC8]/20 border border-[#814AC8]/50 text-[#c49df5] font-bold text-sm flex items-center justify-center shadow-lg shadow-purple-950/30">
        {step.step}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <h4 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
          <span>{step.title}</span>
        </h4>

        <p className="text-sm text-zinc-300 leading-relaxed font-normal">
          {step.instruction}
        </p>

        {step.uiElements && step.uiElements.length > 0 && (
          <div className="pt-1">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
              <MousePointer className="w-3.5 h-3.5 text-violet-400" /> UI Elements &amp; Actions:
            </span>
            <div className="flex flex-wrap gap-2">
              {step.uiElements.map((el, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-white/[0.04] text-zinc-200 border border-white/10 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {el}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Inline Contextual Step Screenshot Slot */}
        <div className="pt-2">
          <DocumentationScreenshot
            src={step.screenshot?.src || (typeof step.screenshot === 'string' ? step.screenshot : null)}
            alt={step.screenshot?.alt || `${step.title} interface capture`}
            caption={step.screenshot?.caption || `${step.title}: Product interface execution slot`}
            stepNumber={step.step}
          />
        </div>
      </div>
    </div>
  );
}
