import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import {
  Activity,
  BadgeDollarSign,
  BookOpenCheck,
  CalendarClock,
  Gauge,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  getDashboardStats,
  getLessonCompletionRates,
  getRegistrationTrend,
  type DashboardStats,
  type LessonCompletionRate,
  type TrendPoint,
} from '../../lib/dashboardApi'
import { StatCard } from './StatCard'
import { TrendChart } from './TrendChart'
import { LessonCompletionChart } from './LessonCompletionChart'
import { SystemHealthPanel } from './SystemHealthPanel'

const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [completionRates, setCompletionRates] = useState<LessonCompletionRate[]>([])
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll(currentRange: 7 | 30 | 90) {
    setLoading(true)
    setError(null)
    try {
      const [statsResult, trendResult, ratesResult] = await Promise.all([
        getDashboardStats(),
        getRegistrationTrend(currentRange),
        getLessonCompletionRates(),
      ])
      setStats(statsResult)
      setTrend(trendResult)
      setCompletionRates(ratesResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRangeChange(next: 7 | 30 | 90) {
    setRange(next)
    setError(null)
    try {
      const trendResult = await getRegistrationTrend(next)
      setTrend(trendResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trend data.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Key metrics across users, subscriptions, and engagement.</p>
        </div>
        <button
          type="button"
          onClick={() => loadAll(range)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        !loading && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">User Growth</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard icon={UserPlus} label="Total Registrations" value={(stats?.total_users ?? 0).toLocaleString()} />
                <StatCard icon={Users} label="Daily Active Users" value={(stats?.dau ?? 0).toLocaleString()} hint="signed in within 24h" />
                <StatCard icon={UserCheck} label="Monthly Active Users" value={(stats?.mau ?? 0).toLocaleString()} hint="signed in within 30d" />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Subscription & Revenue
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard icon={BadgeDollarSign} label="Active Subscribers" value={(stats?.active_subscribers ?? 0).toLocaleString()} />
                <StatCard icon={CalendarClock} label="Active Trial Users" value={(stats?.trial_users ?? 0).toLocaleString()} />
                <StatCard
                  icon={Gauge}
                  label="Estimated MRR"
                  value={currencyFormatter.format(stats?.mrr ?? 0)}
                  hint="based on placeholder plan prices — adjust in the SQL migration"
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Engagement & Activity
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard
                  icon={Activity}
                  label="Active Sessions Today"
                  value={(stats?.active_sessions_today ?? 0).toLocaleString()}
                  hint="completed a lesson/exam today"
                />
                <StatCard
                  icon={BookOpenCheck}
                  label="Avg. Lessons Completed"
                  value={(stats?.avg_lessons_completed ?? 0).toLocaleString()}
                  hint="per registered user"
                />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TrendChart data={trend} range={range} onRangeChange={handleRangeChange} />
              <LessonCompletionChart data={completionRates} />
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">System Health</h3>
              <SystemHealthPanel />
            </section>
          </>
        )
      )}
    </div>
  )
}
