'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from "../AnimatedCounter";
import { setToken, getAdminBackup, restoreAdminToken } from "@/lib/auth";
import {
  Bell,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  MoreHorizontal,
  ShieldAlert  
} from 'lucide-react';

const METRICS = [
  {
    label: 'Total Revenue',
    value: '₹12.4L',
    change: '+18.2%',
    trend: 'up',
    subtext: 'vs last month',
    gradient: 'from-blue-500 via-cyan-400 to-emerald-400'
  },
  {
    label: 'Active Leads',
    value: '124',
    change: '+12%',
    trend: 'up',
    subtext: 'vs last week',
    gradient: 'from-yellow-400 via-amber-400 to-orange-500'
  },
  {
    label: 'Conversion Rate',
    value: '18%',
    change: '-2.1%',
    trend: 'down',
    subtext: 'vs target',
    gradient: 'from-purple-500 via-fuchsia-500 to-indigo-500'
  },
  {
    label: 'Avg. Response Time',
    value: '12m',
    change: '8m',
    trend: 'neutral',
    subtext: 'improving',
    gradient: 'from-orange-600 via-red-500 to-rose-600'
  },
];

const ATTENTION_ITEMS = [
  { id: 1, name: 'Rahul Sharma', status: 'Documents Pending', time: '12 min ago', priority: 'high' },
  { id: 2, name: 'Priya Patel', status: 'Demo Not Scheduled', time: '45 min ago', priority: 'medium' },
  { id: 3, name: 'Amit Kumar', status: 'Follow-up Overdue', time: '2h ago', priority: 'high' },
  { id: 4, name: 'Sneha Gupta', status: 'Contract Review', time: '4h ago', priority: 'low' },
];

const AI_INSIGHTS = [
  { text: '3 leads from LinkedIn show high engagement today.' },
  { text: 'WhatsApp messages sent between 2–4 PM convert 15% better.' },
];

