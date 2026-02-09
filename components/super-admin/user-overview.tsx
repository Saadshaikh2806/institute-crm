"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Users, FileText, CheckCircle, Clock, Search, RefreshCw } from "lucide-react"
import type { UserStats } from "@/types/crm"
import { logActivity } from "@/lib/activity-logger"

interface UserWithStats {
    id: string
    auth_user_id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
    last_login: string | null
    created_at: string
    customer_count: number
    task_count: number
    completed_task_count: number
    last_activity: string | null
}

export function UserOverview() {
    const [users, setUsers] = useState<UserWithStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchUsersWithStats()
    }, [])

    const fetchUsersWithStats = async () => {
        setIsLoading(true)
        try {
            // First get all users
            const { data: usersData, error: usersError } = await supabase
                .from('crm_users')
                .select('*')
                .order('created_at', { ascending: false })

            if (usersError) throw usersError

            // Get customer counts per user
            const { data: customerCounts } = await supabase
                .from('customers')
                .select('user_id')

            // Get task counts per user
            const { data: taskData } = await supabase
                .from('tasks')
                .select('user_id, completed')

            // Get last activity per user
            const { data: activityData } = await supabase
                .from('user_activity_logs')
                .select('user_id, created_at')
                .order('created_at', { ascending: false })

            // Calculate stats for each user
            const usersWithStats = usersData.map(user => {
                const userCustomers = customerCounts?.filter(c => c.user_id === user.auth_user_id) || []
                const userTasks = taskData?.filter(t => t.user_id === user.auth_user_id) || []
                const completedTasks = userTasks.filter(t => t.completed)
                const lastActivity = activityData?.find(a => a.user_id === user.auth_user_id)

                return {
                    ...user,
                    customer_count: userCustomers.length,
                    task_count: userTasks.length,
                    completed_task_count: completedTasks.length,
                    last_activity: lastActivity?.created_at || null
                }
            })

            setUsers(usersWithStats)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error("Failed to fetch users")
        } finally {
            setIsLoading(false)
        }
    }

    const toggleUserStatus = async (userId: string, currentStatus: boolean, userEmail: string) => {
        try {
            const { error } = await supabase
                .from('crm_users')
                .update({ is_active: !currentStatus })
                .eq('id', userId)

            if (error) throw error

            await logActivity({
                actionType: currentStatus ? 'user_deactivate' : 'user_update',
                entityType: 'user',
                entityId: userId,
                details: { userEmail, newStatus: !currentStatus }
            })

            toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
            fetchUsersWithStats()
        } catch (error) {
            console.error('Error:', error)
            toast.error("Failed to update user status")
        }
    }

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalUsers = users.length
    const activeUsers = users.filter(u => u.is_active).length
    const totalCustomers = users.reduce((sum, u) => sum + (u.customer_count || 0), 0)
    const totalTasks = users.reduce((sum, u) => sum + (u.task_count || 0), 0)

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-800'
            case 'admin': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">{activeUsers} active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCustomers}</div>
                        <p className="text-xs text-muted-foreground">Across all users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <p className="text-xs text-muted-foreground">System-wide</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Customers/User</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeUsers > 0 ? Math.round(totalCustomers / activeUsers) : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Per active user</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Refresh */}
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={fetchUsersWithStats} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-center">Customers</TableHead>
                            <TableHead className="text-center">Tasks</TableHead>
                            <TableHead className="text-center">Completed</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead>Last Activity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{user.full_name || 'N/A'}</div>
                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={getRoleBadgeColor(user.role)}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium">{user.customer_count}</TableCell>
                                <TableCell className="text-center font-medium">{user.task_count}</TableCell>
                                <TableCell className="text-center">
                                    <span className="text-green-600 font-medium">{user.completed_task_count}</span>
                                    <span className="text-muted-foreground">/{user.task_count}</span>
                                </TableCell>
                                <TableCell>
                                    {user.last_login
                                        ? new Date(user.last_login).toLocaleString()
                                        : 'Never'}
                                </TableCell>
                                <TableCell>
                                    {user.last_activity
                                        ? new Date(user.last_activity).toLocaleString()
                                        : 'No activity'}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={user.is_active}
                                        onCheckedChange={() => toggleUserStatus(user.id, user.is_active, user.email)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleUserStatus(user.id, user.is_active, user.email)}
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
