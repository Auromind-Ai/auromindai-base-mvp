'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
Search,
Phone,
Instagram,
Globe,
Mail,
Paperclip,
Zap,
Sparkles,
Send,
Clock,
User,
Star,
Calendar,
ArrowRight,
ChevronRight,
Info
} from 'lucide-react'

const API = "http://localhost:8000"

const CHANNELS = [
{ id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: '#22c55e' },
{ id: 'instagram', label: 'Instagram', icon: Instagram, color: '#ec4899' },
{ id: 'web', label: 'Web Chat', icon: Globe, color: '#3b82f6' },
{ id: 'email', label: 'Email', icon: Mail, color: '#f97316' }
]

export default function InboxPage() {

const [channel,setChannel]=useState(CHANNELS[0])
const [conversations,setConversations]=useState([])
const [messages,setMessages]=useState([])
const [selected,setSelected]=useState(null)
const [input,setInput]=useState("")
const [aiSuggestion,setAiSuggestion]=useState("")
const [showInfo,setShowInfo]=useState(true)

const bottomRef=useRef(null)

useEffect(()=>{
fetchConversations()
},[])

useEffect(()=>{
bottomRef.current?.scrollIntoView({behavior:"smooth"})
},[messages])

async function fetchConversations(){
const res=await fetch(`${API}/twilio/conversations`)
const data = await res.json()

if (Array.isArray(data)) {
setConversations(data)
} else if (Array.isArray(data.data)) {
setConversations(data.data)
} else {
setConversations([])
}
if(data.length>0){
setSelected(data[0])
fetchMessages(data[0].id)
}
}

async function fetchMessages(id){
const res=await fetch(`${API}/twilio/conversations/${id}`)
const data=await res.json()
setMessages(data)
}

async function sendMessage(){

if(!input.trim()) return

await fetch(`${API}/twilio/send-reply`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
conversation_id:selected.id,
phone:selected.phone,
message:input
})
})

setInput("")
fetchMessages(selected.id)

}

async function generateSuggestion(){

if(!selected) return

const res=await fetch(`${API}/twilio/ai-suggest`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
conversation_id:selected.id,
workspace_id:selected.workspace_id,
message:messages[messages.length-1]?.content || ""
})
})

const data=await res.json()
setAiSuggestion(data.suggestion)

}

function useSuggestion(){
setInput(aiSuggestion)
setAiSuggestion("")
}

const Icon = channel.icon

