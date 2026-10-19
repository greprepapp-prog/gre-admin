import { supabase } from './supabase'

export interface AdminUserRow {
  id: string
  email: string | null
  provider: string
  createdAt: string
  lastSignInAt: string | null
  lastStudiedAt: string | null
  isBanned: boolean
  fullName: string | null
  platform: string | null
  appOpenCount: number
  lastPracticedAt: string | null
  accessLevel: string
  planType: string | null
  subscriptionExpiresAt: string | null
}

async function invoke<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

export function listAdminUsers() {
  return invoke<{ users: AdminUserRow[] }>('list')
}

export function setUserBan(userId: string, banned: boolean) {
  return invoke<{ ok: true }>('set_ban', { userId, banned })
}

export interface SubscriptionOverrideInput {
  accessLevel: string
  planType?: string | null
  expiresAt?: string | null
}

export function setUserSubscription(userId: string, input: SubscriptionOverrideInput) {
  return invoke<{ ok: true }>('set_subscription', { userId, ...input })
}

export function setUserPassword(userId: string, password: string) {
  return invoke<{ ok: true }>('set_password', { userId, password })
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId })
  if (error) throw new Error(error.message)
}
