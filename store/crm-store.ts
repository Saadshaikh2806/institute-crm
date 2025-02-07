import { create } from "zustand"
import type { Customer, Interaction, Task, Tag } from "@/types/crm"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface CRMStore {
  customers: Customer[]
  interactions: Interaction[]
  tasks: Task[]
  tags: Tag[]
  fetchCustomers: () => Promise<void>
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  updateCustomerStatus: (id: string, status: Customer["status"]) => Promise<void>
  updateLeadScore: (id: string, scores: { engagement: number; interestLevel: number; budgetFit: number }) => Promise<void>
  addInteraction: (interaction: Omit<Interaction, "id" | "createdAt">) => Promise<void>
  addTask: (task: Omit<Task, "id">) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<void>
  addTag: (tag: Omit<Tag, "id">) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  fetchInteractions: (customerId: string) => Promise<void>
  fetchTasks: (customerId: string) => Promise<void>
  fetchTags: (customerId: string) => Promise<void>
  fetchAllInteractions: () => Promise<void>
  fetchAllTasks: () => Promise<void>
  fetchAllTags: () => Promise<void>
  updateCustomerDetails: (
    id: string,
    details: {
      name: string
      email: string
      phone: string
      school?: string
      source: string
    }
  ) => Promise<void>
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  customers: [],
  interactions: [],
  tasks: [],
  tags: [],

  fetchCustomers: async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({
        customers: customers.map(customer => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          school: customer.school,
          source: customer.source,
          status: customer.status,
          leadScore: Number(customer.lead_score) || 0,
          engagement: Number(customer.engagement) || 0,
          interestLevel: Number(customer.interest_level) || 0,
          budgetFit: Number(customer.budget_fit) || 0,
          createdAt: new Date(customer.created_at),
          updatedAt: new Date(customer.updated_at)
        }))
      })
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
    }
  },

  addCustomer: async (customerData) => {
    try {
      // Convert camelCase to snake_case for Supabase
      const supabaseData = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        school: customerData.school,
        source: customerData.source,
        status: customerData.status,
        lead_score: 0,
        engagement: 0,
        interest_level: 0,
        budget_fit: 0,
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([supabaseData])
        .select()

      if (error) throw error

      if (data) {
        // Convert snake_case back to camelCase for the frontend
        const newCustomer: Customer = {
          id: data[0].id,
          name: data[0].name,
          email: data[0].email,
          phone: data[0].phone,
          school: data[0].school,
          source: data[0].source,
          status: data[0].status,
          leadScore: data[0].lead_score || 0,
          engagement: data[0].engagement || 0,
          interestLevel: data[0].interest_level || 0,
          budgetFit: data[0].budget_fit || 0,
          createdAt: new Date(data[0].created_at),
          updatedAt: new Date(data[0].updated_at),
        }

        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }))

        toast.success('Customer added successfully')
      }
    } catch (error) {
      console.error('Error adding customer:', error)
      toast.error('Failed to add customer')
      throw error
    }
  },

  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        customers: state.customers.filter((customer) => customer.id !== id),
      }))

      toast.success('Customer deleted successfully')
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Failed to delete customer')
    }
  },

  updateCustomerStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.id === id 
            ? { ...customer, status, updatedAt: new Date() }
            : customer
        ),
      }))

      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating customer status:', error)
      toast.error('Failed to update status')
    }
  },

  updateLeadScore: async (id, scores) => {
    try {
      const calculatedLeadScore = Math.round(
        (Number(scores.engagement) + Number(scores.interestLevel) + Number(scores.budgetFit)) / 3
      );

      const updateData = {
        lead_score: calculatedLeadScore,
        engagement: Number(scores.engagement),
        interest_level: Number(scores.interestLevel),
        budget_fit: Number(scores.budgetFit),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Update local state immediately
      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.id === id
            ? {
                ...customer,
                leadScore: calculatedLeadScore,
                engagement: Number(scores.engagement),
                interestLevel: Number(scores.interestLevel),
                budgetFit: Number(scores.budgetFit),
                updatedAt: new Date()
              }
            : customer
        ),
      }))

      toast.success('Lead scores updated successfully')
    } catch (error) {
      console.error('Error updating lead scores:', error)
      toast.error('Failed to update lead scores')
    }
  },

  addInteraction: async (interaction) => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .insert([{
          customer_id: interaction.customerId,
          type: interaction.type,
          details: interaction.details,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) throw error

      if (data) {
        const newInteraction: Interaction = {
          id: data[0].id,
          customerId: data[0].customer_id,
          type: data[0].type,
          details: data[0].details,
          createdAt: new Date(data[0].created_at)
        }

        set((state) => ({
          interactions: [...state.interactions, newInteraction]
        }))

        toast.success('Interaction added successfully')
      }
    } catch (error) {
      console.error('Error adding interaction:', error)
      toast.error('Failed to add interaction')
      throw error
    }
  },

  addTask: async (task) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          customer_id: task.customerId,
          title: task.title,
          completed: task.completed,
          due_date: task.dueDate.toISOString()
        }])
        .select()

      if (error) throw error

      if (data) {
        const newTask: Task = {
          id: data[0].id,
          customerId: data[0].customer_id,
          title: data[0].title,
          completed: data[0].completed,
          dueDate: new Date(data[0].due_date)
        }

        set((state) => ({
          tasks: [...state.tasks, newTask]
        }))

        toast.success('Task added successfully')
      }
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
      throw error
    }
  },

  toggleTaskComplete: async (id) => {
    try {
      const task = get().tasks.find(t => t.id === id)
      if (!task) return

      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      }))

      toast.success('Task updated successfully')
    } catch (error) {
      console.error('Error toggling task:', error)
      toast.error('Failed to update task')
    }
  },

  addTag: async (tag) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{
          customer_id: tag.customerId,
          name: tag.name
        }])
        .select()

      if (error) throw error

      if (data) {
        const newTag: Tag = {
          id: data[0].id,
          customerId: data[0].customer_id,
          name: data[0].name
        }

        set((state) => ({
          tags: [...state.tags, newTag]
        }))

        toast.success('Tag added successfully')
      }
    } catch (error) {
      console.error('Error adding tag:', error)
      toast.error('Failed to add tag')
      throw error
    }
  },

  deleteTag: async (id) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== id)
      }))

      toast.success('Tag deleted successfully')
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Failed to delete tag')
    }
  },

  fetchInteractions: async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ interactions: data.map(interaction => ({
        id: interaction.id,
        customerId: interaction.customer_id,
        type: interaction.type,
        details: interaction.details,
        createdAt: new Date(interaction.created_at)
      }))})
    } catch (error) {
      console.error('Error fetching interactions:', error)
      toast.error('Failed to fetch interactions')
    }
  },

  fetchTasks: async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ tasks: data.map(task => ({
        id: task.id,
        customerId: task.customer_id,
        title: task.title,
        completed: task.completed,
        dueDate: new Date(task.due_date)
      }))})
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to fetch tasks')
    }
  },

  fetchTags: async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('customer_id', customerId)

      if (error) throw error

      set({ tags: data.map(tag => ({
        id: tag.id,
        customerId: tag.customer_id,
        name: tag.name
      }))})
    } catch (error) {
      console.error('Error fetching tags:', error)
      toast.error('Failed to fetch tags')
    }
  },

  fetchAllInteractions: async () => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ 
        interactions: data.map(interaction => ({
          id: interaction.id,
          customerId: interaction.customer_id,
          type: interaction.type,
          details: interaction.details,
          createdAt: new Date(interaction.created_at)
        }))
      })
    } catch (error) {
      console.error('Error fetching interactions:', error)
    }
  },

  fetchAllTasks: async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ 
        tasks: data.map(task => ({
          id: task.id,
          customerId: task.customer_id,
          title: task.title,
          completed: task.completed,
          dueDate: new Date(task.due_date)
        }))
      })
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  },

  fetchAllTags: async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')

      if (error) throw error

      set({ 
        tags: data.map(tag => ({
          id: tag.id,
          customerId: tag.customer_id,
          name: tag.name
        }))
      })
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  },

  updateCustomerDetails: async (id, details) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: details.name,
          email: details.email,
          phone: details.phone,
          school: details.school,
          source: details.source,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // Update local state
      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.id === id
            ? {
                ...customer,
                ...details,
                updatedAt: new Date()
              }
            : customer
        ),
      }))

      toast.success('Customer details updated successfully')
    } catch (error) {
      console.error('Error updating customer details:', error)
      toast.error('Failed to update customer details')
      throw error
    }
  }
}))

