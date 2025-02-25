import { SharedAccessManagement } from "@/components/admin/shared-access-management"
import { AdminLayout } from "@/components/layouts"

export default function SharedAccessPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Shared Access Management</h1>
        <SharedAccessManagement />
      </div>
    </AdminLayout>
  )
}