return (
<div className="h-screen flex flex-col bg-[#0f0f0f]">

<div className="flex items-center gap-1 px-4 py-3 bg-[#161616] border-b border-[#1f1f1f]">
{CHANNELS.map((c)=>{
const Ic=c.icon
const active=channel.id===c.id
return(
<button
key={c.id}
onClick={()=>setChannel(c)}
className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all ${active?'text-white':'text-[#666] hover:text-[#999]'}`}
style={{backgroundColor:active?c.color:'transparent'}}
>
<Ic size={15}/>
{c.label}
</button>
)
})}
</div>

<div className="flex flex-1 overflow-hidden">

<div className="w-[340px] bg-[#161616] border-r border-[#1f1f1f] flex flex-col">

<div className="p-4">
<div className="flex items-center gap-2 text-[13px] font-semibold mb-4" style={{color:channel.color}}>
<Icon size={15}/>
{channel.label} Leads
</div>

<div className="relative">
<Search size={15} className="absolute left-3 top-3 text-[#444]" />
<input
placeholder="Search"
className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white"
/>
</div>
</div>

<div className="flex-1 overflow-y-auto px-2">

{Array.isArray(conversations) && conversations.map((c)=>{

const selectedConv=selected?.id===c.id

return(
<button
key={c.id}
onClick={()=>{
setSelected(c)
fetchMessages(c.id)
}}
className={`w-full p-3 mb-1 rounded-xl text-left ${selectedConv?'bg-[#1f1f1f]':'hover:bg-[#1a1a1a]'}`}
>
<div className="flex items-center gap-3">

<div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold"
style={{backgroundColor:`${channel.color}18`,color:channel.color}}>
{c.phone?.slice(-2)}
</div>

<div className="flex-1">

<div className="text-[13px] text-white">
{c.phone}
</div>

<div className="text-[11px] text-[#666] truncate">
Conversation
</div>

</div>

</div>
</button>
)

})}

</div>

</div>

<div className="flex-1 flex flex-col bg-[#0f0f0f]">

{selected ? (

<>

<div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-b border-[#1f1f1f]">

<div className="flex items-center gap-3">

<div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold"
style={{backgroundColor:`${channel.color}18`,color:channel.color}}>
{selected.phone?.slice(-2)}
</div>

<div>
<h3 className="text-[14px] font-semibold text-white">
{selected.phone}
</h3>
<p className="text-[12px]" style={{color:channel.color}}>
{channel.label}
</p>
</div>

</div>

<button onClick={()=>setShowInfo(!showInfo)}>
<Info size={18}/>
</button>

</div>

<div className="flex-1 overflow-y-auto p-6">

<div className="max-w-3xl mx-auto space-y-3">

{messages.map((m)=>{

const isUser=m.sender_type==="USER"
const isAI=m.sender_type==="AI"

return(

<div key={m.id} className={`flex ${isUser?'justify-start':'justify-end'}`}>

{isAI && m.status==="SUGGESTED" ? (

<div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-500/20">

<div className="flex items-center gap-2 text-purple-400 mb-2">
<Sparkles size={13}/>
AI Suggestion
</div>

<p className="text-[13px] text-white">
{m.content}
</p>

<button
onClick={()=>setInput(m.content)}
className="mt-3 text-[12px] text-purple-400 flex items-center gap-1"
>
Use reply
<ChevronRight size={14}/>
</button>

</div>

) : (

<div
className={`max-w-[75%] px-4 py-3 ${isUser?'rounded-[20px_20px_20px_6px]':'rounded-[20px_20px_6px_20px]'}`}
style={{backgroundColor:isUser?'#1c1c1c':channel.color}}
>

<p className="text-[13px] text-white">
{m.content}
</p>

</div>

)}

</div>

)

})}

<div ref={bottomRef}/>

</div>

</div>

<div className="p-4 bg-[#161616] border-t border-[#1f1f1f]">

<div className="max-w-3xl mx-auto">

<div className="flex items-center gap-2 mb-3">

<button
onClick={generateSuggestion}
className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
style={{backgroundColor:`${channel.color}12`,color:channel.color}}
>
Suggest Reply
</button>

</div>

{aiSuggestion && (

<div className="p-3 mb-3 rounded-xl bg-purple-900/20 border border-purple-500/20">

<div className="flex justify-between items-center">

<p className="text-sm text-white">
{aiSuggestion}
</p>

<button
onClick={useSuggestion}
className="text-purple-400 text-xs"
>
Use
</button>

</div>

</div>

)}

<div className="flex items-center gap-3">

<input
value={input}
onChange={(e)=>setInput(e.target.value)}
placeholder="Type message..."
className="flex-1 px-4 py-3 bg-[#1c1c1c] border border-[#282828] rounded-xl text-[13px] text-white"
/>

<button
onClick={sendMessage}
className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold text-white"
style={{backgroundColor:channel.color}}
>
<Send size={16}/>
Send
</button>

</div>

</div>

</div>

</>

) : (

<div className="flex-1 flex items-center justify-center text-[#444]">
Select conversation
</div>

)}

</div>

<AnimatePresence>

{showInfo && selected && (

<motion.div
initial={{width:0}}
animate={{width:300}}
exit={{width:0}}
className="bg-[#161616] border-l border-[#1f1f1f]"
>

<div className="p-5">

<div className="text-white text-sm mb-4">
Lead Details
</div>

<div className="text-xs text-[#777]">
Phone
</div>

<div className="text-white mb-4">
{selected.phone}
</div>

</div>

</motion.div>

)}

</AnimatePresence>

</div>

</div>
)
}