"use client"

import { useEffect, use } from "react"
import { setToken, setUser, setWorkspace, backupAdminToken } from "@/lib/auth"
import { useRouter } from "next/navigation"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export default function Page({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()

  useEffect(() => {
    async function start() {
      try {
        console.log("🚀 START IMPERSONATION PAGE")
        const sessionId = resolvedParams?.session_id
        
        if (!sessionId) {
          throw new Error("No session ID found")
        }

        const url = `${API_BASE}/admin/switch-user/session/${sessionId}`
        console.log("Calling API:", url)

        const res = await fetch(url, { cache: "no-store", credentials: 'include' })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.detail || "Failed to start session")
        }

        const data = await res.json()
        console.log("✅ [DEBUG] Session Data:", data)
        
        if (!data.user) {
           throw new Error("Invalid session response from server")
        }

        // Clear storage of previous session cache
        localStorage.removeItem("user")
        localStorage.removeItem("workspace")
        localStorage.removeItem("workspace_id")
        sessionStorage.clear()

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
              localStorage.setItem("workspace_id", targetWorkspace.id)
            } else {
              console.warn("⚠️ No workspace found")
              localStorage.removeItem("workspace")
            }
          }
        } catch (wsErr) {
          console.error("Failed workspace fetch", wsErr)
        }

        console.log("🚀 [DEBUG] Final check before redirect:", {
            token: !!localStorage.getItem('token'),
            user: !!localStorage.getItem('user'),
            is_imp: localStorage.getItem('is_impersonating')
        })

        // 3. Final Redirect
        window.location.replace("/user/admin/dashboard")

      } catch (err) {
        console.error("❌ [CRITICAL] Impersonation failed:", err)
        alert("Impersonation failed: " + err.message)
      }
    }

    if (resolvedParams?.session_id) {
      start()
    }
  }, [resolvedParams])

  return (
    <div className="flex items-center justify-center h-screen text-white">
      Starting impersonation session...
    </div>
  )
}