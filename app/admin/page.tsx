"use client"

import { Metadata } from "next"
import { UserManagement } from "@/components/admin/user-management"
import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

export const metadata: Metadata = {
  title: "Admin - ADCI CRM",
  description: "Admin panel for CRM user management",
}

export default function AdminPage() {
  const [isSendingEmails, setIsSendingEmails] = useState(false)

  const handleSendTaskEmails = async () => {
    setIsSendingEmails(true)
    try {
      const response = await fetch('/api/admin/send-task-emails', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully sent ${data.emailsSent} emails`)
      } else {
        throw new Error(data.error || 'Failed to send emails')
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      toast.error('Failed to send task emails')
    } finally {
      setIsSendingEmails(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 p-6">
        <UserManagement />
        <div className="mt-8">
          <Button 
            onClick={handleSendTaskEmails}
            disabled={isSendingEmails}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSendingEmails ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                Sending Emails...
              </>
            ) : (
              'Send Task Reminder Emails'
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}