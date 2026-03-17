"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { setToken, backupAdminToken } from "@/lib/auth"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export default function Page() {

  const params = useParams()

  useEffect(() => {

    async function start() {

      console.log("🚀 START IMPERSONATION PAGE")

      console.log("Session param:", params.session_id)

      const url = `${API_BASE}/admin/impersonate/session/${params.session_id}`

      console.log("Calling API:", url)

      const res = await fetch(url, { cache: "no-store" })

      console.log("API status:", res.status)

      const data = await res.json()

      console.log("Received token:", data.token)

      const payload = JSON.parse(atob(data.token.split(".")[1]))

      console.log("Decoded token payload:", payload)

      // backup admin token
      backupAdminToken()
setToken(data.token)

const wsRes = await fetch(`${API_BASE}/auth/workspaces`, {
  headers: {
    Authorization: `Bearer ${data.token}`
  }
})

const dataWs = await wsRes.json()
const workspaces = dataWs.workspaces

const workspace = workspaces.find(w => w.id === payload.workspace_id)

localStorage.setItem("workspace_id", workspace.id)
localStorage.setItem("workspace", JSON.stringify(workspace))

window.location.replace("/user/admin/dashboard")

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