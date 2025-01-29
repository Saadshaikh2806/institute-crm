import type { Metadata } from "next"
import { CustomerDashboard } from "@/components/customer-dashboard"

export const metadata: Metadata = {
  title: "ADCI CRM - Dashboard",
  description: "Institute CRM Dashboard",
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <CustomerDashboard />
      </main>
    </div>
  )
}

