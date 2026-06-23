"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
    ArrowLeft, Activity, Clock, Users, CheckCircle, Timer, LogIn, RefreshCw,
    Monitor, Calendar, KeyRound, Eye, EyeOff, Circle, Filter,
} from "lucide-react"
import { getActivityDescription } from "@/lib/activity-logger"
import type { ActivityActionType } from "@/types/crm"

interface CrmUser {
    id: string
    auth_user_id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
    last_login: string | null
    created_at: string
}

interface ActivityRow {
    id: string
    user_id: string
    user_email: string
    action_type: ActivityActionType
    entity_type: string | null
    entity_id: string | null
    details: Record<string, any> | null
    user_agent: string | null
    created_at: string
}

interface SessionRow {
    id: string
    login_at: string
    last_seen_at: string
    logout_at: string | null
    ended_reason: string | null
    user_agent: string | null
}

const ONLINE_WINDOW_MS = 2 * 60 * 1000

const actionColors: Record<string, string> = {
    login: "bg-green-100 text-green-800",
    logout: "bg-gray-100 text-gray-800",
    customer_create: "bg-blue-100 text-blue-800",
    customer_update: "bg-yellow-100 text-yellow-800",
    customer_delete: "bg-red-100 text-red-800",
    customer_status_change: "bg-purple-100 text-purple-800",
    lead_score_update: "bg-fuchsia-100 text-fuchsia-800",
    task_create: "bg-indigo-100 text-indigo-800",
    task_complete: "bg-green-100 text-green-800",
    task_reopen: "bg-amber-100 text-amber-800",
    task_delete: "bg-red-100 text-red-800",
    interaction_add: "bg-cyan-100 text-cyan-800",
    tag_add: "bg-teal-100 text-teal-800",
    tag_delete: "bg-orange-100 text-orange-800",
    user_create: "bg-blue-100 text-blue-800",
    user_update: "bg-yellow-100 text-yellow-800",
    user_deactivate: "bg-red-100 text-red-800",
}

