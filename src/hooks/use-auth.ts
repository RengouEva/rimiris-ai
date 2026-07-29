'use client'

import * as React from 'react'
import {
  getCurrentSession,
  subscribe,
  type AuthSession,
} from '@/lib/iris/auth'

/**
 * React hook that subscribes to the auth session.
 *
 * Returns the current session (or null), plus a `refresh` function to force
 * a re-read from localStorage (used after signIn/signUp/signOut which already
 * notify via the internal subscriber set).
 */
export function useAuth(): {
  session: AuthSession | null
  loading: boolean
  refresh: () => void
} {
  const [session, setSession] = React.useState<AuthSession | null>(() => getCurrentSession())
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(() => {
    setSession(getCurrentSession())
  }, [])

  React.useEffect(() => {
    setSession(getCurrentSession())
    setLoading(false)
    const unsub = subscribe(() => setSession(getCurrentSession()))
    return unsub
  }, [])

  return { session, loading, refresh }
}
