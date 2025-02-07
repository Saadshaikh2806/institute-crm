"use client"

import { Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { useState } from "react"
import { useCRMStore } from "@/store/crm-store"
import { toast } from "sonner"
import type { Customer } from "@/types/crm"
import { calculateLeadScore, isHotLead } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface CustomerTableProps {
  searchQuery: string
}

export function CustomerTable({ searchQuery }: CustomerTableProps) {
  const customers = useCRMStore((state) => state.customers)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const { deleteCustomer } = useCRMStore()

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery),
  )

  const getLeadScore = (customer: Customer) => {
    return calculateLeadScore(customer.engagement, customer.interestLevel, customer.budgetFit)
  }

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteCustomer(id)
      toast.success("Customer deleted successfully")
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lead Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCustomers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.school || "-"}</TableCell>
                <TableCell className="capitalize">{customer.status}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={cn(
                          "h-2.5 rounded-full transition-all duration-300",
                          isHotLead(getLeadScore(customer)) ? "bg-orange-500" : "bg-blue-500"
                        )}
                        style={{
                          width: `${getLeadScore(customer)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {getLeadScore(customer)}%
                      </span>
                      {isHotLead(getLeadScore(customer)) && (
                        <span className="text-xs text-orange-600 font-medium">
                          Hot 🔥
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCustomer(customer.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedCustomer && (
        <CustomerDetailsDialog
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
          customerId={selectedCustomer}
        />
      )}
    </>
  )
}