function fmtDuration(ms: number): string {
    if (ms <= 0) return "0m"
    const mins = Math.floor(ms / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

function deviceLabel(ua: string | null): string {
    if (!ua) return "Unknown"
    if (/iphone|ipad|ipod/i.test(ua)) return "iOS"
    if (/android/i.test(ua)) return "Android"
    if (/windows/i.test(ua)) return "Windows"
    if (/macintosh|mac os/i.test(ua)) return "Mac"
    if (/linux/i.test(ua)) return "Linux"
    return "Other"
}

const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()
const within7Days = (d: string) => Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000

export function UserMonitor({ userId }: { userId: string }) {
    const router = useRouter()
    const [user, setUser] = useState<CrmUser | null>(null)
    const [logs, setLogs] = useState<ActivityRow[]>([])
    const [sessions, setSessions] = useState<SessionRow[]>([])
    const [customerCount, setCustomerCount] = useState(0)
    const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
    const [isLoading, setIsLoading] = useState(true)

    // filters
    const [actionFilter, setActionFilter] = useState("all")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    // reset password modal
    const [resetOpen, setResetOpen] = useState(false)
    const [newPass, setNewPass] = useState("")
    const [confirmPass, setConfirmPass] = useState("")
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    useEffect(() => {
        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const fetchAll = async () => {
        setIsLoading(true)
        try {
            const [{ data: userData }, { data: logData }, { data: sessionData }, { data: custData }, { data: taskData }] =
                await Promise.all([
                    supabase.from("crm_users").select("*").eq("auth_user_id", userId).single(),
                    supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
                    supabase.from("user_sessions").select("*").eq("user_id", userId).order("login_at", { ascending: false }).limit(200),
                    supabase.from("customers").select("id").eq("user_id", userId),
                    supabase.from("tasks").select("id, completed").eq("user_id", userId),
                ])

            setUser(userData as CrmUser)
            setLogs((logData as ActivityRow[]) || [])
            setSessions((sessionData as SessionRow[]) || [])
            setCustomerCount(custData?.length || 0)
            setTaskStats({
                total: taskData?.length || 0,
                completed: taskData?.filter((t: any) => t.completed).length || 0,
            })
        } catch (error) {
            console.error("Error loading user monitor:", error)
            toast.error("Failed to load user activity")
        } finally {
            setIsLoading(false)
        }
    }

    // ---- derived ----
    const isOnline = useMemo(() => {
        return sessions.some(
            (s) => !s.logout_at && Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_WINDOW_MS
        )
    }, [sessions])

    const lastSeen = useMemo(() => {
        if (sessions.length === 0) return user?.last_login || null
        return sessions.reduce((latest, s) =>
            new Date(s.last_seen_at) > new Date(latest) ? s.last_seen_at : latest, sessions[0].last_seen_at)
    }, [sessions, user])

    const actionsToday = useMemo(() => logs.filter((l) => isToday(l.created_at)).length, [logs])
    const actionsWeek = useMemo(() => logs.filter((l) => within7Days(l.created_at)).length, [logs])

    const timeOnAppToday = useMemo(() => {
        return sessions
            .filter((s) => isToday(s.login_at))
            .reduce((sum, s) => {
                const end = s.logout_at ? new Date(s.logout_at).getTime() : new Date(s.last_seen_at).getTime()
                return sum + Math.max(0, end - new Date(s.login_at).getTime())
            }, 0)
    }, [sessions])

    const actionBreakdown = useMemo(() => {
        const counts: Record<string, number> = {}
        logs.forEach((l) => { counts[l.action_type] = (counts[l.action_type] || 0) + 1 })
        return Object.entries(counts).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count)
    }, [logs])
    const maxBreakdown = Math.max(...actionBreakdown.map((a) => a.count), 1)

    // hourly heatmap: 7 days (rows) x 24 hours (cols)
    const heatmap = useMemo(() => {
        const days: { label: string; date: Date; hours: number[] }[] = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            d.setDate(d.getDate() - i)
            days.push({
                label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
                date: d,
                hours: new Array(24).fill(0),
            })
        }
        logs.forEach((l) => {
            const t = new Date(l.created_at)
            const day = days.find((dd) => dd.date.toDateString() === t.toDateString())
            if (day) day.hours[t.getHours()]++
        })
        return days
    }, [logs])
    const maxHeat = Math.max(1, ...heatmap.flatMap((d) => d.hours))

    const uniqueActions = useMemo(() => Array.from(new Set(logs.map((l) => l.action_type))), [logs])

    const filteredLogs = useMemo(() => {
        return logs.filter((l) => {
            if (actionFilter !== "all" && l.action_type !== actionFilter) return false
            if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false
            if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false
            return true
        })
    }, [logs, actionFilter, dateFrom, dateTo])

    // group filtered logs by day
    const groupedLogs = useMemo(() => {
        const groups: Record<string, ActivityRow[]> = {}
        filteredLogs.forEach((l) => {
            const key = new Date(l.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" })
            ;(groups[key] = groups[key] || []).push(l)
        })
        return Object.entries(groups)
    }, [filteredLogs])

    const heatColor = (count: number) => {
        if (count === 0) return "bg-gray-100"
        const intensity = count / maxHeat
        if (intensity > 0.75) return "bg-purple-700"
        if (intensity > 0.5) return "bg-purple-500"
        if (intensity > 0.25) return "bg-purple-400"
        return "bg-purple-200"
    }

    // ---- actions ----
    const toggleActive = async () => {
        if (!user) return
        try {
            const { error } = await supabase.from("crm_users").update({ is_active: !user.is_active }).eq("id", user.id)
            if (error) throw error
            setUser({ ...user, is_active: !user.is_active })
            toast.success(`User ${user.is_active ? "deactivated" : "activated"}`)
        } catch {
            toast.error("Failed to update status")
        }
    }

    const handleReset = async () => {
        if (!user) return
        if (newPass.length < 6) return toast.error("Password must be at least 6 characters")
        if (newPass !== confirmPass) return toast.error("Passwords do not match")
        setIsResetting(true)
        try {
            const res = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.auth_user_id, newPassword: newPass }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed")
            toast.success(`Password reset for ${user.full_name || user.email}`)
            setResetOpen(false)
            setNewPass(""); setConfirmPass("")
        } catch (e: any) {
            toast.error(e.message || "Failed to reset password")
        } finally {
            setIsResetting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
                <p className="text-muted-foreground">User not found.</p>
                <Button variant="outline" onClick={() => router.push("/super-admin")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" size="sm" onClick={() => router.push("/super-admin")}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white">{user.full_name || "N/A"}</h1>
                                <Badge className={isOnline ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"}>
                                    <Circle className={`h-2 w-2 mr-1 ${isOnline ? "fill-white" : "fill-gray-500"}`} />
                                    {isOnline ? "Online" : "Offline"}
                                </Badge>
                            </div>
                            <p className="text-purple-100 text-sm">{user.email} · {user.role}</p>
                            <p className="text-purple-200 text-xs mt-0.5">
                                Last seen: {lastSeen ? new Date(lastSeen).toLocaleString() : "Never"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-white text-sm mr-2">
                            <span>{user.is_active ? "Active" : "Inactive"}</span>
                            <Switch checked={user.is_active} onCheckedChange={toggleActive} />
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
                            <KeyRound className="h-4 w-4 mr-1" /> Reset Password
                        </Button>
                        <Button variant="secondary" size="sm" onClick={fetchAll}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiCard icon={<Activity className="h-4 w-4 text-purple-500" />} label="Actions Today" value={actionsToday} />
                    <KpiCard icon={<Calendar className="h-4 w-4 text-blue-500" />} label="Actions (7d)" value={actionsWeek} />
                    <KpiCard icon={<Timer className="h-4 w-4 text-emerald-500" />} label="Time Today" value={fmtDuration(timeOnAppToday)} />
                    <KpiCard icon={<Users className="h-4 w-4 text-indigo-500" />} label="Customers" value={customerCount} />
                    <KpiCard icon={<CheckCircle className="h-4 w-4 text-green-500" />} label="Tasks Done" value={`${taskStats.completed}/${taskStats.total}`} />
                    <KpiCard icon={<LogIn className="h-4 w-4 text-cyan-500" />} label="Sessions" value={sessions.length} />
                </div>

                {/* Heatmap + Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-5 w-5" /> Activity Heatmap (last 7 days × hour)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <div className="min-w-[640px]">
                                <div className="flex gap-1 mb-1 pl-14">
                                    {Array.from({ length: 24 }).map((_, h) => (
                                        <div key={h} className="w-5 text-[9px] text-center text-muted-foreground">
                                            {h % 3 === 0 ? h : ""}
                                        </div>
                                    ))}
                                </div>
                                {heatmap.map((day) => (
                                    <div key={day.label} className="flex items-center gap-1 mb-1">
                                        <div className="w-14 text-[10px] text-muted-foreground text-right pr-1">{day.label}</div>
                                        {day.hours.map((count, h) => (
                                            <div
                                                key={h}
                                                title={`${day.label} ${h}:00 — ${count} action(s)`}
                                                className={`w-5 h-5 rounded-sm ${heatColor(count)}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-5 w-5" /> Action Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {actionBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {actionBreakdown.map((a) => (
                                        <div key={a.action} className="flex items-center gap-2">
                                            <span className="text-xs w-32 truncate capitalize">{a.action.replace(/_/g, " ")}</span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
                                                    style={{ width: `${(a.count / maxBreakdown) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-medium w-8 text-right">{a.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-5 w-5" /> Activity Timeline
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={actionFilter} onValueChange={setActionFilter}>
                                    <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Action" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All actions</SelectItem>
                                        {uniqueActions.map((a) => (
                                            <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36" />
                                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36" />
                                {(dateFrom || dateTo || actionFilter !== "all") && (
                                    <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setActionFilter("all") }}>Clear</Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {groupedLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No activity for this filter</p>
                        ) : (
                            <div className="space-y-6">
                                {groupedLogs.map(([day, dayLogs]) => (
                                    <div key={day}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day}</span>
                                            <span className="text-xs text-muted-foreground">· {dayLogs.length} actions</span>
                                        </div>
                                        <div className="border-l-2 border-gray-200 ml-2 space-y-3 pl-4">
                                            {dayLogs.map((log) => (
                                                <div key={log.id} className="relative">
                                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-400 ring-2 ring-white" />
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-2">
                                                            <Badge className={`${actionColors[log.action_type] || "bg-gray-100 text-gray-800"} shrink-0`}>
                                                                {log.action_type.replace(/_/g, " ")}
                                                            </Badge>
                                                            <span className="text-sm text-gray-700">
                                                                {getActivityDescription(log.action_type, log.details || undefined)}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {new Date(log.created_at).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sessions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Monitor className="h-5 w-5" /> Login Sessions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Login</TableHead>
                                        <TableHead>Logout / Last seen</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Device</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No sessions recorded</TableCell></TableRow>
                                    ) : (
                                        sessions.map((s) => {
                                            const end = s.logout_at ? new Date(s.logout_at).getTime() : new Date(s.last_seen_at).getTime()
                                            const live = !s.logout_at && Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_WINDOW_MS
                                            return (
                                                <TableRow key={s.id}>
                                                    <TableCell className="text-sm">{new Date(s.login_at).toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm">{new Date(s.logout_at || s.last_seen_at).toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm">{fmtDuration(end - new Date(s.login_at).getTime())}</TableCell>
                                                    <TableCell className="text-sm">{deviceLabel(s.user_agent)}</TableCell>
                                                    <TableCell>
                                                        {live ? <Badge className="bg-green-100 text-green-800">Active</Badge>
                                                            : <Badge variant="outline">Ended{s.ended_reason ? ` · ${s.ended_reason}` : ""}</Badge>}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reset password modal */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for <span className="font-medium text-foreground">{user.full_name || user.email}</span>. Changed immediately, no email sent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="um-new">New Password</Label>
                            <div className="relative">
                                <Input id="um-new" type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} minLength={6} className="pr-10" />
                                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="um-confirm">Confirm Password</Label>
                            <div className="relative">
                                <Input id="um-confirm" type={showConfirm ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="pr-10" />
                                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {confirmPass && newPass !== confirmPass && <p className="text-xs text-destructive">Passwords do not match</p>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setResetOpen(false)} disabled={isResetting}>Cancel</Button>
                        <Button onClick={handleReset} disabled={isResetting || newPass.length < 6 || newPass !== confirmPass}>
                            {isResetting ? "Resetting..." : "Reset Password"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}
