"use client"

import { useState, useEffect, useMemo } from "react"
import { X, CalendarIcon, Trash2, Phone } from "lucide-react" // Add Phone to imports
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
import { calculateLeadScore, isHotLead, cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarPicker } from "@/components/calendar-picker"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
    fetchCustomers,
    deleteTask
  } = useCRMStore()

  const customer = customers.find((c) => c.id === customerId)
  const customerInteractions = interactions.filter((i) => i.customerId === customerId)
  const customerTasks = tasks.filter((t) => t.customerId === customerId)
  const customerTags = tags.filter((t) => t.customerId === customerId)

  const [newInteraction, setNewInteraction] = useState<{ type: "note" | "call" | "email" | "meeting", details: string }>({ type: "note", details: "" })
  const [newTask, setNewTask] = useState("")
  const [taskDueDate, setTaskDueDate] = useState<Date>(new Date())
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
  const [showCalendar, setShowCalendar] = useState(false);

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

    const supabase = createClientComponentClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast.error("Please sign in to add tasks");
      return;
    }

    try {
      await addTask({
        customerId,
        userId: session.user.id,  // Add this line
        title: newTask,
        completed: false,
        dueDate: taskDueDate,
        createdAt: new Date().toISOString()
      })
      setNewTask("")
      setTaskDueDate(new Date()) // Reset date to today
      await fetchTasks(customerId)
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId)
      await fetchTasks(customerId)
      toast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
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
      <DialogContent className="max-w-[95vw] w-full h-[90vh] lg:max-w-[85vw] xl:max-w-7xl p-0 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex-shrink-0">
          <DialogHeader className="space-y-4">
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
                    <Button onClick={handleSaveDetails} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="hover:bg-gray-100">
                      Edit Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onOpenChange(false)} 
                      className="ml-2 hover:bg-gray-100"
                      aria-label="Close dialog"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
            {/* Left Column */}
            <div className="space-y-4 overflow-y-auto">
              {/* Contact Info Card */}
              <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm space-y-3">
                <h3 className="font-semibold text-lg">Contact Information</h3>
                <div className="grid gap-4">
                  {/* Add this new field */}
                  <div className="space-y-2">
                    <Label>Added By</Label>
                    <p className="text-sm text-gray-600">{customer?.addedBy}</p>
                  </div>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">{customer?.phone}</p>
                        {customer?.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
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
                      <Select 
                        value={editedDetails.source} 
                        onValueChange={(value) => setEditedDetails(prev => ({ ...prev, source: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem> {/* Add this line */}
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-600">{customer?.source}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm space-y-3">
                <h3 className="font-semibold text-lg">Status</h3>
                <Select value={customer.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Card */}
              <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm space-y-3">
                <h3 className="font-semibold text-lg">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {customerTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700"
                    >
                      {tag.name}
                      <button onClick={() => handleDeleteTag(tag.id)} className="hover:text-red-500">
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
                    className="flex-1"
                  />
                  <Button onClick={handleAddTag} size="sm">Add</Button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 overflow-y-auto">
              {/* Lead Scoring Card */}
              <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Lead Scoring</h3>
                  <span className={cn(
                    "text-sm px-2 py-1 rounded-full font-medium",
                    isHotLead(currentLeadScore) 
                      ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    Score: {currentLeadScore}%
                  </span>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Engagement</Label>
                      <span className="text-muted-foreground">{scores.engagement}%</span>
                    </div>
                    <Slider
                      value={[Number(scores.engagement)]}
                      onValueChange={([value]) => setScores((prev) => ({ ...prev, engagement: value }))}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Interest Level</Label>
                      <span className="text-muted-foreground">{scores.interestLevel}%</span>
                    </div>
                    <Slider
                      value={[Number(scores.interestLevel)]}
                      onValueChange={([value]) => setScores((prev) => ({ ...prev, interestLevel: value }))}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Budget Fit</Label>
                      <span className="text-muted-foreground">{scores.budgetFit}%</span>
                    </div>
                    <Slider
                      value={[Number(scores.budgetFit)]}
                      onValueChange={([value]) => setScores((prev) => ({ ...prev, budgetFit: value }))}
                      max={100}
                      step={1}
                    />
                  </div>
                  <Button 
                    onClick={handleScoreUpdate} 
                    className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90"
                  >
                    Update Score
                  </Button>
                </div>
              </div>

              {/* Combined Interactions & Tasks Card */}
              <div className="p-3 sm:p-4 rounded-lg border bg-white shadow-sm">
                <Tabs defaultValue="interactions" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="interactions">Interactions</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="interactions" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <Select
                        value={newInteraction.type}
                        onValueChange={(value: "note" | "call" | "email" | "meeting") => 
                          setNewInteraction(prev => ({ ...prev, type: value }))}
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
                        className="h-20"
                      />
                      <Button className="w-full" onClick={handleAddInteraction}>
                        Add Interaction
                      </Button>
                    </div>
                    
                    <div className="max-h-[30vh] overflow-y-auto pr-2">
                      {customerInteractions.length === 0 ? (
                        <div className="text-muted-foreground text-center py-8">
                          No interactions recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
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
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <Input
                        placeholder="New task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex gap-2 relative">
                        <button
                          onClick={() => setShowCalendar(!showCalendar)}
                          className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
                        >
                          <span className="text-gray-600">📅</span>
                          {format(taskDueDate, "MMM d, yyyy")}
                        </button>
                        <Button onClick={handleAddTask}>Add Task</Button>
                        
                        {showCalendar && (
                          <div className="absolute top-full left-0 mt-1 z-50">
                            <div 
                              className="fixed inset-0" 
                              onClick={() => setShowCalendar(false)}
                            />
                            <div className="relative">
                              <CalendarPicker
                                selectedDate={taskDueDate}
                                onDateSelect={(date) => {
                                  setTaskDueDate(date);
                                  setShowCalendar(false);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-[30vh] overflow-y-auto pr-2">
                      {customerTasks.length === 0 ? (
                        <div className="text-muted-foreground text-center py-8">
                          No tasks yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customerTasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleTask(task.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <div className="flex-1">
                                <span className={task.completed ? "line-through text-gray-500" : ""}>
                                  {task.title}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  Due: {format(new Date(task.dueDate), "PPP")}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

