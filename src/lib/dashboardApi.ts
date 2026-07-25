import { supabase } from './supabase'

export interface DashboardStats {
  total_registrations: number
  dau: number
  mau: number
  active_subscribers: number
  active_trial_users: number
  estimated_mrr: number
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats')
  if (error) throw new Error(error.message)
  return data as DashboardStats
}

export async function getRegistrationTrend(days: number): Promise<TrendPoint[]> {
  const { data, error } = await supabase.rpc('get_admin_registration_trend', { p_days: days })
  if (error) throw new Error(error.message)
  return (data ?? []) as TrendPoint[]
}

export async function getLessonCompletionRates(): Promise<LessonCompletionRate[]> {
  const { data, error } = await supabase.rpc('get_admin_lesson_completion_rates')
  if (error) throw new Error(error.message)
  return (data ?? []) as LessonCompletionRate[]
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
