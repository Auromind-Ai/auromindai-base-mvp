'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Filter,
    Phone,
    Instagram,
    Globe,
    Mail,
    MessageSquare,
    CheckCircle2,
    Clock,
    User,
    ChevronDown,
    ArrowUpRight,
    Sparkles,
    CheckSquare,
    MoreHorizontal,
    Target,
    TrendingUp,
    Check
} from 'lucide-react';

const CHANNELS = {
    Whatsapp: {
        icon: Phone,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        dot: 'bg-emerald-400',
        score: 'text-emerald-400'
    },
    Instagram: {
        icon: Instagram,
        color: 'text-pink-400',
        bg: 'bg-pink-400/10',
        dot: 'bg-pink-400',
        score: 'text-pink-400'
    },
    Web: {
        icon: Globe,
        color: 'text-sky-400',
        bg: 'bg-sky-400/10',
        dot: 'bg-sky-400',
        score: 'text-sky-400'
    },
    Email: {
        icon: Mail,
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
        dot: 'bg-orange-400',
        score: 'text-amber-400'
    },
};

const STATUSES = [
    { id: 'new', label: 'New', color: 'bg-sky-400' },
    { id: 'progress', label: 'In Progress', color: 'bg-violet-400' },
    { id: 'docs', label: 'Docs Pending', color: 'bg-amber-400' },
    { id: 'won', label: 'Won', color: 'bg-emerald-400' },
];

const INITIAL_LEADS = [
    { id: 1, name: 'Rahul Sharma', channel: 'Whatsapp', status: 'new', score: 85, lastActive: '2m ago', value: '₹1.5L', prob: '82%', unread: true },
    { id: 2, name: 'Priya Patel', channel: 'Instagram', status: 'progress', score: 72, lastActive: '15m ago', value: '₹80K', prob: '60%', unread: false },
    { id: 3, name: 'Amit Kumar', channel: 'Web', status: 'won', score: 94, lastActive: '1h ago', value: '₹2.5L', prob: '100%', unread: false },
    { id: 4, name: 'Sneha Reddy', channel: 'Whatsapp', status: 'docs', score: 78, lastActive: '3h ago', value: '₹1.2L', prob: '65%', unread: true },
    { id: 5, name: 'Vikram Singh', channel: 'Email', status: 'new', score: 64, lastActive: '1d ago', value: '₹95K', prob: '45%', unread: false },
];

const MOCK_MESSAGES = [
 { role: 'them', text: 'Hi, I need help with the business loan application.', time: '10:30 AM' },
 { role: 'me', text: 'Hello! I can certainly help. Which documents do you have ready?', time: '10:30 AM' },
 { role: 'them', text: 'I have my PAN and Aadhaar, but need to fetch bank statements.', time: '10:31 AM' },
 { role: 'me', text: 'Great. We will need the last 6 months bank statement and GST details if available.', time: '10:32 AM' },
 { role: 'them', text: 'Okay I can upload those today.', time: '10:33 AM' },
 { role: 'me', text: 'Perfect. Once uploaded, we can check your eligibility and share loan offers.', time: '10:34 AM' }
];

const MOCK_TASKS = [
    { id: 1, label: 'Send introductory message', due: 'Completed', owner: 'AI System', done: true },
    { id: 2, label: 'Collect KYC documents', due: 'In 2h', owner: 'Rahul S.', done: false },
    { id: 3, label: 'Verify income details', due: 'Tomorrow', owner: 'System', done: false },
    { id: 4, label: 'Schedule advisor call', due: 'Jan 12', owner: 'Rahul S.', done: false },
];

export default function LeadsPage() {
    const [leads, setLeads] = useState(INITIAL_LEADS);
    const [selectedLead, setSelectedLead] = useState(INITIAL_LEADS[0]);
    const [search, setSearch] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsMounted(true), 0);
    }, []);

    if (!isMounted) return null;

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
<div className="h-full flex flex-col bg-gradient-to-b from-[#0f0f14] via-[#0b0b10] to-[#060608] text-zinc-200 overflow-hidden">

