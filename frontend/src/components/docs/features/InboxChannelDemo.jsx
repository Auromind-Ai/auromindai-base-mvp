'use client';

import { useState } from 'react';
import { Phone, Instagram, Search, CircleDot } from 'lucide-react';

const CHANNELS = {
  WhatsApp: { color: '#00df80', icon: Phone, gradient: 'linear-gradient(135deg, #087e53, #00cd5c)', names: ['+12025551000', '+12025551010', '+12025551011', '+12025551012'] },
  Instagram: { color: '#f33cab', icon: Instagram, gradient: 'linear-gradient(120deg, #ffce52, #fb3187, #9822d3)', names: ['Charlotte Adams', 'Alexander Scott', 'Benjamin Hall', 'Liam Nelson'] },
  Twilio: { color: '#ff3456', icon: CircleDot, gradient: 'linear-gradient(120deg, #ff3d61, #e80b32)', names: ['+12025551030', '+12025551031', '+12025551032', '+12025551033'] },
};
const PREVIEWS = {
  Open: ['Can I book a ride for this evening?', 'Do you offer airport transfers?', 'Please share your available times.', 'I would like to know the pricing.'],
  'Follow Up': ['Please call me tomorrow morning.', 'I will confirm the pickup time soon.', 'Can we discuss the booking later?', 'Waiting for the final passenger count.'],
  Converted: ['Your booking is confirmed! 🎉 We have reserved your ride.', 'Your appointment is confirmed! 📅 Schedule details sent.', 'Your reservation is confirmed! 🥂 We look forward to it.', 'Your booking is confirmed! 🚕 We have sent the details.'],
  Closed: ['Thank you for your help!', 'Everything is sorted. Thank you.', 'We have received the details.', 'Thanks, that answers my question.'],
};

export default function InboxChannelDemo() {
  const [channel, setChannel] = useState('WhatsApp');
  const [filter, setFilter] = useState('Converted');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const data = CHANNELS[channel];
  const Icon = data.icon;
  const filters = channel === 'Instagram' ? ['Open', 'Converted', 'Closed', 'All'] : ['Open', 'Follow Up', 'Converted', 'Closed'];
  const rows = data.names.map((name, id) => ({ name, id, status: filter === 'All' ? ['Open', 'Converted', 'Closed', 'Open'][id] : filter })).filter((row) => `${row.name} ${PREVIEWS[row.status][row.id]}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full min-w-0" style={{ '--inbox-accent': data.color }}>
      <div className="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="Inbox demo channel">
        {Object.entries(CHANNELS).map(([name, info]) => {
          const ChannelIcon = info.icon;
          return <button key={name} type="button" aria-pressed={channel === name} onClick={() => { setChannel(name); setFilter('Converted'); setSearch(''); setSelected(0); setExpanded(null); }} className="flex items-center justify-center gap-2 rounded-2xl border py-3 px-1 text-[11px] sm:text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ color: channel === name ? '#fff' : '#8b96a8', borderColor: channel === name ? info.color : '#303942', background: channel === name ? info.gradient : 'linear-gradient(140deg,#11181c,#080c10)', boxShadow: channel === name ? `0 0 20px ${info.color}45, inset 0 0 8px ${info.color}80` : 'none' }}><ChannelIcon className="w-4 h-4 shrink-0" />{name}</button>;
        })}
      </div>
      <div className="rounded-[24px] border p-3 sm:p-4 space-y-3" style={{ borderColor: `${data.color}aa`, background: 'radial-gradient(ellipse at top left, #11282a55, transparent 55%), linear-gradient(145deg,#0e191e,#090e15)', boxShadow: `inset 0 0 28px ${data.color}0c, 0 0 18px ${data.color}12` }}>
        <h3 className="flex items-center gap-3 text-lg font-semibold text-white py-1"><span className="rounded-full p-3" style={{ background: `${data.color}18` }}><Icon className="w-5 h-5" style={{ color: data.color }} /></span>{channel} Inbox</h3>
        <label className="flex items-center gap-3 rounded-full border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-4 py-3">
          <Search className="w-5 h-5 text-slate-500 shrink-0" /><input aria-label={`Search ${channel} sample conversations`} placeholder="Search Conversations" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none focus-visible:ring-1 focus-visible:ring-white/50" />
        </label>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Conversation status">
          {filters.map((status) => <button key={status} type="button" aria-pressed={filter === status} onClick={() => { setFilter(status); setSelected(0); setExpanded(null); }} className="rounded-xl border px-1 py-3 text-[10px] sm:text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ color: filter === status ? data.color : '#94a3b8', borderColor: filter === status ? `${data.color}aa` : '#25323c', background: filter === status ? `${data.color}12` : '#0b131b', boxShadow: filter === status ? `inset 0 0 16px ${data.color}12` : 'none' }}>{status} <span className="opacity-60">4</span></button>)}
        </div>
        <div className="space-y-2" aria-live="polite">
          {rows.map((row) => <button type="button" key={row.id} aria-expanded={expanded === row.id} onClick={() => { setSelected(row.id); setExpanded(expanded === row.id ? null : row.id); }} className="w-full rounded-2xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ borderColor: selected === row.id ? data.color : '#26323b80', background: selected === row.id ? `linear-gradient(120deg,${data.color}20,#101a21)` : 'linear-gradient(135deg,#15202770,#0c121a)', boxShadow: selected === row.id ? `inset 3px 0 ${data.color}, 0 0 15px ${data.color}12` : 'none' }}>
            <div className="flex items-center gap-3"><span className="rounded-full w-10 h-10 shrink-0 flex items-center justify-center text-sm font-semibold" style={{ background: `${data.color}12`, color: data.color }}>{channel === 'Instagram' ? row.name[0] : row.name.slice(-2)}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-white truncate">{row.name}</span><span className="text-[10px] text-slate-500 shrink-0">{row.id === 0 ? 'Yesterday' : `${row.id + 1} days ago`}</span></div><p className="mt-1.5 truncate text-xs text-slate-400">{PREVIEWS[row.status][row.id]}</p></div></div>
            {expanded === row.id && <p className="mt-3 pt-3 border-t border-white/10 text-xs leading-relaxed text-slate-300"><strong style={{ color: data.color }}>{row.status} · </strong>{PREVIEWS[row.status][row.id]}</p>}
          </button>)}
          {!rows.length && <p className="py-8 text-center text-sm text-slate-400">No matches. Try another name or clear your search.</p>}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-400">Interactive preview · Sample data. Switch channels, filter chats, or select a conversation.</p>
    </div>
  );
}

