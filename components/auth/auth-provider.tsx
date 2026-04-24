"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Session, createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Loader2 } from "lucide-react"
import { clearBrowserSessionToken, getBrowserSessionToken } from "@/lib/single-session"

interface AuthContextType {
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
})

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: Session | null
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    // Set initial loading to false after a short delay
    setTimeout(() => setIsLoading(false), 1000)

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  useEffect(() => {
    if (!session?.user?.email) return

    let isMounted = true

    const enforceSingleSession = async () => {
      const browserSessionToken = getBrowserSessionToken()

      if (!browserSessionToken) return

      const { data, error } = await supabase
        .from('crm_users')
        .select('active_session_token')
        .eq('email', session.user.email)
        .single()

      if (!isMounted || error) return

      if (data?.active_session_token && data.active_session_token !== browserSessionToken) {
        clearBrowserSessionToken()
        await supabase.auth.signOut()
        window.location.replace('/login?error=session_replaced')
      }
    }

    enforceSingleSession()
    const interval = window.setInterval(enforceSingleSession, 15000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [session?.user?.email, supabase])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 
