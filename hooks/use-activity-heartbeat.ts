"use client"

import { useEffect, useRef } from "react"
import { heartbeat, endSessionBeacon } from "@/lib/session-tracker"

const HEARTBEAT_INTERVAL_MS = 60_000

// If there has been no real keyboard/mouse/touch/scroll input for this long,
// the user is treated as idle: heartbeats stop, last_seen_at stops advancing,
// and they correctly drop to "Offline" (after the 2-min online window lapses)
// even though the tab is still open. Without this, a forgotten open tab would
// count as continuous active work.
const IDLE_THRESHOLD_MS = 5 * 60_000

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    "mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel", "click",
]

/**
 * Keeps the current user's work session alive while they are actually using
 * the app — not just while the tab happens to be open.
 * - Pings last_seen_at every 60s, but only if there was real input within the
 *   idle threshold and the tab is visible/focused.
 * - Marks the session closed (best effort) when the tab is hidden or unloaded.
 *
 * Mount this once inside the app-wide authenticated provider so it tracks every
 * logged-in user, not just super admins.
 */
export function useActivityHeartbeat(enabled: boolean = true) {
    const lastActivityRef = useRef<number>(Date.now())

    useEffect(() => {
        if (!enabled) return
        if (typeof window === "undefined") return

        lastActivityRef.current = Date.now()
        const markActive = () => { lastActivityRef.current = Date.now() }

        const isActive = () =>
            document.visibilityState === "visible" &&
            Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS

        // Initial ping on mount (counts as activity).
        heartbeat()

        const interval = setInterval(() => {
            if (isActive()) {
                heartbeat()
            }
            // If idle, we simply skip the ping — last_seen_at freezes at its last
            // value, which is exactly what should happen while genuinely idle.
        }, HEARTBEAT_INTERVAL_MS)

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                markActive()
                heartbeat()
            }
        }

        const handleFocus = () => { markActive(); heartbeat() }
        const handleUnload = () => endSessionBeacon("tab_close")

        ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }))
        document.addEventListener("visibilitychange", handleVisibility)
        window.addEventListener("focus", handleFocus)
        window.addEventListener("pagehide", handleUnload)
        window.addEventListener("beforeunload", handleUnload)

        return () => {
            clearInterval(interval)
            ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive))
            document.removeEventListener("visibilitychange", handleVisibility)
            window.removeEventListener("focus", handleFocus)
            window.removeEventListener("pagehide", handleUnload)
            window.removeEventListener("beforeunload", handleUnload)
        }
    }, [enabled])
}
