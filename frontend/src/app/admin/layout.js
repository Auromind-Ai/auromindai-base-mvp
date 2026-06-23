"use client"

import { usePathname, useRouter } from "next/navigation"
import AdminSidebar from "@/components/admin/AdminSidebar"

import api from "@/lib/api"

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === "/admin"

  // For admin login page - render without the sidebar/layout
  if (isLoginPage) {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    try {
      await api.adminLogout()
    } catch (e) {
      console.error("Sign out failed", e)
    }
    // Redirect to the admin login page
    router.push("/admin")
  }

  return (
    <div className="flex min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 selection:text-white">
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar Container */}
      <AdminSidebar />

      {/* Content Area */}
      <main className="flex-1 relative overflow-x-hidden">
        {/* Top Navbar */}
        <div className="h-16 border-b border-white/[0.03] flex items-center justify-between px-8 relative bg-[#020202]/50 backdrop-blur-xl sticky top-0 z-40">
           <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
             <span>Platform Monitoring</span>
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
           </div>
           <button
             onClick={handleSignOut}
             className="text-xs text-gray-600 hover:text-red-400 transition-colors px-3 py-1 rounded-lg hover:bg-red-500/10"
           >
             Sign Out
           </button>
        </div>

        <div className="p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>

    </div>
  )
}