"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const RATE_LIMIT_DURATION = 60 * 1000 // 60 seconds in milliseconds

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [errorDisplayed, setErrorDisplayed] = useState(false)

  // Load last attempt from localStorage and set initial countdown
  useEffect(() => {
    const stored = localStorage.getItem('lastLoginAttempt')
    if (stored) {
      const lastAttemptTime = parseInt(stored)
      setLastAttempt(lastAttemptTime)
      const remaining = Math.max(0, RATE_LIMIT_DURATION - (Date.now() - lastAttemptTime))
      setCountdown(Math.ceil(remaining / 1000))
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Calculate remaining cooldown time
  const getRemainingCooldown = () => {
    if (!lastAttempt) return 0
    const elapsed = Date.now() - lastAttempt
    const remaining = Math.max(0, RATE_LIMIT_DURATION - elapsed)
    return remaining
  }

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
      } else if (error === 'no_code') {
        toast.error("Invalid login link. Please try again.")
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

    // Check rate limit
    const remainingCooldown = getRemainingCooldown()
    if (remainingCooldown > 0) {
      const secondsLeft = Math.ceil(remainingCooldown / 1000)
      setCountdown(secondsLeft)
      toast.error(`Please wait ${secondsLeft} seconds before trying again`)
      return
    }

    setIsLoading(true)
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedUsername = username.trim()

    try {
      console.log('Checking user access for:', normalizedEmail)
      
      // Check for the specific user
      const { data: users, error: userError } = await supabase
        .from('crm_users')
        .select('role, is_active, email, full_name')
        .eq('email', normalizedEmail)

      console.log('User query result:', { users, userError, normalizedEmail })

      if (userError) {
        console.error('User lookup error:', userError)
        toast.error("Error checking user access. Please try again.")
        return
      }

      const user = users?.[0]
      if (!user) {
        console.log('No user found for email:', normalizedEmail)
        toast.error("Invalid username or email combination")
        return
      }

      if (!user.is_active) {
        console.log('User is inactive:', normalizedEmail)
        toast.error("Your account is inactive. Please contact your administrator.")
        return
      }

      console.log('Found user:', user)
      console.log('Sending magic link to:', normalizedEmail)
      
      // Send magic link
      const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: user.role
          }
        },
      })

      if (otpError) {
        console.error('OTP error:', otpError)
        
        // Store the attempt timestamp and set countdown regardless of error type
        const now = Date.now()
        localStorage.setItem('lastLoginAttempt', now.toString())
        setLastAttempt(now)
        
        if (otpError.message.includes('rate limit')) {
          // Set a longer countdown for rate limit errors (3 minutes)
          setCountdown(180)
          toast.error("Rate limit reached. Please wait 3 minutes before trying again.")
        } else {
          // Regular cooldown for other errors
          setCountdown(RATE_LIMIT_DURATION / 1000)
          toast.error("Failed to send login link. Please try again later.")
        }
        return
      }

      console.log('Magic link sent successfully')
      toast.success("Magic link sent to your email!")

      // Set a cooldown even on success to prevent spam
      const now = Date.now()
      localStorage.setItem('lastLoginAttempt', now.toString())
      setLastAttempt(now)
      setCountdown(30) // 30 second cooldown even on success

    } catch (error: any) {
      console.error('Login error:', error)
      if (error.message) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.error("Failed to send login link. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isRateLimited = countdown > 0

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isLoading || isRateLimited}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isRateLimited}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button disabled={isLoading || isRateLimited}>
            {isLoading && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            )}
            {isRateLimited 
              ? `Wait ${countdown}s` 
              : 'Sign In with Email'}
          </Button>
          {!isRateLimited && (
            <p className="text-xs text-muted-foreground mt-1">
              Limited to 3 login attempts per hour
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
