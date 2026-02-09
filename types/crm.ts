export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  school?: string
  stdBoard?: string
  counsellorName?: string
  team?: string
  remarks?: string
  source: string
  status: "lead" | "active" | "inactive"
  leadScore: number
  engagement: number
  interestLevel: number
  budgetFit: number
  createdAt: Date
  updatedAt: Date
  addedBy: string
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
  userId: string
  title: string
  completed: boolean
  dueDate: Date | string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  customerId: string
}

export type UserRole = "super_admin" | "admin" | "user"

export interface UserActivityLog {
  id: string
  userId: string
  userEmail?: string
  actionType: ActivityActionType
  entityType?: EntityType
  entityId?: string
  details?: Record<string, any>
  ipAddress?: string
  createdAt: Date
}

export type ActivityActionType =
  | "login"
  | "logout"
  | "customer_create"
  | "customer_update"
  | "customer_delete"
  | "customer_status_change"
  | "task_create"
  | "task_complete"
  | "task_delete"
  | "interaction_add"
  | "tag_add"
  | "tag_delete"
  | "user_create"
  | "user_update"
  | "user_deactivate"

export type EntityType = "customer" | "task" | "interaction" | "tag" | "user"

export interface UserStats {
  userId: string
  authUserId: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  customerCount: number
  taskCount: number
  completedTaskCount: number
  lastActivity: Date | null
}
