import type { ReactNode } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useIsAdmin } from '../hooks/use-is-admin'
import { supabase } from '../lib/supabase'
import { Login } from './Login'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (authLoading || (user && adminLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <ShieldAlert className="h-8 w-8 text-amber-500" />
        <div>
          <p className="text-base font-semibold text-slate-900">Access restricted</p>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {user.email}, but this account doesn't have admin access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    )
  }

  return <>{children}</>
}
