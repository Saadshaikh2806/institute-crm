"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [errorDisplayed, setErrorDisplayed] = useState(false)

  // Show error messages if any, but only once
  useEffect(() => {
    const error = searchParams?.get('error')

    if (error && !errorDisplayed) {
      setErrorDisplayed(true)

      if (error === 'auth') {
        toast.error("Authentication failed. Please try again.")
      } else if (error === 'callback') {
        toast.error("Login process failed. Please try again.")
      } else if (error === 'no_access') {
        toast.error("You don't have access to the CRM. Please contact your administrator.")
      } else if (error === 'no_user') {
        toast.error("User not found. Please try again.")
      } else if (error === 'inactive') {
        toast.error("Your account is inactive. Please contact your administrator.")
      } else if (error === 'invalid_token') {
        toast.error("Invalid authentication token. Please try logging in again.")
      } else if (error === 'admin_required') {
        toast.error("You need administrator access for this area. Please login with an admin account.")
      }

      // Clear the error from URL without refreshing the page
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, errorDisplayed])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const normalizedEmail = email.toLowerCase().trim()

    try {
      // Check if user exists and is active in CRM
      const { data: users, error: userError } = await supabase
        .from('crm_users')
        .select('role, is_active, email, full_name')
        .eq('email', normalizedEmail)

      if (userError) {
        console.error('User lookup error:', userError)
        toast.error("Error checking user access. Please try again.")
        return
      }

      const user = users?.[0]
      if (!user) {
        toast.error("Invalid email or password")
        return
      }

      if (!user.is_active) {
        toast.error("Your account is inactive. Please contact your administrator.")
        return
      }

      // Attempt to sign in with password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      })

      if (authError) {
        console.error('Authentication error:', authError)

        if (authError.message.includes('Invalid login credentials')) {
          toast.error("Invalid email or password")
        } else {
          toast.error("Login failed. Please try again.")
        }
        return
      }

      // Update last login timestamp
      await supabase
        .from('crm_users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', normalizedEmail)

      toast.success("Login successful!")

      // Redirect based on user role
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
      router.refresh()

    } catch (error: any) {
      console.error('Login error:', error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button disabled={isLoading} type="submit">
            {isLoading && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            )}
            Sign In
          </Button>
        </div>
      </form>
    </div>
  )
}
