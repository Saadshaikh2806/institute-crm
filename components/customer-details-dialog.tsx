"use client"

import { useState, useEffect, useMemo } from "react"
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
import type { Customer } from "@/types/crm"
import { calculateLeadScore, isHotLead } from "@/lib/utils"

interface CustomerDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

export function CustomerDetailsDialog({ open, onOpenChange, customerId }: CustomerDetailsDialogProps) {
  const {
    customers,
    interactions,
    tasks,
    tags,
    updateCustomerStatus,
    updateLeadScore,
    updateCustomerDetails,
    addInteraction,
    addTask,
    toggleTaskComplete,
    addTag,
    deleteTag,
    fetchInteractions,
    fetchTasks,
    fetchTags,
    fetchCustomers
  } = useCRMStore()

  const customer = customers.find((c) => c.id === customerId)
  const customerInteractions = interactions.filter((i) => i.customerId === customerId)
  const customerTasks = tasks.filter((t) => t.customerId === customerId)
  const customerTags = tags.filter((t) => t.customerId === customerId)

  const [newInteraction, setNewInteraction] = useState<{ type: "note" | "call" | "email" | "meeting", details: string }>({ type: "note", details: "" })
  const [newTask, setNewTask] = useState("")
  const [newTag, setNewTag] = useState("")
  const [scores, setScores] = useState({
    engagement: customer?.engagement || 0,
    interestLevel: customer?.interestLevel || 0,
    budgetFit: customer?.budgetFit || 0
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editedDetails, setEditedDetails] = useState({
    name: '',
    email: '',
    phone: '',
    school: '',
    source: ''
  })

  const currentLeadScore = useMemo(() => {
    return calculateLeadScore(scores.engagement, scores.interestLevel, scores.budgetFit)
  }, [scores])

  useEffect(() => {
    if (customer) {
      setScores({
        engagement: customer.engagement,
        interestLevel: customer.interestLevel,
        budgetFit: customer.budgetFit
      })
      setEditedDetails({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        school: customer.school || '',
        source: customer.source
      })
    }
  }, [customer])

  useEffect(() => {
    if (open && customerId) {
      fetchInteractions(customerId)
      fetchTasks(customerId)
      fetchTags(customerId)
    }
  }, [open, customerId, fetchInteractions, fetchTasks, fetchTags])

  if (!customer) return null

  const handleStatusChange = async (status: Customer["status"]) => {
    try {
      await updateCustomerStatus(customerId, status)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleScoreUpdate = async () => {
    try {
      const updatedScores = {
        engagement: Number(scores.engagement),
        interestLevel: Number(scores.interestLevel),
        budgetFit: Number(scores.budgetFit)
      }
      
      await updateLeadScore(customerId, updatedScores)
      
      // The fetchCustomers call in updateLeadScore will update all counters
      // including the hot leads counter in the dashboard
    } catch (error) {
      console.error('Error updating scores:', error)
      toast.error('Failed to update scores')
    }
  }

  const handleAddInteraction = async () => {
    if (!newInteraction.details.trim()) {
      toast.error("Interaction details are required")
      return
    }

    try {
      await addInteraction({
        customerId,
        type: newInteraction.type,
        details: newInteraction.details
      })
      setNewInteraction({ type: "note", details: "" })
      await fetchInteractions(customerId)
    } catch (error) {
      console.error('Error adding interaction:', error)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      toast.error("Task title is required")
      return
    }

    try {
      await addTask({
        customerId,
        title: newTask,
        completed: false,
        dueDate: new Date()
      })
      setNewTask("")
      await fetchTasks(customerId)
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast.error("Tag name is required")
      return
    }

    try {
      await addTag({
        customerId,
        name: newTag
      })
      setNewTag("")
      await fetchTags(customerId)
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId)
      await fetchTags(customerId)
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId)
      await fetchTasks(customerId)
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleSaveDetails = async () => {
    try {
      await updateCustomerDetails(customerId, editedDetails)
      setIsEditing(false)
      toast.success('Customer details updated successfully')
    } catch (error) {
      toast.error('Failed to update customer details')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Input
                  value={editedDetails.name}
                  onChange={(e) => setEditedDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-semibold"
                />
              ) : (
                <span className="text-xl font-semibold">{customer?.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSaveDetails} variant="default">
                    Save
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
          <p id="customer-details-description" className="text-sm text-muted-foreground">
            View and manage customer information, interactions, and lead scoring
          </p>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      value={editedDetails.email}
                      onChange={(e) => setEditedDetails(prev => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{customer?.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editedDetails.phone}
                      onChange={(e) => setEditedDetails(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{customer?.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>School</Label>
                  {isEditing ? (
                    <Input
                      value={editedDetails.school}
                      onChange={(e) => setEditedDetails(prev => ({ ...prev, school: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{customer?.school || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  {isEditing ? (
                    <Input
                      value={editedDetails.source}
                      onChange={(e) => setEditedDetails(prev => ({ ...prev, source: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{customer?.source}</p>
                  )}
                </div>
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
                    <button onClick={() => handleDeleteTag(tag.id)} className="hover:text-destructive">
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
                />
                <Button onClick={handleAddTag}>Add</Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Status</h3>
              <div className="flex gap-2">
                <Select
                  value={customer.status}
                  onValueChange={handleStatusChange}
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
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Lead Score: {currentLeadScore}%</h3>
                {isHotLead(currentLeadScore) && (
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">
                    Hot Lead 🔥
                  </span>
                )}
              </div>
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
                <Button className="w-full" onClick={handleScoreUpdate} variant="default">
                  Update Score
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Interaction</h3>
              <div className="space-y-4">
                <Select
                  value={newInteraction.type}
                  onValueChange={(value: "note" | "call" | "email" | "meeting") => setNewInteraction(prev => ({ ...prev, type: value }))}
                >
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
                  value={newInteraction.details}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, details: e.target.value }))}
                />
                <Button
                  className="w-full"
                  onClick={handleAddInteraction}
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
                  />
                  <Button onClick={handleAddTask}>Add</Button>
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
                        onChange={() => handleToggleTask(task.id)}
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

