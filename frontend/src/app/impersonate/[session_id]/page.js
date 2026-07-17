"use client"

import { useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"

export default function Page({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { refreshUser } = useAuth()
  const lastSessionIdRef = useRef(null)

  useEffect(() => {
    async function start() {
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

        // Clear stale admin credentials so subsequent API calls
        // fall through to the httpOnly auth_token cookie (which the
        // backend just set to the impersonated user's JWT).
        // The API client uses credentials:'include', so the browser
        // sends the cookie automatically — no Authorization header needed.
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user")
        localStorage.removeItem("workspace")
        localStorage.removeItem("workspace_id")
        sessionStorage.removeItem("ai_active")
        sessionStorage.removeItem("last_session_id")

        // Refresh user context via cookie-only auth.
        // refreshUser() calls GET /auth/me and GET /auth/workspaces,
        // which now authenticate as the impersonated target user.
        await refreshUser()

        // Final redirect
        router.replace("/user/admin/dashboard")

      } catch (err) {
        alert("Impersonation failed: " + err.message)
        
        try {
          await api.stopImpersonation();
        } catch (stopErr) {
          // stop failure ignored
        }
        
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("workspace");
        localStorage.removeItem("workspace_id");
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

    if (resolvedParams?.session_id) {
      start()
    }
  }, [resolvedParams, refreshUser, router])

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