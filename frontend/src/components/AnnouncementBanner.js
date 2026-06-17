"use client"

import { useState, useEffect } from "react"
import { X, Megaphone } from "lucide-react"

const POLL_INTERVAL = 60_000 // re-check every 60 seconds

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState({ enabled: false, message: "" })
  const [dismissed, setDismissed] = useState(false)

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch(`${API}/public/announcement`)
      if (!res.ok) return
      const data = await res.json()
      setAnnouncement(data)
      // If admin disables remotely, reset dismiss so it shows again when re-enabled
      if (!data.enabled) setDismissed(false)
    } catch (err) {
      // Ignore AbortError from StrictMode cleanup or silently fail
    }
  }

  useEffect(() => {
    fetchAnnouncement()
    const interval = setInterval(fetchAnnouncement, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!announcement.enabled || !announcement.message || dismissed) return null

  return (
    <div className="w-full bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm font-medium z-50">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Megaphone className="w-4 h-4 flex-shrink-0" />
        <p className="truncate">{announcement.message}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 hover:bg-white/20 rounded-full p-0.5 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}