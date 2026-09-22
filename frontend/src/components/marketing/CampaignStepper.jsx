'use client';

import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Campaign Details', subtitle: 'Basic information' },
  { id: 2, title: 'Audience', subtitle: 'Select recipients' },
  { id: 3, title: 'Template', subtitle: 'Select template' },
  { id: 4, title: 'Schedule', subtitle: 'Send now or later' },
  { id: 5, title: 'Review', subtitle: 'Confirm & launch' },
];

export default function CampaignStepper({ currentStep, onStepClick }) {
  return (
    <div className="w-full py-1">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Item */}
              <div
                onClick={() => {
                  if (isCompleted && onStepClick) {
                    onStepClick(step.id);
                  }
                }}
                className={`flex items-center gap-2.5 z-10 transition-all duration-200 ${
                  isCompleted ? 'cursor-pointer group' : 'cursor-default'
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold shrink-0 transition-all duration-200 ${
                    isCompleted
                      ? 'bg-[#814AC8] text-white shadow-[0_0_12px_rgba(129,74,200,0.4)] group-hover:scale-105'
                      : isCurrent
                      ? 'bg-[#814AC8] text-white shadow-[0_0_14px_rgba(129,74,200,0.5)]'
                      : 'bg-[#121626] text-white/70 border border-[#222a42]'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} className="text-white" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div className="hidden sm:flex flex-col text-left">
                  <span
                    className={`text-xs sm:text-sm tracking-tight transition-colors ${
                      isCurrent
                        ? 'text-white font-semibold'
                        : isCompleted
                        ? 'text-white font-medium'
                        : 'text-white/80 font-medium'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/70 font-normal leading-tight">
                    {step.subtitle}
                  </span>
                </div>
              </div>

              {/* Connecting Line (between steps) */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 md:mx-4 h-[2px] relative">
                  <div className="absolute inset-0 bg-[#1e253c]" />
                  <div
                    className="absolute inset-0 bg-[#814AC8] transition-all duration-300"
                    style={{
                      width: isCompleted || (isCurrent && idx === 0) ? '100%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Step Title Banner */}
      <div className="sm:hidden mt-2 text-center">
        <span className="text-xs font-semibold text-[#814AC8]">
          Step {currentStep} of 5:
        </span>{' '}
        <span className="text-xs font-medium text-white">
          {STEPS[currentStep - 1]?.title}
        </span>
        <span className="text-[11px] text-[#8c94a6] block">
          {STEPS[currentStep - 1]?.subtitle}
        </span>
      </div>
    </div>
  );
}
