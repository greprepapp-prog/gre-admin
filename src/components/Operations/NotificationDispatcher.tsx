import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { broadcastNotification, type BroadcastSegment } from '../../lib/opsApi'

const SEGMENTS: { value: BroadcastSegment; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'free', label: 'All Free Users' },
  { value: 'active_trial', label: 'Active Trialers' },
  { value: 'inactive_7d', label: 'Inactive > 7 Days' },
]

const NOTIF_TYPES = ['system', 'reminder', 'lesson', 'achievement', 'billing', 'review'] as const

export function NotificationDispatcher() {
  const [segment, setSegment] = useState<BroadcastSegment>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<(typeof NOTIF_TYPES)[number]>('system')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSend() {
    if (!title.trim() || !body.trim()) return
    const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment
    if (!confirm(`Send this notification to "${segmentLabel}"? This writes an in-app notification for every matching user.`)) {
      return
    }

    setSending(true)
    setResult(null)
    try {
      const { recipient_count } = await broadcastNotification({
        segment,
        title: title.trim(),
        body: body.trim(),
        type,
        link: link.trim() || null,
      })
      setResult({ ok: true, text: `Sent to ${recipient_count} user(s).` })
      setTitle('')
      setBody('')
      setLink('')
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Failed to send.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Push Notification & Broadcast Operations</h3>
        <p className="mt-1 text-xs text-slate-500">
          Writes an in-app notification (bell/inbox) row for every user in the selected segment. There's no
          device-push (APNs/FCM) integration in this schema, so this doesn't send a native OS push notification.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500">Target segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as BroadcastSegment)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">Notification type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof NOTIF_TYPES)[number])}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {NOTIF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/lessons/12"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!title.trim() || !body.trim() || sending}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send broadcast
        </button>

        {result && (
          <div
            className={
              result.ok
                ? 'flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
                : 'flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
            }
          >
            {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {result.text}
          </div>
        )}
      </div>
    </div>
  )
}
