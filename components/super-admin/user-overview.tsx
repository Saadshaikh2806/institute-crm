"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Users, FileText, CheckCircle, Clock, Search, RefreshCw, KeyRound, Eye, EyeOff } from "lucide-react"
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

    // Reset password modal state
    const [resetModalOpen, setResetModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)
    const [newPass, setNewPass] = useState("")
    const [confirmPass, setConfirmPass] = useState("")
    const [showNewPass, setShowNewPass] = useState(false)
    const [showConfirmPass, setShowConfirmPass] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

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

    // Open reset password dialog for a user
    const openResetModal = (user: UserWithStats) => {
        setSelectedUser(user)
        setNewPass("")
        setConfirmPass("")
        setShowNewPass(false)
        setShowConfirmPass(false)
        setResetModalOpen(true)
    }

    // Call server-side API route using service role key (no email needed)
    const handleResetPassword = async () => {
        if (!selectedUser) return

        if (newPass.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        if (newPass !== confirmPass) {
            toast.error("Passwords do not match")
            return
        }

        setIsResetting(true)
        try {
            const res = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser.auth_user_id,
                    newPassword: newPass,
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to reset password")

            toast.success(`Password reset for ${selectedUser.full_name || selectedUser.email}`)
            setResetModalOpen(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password")
        } finally {
            setIsResetting(false)
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
        <>
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
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleUserStatus(user.id, user.is_active, user.email)}
                                        >
                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openResetModal(user)}
                                            className="flex items-center gap-1"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                            Reset Password
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>

        {/* Reset Password Modal */}
        <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        Reset Password
                    </DialogTitle>
                    <DialogDescription>
                        Set a new password for{" "}
                        <span className="font-medium text-foreground">
                            {selectedUser?.full_name || selectedUser?.email}
                        </span>
                        . No email will be sent — the password is changed immediately.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* New Password */}
                    <div className="space-y-1">
                        <Label htmlFor="sa-new-password">New Password</Label>
                        <div className="relative">
                            <Input
                                id="sa-new-password"
                                type={showNewPass ? "text" : "password"}
                                placeholder="Enter new password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                minLength={6}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPass((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                        <Label htmlFor="sa-confirm-password">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="sa-confirm-password"
                                type={showConfirmPass ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPass((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {confirmPass && newPass !== confirmPass && (
                            <p className="text-xs text-destructive">Passwords do not match</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setResetModalOpen(false)} disabled={isResetting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleResetPassword}
                        disabled={isResetting || newPass.length < 6 || newPass !== confirmPass}
                    >
                        {isResetting ? "Resetting..." : "Reset Password"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
