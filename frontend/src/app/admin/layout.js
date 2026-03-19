"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { getToken } from "@/lib/auth"

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // Skip auth check for the admin login page itself
    if (pathname === "/admin/login") {
      setIsAuthorized(true)
      return
    }

    const token = getToken()

    if (!token || token === "null") {
      router.push("/admin/login?redirect=" + encodeURIComponent(pathname))
      return
    }

    setIsAuthorized(true)
  }, [router, pathname])

  // For admin login page - render without the sidebar/layout
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen bg-[#020202] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
          <p className="text-gray-500 text-xs">Checking access...</p>
        </div>
      </div>
    )
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
             onClick={() => {
               localStorage.clear()
               router.push("/admin/login")
             }}
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