"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function Page() {
  const params = useParams()
  const { refreshUser } = useAuth()

  useEffect(() => {
    async function start() {
      try {
        console.log("🚀 START IMPERSONATION PAGE")
        const sessionId = params?.session_id
        
        if (!sessionId) {
          throw new Error("No session ID found")
        }

        const url = `/api/admin/impersonate/session/${sessionId}`
        console.log("Calling API:", url)

        const res = await fetch(url, { cache: "no-store", credentials: 'include' })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.detail || "Failed to start session")
        }

        const data = await res.json()
        console.log("[DEBUG] Session Data:", data)
        
        if (!data.user) {
           throw new Error("Invalid session response from server")
        }

        // Clear storage of previous session cache
        localStorage.removeItem("user")
        localStorage.removeItem("workspace")
        localStorage.removeItem("workspace_id")
        sessionStorage.clear()

        // Sync fresh profile state from set cookies
        await refreshUser()

        // Redirect to dashboard
        window.location.replace("/user/admin/dashboard")

      } catch (err) {
        console.error("❌ [CRITICAL] Impersonation failed:", err)
        alert("Impersonation failed: " + err.message)
      }
    }

    if (params?.session_id) {
      start()
    }
  }, [params, refreshUser])

  return (
    <div className="flex items-center justify-center h-screen text-white">
      Starting impersonation session...
    </div>
  )
}
