import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import type { AdminUserRow } from '../../lib/adminApi'
import { setUserBan, setUserSubscription } from '../../lib/adminApi'
import { fetchAuditLogForUser, logAdminAction, type AuditLogEntry } from '../../lib/audit'
import { supabase } from '../../lib/supabase'

const ACCESS_LEVELS = ['free', 'trial', 'active', 'lifetime'] as const

interface Props {
  user: AdminUserRow
  adminId: string
  onClose: () => void
  onChanged: (userId: string, patch: Partial<AdminUserRow>) => void
}

export function UserDetailDrawer({ user, adminId, onClose, onChanged }: Props) {
  const [accessLevel, setAccessLevel] = useState(user.accessLevel || 'free')
  const [planType, setPlanType] = useState(user.planType ?? '')
  const [expiresAt, setExpiresAt] = useState(user.subscriptionExpiresAt?.slice(0, 10) ?? '')
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [sendingReset, setSendingReset] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [togglingBan, setTogglingBan] = useState(false)
  const [banMessage, setBanMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAuditLoading(true)
    fetchAuditLogForUser(user.id)
      .then((entries) => {
        if (!cancelled) setAuditLog(entries)
      })
      .catch(() => {
        if (!cancelled) setAuditLog([])
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  async function handleSaveSubscription() {
    setSavingSubscription(true)
    setSubscriptionMessage(null)
    try {
      await setUserSubscription(user.id, {
        accessLevel,
        planType: planType || null,
        expiresAt: expiresAt || null,
      })
      onChanged(user.id, {
        accessLevel,
        planType: planType || null,
        subscriptionExpiresAt: expiresAt || null,
      })
      setSubscriptionMessage({ ok: true, text: 'Subscription updated.' })
    } catch (err) {
      setSubscriptionMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to update.' })
    } finally {
      setSavingSubscription(false)
    }
  }

  async function handlePasswordReset() {
    if (!user.email) {
      setResetMessage({ ok: false, text: 'This user has no email on file.' })
      return
    }
    setSendingReset(true)
    setResetMessage(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) throw error
      await logAdminAction(adminId, user.id, 'send_password_reset', { email: user.email })
      setResetMessage({ ok: true, text: `Reset email sent to ${user.email}.` })
    } catch (err) {
      setResetMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to send reset email.' })
    } finally {
      setSendingReset(false)
    }
  }

  async function handleToggleBan() {
    setTogglingBan(true)
    setBanMessage(null)
    const nextBanned = !user.isBanned
    try {
      await setUserBan(user.id, nextBanned)
      onChanged(user.id, { isBanned: nextBanned })
      setBanMessage({ ok: true, text: nextBanned ? 'Account suspended.' : 'Account reactivated.' })
    } catch (err) {
      setBanMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to update account status.' })
    } finally {
      setTogglingBan(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30"
      />

      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{user.email ?? '(no email)'}</p>
            <p className="text-xs text-slate-500">{user.id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Override subscription tier</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">Access level</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {ACCESS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500">Plan type (optional)</label>
                <input
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  placeholder="e.g. monthly"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500">Expires on (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSubscription}
              disabled={savingSubscription}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSubscription && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>

            {subscriptionMessage && (
              <StatusMessage ok={subscriptionMessage.ok} text={subscriptionMessage.text} />
            )}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Password reset</h3>
            <p className="text-xs text-slate-500">Sends a password reset link to the user's email via Supabase Auth.</p>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={sendingReset || !user.email}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingReset && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send password reset email
            </button>
            {resetMessage && <StatusMessage ok={resetMessage.ok} text={resetMessage.text} />}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Account security</h3>
            <p className="text-xs text-slate-500">
              Current status:{' '}
              <span className={user.isBanned ? 'font-medium text-red-700' : 'font-medium text-emerald-700'}>
                {user.isBanned ? 'Suspended' : 'Active'}
              </span>
            </p>
            <button
              type="button"
              onClick={handleToggleBan}
              disabled={togglingBan}
              className={
                user.isBanned
                  ? 'inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
              }
            >
              {togglingBan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {user.isBanned ? 'Reactivate account' : 'Suspend account'}
            </button>
            {banMessage && <StatusMessage ok={banMessage.ok} text={banMessage.text} />}
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Recent admin activity</h3>
            {auditLoading ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : auditLog.length === 0 ? (
              <p className="text-xs text-slate-400">No recorded actions for this user yet.</p>
            ) : (
              <ul className="space-y-2">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{entry.action}</span>
                    <span className="ml-2 text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function StatusMessage({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={
        ok
          ? 'flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
          : 'flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
      }
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      {text}
    </div>
  )
}
