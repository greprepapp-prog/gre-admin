import { useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import type { AdminUserRow } from '../../lib/adminApi'
import type { TicketPriority } from '../../lib/supportApi'
import { createTicket } from '../../lib/supportApi'

interface Props {
  users: AdminUserRow[]
  onClose: () => void
  onCreated: (ticketId: string) => void
}

export function NewTicketModal({ users, onClose, onCreated }: Props) {
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [initialMessage, setInitialMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const term = userSearch.trim().toLowerCase()
  const matchingUsers = term
    ? users.filter((u) => (u.email ?? '').toLowerCase().includes(term) || u.id.toLowerCase().includes(term)).slice(0, 8)
    : []

  const selectedUser = users.find((u) => u.id === userId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !subject.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const ticket = await createTicket({
        userId,
        subject: subject.trim(),
        category: category.trim() || null,
        priority,
        initialMessage,
      })
      onCreated(ticket.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/30" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg space-y-4 rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">New support ticket</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">User (search by email)</label>
          {selectedUser ? (
            <div className="mt-1 flex items-center justify-between rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <span>{selectedUser.email ?? selectedUser.id}</span>
              <button
                type="button"
                onClick={() => {
                  setUserId('')
                  setUserSearch('')
                }}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              {matchingUsers.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200">
                  {matchingUsers.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setUserId(u.id)}
                        className="block w-full px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                      >
                        {u.email ?? u.id}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Subject</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Category (optional)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="billing, bug, account…"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Initial message (optional)</label>
          <textarea
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!userId || !subject.trim() || submitting}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create ticket
          </button>
        </div>
      </form>
    </div>
  )
}
