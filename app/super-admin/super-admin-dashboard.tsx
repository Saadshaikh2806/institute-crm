"use client"

import { useState } from "react"
import { SuperAdminHeader } from "@/components/super-admin/super-admin-header"
import { UserOverview } from "@/components/super-admin/user-overview"
import { ActivityLogs } from "@/components/super-admin/activity-logs"
import { ActivityAnalytics } from "@/components/super-admin/activity-analytics"

export function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState("users")

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <SuperAdminHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="flex-1 p-6">
                {activeTab === "users" && <UserOverview />}
                {activeTab === "activity" && <ActivityLogs />}
                {activeTab === "analytics" && <ActivityAnalytics />}
            </main>
        </div>
    )
}
