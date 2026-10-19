import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { setUserPassword } from '../../lib/adminApi'

interface Props {
  userId: string
  email: string | null
  onClose: () => void
  onSuccess: () => void
}

export function ChangePasswordModal({ userId, email, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (password.length < 6) {
      setError('Дор хаяж 6 тэмдэгт оруулна уу.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setUserPassword(userId, password)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />

      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Нууц үг солих</h3>
            <p className="mt-0.5 text-sm text-slate-500">{email ?? '(no email)'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
          placeholder="Шинэ нууц үг (дор хаяж 6 тэмдэгт)"
          autoFocus
          className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || password.length < 6}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Хадгалах
          </button>
        </div>
      </div>
    </div>
  )
}
