import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Sparkles, TimerReset } from 'lucide-react'
import type { UserContext } from '../../lib/supportApi'
import { extendTrial, resetProgress } from '../../lib/supportApi'
import { CANNED_RESPONSES } from './cannedResponses'
import { capitalize } from './badges'

interface Props {
  userId: string
  context: UserContext | null
  loading: boolean
  error: string | null
  onRefreshContext: () => void
  onInsertCannedResponse: (text: string) => void
}

export function UserContextSidebar({ userId, context, loading, error, onRefreshContext, onInsertCannedResponse }: Props) {
  const [extending, setExtending] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleExtendTrial() {
    setExtending(true)
    setActionMessage(null)
    try {
      const result = await extendTrial(userId, 7)
      setActionMessage({ ok: true, text: `Extended to ${new Date(result.expires_at).toLocaleDateString()}.` })
      onRefreshContext()
    } catch (err) {
      setActionMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to extend trial.' })
    } finally {
      setExtending(false)
    }
  }

  async function handleResetProgress() {
    if (!confirm('Reset all lesson and exam progress for this user? This cannot be undone.')) return
    setResetting(true)
    setActionMessage(null)
    try {
      const result = await resetProgress(userId)
      setActionMessage({
        ok: true,
        text: `Cleared ${result.lesson_progress_deleted} lesson row(s), ${result.exam_progress_deleted} exam row(s).`,
      })
      onRefreshContext()
    } catch (err) {
      setActionMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to reset progress.' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">User context</h3>

        {loading ? (
          <div className="mt-3 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : context ? (
          <dl className="mt-3 space-y-1.5 text-xs">
            <Row label="Email" value={context.email ?? '(no email)'} />
            <Row label="Provider" value={capitalize(context.provider)} />
            <Row label="Signup date" value={new Date(context.created_at).toLocaleDateString()} />
            <Row label="Account status" value={context.is_banned ? 'Suspended' : 'Active'} />
            <Row
              label="Subscription"
              value={`${capitalize(context.access_level)}${context.plan_type ? ` (${context.plan_type})` : ''}`}
            />
            <Row
              label="Expires"
              value={context.subscription_expires_at ? new Date(context.subscription_expires_at).toLocaleDateString() : '—'}
            />
            <Row label="Lessons completed" value={String(context.lessons_completed)} />
            <Row label="Lessons started" value={String(context.lessons_started)} />
            <Row
              label="Last activity"
              value={context.last_activity_at ? new Date(context.last_activity_at).toLocaleString() : 'No activity yet'}
            />
          </dl>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-semibold text-slate-900">Quick actions</h4>

        <button
          type="button"
          onClick={handleExtendTrial}
          disabled={extending}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {extending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TimerReset className="h-3.5 w-3.5" />}
          Extend Trial (+7 Days)
        </button>

        <button
          type="button"
          onClick={handleResetProgress}
          disabled={resetting}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Reset Progress
        </button>

        {actionMessage && (
          <div
            className={
              actionMessage.ok
                ? 'flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700'
                : 'flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700'
            }
          >
            {actionMessage.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            {actionMessage.text}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Sparkles className="h-3.5 w-3.5" />
          Canned response
        </h4>
        <select
          defaultValue=""
          onChange={(e) => {
            const chosen = CANNED_RESPONSES.find((c) => c.label === e.target.value)
            if (chosen) onInsertCannedResponse(chosen.text)
            e.target.value = ''
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="" disabled>
            Insert a template…
          </option>
          {CANNED_RESPONSES.map((c) => (
            <option key={c.label} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}
