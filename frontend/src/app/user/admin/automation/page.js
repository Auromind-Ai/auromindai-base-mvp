'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
Search,
Plus,
Filter,
Zap,
MessageSquare,
Users,
Clock,
CheckCircle2,
Play,
Save,
MoreHorizontal,
Sparkles,
ChevronDown,
ArrowDown,
Shield,
Bot,
Send,
UserPlus,
Tag,
Bell,
Wand2,
X,
Split,
Activity
} from 'lucide-react';

const TRIGGERS = [
{ id: 'new_lead', label: 'New lead created', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/10' },
{ id: 'msg_recv', label: 'Message received', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
{ id: 'flow_done', label: 'Flow completed', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
{ id: 'no_reply', label: 'No reply for X minutes', icon: Clock, color: 'text-rose-400', bg: 'bg-rose-400/10' },
{ id: 'deal_move', label: 'Deal moved to stage', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

const ACTIONS = [
{ id: 'send_msg', label: 'Send message', icon: Send },
{ id: 'assign_agent', label: 'Assign agent', icon: Users },
{ id: 'create_task', label: 'Create task', icon: CheckCircle2 },
{ id: 'move_stage', label: 'Move pipeline stage', icon: Split },
{ id: 'notification', label: 'Send notification', icon: Bell },
{ id: 'add_tag', label: 'Add tag', icon: Tag },
];

const INITIAL_AUTOMATIONS = [
{ id: 1, name: 'Lead Nudge - WhatsApp', trigger: 'no_reply', status: 'Active', lastRun: '12m ago' },
{ id: 2, name: 'Auto-assign Instagram Leads', trigger: 'new_lead', status: 'Active', lastRun: '1h ago' },
{ id: 3, name: 'Welcome Flow Trigger', trigger: 'msg_recv', status: 'Paused', lastRun: '2d ago' },
{ id: 4, name: 'Deal Conversion Alert', trigger: 'deal_move', status: 'Draft', lastRun: 'Never' },
];

export default function AutomationPage() {

const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
const [selectedItem, setSelectedItem] = useState(INITIAL_AUTOMATIONS[0]);
const [search, setSearch] = useState('');
const [isMounted, setIsMounted] = useState(false);
const [aiInput, setAiInput] = useState('');
const [showBuilder, setShowBuilder] = useState(false);

useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) return null;
        const filteredAutomations = automations.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-[#06070A] text-zinc-200">

        {/* TOP BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 h-auto sm:h-16 py-2 border-b border-white/10 bg-[#06070A]">

            <div className="flex items-center justify-between w-full sm:w-auto gap-3">

            <h1 className="text-base sm:text-lg font-semibold text-white">Automations</h1>

            <div className="relative">

                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />

                <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations..."
                className="w-full sm:w-64 lg:w-72 h-9 pl-9 pr-4 bg-[#0F1115] border border-white/10 rounded-lg text-sm outline-none focus:border-indigo-500/40"
                />
            </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

            <button className="flex items-center gap-2 px-3 px-3 py-1.5 text-xs sm:text-sm sm:text-sm bg-[#0F1115] border border-white/10 rounded-lg hover:border-indigo-500/40">
            <Filter size={14}/>
            Status
            </button>

            <button className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/20 hover:opacity-90">
            <Plus size={16}/>
            Create
            </button>
        </div>
    </header>

{/* MAIN LAYOUT */}

<main className="flex flex-1 overflow-hidden max-w-[1500px] mx-auto w-full">

{/* LEFT LIST */}

<aside className={`
border-r border-white/10 bg-[#06070A] overflow-y-auto
w-full lg:w-[320px]
${showBuilder ? 'hidden lg:block' : 'block'}
`}>

{filteredAutomations.map(item=>{

const active = selectedItem?.id===item.id;
const trigger = TRIGGERS.find(t=>t.id===item.trigger);
const Icon = trigger?.icon || Zap;

return(

<div
key={item.id}
onClick={()=>{
setSelectedItem(item);
setShowBuilder(true);
}}
className={`p-4 cursor-pointer transition border-l-2 ${
active
? 'bg-[#0F1115] border-indigo-500'
: 'border-transparent hover:bg-[#0F1115]'
}`}>

<div className="flex justify-between items-center mb-2">

<p className={`text-sm font-medium ${active?'text-white':'text-zinc-400'}`}>
{item.name}
</p>

<div className={`w-8 h-4 rounded-full p-0.5 ${
item.status==='Active'
?'bg-indigo-500'
:'bg-zinc-700'
}`}>
<div className={`w-3 h-3 rounded-full bg-white transition-transform ${
item.status==='Active'
?'translate-x-4'
:''
}`}/>
</div>

</div>

<div className="flex items-center gap-3 text-xs text-zinc-500">

<div className={`w-7 h-7 flex items-center justify-center rounded-lg ${trigger?.bg} ${trigger?.color}`}>
<Icon size={14}/>
</div>

<div className="flex flex-col">
<span>{trigger?.label}</span>
<span className="text-zinc-600">Last run {item.lastRun}</span>
</div>

</div>

</div>

);

})}

</aside>

{/* CENTER BUILDER */}

<div className={`
flex-1 overflow-y-auto relative
${showBuilder ? 'block' : 'hidden lg:block'}
`}>

<AnimatePresence mode="wait">

{selectedItem && (

<motion.div
key={selectedItem.id}
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
exit={{opacity:0}}
transition={{duration:0.2}}
className="max-w-[720px] mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12 space-y-6"
>

{/* HEADER */}

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

    <div className="flex items-center gap-2 flex-1 min-w-0">

<button
onClick={()=>setShowBuilder(false)}
className="lg:hidden text-zinc-400 hover:text-white"
>
←
</button>

<input
defaultValue={selectedItem.name}
className="text-sm sm:text-lg font-semibold bg-transparent outline-none text-white truncate"
/>

</div>

<div className="flex gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">

<button className="px-2 py-1 text-[11px] sm:text-sm bg-[#0F1115] border border-white/10 rounded-lg flex gap-1 items-center">
<Play size={14}/>Test
</button>

<button className="px-2 py-1 text-[11px] sm:text-sm bg-[#0F1115] border border-white/10 rounded-lg flex gap-1 items-center">
<Save size={14}/>Save
</button>

<button className="px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg font-medium">
Publish
</button>

</div>

</div>

{/* WORKFLOW */}

<div className="space-y-3 sm:space-y-6">

{/* TRIGGER */}

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-3 sm:p-5 lg:p-6 hover:border-indigo-500/30 transition shadow-lg shadow-black/20">

<div className="flex items-center justify-between gap-3">

<div className="flex items-center gap-3 min-w-0">

<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
<Clock size={20}/>
</div>

<div>

<p className="text-sm font-medium text-white leading-tight truncate">No reply for 60 minutes</p>
<p className="text-xs text-zinc-400 leading-tight">When a customer message sits unreplied.</p>

</div>

</div>

<ChevronDown size={18} className="text-zinc-500"/>

</div>

</div>

<div className="flex justify-center opacity-30 py-0">
<ArrowDown size={14}/>
</div>

{/* CONDITION */}

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-3 sm:p-5 lg:p-6 hover:border-indigo-500/30">

<div className="flex items-center justify-between gap-3">

<div className="flex gap-3 sm:gap-4 items-center">

<div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-white/5 flex items-center justify-center">
<Filter size={20}/>
</div>

<p className="text-sm text-zinc-300 font-medium">
If Channel = WhatsApp
</p>

</div>

<X size={18} className="text-zinc-500"/>

</div>

</div>

<div className="flex justify-center opacity-30">
<ArrowDown size={22}/>
</div>

{/* ACTION */}

<div className="bg-[#0F1115] border border-emerald-500/20 rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-emerald-500/5">

<div className="flex justify-between mb-6">

<div className="flex items-center gap-3 min-w-0">

<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
<Send size={22}/>
</div>

<div>
<p className="font-medium text-white">Send "Wait Nudge"</p>
<p className="text-sm text-zinc-400">Automatic reply via WhatsApp</p>
</div>
</div>

<MoreHorizontal size={18}/>
</div>
<div className="bg-[#111318] border border-white/10 rounded-xl p-4">
<div className="flex justify-between mb-2">
<span className="text-xs uppercase text-zinc-500">Template</span>
<span className="text-xs text-indigo-400 cursor-pointer">
Edit Template
</span>
</div>

<p className="text-sm text-zinc-400 italic">
"Hi {'{{'}name{'}}'}, just checking if you had any questions."
</p>

</div>
</div>
</div>
</motion.div>
)}

</AnimatePresence>

{/* MOBILE / TABLET STATS */}

<div className="xl:hidden mt-6 space-y-6 px-4 sm:px-6 pb-24">

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-4">

<h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
Orchestration Stats
</h3>

<div className="space-y-3 text-sm">

<div className="flex justify-between">
<span className="text-zinc-400">Runs</span>
<span className="text-white font-semibold">1.4K</span>
</div>

<div className="flex justify-between">
<span className="text-zinc-400">Success</span>
<span className="text-emerald-400 font-semibold">99.2%</span>
</div>

<div className="flex justify-between">
<span className="text-zinc-400">Response</span>
<span className="text-indigo-400 font-semibold">4.2s</span>
</div>

</div>

</div>

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-4">

<h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
System Nodes
</h3>

<div className="space-y-3">

{[
{ label:'MCP Execution',status:'Online',icon:Bot,color:'text-indigo-400'},
{ label:'RAG Policy Check',status:'Verified',icon:Shield,color:'text-emerald-400'},
{ label:'Scheduler',status:'Active',icon:Clock,color:'text-amber-400'}
].map((n,i)=>(
<div key={i} className="flex items-center gap-3">

<div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${n.color}`}>
<n.icon size={16}/>
</div>

<div className="text-sm">
<p className="text-white">{n.label}</p>
<p className="text-zinc-500 text-xs">{n.status}</p>
</div>

</div>
))}

</div>

</div>

</div>

{/* AI ASSISTANT */}
<div className="fixed bottom-3 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[520px] bg-[#0F1115] border border-indigo-500/20 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-2xl shadow-indigo-500/10">

<div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-indigo-400">
<Sparkles size={14}/>AI Builder
</div>

<div className="flex gap-2 items-center">

<input
value={aiInput}
onChange={(e)=>setAiInput(e.target.value)}
placeholder="Describe automation..."
className="flex-1 min-w-0 bg-transparent outline-none text-sm text-zinc-300"
/>

<button className="px-3 py-1 bg-indigo-600 rounded-lg text-sm">
Build
</button>

</div>

</div>

</div>

{/* RIGHT PANEL */}

<aside className="
hidden xl:block
w-[280px] border-l border-white/10 p-4 sm:p-5 lg:p-6 space-y-8
">

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-4">

<h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
Orchestration Stats
</h3>

<div className="space-y-3 text-sm">

<div className="flex justify-between">
<span className="text-zinc-400">Runs</span>
<span className="text-white font-semibold">1.4K</span>
</div>

<div className="flex justify-between">
<span className="text-zinc-400">Success</span>
<span className="text-emerald-400 font-semibold">99.2%</span>
</div>

<div className="flex justify-between">
<span className="text-zinc-400">Response</span>
<span className="text-indigo-400 font-semibold">4.2s</span>
</div>

</div>

</div>

<div className="bg-[#0F1115] border border-white/10 rounded-xl p-4">

<h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
System Nodes
</h3>

<div className="space-y-3">

{[
{ label:'MCP Execution',status:'Online',icon:Bot,color:'text-indigo-400'},
{ label:'RAG Policy Check',status:'Verified',icon:Shield,color:'text-emerald-400'},
{ label:'Scheduler',status:'Active',icon:Clock,color:'text-amber-400'}
].map((n,i)=>(
<div key={i} className="flex items-center gap-3">

<div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${n.color}`}>
<n.icon size={16}/>
</div>

<div className="text-sm">
<p className="text-white">{n.label}</p>
<p className="text-zinc-500 text-xs">{n.status}</p>
</div>

</div>
))}

</div>

</div>

</aside>

</main>

</div>

);

}