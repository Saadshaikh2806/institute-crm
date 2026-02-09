import { Metadata } from "next"
import { SuperAdminDashboard } from "./super-admin-dashboard"

export const metadata: Metadata = {
    title: "Super Admin - ADCI CRM",
    description: "Super Admin panel for complete CRM oversight and user activity tracking",
}

export default function SuperAdminPage() {
    return <SuperAdminDashboard />
}
