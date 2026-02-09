"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
    BarChart3,
    TrendingUp,
    Users,
    Activity,
    Calendar
} from "lucide-react"

interface DailyActivity {
    date: string
    count: number
}

interface UserActivity {
    email: string
    count: number
}

interface ActionBreakdown {
    action: string
    count: number
}

export function ActivityAnalytics() {
    const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
    const [topUsers, setTopUsers] = useState<UserActivity[]>([])
    const [actionBreakdown, setActionBreakdown] = useState<ActionBreakdown[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [totalActivities, setTotalActivities] = useState(0)
    const [weeklyGrowth, setWeeklyGrowth] = useState(0)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setIsLoading(true)
        try {
            // Fetch all activity logs
            const { data: logs, error } = await supabase
                .from('user_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            if (!logs || logs.length === 0) {
                setIsLoading(false)
                return
            }

            setTotalActivities(logs.length)

            // Calculate daily activity for last 7 days
            const last7Days: DailyActivity[] = []
            for (let i = 6; i >= 0; i--) {
                const date = new Date()
                date.setDate(date.getDate() - i)
                const dateStr = date.toISOString().split('T')[0]
                const count = logs.filter(l =>
                    l.created_at.startsWith(dateStr)
                ).length
                last7Days.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    count
                })
            }
            setDailyActivity(last7Days)

            // Calculate weekly growth
            const thisWeek = last7Days.reduce((sum, d) => sum + d.count, 0)
            const lastWeekLogs = logs.filter(l => {
                const logDate = new Date(l.created_at)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 14)
                const twoWeeksAgo = new Date()
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7)
                return logDate >= weekAgo && logDate < twoWeeksAgo
            }).length

            if (lastWeekLogs > 0) {
                setWeeklyGrowth(Math.round(((thisWeek - lastWeekLogs) / lastWeekLogs) * 100))
            } else {
                setWeeklyGrowth(100)
            }

            // Calculate top users
            const userCounts: Record<string, number> = {}
            logs.forEach(log => {
                const email = log.user_email || 'Unknown'
                userCounts[email] = (userCounts[email] || 0) + 1
            })
            const topUsersList = Object.entries(userCounts)
                .map(([email, count]) => ({ email, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
            setTopUsers(topUsersList)

            // Calculate action breakdown
            const actionCounts: Record<string, number> = {}
            logs.forEach(log => {
                const action = log.action_type
                actionCounts[action] = (actionCounts[action] || 0) + 1
            })
            const actionList = Object.entries(actionCounts)
                .map(([action, count]) => ({ action, count }))
                .sort((a, b) => b.count - a.count)
            setActionBreakdown(actionList)

        } catch (error) {
            console.error('Error fetching analytics:', error)
            toast.error("Failed to fetch analytics")
        } finally {
            setIsLoading(false)
        }
    }

    const maxDailyCount = Math.max(...dailyActivity.map(d => d.count), 1)
    const maxUserCount = Math.max(...topUsers.map(u => u.count), 1)
    const maxActionCount = Math.max(...actionBreakdown.map(a => a.count), 1)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Activities</CardTitle>
                        <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalActivities.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {dailyActivity.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Growth</CardTitle>
                        <TrendingUp className={`h-4 w-4 ${weeklyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}%
                        </div>
                        <p className="text-xs text-muted-foreground">Compared to last week</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Activity Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Daily Activity (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {dailyActivity.map((day, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground w-28">{day.date}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                            style={{ width: `${Math.max((day.count / maxDailyCount) * 100, 5)}%` }}
                                        >
                                            <span className="text-xs font-medium text-white">{day.count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Most Active Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topUsers.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No user activity data yet</p>
                        ) : (
                            <div className="space-y-3">
                                {topUsers.map((user, index) => (
                                    <div key={user.email} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-purple-500'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="text-sm flex-1 truncate">{user.email}</span>
                                        <div className="w-32 bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full"
                                                style={{ width: `${(user.count / maxUserCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">{user.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Action Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {actionBreakdown.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No activity data yet</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {actionBreakdown.map((action) => (
                                <div key={action.action} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium capitalize">
                                            {action.action.replace(/_/g, ' ')}
                                        </p>
                                        <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                                                style={{ width: `${(action.count / maxActionCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-gray-700">{action.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
