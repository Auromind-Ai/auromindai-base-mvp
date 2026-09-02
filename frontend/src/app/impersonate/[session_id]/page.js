"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"
import api from "@/lib/api"

export default function Page({ params }) {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const { showToast } = useToast()
  const lastSessionIdRef = useRef(null)

  useEffect(() => {
    async function start() {
      // Resolve params safely whether it's a Promise (Next.js 15) or dynamic route object (React 18 / fallback)
      const resolvedParams = params && typeof params.then === 'function' ? await params : params
      const sessionId = resolvedParams?.session_id
      
      if (!sessionId) {
        throw new Error("No session ID found")
      }

      if (lastSessionIdRef.current === sessionId) {
        return
      }
      lastSessionIdRef.current = sessionId

      try {
        const data = await api.switchUserSession(sessionId)
        
        if (!data.user) {
           throw new Error("Invalid session response from server")
        }

        if (data.admin_backup_token) {
          localStorage.setItem("admin_backup_token", data.admin_backup_token);
        }
        if (data.access_token || data.token) {
          localStorage.setItem("auth_token", data.access_token || data.token);
        } else {
          localStorage.removeItem("auth_token");
        }
        localStorage.removeItem("user");
        localStorage.removeItem("workspace");
        localStorage.removeItem("workspace_id");
        sessionStorage.removeItem("ai_active");
        sessionStorage.removeItem("last_session_id");

        // Refresh user context via cookie/token auth.
        // refreshUser() calls GET /auth/me and GET /auth/workspaces,
        // which now authenticate as the impersonated target user.
        await refreshUser()

        // Final redirect
        router.replace("/user/admin/dashboard")

      } catch (err) {
        showToast("Impersonation failed: " + err.message, "error")
        
        try {
          await api.stopImpersonation();
        } catch (stopErr) {
          // stop failure ignored
        }
        
        const backup = typeof window !== 'undefined' ? localStorage.getItem("admin_backup_token") : null;
        if (backup) {
          localStorage.setItem("auth_token", backup);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("workspace");
        localStorage.removeItem("workspace_id");
        localStorage.removeItem("admin_backup_token");
        sessionStorage.removeItem("ai_active");
        sessionStorage.removeItem("last_session_id");
        
        try {
          await refreshUser();
        } catch (refreshErr) {
          // refresh failure ignored
        }
        
        router.replace("/admin/users");
      }
    }

    start()
  }, [params, refreshUser, router])

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-white select-none relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-indigo-500/25 animate-ping" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mt-4">Switching Session</h2>
        <p className="text-sm text-gray-400">Please wait while we securely load the user profile and workspace...</p>
      </div>
    </div>
  )
}