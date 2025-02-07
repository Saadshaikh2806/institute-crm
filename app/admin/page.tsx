import { Metadata } from "next"
import { UserManagement } from "@/components/admin/user-management"

export const metadata: Metadata = {
  title: "Admin - ADCI CRM",
  description: "Admin panel for CRM user management",
}

export default function AdminPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>
      <UserManagement />
    </div>
  )
} 