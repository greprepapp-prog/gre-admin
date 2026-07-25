import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react'
import { listAdminUsers, type AdminUserRow } from '../../lib/adminApi'
import { useAuth } from '../../hooks/use-auth'
import { getSubscriptionStatus } from './subscriptionStatus'
import { UserDetailDrawer } from './UserDetailDrawer'
import { DeleteUserDialog } from './DeleteUserDialog'

const PROVIDER_OPTIONS = ['all', 'email', 'google', 'apple'] as const

export function UserManagement() {
  const { user: currentAdmin } = useAuth()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState<(typeof PROVIDER_OPTIONS)[number]>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const { users } = await listAdminUsers()
      setUsers(users)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate).getTime() : null
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 : null

    return users.filter((u) => {
      if (term) {
        const matches = (u.email ?? '').toLowerCase().includes(term) || u.id.toLowerCase().includes(term)
        if (!matches) return false
      }
      if (provider !== 'all' && u.provider !== provider) return false

      const createdAt = new Date(u.createdAt).getTime()
      if (from !== null && createdAt < from) return false
      if (to !== null && createdAt > to) return false

      return true
    })
  }, [users, search, provider, fromDate, toDate])

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null
  const deleteTarget = users.find((u) => u.id === deleteTargetId) ?? null

  function handleChanged(userId: string, patch: Partial<AdminUserRow>) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)))
  }

  function handleDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    if (selectedUserId === userId) setSelectedUserId(null)
    setDeleteTargetId(null)
    setToast({ ok: true, text: 'User deleted.' })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">User Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? 'Loading users…' : `${filtered.length} of ${users.length} users shown`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-medium text-slate-500">Search (email or user ID)</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="jane@example.com or user id"
              className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Auth provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as (typeof PROVIDER_OPTIONS)[number])}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'All providers' : p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Created from</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Created to</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {toast && (
        <div
          className={
            toast.ok
              ? 'flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
              : 'flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
          }
        >
          {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500">User ID</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Email</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Auth Provider</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Subscription</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Created At</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const status = getSubscriptionStatus(u)
              return (
                <tr key={u.id} className={u.isBanned ? 'bg-red-50/40' : undefined}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500" title={u.id}>
                    {u.id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 text-slate-700">{u.email ?? '(no email)'}</td>
                  <td className="px-3 py-2 text-slate-600 capitalize">{u.provider}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    {u.isBanned && (
                      <span className="ml-1.5 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
                      >
                        Manage
                      </button>
                      {u.id !== currentAdmin?.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(u.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && currentAdmin && (
        <UserDetailDrawer
          user={selectedUser}
          adminId={currentAdmin.id}
          onClose={() => setSelectedUserId(null)}
          onChanged={handleChanged}
        />
      )}

      {deleteTarget && (
        <DeleteUserDialog user={deleteTarget} onClose={() => setDeleteTargetId(null)} onDeleted={handleDeleted} />
      )}
    </div>
  )
}
