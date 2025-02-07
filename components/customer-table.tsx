"use client"

import { Eye, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { useState } from "react"
import { useCRMStore } from "@/store/crm-store"
import { toast } from "sonner"
import type { Customer } from "@/types/crm"
import { calculateLeadScore, isHotLead, downloadCSV } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface CustomerTableProps {
  searchQuery: string
  downloadButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    'data-download-button'?: boolean
  }
}

export function CustomerTable({ searchQuery, downloadButtonProps }: CustomerTableProps) {
  const customers = useCRMStore((state) => state.customers)
  const interactions = useCRMStore((state) => state.interactions)
  const tasks = useCRMStore((state) => state.tasks)
  const tags = useCRMStore((state) => state.tags)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const { deleteCustomer } = useCRMStore()

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true

    const searchLower = searchQuery.toLowerCase()
    
    // Search in customer basic info
    const basicInfoMatch = [
      customer.name,
      customer.email,
      customer.phone,
      customer.school,
      customer.source,
      customer.status
    ].some(field => field?.toLowerCase().includes(searchLower))
    
    if (basicInfoMatch) return true

    // Search in customer tags
    const customerTags = tags.filter(tag => tag.customerId === customer.id)
    const tagMatch = customerTags.some(tag => 
      tag.name.toLowerCase().includes(searchLower)
    )
    if (tagMatch) return true

    // Search in customer interactions
    const customerInteractions = interactions.filter(interaction => 
      interaction.customerId === customer.id
    )
    const interactionMatch = customerInteractions.some(interaction =>
      interaction.details.toLowerCase().includes(searchLower) ||
      interaction.type.toLowerCase().includes(searchLower)
    )
    if (interactionMatch) return true

    // Search in customer tasks
    const customerTasks = tasks.filter(task => task.customerId === customer.id)
    const taskMatch = customerTasks.some(task =>
      task.title.toLowerCase().includes(searchLower)
    )
    if (taskMatch) return true

    // Search by lead score range (e.g., "score:80" or "score:>70")
    if (searchLower.startsWith('score:')) {
      const scoreQuery = searchLower.replace('score:', '').trim()
      const customerScore = calculateLeadScore(
        customer.engagement,
        customer.interestLevel,
        customer.budgetFit
      )
      
      if (scoreQuery.startsWith('>')) {
        return customerScore > parseInt(scoreQuery.substring(1))
      } else if (scoreQuery.startsWith('<')) {
        return customerScore < parseInt(scoreQuery.substring(1))
      } else {
        return customerScore === parseInt(scoreQuery)
      }
    }

    return false
  })

  const getLeadScore = (customer: Customer) => {
    return calculateLeadScore(customer.engagement, customer.interestLevel, customer.budgetFit)
  }

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteCustomer(id)
      toast.success("Customer deleted successfully")
    }
  }

  const prepareCustomerDataForExport = (customers: Customer[]) => {
    return customers.map(customer => {
      const customerTags = tags.filter(tag => tag.customerId === customer.id)
      const customerInteractions = interactions.filter(
        interaction => interaction.customerId === customer.id
      )
      const customerTasks = tasks.filter(task => task.customerId === customer.id)
      
      const latestInteraction = customerInteractions[0]?.details || ''
      const openTasks = customerTasks.filter(task => !task.completed).length

      return {
        ...customer,
        tags: customerTags,
        latestInteraction,
        openTasks,
        leadScore: getLeadScore(customer)
      }
    })
  }

  const handleDownload = () => {
    const exportData = prepareCustomerDataForExport(filteredCustomers)
    const filename = searchQuery 
      ? `customers_${searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`
      : 'all_customers.csv'
    
    downloadCSV(exportData, filename)
    toast.success('Customer data downloaded successfully')
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-start">
        <div className="text-sm text-muted-foreground">
          <p>Search tips:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Search by name, email, phone, school, or source</li>
            <li>Search in tags, interactions, and tasks</li>
            <li>Use score:80 to find exact score matches</li>
            <li>Use score:&gt;70 or score:&lt;90 for score ranges</li>
          </ul>
        </div>
        {filteredCustomers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
            {...downloadButtonProps}
          >
            <Download className="h-4 w-4" />
            Download {filteredCustomers.length} results
          </Button>
        )}
      </div>
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

