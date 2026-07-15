"use client"

import { useEffect, use, useRef } from "react"
import { setUser, setWorkspace } from "@/lib/auth"
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

        localStorage.removeItem("user")
        localStorage.removeItem("workspace")
        localStorage.removeItem("workspace_id")
        sessionStorage.removeItem("ai_active")
        sessionStorage.removeItem("last_session_id")

        // 2. Fetch Workspaces
        let targetWorkspace = null
        try {
          const wsData = await api.getWorkspaces({
            headers: { 'Authorization': `Bearer ${data.token}` }
          })
          
          const { workspaces = [] } = wsData
          
          try {
            const payload = JSON.parse(atob(data.token.split(".")[1]))
            if (payload.workspace_id) {
               targetWorkspace = workspaces.find(w => w.id === payload.workspace_id)
            }
          } catch (pErr) { /* ignore payload decode errors */ }

          if (!targetWorkspace && workspaces.length > 0) targetWorkspace = workspaces[0]
          
          if (targetWorkspace) {
            setWorkspace(targetWorkspace)
            localStorage.setItem("workspace_id", targetWorkspace.id)
          } else {
            localStorage.removeItem("workspace")
          }
        } catch (wsErr) {
          // fetch failure logged internally or ignored
        }

        // Validate workspace is determined before proceeding
        if (!targetWorkspace) {
          throw new Error("Unable to determine active workspace")
        }

        // Refresh user context with impersonated user profile
        await refreshUser()

        // 3. Final Redirect in the same tab without full reload
        router.replace("/user/admin/dashboard")

      } catch (err) {
        alert("Impersonation failed: " + err.message)
        
        try {
          await api.stopImpersonation();
        } catch (stopErr) {
          // stop failure ignored
        }
        
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