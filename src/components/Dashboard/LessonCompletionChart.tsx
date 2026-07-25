import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LessonCompletionRate } from '../../lib/dashboardApi'

interface Props {
  data: LessonCompletionRate[]
}

export function LessonCompletionChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: `L${d.lesson_id}`,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Vocabulary & Lesson Engagement</h3>
      <p className="text-xs text-slate-400">Completion rate per lesson (% of starters who passed)</p>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(value, name) => [name === 'completion_rate' ? `${value}%` : value, name]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.title ?? label}
            />
            <Bar dataKey="completion_rate" name="Completion rate" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
