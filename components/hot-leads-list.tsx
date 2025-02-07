"use client"

import { useMemo } from "react"
import { Flame, Eye, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { useCRMStore } from "@/store/crm-store"
import { calculateLeadScore } from "@/lib/utils"
import { useState } from "react"

interface HotLeadsListProps {
  onClose: () => void
}

export function HotLeadsList({ onClose }: HotLeadsListProps) {
  const customers = useCRMStore((state) => state.customers)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const hotLeads = useMemo(() => {
    return customers.filter((c) => {
      if (c.status !== "lead") return false
      const score = calculateLeadScore(c.engagement, c.interestLevel, c.budgetFit)
      return score >= 80
    })
  }, [customers])

  if (hotLeads.length === 0) return null

  return (
    <Card className="relative border-orange-200">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <CardTitle>Hot Leads</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hotLeads.map((lead) => {
            const score = calculateLeadScore(
              lead.engagement,
              lead.interestLevel,
              lead.budgetFit
            )
            return (
              <Card key={lead.id} className="bg-orange-50 border-orange-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex justify-between items-center">
                    {lead.name}
                    <span className="text-sm bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                      {score}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">{lead.email}</p>
                    <p className="text-gray-600">{lead.phone}</p>
                    {lead.school && (
                      <p className="text-gray-600">School: {lead.school}</p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-gray-500 text-xs">
                        Source: {lead.source}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomerId(lead.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>

      {selectedCustomerId && (
        <CustomerDetailsDialog
          open={!!selectedCustomerId}
          onOpenChange={(open) => !open && setSelectedCustomerId(null)}
          customerId={selectedCustomerId}
        />
      )}
    </Card>
  )
} 