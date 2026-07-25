import { supabase } from './supabase'

export interface DashboardStats {
  total_users: number
  dau: number
  mau: number
  active_subscribers: number
  trial_users: number
  mrr: number
  active_sessions_today: number
  avg_lessons_completed: number
}

export interface TrendPoint {
  day: string
  registrations: number
  active_users: number
}

export interface LessonCompletionRate {
  lesson_id: number
  title: string
  started_count: number
  completed_count: number
  completion_rate: number
}

// Defensive: the RPC's returned JSON shape has drifted before (fields
// renamed/dropped directly in the DB, outside these migrations). Coerce
// every field individually so a missing/unexpected key can never reach
// the UI as `undefined` and crash a `.toLocaleString()` call.
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats')
  if (error) throw new Error(error.message)

  const raw = (data ?? {}) as Partial<DashboardStats>
  return {
    total_users: Number(raw.total_users) || 0,
    dau: Number(raw.dau) || 0,
    mau: Number(raw.mau) || 0,
    active_subscribers: Number(raw.active_subscribers) || 0,
    trial_users: Number(raw.trial_users) || 0,
    mrr: Number(raw.mrr) || 0,
    active_sessions_today: Number(raw.active_sessions_today) || 0,
    avg_lessons_completed: Number(raw.avg_lessons_completed) || 0,
  }
}

export async function getRegistrationTrend(days: number): Promise<TrendPoint[]> {
  const { data, error } = await supabase.rpc('get_admin_registration_trend', { p_days: days })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) return []

  return data.map((row: Partial<TrendPoint>) => ({
    day: row?.day ?? '',
    registrations: Number(row?.registrations) || 0,
    active_users: Number(row?.active_users) || 0,
  }))
}

export async function getLessonCompletionRates(): Promise<LessonCompletionRate[]> {
  const { data, error } = await supabase.rpc('get_admin_lesson_completion_rates')
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) return []

  return data.map((row: Partial<LessonCompletionRate>) => ({
    lesson_id: Number(row?.lesson_id) || 0,
    title: row?.title ?? `Lesson ${row?.lesson_id ?? '?'}`,
    started_count: Number(row?.started_count) || 0,
    completed_count: Number(row?.completed_count) || 0,
    completion_rate: Number(row?.completion_rate) || 0,
  }))
}

export interface HealthCheckResult {
  status: 'healthy' | 'slow' | 'down'
  latencyMs: number
  message?: string
}

const SLOW_THRESHOLD_MS = 800

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    await supabase.from('lessons').select('id').limit(1)
    const latencyMs = Math.round(performance.now() - start)
    return { status: latencyMs > SLOW_THRESHOLD_MS ? 'slow' : 'healthy', latencyMs }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unreachable',
    }
  }
}

export async function checkEdgeFunctionHealth(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'ping' } })
    const latencyMs = Math.round(performance.now() - start)
    if (error) return { status: 'down', latencyMs, message: error.message }
    return { status: latencyMs > SLOW_THRESHOLD_MS ? 'slow' : 'healthy', latencyMs }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : 'Unreachable',
    }
  }
}
