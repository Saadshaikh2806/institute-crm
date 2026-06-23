"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Circle, Users, Activity, RefreshCw, ChevronRight, Wifi } from "lucide-react"
import { getActivityDescription } from "@/lib/activity-logger"
import type { ActivityActionType } from "@/types/crm"

const ONLINE_WINDOW_MS = 2 * 60 * 1000
const REFRESH_MS = 30_000

interface CrmUser { auth_user_id: string; email: string; full_name: string; role: string }
interface SessionRow { user_id: string; user_email: string; login_at: string; last_seen_at: string; logout_at: string | null }
interface LogRow {
    id: string; user_id: string; user_email: string
    action_type: ActivityActionType; details: Record<string, any> | null; created_at: string
}

const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()

function relativeTime(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(d).toLocaleDateString()
}

export function OnlineNow() {
    const router = useRouter()
    const [users, setUsers] = useState<CrmUser[]>([])
    const [sessions, setSessions] = useState<SessionRow[]>([])
    const [logs, setLogs] = useState<LogRow[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const [{ data: userData }, { data: sessionData }, { data: logData }] = await Promise.all([
                supabase.from("crm_users").select("auth_user_id, email, full_name, role"),
                supabase.from("user_sessions").select("user_id, user_email, login_at, last_seen_at, logout_at").gte("last_seen_at", since).order("last_seen_at", { ascending: false }),
                supabase.from("user_activity_logs").select("id, user_id, user_email, action_type, details, created_at").order("created_at", { ascending: false }).limit(40),
            ])
            setUsers((userData as CrmUser[]) || [])
            setSessions((sessionData as SessionRow[]) || [])
            setLogs((logData as LogRow[]) || [])
        } catch (error) {
            console.error("Error loading overview:", error)
            toast.error("Failed to load overview")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        // Poll keeps the time-based presence ("online within 2 min") fresh.
        const interval = setInterval(fetchData, REFRESH_MS)

        // Realtime makes new activity appear instantly in the live feed.
        const channel = supabase
            .channel("overview-live-activity")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "user_activity_logs" },
                (payload) => {
                    setLogs((prev) => [payload.new as LogRow, ...prev].slice(0, 40))
                }
            )
            .subscribe()

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [fetchData])

    const userByAuthId = useMemo(() => {
        const m: Record<string, CrmUser> = {}
        users.forEach((u) => { m[u.auth_user_id] = u })
        return m
    }, [users])

    // Online = a non-logged-out session seen within the window.
    const onlineUsers = useMemo(() => {
        const map = new Map<string, { user_id: string; email: string; name: string; lastSeen: string }>()
        sessions.forEach((s) => {
            const online = !s.logout_at && Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_WINDOW_MS
            if (!online) return
            const existing = map.get(s.user_id)
            if (!existing || new Date(s.last_seen_at) > new Date(existing.lastSeen)) {
                map.set(s.user_id, {
                    user_id: s.user_id,
                    email: s.user_email,
                    name: userByAuthId[s.user_id]?.full_name || s.user_email,
                    lastSeen: s.last_seen_at,
                })
            }
        })
        return Array.from(map.values())
    }, [sessions, userByAuthId])

    const actionsTodayByUser = useMemo(() => {
        const counts: Record<string, number> = {}
        logs.forEach((l) => { if (isToday(l.created_at)) counts[l.user_id] = (counts[l.user_id] || 0) + 1 })
        return counts
    }, [logs])

    const actionsToday = useMemo(() => logs.filter((l) => isToday(l.created_at)).length, [logs])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Online Now</CardTitle>
                        <Wifi className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{onlineUsers.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Actions Today</CardTitle>
                        <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{actionsToday}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Live feed</CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent><div className="text-xs text-muted-foreground">Auto-refreshes every 30s</div></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Online users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Circle className="h-3 w-3 fill-green-500 text-green-500" /> Currently Online
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {onlineUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No one is online right now</p>
                        ) : (
                            <div className="space-y-2">
                                {onlineUsers.map((u) => (
                                    <button
                                        key={u.user_id}
                                        onClick={() => router.push(`/super-admin/users/${u.user_id}`)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                            </span>
                                            <div>
                                                <div className="font-medium text-sm">{u.name}</div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{actionsTodayByUser[u.user_id] || 0} today</Badge>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Live activity feed */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-5 w-5" /> Latest Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                        ) : (
                            <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                {logs.slice(0, 25).map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => router.push(`/super-admin/users/${l.user_id}`)}
                                        className="w-full flex items-start justify-between gap-3 p-2 rounded hover:bg-gray-50 text-left"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm truncate">
                                                <span className="font-medium">{userByAuthId[l.user_id]?.full_name || l.user_email}</span>
                                                <span className="text-muted-foreground"> — {getActivityDescription(l.action_type, l.details || undefined)}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(l.created_at)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
