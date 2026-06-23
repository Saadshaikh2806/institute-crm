import { Metadata } from "next"
import { UserMonitor } from "@/components/super-admin/user-monitor"

export const metadata: Metadata = {
    title: "User Activity - Super Admin",
    description: "Detailed activity monitoring for an individual user",
}

export default function UserMonitorPage({ params }: { params: { userId: string } }) {
    return <UserMonitor userId={params.userId} />
}
