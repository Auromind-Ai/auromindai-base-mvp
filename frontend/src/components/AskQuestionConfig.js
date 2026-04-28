'use client';

import { useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

const INPUT_TYPES = ['text', 'email', 'number'];

const formatVariableName = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

export default function AskQuestionConfig({ node, updateNodeConfig }) {
  const config = node?.config || {};
  const nodeId = node?.id;
  const questionValue = config.question ?? config.text ?? '';
  const variableName = config.variable_name ?? '';
  const questionError = !questionValue.trim();
  const variableNameError = !variableName.trim();

  useEffect(() => {
    if (!nodeId || config.type !== 'ask_question') return;

    const nextDefaults = {};

    if (!config.input_type) nextDefaults.input_type = 'text';
    if (config.required === undefined) nextDefaults.required = true;
    if (config.timeout_minutes === undefined || config.timeout_minutes === null) {
      nextDefaults.timeout_minutes = 60;
    }

    if (Object.keys(nextDefaults).length > 0) {
      updateNodeConfig(nodeId, nextDefaults);
    }
  }, [
    config.input_type,
    config.required,
    config.timeout_minutes,
    config.type,
    nodeId,
    updateNodeConfig,
  ]);

  if (config.type !== 'ask_question') return null;

  return (
    <div className="space-y-5">
      {/* Helper Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-3">
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-violet-400" />
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[2px] text-violet-300">
            Wait For Reply
          </p>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            Flow will pause until user replies.
          </p>
        </div>
      </div>

      {/* Question Textarea - Added styling */}
      <section>
        <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Question Text
        </label>
        <textarea
          rows={3}
          value={questionValue}
          placeholder="e.g. What is your email?"
          onChange={(e) =>
            updateNodeConfig(nodeId, {
              question: e.target.value,
              text: e.target.value,
            })
          }
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white shadow-inner outline-none transition focus:border-violet-500/50"
        />
        {questionError && (
          <p className="mt-2 text-[10px] font-medium text-rose-400">
            Question is required.
          </p>
        )}
      </section>

      {/* Save Answer As & Input Type on the SAME LINE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section>
          <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Save Answer As
          </label>
          <input
            type="text"
            value={variableName}
            placeholder="e.g. user_email"
            onChange={(e) =>
              updateNodeConfig(nodeId, {
                variable_name: formatVariableName(e.target.value),
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white shadow-inner outline-none transition focus:border-violet-500/50"
          />
          {variableNameError && (
            <p className="mt-2 text-[10px] font-medium text-rose-400">
              This field is required.
            </p>
          )}
        </section>

        <section>
          <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Input Type
          </label>
          <select
            value={config.input_type || 'text'}
            onChange={(e) => updateNodeConfig(nodeId, { input_type: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-[#0F1115] px-4 py-3 text-sm font-bold text-white outline-none"
            style={{ backgroundColor: '#0F1115', color: 'white' }}
          >
            {INPUT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </section>
      </div>

      {/* Required Checkbox & Timeout row */}
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <label className="flex h-[46px] cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/5 transition">
          <input
            type="checkbox"
            checked={config.required ?? true}
            onChange={(e) => updateNodeConfig(nodeId, { required: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-transparent text-violet-500 focus:ring-violet-500/40"
          />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Required</span>
        </label>

        <section>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Timeout
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={1440}
              value={config.timeout_minutes ?? 60}
              onChange={(e) =>
                updateNodeConfig(nodeId, {
                  timeout_minutes: Math.max(1, parseInt(e.target.value, 10) || 60),
                })
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white shadow-inner outline-none transition focus:border-violet-500/50"
            />
            <span className="text-xs font-bold text-zinc-500">MIN</span>
          </div>
        </section>
      </div>
    </div>
  );
}