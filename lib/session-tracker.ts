import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getBrowserSessionToken } from "@/lib/single-session"

const SESSION_ID_KEY = "crm_active_session_id"

function getStoredSessionId(): string | null {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(SESSION_ID_KEY)
}

function setStoredSessionId(id: string | null) {
    if (typeof localStorage === "undefined") return
    if (id) localStorage.setItem(SESSION_ID_KEY, id)
    else localStorage.removeItem(SESSION_ID_KEY)
}

// Dedupes concurrent startSession() calls (e.g. login-form and the heartbeat
// firing at the same moment) so only one session row is created per login.
let startInFlight: Promise<void> | null = null

/**
 * Opens a new work-session row at login. Stores the row id locally so heartbeat
 * and logout can update it.
 */
export async function startSession(): Promise<void> {
    // If an open session id is already stored, don't open another.
    if (getStoredSessionId()) return
    if (startInFlight) return startInFlight

    startInFlight = (async () => {
        const supabase = createClientComponentClient()
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) return

            // Re-check after the async gap in case another call already stored one.
            if (getStoredSessionId()) return

            const now = new Date().toISOString()
            const { data, error } = await supabase
                .from("user_sessions")
                .insert([{
                    user_id: session.user.id,
                    user_email: session.user.email,
                    session_token: getBrowserSessionToken(),
                    login_at: now,
                    last_seen_at: now,
                    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
                }])
                .select("id")
                .single()

            if (error) {
                console.error("Failed to start session:", error)
                return
            }

            setStoredSessionId(data.id)
        } catch (error) {
            console.error("Error starting session:", error)
        }
    })()

    try {
        await startInFlight
    } finally {
        startInFlight = null
    }
}

// If the app hasn't pinged for longer than this (closed/suspended/long idle),
// the previous work session is considered finished and a fresh one is started.
// This is what makes session durations and "time today" accurate even though
// users almost never explicitly log out.
const IDLE_ROLLOVER_MS = 10 * 60 * 1000

/**
 * Keeps the current session alive. Because logout is rare, this also segments
 * sessions by activity gaps:
 *  - no stored session   -> open one
 *  - gap since last ping > IDLE_ROLLOVER_MS (or it was already closed)
 *                        -> close the old one at its last heartbeat, open a fresh one
 *  - otherwise           -> just advance last_seen_at
 */
export async function heartbeat(): Promise<void> {
    const supabase = createClientComponentClient()
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return

        const sessionId = getStoredSessionId()
        if (!sessionId) {
            await startSession()
            return
        }

        // Read the current row to decide whether to continue it or roll over.
        const { data: row, error: readError } = await supabase
            .from("user_sessions")
            .select("last_seen_at, logout_at")
            .eq("id", sessionId)
            .single()

        if (readError || !row) {
            // Row is gone (e.g. cleared) — start clean.
            setStoredSessionId(null)
            await startSession()
            return
        }

        const gap = Date.now() - new Date(row.last_seen_at).getTime()

        if (row.logout_at || gap > IDLE_ROLLOVER_MS) {
            // The previous session effectively ended while we weren't pinging.
            // Close it at its last known heartbeat so its duration reflects real
            // active time, then open a new session starting now.
            if (!row.logout_at) {
                await supabase
                    .from("user_sessions")
                    .update({ logout_at: row.last_seen_at, ended_reason: "idle" })
                    .eq("id", sessionId)
            }
            setStoredSessionId(null)
            await startSession()
            return
        }

        const { error } = await supabase
            .from("user_sessions")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", sessionId)
            .is("logout_at", null)

        if (error) console.error("Heartbeat failed:", error)
    } catch (error) {
        console.error("Error in heartbeat:", error)
    }
}

/**
 * Closes the current session. Uses sendBeacon on unload when possible so the
 * request still goes out as the tab is closing.
 */
export async function endSession(reason: string = "logout"): Promise<void> {
    const sessionId = getStoredSessionId()
    if (!sessionId) return

    const supabase = createClientComponentClient()
    try {
        await supabase
            .from("user_sessions")
            .update({ logout_at: new Date().toISOString(), ended_reason: reason })
            .eq("id", sessionId)
    } catch (error) {
        console.error("Error ending session:", error)
    } finally {
        setStoredSessionId(null)
    }
}

/**
 * Best-effort close on tab unload. Supabase JS can't run reliably during unload,
 * so we fire a keepalive REST PATCH directly.
 */
export function endSessionBeacon(reason: string = "tab_close") {
    const sessionId = getStoredSessionId()
    if (!sessionId) return

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) return

    // Pull the access token Supabase stored so the PATCH passes RLS.
    let accessToken = anonKey
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.includes("auth-token")) {
                const raw = localStorage.getItem(key)
                if (raw) {
                    const parsed = JSON.parse(raw)
                    if (parsed?.access_token) accessToken = parsed.access_token
                }
            }
        }
    } catch {
        // fall back to anon key
    }

    try {
        fetch(`${url}/rest/v1/user_sessions?id=eq.${sessionId}`, {
            method: "PATCH",
            keepalive: true,
            headers: {
                "Content-Type": "application/json",
                apikey: anonKey,
                Authorization: `Bearer ${accessToken}`,
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                logout_at: new Date().toISOString(),
                ended_reason: reason,
            }),
        })
    } catch (error) {
        console.error("Error in endSessionBeacon:", error)
    } finally {
        setStoredSessionId(null)
    }
}
