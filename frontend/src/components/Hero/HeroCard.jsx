"use client";

export default function HeroCard() {
  return (
    <div className="relative w-full max-w-[420px]">
      <div className="rounded-[32px] border border-white/40 bg-white/60 backdrop-blur-2xl shadow-[0_30px_80px_rgba(139,92,246,0.18)] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold">
            AI
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Revenue Assistant
            </p>
            <p className="text-xs text-slate-500">
              Active • 24/7 Automation
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 text-white px-4 py-3 text-sm">
            Hey 👋 Can I get pricing details?
          </div>

          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-700 px-4 py-3 text-sm">
            Sure! Our starter plan begins at ₹999/month. Want a demo link?
          </div>

          <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
            Yes, send it.
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Conversion Rate
            </p>
            <p className="text-2xl font-bold">+38%</p>
          </div>

          <div className="h-12 w-px bg-white/10" />

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Response Time
            </p>
            <p className="text-2xl font-bold">1.2s</p>
          </div>
        </div>
      </div>
    </div>
  );
}