{/* TOP BAR */}

<header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0f0f14] backdrop-blur-xl shrink-0">

<div className="flex items-center gap-10">

<h1 className="text-lg font-semibold text-white tracking-tight">
Leads / CRM
</h1>

<div className="relative">
<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />

<input
value={search}
onChange={(e)=>setSearch(e.target.value)}
placeholder="Search leads..."
className="w-80 h-9 pl-9 pr-4 rounded-lg bg-[#16161d] border border-white/5 text-sm text-white outline-none focus:border-indigo-500/40"
/>

</div>

</div>

<div className="flex items-center gap-3">

<button className="flex items-center gap-2 px-3 py-2 text-sm border border-white/5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06]">
<Filter size={14}/>
Filter
</button>

<button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/10">
<Plus size={16}/>
New Lead
</button>

</div>

</header>


{/* MAIN LAYOUT */}

<main className="flex flex-1 overflow-hidden">


{/* LEFT — LEAD LIST */}

<aside className="w-[360px] border-r border-white/5 bg-[#0f0f14] overflow-y-auto custom-scrollbar p-4 space-y-2">

<div className="p-3 space-y-1">

{filteredLeads.map((lead)=>{

const Ch = CHANNELS[lead.channel];
const Status = STATUSES.find(s=>s.id===lead.status);
const active = selectedLead?.id === lead.id;

return(

<div
key={lead.id}
onClick={()=>setSelectedLead(lead)}
className={`group p-4 rounded-lg cursor-pointer transition 
${active
  ? 'bg-gradient-to-r from-[#1a1a22] to-[#121218] border border-white/10 shadow-lg'
  : 'hover:bg-[#15151b]'}`}
>

<div className="flex justify-between mb-2">

<div className="flex items-center gap-2">

<div className={`w-2 h-2 rounded-full ${Ch.dot}`}/>

<span className={`text-sm font-semibold ${lead.unread?'text-white':'text-zinc-400'}`}>
{lead.name}
</span>

</div>

<span className={`text-xs font-semibold ${Ch.score}`}>
{lead.score}
</span>

</div>

<div className="flex items-center justify-between text-xs">

<div className="flex items-center gap-2">

<div className={`flex items-center gap-1 px-2 py-0.5 rounded ${Ch.bg} ${Ch.color}`}>
<Ch.icon size={10}/>
{lead.channel}
</div>

<span className="text-zinc-500">
{lead.lastActive}
</span>

</div>

<span className="text-white font-semibold opacity-0 group-hover:opacity-100">
{lead.value}
</span>

</div>

</div>

)

})}

</div>

</aside>



{/* CENTER + RIGHT WORKSPACE */}

<div className="flex-1 flex flex-col p-8 gap-6 overflow-y-auto custom-scrollbar">


