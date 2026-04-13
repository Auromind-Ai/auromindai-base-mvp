"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { setToken, setUser, setWorkspace, backupAdminToken } from "@/lib/auth"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export default function Page() {

  const params = useParams()

  useEffect(() => {
    async function start() {
      try {
        console.log("🚀 START IMPERSONATION PAGE")
        const sessionId = params?.session_id
        
        if (!sessionId) {
          throw new Error("No session ID found")
        }

        const url = `${API_BASE}/admin/impersonate/session/${sessionId}`
        console.log("Calling API:", url)

        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.detail || "Failed to start session")
        }

        const data = await res.json()
        console.log("[DEBUG] Session Data:", data)
        
        if (!data.token || !data.user) {
           throw new Error("Invalid session response from server")
        }

        // 1. Storage Operations
        console.log("💾 [DEBUG] Storage: Backing up admin and setting user...")
        backupAdminToken()
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem("is_impersonating", "true")

        // 2. Fetch Workspaces
        console.log("🔍 [DEBUG] Fetching workspaces...")
        try {
          const wsRes = await fetch(`${API_BASE}/auth/workspaces`, {
            headers: { 'Authorization': `Bearer ${data.token}` }
          })
          
          if (wsRes.ok) {
            const { workspaces = [] } = await wsRes.json()
            console.log("🏢 [DEBUG] Workspaces:", workspaces)
            
            let targetWorkspace = null
            try {
              const payload = JSON.parse(atob(data.token.split(".")[1]))
              if (payload.workspace_id) {
                 targetWorkspace = workspaces.find(w => w.id === payload.workspace_id)
              }
            } catch (pErr) { console.warn("Payload decode fail", pErr) }

            if (!targetWorkspace && workspaces.length > 0) targetWorkspace = workspaces[0]
            
            if (targetWorkspace) {
              console.log("📍 [DEBUG] Setting workspace:", targetWorkspace.name)
              setWorkspace(targetWorkspace)
              sessionStorage.setItem("workspace_id", targetWorkspace.id)
            } else {
              console.warn("⚠️ No workspace found")
              sessionStorage.removeItem("workspace")
            }
          }
        } catch (wsErr) {
          console.error("Failed workspace fetch", wsErr)
        }

        console.log("🚀 [DEBUG] Final check before redirect:", {
            token: !!sessionStorage.getItem('token'),
            user: !!sessionStorage.getItem('user'),
            is_imp: localStorage.getItem('is_impersonating')
        })

        // 3. Final Redirect
        window.location.replace("/user/admin/dashboard")

      } catch (err) {
        console.error("❌ [CRITICAL] Impersonation failed:", err)
        alert("Impersonation failed: " + err.message)
      }
    }

    if (params?.session_id) {
      start()
    }
  }, [params])

  return (
    <div className="flex items-center justify-center h-screen text-white">
      Starting impersonation session...
    </div>
  )
}
