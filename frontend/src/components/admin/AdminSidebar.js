"use client"

import React from 'react';
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBranding } from "@/context/BrandingContext"

import {
  LayoutDashboard,
  Building2,
  Users,
  Coins,
  BrainCircuit,
  MessageSquare,
  FileText,
  BarChart3,
  CreditCard,
  Activity,
  Shield,
  Plug,
  Brain,
  Heart,
  Key,
  Settings,
  LayoutTemplate
} from "lucide-react"

export default function AdminSidebar() {
  const pathname = usePathname()
  const { appName, appLogoUrl } = useBranding()

  const menu = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "RAG Analytics", href: "/admin/rag_analytics", icon: LayoutDashboard },
    { name: "Workspaces", href: "/admin/workspaces", icon: Building2 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Token Usage", href: "/admin/tokens", icon: Coins },
    { name: "Conversations", href: "/admin/conversations", icon: MessageSquare },
    { name: "Logs", href: "/admin/logs", icon: FileText },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Billing Operations", href: "/admin/billing-operations", icon: Activity },
    { name: "AI Governance", href: "/admin/ai-governance", icon: Shield },
    { name: "Integrations", href: "/admin/integrations", icon: Plug },
    { name: "RAG Brain", href: "/admin/rag", icon: Brain },
    { name: "System Health", href: "/admin/system", icon: Heart },
    { name: "Model Config", href: "/admin/model-config", icon: Key },
    { name: "Templates", href: "/admin/templates", icon: LayoutTemplate },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ]

  return (
    <div className="w-64 min-h-screen bg-[#050505] border-r border-white-[0.05] flex flex-col shadow-2xl flex-shrink-0 sticky top-0">
      
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3 relative">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          {appLogoUrl && appLogoUrl !== "/logo.png" ? (
            <img src={appLogoUrl} alt={appName} className="w-5 h-5 object-contain" />
          ) : (
            <BrainCircuit className="text-white w-5 h-5" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
            {appName}
          </span>
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest leading-tight">
            Admin Portal
          </span>
        </div>
      </div>

      {/* Navigation Scrollable Area */}
      <nav className="flex-1 px-4 pb-8 space-y-1 overflow-y-auto no-scrollbar relative custom-scrollbar">
        <div className="mb-4 px-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
            Management
          </p>
          <div className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? "text-white shadow-lg shadow-indigo-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90 transition-opacity" />
                  )}
                  
                  <div className="relative flex items-center gap-3.5 w-full">
                    <Icon 
                      size={18} 
                      className={`transition-colors duration-300 ${
                        isActive ? "text-white" : "group-hover:text-white"
                      }`} 
                    />
                    <span className="flex-1">{item.name}</span>
                    
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 px-4 pt-4 border-t border-white/5">
           <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all group">
             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
               <Heart size={16} className="text-red-400" />
             </div>
             <div>
               <p className="text-xs font-semibold text-white">Need Support?</p>
               <p className="text-[10px] text-gray-500">Contact Developers</p>
             </div>
           </div>
        </div>
      </nav>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  )
}