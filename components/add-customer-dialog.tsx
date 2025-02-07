"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCRMStore } from "@/store/crm-store"
import { toast } from "sonner"

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const addCustomer = useCRMStore((state) => state.addCustomer)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    source: "",
    status: "lead" as const,
    leadScore: 0,
    engagement: 0,
    interestLevel: 0,
    budgetFit: 0,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required")
      return
    }

    try {
      setIsSubmitting(true)
      await addCustomer(formData)
      onOpenChange(false)
      setFormData({
        name: "",
        email: "",
        phone: "",
        school: "",
        source: "",
        status: "lead",
        leadScore: 0,
        engagement: 0,
        interestLevel: 0,
        budgetFit: 0,
      })
    } catch (error) {
      console.error('Error in form submission:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (file: File) => {
    if (!file) return
    
    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    toast.success('File selected: ' + file.name)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setIsSubmitting(true)
    try {
      // Here you would implement the actual file processing
      // For now, just show a success message
      toast.success('File upload started')
      // TODO: Implement file processing logic
      
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="add-customer-description">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <p id="add-customer-description" className="text-sm text-muted-foreground">
            Add a single customer or bulk import from CSV/Excel
          </p>
        </DialogHeader>
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Customer</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School Name (Optional)</Label>
                <Input
                  id="school"
                  placeholder="Enter school name if applicable"
                  value={formData.school}
                  onChange={(e) => handleChange("school", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleChange("source", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="bulk">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  variant="link" 
                  onClick={() => {
                    const sampleData = [
                      ['Name', 'Email', 'Phone', 'School', 'Source', 'Status'],
                      ['John Doe', 'john@example.com', '1234567890', 'ABC School', 'Website', 'lead'],
                      ['Jane Smith', 'jane@example.com', '0987654321', 'XYZ School', 'Referral', 'lead']
                    ]
                    
                    const csvContent = sampleData
                      .map(row => row.join(','))
                      .join('\n')
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'sample_customers.csv'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                  }}
                  className="text-sm"
                >
                  Download Sample CSV
                </Button>
              </div>
              <div
                className={`rounded-lg border border-dashed p-8 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/10' : ''
                } ${selectedFile ? 'border-green-500 bg-green-50' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".csv,.xlsx"
                  className="hidden"
                />
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {selectedFile ? selectedFile.name : 'Upload CSV/Excel'}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedFile
                      ? 'File selected - Click upload to process'
                      : 'Drag and drop your file here, or click to browse'}
                  </p>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleFileUpload}
                disabled={!selectedFile || isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Upload and Import'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Supported formats: CSV, Excel (.xlsx)
                <br />
                Maximum file size: 5MB
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

