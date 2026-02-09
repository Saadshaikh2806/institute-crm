"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function AuthCallbackHandler() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple processing attempts
      if (isProcessing) return
      setIsProcessing(true)

      // Check if we have an access token in the URL hash
      if (window.location.hash && window.location.hash.includes('access_token=')) {
        try {
          // First, exchange the hash for a session
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (!accessToken || !refreshToken) {
            router.replace('/login?error=invalid_token')
            return
          }

          // Set the session
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (setSessionError) {
            console.error('Set session error:', setSessionError)
            router.replace('/login?error=auth')
            return
          }

          // Get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError || !session?.user?.email) {
            console.error('Session error:', sessionError)
            router.replace('/login?error=no_user')
            return
          }

          // Get the user's role
          const { data: userData, error: userError } = await supabase
            .from('crm_users')
            .select('role, is_active, email')
            .eq('email', session.user.email)
            .single()

          if (userError || !userData) {
            console.error('User error:', userError)
            router.replace('/login?error=no_access')
            return
          }

          // Check if user is active
          if (!userData.is_active) {
            router.replace('/login?error=inactive')
            return
          }

          // Update last login
          await supabase
            .from('crm_users')
            .update({ last_login: new Date().toISOString() })
            .eq('email', userData.email)

          // Clear the hash from the URL without triggering a refresh
          window.history.replaceState(null, '', window.location.pathname)

          // Redirect based on role - use replace to prevent back navigation issues
          if (userData.role === 'admin') {
            router.replace('/admin')
          } else {
            router.replace('/')
          }
        } catch (error) {
          console.error('Auth callback error:', error)
          router.replace('/login?error=callback')
        } finally {
          setIsProcessing(false)
        }
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent mx-auto"></div>
        <h2 className="text-xl font-medium">Authenticating...</h2>
        <p className="text-muted-foreground">Please wait while we log you in</p>
      </div>
    </div>
  )
}
