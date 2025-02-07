import { Metadata } from "next"
import { UserManagement } from "@/components/admin/user-management"
import { AdminHeader } from "@/components/admin/admin-header"

export const metadata: Metadata = {
  title: "Admin - ADCI CRM",
  description: "Admin panel for CRM user management",
}

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 p-6">
        <UserManagement />
      </main>
    </div>
  )
} 