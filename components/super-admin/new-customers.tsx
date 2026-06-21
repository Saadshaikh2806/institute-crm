"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { UserPlus, Search, RefreshCw, X } from "lucide-react"

interface NewCustomerRow {
    id: string
    name: string
    email: string | null
    phone: string | null
    status: string
    created_at: string
    user_id: string
    added_by_name: string
    added_by_email: string
}

export function NewCustomers() {
    const [customers, setCustomers] = useState<NewCustomerRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDate, setSelectedDate] = useState("")

    useEffect(() => {
        fetchNewCustomers()
    }, [])

    const fetchNewCustomers = async () => {
        setIsLoading(true)
        try {
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select('id, name, email, phone, status, created_at, user_id')
                .order('created_at', { ascending: false })
                .limit(200)

            if (customersError) throw customersError

            const { data: usersData, error: usersError } = await supabase
                .from('crm_users')
                .select('auth_user_id, full_name, email')

            if (usersError) throw usersError

            const usersById = new Map(
                (usersData || []).map(u => [u.auth_user_id, u])
            )

            const rows: NewCustomerRow[] = (customersData || []).map(c => {
                const addedBy = usersById.get(c.user_id)
                return {
                    ...c,
                    added_by_name: addedBy?.full_name || 'Unknown',
                    added_by_email: addedBy?.email || c.user_id,
                }
            })

            setCustomers(rows)
        } catch (error) {
            console.error('Error fetching new customers:', error)
            toast.error("Failed to fetch new customers")
        } finally {
            setIsLoading(false)
        }
    }

    const filteredCustomers = customers.filter(c => {
        const matchesSearch =
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.added_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.added_by_email?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesDate = !selectedDate ||
            new Date(c.created_at).toLocaleDateString('en-CA') === selectedDate

        return matchesSearch && matchesDate
    })

    const addedOnSelectedDate = selectedDate
        ? customers.filter(c => new Date(c.created_at).toLocaleDateString('en-CA') === selectedDate).length
        : customers.length

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'lead': return 'bg-blue-100 text-blue-800'
            case 'active': return 'bg-yellow-100 text-yellow-800'
            case 'admission_done': return 'bg-green-100 text-green-800'
            case 'career_counselling_done': return 'bg-purple-100 text-purple-800'
            case 'inactive': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers (latest 200)</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {selectedDate ? `Added on ${selectedDate}` : "Added (all time)"}
                        </CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{addedOnSelectedDate}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customer or added-by..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="relative">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-44"
                        />
                    </div>
                    {selectedDate && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDate("")}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
                <Button variant="outline" onClick={fetchNewCustomers} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Added On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-muted-foreground">{customer.email || customer.phone || '-'}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={getStatusBadgeColor(customer.status)}>
                                        {customer.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{customer.added_by_name}</div>
                                        <div className="text-sm text-muted-foreground">{customer.added_by_email}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {new Date(customer.created_at).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
