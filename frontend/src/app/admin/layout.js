"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import AdminSidebar from "@/components/admin/AdminSidebar"

import api from "@/lib/api"

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === "/admin"

  const [mounted, setMounted] = useState(false)
  const [authVerified, setAuthVerified] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!mounted || isLoginPage) return

    let active = true
    const checkAuth = async () => {
      try {
        await api.getPlatformDashboard()
        if (active) setAuthVerified(true)
      } catch (err) {
        if (!active) return
        // 401 = new AdminConsoleMiddleware response; 403/404 = legacy; 0/408 = network/timeout
        const isAuthError = err.status === 401 || err.status === 403 || err.status === 404
        const isNetworkError = err.isNetworkError || err.isTimeout || err.status === 0 || err.status === 408
        if (isAuthError) {
          router.push("/admin")
        } else if (isNetworkError) {
          // Backend unreachable - still try to render the page; individual pages handle their own errors
          setAuthVerified(true)
        }
        // Unknown errors: do not redirect, let the page handle it
      }
    }
    checkAuth()
    return () => {
      active = false
    }
  }, [mounted, isLoginPage, router])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    )
  }

  // For admin login page - render without the sidebar/layout
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!authVerified) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await api.adminLogout()
    } catch (e) {
      console.error("Sign out failed", e)
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem("admin_csrf_token");
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