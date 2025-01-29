import { create } from "zustand"
import type { Customer, Interaction, Task, Tag } from "@/types/crm"

interface CRMStore {
  customers: Customer[]
  interactions: Interaction[]
  tasks: Task[]
  tags: Tag[]
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => void
  deleteCustomer: (id: string) => void
  updateCustomerStatus: (id: string, status: Customer["status"]) => void
  updateLeadScore: (id: string, scores: { engagement: number; interestLevel: number; budgetFit: number }) => void
  addInteraction: (interaction: Omit<Interaction, "id" | "createdAt">) => void
  addTask: (task: Omit<Task, "id">) => void
  toggleTaskComplete: (id: string) => void
  addTag: (tag: Omit<Tag, "id">) => void
  deleteTag: (id: string) => void
}

export const useCRMStore = create<CRMStore>((set) => ({
  customers: [],
  interactions: [],
  tasks: [],
  tags: [],

  addCustomer: (customer) =>
    set((state) => ({
      customers: [
        ...state.customers,
        {
          ...customer,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })),

  deleteCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== id),
      interactions: state.interactions.filter((interaction) => interaction.customerId !== id),
      tasks: state.tasks.filter((task) => task.customerId !== id),
      tags: state.tags.filter((tag) => tag.customerId !== id),
    })),

  updateCustomerStatus: (id, status) =>
    set((state) => ({
      customers: state.customers.map((customer) =>
        customer.id === id ? { ...customer, status, updatedAt: new Date() } : customer,
      ),
    })),

  updateLeadScore: (id, scores) =>
    set((state) => ({
      customers: state.customers.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              engagement: Number(scores.engagement),
              interestLevel: Number(scores.interestLevel),
              budgetFit: Number(scores.budgetFit),
              leadScore: Math.round(
                (Number(scores.engagement) + Number(scores.interestLevel) + Number(scores.budgetFit)) / 3,
              ),
              updatedAt: new Date(),
            }
          : customer,
      ),
    })),

  addInteraction: (interaction) =>
    set((state) => ({
      interactions: [
        ...state.interactions,
        {
          ...interaction,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
        },
      ],
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...task,
          id: Math.random().toString(36).substr(2, 9),
        },
      ],
    })),

  toggleTaskComplete: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    })),

  addTag: (tag) =>
    set((state) => ({
      tags: [
        ...state.tags,
        {
          ...tag,
          id: Math.random().toString(36).substr(2, 9),
        },
      ],
    })),

  deleteTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
    })),
}))

