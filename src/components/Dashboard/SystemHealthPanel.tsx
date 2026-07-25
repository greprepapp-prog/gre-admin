import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { checkDatabaseHealth, checkEdgeFunctionHealth, type HealthCheckResult } from '../../lib/dashboardApi'

function StatusIcon({ status }: { status: HealthCheckResult['status'] }) {
  if (status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (status === 'slow') return <AlertCircle className="h-4 w-4 text-amber-600" />
  return <XCircle className="h-4 w-4 text-red-600" />
}

function statusLabel(status: HealthCheckResult['status']) {
  if (status === 'healthy') return 'Healthy'
  if (status === 'slow') return 'Slow'
  return 'Down'
}

export function SystemHealthPanel() {
  const [db, setDb] = useState<HealthCheckResult | null>(null)
  const [fn, setFn] = useState<HealthCheckResult | null>(null)
  const [checking, setChecking] = useState(false)

  async function runChecks() {
    setChecking(true)
    const [dbResult, fnResult] = await Promise.all([checkDatabaseHealth(), checkEdgeFunctionHealth()])
    setDb(dbResult)
    setFn(fnResult)
    setChecking(false)
  }

  useEffect(() => {
    runChecks()
  }, [])

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">System Health</h3>
        <button
          type="button"
          onClick={runChecks}
          disabled={checking}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Recheck
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Database connection</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            {db ? (
              <>
                <StatusIcon status={db.status} />
                {statusLabel(db.status)} ({db.latencyMs}ms)
              </>
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Edge function (admin-users)</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            {fn ? (
              <>
                <StatusIcon status={fn.status} />
                {statusLabel(fn.status)} ({fn.latencyMs}ms)
              </>
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
          </span>
        </div>

        {db?.message && <p className="px-1 text-xs text-red-600">DB: {db.message}</p>}
        {fn?.message && <p className="px-1 text-xs text-red-600">Function: {fn.message}</p>}
      </div>
    </div>
  )
}
