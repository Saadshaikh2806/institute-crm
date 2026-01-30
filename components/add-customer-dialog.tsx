"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCRMStore } from "@/store/crm-store"
import { toast } from "sonner"
import * as XLSX from 'xlsx'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const addCustomer = useCRMStore((state) => state.addCustomer)
  const fetchCustomers = useCRMStore((state) => state.fetchCustomers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    stdBoard: "",
    counsellorName: "",
    team: "",
    remarks: "",
    source: "",
    status: "lead" as const,
    leadScore: 0,
    engagement: 0,
    interestLevel: 0,
    budgetFit: 0,
    addedBy: ""
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const supabase = createClientComponentClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast.error("Please sign in to add customers");
      return;
    }

    const customerData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      school: formData.school,
      stdBoard: formData.stdBoard,
      counsellorName: formData.counsellorName,
      team: formData.team,
      remarks: formData.remarks,
      source: formData.source || 'direct',
      status: formData.status || 'lead',
      leadScore: formData.leadScore,
      engagement: formData.engagement,
      interestLevel: formData.interestLevel,
      budgetFit: formData.budgetFit,
      addedBy: formData.addedBy
    };

    try {
      await addCustomer(customerData);
      await fetchCustomers();
      toast.success("Customer added successfully");
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        school: "",
        stdBoard: "",
        counsellorName: "",
        team: "",
        remarks: "",
        source: "",
        status: "lead",
        leadScore: 0,
        engagement: 0,
        interestLevel: 0,
        budgetFit: 0,
        addedBy: ""
      });
    } catch (error: any) {
      console.error("Error adding customer:", error);
      toast.error(error.message);
    }
  };

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

  const processFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          let data: any[] = []

          if (file.type === 'text/csv') {
            const text = e.target?.result as string
            const rows = text.split('\n')
            const headers = rows[0].split(',').map(h => h.trim())

            data = rows.slice(1).map(row => {
              const values = row.split(',').map(v => v.trim())
              return headers.reduce((obj, header, i) => {
                obj[header.toLowerCase()] = values[i]
                return obj
              }, {} as any)
            })
          } else {
            const workbook = XLSX.read(e.target?.result, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            data = XLSX.utils.sheet_to_json(worksheet)
          }

          resolve(data.filter(row =>
            row.name &&
            row.phone &&
            Object.values(row).some(v => v)
          ))
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(reader.error)

      if (file.type === 'text/csv') {
        reader.readAsText(file)
      } else {
        reader.readAsBinaryString(file)
      }
    })
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (!formData.addedBy) {
      toast.error('Please enter your name in the "Added By" field first')
      return
    }

    const supabase = createClientComponentClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast.error("Please sign in to add customers");
      return;
    }

    setIsSubmitting(true)
    try {
      const processedData = await processFile(selectedFile)

      if (processedData.length === 0) {
        toast.error('No valid records found in file')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const record of processedData) {
        try {
          await addCustomer({
            name: record.name,
            email: record.email || '',
            phone: record.phone,
            school: record.school || '',
            stdBoard: record.stdboard || record['std/board'] || '',
            counsellorName: record.counsellorname || record['counsellor name'] || '',
            team: record.team || '',
            remarks: record.remarks || record.remark || '',
            source: record.source || record.leadsource || record['lead source'] || 'Other',
            status: (record.status?.toLowerCase() === 'active' ||
              record.status?.toLowerCase() === 'inactive')
              ? record.status.toLowerCase()
              : 'lead',
            leadScore: 0,
            engagement: 0,
            interestLevel: 0,
            budgetFit: 0,
            addedBy: record.addedby || formData.addedBy
          })
          successCount++
        } catch (error) {
          console.error('Error adding record:', record, error)
          errorCount++
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} customers`)
      }
      if (errorCount > 0) {
        toast.error(`Failed to add ${errorCount} customers`)
      }

      // Reset file selection
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Close dialog if all successful
      if (errorCount === 0) {
        onOpenChange(false)
      }

    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Failed to process file')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[425px] h-[90vh] sm:h-auto overflow-y-auto" aria-describedby="add-customer-description">
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
                <Label htmlFor="addedBy">Added By *</Label>
                <Input
                  id="addedBy"
                  placeholder="Enter your name or identifier"
                  value={formData.addedBy}
                  onChange={(e) => handleChange("addedBy", e.target.value)}
                  required
                />
              </div>
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
                <Label htmlFor="stdBoard">STD/Board (Optional)</Label>
                <Input
                  id="stdBoard"
                  placeholder="Enter STD/Board (e.g., 10th, 12th)"
                  value={formData.stdBoard}
                  onChange={(e) => handleChange("stdBoard", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counsellorName">Counsellor Name (Optional)</Label>
                <Input
                  id="counsellorName"
                  placeholder="Enter counsellor name"
                  value={formData.counsellorName}
                  onChange={(e) => handleChange("counsellorName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select value={formData.team} onValueChange={(value) => handleChange("team", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sangeeta">Sangeeta</SelectItem>
                    <SelectItem value="Kavita">Kavita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  placeholder="Enter any remarks"
                  value={formData.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleChange("source", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
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
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="bulk">
            <div className="space-y-4">
              {/* Add Added By field for bulk imports */}
              <div className="space-y-2">
                <Label htmlFor="bulkAddedBy">Added By *</Label>
                <Input
                  id="bulkAddedBy"
                  placeholder="Enter your name or identifier"
                  value={formData.addedBy}
                  onChange={(e) => handleChange("addedBy", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used as fallback if not specified in the CSV file
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  onClick={() => {
                    const sampleData = [
                      ['Name', 'Phone', 'STD/Board', 'Counsellor Name', 'Lead Source', 'Team', 'Remarks', 'Email', 'School', 'Status'],
                      ['John Doe', '1234567890', '10th', 'Poonam Maam', 'Website', 'Sangeeta', 'Follow up required', 'john@example.com', 'ABC School', 'lead'],
                      ['Jane Smith', '0987654321', '12th', 'Leena Maam', 'Referral', 'Kavita', 'Interested in admission', 'jane@example.com', 'XYZ School', 'lead']
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
                className={`rounded-lg border border-dashed p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/10' : ''
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

