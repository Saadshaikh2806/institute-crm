"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Users, Activity, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { useCRMStore } from "@/store/crm-store"
import { isInstalledPWA } from "@/lib/utils"

interface SuperAdminHeaderProps {
    activeTab: string
    onTabChange: (tab: string) => void
}

export function SuperAdminHeader({ activeTab, onTabChange }: SuperAdminHeaderProps) {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [isPWA, setIsPWA] = useState(false)

    useEffect(() => {
        const checkPWA = () => {
            setIsPWA(isInstalledPWA())
        }

        checkPWA()

        const mediaQuery = window.matchMedia('(display-mode: standalone)')
        const handleChange = () => checkPWA()

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const handleSignOut = async () => {
        try {
            useCRMStore.getState().clearStore()

            const { error } = await supabase.auth.signOut()
            if (error) throw error

            router.push('/login')
            router.refresh()
            toast.success("Signed out successfully")
        } catch (error) {
            console.error('Error signing out:', error)
            toast.error("Error signing out")
        }
    }

    return (
        <div className="border-b bg-gradient-to-r from-purple-600 to-indigo-600">
            <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white">Super Admin</h1>
                    <Tabs value={activeTab} onValueChange={onTabChange} className="ml-6">
                        <TabsList className="bg-white/10">
                            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white data-[state=active]:text-purple-600">
                                <Users className="h-4 w-4 mr-2" />
                                Users
                            </TabsTrigger>
                            <TabsTrigger value="activity" className="text-white data-[state=active]:bg-white data-[state=active]:text-purple-600">
                                <Activity className="h-4 w-4 mr-2" />
                                Activity Logs
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white data-[state=active]:text-purple-600">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {!isPWA && (
                    <Button
                        variant="secondary"
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
