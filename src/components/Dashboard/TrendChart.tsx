import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../../lib/dashboardApi'

interface Props {
  data: TrendPoint[]
  range: 7 | 30 | 90
  onRangeChange: (range: 7 | 30 | 90) => void
}

const RANGES: (7 | 30 | 90)[] = [7, 30, 90]

export function TrendChart({ data, range, onRangeChange }: Props) {
  const formatted = (data ?? []).map((d) => {
    const parsed = d?.day ? new Date(d.day) : null
    return {
      day: d?.day ?? '',
      registrations: d?.registrations ?? 0,
      active_users: d?.active_users ?? 0,
      label: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
    }
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Registration & Active User Trends</h3>
          <p className="text-xs text-slate-400">
            Active = distinct users who completed a lesson or exam that day
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={
                range === r
                  ? 'rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white'
                  : 'rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100'
              }
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="registrations" name="Registrations" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="active_users" name="Active users" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