{selectedLead && (

<>

{/* CENTER COLUMN */}

<div className="col-span-2 space-y-8">


{/* LEAD HEADER */}

<div className="flex items-center justify-between">

<div className="flex items-center gap-5">

<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl font-bold text-white">
{selectedLead.name.charAt(0)}
</div>

<div>

<h2 className="text-2xl font-semibold text-white">
{selectedLead.name}
</h2>

<div className="flex items-center gap-3 mt-2">

<span className="px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10">
{selectedLead.value}
</span>

<span className="flex items-center gap-2 px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10">

<div className={`w-1.5 h-1.5 rounded-full ${STATUSES.find(s=>s.id===selectedLead.status).color}`}/>

{STATUSES.find(s=>s.id===selectedLead.status).label}

<ChevronDown size={12}/>

</span>

</div>

</div>

</div>


{/* AI SCORE */}

<div className="text-right">

<p className="text-xs text-zinc-500 uppercase mb-1">
AI Trust Score
</p>

<div className="flex items-center gap-3">

<span className="text-3xl font-bold text-white">
{selectedLead.score}%
</span>

<span className="px-2 py-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 rounded">
{selectedLead.prob} P(c)
</span>

</div>

</div>

</div>



{/* CHAT PANEL */}

<div className="rounded-2xl border border-white/10 
bg-gradient-to-b from-[#26262d] via-[#1a1a20] to-[#101015]
shadow-[0_30px_80px_rgba(0,0,0,0.75)]
backdrop-blur-xl p-6 space-y-5 min-h-[420px]">

<div className="flex justify-between">

<h4 className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">

<MessageSquare size={14}/>
Conversation

</h4>

<button className="text-xs text-indigo-400 flex items-center gap-1">
Open full chat
<ArrowUpRight size={12}/>
</button>

</div>


<div className="space-y-5 pt-2">

{MOCK_MESSAGES.map((m,i)=>(

<div key={i} className={`flex flex-col ${m.role==='me'?'items-end':'items-start'}`}>

<div className={`px-4 py-2.5 rounded-xl text-sm max-w-[80%] shadow-md 
hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]
${m.role==='me'
? 'bg-gradient-to-br from-[#45454f] to-[#26262d] text-white border border-white/10'
: 'bg-[#1a1a20] text-zinc-300 border border-white/5'}`}>

{m.text}

</div>

<span className="text-[10px] text-zinc-500 mt-1">
{m.time}
</span>

</div>

))}

</div>

</div>

</div>



{/* RIGHT COLUMN */}

<div className="grid grid-cols-2 gap-6">


{/* TASKS */}

<div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-white/[0.18] via-white/[0.08] to-transparent overflow-hidden backdrop-blur">
<div className="p-5 border-b border-indigo-500/10 text-xs uppercase tracking-widest text-indigo-300">
Flow & Objectives
</div>
{MOCK_TASKS.map(task=>(
<div key={task.id} className="p-4 flex items-center justify-between hover:bg-white/[0.03]">
<div className="flex items-center gap-3">
<div className={`w-5 h-5 rounded border flex items-center justify-center
${task.done?'bg-indigo-500 border-indigo-500':'border-zinc-600'}`}>
{task.done && <Check size={12}/>}
</div>

<div>

<p className={`text-sm ${task.done?'line-through text-zinc-500':'text-white'}`}>
{task.label}
</p>

<div className="text-xs text-zinc-500 flex gap-3 mt-1">

<span className="flex items-center gap-1">
<Clock size={10}/> {task.due}
</span>

<span className="flex items-center gap-1">
<User size={10}/> {task.owner}
</span>

</div>

</div>

</div>

<MoreHorizontal size={14} className="text-zinc-600"/>

</div>

))}

</div>



{/* AI INSIGHTS */}

<div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-white/[0.18] via-white/[0.08] to-transparent p-5 space-y-4">

<h4 className="text-xs uppercase tracking-widest text-indigo-300">
Contextual Intelligence
</h4>

{[
{ icon: Sparkles, text:'This lead is hot — follow up now.', color:'text-indigo-400'},
{ icon: Target, text:'Users from WhatsApp convert 40% faster.', color:'text-emerald-400'},
{ icon: TrendingUp, text:'Suggesting to ask for PAN card next.', color:'text-blue-400'}
].map((item,i)=>(

<div
key={i}
className="
group
flex items-start gap-3
p-3
rounded-lg
border border-white/10
bg-white/[0.02]
hover:bg-white/[0.06]
hover:border-indigo-400/30
transition-all
cursor-pointer
"
>

<div className="
w-8 h-8
rounded-md
flex items-center justify-center
bg-white/[0.05]
border border-white/10
group-hover:scale-105
transition
">

<item.icon size={14} className={item.color}/>

</div>

<p className="text-sm text-white leading-relaxed">
{item.text}
</p>

</div>

))}

</div>

</div>

</>

)}

</div>

</main>

</div>
);
}