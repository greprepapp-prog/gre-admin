import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './use-auth'

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (authLoading) return
      setLoading(true)
      setIsAdmin(false)

      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (cancelled) return
      setIsAdmin(!error && !!data)
      setLoading(false)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  return { isAdmin, loading: authLoading || loading }
}
