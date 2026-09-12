import { Info, Lightbulb, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function DocsAlert({ type = 'note', children, title }) {
  const styles = {
    note: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-950/20',
      text: 'text-zinc-200',
      titleColor: 'text-violet-300',
      icon: <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Note',
    },
    tip: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-950/20',
      text: 'text-zinc-200',
      titleColor: 'text-violet-300',
      icon: <Lightbulb className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Pro Tip',
    },
    warning: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-950/20',
      text: 'text-zinc-200',
      titleColor: 'text-violet-300',
      icon: <AlertTriangle className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Warning',
    },
    important: {
      border: 'border-[#814AC8]/40',
      bg: 'bg-[#814AC8]/15',
      text: 'text-zinc-200',
      titleColor: 'text-violet-300',
      icon: <ShieldAlert className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Important',
    },
  };

  const current = styles[type] || styles.note;

  return (
    <div className={`my-4 rounded-xl border ${current.border} ${current.bg} p-4 flex gap-3.5 backdrop-blur-md shadow-lg shadow-black/40`}>
      {current.icon}
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <span className={`font-semibold tracking-wide text-xs uppercase ${current.titleColor}`}>
          {title || current.defaultTitle}
        </span>
        <div className={`${current.text} font-normal`}>{children}</div>
      </div>
    </div>
  );
}

