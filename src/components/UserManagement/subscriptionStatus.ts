import type { AdminUserRow } from '../../lib/adminApi'

export interface SubscriptionStatus {
  label: string
  className: string
}

export function getSubscriptionStatus(row: Pick<AdminUserRow, 'accessLevel' | 'subscriptionExpiresAt'>): SubscriptionStatus {
  const level = (row.accessLevel || 'free').toLowerCase()
  const expired = Boolean(row.subscriptionExpiresAt) && new Date(row.subscriptionExpiresAt!).getTime() < Date.now()

  if (level === 'free' || !level) {
    return { label: 'Free', className: 'bg-slate-100 text-slate-600' }
  }

  if (expired) {
    return { label: 'Expired', className: 'bg-red-50 text-red-700' }
  }

  if (level === 'trial') {
    return { label: 'Trial', className: 'bg-amber-50 text-amber-700' }
  }

  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700' }
}
