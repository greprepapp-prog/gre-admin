import { LayoutDashboard, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/use-auth'

export type Tab = 'dashboard' | 'importer' | 'users' | 'support'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'importer', label: 'Content Importer' },
  { id: 'users', label: 'User Management' },
  { id: 'support', label: 'Support Inbox' },
]

export function Nav({ active, onChange }: Props) {
  const { user } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-slate-500" />
          <h1 className="text-lg font-semibold">GRE Admin</h1>
        </div>

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                active === tab.id
                  ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-slate-500">{user.email}</span>}
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
