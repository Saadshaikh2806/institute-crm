"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { useCRMStore } from "@/store/crm-store"
import { toast } from "sonner"
import { format } from "date-fns"

interface CustomerDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string | null
}

export function CustomerDetailsDialog({ open, onOpenChange, customerId }: CustomerDetailsDialogProps) {
  const {
    customers,
    interactions,
    tasks,
    tags,
    updateCustomerStatus,
    updateLeadScore,
    addInteraction,
    addTask,
    addTag,
    deleteTag,
    toggleTaskComplete,
  } = useCRMStore()

  const customer = customers.find((c) => c.id === customerId)
  const customerInteractions = interactions.filter((i) => i.customerId === customerId)
  const customerTasks = tasks.filter((t) => t.customerId === customerId)
  const customerTags = tags.filter((t) => t.customerId === customerId)

  const [newTag, setNewTag] = useState("")
  const [newTask, setNewTask] = useState("")
  const [interactionType, setInteractionType] = useState("note")
  const [interactionDetails, setInteractionDetails] = useState("")
  const [scores, setScores] = useState({
    engagement: 0,
    interestLevel: 0,
    budgetFit: 0,
  })

  // Reset scores when customer changes
  useEffect(() => {
    if (customer) {
      setScores({
        engagement: customer.engagement || 0,
        interestLevel: customer.interestLevel || 0,
        budgetFit: customer.budgetFit || 0,
      })
    }
  }, [customer])

  if (!customer) return null

  const handleAddTag = () => {
    if (!newTag.trim()) return
    addTag({ name: newTag, customerId: customer.id })
    setNewTag("")
    toast.success("Tag added successfully")
  }

  const handleAddTask = () => {
    if (!newTask.trim()) return
    addTask({
      title: newTask,
      customerId: customer.id,
      completed: false,
      dueDate: new Date(),
    })
    setNewTask("")
    toast.success("Task added successfully")
  }

  const handleAddInteraction = () => {
    if (!interactionDetails.trim()) return
    addInteraction({
      customerId: customer.id,
      type: interactionType as any,
      details: interactionDetails,
    })
    setInteractionDetails("")
    toast.success("Interaction added successfully")
  }

  const handleUpdateScores = () => {
    if (customerId) {
      const newScores = {
        engagement: Number(scores.engagement),
        interestLevel: Number(scores.interestLevel),
        budgetFit: Number(scores.budgetFit),
      }

      // Check if scores have actually changed
      const hasChanged =
        customer.engagement !== newScores.engagement ||
        customer.interestLevel !== newScores.interestLevel ||
        customer.budgetFit !== newScores.budgetFit

      if (hasChanged) {
        updateLeadScore(customerId, newScores)
        toast.success("Lead scores updated successfully")
      } else {
        toast.info("No changes to update")
      }
    }
  }

  const calculateAverageScore = () => {
    return Math.round((scores.engagement + scores.interestLevel + scores.budgetFit) / 3)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" aria-describedby="customer-details-description">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <p id="customer-details-description" className="text-sm text-muted-foreground">
            View and manage customer information, interactions, and lead scoring
          </p>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Name:</span> {customer.name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {customer.email}
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {customer.phone}
                </p>
                <p>
                  <span className="font-medium">Source:</span> {customer.source}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Tags</h3>
              <div className="flex gap-2 flex-wrap mb-2">
                {customerTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    {tag.name}
                    <button onClick={() => deleteTag(tag.id)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newTag.trim()) {
                      addTag({ name: newTag, customerId: customer.id })
                      setNewTag("")
                      toast.success("Tag added successfully")
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Status</h3>
              <div className="flex gap-2">
                <Select
                  value={customer.status}
                  onValueChange={(value) => updateCustomerStatus(customer.id, value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Lead Score: {calculateAverageScore()}%</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Engagement ({scores.engagement}%)</Label>
                  <Slider
                    value={[Number(scores.engagement)]}
                    onValueChange={([value]) => setScores((prev) => ({ ...prev, engagement: value }))}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Level ({scores.interestLevel}%)</Label>
                  <Slider
                    value={[Number(scores.interestLevel)]}
                    onValueChange={([value]) => setScores((prev) => ({ ...prev, interestLevel: value }))}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget Fit ({scores.budgetFit}%)</Label>
                  <Slider
                    value={[Number(scores.budgetFit)]}
                    onValueChange={([value]) => setScores((prev) => ({ ...prev, budgetFit: value }))}
                    max={100}
                    step={1}
                  />
                </div>
                <Button className="w-full" onClick={handleUpdateScores} variant="default">
                  Update Score
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Interaction</h3>
              <div className="space-y-4">
                <Select value={interactionType} onValueChange={setInteractionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Enter interaction details..."
                  value={interactionDetails}
                  onChange={(e) => setInteractionDetails(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    if (interactionDetails.trim()) {
                      addInteraction({
                        customerId: customer.id,
                        type: interactionType as any,
                        details: interactionDetails,
                      })
                      setInteractionDetails("")
                      toast.success("Interaction added successfully")
                    }
                  }}
                >
                  Add Interaction
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Interaction History</h3>
              {customerInteractions.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">No interactions recorded yet.</div>
              ) : (
                <div className="space-y-4">
                  {customerInteractions.map((interaction) => (
                    <div key={interaction.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{interaction.type}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(interaction.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{interaction.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tasks</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="New task..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newTask.trim()) {
                        addTask({
                          title: newTask,
                          customerId: customer.id,
                          completed: false,
                          dueDate: new Date(),
                        })
                        setNewTask("")
                        toast.success("Task added successfully")
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newTask.trim()) {
                        addTask({
                          title: newTask,
                          customerId: customer.id,
                          completed: false,
                          dueDate: new Date(),
                        })
                        setNewTask("")
                        toast.success("Task added successfully")
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              {customerTasks.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">No tasks created yet</div>
              ) : (
                <div className="space-y-2">
                  {customerTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskComplete(task.id)}
                        className="h-4 w-4"
                      />
                      <span className={task.completed ? "line-through" : ""}>{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

