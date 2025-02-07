"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Users, UserPlus, Activity, Flame, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomerTable } from "@/components/customer-table"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCRMStore } from "@/store/crm-store"
import { calculateLeadScore, isHotLead } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { HotLeadsList } from "@/components/hot-leads-list"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function CustomerDashboard() {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [showHotLeads, setShowHotLeads] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { 
    customers, 
    fetchCustomers,
    fetchAllInteractions,
    fetchAllTasks,
    fetchAllTags 
  } = useCRMStore()
  const supabase = createClientComponentClient()
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    // Fetch all data when component mounts
    fetchCustomers()
    fetchAllInteractions()
    fetchAllTasks()
    fetchAllTags()
  }, [fetchCustomers, fetchAllInteractions, fetchAllTasks, fetchAllTags])

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session?.user?.email) return
      
      const { data } = await supabase
        .from('crm_users')
        .select('role')
        .eq('email', session.user.email)
        .single()
        
      setIsAdmin(data?.role === 'admin')
    }
    
    checkAdminStatus()
  }, [session, supabase])

  const totalCustomers = customers.length
  const newLeads = customers.filter((c) => c.status === "lead").length
  const activeCustomers = customers.filter((c) => c.status === "active").length
  
  // Update hot leads calculation
  const hotLeads = useMemo(() => {
    return customers.filter((c) => {
      if (c.status !== "lead") return false
      const score = Math.round(
        (Number(c.engagement) + Number(c.interestLevel) + Number(c.budgetFit)) / 3
      )
      return score >= 80
    }).length
  }, [customers])

  // Force refresh of customers data periodically or after updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCustomers()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchCustomers])

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push('/login')
      toast.success("Signed out successfully")
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error("Error signing out")
      setIsSigningOut(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ADCI CRM</h1>
        <div className="flex gap-4">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline">
                Admin Panel
              </Button>
            </Link>
          )}
          <Button onClick={() => setIsAddCustomerOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "bg-orange-50 transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-orange-200",
            hotLeads > 0 && "bg-orange-100 ring-2 ring-orange-500"
          )}
          onClick={() => setShowHotLeads(!showHotLeads)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Flame className={cn(
              "h-4 w-4 text-orange-500",
              hotLeads > 0 && "animate-pulse"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              hotLeads > 0 ? "text-orange-500" : "text-gray-500"
            )}>
              {hotLeads}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {showHotLeads && <HotLeadsList onClose={() => setShowHotLeads(false)} />}
        
        <div className="space-y-4">
          <Input
            ref={searchInputRef}
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <CustomerTable searchQuery={searchQuery} />
        </div>
      </div>

      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} />
    </div>
  )
}

