export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  school?: string
  source: string
  status: "lead" | "active" | "inactive"
  leadScore: number
  engagement: number
  interestLevel: number
  budgetFit: number
  createdAt: Date
  updatedAt: Date
}

export interface Interaction {
  id: string
  customerId: string
  type: "note" | "call" | "email" | "meeting"
  details: string
  createdAt: Date
}

export interface Task {
  id: string
  customerId: string
  title: string
  completed: boolean
  dueDate: Date
}

export interface Tag {
  id: string
  name: string
  customerId: string
}

