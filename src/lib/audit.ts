import { supabase } from './supabase'

export interface AuditLogEntry {
  id: string
  admin_id: string
  target_user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export async function logAdminAction(
  adminId: string,
  targetUserId: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    details,
  })
}

export async function fetchAuditLogForUser(targetUserId: string): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('target_user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw new Error(error.message)
  return (data ?? []) as AuditLogEntry[]
}
