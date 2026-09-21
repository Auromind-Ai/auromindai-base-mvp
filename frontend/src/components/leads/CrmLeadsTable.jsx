'use client';

import { SYSTEM_TIERS } from '@/lib/labelStyles';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const sourceLabel = source => ({
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    twilio: 'Twilio',
    sms: 'Twilio',
    phone: 'Twilio',
    gmail: 'Gmail',
    email: 'Email',
    manual: 'Manual',
    web: 'Manual'
}[source?.toLowerCase()] || source || 'Manual');

const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getLeadCategory = (lead) => {
    const tier = (lead?.lead_tier || '').toLowerCase();
    return SYSTEM_TIERS[tier] || { text: 'Unclassified', bg: 'bg-white/5', textCls: 'text-zinc-400', border: 'border-white/10' };
};

export default function CrmLeadsTable({
    leads = [],
    loading = false,
    totalCount = 0,
    offset = 0,
    pageSize = 50,
    onPageChange,
    hasMore,
    onLoadMore,
    selectedIds = [],
    onToggleSelection,
    onSelect,
    searchTerm = '',
    onSearchChange,
    title = 'All Leads',
    onAddFollowUp,
    addingFollowUp = false,
    showSelection = true,
    onRemoveFollowUp,
    removingId = null
}) {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.floor(offset / pageSize) + 1;
    const canPrev = offset > 0 && !loading;
    const canNext = ((offset + pageSize) < totalCount) && !loading;

    const handlePrev = () => {
        if (!canPrev) return;
        const newOffset = Math.max(0, offset - pageSize);
        if (onPageChange) {
            onPageChange(newOffset);
        }
    };

    const handleNext = () => {
        if (!canNext) return;
        const newOffset = offset + pageSize;
        if (onPageChange) {
            onPageChange(newOffset);
        } else if (onLoadMore) {
            onLoadMore();
        }
    };

    const startCount = totalCount === 0 ? 0 : offset + 1;
    const endCount = totalCount === 0 ? 0 : Math.min(offset + leads.length, totalCount);

    return (
        <section aria-label="Lead directory" className="flex-1 min-h-0 min-w-0 flex flex-col bg-[#0D0D17]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,320px)_1fr] items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <span className="text-xs text-zinc-400 rounded-full border border-white/10 px-2 py-1" aria-live="polite">
                        {loading ? 'Loading…' : `${totalCount.toLocaleString()} leads found`}
                    </span>
                </div>
                <div className="relative w-full max-w-[320px] justify-self-center">
                    <Search size={13} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="search"
                        aria-label="Search leads"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Search leads..."
                        className="h-9 pl-8 pr-3 w-full rounded-xl bg-[#111119] border border-white/[0.06] text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#7C4DFF]/40 transition-all"
                    />
                </div>
                {onAddFollowUp && (
                    <button
                        onClick={onAddFollowUp}
                        disabled={!selectedIds.length || addingFollowUp || loading}
                        className="justify-self-start md:justify-self-end h-9 px-4 rounded-xl bg-violet-600 text-sm font-medium hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {addingFollowUp ? 'Adding...' : `Add to follow up${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
                    </button>
                )}
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                    <caption className="sr-only">CRM leads table</caption>
                    <thead className="sticky top-0 z-10 bg-[#171122] text-xs text-zinc-400">
                        <tr>
                            {showSelection && <th scope="col" className="w-10 px-4 py-4"><span className="sr-only">Select leads</span></th>}
                            {['S.no', 'Date', 'Source', 'Name', 'Phone', 'Lead Score', 'Lead Category'].map(title => (
                                <th scope="col" key={title} className="px-4 py-4 font-medium whitespace-nowrap">{title}</th>
                            ))}
                            {onRemoveFollowUp && <th scope="col" className="px-4 py-4 font-medium">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                        {leads.map((lead, index) => {
                            const checked = selectedIds.includes(lead.id);
                            const category = getLeadCategory(lead);
                            return (
                                <tr key={lead.id} className={`${checked ? 'bg-violet-500/10' : 'hover:bg-white/[0.025]'} transition-colors`}>
                                    {showSelection && <td className="px-4 py-4">
                                        <input type="checkbox" className="accent-violet-500" checked={checked} onChange={() => onToggleSelection(lead.id)} aria-label={`Select ${lead.name}`} />
                                    </td>}
                                    <td className="px-4 py-4 text-zinc-500 tabular-nums">{offset + index + 1}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-zinc-300">
                                        {formatDate(lead.created_at)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-zinc-300">
                                        {sourceLabel(lead.source)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button className="text-left font-semibold text-white hover:text-violet-300 focus-visible:outline-violet-400 max-w-64 break-words cursor-pointer" onClick={() => onSelect(lead.id)} aria-label={`View scoring for ${lead.name}`}>
                                            {lead.name || 'Unknown Lead'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-zinc-300">
                                        {lead.phone || '—'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 font-semibold text-violet-300 tabular-nums">
                                            {lead.score ?? 0}<span className="text-zinc-500 font-normal ml-1">/ 100</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${category.bg} ${category.textCls} ${category.border}`}>
                                            {category.text}
                                        </span>
                                    </td>
                                    {onRemoveFollowUp && <td className="px-4 py-4">
                                        <button disabled={!!removingId} onClick={() => onRemoveFollowUp(lead)} aria-label={`Remove ${lead.name || 'lead'} from follow up`} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 whitespace-nowrap">
                                            {removingId === lead.id ? 'Removing...' : 'Remove'}
                                        </button>
                                    </td>}
                                </tr>
                            );
                        })}
                        {!leads.length && (
                            <tr>
                                <td colSpan={7 + Number(showSelection) + Number(!!onRemoveFollowUp)} className="px-5 py-16 text-center text-zinc-500">
                                    {loading ? 'Loading leads…' : 'No leads found. Try changing or clearing your filters.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/10 shrink-0 text-xs text-zinc-400">
                <span>
                    {totalCount === 0
                        ? 'Showing 0 of 0 leads'
                        : `Showing ${startCount.toLocaleString()} - ${endCount.toLocaleString()} of ${totalCount.toLocaleString()} leads`}
                </span>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!canPrev}
                        onClick={handlePrev}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer disabled:pointer-events-none"
                    >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                    </button>

                    {totalPages > 1 && (
                        <span className="text-xs text-zinc-400 px-2">
                            Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                        </span>
                    )}

                    <button
                        type="button"
                        disabled={!canNext}
                        onClick={handleNext}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer disabled:pointer-events-none"
                    >
                        <span>Next</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </section>
    );
}
