import { MoreHorizontal } from 'lucide-react';

export default function AttentionItem({ name, status, time, priority }) {
    const priorityClasses = 
        priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
        priority === 'medium' ? 'bg-amber-500' :
        'bg-[#52525b]';

    return (
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#161617]/50 transition-colors group gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full shrink-0 ${priorityClasses}`} />
                <div>
                    <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{name}</p>
                    <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mt-0.5">{status}</p>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 pl-6 sm:pl-0">
                <span className="text-[10px] text-[#52525b] font-black uppercase tracking-wider">{time}</span>
                <button className="p-1.5 hover:bg-[#1f1f20] rounded text-[#52525b] hover:text-white transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </div>
        </div>
    );
}
