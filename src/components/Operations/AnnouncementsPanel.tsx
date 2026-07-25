import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type AppAnnouncement,
  type BannerType,
} from '../../lib/opsApi'

const BANNER_STYLES: Record<BannerType, string> = {
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  promo: 'bg-violet-50 text-violet-700',
}

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [bannerType, setBannerType] = useState<BannerType>('info')
  const [targetSegment, setTargetSegment] = useState('')
  const [publishNow, setPublishNow] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setAnnouncements(await listAnnouncements())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      await createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        banner_type: bannerType,
        is_active: publishNow,
        target_segment: targetSegment.trim() || null,
      })
      setTitle('')
      setMessage('')
      setTargetSegment('')
      setBannerType('info')
      setPublishNow(true)
      await load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create announcement.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(a: AppAnnouncement) {
    try {
      await updateAnnouncement(a.id, { is_active: !a.is_active })
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: !x.is_active } : x)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">System Banners & Announcements</h3>
        <p className="mt-1 text-xs text-slate-500">
          Publish, pre-stage (leave inactive), or deactivate in-app banners. Readable by the app for all users.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Target segment (optional)</label>
            <input
              value={targetSegment}
              onChange={(e) => setTargetSegment(e.target.value)}
              placeholder="all, free, active_trial…"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Banner type</label>
            <select
              value={bannerType}
              onChange={(e) => setBannerType(e.target.value as BannerType)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="promo">Promo</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            Publish immediately (leave unchecked to save as draft/scheduled)
          </label>

          <button
            type="submit"
            disabled={!title.trim() || !message.trim() || creating}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create
          </button>
        </div>
        {createError && <p className="text-xs text-red-600">{createError}</p>}
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Title</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Segment</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Created</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BANNER_STYLES[a.banner_type]}`}>
                      {a.banner_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{a.target_segment ?? 'all'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(a)}
                      className={
                        a.is_active
                          ? 'rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white'
                          : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600'
                      }
                    >
                      {a.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {announcements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">
                    No announcements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
