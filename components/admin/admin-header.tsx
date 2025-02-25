"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { useCRMStore } from "@/store/crm-store"
import { isInstalledPWA } from "@/lib/utils"

export function AdminHeader() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isPWA, setIsPWA] = useState(false)
  
  // Update the useEffect for PWA detection
  useEffect(() => {
    // Check if app is running as PWA on component mount
    const checkPWA = () => {
      setIsPWA(isInstalledPWA())
    }
    
    // Initial check
    checkPWA()
    
    // Also listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = (e: MediaQueryListEvent) => checkPWA()
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleSignOut = async () => {
    try {
      // Clear the store data first
      useCRMStore.getState().clearStore()
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push('/login')
      router.refresh() // Force a router refresh
      toast.success("Signed out successfully")
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error("Error signing out")
    }
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        
        {/* Only show sign out button if not running as installed PWA */}
        {!isPWA && (
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        )}
      </div>
    </div>
  )
}
