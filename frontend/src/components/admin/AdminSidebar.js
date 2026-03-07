"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
  TrendingUp,
  Settings
} from "lucide-react"

export default function AdminSidebar() {

  const pathname = usePathname()

  const menu = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Workspaces", href: "/admin/workspaces", icon: Building2 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Token Usage", href: "/admin/tokens", icon: Coins },
    { name: "Conversations", href: "/admin/conversations", icon: MessageSquare },
    { name: "Logs", href: "/admin/logs", icon: FileText },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "AI Activity", href: "/admin/ai-activity", icon: Activity },
    { name: "AI Governance", href: "/admin/ai-governance", icon: Shield },
    { name: "Integrations", href: "/admin/integrations", icon: Plug },
    { name: "RAG Brain", href: "/admin/rag", icon: Brain },
    { name: "System Health", href: "/admin/system", icon: Heart },
    { name: "AI Learning", href: "/admin/ai-learning", icon: TrendingUp },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ]

  return (
    <div className="w-64 min-h-full bg-[#0f0f0f] border-r border-white/10 flex flex-col">

      {/* Logo */}
      <div className="p-6 text-lg font-semibold text-white">
        Admin Panel
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-1 px-3">

        {menu.map((item) => {

          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                pathname === item.href
                  ? "bg-indigo-500 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          )
        })}

      </div>

    </div>
  )
}