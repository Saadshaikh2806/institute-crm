"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface SharedUser {
  id: string
  email: string
  full_name: string
  permissions: string
}

interface CRMUser {
  id: string
  email: string
  full_name: string
}

export function SharedAccessManagement() {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [availableUsers, setAvailableUsers] = useState<CRMUser[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedPermission, setSelectedPermission] = useState<string>("read")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchSharedUsers()
    fetchAvailableUsers()
  }, [])

  const fetchSharedUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { data, error } = await supabase
        .from('shared_access')
        .select(`
          id,
          shared_with_id,
          permissions,
          crm_users!shared_access_shared_with_id_fkey (
            email,
            full_name
          )
        `)
        .eq('account_owner_id', session.user.id)

      if (error) throw error

      setSharedUsers(data.map(item => ({
        id: item.id,
        email: (item.crm_users as any).email as string,
        full_name: (item.crm_users as any).full_name as string,
        permissions: item.permissions
      })))
    } catch (error) {
      console.error('Error fetching shared users:', error)
      toast.error('Failed to fetch shared users')
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      // Get all users except current user and already shared users
      const { data, error } = await supabase
        .from('crm_users')
        .select('id, email, full_name')
        .neq('auth_user_id', session.user.id)

      if (error) throw error
      setAvailableUsers(data as CRMUser[])
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }

  const addSharedAccess = async () => {
    if (!selectedUser) {
      toast.error('Please select a user')
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast.error('You must be logged in')
        return
      }

      const { error } = await supabase
        .from('shared_access')
        .insert({
          account_owner_id: session.user.id,
          shared_with_id: selectedUser,
          permissions: selectedPermission
        })

      if (error) throw error

      toast.success('Access shared successfully')
      fetchSharedUsers()
      fetchAvailableUsers()
      setSelectedUser("")
    } catch (error) {
      console.error('Error sharing access:', error)
      toast.error('Failed to share access')
    } finally {
      setIsLoading(false)
    }
  }

  const removeSharedAccess = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_access')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Access removed successfully')
      fetchSharedUsers()
      fetchAvailableUsers()
    } catch (error) {
      console.error('Error removing access:', error)
      toast.error('Failed to remove access')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Shared Access Management</h3>
        <p className="text-sm text-muted-foreground">
          Share your account with other users to collaborate on customer management.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="user">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="permission">Permission</Label>
            <Select value={selectedPermission} onValueChange={setSelectedPermission}>
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read Only</SelectItem>
                <SelectItem value="write">Read & Write</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={addSharedAccess} disabled={isLoading} className="w-full">
              {isLoading ? "Adding..." : "Share Access"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="p-4">
            <h4 className="font-medium">Currently Shared With</h4>
          </div>
          <div className="divide-y">
            {sharedUsers.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                You haven't shared your account with anyone yet.
              </div>
            ) : (
              sharedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Permission: {user.permissions.charAt(0).toUpperCase() + user.permissions.slice(1)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeSharedAccess(user.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}