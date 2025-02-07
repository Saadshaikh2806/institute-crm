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
