"use client"

import { useState } from "react"
import { SuperAdminHeader } from "@/components/super-admin/super-admin-header"
import { OnlineNow } from "@/components/super-admin/online-now"
import { UserOverview } from "@/components/super-admin/user-overview"
import { NewCustomers } from "@/components/super-admin/new-customers"
import { ActivityLogs } from "@/components/super-admin/activity-logs"
import { ActivityAnalytics } from "@/components/super-admin/activity-analytics"

export function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview")

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <SuperAdminHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="flex-1 p-6">
                {activeTab === "overview" && <OnlineNow />}
                {activeTab === "users" && <UserOverview />}
                {activeTab === "new-customers" && <NewCustomers />}
                {activeTab === "activity" && <ActivityLogs />}
                {activeTab === "analytics" && <ActivityAnalytics />}
            </main>
        </div>
    )
}
