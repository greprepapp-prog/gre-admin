import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  deleteFeatureFlag,
  listFeatureFlags,
  upsertFeatureFlag,
  type FeatureFlag,
} from '../../lib/opsApi'

interface Draft {
  flag: FeatureFlag
  jsonText: string
  jsonError: string | null
  saving: boolean
  message: { ok: boolean; text: string } | null
}

function toDraft(flag: FeatureFlag): Draft {
  return { flag, jsonText: JSON.stringify(flag.variant_config, null, 2), jsonError: null, saving: false, message: null }
}

export function FeatureFlagsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newKey, setNewKey] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const flags = await listFeatureFlags()
      setDrafts(flags.map(toDraft))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.flag.id === id ? { ...d, ...patch } : d)))
  }

  async function handleToggle(draft: Draft) {
    updateDraft(draft.flag.id, { saving: true, message: null })
    try {
      await upsertFeatureFlag({
        id: draft.flag.id,
        flag_key: draft.flag.flag_key,
        description: draft.flag.description,
        is_enabled: !draft.flag.is_enabled,
        variant_config: draft.flag.variant_config,
      })
      setDrafts((prev) =>
        prev.map((d) =>
          d.flag.id === draft.flag.id ? { ...d, flag: { ...d.flag, is_enabled: !d.flag.is_enabled }, saving: false } : d,
        ),
      )
    } catch (err) {
      updateDraft(draft.flag.id, { saving: false, message: { ok: false, text: err instanceof Error ? err.message : 'Failed to toggle.' } })
    }
  }

  async function handleSave(draft: Draft) {
    let parsed: Record<string, unknown>
    try {
      parsed = draft.jsonText.trim() ? JSON.parse(draft.jsonText) : {}
    } catch {
      updateDraft(draft.flag.id, { jsonError: 'Invalid JSON' })
      return
    }

    updateDraft(draft.flag.id, { saving: true, jsonError: null, message: null })
    try {
      await upsertFeatureFlag({
        id: draft.flag.id,
        flag_key: draft.flag.flag_key,
        description: draft.flag.description,
        is_enabled: draft.flag.is_enabled,
        variant_config: parsed,
      })
      updateDraft(draft.flag.id, {
        saving: false,
        message: { ok: true, text: 'Saved.' },
        flag: { ...draft.flag, variant_config: parsed },
      })
    } catch (err) {
      updateDraft(draft.flag.id, { saving: false, message: { ok: false, text: err instanceof Error ? err.message : 'Failed to save.' } })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this feature flag?')) return
    try {
      await deleteFeatureFlag(id)
      setDrafts((prev) => prev.filter((d) => d.flag.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newKey.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      await upsertFeatureFlag({
        flag_key: newKey.trim(),
        description: newDescription.trim() || null,
        is_enabled: false,
        variant_config: {},
      })
      setNewKey('')
      setNewDescription('')
      await load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create flag.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Feature Flags & Paywall A/B Testing</h3>
        <p className="mt-1 text-xs text-slate-500">
          Toggle flags in real time and edit their JSON variant config directly. Readable by the app for all users.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">flag_key</label>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="new_flag_key"
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500">Description</label>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={!newKey.trim() || creating}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add flag
        </button>
        {createError && <p className="w-full text-xs text-red-600">{createError}</p>}
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
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div key={draft.flag.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">{draft.flag.flag_key}</p>
                  <input
                    value={draft.flag.description ?? ''}
                    onChange={(e) => updateDraft(draft.flag.id, { flag: { ...draft.flag, description: e.target.value } })}
                    placeholder="Description"
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Updated {new Date(draft.flag.updated_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(draft)}
                    disabled={draft.saving}
                    className={
                      draft.flag.is_enabled
                        ? 'rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white'
                        : 'rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600'
                    }
                  >
                    {draft.flag.is_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(draft.flag.id)}
                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-500">variant_config (JSON)</label>
                <textarea
                  value={draft.jsonText}
                  onChange={(e) => updateDraft(draft.flag.id, { jsonText: e.target.value, jsonError: null })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                />
                {draft.jsonError && <p className="mt-1 text-xs text-red-600">{draft.jsonError}</p>}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(draft)}
                  disabled={draft.saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {draft.saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save
                </button>
                {draft.message && (
                  <span className={draft.message.ok ? 'inline-flex items-center gap-1 text-xs text-emerald-700' : 'inline-flex items-center gap-1 text-xs text-red-600'}>
                    {draft.message.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {draft.message.text}
                  </span>
                )}
              </div>
            </div>
          ))}
          {drafts.length === 0 && <p className="text-center text-xs text-slate-400">No feature flags yet.</p>}
        </div>
      )}
    </div>
  )
}
