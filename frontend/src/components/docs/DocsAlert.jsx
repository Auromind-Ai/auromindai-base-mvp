import { Info, Lightbulb, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function DocsAlert({ type = 'note', children, title }) {
  const styles = {
    note: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-950/20',
      text: 'text-blue-200',
      titleColor: 'text-blue-400',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Note',
    },
    tip: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-200',
      titleColor: 'text-emerald-400',
      icon: <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Pro Tip',
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20',
      text: 'text-amber-200',
      titleColor: 'text-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Warning',
    },
    important: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-950/20',
      text: 'text-purple-200',
      titleColor: 'text-purple-400',
      icon: <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Important',
    },
  };

  const current = styles[type] || styles.note;

  return (
    <div className={`my-6 rounded-xl border ${current.border} ${current.bg} p-4.5 flex gap-3.5 backdrop-blur-sm`}>
      {current.icon}
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <span className={`font-semibold tracking-wide ${current.titleColor}`}>
          {title || current.defaultTitle}
        </span>
        <div className={current.text}>{children}</div>
      </div>
    </div>
  );
}