export default function DashboardPage({ children }) {
  const [mounted, setMounted] = useState(false);
  const [isImpersonated, setIsImpersonated] = useState(false);


useEffect(() => {

  console.log("📊 DASHBOARD LOADED")

  const token = localStorage.getItem("token")

  console.log("Stored token:", token)

  if (!token) {
    console.log("⚠️ No token found")
    setMounted(true)
    return
  }

  const payload = decodeJwt(token)

  console.log("TOKEN WORKSPACE:", payload.workspace_id)

  console.log("LOCALSTORAGE WORKSPACE:", localStorage.getItem("workspace"))
  console.log("LOCALSTORAGE WORKSPACE_ID:", localStorage.getItem("workspace_id"))

  console.log("Decoded token payload:", payload)

  console.log("Workspace ID from token:", payload?.workspace_id)

  console.log("Impersonated:", payload?.impersonated)

  if (payload?.impersonated) {
    console.log("🟡 ADMIN IMPERSONATION MODE")
    setIsImpersonated(true)
  }

  setMounted(true)

}, [])
if (!mounted) return null;
  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      {isImpersonated && (
        <div className="w-full flex items-center justify-center gap-2.5 bg-amber-500/10 border-b border-amber-500/25 px-6 py-2.5 text-amber-400 text-sm font-semibold">
          <ShieldAlert size={15} />
          Admin Viewing Mode — you are viewing this dashboard as the user.
          <button
            onClick={exitImpersonation}
            className="ml-4 px-3 py-1 rounded bg-amber-600/10 text-amber-300 text-xs"
          >
            Exit impersonation
          </button>
        </div>
      )}

      <div className="max-w-[1700px] mx-auto px-6 py-8 space-y-10">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Overview of your business performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-white/10 bg-white/5 hover:bg-white/10">
              <Calendar size={14} />
              Last 7 Days
              <ChevronDown size={14} />
            </button>

            <button className="relative p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>

          </div>
        </header>
        {/* METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {METRICS.map((metric, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -6, scale: 1.02 }}
          className="relative rounded-xl overflow-hidden shadow-xl"
        >

          {/* Gradient Background */}

          <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-90`} />

          {/* Glass Overlay */}

          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border border-white/10" />

          {/* Content */}

          <div className="relative z-10 p-6">

            <div className="flex justify-between mb-4">

              <p className="text-xs uppercase text-white/80 tracking-wider">
                {metric.label}
              </p>

              <span className={`flex items-center gap-1 text-xs font-semibold
              ${metric.trend === 'up'
                ? 'text-emerald-300'
                : metric.trend === 'down'
                ? 'text-red-300'
                : 'text-zinc-300'}`}>

                {metric.trend === 'up' && <ArrowUpRight size={14} />}
                {metric.trend === 'down' && <ArrowDownRight size={14} />}

                {metric.change}

              </span>
            </div>

            <h3 className="text-3xl font-bold text-white">

              {metric.label === "Total Revenue" && (
                <AnimatedCounter
                  value={12.4}
                  formatter={(v)=>`₹${v.toFixed(1)}L`}
                />
              )}

              {metric.label === "Active Leads" && (
                <AnimatedCounter value={124} />
              )}

              {metric.label === "Conversion Rate" && (
                <AnimatedCounter value={18} formatter={(v)=>`${Math.floor(v)}%`} />
              )}

              {metric.label === "Avg. Response Time" && (
                <AnimatedCounter value={12} formatter={(v)=>`${Math.floor(v)}m`} />
              )}

            </h3>

            <p className="text-xs text-white/70 mt-1">
              {metric.subtext}
            </p>

          </div>

        </motion.div>
          ))}
        </section>
        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* LEFT SIDE */}
          <div className="xl:col-span-2 space-y-8">

            {/* ANALYTICS CHART */}
            <div className="rounded-xl bg-[#0f0f15] border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold">
                  Performance Analytics
                </h2>

                <span className="text-xs text-zinc-400">
                  Last 7 days
                </span>
              </div>

              {/* Simple animated bar chart */}
              <div className="flex items-end gap-2 h-[220px]">
                {[45,65,55,80,60,95,75,85,65,90].map((v,i)=>(
                  <motion.div
                    key={i}
                    initial={{height:0}}
                    animate={{height:`${v}%`}}
                    transition={{delay:i*0.05}}
                    className="w-full rounded bg-gradient-to-t from-purple-500 to-indigo-500"
                  />
                ))}
              </div>
            </div>

            {/* NEEDS ATTENTION */}
            <div className="rounded-xl bg-[#0f0f15] border border-white/5">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">

                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="text-indigo-400" />
                  Needs Attention
                </h2>

                <button className="text-xs text-zinc-400 hover:text-white">
                  View All
                </button>
              </div>

              <div className="p-4 space-y-2">
                {ATTENTION_ITEMS.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{x:4}}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5"
                  >

                    <div className="flex items-center gap-4">

                      <div className={`w-2 h-2 rounded-full
                      ${item.priority === 'high'
                          ? 'bg-red-500'
                          : item.priority === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-zinc-500'}`} />

                      <div>
                        <p className="text-sm font-medium">
                          {item.name}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {item.status}
                        </p>

                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500">
                        {item.time}
                      </span>
                      <MoreHorizontal size={16} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-8">

            {/* AI PANEL */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6">

              <div className="flex items-center gap-2 text-indigo-400 mb-4">
                <Sparkles size={16} />
                AI Insights
              </div>

              <div className="space-y-3">
                {AI_INSIGHTS.map((insight, i) => (

                  <div
                    key={i}
                    className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10"
                  >
                    <p className="text-sm text-indigo-100/70">
                      {insight.text}
                    </p>
                  </div>

                ))}
              </div>

              <button className="w-full mt-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500">
                View Full Report
              </button>
            </div>

            {/* SCHEDULE */}
            <div className="rounded-xl bg-[#0f0f15] border border-white/5 p-6">

              <h3 className="text-sm font-semibold mb-4">
                Upcoming Schedule
              </h3>

              <div className="space-y-4">
                {[
                  { date: 24, title: 'Team Review', time: '2:00 PM • Zoom' },
                  { date: 25, title: 'Product Launch', time: '10:00 AM • Main Hall' }
                ].map((event, i) => (

                  <div key={i} className="flex items-center gap-4">

                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-sm font-semibold">
                      {event.date}
                    </div>
                    <div>

                      <p className="text-sm">
                        {event.title}
                      </p>

                      <p className="text-xs text-zinc-500">
                        {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* TODAY FLOW */}
              <div className="rounded-xl bg-[#0f0f15] border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-semibold text-white">
                    Today's Flow
                  </h2>
                  <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                    Live
                  </span>
                </div>

                {/* Gradient Progress Pipeline */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden flex mb-8">

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "30%" }}
                    transition={{ duration: 0.6 }}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500"
                  />

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "20%" }}
                    transition={{ duration: 0.7 }}
                    className="bg-gradient-to-r from-indigo-500 to-blue-500"
                  />

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "15%" }}
                    transition={{ duration: 0.8 }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  />

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "35%" }}
                    transition={{ duration: 0.9 }}
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500"
                  />
                </div>

                {/* Flow Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

                  {[
                    { label: 'New', count: 42 },
                    { label: 'Working', count: 28 },
                    { label: 'Review', count: 12 },
                    { label: 'Closed', count: 24 }
                  ].map((stat, i) => (

                    <motion.div
                      key={i}
                      whileHover={{ y: -4 }}
                      className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition"
                    >

                      <p className="text-2xl font-bold text-white">
                        {stat.count}
                      </p>

                      <p className="text-xs text-zinc-400 mt-1">
                        {stat.label}
                      </p>

                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}
const exitImpersonation = () => {
    const ok = restoreAdminToken();
    if (!ok) {
      alert("No admin backup token found. Please log in again as admin.");
      return;
    }
    // reload so UI uses admin token again
    window.location.reload();
  };