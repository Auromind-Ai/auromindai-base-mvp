'use client';

import { AGENT_LABELS } from '@/lib/labelStyles';

const sourceLabel = source => ({ whatsapp: 'WhatsApp', instagram: 'Instagram', twilio: 'Twilio', sms: 'Twilio', gmail: 'Gmail', email: 'Email', manual: 'Manual', web: 'Web' }[source?.toLowerCase()] || source || 'Manual');

export default function CrmLeadsTable({ leads, loading, totalCount, hasMore, onLoadMore, selectedIds, onToggleSelection, onSelect }) {
    return (
        <section aria-label="Lead directory" className="flex-1 min-h-0 min-w-0 flex flex-col bg-[#0D0D17]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-semibold">All Leads</h2>
                <span className="text-xs text-zinc-400 rounded-full border border-white/10 px-2 py-1" aria-live="polite">{loading ? 'Loading…' : `${totalCount.toLocaleString()} leads found`}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                    <caption className="sr-only">CRM leads. Date and time show when each lead was created, in your local timezone.</caption>
                    <thead className="sticky top-0 z-10 bg-[#171122] text-xs text-zinc-400">
                        <tr>
                            <th scope="col" className="w-10 px-4 py-4"><span className="sr-only">Select for export</span></th>
                            {['S.no', 'Name', 'Date', 'Time', 'Lead Score', 'Source', 'Contact Mobile / Email', 'Label'].map(title => <th scope="col" key={title} className="px-4 py-4 font-medium whitespace-nowrap">{title}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                        {leads.map((lead, index) => {
                            const created = lead.created_at ? new Date(lead.created_at) : null;
                            const validDate = created && !Number.isNaN(created.getTime());
                            const checked = selectedIds.includes(lead.id);
                            return <tr key={lead.id} className={`${checked ? 'bg-violet-500/10' : 'hover:bg-white/[0.025]'} transition-colors`}>
                                <td className="px-4 py-4"><input type="checkbox" className="accent-violet-500" checked={checked} onChange={() => onToggleSelection(lead.id)} aria-label={`Select ${lead.name} for export`} /></td>
                                <td className="px-4 py-4 text-zinc-500 tabular-nums">{index + 1}</td>
                                <td className="px-4 py-4"><button className="text-left font-semibold text-white hover:text-violet-300 focus-visible:outline-violet-400 max-w-64 break-words" onClick={() => onSelect(lead.id)} aria-label={`View scoring for ${lead.name}`}>{lead.name}</button></td>
                                <td className="px-4 py-4 whitespace-nowrap text-zinc-300">{validDate ? <time dateTime={created.toISOString()}>{created.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</time> : '—'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-zinc-400">{validDate ? created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                <td className="px-4 py-4"><span className="inline-flex rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 font-semibold text-violet-300 tabular-nums">{lead.score ?? 0}<span className="text-zinc-500 font-normal ml-1">/ 100</span></span></td>
                                <td className="px-4 py-4 whitespace-nowrap text-zinc-300">{sourceLabel(lead.source)}</td>
                                <td className="px-4 py-4 text-zinc-300"><div className="space-y-1 max-w-72 break-words">{lead.phone && <p>{lead.phone}</p>}{lead.email && <p className="text-zinc-400">{lead.email}</p>}{!lead.phone && !lead.email && '—'}</div></td>
                                <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5 min-w-28">{lead.labels?.length ? lead.labels.map(label => <span key={label} className={`rounded-full px-2 py-1 text-xs border ${AGENT_LABELS[label]?.textCls || 'text-zinc-300'} border-white/10 bg-white/5`}>{label}</span>) : <span className="text-zinc-500">—</span>}</div></td>
                            </tr>;
                        })}
                        {!leads.length && <tr><td colSpan={9} className="px-5 py-16 text-center text-zinc-500">{loading ? 'Loading leads…' : 'No leads found. Try changing or clearing your filters.'}</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10 shrink-0 text-xs text-zinc-400">
                <span>Showing {leads.length.toLocaleString()} of {totalCount.toLocaleString()} leads</span>
                {hasMore && <button disabled={loading} onClick={onLoadMore} className="rounded-lg px-4 py-2 border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">{loading ? 'Loading…' : 'Load more'}</button>}
            </div>
        </section>
    );
}
