"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"

export function AdminHeader() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push('/login')
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
        
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
} 