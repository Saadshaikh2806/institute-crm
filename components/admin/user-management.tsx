"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  full_name: string
  role: "admin" | "user"
  is_active: boolean
  created_at: string
  last_login: string | null
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserFullName, setNewUserFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('crm_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error("Failed to fetch users")
      return
    }

    setUsers(data)
  }

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Step 1: Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserFullName
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      // Step 2: Create CRM user record linked to auth user
      const { error: crmError } = await supabase
        .from('crm_users')
        .insert([
          {
            auth_user_id: authData.user.id,
            email: newUserEmail,
            full_name: newUserFullName,
            role: 'user',
            is_active: true
          }
        ])

      if (crmError) {
        // If CRM user creation fails, we should ideally delete the auth user
        // But for simplicity, we'll just show the error
        console.error('CRM user creation failed:', crmError)
        throw new Error('Failed to create CRM user record')
      }

      toast.success("User added successfully")
      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserFullName("")
      fetchUsers()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || "Failed to add user")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('crm_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
      fetchUsers()
    } catch (error) {
      console.error('Error:', error)
      toast.error("Failed to update user status")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Add New User</h2>
        <form onSubmit={addUser} className="flex gap-4">
          <Input
            type="text"
            placeholder="Full Name"
            value={newUserFullName}
            onChange={(e) => setNewUserFullName(e.target.value)}
            className="max-w-md"
            required
          />
          <Input
            type="email"
            placeholder="Email Address"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="max-w-md"
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            className="max-w-md"
            required
            minLength={6}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add User"}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Manage Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                  />
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}