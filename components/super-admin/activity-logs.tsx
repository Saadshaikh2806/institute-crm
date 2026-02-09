"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
    Search,
    RefreshCw,
    LogIn,
    LogOut,
    UserPlus,
    UserMinus,
    UserCog,
    ListPlus,
    CheckCircle,
    ListMinus,
    MessageSquare,
    Tag,
    Activity,
    Filter
} from "lucide-react"
import { getActivityDescription } from "@/lib/activity-logger"
import type { ActivityActionType, UserActivityLog } from "@/types/crm"

interface ActivityLogEntry {
    id: string
    user_id: string
    user_email: string
    action_type: ActivityActionType
    entity_type: string | null
    entity_id: string | null
    details: Record<string, any> | null
    created_at: string
}

const actionIcons: Record<string, any> = {
    login: LogIn,
    logout: LogOut,
    customer_create: UserPlus,
    customer_update: UserCog,
    customer_delete: UserMinus,
    customer_status_change: Activity,
    task_create: ListPlus,
    task_complete: CheckCircle,
    task_delete: ListMinus,
    interaction_add: MessageSquare,
    tag_add: Tag,
    tag_delete: Tag,
    user_create: UserPlus,
    user_update: UserCog,
    user_deactivate: UserMinus
}

const actionColors: Record<string, string> = {
    login: "bg-green-100 text-green-800",
    logout: "bg-gray-100 text-gray-800",
    customer_create: "bg-blue-100 text-blue-800",
    customer_update: "bg-yellow-100 text-yellow-800",
    customer_delete: "bg-red-100 text-red-800",
    customer_status_change: "bg-purple-100 text-purple-800",
    task_create: "bg-indigo-100 text-indigo-800",
    task_complete: "bg-green-100 text-green-800",
    task_delete: "bg-red-100 text-red-800",
    interaction_add: "bg-cyan-100 text-cyan-800",
    tag_add: "bg-teal-100 text-teal-800",
    tag_delete: "bg-orange-100 text-orange-800",
    user_create: "bg-blue-100 text-blue-800",
    user_update: "bg-yellow-100 text-yellow-800",
    user_deactivate: "bg-red-100 text-red-800"
}

export function ActivityLogs() {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [actionFilter, setActionFilter] = useState<string>("all")
    const [userFilter, setUserFilter] = useState<string>("all")
    const [users, setUsers] = useState<{ id: string; email: string }[]>([])

    useEffect(() => {
        fetchLogs()
        fetchUsers()
    }, [])

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('user_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500)

            if (error) throw error

            setLogs(data || [])
        } catch (error) {
            console.error('Error fetching activity logs:', error)
            toast.error("Failed to fetch activity logs")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_users')
                .select('auth_user_id, email')
                .order('email')

            if (error) throw error

            setUsers(data?.map(u => ({ id: u.auth_user_id, email: u.email })) || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action_type?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesAction = actionFilter === "all" || log.action_type === actionFilter
        const matchesUser = userFilter === "all" || log.user_id === userFilter

        return matchesSearch && matchesAction && matchesUser
    })

    const uniqueActionTypes = Array.from(new Set(logs.map(l => l.action_type)))

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return 'Just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Activities</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.filter(l => {
                                const today = new Date()
                                const logDate = new Date(l.created_at)
                                return logDate.toDateString() === today.toDateString()
                            }).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Logins Today</CardTitle>
                        <LogIn className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.filter(l => {
                                const today = new Date()
                                const logDate = new Date(l.created_at)
                                return logDate.toDateString() === today.toDateString() && l.action_type === 'login'
                            }).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Users Today</CardTitle>
                        <UserCog className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(logs.filter(l => {
                                const today = new Date()
                                const logDate = new Date(l.created_at)
                                return logDate.toDateString() === today.toDateString()
                            }).map(l => l.user_id)).size}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActionTypes.map(action => (
                                <SelectItem key={action} value={action}>
                                    {action.replace(/_/g, ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-56">
                        <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Activity Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {isLoading ? "Loading..." : "No activity logs found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => {
                                const IconComponent = actionIcons[log.action_type] || Activity
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className={`p-2 rounded-full w-8 h-8 flex items-center justify-center ${actionColors[log.action_type] || 'bg-gray-100'}`}>
                                                <IconComponent className="h-4 w-4" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={actionColors[log.action_type] || 'bg-gray-100 text-gray-800'}>
                                                {log.action_type.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{log.user_email}</span>
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <span className="text-sm text-muted-foreground">
                                                {getActivityDescription(log.action_type, log.details || undefined)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {log.entity_type && (
                                                <Badge variant="outline">{log.entity_type}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{getRelativeTime(log.created_at)}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
