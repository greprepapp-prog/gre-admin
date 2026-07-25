import type { TicketPriority, TicketStatus } from '../../lib/supportApi'

export const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-sky-50 text-sky-700',
  pending: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
}

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
