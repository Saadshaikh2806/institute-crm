"use client"

import { useState, useMemo } from "react"
import { X, Eye, CheckSquare, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCRMStore } from "@/store/crm-store"
import { format } from "date-fns"
import { CustomerDetailsDialog } from "@/components/customer-details-dialog"
import { toast } from "sonner"
import { Task } from "@/types/crm"

interface DueTasksListProps {
  onClose: () => void
}

export function DueTasksList({ onClose }: DueTasksListProps) {
  const { tasks, customers, toggleTaskComplete } = useCRMStore()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

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

  // Group tasks by customer
  const tasksByCustomer = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    
    dueTasks.forEach(task => {
      if (!grouped[task.customerId]) {
        grouped[task.customerId] = []
      }
      grouped[task.customerId].push(task)
    })
    
    return grouped
  }, [dueTasks])

  const handleToggleTask = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId)
      toast.success("Task status updated")
    } catch (error) {
      toast.error("Failed to update task")
    }
  }

  const getCustomerById = (id: string) => {
    return customers.find(c => c.id === id)
  }

  if (dueTasks.length === 0) return null

  return (
    <Card className="border-blue-500 shadow-lg animate-in fade-in duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-50">
        <CardTitle className="text-lg font-bold text-blue-700 flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Due Tasks
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 max-h-[70vh] overflow-y-auto">
        {Object.entries(tasksByCustomer).map(([customerId, tasks]) => {
          const customer = getCustomerById(customerId)
          if (!customer) return null
          
          return (
            <div key={customerId} className="mb-6 border-b pb-4 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-lg">{customer.name}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => window.open(`tel:${customer.phone}`)}
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 mt-3">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-start gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <div className={task.completed ? "line-through text-gray-500" : ""}>
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        Due: {format(new Date(task.dueDate), "PPP")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
      
      {selectedCustomerId && (
        <CustomerDetailsDialog
          open={!!selectedCustomerId}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomerId(null)
          }}
          customerId={selectedCustomerId}
        />
      )}
    </Card>
  )
}
