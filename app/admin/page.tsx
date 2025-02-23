"use client"

import { Metadata } from "next"
import { UserManagement } from "@/components/admin/user-management"
import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { toast } from "sonner"

export const metadata: Metadata = {
  title: "Admin - ADCI CRM",
  description: "Admin panel for CRM user management",
}

export default function AdminPage() {
  const [isSendingEmails, setIsSendingEmails] = useState(false)
  const [canSendEmails, setCanSendEmails] = useState(false)
  const [nextAvailable, setNextAvailable] = useState<string | null>(null)
  const [sendCount, setSendCount] = useState(0)

  const checkSendStatus = async () => {
    try {
      const response = await fetch('/api/admin/send-task-emails')
      const data = await response.json()
      
      setCanSendEmails(data.canSend)
      setSendCount(data.sendCount)
      setNextAvailable(data.nextAvailable)
    } catch (error) {
      console.error('Error checking send status:', error)
    }
  }

  useEffect(() => {
    checkSendStatus()
    // Check status every minute
    const interval = setInterval(checkSendStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSendTaskEmails = async () => {
    setIsSendingEmails(true)
    try {
      const response = await fetch('/api/admin/send-task-emails', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully sent ${data.emailsSent} emails`)
        await checkSendStatus() // Refresh status after sending
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
            disabled={isSendingEmails || !canSendEmails}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSendingEmails ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                Sending Emails...
              </>
            ) : !canSendEmails ? (
              `Next send available ${nextAvailable ? new Date(nextAvailable).toLocaleTimeString() : 'tomorrow'}`
            ) : (
              `Send Task Reminder Emails (${sendCount}/2 today)`
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}