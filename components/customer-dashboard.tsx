"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Users, UserPlus, Activity, Flame, LogOut, Instagram, Linkedin, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomerTable } from "@/components/customer-table"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCRMStore } from "@/store/crm-store"
import { calculateLeadScore, isHotLead, isWithinLast30Days, isInstalledPWA } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { HotLeadsList } from "@/components/hot-leads-list"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { DueTasksList } from "./due-tasks-list"

export function CustomerDashboard() {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [showHotLeads, setShowHotLeads] = useState(false)
  const [showDueTasks, setShowDueTasks] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { 
    customers, 
    fetchCustomers,
    fetchAllInteractions,
    fetchAllTasks,
    fetchAllTags,
    tasks
  } = useCRMStore()
  const supabase = createClientComponentClient()
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [fullName, setFullName] = useState("")  // Changed from username
  // Add state to track if app is running as installed PWA
  const [isPWA, setIsPWA] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    } finally {
      setIsSigningOut(false)
    }
  }

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

  useEffect(() => {
    async function fetchUserDetails() {
      if (!session?.user?.email) return
      
      const { data } = await supabase  // Get the data first
        .from('crm_users')
        .select('full_name')
        .eq('email', session.user.email)
        .single()
        
      const full_name = data?.full_name  // Safely access the property
        
      if (full_name) {  // Use the snake_case name from database
        setFullName(full_name)  // Convert to camelCase when setting state
      }
    }
    
    fetchUserDetails()
  }, [session, supabase])

  const totalCustomers = customers.length
  const newLeads = customers.filter((c) => 
    c.status === "lead" && isWithinLast30Days(c.createdAt)
  ).length
  
  // Calculate due tasks (not completed and due date is today or earlier)
  const dueTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return tasks.filter((task) => {
      if (task.completed) return false
      const taskDate = new Date(task.dueDate)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate <= today
    })
  }, [tasks])
  
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

  // Updated fetch to include user isolation based on the session user id.
  // Ensure your fetchCustomers function (likely defined in your store) applies a filter:
  // Example update inside fetchCustomers:
  // const { data, error } = await supabase
  //   .from('customers')
  //   .select('*')
  //   .eq('user_id', session.user.id)
  //
  // ...existing call to fetchCustomers...
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, session?.user?.id]);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col w-full sm:w-auto">
          <h1 className="text-2xl font-bold">ADCI CRM</h1>
          <h2 className="text-3xl font-bold mt-2 text-primary truncate">
            Welcome, {fullName || 'User'}
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span>Developed by Saad Shaikh</span>
            <div className="flex flex-wrap items-center gap-2">
              <a 
                href="https://www.instagram.com/saad__shaikh___" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <Instagram className="h-4 w-4" />
                <span>@saad__shaikh___</span>
              </a>
              <span>•</span>
              <a 
                href="https://www.linkedin.com/in/saad-shaikh-5b7774258/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <Linkedin className="h-4 w-4" />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isAdmin && (
            <Link href="/admin" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Admin Panel
              </Button>
            </Link>
          )}
          <Button className="w-full sm:w-auto" onClick={() => setIsAddCustomerOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
          {/* Only show sign out button if not running as installed PWA */}
          {!isPWA && (
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
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
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">New Leads (30d)</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "bg-blue-50 transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-blue-200",
            dueTasks.length > 0 && "bg-blue-100 ring-2 ring-blue-500"
          )}
          onClick={() => setShowDueTasks(!showDueTasks)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Tasks</CardTitle>
            <CheckSquare className={cn(
              "h-4 w-4 text-blue-500",
              dueTasks.length > 0 && "animate-pulse"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              dueTasks.length > 0 ? "text-blue-500" : "text-gray-500"
            )}>
              {dueTasks.length}
            </div>
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
        {showDueTasks && <DueTasksList onClose={() => setShowDueTasks(false)} />}
        
        <div className="space-y-4">
          <Input
            ref={searchInputRef}
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-full sm:max-w-md"
          />
          <CustomerTable 
            searchQuery={searchQuery} 
            downloadButtonProps={{ "data-download-button": true } as const}
            data-customer-table // Add this attribute
          />
        </div>
      </div>

      <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} />
    </div>
  )
}

