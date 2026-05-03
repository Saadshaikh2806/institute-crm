"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, KeyRound } from "lucide-react"

interface User {
  id: string
  auth_user_id: string
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

  // Reset password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("crm_users")
      .select("*")
      .order("created_at", { ascending: false })

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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: { full_name: newUserFullName },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      const { error: crmError } = await supabase.from("crm_users").insert([
        {
          auth_user_id: authData.user.id,
          email: newUserEmail,
          full_name: newUserFullName,
          role: "user",
          is_active: true,
          plain_password: newUserPassword,
        },
      ])

      if (crmError) {
        console.error("CRM user creation failed:", crmError)
        throw new Error("Failed to create CRM user record")
      }

      toast.success("User added successfully")
      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserFullName("")
      fetchUsers()
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || "Failed to add user")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("crm_users")
        .update({ is_active: !currentStatus })
        .eq("id", userId)

      if (error) throw error

      toast.success(
        `User ${currentStatus ? "deactivated" : "activated"} successfully`
      )
      fetchUsers()
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update user status")
    }
  }

  // Open reset password dialog for a specific user
  const openResetModal = (user: User) => {
    setSelectedUser(user)
    setNewPass("")
    setConfirmPass("")
    setShowNewPass(false)
    setShowConfirmPass(false)
    setResetModalOpen(true)
  }

  // Call the server-side API route that uses service role key
  const handleResetPassword = async () => {
    if (!selectedUser) return

    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (newPass !== confirmPass) {
      toast.error("Passwords do not match")
      return
    }

    setIsResetting(true)

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.auth_user_id,
          newPassword: newPass,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Failed to reset password")
      }

      toast.success(
        `Password reset successfully for ${selectedUser.full_name || selectedUser.email}`
      )
      setResetModalOpen(false)
    } catch (error: any) {
      console.error("Reset error:", error)
      toast.error(error.message || "Failed to reset password")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New User Form */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Add New User</h2>
        <form onSubmit={addUser} className="flex gap-4 flex-wrap">
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

      {/* Manage Users Table */}
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
                    onCheckedChange={() =>
                      toggleUserStatus(user.id, user.is_active)
                    }
                  />
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell className="flex gap-2 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                  >
                    {user.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResetModal(user)}
                    className="flex items-center gap-1"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium text-foreground">
                {selectedUser?.full_name || selectedUser?.email}
              </span>
              . No email will be sent — the password is changed immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* New Password */}
            <div className="space-y-1">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPass ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPass && newPass !== confirmPass && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={
                isResetting ||
                newPass.length < 6 ||
                newPass !== confirmPass
              }
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
