import { useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import type { AdminUserRow } from '../../lib/adminApi'
import { deleteUser } from '../../lib/adminApi'

interface Props {
  user: AdminUserRow
  onClose: () => void
  onDeleted: (userId: string) => void
}

export function DeleteUserDialog({ user, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setDeleting(true)
    setError(null)
    try {
      await deleteUser(user.id)
      onDeleted(user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={deleting ? undefined : onClose}
        className="absolute inset-0 bg-slate-900/30"
      />

      <div className="relative w-full max-w-sm space-y-4 rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Delete user</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Are you sure you want to delete <span className="font-medium">{user.email ?? user.id}</span>? This
            permanently removes their account and all associated data (subscriptions, lesson progress, roles,
            notifications, and support history). This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete user
          </button>
        </div>
      </div>
    </div>
  )
}
