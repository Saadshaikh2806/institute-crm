import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateLeadScore(engagement: number, interestLevel: number, budgetFit: number) {
  const score = Math.round((Number(engagement) + Number(interestLevel) + Number(budgetFit)) / 3)
  return isNaN(score) ? 0 : score
}

export function isHotLead(score: number) {
  return score >= 80
}

export function isWithinLast30Days(date: Date) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return date >= thirtyDaysAgo
}

export function downloadCSV(data: any[], filename: string) {
  // Convert customer data to CSV format
  const headers = [
    'Name',
    'Email',
    'Phone',
    'School',
    'Source',
    'Status',
    'Lead Score',
    'Tags',
    'Latest Interaction',
    'Open Tasks'
  ].join(',')

  const rows = data.map((customer) => {
    return [
      `"${customer.name}"`,
      `"${customer.email}"`,
      `"${customer.phone}"`,
      `"${customer.school || ''}"`,
      `"${customer.source}"`,
      `"${customer.status}"`,
      `"${customer.leadScore}%"`,
      `"${customer.tags.map((t: any) => t.name).join(', ')}"`,
      `"${customer.latestInteraction || ''}"`,
      `"${customer.openTasks}"`,
    ].join(',')
  })

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if the app is running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
    || document.referrer.includes('android-app://')
  
  // Check for PWA display mode
  const isPWADisplayMode = window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
  
  return isStandalone || isPWADisplayMode
}
