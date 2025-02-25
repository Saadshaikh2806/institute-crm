"use client"

import { Eye, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { useState, useRef } from "react"
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
  const tableContainerRef = useRef<HTMLDivElement>(null)

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
    <div ref={tableContainerRef} className="rounded-lg border bg-gradient-to-b from-white to-gray-50/50 p-6 shadow-sm">
      <div className="mb-6 flex justify-between items-start space-y-2">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Customers</h2>
          <div className="text-sm text-muted-foreground rounded-md bg-gray-50 p-3 border">
            <p className="font-medium mb-2">Search Tips:</p>
            <ul className="space-y-1 text-gray-500">
              <li>• Search by name, email, phone, school, or source</li>
              <li>• Use tags, interactions, and tasks</li>
              <li>• Type score:80 for exact matches</li>
              <li>• Use score:&gt;70 for ranges</li>
            </ul>
          </div>
        </div>
        {filteredCustomers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
            {...downloadButtonProps}
          >
            <Download className="h-4 w-4" />
            Export {filteredCustomers.length} records
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">School</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Added By</TableHead> {/* Add this line */}
              <TableHead className="font-semibold">Lead Score</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <p className="mb-2">No customers found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-gray-600">{customer.email}</TableCell>
                  <TableCell className="text-gray-600">{customer.phone}</TableCell>
                  <TableCell>{customer.school || "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-gray-100 text-gray-800">
                      {customer.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">{customer.addedBy}</TableCell> {/* Add this line */}
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            isHotLead(getLeadScore(customer)) 
                              ? "bg-gradient-to-r from-orange-500 to-red-500" 
                              : "bg-gradient-to-r from-blue-500 to-violet-500"
                          )}
                          style={{
                            width: `${getLeadScore(customer)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {getLeadScore(customer)}%
                        </span>
                        {isHotLead(getLeadScore(customer)) && (
                          <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                            Hot <span className="animate-pulse">🔥</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-gray-100"
                        onClick={() => setSelectedCustomer(customer.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedCustomer && (
        <CustomerDetailsDialog
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
          customerId={selectedCustomer}
        />
      )}
    </div>
  )
}

